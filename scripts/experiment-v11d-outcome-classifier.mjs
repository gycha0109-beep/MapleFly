#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  SOURCE,
  ConnectomeBrain,
  cells,
  loadConnectome,
} from "../src/headless/connectome-runtime.mjs";
import "../src/brain/fly-skill-v7.js";

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
const FINAL_BASE_SEEDS = [851000, 861000, 871000];
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
  if (state.jumpSpent) {
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
    state.jumpSpent ||
    !state.grounded ||
    state.jumpCooldown > 0
  ) {
    return false;
  }

  state.vy = -JUMP_VELOCITY;
  state.grounded = false;
  state.jumpCooldown = JUMP_COOLDOWN_STEPS;
  state.jumpSpent = true;
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
    rows,
  };
}

function percent(value) {
  return (value * 100).toFixed(1) + "%";
}


const OUTCOME_SELECTED_FEATURES = 128;
const OUTCOME_EPOCHS = 300;
const OUTCOME_LEARNING_RATE = 0.03;
const OUTCOME_L2 = 0.001;
const OUTCOME_THRESHOLD = 0.5;
const OUTCOME_MIN_CLASS = 24;
const RANDOM_JUMP_WINDOWS = 12;

function makeOutcomePracticeSchedule(baseSeed) {
  const rows = [];

  for (let block = 0; block < 12; block += 1) {
    PRACTICE_DISTANCES.forEach((startDistance, distanceIndex) => {
      const sides =
        (block + distanceIndex) % 2 === 0
          ? ["L", "R"]
          : ["R", "L"];

      for (const side of sides) {
        const sideIndex = side === "L" ? 0 : 1;
        rows.push({
          brainSeed:
            baseSeed +
            block * 8 +
            distanceIndex * 2 +
            sideIndex,
          side,
          startDistance,
          withObstacle: true,
          block,
          distanceIndex,
        });
      }
    });
  }

  if (rows.length !== 96) {
    throw new Error(
      "Phase D practice schedule contract mismatch: " +
        rows.length,
    );
  }

  return rows;
}

function randomJumpWindow(brainSeed) {
  const random = mulberry32(brainSeed + 3000);
  return 1 + Math.floor(random() * RANDOM_JUMP_WINDOWS);
}

function varianceTopIndices(samples, count) {
  const featureCount = samples[0].feature.length;
  const means = new Float64Array(featureCount);
  const variances = new Float64Array(featureCount);

  for (const sample of samples) {
    for (let index = 0; index < featureCount; index += 1) {
      means[index] += sample.feature[index];
    }
  }

  for (let index = 0; index < featureCount; index += 1) {
    means[index] /= samples.length;
  }

  for (const sample of samples) {
    for (let index = 0; index < featureCount; index += 1) {
      const delta = sample.feature[index] - means[index];
      variances[index] += delta * delta;
    }
  }

  for (let index = 0; index < featureCount; index += 1) {
    variances[index] /=
      Math.max(1, samples.length - 1);
  }

  return Array.from(
    { length: featureCount },
    (_, index) => index,
  )
    .sort(
      (a, b) =>
        variances[b] - variances[a] || a - b,
    )
    .slice(0, count);
}

function fitSparseStandardizer(samples, indices) {
  const means = new Float64Array(indices.length);
  const scales = new Float64Array(indices.length);

  for (const sample of samples) {
    indices.forEach((dnIndex, slot) => {
      means[slot] += sample.feature[dnIndex];
    });
  }

  for (let slot = 0; slot < indices.length; slot += 1) {
    means[slot] /= samples.length;
  }

  for (const sample of samples) {
    indices.forEach((dnIndex, slot) => {
      const delta =
        sample.feature[dnIndex] - means[slot];
      scales[slot] += delta * delta;
    });
  }

  for (let slot = 0; slot < indices.length; slot += 1) {
    scales[slot] = Math.sqrt(
      scales[slot] /
        Math.max(1, samples.length - 1),
    );
    if (
      !Number.isFinite(scales[slot]) ||
      scales[slot] < 1e-6
    ) {
      scales[slot] = 1;
    }
  }

  return { means, scales };
}

function sparseStandardizedFeature(
  feature,
  indices,
  stats,
  permutation = null,
) {
  const output = new Float64Array(indices.length);

  for (let slot = 0; slot < indices.length; slot += 1) {
    const selectedDn = indices[slot];
    const sourceDn = permutation
      ? permutation[selectedDn]
      : selectedDn;

    output[slot] = clamp(
      (feature[sourceDn] - stats.means[slot]) /
        stats.scales[slot],
      -5,
      5,
    );
  }

  return output;
}

