#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
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
const TEMPORAL_WINDOWS = 4;
const DN_COUNT = 1316;
const TEMPORAL_FEATURE_COUNT =
  TEMPORAL_WINDOWS * DN_COUNT;
const SELECTED_FEATURE_COUNT = 256;
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

const PRACTICE_BASE_SEEDS = [
  1801000,
  1811000,
  1821000,
];
const PRACTICE_DISTANCES = [155, 195, 235, 275];
const FINAL_BASE_SEEDS = [
  1851000,
  1861000,
  1871000,
];
const FINAL_DISTANCES = [155, 195, 235, 275];

const INTERVENTION_MAX_WINDOW = 14;
const POLICY_THRESHOLD = 0.5;
const PERSISTENCE_WINDOWS = 2;
const TRAIN_EPOCHS = 400;
const TRAIN_LEARNING_RATE = 0.01;
const TRAIN_L2 = 0.001;

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

function makeTemporalDnPermutation(seed) {
  const dnPermutation =
    makePermutation(DN_COUNT, seed);
  const result =
    new Int32Array(
      TEMPORAL_FEATURE_COUNT,
    );

  for (
    let window = 0;
    window < TEMPORAL_WINDOWS;
    window += 1
  ) {
    const offset =
      window * DN_COUNT;
    for (
      let dn = 0;
      dn < DN_COUNT;
      dn += 1
    ) {
      result[offset + dn] =
        offset + dnPermutation[dn];
    }
  }

  return result;
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

  if (allDn.length !== DN_COUNT) {
    throw new Error(
      "DN contract mismatch: " + allDn.length + " != " + DN_COUNT,
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

    if (targetDistance < 175) {
      const targetLc4 = clamp(
        ((175 - targetDistance) / 175) *
          0.72 +
          approaching * 0.18,
        0,
        0.8,
      );
      const key = "LC4_" + targetSide;
      drive[key] = Math.max(
        Number(drive[key] ?? 0),
        targetLc4,
      );
    }

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
        const obstacleLc4 = clamp(
          ((OBSTACLE_VISUAL_RADIUS -
            Math.max(0, frontDistance)) /
            OBSTACLE_VISUAL_RADIUS) *
            0.8,
          0,
          0.8,
        );
        const key =
          "LC4_" + obstacle.side;
        drive[key] = Math.max(
          Number(drive[key] ?? 0),
          obstacleLc4,
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
    moveCounts: new Float64Array(DN_COUNT),
    moveSteps: 0,
    jumpCooldown: 0,
    jumpSpent: false,
    jumpHistory: [],
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

  const baselineCounts = new Float64Array(DN_COUNT);
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
  const counts =
    new Float64Array(DN_COUNT);
  let blocked = false;

  for (
    let step = 0;
    step < JUMP_WINDOW_STEPS;
    step += 1
  ) {
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

    collectDn(
      state.brain,
      dnSlot,
      counts,
    );
    updateMovement(state, dnSlot);

    const direction =
      moveDirection(state.moveAction);
    blocked =
      applyPhysics(state, direction) ||
      blocked;

    if (state.jumpCooldown > 0) {
      state.jumpCooldown -= 1;
    }
  }

  const windowFeature = makeFeature(
    makeRate(
      counts,
      JUMP_WINDOW_STEPS,
    ),
    state.baselineRate,
  );

  state.jumpHistory.push(
    windowFeature,
  );
  if (
    state.jumpHistory.length >
    TEMPORAL_WINDOWS
  ) {
    state.jumpHistory.shift();
  }

  if (
    state.jumpHistory.length <
    TEMPORAL_WINDOWS
  ) {
    return {
      feature: null,
      blocked,
    };
  }

  const feature =
    new Float64Array(
      TEMPORAL_FEATURE_COUNT,
    );

  for (
    let historyIndex = 0;
    historyIndex <
    TEMPORAL_WINDOWS;
    historyIndex += 1
  ) {
    feature.set(
      state.jumpHistory[
        historyIndex
      ],
      historyIndex * DN_COUNT,
    );
  }

  return {
    feature,
    blocked,
  };
}

function terminalStatus(
  state,
  episode,
) {
  if (episode.withObstacle) {
    if (
      isObstacleCleared(
        state.playerX,
        state.obstacle,
      )
    ) {
      return "CLEAR";
    }
    return null;
  }

  if (
    targetReached(
      state.playerX,
      state.targetX,
    )
  ) {
    return "TARGET";
  }

  return null;
}

function practiceReward({
  episode,
  terminal,
  actualJump,
  timedOut,
}) {
  if (episode.withObstacle) {
    return terminal === "CLEAR"
      ? 1
      : -1;
  }

  if (timedOut) {
    return -1;
  }

  let reward =
    terminal === "TARGET"
      ? 1
      : -1;

  if (actualJump) {
    reward -= 1;
  }

  return reward;
}

async function runBabbleEpisode({
  connectome,
  dnSlot,
  episode,
  interventionWindow,
  interventionAction,
}) {
  const state =
    await initializeEpisode({
      connectome,
      dnSlot,
      episode,
    });

  let totalBrainSteps = 0;
  let availableDecisionIndex = 0;
  let interventionFeature = null;
  let actualJump = false;
  let interventionApplied = false;

  while (
    totalBrainSteps < MAX_STEPS
  ) {
    const observed =
      await collectDecisionState({
        state,
        connectome,
        dnSlot,
        obstacleVisual:
          episode.withObstacle,
      });

    totalBrainSteps +=
      JUMP_WINDOW_STEPS;

    const terminal =
      terminalStatus(
        state,
        episode,
      );
    const timedOut =
      !terminal &&
      totalBrainSteps >= MAX_STEPS;

    if (
      terminal ||
      timedOut
    ) {
      if (!interventionFeature) {
        return {
          sampled: false,
          outcome:
            terminal ?? "TIMEOUT",
        };
      }

      const reward =
        practiceReward({
          episode,
          terminal,
          actualJump,
          timedOut,
        });

      return {
        sampled: true,
        feature:
          interventionFeature,
        action:
          interventionAction,
        actualJump,
        reward,
        label:
          reward > 0 ? 1 : 0,
        outcome:
          terminal ?? "TIMEOUT",
      };
    }

    if (
      observed.feature &&
      !interventionApplied
    ) {
      availableDecisionIndex += 1;

      if (
        availableDecisionIndex ===
        interventionWindow
      ) {
        interventionFeature =
          observed.feature;
        interventionApplied = true;

        if (
          interventionAction ===
          ACTION_JUMP
        ) {
          actualJump =
            actuateJump(
              state,
              ACTION_JUMP,
            );
        }
      }
    }
  }

  throw new Error(
    "babble loop escaped",
  );
}

function varianceSelectedIndices(
  rows,
) {
  const means =
    new Float64Array(
      TEMPORAL_FEATURE_COUNT,
    );
  const variances =
    new Float64Array(
      TEMPORAL_FEATURE_COUNT,
    );

  for (const row of rows) {
    for (
      let index = 0;
      index <
      TEMPORAL_FEATURE_COUNT;
      index += 1
    ) {
      means[index] +=
        row.feature[index];
    }
  }

  for (
    let index = 0;
    index <
    TEMPORAL_FEATURE_COUNT;
    index += 1
  ) {
    means[index] /=
      rows.length;
  }

  for (const row of rows) {
    for (
      let index = 0;
      index <
      TEMPORAL_FEATURE_COUNT;
      index += 1
    ) {
      const delta =
        row.feature[index] -
        means[index];
      variances[index] +=
        delta * delta;
    }
  }

  return Array.from(
    {
      length:
        TEMPORAL_FEATURE_COUNT,
    },
    (_, index) => index,
  )
    .sort((a, b) => {
      const delta =
        variances[b] -
        variances[a];
      return (
        Math.abs(delta) > 1e-15
          ? delta
          : a - b
      );
    })
    .slice(
      0,
      SELECTED_FEATURE_COUNT,
    );
}

function fitSelectedStats(
  rows,
  selectedIndices,
) {
  const means =
    new Float64Array(
      selectedIndices.length,
    );
  const scales =
    new Float64Array(
      selectedIndices.length,
    );

  for (const row of rows) {
    selectedIndices.forEach(
      (sourceIndex, slot) => {
        means[slot] +=
          row.feature[sourceIndex];
      },
    );
  }

  for (
    let slot = 0;
    slot < means.length;
    slot += 1
  ) {
    means[slot] /=
      rows.length;
  }

  for (const row of rows) {
    selectedIndices.forEach(
      (sourceIndex, slot) => {
        const delta =
          row.feature[
            sourceIndex
          ] -
          means[slot];
        scales[slot] +=
          delta * delta;
      },
    );
  }

  for (
    let slot = 0;
    slot < scales.length;
    slot += 1
  ) {
    scales[slot] =
      Math.sqrt(
        scales[slot] /
          Math.max(
            1,
            rows.length - 1,
          ),
      );
    if (
      !Number.isFinite(
        scales[slot],
      ) ||
      scales[slot] < 1e-6
    ) {
      scales[slot] = 1;
    }
  }

  return { means, scales };
}

function selectedVector(
  feature,
  selectedIndices,
  stats,
) {
  const output =
    new Float64Array(
      selectedIndices.length,
    );

  selectedIndices.forEach(
    (sourceIndex, slot) => {
      output[slot] = clamp(
        (
          feature[sourceIndex] -
          stats.means[slot]
        ) /
          stats.scales[slot],
        -5,
        5,
      );
    },
  );

  return output;
}

function sigmoid(value) {
  const bounded = clamp(
    value,
    -30,
    30,
  );
  return (
    1 /
    (1 + Math.exp(-bounded))
  );
}

function pseudoOutcome(row) {
  return (
    2 *
    (2 * row.action - 1) *
    row.reward
  );
}

function trainAdvantageModel({
  rows,
  selectedIndices,
  stats,
}) {
  const prepared = rows.map(
    (row) => ({
      target:
        pseudoOutcome(row),
      x: selectedVector(
        row.feature,
        selectedIndices,
        stats,
      ),
    }),
  );

  const weights =
    new Float64Array(
      selectedIndices.length,
    );
  let bias = 0;

  for (
    let epoch = 0;
    epoch < TRAIN_EPOCHS;
    epoch += 1
  ) {
    let gradBias = 0;
    const grad =
      new Float64Array(
        selectedIndices.length,
      );

    for (const row of prepared) {
      let prediction = bias;

      for (
        let slot = 0;
        slot < weights.length;
        slot += 1
      ) {
        prediction +=
          weights[slot] *
          row.x[slot];
      }

      const error =
        prediction -
        row.target;
      gradBias += error;

      for (
        let slot = 0;
        slot < weights.length;
        slot += 1
      ) {
        grad[slot] +=
          error * row.x[slot];
      }
    }

    const invN =
      1 / prepared.length;

    bias -=
      TRAIN_LEARNING_RATE *
      gradBias *
      invN;

    for (
      let slot = 0;
      slot < weights.length;
      slot += 1
    ) {
      weights[slot] -=
        TRAIN_LEARNING_RATE *
        (
          grad[slot] *
            invN +
          TRAIN_L2 *
            weights[slot]
        );
    }
  }

  return {
    weights,
    bias,
  };
}

class RewardAdvantagePolicy {
  constructor({
    selectedIndices,
    stats,
    model,
  }) {
    this.selectedIndices =
      selectedIndices;
    this.means = stats.means;
    this.scales = stats.scales;
    this.weights =
      model.weights;
    this.bias = model.bias;
    this.positiveStreak = 0;
  }

  resetEpisode() {
    this.positiveStreak = 0;
  }

  onActuatedJump() {
    this.positiveStreak = 0;
  }

  advantage(
    feature,
    permutation = null,
  ) {
    let score = this.bias;

    for (
      let slot = 0;
      slot <
      this.selectedIndices.length;
      slot += 1
    ) {
      const selectedIndex =
        this.selectedIndices[slot];
      const sourceIndex =
        permutation
          ? permutation[
              selectedIndex
            ]
          : selectedIndex;
      const standardized =
        clamp(
          (
            feature[sourceIndex] -
            this.means[slot]
          ) /
            this.scales[slot],
          -5,
          5,
        );
      score +=
        this.weights[slot] *
        standardized;
    }

    return score;
  }

  observeUnavailable(
    feature,
    permutation = null,
  ) {
    const advantage =
      this.advantage(
        feature,
        permutation,
      );
    this.positiveStreak = 0;

    return {
      action: ACTION_WAIT,
      advantage,
    };
  }

  choose(
    feature,
    permutation = null,
  ) {
    const advantage =
      this.advantage(
        feature,
        permutation,
      );
    const positive =
      advantage > 0;

    this.positiveStreak =
      positive
        ? this.positiveStreak + 1
        : 0;

    return {
      action:
        this.positiveStreak >=
        PERSISTENCE_WINDOWS
          ? ACTION_JUMP
          : ACTION_WAIT,
      advantage,
      positiveStreak:
        this.positiveStreak,
    };
  }

  snapshot() {
    return {
      means:
        Array.from(this.means),
      scales:
        Array.from(this.scales),
      weights:
        Array.from(this.weights),
      bias: this.bias,
      decisionBoundary: 0,
      persistenceWindows:
        PERSISTENCE_WINDOWS,
      cooldownSteps:
        JUMP_COOLDOWN_STEPS,
    };
  }
}

async function runPolicyEpisode({
  connectome,
  dnSlot,
  episode,
  policy,
  obstacleVisual,
  permutation = null,
}) {
  const state =
    await initializeEpisode({
      connectome,
      dnSlot,
      episode,
    });

  policy.resetEpisode();

  let totalBrainSteps = 0;
  let actualJumps = 0;
  let blockedWindows = 0;
  let firstJumpStep = null;
  let firstJumpFrontDistance =
    null;

  while (
    totalBrainSteps < MAX_STEPS
  ) {
    const observed =
      await collectDecisionState({
        state,
        connectome,
        dnSlot,
        obstacleVisual,
      });

    totalBrainSteps +=
      JUMP_WINDOW_STEPS;

    if (
      observed.blocked &&
      episode.withObstacle
    ) {
      blockedWindows += 1;
    }

    const terminal =
      terminalStatus(
        state,
        episode,
      );
    const timedOut =
      !terminal &&
      totalBrainSteps >= MAX_STEPS;

    if (
      terminal ||
      timedOut
    ) {
      return {
        outcome:
          terminal ?? "TIMEOUT",
        clear:
          terminal === "CLEAR",
        targetReach:
          terminal === "TARGET",
        timeout:
          timedOut,
        actualJumps,
        retryJumps:
          Math.max(
            0,
            actualJumps - 1,
          ),
        anyJump:
          actualJumps > 0,
        blockedWindows,
        firstJumpStep,
        firstJumpFrontDistance,
        brainSteps:
          totalBrainSteps,
      };
    }

    if (!observed.feature) {
      continue;
    }

    let decision;

    if (
      !state.grounded ||
      state.jumpCooldown > 0
    ) {
      decision =
        policy.observeUnavailable(
          observed.feature,
          permutation,
        );
    } else {
      decision =
        policy.choose(
          observed.feature,
          permutation,
        );
    }

    const jumpActuated =
      actuateJump(
        state,
        decision.action,
      );

    if (jumpActuated) {
      actualJumps += 1;
      policy.onActuatedJump();

      if (
        firstJumpStep === null
      ) {
        firstJumpStep =
          totalBrainSteps;
        firstJumpFrontDistance =
          recordObstacleFrontDistance(
            state,
          );
      }
    }
  }

  throw new Error(
    "policy episode escaped",
  );
}

async function collectPractice({
  connectome,
  dnSlot,
}) {
  const rows = [];
  const cohorts = [];

  for (
    let cohortIndex = 0;
    cohortIndex <
    PRACTICE_BASE_SEEDS.length;
    cohortIndex += 1
  ) {
    const baseSeed =
      PRACTICE_BASE_SEEDS[
        cohortIndex
      ];
    const schedule =
      makePracticeSchedule(
        baseSeed,
      );
    const random =
      mulberry32(
        baseSeed + 8000,
      );

    let sampled = 0;
    let obstacleClear = 0;
    let targetReach = 0;

    for (
      let index = 0;
      index < schedule.length;
      index += 1
    ) {
      const interventionWindow =
        1 +
        Math.floor(
          random() *
            INTERVENTION_MAX_WINDOW,
        );
      const interventionAction =
        random() < 0.5
          ? ACTION_WAIT
          : ACTION_JUMP;

      const result =
        await runBabbleEpisode({
          connectome,
          dnSlot,
          episode:
            schedule[index],
          interventionWindow,
          interventionAction,
        });

      if (result.sampled) {
        sampled += 1;
        rows.push({
          cohort:
            cohortIndex + 1,
          baseSeed,
          episodeIndex: index,
          withObstacle:
            schedule[index]
              .withObstacle,
          interventionWindow,
          action:
            result.action,
          actionName:
            ACTION_NAMES[
              result.action
            ],
          actualJump:
            result.actualJump,
          reward:
            result.reward,
          label:
            result.label,
          outcome:
            result.outcome,
          feature:
            result.feature,
        });

        if (
          result.outcome ===
          "CLEAR"
        ) {
          obstacleClear += 1;
        }
        if (
          result.outcome ===
          "TARGET"
        ) {
          targetReach += 1;
        }
      }

      if (
        (index + 1) % 16 === 0
      ) {
        console.log(
          "[v11g3-practice] cohort=" +
            (cohortIndex + 1) +
            " " +
            (index + 1) +
            "/" +
            schedule.length +
            " sampled=" +
            sampled,
        );
        await new Promise(
          (resolve) =>
            setImmediate(
              resolve,
            ),
        );
      }
    }

    cohorts.push({
      cohort:
        cohortIndex + 1,
      baseSeed,
      scheduledEpisodes:
        schedule.length,
      sampledEpisodes:
        sampled,
      obstacleClear,
      targetReach,
    });
  }

  return {
    rows,
    cohorts,
  };
}

async function evaluateObstacleCondition({
  connectome,
  dnSlot,
  policy,
  baseSeed,
  condition,
}) {
  const schedule =
    makeFinalObstacleSchedule(
      baseSeed,
    );
  const permutation =
    condition === "DN_SHUFFLED"
      ? makeTemporalDnPermutation(
          baseSeed + 900000,
        )
      : null;
  const obstacleVisual =
    condition !==
    "OBSTACLE_CUE_OFF";
  const rows = [];

  for (
    let index = 0;
    index < schedule.length;
    index += 1
  ) {
    rows.push(
      await runPolicyEpisode({
        connectome,
        dnSlot,
        episode:
          schedule[index],
        policy,
        obstacleVisual,
        permutation,
      }),
    );
  }

  return {
    condition,
    episodes: rows.length,
    clearRate: mean(
      rows.map(
        (row) =>
          Number(row.clear),
      ),
    ),
    timeoutRate: mean(
      rows.map(
        (row) =>
          Number(row.timeout),
      ),
    ),
    meanActualJumps: mean(
      rows.map(
        (row) =>
          row.actualJumps,
      ),
    ),
    meanRetryJumps: mean(
      rows.map(
        (row) =>
          row.retryJumps,
      ),
    ),
    meanBlockedWindows: mean(
      rows.map(
        (row) =>
          row.blockedWindows,
      ),
    ),
    rows,
  };
}

async function evaluateTargetOnly({
  connectome,
  dnSlot,
  policy,
  baseSeed,
}) {
  const schedule =
    makeFinalNoObstacleSchedule(
      baseSeed,
    );
  const rows = [];

  for (
    let index = 0;
    index < schedule.length;
    index += 1
  ) {
    rows.push(
      await runPolicyEpisode({
        connectome,
        dnSlot,
        episode:
          schedule[index],
        policy,
        obstacleVisual: false,
      }),
    );
  }

  return {
    episodes: rows.length,
    targetReachRate: mean(
      rows.map(
        (row) =>
          Number(
            row.targetReach,
          ),
      ),
    ),
    anyJumpRate: mean(
      rows.map(
        (row) =>
          Number(row.anyJump),
      ),
    ),
    meanActualJumps: mean(
      rows.map(
        (row) =>
          row.actualJumps,
      ),
    ),
    rows,
  };
}

function percent(value) {
  return (
    (value * 100).toFixed(1) +
    "%"
  );
}

async function main() {
  const outDir = resolve(
    "results/experiment-v11g4",
  );
  await mkdir(outDir, {
    recursive: true,
  });

  const connectome =
    await loadConnectome({
      cacheDir: resolve(
        ".cache/maplefly-connectome",
      ),
      onProgress(message) {
        console.log(
          "[connectome] " +
            message,
        );
      },
    });

  const contract =
    buildDnContract(
      connectome.meta,
    );

  const practice =
    await collectPractice({
      connectome,
      dnSlot: contract.slot,
    });

  const pseudo =
    practice.rows.map(
      pseudoOutcome,
    );
  const support = {
    sampled:
      practice.rows.length,
    WAIT:
      practice.rows.filter(
        (row) =>
          row.action ===
          ACTION_WAIT,
      ).length,
    JUMP:
      practice.rows.filter(
        (row) =>
          row.action ===
          ACTION_JUMP,
      ).length,
    positiveZ:
      pseudo.filter(
        (value) => value > 0,
      ).length,
    negativeZ:
      pseudo.filter(
        (value) => value < 0,
      ).length,
    zeroZ:
      pseudo.filter(
        (value) => value === 0,
      ).length,
  };

  const supportGate =
    support.sampled >= 270 &&
    support.WAIT >= 100 &&
    support.JUMP >= 100 &&
    support.positiveZ >= 24 &&
    support.negativeZ >= 24;

  console.log(
    "V11G4-SUPPORT=" +
      (
        supportGate
          ? "PASS"
          : "FAIL"
      ) +
      " sampled=" +
      support.sampled +
      " WAIT=" +
      support.WAIT +
      " JUMP=" +
      support.JUMP +
      " Z+=" +
      support.positiveZ +
      " Z-=" +
      support.negativeZ +
      " Z0=" +
      support.zeroZ,
  );

  if (!supportGate) {
    const output = {
      meta: {
        schema:
          "maplefly.experiment-v11g4.reward-advantage.1",
        phase: "G4",
        brainRepository:
          SOURCE.repository,
        brainCommit:
          SOURCE.commit,
        movementVersion:
          movementSkill.version,
        practiceSeeds:
          PRACTICE_BASE_SEEDS,
        finalSeeds:
          FINAL_BASE_SEEDS,
        representation:
          "CONCAT4",
        supportGate: false,
      },
      practice: {
        cohorts:
          practice.cohorts,
        sampledEpisodes:
          practice.rows.length,
        support,
      },
      summary: {
        supportGate: false,
        gate: false,
      },
      perRun: [],
    };

    await writeFile(
      resolve(
        outDir,
        "experiment_v11g4.json",
      ),
      JSON.stringify(
        output,
        null,
        2,
      ) + "\n",
    );

    console.log(
      "V11G4-JUMP-GATE=FAIL reason=practice_support",
    );
    return;
  }

  const selectedIndices =
    varianceSelectedIndices(
      practice.rows,
    );
  const stats =
    fitSelectedStats(
      practice.rows,
      selectedIndices,
    );
  const model =
    trainAdvantageModel({
      rows: practice.rows,
      selectedIndices,
      stats,
    });
  const policy =
    new RewardAdvantagePolicy({
      selectedIndices,
      stats,
      model,
    });

  const perRun = [];

  for (
    let run = 0;
    run <
    FINAL_BASE_SEEDS.length;
    run += 1
  ) {
    const baseSeed =
      FINAL_BASE_SEEDS[run];

    const full =
      await evaluateObstacleCondition({
        connectome,
        dnSlot: contract.slot,
        policy,
        baseSeed,
        condition: "FULL",
      });
    const obstacleCueOff =
      await evaluateObstacleCondition({
        connectome,
        dnSlot: contract.slot,
        policy,
        baseSeed,
        condition:
          "OBSTACLE_CUE_OFF",
      });
    const shuffled =
      await evaluateObstacleCondition({
        connectome,
        dnSlot: contract.slot,
        policy,
        baseSeed,
        condition:
          "DN_SHUFFLED",
      });
    const targetOnly =
      await evaluateTargetOnly({
        connectome,
        dnSlot: contract.slot,
        policy,
        baseSeed,
      });

    perRun.push({
      run: run + 1,
      baseSeed,
      FULL: full,
      OBSTACLE_CUE_OFF:
        obstacleCueOff,
      DN_SHUFFLED: shuffled,
      TARGET_ONLY: targetOnly,
    });

    console.log(
      "[v11g4-final] run=" +
        (run + 1) +
        " FULL=" +
        percent(
          full.clearRate,
        ) +
        " OFF=" +
        percent(
          obstacleCueOff.clearRate,
        ) +
        " SHUFFLED=" +
        percent(
          shuffled.clearRate,
        ) +
        " TARGET_JUMP=" +
        percent(
          targetOnly.anyJumpRate,
        ),
    );
  }

  const meanFull = mean(
    perRun.map(
      (run) =>
        run.FULL.clearRate,
    ),
  );
  const meanOff = mean(
    perRun.map(
      (run) =>
        run.OBSTACLE_CUE_OFF
          .clearRate,
    ),
  );
  const meanShuffled = mean(
    perRun.map(
      (run) =>
        run.DN_SHUFFLED
          .clearRate,
    ),
  );
  const meanTimeout = mean(
    perRun.map(
      (run) =>
        run.FULL.timeoutRate,
    ),
  );
  const minFull = Math.min(
    ...perRun.map(
      (run) =>
        run.FULL.clearRate,
    ),
  );
  const meanJumps = mean(
    perRun.map(
      (run) =>
        run.FULL
          .meanActualJumps,
    ),
  );
  const targetReach = mean(
    perRun.map(
      (run) =>
        run.TARGET_ONLY
          .targetReachRate,
    ),
  );
  const targetJump = mean(
    perRun.map(
      (run) =>
        run.TARGET_ONLY
          .anyJumpRate,
    ),
  );

  const gate =
    meanFull >= 0.75 &&
    minFull >= 0.65 &&
    meanFull - meanOff >= 0.25 &&
    meanFull -
        meanShuffled >=
      0.20 &&
    meanTimeout <= 0.20 &&
    meanJumps <= 1.75 &&
    targetReach >= 0.85 &&
    targetJump <= 0.30;

  const summary = {
    supportGate,
    meanFullClearRate:
      meanFull,
    meanObstacleCueOffClearRate:
      meanOff,
    obstacleCueContribution:
      meanFull - meanOff,
    meanDnShuffledClearRate:
      meanShuffled,
    dnIdentityContribution:
      meanFull -
      meanShuffled,
    minRunFullClearRate:
      minFull,
    meanFullTimeoutRate:
      meanTimeout,
    meanFullActualJumps:
      meanJumps,
    targetOnlyReachRate:
      targetReach,
    targetOnlyAnyJumpRate:
      targetJump,
    gate,
  };

  const output = {
    meta: {
      schema:
        "maplefly.experiment-v11g4.reward-advantage.1",
      phase: "G4",
      brainRepository:
        SOURCE.repository,
      brainCommit:
        SOURCE.commit,
      dnCount:
        contract.allDn.length,
      movementVersion:
        movementSkill.version,
      representation: {
        type: "CONCAT4",
        rawFeatureCount:
          TEMPORAL_FEATURE_COUNT,
        historyWindows:
          TEMPORAL_WINDOWS,
        historySeconds:
          TEMPORAL_WINDOWS *
          JUMP_WINDOW_STEPS *
          STEP_SECONDS,
        selectedFeatureCount:
          selectedIndices.length,
        selection:
          "top unlabeled variance",
      },
      policy: {
        type:
          "randomized inverse-propensity reward-advantage ridge linear readout",
        pseudoOutcome:
          "Z=2*(2A-1)*R",
        decisionBoundary: 0,
        persistenceWindows:
          PERSISTENCE_WINDOWS,
        cooldownSteps:
          JUMP_COOLDOWN_STEPS,
        epochs:
          TRAIN_EPOCHS,
        learningRate:
          TRAIN_LEARNING_RATE,
        l2: TRAIN_L2,
      },
      practiceSeeds:
        PRACTICE_BASE_SEEDS,
      practiceDistances:
        PRACTICE_DISTANCES,
      interventionWindow:
        [1, INTERVENTION_MAX_WINDOW],
      finalSeeds:
        FINAL_BASE_SEEDS,
      finalDistances:
        FINAL_DISTANCES,
      antiLeak:
        "policy input contains only selected slots from 4 consecutive MaleCNS DN windows; context/obstacle/target flags, distance, coordinates, collision state, correct timing, side, seed and reward are excluded",
    },
    practice: {
      cohorts:
        practice.cohorts,
      sampledEpisodes:
        practice.rows.length,
      support,
    },
    candidate: {
      selectedIndices,
      selectedTemporalSlots:
        selectedIndices.map(
          (index) => ({
            index,
            window:
              Math.floor(
                index / DN_COUNT,
              ),
            dnIndex:
              index % DN_COUNT,
          }),
        ),
      ...policy.snapshot(),
    },
    summary,
    perRun,
  };

  await writeFile(
    resolve(
      outDir,
      "experiment_v11g4.json",
    ),
    JSON.stringify(
      output,
      null,
      2,
    ) + "\n",
  );

  console.log(
    "V11G4-JUMP-GATE=" +
      (
        gate
          ? "PASS"
          : "FAIL"
      ) +
      " FULL=" +
      percent(meanFull) +
      " OFF=" +
      percent(meanOff) +
      " SHUFFLED=" +
      percent(meanShuffled) +
      " FULL_JUMPS=" +
      meanJumps.toFixed(3) +
      " TARGET_JUMP=" +
      percent(targetJump) +
      " TARGET_REACH=" +
      percent(targetReach),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
