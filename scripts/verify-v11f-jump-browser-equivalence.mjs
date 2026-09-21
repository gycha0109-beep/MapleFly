#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  SOURCE,
  ConnectomeBrain,
  cells,
  loadConnectome,
} from "../src/headless/connectome-runtime.mjs";
import "../src/brain/fly-skill-v7.js";\nimport "../src/brain/fly-skill-v11-jump.js";

const STEP_SECONDS = 0.02;
const SETTLE_STEPS = 26;
const BASELINE_STEPS = 26;
const MOVE_WINDOW_STEPS = 26;
const JUMP_WINDOW_STEPS = 5;
const MAX_SECONDS = 4.5;
const MAX_STEPS = Math.round(MAX_SECONDS / STEP_SECONDS);
const JUMP_COOLDOWN_STEPS = Math.round(0.75 / STEP_SECONDS);

const WORLD_WIDTH = 1000;
const GROUND_Y = 530;
const GRAVITY = 1400;
const MOVE_SPEED = 280;
const JUMP_VELOCITY = 600;
const PLAYER_WIDTH = 34;
const PLAYER_HEIGHT = 46;
const OBSTACLE_WIDTH = 38;
const OBSTACLE_HEIGHT = 54;
const TARGET_REACH_RADIUS = 42;
const OBSTACLE_VISUAL_RADIUS = 280;

const PRACTICE_BASE_SEEDS = [801000, 811000, 821000];
const PRACTICE_DISTANCES = [145, 185, 225, 265];
const FINAL_BASE_SEEDS = [1051000, 1061000, 1071000];
const FINAL_DISTANCES = [155, 195, 235, 275];

const EPSILONS = [0.35, 0.15, 0.05];
const LEARNING_RATE = 0.005;
const GAMMA = 0.95;
const TD_CLAMP = 2;
const L2_DECAY = 0.0001;

const ACTION_WAIT = 0;
const ACTION_JUMP = 1;
const ACTION_NAMES = ["WAIT", "JUMP"];

const movementApi = globalThis.MapleFlySkillV7;
const movementSkill = movementApi.BUNDLED_STATE;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function mean(values) {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;
}