class OutcomeClassifier {
  constructor(indices, stats) {
    this.indices = indices;
    this.stats = stats;
    this.weights = new Float64Array(indices.length);
    this.bias = 0;
  }

  score(feature, permutation = null) {
    const x = sparseStandardizedFeature(
      feature,
      this.indices,
      this.stats,
      permutation,
    );
    let score = this.bias;
    for (let slot = 0; slot < x.length; slot += 1) {
      score += this.weights[slot] * x[slot];
    }
    return score;
  }

  probability(feature, permutation = null) {
    const score = clamp(
      this.score(feature, permutation),
      -30,
      30,
    );
    return 1 / (1 + Math.exp(-score));
  }

  choose(
    feature,
    _epsilon = 0,
    _random = null,
    permutation = null,
  ) {
    return this.probability(feature, permutation) >=
      OUTCOME_THRESHOLD
      ? ACTION_JUMP
      : ACTION_WAIT;
  }

  train(samples) {
    const clearCount = samples.filter(
      (sample) => sample.label === 1,
    ).length;
    const failCount = samples.length - clearCount;

    if (
      clearCount < OUTCOME_MIN_CLASS ||
      failCount < OUTCOME_MIN_CLASS
    ) {
      return {
        trained: false,
        clearCount,
        failCount,
      };
    }

    const clearWeight = 0.5 / clearCount;
    const failWeight = 0.5 / failCount;

    for (let epoch = 0; epoch < OUTCOME_EPOCHS; epoch += 1) {
      const gradient = new Float64Array(
        this.weights.length,
      );
      let biasGradient = 0;

      for (const sample of samples) {
        const x = sparseStandardizedFeature(
          sample.feature,
          this.indices,
          this.stats,
        );
        let score = this.bias;
        for (let slot = 0; slot < x.length; slot += 1) {
          score += this.weights[slot] * x[slot];
        }
        const bounded = clamp(score, -30, 30);
        const probability =
          1 / (1 + Math.exp(-bounded));
        const sampleWeight =
          sample.label === 1
            ? clearWeight
            : failWeight;
        const error =
          (probability - sample.label) * sampleWeight;

        biasGradient += error;
        for (let slot = 0; slot < x.length; slot += 1) {
          gradient[slot] += error * x[slot];
        }
      }

      this.bias -=
        OUTCOME_LEARNING_RATE * biasGradient;

      for (
        let slot = 0;
        slot < this.weights.length;
        slot += 1
      ) {
        this.weights[slot] -=
          OUTCOME_LEARNING_RATE *
          (gradient[slot] +
            OUTCOME_L2 * this.weights[slot]);
      }
    }

    return {
      trained: true,
      clearCount,
      failCount,
    };
  }

  snapshot() {
    return {
      featureIndices: [...this.indices],
      means: Array.from(this.stats.means),
      scales: Array.from(this.stats.scales),
      weights: Array.from(this.weights),
      bias: this.bias,
      threshold: OUTCOME_THRESHOLD,
    };
  }
}

