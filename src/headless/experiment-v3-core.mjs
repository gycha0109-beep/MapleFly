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

const CONDITIONS = Object.freeze({
  FULL: "FULL",
  VISUAL_OFF: "VISUAL_OFF",
});

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export class VisualControlEncoder {
  constructor() {
    this.reset();
  }

  reset() {
    this.lastTargetId = null;
    this.lastTargetDistance = null;
  }

  encode(observation, condition) {
    const drive = {
      SNta_L: observation.player.grounded ? 0.05 : 0,
      SNta_R: observation.player.grounded ? 0.05 : 0,
    };

    if (condition === CONDITIONS.VISUAL_OFF) {
      this.reset();
      return drive;
    }

    if (condition !== CONDITIONS.FULL) {
      throw new Error(`unknown condition: ${condition}`);
    }

    const living = (
      observation.mushrooms ?? []
    ).filter((mushroom) => mushroom.alive);

    if (living.length === 0) {
      this.reset();
      return drive;
    }

    const playerCenterX =
      observation.player.x +
      observation.player.width / 2;
    const playerCenterY =
      observation.player.y +
      observation.player.height / 2;

    let target = living[0];
    let bestDistance = Infinity;

    for (const mushroom of living) {
      const dx = mushroom.x - playerCenterX;
      const dy =
        mushroom.y - 32 - playerCenterY;
      const distance = Math.hypot(dx, dy);

      if (distance < bestDistance) {
        bestDistance = distance;
        target = mushroom;
      }
    }

    const dx = target.x - playerCenterX;
    const side = dx < 0 ? "L" : "R";
    const closeness = clamp(
      1 - bestDistance / 620,
      0,
      1,
    );

    let approaching = 0;

    if (
      this.lastTargetId === target.id &&
      Number.isFinite(this.lastTargetDistance)
    ) {
      approaching = clamp(
        (
          this.lastTargetDistance -
          bestDistance
        ) / 45,
        0,
        1,
      );
    }

    this.lastTargetId = target.id;
    this.lastTargetDistance = bestDistance;

    drive[`LC10a_${side}`] = clamp(
      0.12 + closeness * 0.68,
      0,
      0.8,
    );

    drive[`LPLC1_${side}`] = clamp(
      closeness * 0.12 + approaching * 0.32,
      0,
      0.55,
    );

    drive[`LPLC2_${side}`] = clamp(
      closeness * 0.24 + approaching * 0.38,
      0,
      0.8,
    );

    if (bestDistance < 175) {
      drive[`LC4_${side}`] = clamp(
        (
          (175 - bestDistance) /
          175
        ) *
          0.72 +
          approaching * 0.18,
        0,
        0.8,
      );
    }

    return drive;
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

export function buildVisualControlSchedule(
  pairs,
  baseSeed,
) {
  const schedule = [];

  for (let pair = 0; pair < pairs; pair += 1) {
    const seed = baseSeed + pair;
    const order =
      pair % 2 === 0
        ? [CONDITIONS.FULL, CONDITIONS.VISUAL_OFF]
        : [CONDITIONS.VISUAL_OFF, CONDITIONS.FULL];

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

export async function runVisualControlTrial({
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

  const encoder = new VisualControlEncoder();
  const decoder = new MotorDecoder();
  const arena = new FlatArena(seed);

  const targetSteps = Math.max(
    1,
    Math.round(seconds / STEP_SECONDS),
  );

  let drive = encoder.encode(
    arena.observation(),
    condition,
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
      drive = encoder.encode(
        arena.observation(),
        condition,
      );
    }

    stimulateFromDrive(
      brain,
      connectome.inputGroups,
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

export { CONDITIONS };