function mulberry32(seed) {
  let state = Math.trunc(Number(seed) || 0) >>> 0;
  return function random() {
    let t = (state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleDeterministic(values, seed) {
  const random = mulberry32(seed);
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

function makeBlockSchedule({
  blocks,
  baseSeed,
  distances,
  seedOffset = 0,
  withObstacle,
}) {
  const rows = [];
  for (let block = 0; block < blocks; block += 1) {
    const brainSeed = baseSeed + seedOffset + block;
    distances.forEach((startDistance, distanceIndex) => {
      const sides =
        (block + distanceIndex) % 2 === 0
          ? ["L", "R"]
          : ["R", "L"];
      for (const side of sides) {
        rows.push({
          brainSeed,
          side,
          startDistance,
          withObstacle,
        });
      }
    });
  }
  return rows;
}

function makePracticeSchedule(baseSeed) {
  const obstacle = makeBlockSchedule({
    blocks: 6,
    baseSeed,
    distances: PRACTICE_DISTANCES,
    withObstacle: true,
  });
  const noObstacle = makeBlockSchedule({
    blocks: 6,
    baseSeed,
    seedOffset: 100,
    distances: PRACTICE_DISTANCES,
    withObstacle: false,
  });

  if (obstacle.length !== 48 || noObstacle.length !== 48) {
    throw new Error("practice schedule contract mismatch");
  }

  return shuffleDeterministic(
    [...obstacle, ...noObstacle],
    baseSeed + 5000,
  );
}

function makeFinalObstacleSchedule(baseSeed) {
  const rows = makeBlockSchedule({
    blocks: 4,
    baseSeed,
    distances: FINAL_DISTANCES,
    withObstacle: true,
  });
  if (rows.length !== 32) {
    throw new Error("final obstacle schedule contract mismatch");
  }
  return rows;
}

function makeFinalNoObstacleSchedule(baseSeed) {
  const rows = makeBlockSchedule({
    blocks: 2,
    baseSeed,
    seedOffset: 7000,
    distances: FINAL_DISTANCES,
    withObstacle: false,
  });
  if (rows.length !== 16) {
    throw new Error("final no-obstacle schedule contract mismatch");
  }
  return rows;
}

function makePermutation(length, seed) {
  const values = Array.from({ length }, (_, index) => index);
  return shuffleDeterministic(values, seed);
}

function stimulate(brain, inputGroups, drive) {
  for (const [name, amount] of Object.entries(drive)) {
    if (!amount) {
      continue;
    }
    const indices = inputGroups.get(name);
    if (indices?.length) {
      brain.stimulate(indices, amount);
    }
  }
}

function buildDnContract(meta) {
  const allDn = cells(
    meta,
    ["descending_neuron", "descending_neuron_tbc"],
  );

  if (allDn.length !== 1316) {
    throw new Error(
      "DN contract mismatch: " + allDn.length + " != 1316",
    );
  }

  const slot = new Int16Array(meta.n).fill(-1);
  allDn.forEach((neuron, index) => {
    slot[neuron] = index;
  });

  return { allDn, slot };
}

function collectDn(brain, dnSlot, counts) {
  for (let fired = 0; fired < brain.firedCount; fired += 1) {
    const dnIndex = dnSlot[brain.fired[fired]];
    if (dnIndex >= 0) {
      counts[dnIndex] += 1;
    }
  }
}

function makeRate(counts, steps) {
  const seconds = steps * STEP_SECONDS;
  return Float64Array.from(
    counts,
    (count) => count / seconds,
  );
}

function makeFeature(currentRate, baselineRate) {
  const feature = new Float64Array(currentRate.length);
  for (let index = 0; index < currentRate.length; index += 1) {
    feature[index] = clamp(
      (currentRate[index] - baselineRate[index]) / 50,
      -1,
      1,
    );
  }
  return feature;
}

function movementChoice(currentRate, baselineRate) {
  const feature = new Float64Array(
    movementSkill.sparseFeatureCount,
  );
  let normSquared = 0;

  for (
    let slot = 0;
    slot < movementSkill.featureIndices.length;
    slot += 1
  ) {
    const dnIndex = movementSkill.featureIndices[slot];
    const delta =
      (currentRate[dnIndex] - baselineRate[dnIndex]) / 50;
    feature[slot] = delta;
    normSquared += delta * delta;
  }

  const norm = Math.sqrt(normSquared);
  if (norm <= 1e-9) {
    return "IDLE";
  }

  for (let slot = 0; slot < feature.length; slot += 1) {
    feature[slot] /= norm;
  }

  return movementApi.choose(feature, movementSkill).action;
}

class JumpPolicy {
  constructor(featureCount) {
    this.featureCount = featureCount;
    this.weights = [
      new Float64Array(featureCount),
      new Float64Array(featureCount),
    ];
    this.bias = new Float64Array(2);
  }

  q(action, feature, permutation = null) {
    let value = this.bias[action];
    const weights = this.weights[action];

    if (permutation) {
      for (let index = 0; index < feature.length; index += 1) {
        value += weights[index] * feature[permutation[index]];
      }
    } else {
      for (let index = 0; index < feature.length; index += 1) {
        value += weights[index] * feature[index];
      }
    }

    return value;
  }

  choose(feature, epsilon, random, permutation = null) {
    if (epsilon > 0 && random() < epsilon) {
      return random() < 0.5 ? ACTION_WAIT : ACTION_JUMP;
    }

    const wait = this.q(ACTION_WAIT, feature, permutation);
    const jump = this.q(ACTION_JUMP, feature, permutation);

    if (Math.abs(wait - jump) <= 1e-12) {
      return ACTION_WAIT;
    }
    return jump > wait ? ACTION_JUMP : ACTION_WAIT;
  }

  update({ state, action, reward, nextState, nextAction, terminal }) {
    const current = this.q(action, state);
    const target = terminal
      ? reward
      : reward + GAMMA * this.q(nextAction, nextState);
    const td = clamp(target - current, -TD_CLAMP, TD_CLAMP);
    const weights = this.weights[action];

    for (let index = 0; index < weights.length; index += 1) {
      weights[index] *= 1 - LEARNING_RATE * L2_DECAY;
      weights[index] += LEARNING_RATE * td * state[index];
    }
    this.bias[action] += LEARNING_RATE * td;

    return td;
  }

  snapshot() {
    return {
      waitWeights: Array.from(this.weights[ACTION_WAIT]),
      jumpWeights: Array.from(this.weights[ACTION_JUMP]),
      waitBias: this.bias[ACTION_WAIT],
      jumpBias: this.bias[ACTION_JUMP],
    };
  }
}

class VisualEncoder {
  constructor() {
    this.lastTargetDistance = null;
  }

  reset() {
    this.lastTargetDistance = null;
  }

  encode({
    playerX,
    playerY,
    grounded,
    targetX,
    obstacle,
    obstacleVisual,
    visualEnabled = true,
  }) {
    const drive = {
      SNta_L: grounded ? 0.05 : 0,
      SNta_R: grounded ? 0.05 : 0,
    };

    if (!visualEnabled) {
      this.reset();
      return drive;
    }

    const playerCenterX = playerX + PLAYER_WIDTH / 2;
    const dx = targetX - playerCenterX;
    const targetSide = dx < 0 ? "L" : "R";
    const targetDistance = Math.abs(dx);
    const closeness = clamp(1 - targetDistance / 620, 0, 1);
    let approaching = 0;

    if (Number.isFinite(this.lastTargetDistance)) {
      approaching = clamp(
        (this.lastTargetDistance - targetDistance) / 45,
        0,
        1,
      );
    }
    this.lastTargetDistance = targetDistance;

    drive["LC10a_" + targetSide] = clamp(
      0.12 + closeness * 0.68,
      0,
      0.8,
    );
    drive["LPLC1_" + targetSide] = clamp(
      closeness * 0.12 + approaching * 0.32,
      0,
      0.55,
    );
    drive["LPLC2_" + targetSide] = clamp(
      closeness * 0.24 + approaching * 0.38,
      0,
      0.8,
    );

    if (obstacle && obstacleVisual) {
      const playerFront =
        obstacle.side === "R"
          ? playerX + PLAYER_WIDTH
          : playerX;
      const obstacleFront =
        obstacle.side === "R"
          ? obstacle.x
          : obstacle.x + obstacle.width;
      const frontDistance =
        obstacle.side === "R"
          ? obstacleFront - playerFront
          : playerFront - obstacleFront;

      const obstaclePassed =
        obstacle.side === "R"
          ? playerX > obstacle.x + obstacle.width
          : playerX + PLAYER_WIDTH < obstacle.x;

      if (!obstaclePassed) {
        drive["LC4_" + obstacle.side] = clamp(
          ((OBSTACLE_VISUAL_RADIUS - Math.max(0, frontDistance)) /
            OBSTACLE_VISUAL_RADIUS) *
            0.8,
          0,
          0.8,
        );
      }
    }

    return drive;
  }
}

function makeGeometry(episode) {
  const startCenter = WORLD_WIDTH / 2;
  const sideSign = episode.side === "L" ? -1 : 1;

  let obstacle = null;
  let targetX;

  if (episode.withObstacle) {
    if (episode.side === "R") {
      const front = startCenter + episode.startDistance;
      obstacle = {
        side: "R",
        x: front,
        y: GROUND_Y - OBSTACLE_HEIGHT,
        width: OBSTACLE_WIDTH,
        height: OBSTACLE_HEIGHT,
      };
      targetX = obstacle.x + obstacle.width + 160;
    } else {
      const front = startCenter - episode.startDistance;
      obstacle = {
        side: "L",
        x: front - OBSTACLE_WIDTH,
        y: GROUND_Y - OBSTACLE_HEIGHT,
        width: OBSTACLE_WIDTH,
        height: OBSTACLE_HEIGHT,
      };
      targetX = obstacle.x - 160;
    }
  } else {
    targetX =
      startCenter +
      sideSign *
        (episode.startDistance + OBSTACLE_WIDTH + 160);
  }

  return {
    playerX: startCenter - PLAYER_WIDTH / 2,
    playerY: GROUND_Y - PLAYER_HEIGHT,
    targetX,
    obstacle,
  };
}

function isObstacleCleared(playerX, obstacle) {
  if (!obstacle) {
    return false;
  }
  return obstacle.side === "R"
    ? playerX > obstacle.x + obstacle.width
    : playerX + PLAYER_WIDTH < obstacle.x;
}

function targetReached(playerX, targetX) {
  return (
    Math.abs(
      targetX - (playerX + PLAYER_WIDTH / 2),
    ) <= TARGET_REACH_RADIUS
  );
}

function applyPhysics(state, horizontalDirection) {
  let blocked = false;

  const nextX = clamp(
    state.playerX +
      horizontalDirection * MOVE_SPEED * STEP_SECONDS,
    0,
    WORLD_WIDTH - PLAYER_WIDTH,
  );

  state.vy += GRAVITY * STEP_SECONDS;
  let nextY = state.playerY + state.vy * STEP_SECONDS;

  if (nextY + PLAYER_HEIGHT >= GROUND_Y) {
    nextY = GROUND_Y - PLAYER_HEIGHT;
    state.vy = 0;
    state.grounded = true;
  } else {
    state.grounded = false;
  }

  let resolvedX = nextX;
  const obstacle = state.obstacle;

  if (obstacle) {
    const playerBottom = nextY + PLAYER_HEIGHT;
    const overlapsVertically =
      nextY < obstacle.y + obstacle.height &&
      playerBottom > obstacle.y;

    const overlapsHorizontally =
      nextX < obstacle.x + obstacle.width &&
      nextX + PLAYER_WIDTH > obstacle.x;

    if (overlapsVertically && overlapsHorizontally) {
      blocked = true;
      if (horizontalDirection > 0) {
        resolvedX = obstacle.x - PLAYER_WIDTH;
      } else if (horizontalDirection < 0) {
        resolvedX = obstacle.x + obstacle.width;
      } else {
        resolvedX = state.playerX;
      }
    }
  }

  state.playerX = resolvedX;
  state.playerY = nextY;

  return blocked;
}

async function initializeEpisode({
  connectome,
  dnSlot,
  episode,
}) {
  const geometry = makeGeometry(episode);
  const brain = new ConnectomeBrain(
    connectome.weights,
    connectome.meta.params,
    episode.brainSeed,
  );
  const encoder = new VisualEncoder();

  const state = {
    brain,
    encoder,
    playerX: geometry.playerX,
    playerY: geometry.playerY,
    targetX: geometry.targetX,
    obstacle: geometry.obstacle,
    grounded: true,
    vy: 0,
    moveAction: "IDLE",
    moveCounts: new Float64Array(1316),
    moveSteps: 0,
    jumpCooldown: 0,
    jumpSpent: false,
  };

  for (let step = 0; step < SETTLE_STEPS; step += 1) {
    stimulate(
      brain,
      connectome.inputGroups,
      encoder.encode({
        ...state,
        obstacleVisual: false,
        visualEnabled: false,
      }),
    );
    brain.step();
  }

  const baselineCounts = new Float64Array(1316);
  for (let step = 0; step < BASELINE_STEPS; step += 1) {
    stimulate(
      brain,
      connectome.inputGroups,
      encoder.encode({
        ...state,
        obstacleVisual: false,
        visualEnabled: false,
      }),
    );
    brain.step();
    collectDn(brain, dnSlot, baselineCounts);
  }

  encoder.reset();

  return {
    ...state,
    baselineRate: makeRate(
      baselineCounts,
      BASELINE_STEPS,
    ),
  };
}

function updateMovement(state, dnSlot) {
  collectDn(state.brain, dnSlot, state.moveCounts);
  state.moveSteps += 1;

  if (state.moveSteps < MOVE_WINDOW_STEPS) {
    return;
  }

  const currentRate = makeRate(
    state.moveCounts,
    state.moveSteps,
  );
  state.moveAction = movementChoice(
    currentRate,
    state.baselineRate,
  );
  state.moveCounts.fill(0);
  state.moveSteps = 0;
}

function moveDirection(action) {
  return action === "LEFT"
    ? -1
    : action === "RIGHT"
      ? 1
      : 0;
}

function chooseAvailableJumpAction({
  state,
  policy,
  feature,
  epsilon,
  random,
  permutation,
}) {
  if (!state.grounded || state.jumpCooldown > 0) {
    policy.observeUnavailable?.(
      feature,
      permutation,
    );
    return ACTION_WAIT;
  }

  return policy.choose(
    feature,
    epsilon,
    random,
    permutation,
  );
}

function actuateJump(state, action) {
  if (
    action !== ACTION_JUMP ||
    !state.grounded ||
    state.jumpCooldown > 0
  ) {
    return false;
  }

  state.vy = -JUMP_VELOCITY;
  state.grounded = false;
  state.jumpCooldown = JUMP_COOLDOWN_STEPS;
  return true;
}

function recordObstacleFrontDistance(state) {
  if (!state.obstacle) {
    return null;
  }
  if (state.obstacle.side === "R") {
    return (
      state.obstacle.x -
      (state.playerX + PLAYER_WIDTH)
    );
  }
  return (
    state.playerX -
    (state.obstacle.x + state.obstacle.width)
  );
}

async function collectDecisionState({
  state,
  connectome,
  dnSlot,
  obstacleVisual,
}) {
  const counts = new Float64Array(1316);
  let blocked = false;

  for (let step = 0; step < JUMP_WINDOW_STEPS; step += 1) {
    stimulate(
      state.brain,
      connectome.inputGroups,
      state.encoder.encode({
        ...state,
        obstacleVisual,
        visualEnabled: true,
      }),
    );
    state.brain.step();

    collectDn(state.brain, dnSlot, counts);
    updateMovement(state, dnSlot);

    const direction = moveDirection(state.moveAction);
    blocked =
      applyPhysics(state, direction) || blocked;

    if (state.jumpCooldown > 0) {
      state.jumpCooldown -= 1;
    }
  }

  return {
    feature: makeFeature(
      makeRate(counts, JUMP_WINDOW_STEPS),
      state.baselineRate,
    ),
    blocked,
  };
}

function terminalStatus(state, episode) {
  if (episode.withObstacle) {
    if (isObstacleCleared(state.playerX, state.obstacle)) {
      return "CLEAR";
    }
    return null;
  }

  if (targetReached(state.playerX, state.targetX)) {
    return "TARGET";
  }
  return null;
}

async function runEpisode({
  connectome,
  dnSlot,
  episode,
  policy,
  epsilon,
  random,
  train,
  obstacleVisual,
  permutation = null,
}) {
  const state = await initializeEpisode({
    connectome,
    dnSlot,
    episode,
  });

  policy.resetEpisode?.();

  let totalBrainSteps = 0;
  let actualJumps = 0;
  let blockedWindows = 0;
  let firstJumpStep = null;
  let firstJumpFrontDistance = null;
  let tdAbsSum = 0;
  let tdUpdates = 0;

  let observed = await collectDecisionState({
    state,
    connectome,
    dnSlot,
    obstacleVisual,
  });
  totalBrainSteps += JUMP_WINDOW_STEPS;

  let feature = observed.feature;
  let action = chooseAvailableJumpAction({
    state,
    policy,
    feature,
    epsilon,
    random,
    permutation,
  });

  while (totalBrainSteps < MAX_STEPS) {
    const jumpActuated = actuateJump(state, action);

    if (jumpActuated) {
      actualJumps += 1;
      policy.onActuatedJump?.();
      if (firstJumpStep === null) {
        firstJumpStep = totalBrainSteps;
        firstJumpFrontDistance =
          recordObstacleFrontDistance(state);
      }
    }

    let reward = jumpActuated ? -0.20 : 0;

    const nextObserved = await collectDecisionState({
      state,
      connectome,
      dnSlot,
      obstacleVisual,
    });
    totalBrainSteps += JUMP_WINDOW_STEPS;

    if (nextObserved.blocked && episode.withObstacle) {
      blockedWindows += 1;
      reward -= 0.04;
    }

    const terminal = terminalStatus(state, episode);
    if (terminal === "CLEAR") {
      reward += 2.0;
    } else if (terminal === "TARGET") {
      reward += 1.0;
    }

    const timedOut =
      !terminal && totalBrainSteps >= MAX_STEPS;

    if (timedOut) {
      reward += episode.withObstacle ? -1.0 : -0.5;
    }

    const isTerminal = Boolean(terminal || timedOut);
    const nextFeature = nextObserved.feature;
    const nextAction = isTerminal
      ? ACTION_WAIT
      : chooseAvailableJumpAction({
          state,
          policy,
          feature: nextFeature,
          epsilon,
          random,
          permutation,
        });

    if (train) {
      const td = policy.update({
        state: feature,
        action,
        reward,
        nextState: nextFeature,
        nextAction,
        terminal: isTerminal,
      });
      tdAbsSum += Math.abs(td);
      tdUpdates += 1;
    }

    if (isTerminal) {
      return {
        outcome:
          terminal ??
          "TIMEOUT",
        clear: terminal === "CLEAR",
        targetReach: terminal === "TARGET",
        timeout: timedOut,
        actualJumps,
        retryJumps: Math.max(0, actualJumps - 1),
        anyJump: actualJumps > 0,
        blockedWindows,
        firstJumpStep,
        firstJumpFrontDistance,
        brainSteps: totalBrainSteps,
        meanAbsTd:
          tdUpdates > 0
            ? tdAbsSum / tdUpdates
            : 0,
      };
    }

    feature = nextFeature;
    action = nextAction;
  }

  throw new Error("episode loop escaped without terminal");
}

async function runPracticeCohort({
  connectome,
  dnSlot,
  policy,
  cohortIndex,
}) {
  const baseSeed = PRACTICE_BASE_SEEDS[cohortIndex];
  const epsilon = EPSILONS[cohortIndex];
  const schedule = makePracticeSchedule(baseSeed);
  const random = mulberry32(baseSeed + 8000);
  const rows = [];

  for (let index = 0; index < schedule.length; index += 1) {
    const row = await runEpisode({
      connectome,
      dnSlot,
      episode: schedule[index],
      policy,
      epsilon,
      random,
      train: true,
      obstacleVisual: schedule[index].withObstacle,
    });
    rows.push({
      ...schedule[index],
      ...row,
    });

    if ((index + 1) % 16 === 0) {
      console.log(
        "[v11c-practice] cohort=" +
          (cohortIndex + 1) +
          " " +
          (index + 1) +
          "/" +
          schedule.length,
      );
      await new Promise((resolve) =>
        setImmediate(resolve),
      );
    }
  }

  const obstacleRows = rows.filter(
    (row) => row.withObstacle,
  );
  const noObstacleRows = rows.filter(
    (row) => !row.withObstacle,
  );

  return {
    cohort: cohortIndex + 1,
    baseSeed,
    epsilon,
    episodes: rows.length,
    obstacleClearRate: mean(
      obstacleRows.map((row) => Number(row.clear)),
    ),
    obstacleTimeoutRate: mean(
      obstacleRows.map((row) => Number(row.timeout)),
    ),
    obstacleMeanJumps: mean(
      obstacleRows.map((row) => row.actualJumps),
    ),
    noObstacleReachRate: mean(
      noObstacleRows.map((row) =>
        Number(row.targetReach),
      ),
    ),
    noObstacleAnyJumpRate: mean(
      noObstacleRows.map((row) =>
        Number(row.anyJump),
      ),
    ),
    meanAbsTd: mean(
      rows.map((row) => row.meanAbsTd),
    ),
  };
}

async function evaluateObstacleCondition({
  connectome,
  dnSlot,
  policy,
  baseSeed,
  condition,
}) {
  const schedule = makeFinalObstacleSchedule(baseSeed);
  const permutation =
    condition === "DN_SHUFFLED"
      ? makePermutation(1316, baseSeed + 900000)
      : null;
  const obstacleVisual = condition !== "VISUAL_OFF";
  const rows = [];

  for (let index = 0; index < schedule.length; index += 1) {
    const row = await runEpisode({
      connectome,
      dnSlot,
      episode: schedule[index],
      policy,
      epsilon: 0,
      random: mulberry32(baseSeed + 12000 + index),
      train: false,
      obstacleVisual,
      permutation,
    });
    rows.push(row);
  }

  return {
    condition,
    episodes: rows.length,
    clearRate: mean(rows.map((row) => Number(row.clear))),
    timeoutRate: mean(
      rows.map((row) => Number(row.timeout)),
    ),
    meanActualJumps: mean(
      rows.map((row) => row.actualJumps),
    ),
    meanRetryJumps: mean(
      rows.map((row) => row.retryJumps),
    ),
    meanBlockedWindows: mean(
      rows.map((row) => row.blockedWindows),
    ),
    rows,
  };
}

async function evaluateNoObstacle({
  connectome,
  dnSlot,
  policy,
  baseSeed,
}) {
  const schedule = makeFinalNoObstacleSchedule(baseSeed);
  const rows = [];

  for (let index = 0; index < schedule.length; index += 1) {
    rows.push(
      await runEpisode({
        connectome,
        dnSlot,
        episode: schedule[index],
        policy,
        epsilon: 0,
        random: mulberry32(baseSeed + 13000 + index),
        train: false,
        obstacleVisual: false,
      }),
    );
  }

  return {
    episodes: rows.length,
    targetReachRate: mean(
      rows.map((row) => Number(row.targetReach)),
    ),
    anyJumpRate: mean(
      rows.map((row) => Number(row.anyJump)),
    ),
    meanActualJumps: mean(
      rows.map((row) => row.actualJumps),
    ),
    meanRetryJumps: mean(
      rows.map((row) => row.retryJumps),
    ),
    rows,
  };
}

function percent(value) {
  return (value * 100).toFixed(1) + "%";
}



const CANDIDATE_PATH = resolve(
  "src/brain/fly-skill-v11e-jump-candidate.json",
);
const PERSISTENCE_WINDOWS = 2;

function sigmoid(value) {
  const bounded = clamp(value, -30, 30);
  return 1 / (1 + Math.exp(-bounded));
}

class FrozenPersistentOutcomePolicy {
  constructor(candidate) {
    this.candidate = candidate;
    this.api = globalThis.MapleFlyJumpSkillV11;
    this.state = this.api?.BUNDLED_STATE;
    this.runtime = this.api?.createRuntime?.();

    if (!this.api || !this.state || !this.runtime) {
      throw new Error("browser JUMP bundle unavailable");
    }

    if (!this.api.validState(this.state)) {
      throw new Error("browser JUMP bundled state invalid");
    }

    if (
      this.state.sourceRun !== 35607509887 ||
      this.state.sourceArtifact !== 10643127642 ||
      this.state.sourceHeadSha !==
        "90f3e14f9c1e2456a84624826051357548b1e4b6" ||
      this.state.sourceArtifactDigest !==
        "sha256:80c316f633b5fb97e8de3123eaf4271542ef4b5917612e9814e265687e2577b9"
    ) {
      throw new Error("browser JUMP provenance mismatch");
    }
  }

  resetEpisode() {
    this.api.resetRuntime(this.runtime);
  }

  observeUnavailable(feature, permutation = null) {
    this.api.observeUnavailableRaw(
      feature,
      this.state,
      this.runtime,
      permutation,
    );
  }

  onActuatedJump() {
    this.api.onActuatedJump(this.runtime);
  }

  probability(feature, permutation = null) {
    return this.api.probabilityRaw(
      feature,
      this.state,
      permutation,
    );
  }

  choose(
    feature,
    _epsilon = 0,
    _random = null,
    permutation = null,
  ) {
    return this.api.chooseRaw(
      feature,
      this.state,
      this.runtime,
      permutation,
    ).action === "JUMP"
      ? ACTION_JUMP
      : ACTION_WAIT;
  }
}

function validateCandidate(candidate) {
  if (
    candidate.schema !==
    "maplefly.fly-jump-candidate.v11e.1"
  ) {
    throw new Error(
      "candidate schema mismatch: " +
        candidate.schema,
    );
  }

  if (
    candidate.provenance.runId !==
    35596856019
  ) {
    throw new Error("candidate run provenance mismatch");
  }

  if (
    candidate.provenance.headSha !==
    "5d460569816b342010aa8ad8320f040e8053ef64"
  ) {
    throw new Error("candidate head provenance mismatch");
  }

  if (
    candidate.provenance.artifactId !==
    10636579724
  ) {
    throw new Error(
      "candidate artifact provenance mismatch",
    );
  }

  if (
    candidate.provenance.artifactDigest !==
    "fde1df68e40c0908d090e1b61749a714ab7cc3c19898a9746ce0e43a98544afe"
  ) {
    throw new Error(
      "candidate digest provenance mismatch",
    );
  }

  if (
    candidate.brain.repository !== SOURCE.repository ||
    candidate.brain.commit !== SOURCE.commit ||
    candidate.brain.dnCount !== 1316
  ) {
    throw new Error("candidate brain contract mismatch");
  }

  const expectedWindows = {
    settle: SETTLE_STEPS,
    baseline: BASELINE_STEPS,
    movement: MOVE_WINDOW_STEPS,
    jump: JUMP_WINDOW_STEPS,
  };

  for (const [key, value] of Object.entries(
    expectedWindows,
  )) {
    if (candidate.windows[key] !== value) {
      throw new Error(
        "candidate window mismatch: " + key,
      );
    }
  }

  if (
    candidate.temporal?.positivePersistenceWindows !== 2 ||
    candidate.temporal?.resetOnActuatedJump !== true
  ) {
    throw new Error("candidate temporal contract mismatch");
  }
}

async function main() {
  const outDir = resolve("results/verify-v11f-jump-browser");
  await mkdir(outDir, { recursive: true });

  const candidate = JSON.parse(
    await readFile(CANDIDATE_PATH, "utf8"),
  );
  validateCandidate(candidate);

  const connectome = await loadConnectome({
    cacheDir: resolve(".cache/maplefly-connectome"),
    onProgress(message) {
      console.log("[connectome] " + message);
    },
  });

  const contract = buildDnContract(
    connectome.meta,
  );
  const policy = new FrozenPersistentOutcomePolicy(
    candidate,
  );
  const perRun = [];

  for (
    let run = 0;
    run < FINAL_BASE_SEEDS.length;
    run += 1
  ) {
    const baseSeed = FINAL_BASE_SEEDS[run];

    const full =
      await evaluateObstacleCondition({
        connectome,
        dnSlot: contract.slot,
        policy,
        baseSeed,
        condition: "FULL",
      });
    const visualOff =
      await evaluateObstacleCondition({
        connectome,
        dnSlot: contract.slot,
        policy,
        baseSeed,
        condition: "VISUAL_OFF",
      });
    const shuffled =
      await evaluateObstacleCondition({
        connectome,
        dnSlot: contract.slot,
        policy,
        baseSeed,
        condition: "DN_SHUFFLED",
      });
    const noObstacle =
      await evaluateNoObstacle({
        connectome,
        dnSlot: contract.slot,
        policy,
        baseSeed,
      });

    perRun.push({
      run: run + 1,
      baseSeed,
      FULL: full,
      VISUAL_OFF: visualOff,
      DN_SHUFFLED: shuffled,
      NO_OBSTACLE: noObstacle,
    });

    console.log(
      "[v11f-browser] run=" +
        (run + 1) +
        " FULL=" +
        percent(full.clearRate) +
        " VISUAL_OFF=" +
        percent(visualOff.clearRate) +
        " SHUFFLED=" +
        percent(shuffled.clearRate) +
        " NO_OBS_JUMP=" +
        percent(noObstacle.anyJumpRate),
    );
  }

  const meanFull = mean(
    perRun.map((run) => run.FULL.clearRate),
  );
  const meanVisualOff = mean(
    perRun.map(
      (run) => run.VISUAL_OFF.clearRate,
    ),
  );
  const meanShuffled = mean(
    perRun.map(
      (run) => run.DN_SHUFFLED.clearRate,
    ),
  );
  const meanTimeout = mean(
    perRun.map(
      (run) => run.FULL.timeoutRate,
    ),
  );
  const noObstacleAnyJump = mean(
    perRun.map(
      (run) => run.NO_OBSTACLE.anyJumpRate,
    ),
  );
  const noObstacleReach = mean(
    perRun.map(
      (run) =>
        run.NO_OBSTACLE.targetReachRate,
    ),
  );
  const minRunFull = Math.min(
    ...perRun.map(
      (run) => run.FULL.clearRate,
    ),
  );
  const meanFullActualJumps = mean(
    perRun.map(
      (run) => run.FULL.meanActualJumps,
    ),
  );
  const meanFullRetryJumps = mean(
    perRun.map(
      (run) => run.FULL.meanRetryJumps,
    ),
  );

  const gate =
    meanFull >= 0.75 &&
    minRunFull >= 0.65 &&
    meanFull - meanVisualOff >= 0.25 &&
    meanFull - meanShuffled >= 0.20 &&
    meanTimeout <= 0.20 &&
    meanFullActualJumps <= 1.75 &&
    noObstacleReach >= 0.85 &&
    noObstacleAnyJump <= 0.30;

  const summary = {
    meanFullClearRate: meanFull,
    meanVisualOffClearRate: meanVisualOff,
    visualContribution:
      meanFull - meanVisualOff,
    meanDnShuffledClearRate:
      meanShuffled,
    dnIdentityContribution:
      meanFull - meanShuffled,
    minRunFullClearRate: minRunFull,
    meanFullTimeoutRate: meanTimeout,
    meanFullActualJumps,
    meanFullRetryJumps,
    noObstacleAnyJumpRate:
      noObstacleAnyJump,
    noObstacleTargetReachRate:
      noObstacleReach,
    gate,
  };

  const output = {
    meta: {
      schema:
        "maplefly.verify-v11f-jump-browser-equivalence.1",
      phase: "F-browser-equivalence",
      brainRepository: SOURCE.repository,
      brainCommit: SOURCE.commit,
      dnCount: contract.allDn.length,
      movementVersion: movementSkill.version,
      sourceCandidate: {
        path: "src/brain/fly-skill-v11e-jump-candidate.json",
        runId: candidate.provenance.runId,
        headSha: candidate.provenance.headSha,
        artifactId: candidate.provenance.artifactId,
        artifactDigest:
          candidate.provenance.artifactDigest,
      },
      classifier: {
        selectedFeatureCount:
          candidate.classifier.featureIndices.length,
        threshold:
          candidate.classifier.threshold,
        persistenceWindows:
          PERSISTENCE_WINDOWS,
        realCooldownSteps:
          JUMP_COOLDOWN_STEPS,
        singleJumpBudget: false,
      },
      windows: {
        settle: SETTLE_STEPS,
        baseline: BASELINE_STEPS,
        movement: MOVE_WINDOW_STEPS,
        jump: JUMP_WINDOW_STEPS,
      },
      finalSeeds: FINAL_BASE_SEEDS,
      finalDistances: FINAL_DISTANCES,
      antiLeak:
        "jump uses only frozen MaleCNS DN classifier threshold history; no obstacle distance/coordinates/timing labels enter policy",
    },
    summary,
    perRun,
  };

  await writeFile(
    resolve(outDir, "verify_v11f_jump_browser.json"),
    JSON.stringify(output, null, 2) + "\n",
  );

  const expected = [
    { full: 1, visualOff: 0, shuffled: 0, noObsJump: 0, noObsReach: 1, jumps: 1.1875, retries: 0.1875 },
    { full: 1, visualOff: 0, shuffled: 0, noObsJump: 0, noObsReach: 1, jumps: 1.125, retries: 0.125 },
    { full: 1, visualOff: 0, shuffled: 0, noObsJump: 0, noObsReach: 1, jumps: 1.28125, retries: 0.28125 },
  ];

  for (let index = 0; index < perRun.length; index += 1) {
    const row = perRun[index];
    const want = expected[index];
    const actual = {
      full: row.FULL.clearRate,
      visualOff: row.VISUAL_OFF.clearRate,
      shuffled: row.DN_SHUFFLED.clearRate,
      noObsJump: row.NO_OBSTACLE.anyJumpRate,
      noObsReach: row.NO_OBSTACLE.targetReachRate,
      jumps: row.FULL.meanActualJumps,
      retries: row.FULL.meanRetryJumps,
    };
    for (const [key, value] of Object.entries(want)) {
      if (Math.abs(actual[key] - value) > 1e-12) {
        throw new Error(
          "browser equivalence mismatch run=" +
            (index + 1) +
            " metric=" +
            key +
            " actual=" +
            actual[key] +
            " expected=" +
            value,
        );
      }
    }
  }

  if (
    !gate ||
    Math.abs(meanFull - 1) > 1e-12 ||
    Math.abs(meanVisualOff) > 1e-12 ||
    Math.abs(meanShuffled) > 1e-12 ||
    Math.abs(noObstacleAnyJump) > 1e-12 ||
    Math.abs(noObstacleReach - 1) > 1e-12 ||
    Math.abs(meanFullActualJumps - 1.1979166666666667) > 1e-12 ||
    Math.abs(meanFullRetryJumps - 0.19791666666666666) > 1e-12
  ) {
    throw new Error("browser aggregate equivalence mismatch");
  }

  console.log(
    "V11F-JUMP-BROWSER-EQUIVALENCE=PASS " +
      "FULL=100.0% VISUAL_OFF=0.0% SHUFFLED=0.0% " +
      "FULL_JUMPS=1.198 RETRIES=0.198 NO_OBS_JUMP=0.0%",
  );

  console.log(
    "V11F-JUMP-GATE=" +
      (gate ? "PASS" : "FAIL") +
      " FULL=" +
      percent(meanFull) +
      " VISUAL_OFF=" +
      percent(meanVisualOff) +
      " SHUFFLED=" +
      percent(meanShuffled) +
      " FULL_JUMPS=" +
      meanFullActualJumps.toFixed(3) +
      " RETRIES=" +
      meanFullRetryJumps.toFixed(3) +
      " NO_OBS_JUMP=" +
      percent(noObstacleAnyJump) +
      " NO_OBS_REACH=" +
      percent(noObstacleReach),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
