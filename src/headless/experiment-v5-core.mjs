import {
  ConnectomeBrain,
  RateTracker,
} from "./connectome-runtime.mjs";
import {
  MotorDecoder,
  STEP_MS,
  STEP_SECONDS,
  DECODER_INTERVAL_STEPS,
  SENSORY_UPDATE_STEPS,
} from "./experiment-v2-core.mjs";
import {
  CONDITIONS as V3_CONDITIONS,
  VisualControlEncoder,
} from "./experiment-v3-core.mjs";
import {
  CONDITIONS as V4_CONDITIONS,
  DamageArena,
} from "./experiment-v4-core.mjs";

export const CONDITIONS = Object.freeze({
  POTION_CUE_ON: "POTION_CUE_ON",
  POTION_CUE_OFF: "POTION_CUE_OFF",
});

export const POTION = Object.freeze({
  maxCount: 30,
  heal: 30,
  tasteDrive: 0.8,
  drinkHz: 1.6,
  drinkCooldownMs: 800,
  quickWindowMs: 1000,
});

function cells(meta, names, requestedSide) {
  const wanted = new Set(names);
  const typeHit = meta.types.map((name) =>
    wanted.has(name),
  );
  const classHit = meta.superclasses.map((name) =>
    wanted.has(name),
  );
  const sideCode =
    requestedSide === "L"
      ? 1
      : requestedSide === "R"
        ? 2
        : 0;

  const result = [];

  for (let index = 0; index < meta.n; index += 1) {
    if (
      !(
        typeHit[meta.typeIdx[index]] ||
        classHit[meta.classIdx[index]]
      )
    ) {
      continue;
    }

    if (sideCode && meta.side[index] !== sideCode) {
      continue;
    }

    result.push(index);
  }

  return Int32Array.from(result);
}

export function extendPotionInterfaces(connectome) {
  const inputGroups = new Map(connectome.inputGroups);
  const outputGroups = [...connectome.outputGroups];

  for (const side of ["L", "R"]) {
    const taste = cells(
      connectome.meta,
      ["LB3", "claw_tpGRN"],
      side,
    );

    const head = cells(
      connectome.meta,
      ["cb_motor"],
      side,
    );

    if (!taste.length) {
      throw new Error(
        `taste input group is empty: ${side}`,
      );
    }

    if (!head.length) {
      throw new Error(
        `neck/head cb_motor group is empty: ${side}`,
      );
    }

    inputGroups.set(`taste_${side}`, taste);
    outputGroups.push([
      `neck/head ${side}`,
      head,
    ]);
  }

  return {
    inputGroups,
    outputGroups,
    counts: {
      tasteL: inputGroups.get("taste_L").length,
      tasteR: inputGroups.get("taste_R").length,
      headL: outputGroups.find(
        ([name]) => name === "neck/head L",
      )[1].length,
      headR: outputGroups.find(
        ([name]) => name === "neck/head R",
      )[1].length,
    },
  };
}

export class PotionArena extends DamageArena {
  reset(seed = 64) {
    super.reset(seed);

    this.potionsRemaining = POTION.maxCount;
    this.lastContactMs = null;

    this.potionMetrics = {
      uses: 0,
      quickUses: 0,
      totalHealed: 0,
      wastedHealing: 0,
      hpAtUseTotal: 0,
      events: [],
    };
  }

  observation() {
    const observation = super.observation();

    observation.player.potions =
      this.potionsRemaining;
    observation.player.potionCue =
      this.canDrink();

    return observation;
  }

  canDrink() {
    return (
      !this.player.dead &&
      this.potionsRemaining > 0 &&
      this.player.hp < this.player.maxHp
    );
  }

  applyContactDamage(simulationMs) {
    const contactsBefore =
      this.damageMetrics.contacts;

    super.applyContactDamage(simulationMs);

    if (
      this.damageMetrics.contacts >
      contactsBefore
    ) {
      this.lastContactMs = simulationMs;
    }
  }