async function runRandomJumpOutcomeEpisode({
  connectome,
  dnSlot,
  episode,
}) {
  const state = await initializeEpisode({
    connectome,
    dnSlot,
    episode,
  });

  const chosenWindow = randomJumpWindow(
    episode.brainSeed,
  );

  let totalBrainSteps = 0;
  let blockedWindows = 0;
  let jumpFeature = null;
  let firstJumpStep = null;
  let firstJumpFrontDistance = null;
  let jumpActuated = false;

  for (
    let decisionWindow = 1;
    totalBrainSteps < MAX_STEPS;
    decisionWindow += 1
  ) {
    const observed = await collectDecisionState({
      state,
      connectome,
      dnSlot,
      obstacleVisual: true,
    });
    totalBrainSteps += JUMP_WINDOW_STEPS;

    if (observed.blocked) {
      blockedWindows += 1;
    }

    if (
      !jumpActuated &&
      decisionWindow === chosenWindow
    ) {
      jumpFeature = observed.feature;
      firstJumpStep = totalBrainSteps;
      firstJumpFrontDistance =
        recordObstacleFrontDistance(state);
      jumpActuated = actuateJump(
        state,
        ACTION_JUMP,
      );

      if (!jumpActuated) {
        throw new Error(
          "random one-jump actuator failed before any prior jump",
        );
      }
    }

    const terminal = terminalStatus(
      state,
      episode,
    );
    if (terminal === "CLEAR") {
      if (!jumpFeature) {
        throw new Error(
          "obstacle cleared before random jump sample",
        );
      }
      return {
        label: 1,
        feature: jumpFeature,
        outcome: "CLEAR",
        clear: true,
        timeout: false,
        chosenWindow,
        firstJumpStep,
        firstJumpFrontDistance,
        blockedWindows,
        brainSteps: totalBrainSteps,
      };
    }

    if (totalBrainSteps >= MAX_STEPS) {
      if (!jumpFeature) {
        throw new Error(
          "timeout before configured random jump window",
        );
      }
      return {
        label: 0,
        feature: jumpFeature,
        outcome: "FAIL",
        clear: false,
        timeout: true,
        chosenWindow,
        firstJumpStep,
        firstJumpFrontDistance,
        blockedWindows,
        brainSteps: totalBrainSteps,
      };
    }
  }

  throw new Error(
    "random outcome episode escaped without terminal",
  );
}

