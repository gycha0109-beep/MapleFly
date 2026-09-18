import {
  ConnectomeBrain,
  RateTracker,
} from "./connectome-runtime.mjs";

export const STEP_SECONDS = 0.02;
export const STEP_MS = STEP_SECONDS * 1000;
export const DECODER_INTERVAL_STEPS = 2;
export const SENSORY_UPDATE_STEPS = 2;

export const DECODER = Object.freeze({
  steerFloorHz: 1.1,
  steerMarginHz: 0.4,
  jumpHz: 5.0,
  attackHz: 2.0,
  climbHz: 2.5,
  climbMarginHz: 0.8,
  jumpCooldownMs: 750,
  attackCooldownMs: 420,
});

export const WORLD = Object.freeze({
  width: 1000,
  height: 600,
  groundY: 530,
  gravity: 1400,
  moveSpeed: 280,
  jumpVelocity: 600,
});

export const COMBAT = Object.freeze({
  attackDamage: 10,
  attackRange: 76,
  attackCooldown: 0.32,
  attackDuration: 0.16,
});

export const RESPAWN = Object.freeze({
  delayMs: 700,
  minX: 55,
  maxX: WORLD.width - 55,
});

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function hashUnit(seed, spawnIndex) {
  let value = (
    Math.trunc(Number(seed) || 0) ^
    Math.imul(spawnIndex + 1, 0x9e3779b1)
  ) >>> 0;

  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d);
  value ^= value >>> 15;
  value = Math.imul(value, 0x846ca68b);
  value ^= value >>> 16;

  return (value >>> 0) / 4294967296;
}

export function spawnPosition(seed, spawnIndex) {
  const unit = hashUnit(seed, spawnIndex);

  return Math.round(
    RESPAWN.minX +
      unit * (RESPAWN.maxX - RESPAWN.minX),
  );
}

export class SensoryEncoder {
  constructor() {
    this.reset();
  }

  reset() {
    this.lastTargetId = null;
    this.lastTargetDistance = null;
  }