  potionDrive(condition) {
    if (
      condition !== CONDITIONS.POTION_CUE_ON ||
      !this.canDrink()
    ) {
      return {};
    }

    return {
      taste_L: POTION.tasteDrive,
      taste_R: POTION.tasteDrive,
    };
  }

  usePotion(simulationMs) {
    if (!this.canDrink()) {
      return false;
    }

    const hpBefore = this.player.hp;
    const missing =
      this.player.maxHp - this.player.hp;
    const healed = Math.min(
      POTION.heal,
      missing,
    );
    const wasted = POTION.heal - healed;
    const sinceContactMs =
      this.lastContactMs === null
        ? null
        : simulationMs - this.lastContactMs;

    this.potionsRemaining -= 1;
    this.player.hp += healed;

    this.potionMetrics.uses += 1;
    this.potionMetrics.totalHealed += healed;
    this.potionMetrics.wastedHealing += wasted;
    this.potionMetrics.hpAtUseTotal += hpBefore;

    if (
      sinceContactMs !== null &&
      sinceContactMs >= 0 &&
      sinceContactMs <= POTION.quickWindowMs
    ) {
      this.potionMetrics.quickUses += 1;
    }

    this.potionMetrics.events.push({
      atMs: simulationMs,
      hpBefore,
      hpAfter: this.player.hp,
      healed,
      wasted,
      sinceContactMs,
    });

    return true;
  }

  step(intent, simulationMs) {
    if (intent.potion) {
      this.usePotion(simulationMs);
    }

    super.step(intent, simulationMs);
  }

  result(simulatedSeconds) {
    const base = super.result(simulatedSeconds);
    const uses = this.potionMetrics.uses;

    return {
      ...base,
      potionUses: uses,
      quickPotionUses:
        this.potionMetrics.quickUses,
      quickUsePerContact:
        base.contacts > 0
          ? this.potionMetrics.quickUses /
            base.contacts
          : 0,
      totalHealed:
        this.potionMetrics.totalHealed,
      wastedHealing:
        this.potionMetrics.wastedHealing,
      averageHpAtUse:
        uses > 0
          ? this.potionMetrics.hpAtUseTotal /
            uses
          : null,
      potionsRemaining:
        this.potionsRemaining,
      potionEvents: this.potionMetrics.events,
    };
  }
}

export class PotionDecoder {
  constructor() {
    this.motor = new MotorDecoder();
    this.nextPotionAt = 0;
    this.potionIntent = false;
    this.lastLabel = "IDLE";
  }

  decode(rateTracker, simulationMs, canDrink) {
    const base = this.motor.decode(
      rateTracker,
      simulationMs,
    );

    const headL =
      rateTracker.rate("neck/head L");
    const headR =
      rateTracker.rate("neck/head R");
    const headMotor = (headL + headR) / 2;

    let potion = false;

    if (
      canDrink &&
      headMotor >= POTION.drinkHz &&
      simulationMs >= this.nextPotionAt
    ) {
      potion = true;
      this.nextPotionAt =
        simulationMs + POTION.drinkCooldownMs;
    }

    this.potionIntent = potion;
    this.lastLabel = potion
      ? "POTION"
      : base.label;

    return {
      ...base,
      potion,
      label: this.lastLabel,
      rates: {
        ...base.rates,
        headL,
        headR,
        headMotor,
      },
    };
  }

  consumeIntent() {
    const base = this.motor.consumeIntent();
    const potion = this.potionIntent;
    this.potionIntent = false;

    return {
      ...base,
      potion,
      label: potion
        ? "POTION"
        : base.label,
    };
  }
}

function stimulateFromDrive(
  brain,
  inputGroups,
  drive,
) {
  for (const [key, amount] of Object.entries(drive)) {
    const indices = inputGroups.get(key);

    if (indices && amount) {
      brain.stimulate(indices, amount);
    }
  }
}

export function buildPotionSchedule(
  pairs,
  baseSeed,
) {
  const schedule = [];

  for (let pair = 0; pair < pairs; pair += 1) {
    const seed = baseSeed + pair;
    const order =
      pair % 2 === 0
        ? [
            CONDITIONS.POTION_CUE_ON,
            CONDITIONS.POTION_CUE_OFF,
          ]
        : [
            CONDITIONS.POTION_CUE_OFF,
            CONDITIONS.POTION_CUE_ON,
          ];

    for (const condition of order) {
      schedule.push({
        pair: pair + 1,
        seed,
        condition,
      });
    }
  }

  return schedule;
}