async function collectOutcomePractice({
  connectome,
  dnSlot,
}) {
  const samples = [];
  const cohorts = [];

  for (
    let cohortIndex = 0;
    cohortIndex < PRACTICE_BASE_SEEDS.length;
    cohortIndex += 1
  ) {
    const baseSeed =
      PRACTICE_BASE_SEEDS[cohortIndex];
    const schedule =
      makeOutcomePracticeSchedule(baseSeed);
    const rows = [];

    for (
      let index = 0;
      index < schedule.length;
      index += 1
    ) {
      const episode = schedule[index];
      const result =
        await runRandomJumpOutcomeEpisode({
          connectome,
          dnSlot,
          episode,
        });

      const sample = {
        ...result,
        baseSeed,
        brainSeed: episode.brainSeed,
        side: episode.side,
        startDistance: episode.startDistance,
      };
      samples.push(sample);
      rows.push(sample);

      if ((index + 1) % 16 === 0) {
        console.log(
          "[v11d-practice] cohort=" +
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

    const clearRows = rows.filter(
      (row) => row.label === 1,
    );
    const failRows = rows.filter(
      (row) => row.label === 0,
    );

    cohorts.push({
      cohort: cohortIndex + 1,
      baseSeed,
      episodes: rows.length,
      clearCount: clearRows.length,
      failCount: failRows.length,
      clearRate:
        clearRows.length / rows.length,
      meanClearJumpDistance: mean(
        clearRows.map(
          (row) => row.firstJumpFrontDistance,
        ),
      ),
      meanFailJumpDistance: mean(
        failRows.map(
          (row) => row.firstJumpFrontDistance,
        ),
      ),
    });
  }

  return { samples, cohorts };
}

async function main() {
  const outDir = resolve("results/experiment-v11d");
  await mkdir(outDir, { recursive: true });

  const connectome = await loadConnectome({
    cacheDir: resolve(".cache/maplefly-connectome"),
    onProgress(message) {
      console.log("[connectome] " + message);
    },
  });

  const contract = buildDnContract(
    connectome.meta,
  );

  const practice = await collectOutcomePractice({
    connectome,
    dnSlot: contract.slot,
  });

  const clearCount = practice.samples.filter(
    (sample) => sample.label === 1,
  ).length;
  const failCount =
    practice.samples.length - clearCount;
  const supportGate =
    clearCount >= OUTCOME_MIN_CLASS &&
    failCount >= OUTCOME_MIN_CLASS;

  const selectedIndices = varianceTopIndices(
    practice.samples,
    OUTCOME_SELECTED_FEATURES,
  );
  const stats = fitSparseStandardizer(
    practice.samples,
    selectedIndices,
  );
  const classifier = new OutcomeClassifier(
    selectedIndices,
    stats,
  );
  const trainResult = classifier.train(
    practice.samples,
  );

  if (!supportGate || !trainResult.trained) {
    const output = {
      meta: {
        schema:
          "maplefly.experiment-v11d.random-jump-outcome.1",
        brainRepository: SOURCE.repository,
        brainCommit: SOURCE.commit,
        dnCount: contract.allDn.length,
        practiceSeeds: PRACTICE_BASE_SEEDS,
        practiceDistances: PRACTICE_DISTANCES,
        finalSeeds: FINAL_BASE_SEEDS,
        finalDistances: FINAL_DISTANCES,
        randomJumpWindows:
          RANDOM_JUMP_WINDOWS,
        supportMinimumPerClass:
          OUTCOME_MIN_CLASS,
      },
      practice: practice.cohorts,
      support: {
        clearCount,
        failCount,
        gate: false,
      },
      summary: {
        gate: false,
        reason: "practice_support",
      },
    };

    await writeFile(
      resolve(outDir, "experiment_v11d.json"),
      JSON.stringify(output, null, 2) + "\n",
    );

    console.log(
      "V11D-JUMP-GATE=FAIL reason=practice_support" +
        " CLEAR=" +
        clearCount +
        " FAIL=" +
        failCount,
    );
    return;
  }

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
        policy: classifier,
        baseSeed,
        condition: "FULL",
      });
    const visualOff =
      await evaluateObstacleCondition({
        connectome,
        dnSlot: contract.slot,
        policy: classifier,
        baseSeed,
        condition: "VISUAL_OFF",
      });
    const shuffled =
      await evaluateObstacleCondition({
        connectome,
        dnSlot: contract.slot,
        policy: classifier,
        baseSeed,
        condition: "DN_SHUFFLED",
      });
    const noObstacle =
      await evaluateNoObstacle({
        connectome,
        dnSlot: contract.slot,
        policy: classifier,
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
      "[v11d-final] run=" +
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

  const gate =
    supportGate &&
    meanFull >= 0.70 &&
    minRunFull >= 0.60 &&
    meanFull - meanVisualOff >= 0.25 &&
    meanFull - meanShuffled >= 0.20 &&
    meanTimeout <= 0.25 &&
    noObstacleReach >= 0.85 &&
    noObstacleAnyJump <= 0.30;

  const summary = {
    supportGate,
    clearCount,
    failCount,
    practiceClearRate:
      clearCount / practice.samples.length,
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
    noObstacleAnyJumpRate:
      noObstacleAnyJump,
    noObstacleTargetReachRate:
      noObstacleReach,
    gate,
  };

  const output = {
    meta: {
      schema:
        "maplefly.experiment-v11d.random-jump-outcome.1",
      phase: "D",
      brainRepository: SOURCE.repository,
      brainCommit: SOURCE.commit,
      dnCount: contract.allDn.length,
      movementVersion: movementSkill.version,
      learner:
        "random one-jump actual CLEAR/FAIL -> unlabeled-variance top128 class-balanced logistic",
      windows: {
        settle: SETTLE_STEPS,
        baseline: BASELINE_STEPS,
        movement: MOVE_WINDOW_STEPS,
        jump: JUMP_WINDOW_STEPS,
      },
      randomJumpWindows:
        RANDOM_JUMP_WINDOWS,
      classifier: {
        selectedFeatureCount:
          OUTCOME_SELECTED_FEATURES,
        epochs: OUTCOME_EPOCHS,
        learningRate:
          OUTCOME_LEARNING_RATE,
        l2: OUTCOME_L2,
        threshold: OUTCOME_THRESHOLD,
      },
      practiceSeeds:
        PRACTICE_BASE_SEEDS,
      practiceDistances:
        PRACTICE_DISTANCES,
      finalSeeds: FINAL_BASE_SEEDS,
      finalDistances: FINAL_DISTANCES,
      antiLeak:
        "classifier input is frozen MaleCNS DN feature only; random jump window is state-independent and never a classifier input",
    },
    practice: practice.cohorts,
    support: {
      clearCount,
      failCount,
      gate: supportGate,
    },
    selectedFeatureIndices:
      selectedIndices,
    classifier: classifier.snapshot(),
    summary,
    perRun,
  };

  await writeFile(
    resolve(outDir, "experiment_v11d.json"),
    JSON.stringify(output, null, 2) + "\n",
  );

  console.log(
    "V11D-JUMP-GATE=" +
      (gate ? "PASS" : "FAIL") +
      " PRACTICE_CLEAR=" +
      clearCount +
      " PRACTICE_FAIL=" +
      failCount +
      " FULL=" +
      percent(meanFull) +
      " VISUAL_OFF=" +
      percent(meanVisualOff) +
      " SHUFFLED=" +
      percent(meanShuffled) +
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