  encode(observation, sensoryEnabled) {
    if (!sensoryEnabled) {
      return {};
    }

    const living = (
      observation.mushrooms ?? []
    ).filter((mushroom) => mushroom.alive);

    const playerCenterX =
      observation.player.x +
      observation.player.width / 2;
    const playerCenterY =
      observation.player.y +
      observation.player.height / 2;

    const drive = {
      SNta_L: observation.player.grounded ? 0.05 : 0,
      SNta_R: observation.player.grounded ? 0.05 : 0,
    };

    if (living.length === 0) {
      this.reset();
      return drive;
    }

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

export class MotorDecoder {
  constructor() {
    this.reset();
  }

  reset() {
    this.nextJumpAt = 0;
    this.nextAttackAt = 0;
    this.intent = this.emptyIntent();
  }

  emptyIntent() {
    return {
      left: false,
      right: false,
      up: false,
      down: false,
      jump: false,
      attack: false,
      label: "IDLE",
    };
  }

  decode(rateTracker, simulationMs) {
    const steerL = rateTracker.rate("DNa02 L");
    const steerR = rateTracker.rate("DNa02 R");
    const strongestSteer = Math.max(
      steerL,
      steerR,
    );
    const steerDifference = steerL - steerR;

    let left = false;
    let right = false;

    if (
      strongestSteer >= DECODER.steerFloorHz
    ) {
      if (
        steerDifference >=
        DECODER.steerMarginHz
      ) {
        left = true;
      } else if (
        steerDifference <=
        -DECODER.steerMarginHz
      ) {
        right = true;
      }
    }

    const escape = Math.max(
      rateTracker.rate("DNp01 L"),
      rateTracker.rate("DNp01 R"),
    );

    const armPull = Math.max(
      rateTracker.rate("arm pull L"),
      rateTracker.rate("arm pull R"),
    );

    const extend = Math.max(
      rateTracker.rate("leg extend L"),
      rateTracker.rate("leg extend R"),
    );

    const flex = Math.max(
      rateTracker.rate("leg flex L"),
      rateTracker.rate("leg flex R"),
    );

    let jump = false;
    let attack = false;
    let up = false;
    let down = false;

    if (
      escape >= DECODER.jumpHz &&
      simulationMs >= this.nextJumpAt
    ) {
      jump = true;
      this.nextJumpAt =
        simulationMs + DECODER.jumpCooldownMs;
    }

    if (
      armPull >= DECODER.attackHz &&
      simulationMs >= this.nextAttackAt
    ) {
      attack = true;
      this.nextAttackAt =
        simulationMs + DECODER.attackCooldownMs;
    }

    if (
      extend >= DECODER.climbHz &&
      extend - flex >=
        DECODER.climbMarginHz
    ) {
      up = true;
    } else if (
      flex >= DECODER.climbHz &&
      flex - extend >=
        DECODER.climbMarginHz
    ) {
      down = true;
    }

    let label = "IDLE";

    if (jump) {
      label = "JUMP";
    } else if (attack) {
      label = "ATTACK";
    } else if (left) {
      label = "LEFT";
    } else if (right) {
      label = "RIGHT";
    } else if (up) {
      label = "UP";
    } else if (down) {
      label = "DOWN";
    }

    this.intent = {
      left,
      right,
      up,
      down,
      jump,
      attack,
      label,
    };

    return {
      ...this.intent,
      rates: {
        steerL,
        steerR,
        escape,
        armPull,
        extend,
        flex,
      },
    };
  }

  consumeIntent() {
    const current = { ...this.intent };
    this.intent.jump = false;
    this.intent.attack = false;
    return current;
  }
}

function rectanglesOverlap(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

export class FlatArena {
  constructor(seed = 64) {
    this.seed = seed;
    this.reset(seed);
  }

  reset(seed = 64) {
    this.seed = seed;
    this.player = {
      x: WORLD.width / 2 - 17,
      y: WORLD.groundY - 46,
      width: 34,
      height: 46,
      vx: 0,
      vy: 0,
      grounded: true,
      facing: 1,
      attackCooldownTimer: 0,
      attackTimer: 0,
    };

    this.mushroom = {
      id: "M-TEST",
      x: spawnPosition(seed, 0),
      baselineY: WORLD.groundY,
      maxHp: 30,
      hp: 30,
      alive: true,
      respawnTimerMs: 0,
      spawnIndex: 0,
    };

    this.player.facing =
      this.mushroom.x <
      this.player.x + this.player.width / 2
        ? -1
        : 1;

    this.metrics = {
      totalDistancePx: 0,
      towardDistancePx: 0,
      awayDistancePx: 0,
      minTargetDistancePx:
        this.targetDistance(),
      timeWithinAttackRangeMs: 0,
      decisions: {
        LEFT: 0,
        RIGHT: 0,
        UP: 0,
        DOWN: 0,
        JUMP: 0,
        ATTACK: 0,
        IDLE: 0,
      },
      hits: 0,
      kills: 0,
      respawns: 0,
      spawnPositions: [
        Math.round(this.mushroom.x),
      ],
      firstHitMs: null,
      firstKillMs: null,
    };
  }

  observation() {
    return {
      player: {
        x: this.player.x,
        y: this.player.y,
        width: this.player.width,
        height: this.player.height,
        grounded: this.player.grounded,
        climbing: false,
        facing: this.player.facing,
      },
      mushrooms: [
        {
          id: this.mushroom.id,
          x: this.mushroom.x,
          y: this.mushroom.baselineY,
          hp: this.mushroom.hp,
          alive: this.mushroom.alive,
        },
      ],
    };
  }

  targetDistance() {
    const playerCenterX =
      this.player.x +
      this.player.width / 2;
    const playerCenterY =
      this.player.y +
      this.player.height / 2;
    const targetY =
      this.mushroom.baselineY - 31;

    return Math.hypot(
      this.mushroom.x - playerCenterX,
      targetY - playerCenterY,
    );
  }

  recordDecision(decision) {
    const label =
      this.metrics.decisions[
        decision.label
      ] !== undefined
        ? decision.label
        : "IDLE";

    this.metrics.decisions[label] += 1;
  }

  tryJump() {
    if (!this.player.grounded) {
      return false;
    }

    this.player.vy = -WORLD.jumpVelocity;
    this.player.grounded = false;
    return true;
  }

  getPlayerAttackHitbox() {
    const width = COMBAT.attackRange;
    const x =
      this.player.facing > 0
        ? this.player.x +
          this.player.width -
          2
        : this.player.x - width + 2;

    return {
      x,
      y: this.player.y + 4,
      width,
      height: this.player.height - 8,
    };
  }

  getMushroomHitbox() {
    return {
      x: this.mushroom.x - 28,
      y: this.mushroom.baselineY - 62,
      width: 56,
      height: 62,
    };
  }

  tryAttack(simulationMs) {
    if (
      this.player.attackCooldownTimer > 0
    ) {
      return false;
    }

    this.player.attackCooldownTimer =
      COMBAT.attackCooldown;
    this.player.attackTimer =
      COMBAT.attackDuration;

    if (!this.mushroom.alive) {
      return true;
    }

    if (
      !rectanglesOverlap(
        this.getPlayerAttackHitbox(),
        this.getMushroomHitbox(),
      )
    ) {
      return true;
    }

    this.mushroom.hp = Math.max(
      0,
      this.mushroom.hp -
        COMBAT.attackDamage,
    );

    this.metrics.hits += 1;

    if (this.metrics.firstHitMs === null) {
      this.metrics.firstHitMs = simulationMs;
    }

    if (this.mushroom.hp === 0) {
      this.mushroom.alive = false;
      this.mushroom.respawnTimerMs =
        RESPAWN.delayMs;

      this.metrics.kills += 1;

      if (
        this.metrics.firstKillMs === null
      ) {
        this.metrics.firstKillMs =
          simulationMs;
      }
    }

    return true;
  }

  respawnMushroom() {
    this.mushroom.spawnIndex += 1;
    this.mushroom.x = spawnPosition(
      this.seed,
      this.mushroom.spawnIndex,
    );
    this.mushroom.hp =
      this.mushroom.maxHp;
    this.mushroom.alive = true;
    this.mushroom.respawnTimerMs = 0;

    this.metrics.respawns += 1;
    this.metrics.spawnPositions.push(
      Math.round(this.mushroom.x),
    );
  }

  step(intent, simulationMs) {
    if (intent.jump) {
      this.tryJump();
    }

    if (intent.attack) {
      this.tryAttack(simulationMs);
    }

    const left = intent.left;
    const right = intent.right;
    const horizontalInput =
      (right ? 1 : 0) - (left ? 1 : 0);

    this.player.vx =
      horizontalInput * WORLD.moveSpeed;

    if (horizontalInput !== 0) {
      this.player.facing =
        Math.sign(horizontalInput);
    }

    const previousX = this.player.x;
    const previousY = this.player.y;

    this.player.x +=
      this.player.vx * STEP_SECONDS;
    this.player.vy +=
      WORLD.gravity * STEP_SECONDS;
    this.player.y +=
      this.player.vy * STEP_SECONDS;
    this.player.grounded = false;

    this.player.x = Math.max(
      0,
      Math.min(
        WORLD.width - this.player.width,
        this.player.x,
      ),
    );

    if (
      this.player.y +
        this.player.height >=
      WORLD.groundY
    ) {
      this.player.y =
        WORLD.groundY -
        this.player.height;
      this.player.vy = 0;
      this.player.grounded = true;
    }

    this.player.attackCooldownTimer =
      Math.max(
        0,
        this.player.attackCooldownTimer -
          STEP_SECONDS,
      );

    this.player.attackTimer = Math.max(
      0,
      this.player.attackTimer -
        STEP_SECONDS,
    );

    if (!this.mushroom.alive) {
      this.mushroom.respawnTimerMs =
        Math.max(
          0,
          this.mushroom.respawnTimerMs -
            STEP_MS,
        );

      if (
        this.mushroom.respawnTimerMs === 0
      ) {
        this.respawnMushroom();
      }
    }

    const dx = this.player.x - previousX;
    const dy = this.player.y - previousY;

    this.metrics.totalDistancePx +=
      Math.hypot(dx, dy);

    if (this.mushroom.alive) {
      if (Math.abs(dx) > 0.0001) {
        const directionToTarget =
          Math.sign(
            this.mushroom.x -
              (
                previousX +
                this.player.width / 2
              ),
          );

        if (
          Math.sign(dx) ===
          directionToTarget
        ) {
          this.metrics.towardDistancePx +=
            Math.abs(dx);
        } else {
          this.metrics.awayDistancePx +=
            Math.abs(dx);
        }
      }

      const distance = this.targetDistance();
      this.metrics.minTargetDistancePx =
        Math.min(
          this.metrics.minTargetDistancePx,
          distance,
        );

      if (
        distance <=
        COMBAT.attackRange + 35
      ) {
        this.metrics.timeWithinAttackRangeMs +=
          STEP_MS;
      }
    }
  }

  result(simulatedSeconds) {
    const horizontalTravel =
      this.metrics.towardDistancePx +
      this.metrics.awayDistancePx;

    return {
      simulatedSeconds,
      totalDistancePx:
        this.metrics.totalDistancePx,
      towardDistancePx:
        this.metrics.towardDistancePx,
      awayDistancePx:
        this.metrics.awayDistancePx,
      towardMovementRatio:
        horizontalTravel > 0
          ? this.metrics.towardDistancePx /
            horizontalTravel
          : 0,
      minTargetDistancePx:
        this.metrics.minTargetDistancePx,
      timeWithinAttackRangeMs:
        this.metrics.timeWithinAttackRangeMs,
      decisions: {
        ...this.metrics.decisions,
      },
      hits: this.metrics.hits,
      kills: this.metrics.kills,
      respawns: this.metrics.respawns,
      spawnPositions: [
        ...this.metrics.spawnPositions,
      ],
      firstHitMs:
        this.metrics.firstHitMs,
      firstKillMs:
        this.metrics.firstKillMs,
      finalTargetHp: this.mushroom.hp,
      finalTargetX: this.mushroom.x,
      finalPlayerX: this.player.x,
    };
  }
}

export function buildSchedule(
  pairs,
  baseSeed,
) {
  const schedule = [];

  for (
    let pair = 0;
    pair < pairs;
    pair += 1
  ) {
    const seed = baseSeed + pair;
    const order =
      pair % 2 === 0
        ? ["ON", "OFF"]
        : ["OFF", "ON"];

    for (const condition of order) {
      schedule.push({
        pair: pair + 1,
        seed,
        sensory: condition === "ON",
        condition,
      });
    }
  }

  return schedule;
}

function stimulateFromDrive(
  brain,
  inputGroups,
  drive,
) {
  for (const [key, amount] of Object.entries(
    drive,
  )) {
    const indices = inputGroups.get(key);

    if (indices && amount) {
      brain.stimulate(indices, amount);
    }
  }
}

export async function runTrial({
  connectome,
  seed,
  sensory,
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

  const sensoryEncoder =
    new SensoryEncoder();
  const motorDecoder =
    new MotorDecoder();
  const arena = new FlatArena(seed);

  const targetSteps = Math.max(
    1,
    Math.round(seconds / STEP_SECONDS),
  );

  let drive = sensoryEncoder.encode(
    arena.observation(),
    sensory,
  );
  let intent = motorDecoder.consumeIntent();

  let firedSum = 0;
  let brainStepMsSum = 0;
  const startedAt = performance.now();

  for (
    let stepIndex = 0;
    stepIndex < targetSteps;
    stepIndex += 1
  ) {
    if (
      stepIndex % SENSORY_UPDATE_STEPS ===
      0
    ) {
      drive = sensoryEncoder.encode(
        arena.observation(),
        sensory,
      );
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
      brain.steps %
        DECODER_INTERVAL_STEPS ===
      0
    ) {
      const decision = motorDecoder.decode(
        rates,
        brain.steps * STEP_MS,
      );
      arena.recordDecision(decision);
      intent =
        motorDecoder.consumeIntent();
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
          (stepIndex + 1) *
          STEP_SECONDS,
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
    sensory: sensory ? "ON" : "OFF",
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