export async function runPotionTrial({
  connectome,
  interfaces,
  seed,
  condition,
  seconds,
  onProgress = () => {},
}) {
  const brain = new ConnectomeBrain(
    connectome.weights,
    connectome.meta.params,
    seed,
  );

  const rates = new RateTracker(
    connectome.meta,
    interfaces.outputGroups,
  );

  const visualEncoder =
    new VisualControlEncoder();
  const decoder = new PotionDecoder();
  const arena = new PotionArena(seed);

  const targetSteps = Math.max(
    1,
    Math.round(seconds / STEP_SECONDS),
  );

  let drive = {
    ...visualEncoder.encode(
      arena.observation(),
      V3_CONDITIONS.FULL,
    ),
    ...arena.impactDrive(
      V4_CONDITIONS.IMPACT_ON,
    ),
    ...arena.potionDrive(condition),
  };

  let intent = decoder.consumeIntent();
  let firedSum = 0;
  let brainStepMsSum = 0;
  let headRateSum = 0;
  let headRateSamples = 0;
  const startedAt = performance.now();

  for (
    let stepIndex = 0;
    stepIndex < targetSteps;
    stepIndex += 1
  ) {
    if (
      stepIndex % SENSORY_UPDATE_STEPS === 0
    ) {
      drive = {
        ...visualEncoder.encode(
          arena.observation(),
          V3_CONDITIONS.FULL,
        ),
        ...arena.impactDrive(
          V4_CONDITIONS.IMPACT_ON,
        ),
        ...arena.potionDrive(condition),
      };
    }

    stimulateFromDrive(
      brain,
      interfaces.inputGroups,
      drive,
    );

    const brainStartedAt = performance.now();
    brain.step();
    const brainStepMs =
      performance.now() - brainStartedAt;

    rates.update(brain);
    firedSum += brain.firedCount;
    brainStepMsSum += brainStepMs;

    if (
      brain.steps % DECODER_INTERVAL_STEPS === 0
    ) {
      const decision = decoder.decode(
        rates,
        brain.steps * STEP_MS,
        arena.canDrink(),
      );

      arena.recordDecision(decision);
      intent = decoder.consumeIntent();

      headRateSum +=
        decision.rates.headMotor;
      headRateSamples += 1;
    }

    arena.step(
      intent,
      brain.steps * STEP_MS,
    );

    if (
      stepIndex > 0 &&
      (
        stepIndex % 500 === 0 ||
        stepIndex === targetSteps - 1
      )
    ) {
      onProgress({
        step: stepIndex + 1,
        totalSteps: targetSteps,
        simulatedSeconds:
          (stepIndex + 1) * STEP_SECONDS,
      });

      await new Promise((resolve) =>
        setImmediate(resolve),
      );
    }
  }

  const wallDurationMs =
    performance.now() - startedAt;
  const result = arena.result(
    targetSteps * STEP_SECONDS,
  );
  const attacks =
    result.decisions.ATTACK ?? 0;

  return {
    ...result,
    seed,
    condition,
    requestedSimSeconds: seconds,
    brainSteps: brain.steps,
    wallDurationMs,
    left: result.decisions.LEFT ?? 0,
    right: result.decisions.RIGHT ?? 0,
    jump: result.decisions.JUMP ?? 0,
    attack: attacks,
    potionDecisions:
      result.decisions.POTION ?? 0,
    idle: result.decisions.IDLE ?? 0,
    hitRate:
      attacks > 0
        ? result.hits / attacks
        : 0,
    avgHeadMotorHz:
      headRateSamples > 0
        ? headRateSum / headRateSamples
        : 0,
    avgFiredPerStep:
      firedSum / targetSteps,
    avgBrainStepMs:
      brainStepMsSum / targetSteps,
  };
}
