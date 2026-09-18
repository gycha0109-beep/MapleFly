import {
  ConnectomeBrain,
  RateTracker,
} from "./connectome-runtime.mjs";
import {
  FlatArena,
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

export const CONDITIONS = Object.freeze({
  IMPACT_ON: "IMPACT_ON",
  IMPACT_OFF: "IMPACT_OFF",
});

export const DAMAGE = Object.freeze({
  maxHp: 100,
  contactDamage: 10,
  impactPulseMs: 120,
  impactDrive: 0.7,
  responseWindowMs: 600,
});

function rectanglesOverlap(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

export class DamageArena extends FlatArena {
  reset(seed = 64) {
    super.reset(seed);

    this.player.maxHp = DAMAGE.maxHp;
    this.player.hp = DAMAGE.maxHp;
    this.player.dead = false;

    this.touchingMushroom = false;
    this.impactPulseMs = 0;
    this.impactSide = null;
    this.responseWindowMs = 0;
    this.responseSide = null;

    this.damageMetrics = {
      contacts: 0,
      damageTaken: 0,
      firstContactMs: null,
      deathAtMs: null,
      postContactAwayPx: 0,
      postContactTowardPx: 0,
      postContactJumps: 0,
      postContactAttacks: 0,
    };
  }

  observation() {
    const observation = super.observation();

    observation.player.hp = this.player.hp;
    observation.player.maxHp = this.player.maxHp;
    observation.player.dead = this.player.dead;
    observation.player.impactSide = this.impactSide;
    observation.player.impactPulse =
      this.impactPulseMs > 0
        ? DAMAGE.impactDrive
        : 0;

    return observation;
  }

  getPlayerBodyHitbox() {
    return {
      x: this.player.x + 3,
      y: this.player.y + 3,
      width: this.player.width - 6,
      height: this.player.height - 3,
    };
  }

  getMushroomBodyHitbox() {
    return {
      x: this.mushroom.x - 28,
      y: this.mushroom.baselineY - 62,
      width: 56,
      height: 62,
    };
  }

  applyContactDamage(simulationMs) {
    if (this.player.dead || !this.mushroom.alive) {
      return;
    }

    const playerCenterX =
      this.player.x + this.player.width / 2;
    const side =
      this.mushroom.x < playerCenterX
        ? "L"
        : "R";

    this.player.hp = Math.max(
      0,
      this.player.hp - DAMAGE.contactDamage,
    );

    this.damageMetrics.contacts += 1;
    this.damageMetrics.damageTaken +=
      DAMAGE.contactDamage;

    if (
      this.damageMetrics.firstContactMs === null
    ) {
      this.damageMetrics.firstContactMs =
        simulationMs;
    }

    this.impactSide = side;
    this.impactPulseMs = DAMAGE.impactPulseMs;
    this.responseSide = side;
    this.responseWindowMs =
      DAMAGE.responseWindowMs;

    if (this.player.hp === 0) {
      this.player.dead = true;
      this.player.vx = 0;
      this.damageMetrics.deathAtMs =
        simulationMs;
    }
  }

  impactDrive(condition) {
    if (
      condition !== CONDITIONS.IMPACT_ON ||
      this.impactPulseMs <= 0 ||
      !this.impactSide
    ) {
      return {};
    }

    return {
      [`LgLG_${this.impactSide}`]:
        DAMAGE.impactDrive,
    };
  }

  step(intent, simulationMs) {
    const previousX = this.player.x;
    const responseWasActive =
      this.responseWindowMs > 0;
    const responseSide = this.responseSide;

    const safeIntent = this.player.dead
      ? {
          left: false,
          right: false,
          up: false,
          down: false,
          jump: false,
          attack: false,
          label: "IDLE",
        }
      : intent;

    if (
      responseWasActive &&
      safeIntent.jump
    ) {
      this.damageMetrics.postContactJumps += 1;
    }

    if (
      responseWasActive &&
      safeIntent.attack
    ) {
      this.damageMetrics.postContactAttacks += 1;
    }

    super.step(safeIntent, simulationMs);

    const dx = this.player.x - previousX;

    if (
      responseWasActive &&
      Math.abs(dx) > 0.0001 &&
      responseSide
    ) {
      const awayDirection =
        responseSide === "L" ? 1 : -1;

      if (Math.sign(dx) === awayDirection) {
        this.damageMetrics.postContactAwayPx +=
          Math.abs(dx);
      } else {
        this.damageMetrics.postContactTowardPx +=
          Math.abs(dx);
      }
    }

    this.responseWindowMs = Math.max(
      0,
      this.responseWindowMs - STEP_MS,
    );

    if (this.responseWindowMs === 0) {
      this.responseSide = null;
    }

    this.impactPulseMs = Math.max(
      0,
      this.impactPulseMs - STEP_MS,
    );

    if (this.impactPulseMs === 0) {
      this.impactSide = null;
    }

    const touching =
      !this.player.dead &&
      this.mushroom.alive &&
      rectanglesOverlap(
        this.getPlayerBodyHitbox(),
        this.getMushroomBodyHitbox(),
      );

    if (
      touching &&
      !this.touchingMushroom
    ) {
      this.applyContactDamage(simulationMs);
    }

    this.touchingMushroom = touching;

    if (!this.mushroom.alive) {
      this.touchingMushroom = false;
    }
  }

  result(simulatedSeconds) {
    const base = super.result(simulatedSeconds);
    const responseMovement =
      this.damageMetrics.postContactAwayPx +
      this.damageMetrics.postContactTowardPx;

    return {
      ...base,
      contacts: this.damageMetrics.contacts,
      damageTaken:
        this.damageMetrics.damageTaken,
      firstContactMs:
        this.damageMetrics.firstContactMs,
      finalPlayerHp: this.player.hp,
      playerDead: this.player.dead,
      deathAtMs: this.damageMetrics.deathAtMs,
      survivalSeconds:
        this.damageMetrics.deathAtMs === null
          ? simulatedSeconds
          : this.damageMetrics.deathAtMs / 1000,
      postContactAwayPx:
        this.damageMetrics.postContactAwayPx,
      postContactTowardPx:
        this.damageMetrics.postContactTowardPx,
      postContactAwayRatio:
        responseMovement > 0
          ? this.damageMetrics.postContactAwayPx /
            responseMovement
          : 0,
      postContactJumps:
        this.damageMetrics.postContactJumps,
      postContactAttacks:
        this.damageMetrics.postContactAttacks,
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

export function buildImpactSchedule(
  pairs,
  baseSeed,
) {
  const schedule = [];

  for (let pair = 0; pair < pairs; pair += 1) {
    const seed = baseSeed + pair;
    const order =
      pair % 2 === 0
        ? [
            CONDITIONS.IMPACT_ON,
            CONDITIONS.IMPACT_OFF,
          ]
        : [
            CONDITIONS.IMPACT_OFF,
            CONDITIONS.IMPACT_ON,
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

export async function runImpactTrial({
  connectome,
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
    connectome.outputGroups,
  );

  const visualEncoder =
    new VisualControlEncoder();
  const decoder = new MotorDecoder();
  const arena = new DamageArena(seed);

  const targetSteps = Math.max(
    1,
    Math.round(seconds / STEP_SECONDS),
  );

  let drive = visualEncoder.encode(
    arena.observation(),
    V3_CONDITIONS.FULL,
  );
  let intent = decoder.consumeIntent();

  let firedSum = 0;
  let brainStepMsSum = 0;
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
        ...arena.impactDrive(condition),
      };
    }

    stimulateFromDrive(
      brain,
      connectome.inputGroups,
      drive,
    );

    const brainStartedAt =
      performance.now();
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
      );

      arena.recordDecision(decision);
      intent = decoder.consumeIntent();
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
    idle: result.decisions.IDLE ?? 0,
    hitRate:
      attacks > 0
        ? result.hits / attacks
        : 0,
    avgFiredPerStep:
      firedSum / targetSteps,
    avgBrainStepMs:
      brainStepMsSum / targetSteps,
  };
}
