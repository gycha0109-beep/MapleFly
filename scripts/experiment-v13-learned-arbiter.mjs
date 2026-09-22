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
import "../src/brain/fly-skill-v10-attack.js";
import "../src/brain/fly-skill-v11h2-jump.js";

const STEP_SECONDS = 0.02;
const SETTLE_STEPS = 26;
const BASELINE_STEPS = 26;
const MOVE_WINDOW_STEPS = 26;
const DECISION_WINDOW_STEPS = 5;
const MAX_STEPS = 400;
const ATTACK_COOLDOWN_STEPS = 21;
const DN_COUNT = 1316;

const WORLD_WIDTH = 1000;
const GROUND_Y = 530;
const GRAVITY = 1400;
const MOVE_SPEED = 280;
const JUMP_VELOCITY = 600;
const PLAYER_WIDTH = 34;
const PLAYER_HEIGHT = 46;
const OBSTACLE_WIDTH = 38;
const OBSTACLE_HEIGHT = 54;
const OBSTACLE_VISUAL_RADIUS = 280;
const TARGET_OFFSET = 160;
const TARGET_WIDTH = 56;
const TARGET_HEIGHT = 62;
const TARGET_HP = 30;
const ATTACK_DAMAGE = 10;
const ATTACK_RANGE = 76;

const DISTANCES = [155, 195, 235, 275];
const PRACTICE_BASE_SEEDS = [2401000, 2411000, 2421000];
const FINAL_SEEDS = [2451000, 2461000, 2471000];
const TRAINER_SEED = 913001;
const PRACTICE_BLOCKS = 3;

const ACTIONS = ["MOVE", "JUMP", "ATTACK", "HOLD"];
const ACTION_INDEX = Object.freeze({
  MOVE: 0,
  JUMP: 1,
  ATTACK: 2,
  HOLD: 3,
});
const FEATURE_COUNT = 8;
const GAMMA = 0.97;
const LEARNING_RATE = 0.02;
const L2 = 0.0005;
const WEIGHT_CLAMP = 4;

const GATE = Object.freeze({
  courseCompletion: 0.75,
  minSeedCompletion: 0.625,
  obstacleClear: 0.875,
  targetKill: 0.75,
  timeoutMax: 0.25,
  meanJumpsMax: 1.75,
  preClearAttackEpisodeMax: 0.30,
  airborneAttackEpisodeMax: 0.30,
  attackHitPrecisionMin: 0.50,
});

const movementApi = globalThis.MapleFlySkillV7;
const movementSkill = movementApi.BUNDLED_STATE;
const attackApi = globalThis.MapleFlyAttackSkillV10;
const attackSkill = attackApi.BUNDLED_STATE;
const jumpApi = globalThis.MapleFlyJumpSkillV11H2;
const jumpSkill = jumpApi.BUNDLED_STATE;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function mean(values) {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;
}

function mulberry32(seed) {
  let value = seed >>> 0;
  return function random() {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(rows, random) {
  const copy = [...rows];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

function stimulate(brain, inputGroups, drive) {
  for (const [name, amount] of Object.entries(drive)) {
    if (!amount) continue;
    const indices = inputGroups.get(name);
    if (indices?.length) brain.stimulate(indices, amount);
  }
}

function buildDnSlot(meta) {
  const allDn = cells(
    meta,
    ["descending_neuron", "descending_neuron_tbc"],
  );
  if (allDn.length !== DN_COUNT) {
    throw new Error("DN contract mismatch " + allDn.length);
  }
  const slot = new Int16Array(meta.n).fill(-1);
  allDn.forEach((neuron, index) => {
    slot[neuron] = index;
  });
  return slot;
}

function collectDn(brain, dnSlot, counts) {
  for (let fired = 0; fired < brain.firedCount; fired += 1) {
    const dn = dnSlot[brain.fired[fired]];
    if (dn >= 0) counts[dn] += 1;
  }
}

function rate(counts, steps) {
  const seconds = steps * STEP_SECONDS;
  return Float64Array.from(counts, (count) => count / seconds);
}

function movementProposal(currentRate, baselineRate) {
  const feature = new Float64Array(movementSkill.sparseFeatureCount);
  let normSquared = 0;
  for (let slot = 0; slot < movementSkill.featureIndices.length; slot += 1) {
    const dnIndex = movementSkill.featureIndices[slot];
    const delta = (currentRate[dnIndex] - baselineRate[dnIndex]) / 50;
    feature[slot] = delta;
    normSquared += delta * delta;
  }
  const norm = Math.sqrt(normSquared);
  if (norm <= 1e-9) {
    return { action: "IDLE", leftScore: 0, rightScore: 0 };
  }
  for (let slot = 0; slot < feature.length; slot += 1) {
    feature[slot] /= norm;
  }
  return movementApi.choose(feature, movementSkill);
}

function attackProposal(currentRate, baselineRate) {
  const feature = Float64Array.from(
    attackSkill.selectedIndices,
    (dnIndex) =>
      clamp((currentRate[dnIndex] - baselineRate[dnIndex]) / 50, -1, 1),
  );
  return attackApi.chooseSparseCurrent(feature, attackSkill);
}

function jumpFeature(currentRate, baselineRate) {
  return Float64Array.from(
    jumpSkill.runtimeDnIndices,
    (dnIndex) =>
      clamp((currentRate[dnIndex] - baselineRate[dnIndex]) / 50, -1, 1),
  );
}

function arbiterFeatures(
  moveScore,
  attackProbability,
  jumpProbability,
  waitProbability,
) {
  const move = Math.tanh(Number(moveScore) || 0);
  const attack = Number.isFinite(attackProbability)
    ? attackProbability
    : 0;
  const jump = Number.isFinite(jumpProbability)
    ? jumpProbability
    : 0;
  const wait = Number.isFinite(waitProbability)
    ? waitProbability
    : 0;

  return Float64Array.from([
    1,
    move,
    Math.abs(move),
    attack,
    attack - 0.5,
    jump,
    wait,
    jump - wait,
  ]);
}

function createPolicy() {
  return {
    weights: Array.from(
      { length: ACTIONS.length },
      () => new Float64Array(FEATURE_COUNT),
    ),
  };
}

function maskedProbabilities(policy, features, mask) {
  const logits = ACTIONS.map((_, actionIndex) => {
    if (!mask[actionIndex]) return -Infinity;
    let score = 0;
    for (let feature = 0; feature < FEATURE_COUNT; feature += 1) {
      score += policy.weights[actionIndex][feature] * features[feature];
    }
    return score;
  });

  const finite = logits.filter(Number.isFinite);
  const maxLogit = Math.max(...finite);
  const exp = logits.map((value) =>
    Number.isFinite(value) ? Math.exp(value - maxLogit) : 0,
  );
  const total = exp.reduce((sum, value) => sum + value, 0);
  return exp.map((value) => value / total);
}

function chooseAction(policy, features, mask, random, deterministic) {
  const probabilities = maskedProbabilities(policy, features, mask);

  if (deterministic) {
    let best = -1;
    let bestProbability = -1;
    for (let index = 0; index < probabilities.length; index += 1) {
      if (probabilities[index] > bestProbability) {
        best = index;
        bestProbability = probabilities[index];
      }
    }
    return { actionIndex: best, probabilities };
  }

  let draw = random();
  for (let index = 0; index < probabilities.length; index += 1) {
    draw -= probabilities[index];
    if (draw <= 0 && probabilities[index] > 0) {
      return { actionIndex: index, probabilities };
    }
  }

  const fallback = probabilities.findLastIndex((value) => value > 0);
  return { actionIndex: fallback, probabilities };
}

function updatePolicy(policy, trajectory) {
  if (!trajectory.length) return;

  const returns = new Float64Array(trajectory.length);
  let running = 0;
  for (let index = trajectory.length - 1; index >= 0; index -= 1) {
    running = trajectory[index].reward + GAMMA * running;
    returns[index] = running;
  }

  const baseline = mean(Array.from(returns));

  for (let step = 0; step < trajectory.length; step += 1) {
    const row = trajectory[step];
    const advantage = returns[step] - baseline;

    for (let action = 0; action < ACTIONS.length; action += 1) {
      if (!row.mask[action]) continue;
      const target = action === row.actionIndex ? 1 : 0;
      const coefficient =
        LEARNING_RATE *
        advantage *
        (target - row.probabilities[action]);

      for (let feature = 0; feature < FEATURE_COUNT; feature += 1) {
        const current = policy.weights[action][feature];
        const next =
          current +
          coefficient * row.features[feature] -
          LEARNING_RATE * L2 * current;
        policy.weights[action][feature] = clamp(
          next,
          -WEIGHT_CLAMP,
          WEIGHT_CLAMP,
        );
      }
    }
  }
}

class BrowserVisualEncoder {
  constructor() {
    this.lastTargetDistance = null;
  }

  reset() {
    this.lastTargetDistance = null;
  }

  encode({ playerX, grounded, targetX, obstacle, visualEnabled = true }) {
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
    const side = dx < 0 ? "L" : "R";
    const distance = Math.abs(dx);
    const closeness = clamp(1 - distance / 620, 0, 1);
    let approaching = 0;

    if (Number.isFinite(this.lastTargetDistance)) {
      approaching = clamp(
        (this.lastTargetDistance - distance) / 45,
        0,
        1,
      );
    }
    this.lastTargetDistance = distance;

    drive["LC10a_" + side] = clamp(
      0.12 + closeness * 0.68,
      0,
      0.8,
    );
    drive["LPLC1_" + side] = clamp(
      closeness * 0.12 + approaching * 0.32,
      0,
      0.55,
    );
    drive["LPLC2_" + side] = clamp(
      closeness * 0.24 + approaching * 0.38,
      0,
      0.8,
    );

    if (distance < 175) {
      drive["LC4_" + side] = clamp(
        ((175 - distance) / 175) * 0.72 + approaching * 0.18,
        0,
        0.8,
      );
    }

    const playerFront =
      obstacle.side === "R" ? playerX + PLAYER_WIDTH : playerX;
    const obstacleFront =
      obstacle.side === "R" ? obstacle.x : obstacle.x + obstacle.width;
    const frontDistance =
      obstacle.side === "R"
        ? obstacleFront - playerFront
        : playerFront - obstacleFront;
    const passed =
      obstacle.side === "R"
        ? playerX > obstacle.x + obstacle.width
        : playerX + PLAYER_WIDTH < obstacle.x;

    if (!passed) {
      const obstacleDrive = clamp(
        ((OBSTACLE_VISUAL_RADIUS - Math.max(0, frontDistance)) /
          OBSTACLE_VISUAL_RADIUS) *
          0.8,
        0,
        0.8,
      );
      for (const type of ["LC6", "LC16", "LC22", "LPLC4"]) {
        drive[type + "_" + obstacle.side] = obstacleDrive;
      }
    }

    return drive;
  }
}

function makeGeometry(side, startDistance) {
  const startCenter = WORLD_WIDTH / 2;
  const playerX = startCenter - PLAYER_WIDTH / 2;
  let obstacle;
  let targetX;

  if (side === "R") {
    const front = playerX + PLAYER_WIDTH + startDistance;
    obstacle = {
      side,
      x: front,
      y: GROUND_Y - OBSTACLE_HEIGHT,
      width: OBSTACLE_WIDTH,
      height: OBSTACLE_HEIGHT,
    };
    targetX = obstacle.x + obstacle.width + TARGET_OFFSET;
  } else {
    const front = playerX - startDistance;
    obstacle = {
      side,
      x: front - OBSTACLE_WIDTH,
      y: GROUND_Y - OBSTACLE_HEIGHT,
      width: OBSTACLE_WIDTH,
      height: OBSTACLE_HEIGHT,
    };
    targetX = obstacle.x - TARGET_OFFSET;
  }

  const matchedDistance = Math.abs(targetX - startCenter);
  const expectedDistance =
    startDistance + PLAYER_WIDTH / 2 + OBSTACLE_WIDTH + TARGET_OFFSET;
  if (Math.abs(matchedDistance - expectedDistance) > 1e-9) {
    throw new Error("v13 matched geometry mismatch");
  }

  return {
    playerX,
    playerY: GROUND_Y - PLAYER_HEIGHT,
    obstacle,
    targetX,
  };
}

function makeBlock(baseSeed, block = 0) {
  const rows = [];
  DISTANCES.forEach((startDistance, distanceIndex) => {
    const sides =
      (block + distanceIndex) % 2 === 0
        ? ["L", "R"]
        : ["R", "L"];
    for (const side of sides) {
      rows.push({
        brainSeed: baseSeed + block,
        baseSeed,
        block,
        side,
        startDistance,
      });
    }
  });
  return rows;
}

function targetDistance(state) {
  return Math.abs(
    state.targetX - (state.playerX + PLAYER_WIDTH / 2),
  );
}

function obstacleCleared(state) {
  return state.obstacle.side === "R"
    ? state.playerX > state.obstacle.x + state.obstacle.width
    : state.playerX + PLAYER_WIDTH < state.obstacle.x;
}

function moveDirection(action) {
  return action === "LEFT" ? -1 : action === "RIGHT" ? 1 : 0;
}

function applyPhysics(state) {
  const direction = state.horizontalEnabled
    ? moveDirection(state.moveAction)
    : 0;
  if (direction !== 0) state.facing = direction;

  const nextX = clamp(
    state.playerX + direction * MOVE_SPEED * STEP_SECONDS,
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
  const overlapsVertically =
    nextY < state.obstacle.y + state.obstacle.height &&
    nextY + PLAYER_HEIGHT > state.obstacle.y;
  const overlapsHorizontally =
    nextX < state.obstacle.x + state.obstacle.width &&
    nextX + PLAYER_WIDTH > state.obstacle.x;

  if (overlapsVertically && overlapsHorizontally) {
    if (direction > 0) {
      resolvedX = state.obstacle.x - PLAYER_WIDTH;
    } else if (direction < 0) {
      resolvedX = state.obstacle.x + state.obstacle.width;
    } else {
      resolvedX = state.playerX;
    }
  }

  state.playerX = resolvedX;
  state.playerY = nextY;
}

function attackWouldHit(state) {
  const attackX =
    state.facing > 0
      ? state.playerX + PLAYER_WIDTH - 2
      : state.playerX - ATTACK_RANGE + 2;

  const attackBox = {
    x: attackX,
    y: state.playerY + 4,
    width: ATTACK_RANGE,
    height: PLAYER_HEIGHT - 8,
  };
  const targetBox = {
    x: state.targetX - TARGET_WIDTH / 2,
    y: GROUND_Y - TARGET_HEIGHT,
    width: TARGET_WIDTH,
    height: TARGET_HEIGHT,
  };

  return (
    attackBox.x < targetBox.x + targetBox.width &&
    attackBox.x + attackBox.width > targetBox.x &&
    attackBox.y < targetBox.y + targetBox.height &&
    attackBox.y + attackBox.height > targetBox.y
  );
}

async function initializeEpisode(connectome, dnSlot, episode) {
  const geometry = makeGeometry(episode.side, episode.startDistance);
  const brain = new ConnectomeBrain(
    connectome.weights,
    connectome.meta.params,
    episode.brainSeed,
  );
  const encoder = new BrowserVisualEncoder();

  const state = {
    brain,
    encoder,
    ...geometry,
    grounded: true,
    vy: 0,
    facing: episode.side === "L" ? -1 : 1,
    moveAction: "IDLE",
    moveScore: 0,
    moveCounts: new Float64Array(DN_COUNT),
    moveSteps: 0,
    attackCounts: new Float64Array(DN_COUNT),
    attackSteps: 0,
    jumpCounts: new Float64Array(DN_COUNT),
    jumpSteps: 0,
    jumpRuntime: jumpApi.createRuntime(),
    nextJumpStep: 0,
    nextAttackStep: 0,
    horizontalEnabled: true,
    targetHp: TARGET_HP,
    actualJumps: 0,
    actualAttacks: 0,
    hits: 0,
    whiffs: 0,
    preClearAttacks: 0,
    airborneAttacks: 0,
    firstClearStep: null,
    firstHitStep: null,
    killStep: null,
    modeCounts: Object.fromEntries(ACTIONS.map((action) => [action, 0])),
  };

  for (let step = 0; step < SETTLE_STEPS; step += 1) {
    stimulate(
      brain,
      connectome.inputGroups,
      encoder.encode({ ...state, visualEnabled: false }),
    );
    brain.step();
  }

  const baselineCounts = new Float64Array(DN_COUNT);
  for (let step = 0; step < BASELINE_STEPS; step += 1) {
    stimulate(
      brain,
      connectome.inputGroups,
      encoder.encode({ ...state, visualEnabled: false }),
    );
    brain.step();
    collectDn(brain, dnSlot, baselineCounts);
  }

  encoder.reset();
  state.baselineRate = rate(baselineCounts, BASELINE_STEPS);
  return state;
}

function updateMovementProposal(state) {
  state.moveSteps += 1;
  if (state.moveSteps < MOVE_WINDOW_STEPS) return;

  const proposal = movementProposal(
    rate(state.moveCounts, state.moveSteps),
    state.baselineRate,
  );
  state.moveAction = proposal.action;
  state.moveScore = proposal.leftScore;
  state.moveCounts.fill(0);
  state.moveSteps = 0;
}

function collectSkillWindows(state, dnSlot) {
  collectDn(state.brain, dnSlot, state.moveCounts);
  collectDn(state.brain, dnSlot, state.attackCounts);
  collectDn(state.brain, dnSlot, state.jumpCounts);
  updateMovementProposal(state);
  state.attackSteps += 1;
  state.jumpSteps += 1;
}

function lowerLevelDecision(state, brainStep) {
  if (
    state.attackSteps !== DECISION_WINDOW_STEPS ||
    state.jumpSteps !== DECISION_WINDOW_STEPS
  ) {
    throw new Error("v13 decision window alignment mismatch");
  }

  const attack = attackProposal(
    rate(state.attackCounts, state.attackSteps),
    state.baselineRate,
  );
  state.attackCounts.fill(0);
  state.attackSteps = 0;

  const available =
    state.grounded && brainStep >= state.nextJumpStep;
  const jump = jumpApi.observeSparseWindow(
    jumpFeature(
      rate(state.jumpCounts, state.jumpSteps),
      state.baselineRate,
    ),
    available,
    jumpSkill,
    state.jumpRuntime,
  );
  state.jumpCounts.fill(0);
  state.jumpSteps = 0;

  return { attack, jump, jumpAvailable: available };
}

function actionMask(state, proposal, brainStep) {
  const mask = [true, false, false, true];
  mask[ACTION_INDEX.JUMP] =
    proposal.jump.action === "JUMP" &&
    proposal.jumpAvailable;
  mask[ACTION_INDEX.ATTACK] =
    proposal.attack.action === "ATTACK" &&
    brainStep >= state.nextAttackStep;
  return mask;
}

function actuate(state, action, brainStep) {
  let reward = 0;
  state.modeCounts[action] += 1;

  if (action === "MOVE") {
    state.horizontalEnabled = true;
    return reward;
  }

  if (action === "HOLD") {
    state.horizontalEnabled = false;
    return reward;
  }

  if (action === "JUMP") {
    state.horizontalEnabled = true;
    state.vy = -JUMP_VELOCITY;
    state.grounded = false;
    state.nextJumpStep = brainStep + jumpSkill.cooldownBrainSteps;
    state.actualJumps += 1;
    jumpApi.onActuatedJump(state.jumpRuntime);
    return reward - 0.10;
  }

  if (action === "ATTACK") {
    state.horizontalEnabled = false;
    state.actualAttacks += 1;
    state.nextAttackStep = brainStep + ATTACK_COOLDOWN_STEPS;
    if (!obstacleCleared(state)) state.preClearAttacks += 1;
    if (!state.grounded) state.airborneAttacks += 1;

    if (attackWouldHit(state)) {
      state.hits += 1;
      state.targetHp = Math.max(0, state.targetHp - ATTACK_DAMAGE);
      if (state.firstHitStep === null) state.firstHitStep = brainStep;
      if (state.targetHp === 0 && state.killStep === null) {
        state.killStep = brainStep;
      }
      return reward + 1.5;
    }

    state.whiffs += 1;
    return reward - 0.75;
  }

  throw new Error("unknown arbiter action " + action);
}

function intervalReward(state, previousDistance, previousClearStep) {
  const progress = clamp(
    (previousDistance - targetDistance(state)) / 28,
    -1,
    1,
  ) * 0.15;
  const newlyCleared =
    previousClearStep === null &&
    state.firstClearStep !== null;
  return progress + (newlyCleared ? 1.5 : 0);
}

async function runEpisode({
  connectome,
  dnSlot,
  episode,
  policy,
  random,
  deterministic,
  train,
}) {
  const state = await initializeEpisode(connectome, dnSlot, episode);
  const trajectory = [];
  let previousDistance = targetDistance(state);
  let previousClearStep = null;
  let pendingTransition = null;

  for (let liveStep = 1; liveStep <= MAX_STEPS; liveStep += 1) {
    stimulate(
      state.brain,
      connectome.inputGroups,
      state.encoder.encode({ ...state, visualEnabled: true }),
    );
    state.brain.step();
    collectSkillWindows(state, dnSlot);
    applyPhysics(state);

    if (state.firstClearStep === null && obstacleCleared(state)) {
      state.firstClearStep = liveStep;
    }

    if (liveStep % DECISION_WINDOW_STEPS !== 0) {
      continue;
    }

    if (pendingTransition) {
      pendingTransition.reward += intervalReward(
        state,
        previousDistance,
        previousClearStep,
      );
    }

    if (state.targetHp === 0 && state.firstClearStep !== null) {
      if (pendingTransition) pendingTransition.reward += 5;
      if (train) updatePolicy(policy, trajectory);
      return summarizeEpisode(state, episode, liveStep, false, trajectory);
    }

    previousDistance = targetDistance(state);
    previousClearStep = state.firstClearStep;

    const proposal = lowerLevelDecision(state, liveStep);
    const features = arbiterFeatures(
      state.moveScore,
      proposal.attack.attackProbability,
      proposal.jump.jumpProbability,
      proposal.jump.waitProbability,
    );
    const mask = actionMask(state, proposal, liveStep);
    const choice = chooseAction(
      policy,
      features,
      mask,
      random,
      deterministic,
    );
    const action = ACTIONS[choice.actionIndex];

    const transition = {
      features: Array.from(features),
      mask: [...mask],
      probabilities: [...choice.probabilities],
      actionIndex: choice.actionIndex,
      action,
      reward: actuate(state, action, liveStep),
    };
    trajectory.push(transition);
    pendingTransition = transition;

    if (state.targetHp === 0 && state.firstClearStep !== null) {
      pendingTransition.reward += 5;
      if (train) updatePolicy(policy, trajectory);
      return summarizeEpisode(state, episode, liveStep, false, trajectory);
    }
  }

  if (pendingTransition) {
    pendingTransition.reward +=
      intervalReward(state, previousDistance, previousClearStep) - 3;
  }
  if (train) updatePolicy(policy, trajectory);
  return summarizeEpisode(state, episode, MAX_STEPS, true, trajectory);
}

function summarizeEpisode(state, episode, liveSteps, timeout, trajectory) {
  const clear = state.firstClearStep !== null;
  const kill = state.targetHp === 0;
  return {
    seed: episode.brainSeed,
    baseSeed: episode.baseSeed,
    block: episode.block,
    side: episode.side,
    startDistance: episode.startDistance,
    clear,
    actualJumps: state.actualJumps,
    actualAttacks: state.actualAttacks,
    preClearAttacks: state.preClearAttacks,
    airborneAttacks: state.airborneAttacks,
    hits: state.hits,
    whiffs: state.whiffs,
    kill,
    courseComplete: clear && kill,
    timeout,
    firstClearStep: state.firstClearStep,
    firstHitStep: state.firstHitStep,
    killStep: state.killStep,
    liveSteps,
    finalTargetHp: state.targetHp,
    modeCounts: state.modeCounts,
    reward: trajectory.reduce((sum, row) => sum + row.reward, 0),
  };
}

function aggregate(rows) {
  const totalAttacks = rows.reduce(
    (sum, row) => sum + row.actualAttacks,
    0,
  );
  const totalHits = rows.reduce((sum, row) => sum + row.hits, 0);
  return {
    episodes: rows.length,
    courseCompletionRate: mean(
      rows.map((row) => Number(row.courseComplete)),
    ),
    obstacleClearRate: mean(rows.map((row) => Number(row.clear))),
    targetKillRate: mean(rows.map((row) => Number(row.kill))),
    timeoutRate: mean(rows.map((row) => Number(row.timeout))),
    meanActualJumps: mean(rows.map((row) => row.actualJumps)),
    preClearAttackEpisodeRate: mean(
      rows.map((row) => Number(row.preClearAttacks > 0)),
    ),
    airborneAttackEpisodeRate: mean(
      rows.map((row) => Number(row.airborneAttacks > 0)),
    ),
    actualAttacks: totalAttacks,
    hits: totalHits,
    whiffs: rows.reduce((sum, row) => sum + row.whiffs, 0),
    attackHitPrecision: totalAttacks > 0 ? totalHits / totalAttacks : 0,
    meanReward: mean(rows.map((row) => row.reward)),
  };
}

async function verifyStaticContract() {
  const controller = await readFile(
    new URL("../src/brain/fly-controller.js", import.meta.url),
    "utf8",
  );
  const required = [
    "movementWindowSteps: 26",
    "attackWindowSteps: 5",
    "jumpWindowSteps: 5",
    "attackCooldownMs: 420",
    "jumpCooldownSteps: 38",
    "const distance = Math.abs(dx);",
    "attackSkillApi.chooseSparseCurrent",
    "jumpSkillApi.observeSparseWindow",
  ];
  for (const token of required) {
    if (!controller.includes(token)) {
      throw new Error("frozen browser contract missing: " + token);
    }
  }

  if (
    movementSkill.originalFeatureCount !== DN_COUNT ||
    attackSkill.version !== "v10f-after-run-35516619170" ||
    attackSkill.attackThreshold !== 0.5 ||
    jumpSkill.deploymentStatus !== "DEPLOYED" ||
    jumpSkill.provenance.h2.runId !== 35748844599 ||
    jumpSkill.sensory.obstacleUsesLC4 !== false ||
    jumpSkill.sparseFeatureCount !== 96 ||
    jumpSkill.temporalWindows !== 4 ||
    jumpSkill.threshold !== 0.5 ||
    jumpSkill.persistenceWindows !== 2 ||
    jumpSkill.cooldownBrainSteps !== 38
  ) {
    throw new Error("frozen lower-level skill mismatch");
  }

  if (arbiterFeatures.length !== 4) {
    throw new Error("arbiter input signature changed");
  }
}

async function main() {
  await verifyStaticContract();

  const connectome = await loadConnectome({
    cacheDir: resolve(".cache/maplefly-connectome"),
    onProgress(message) {
      console.log("[connectome] " + message);
    },
  });
  const dnSlot = buildDnSlot(connectome.meta);

  for (const channel of ["LC6", "LC16", "LC22", "LPLC4"]) {
    for (const side of ["L", "R"]) {
      const group = cells(connectome.meta, [channel], side);
      if (!group.length) {
        throw new Error(channel + "_" + side + " missing");
      }
      connectome.inputGroups.set(channel + "_" + side, group);
    }
  }

  const policy = createPolicy();
  const random = mulberry32(TRAINER_SEED);
  const practiceSchedule = [];
  for (const baseSeed of PRACTICE_BASE_SEEDS) {
    for (let block = 0; block < PRACTICE_BLOCKS; block += 1) {
      practiceSchedule.push(...makeBlock(baseSeed, block));
    }
  }

  const practiceRows = [];
  const orderedPractice = shuffle(practiceSchedule, random);
  for (let index = 0; index < orderedPractice.length; index += 1) {
    const row = await runEpisode({
      connectome,
      dnSlot,
      episode: orderedPractice[index],
      policy,
      random,
      deterministic: false,
      train: true,
    });
    practiceRows.push(row);

    if ((index + 1) % 12 === 0) {
      const recent = aggregate(practiceRows.slice(-12));
      console.log(
        "[v13-practice] " +
          (index + 1) +
          "/" +
          orderedPractice.length +
          " complete=" +
          (recent.courseCompletionRate * 100).toFixed(1) +
          "% clear=" +
          (recent.obstacleClearRate * 100).toFixed(1) +
          "% precision=" +
          (recent.attackHitPrecision * 100).toFixed(1) +
          "% reward=" +
          recent.meanReward.toFixed(3),
      );
      await new Promise((resolveNow) => setImmediate(resolveNow));
    }
  }

  const frozenWeights = policy.weights.map((row) => Array.from(row));

  const perSeed = [];
  const finalRows = [];
  for (const baseSeed of FINAL_SEEDS) {
    const rows = [];
    for (const episode of makeBlock(baseSeed, 0)) {
      const row = await runEpisode({
        connectome,
        dnSlot,
        episode,
        policy,
        random,
        deterministic: true,
        train: false,
      });
      rows.push(row);
      finalRows.push(row);
    }
    const seedSummary = aggregate(rows);
    perSeed.push({ baseSeed, ...seedSummary, rows });
    console.log(
      "[v13-final] seed=" +
        baseSeed +
        " complete=" +
        (seedSummary.courseCompletionRate * 100).toFixed(1) +
        "% clear=" +
        (seedSummary.obstacleClearRate * 100).toFixed(1) +
        "% kill=" +
        (seedSummary.targetKillRate * 100).toFixed(1) +
        "% airAtk=" +
        (seedSummary.airborneAttackEpisodeRate * 100).toFixed(1) +
        "% precision=" +
        (seedSummary.attackHitPrecision * 100).toFixed(1) +
        "%",
    );
  }

  const summary = aggregate(finalRows);
  summary.minSeedCompletionRate = Math.min(
    ...perSeed.map((row) => row.courseCompletionRate),
  );

  const gateChecks = {
    courseCompletion:
      summary.courseCompletionRate >= GATE.courseCompletion,
    minSeedCompletion:
      summary.minSeedCompletionRate >= GATE.minSeedCompletion,
    obstacleClear: summary.obstacleClearRate >= GATE.obstacleClear,
    targetKill: summary.targetKillRate >= GATE.targetKill,
    timeout: summary.timeoutRate <= GATE.timeoutMax,
    meanJumps: summary.meanActualJumps <= GATE.meanJumpsMax,
    preClearAttack:
      summary.preClearAttackEpisodeRate <= GATE.preClearAttackEpisodeMax,
    airborneAttack:
      summary.airborneAttackEpisodeRate <= GATE.airborneAttackEpisodeMax,
    attackHitPrecision:
      summary.attackHitPrecision >= GATE.attackHitPrecisionMin,
  };
  const pass = Object.values(gateChecks).every(Boolean);

  const output = {
    schema: "maplefly.v13.learned-proposal-arbiter.1",
    brainCommit: SOURCE.commit,
    lowerLevelSkills: {
      movement: movementSkill.version,
      attack: attackSkill.version,
      jump: jumpSkill.version,
    },
    learner: {
      actions: ACTIONS,
      featureCount: FEATURE_COUNT,
      gamma: GAMMA,
      learningRate: LEARNING_RATE,
      l2: L2,
      weightClamp: WEIGHT_CLAMP,
      trainerSeed: TRAINER_SEED,
      weights: frozenWeights,
    },
    practice: {
      baseSeeds: PRACTICE_BASE_SEEDS,
      blocksPerSeed: PRACTICE_BLOCKS,
      episodes: practiceRows.length,
      first24: aggregate(practiceRows.slice(0, 24)),
      last24: aggregate(practiceRows.slice(-24)),
      overall: aggregate(practiceRows),
    },
    final: {
      seeds: FINAL_SEEDS,
      distances: DISTANCES,
      episodes: finalRows.length,
      gate: GATE,
      gateChecks,
      summary,
      perSeed,
      pass,
    },
  };

  const outDir = resolve("results/experiment-v13-learned-arbiter");
  await mkdir(outDir, { recursive: true });
  await writeFile(
    resolve(outDir, "experiment_v13.json"),
    JSON.stringify(output, null, 2) + "\n",
  );

  console.log(
    "V13-LEARNED-ARBITER=" +
      (pass ? "PASS" : "FAIL") +
      " complete=" +
      (summary.courseCompletionRate * 100).toFixed(1) +
      "% minSeed=" +
      (summary.minSeedCompletionRate * 100).toFixed(1) +
      "% clear=" +
      (summary.obstacleClearRate * 100).toFixed(1) +
      "% kill=" +
      (summary.targetKillRate * 100).toFixed(1) +
      "% timeout=" +
      (summary.timeoutRate * 100).toFixed(1) +
      "% jumps=" +
      summary.meanActualJumps.toFixed(3) +
      " preClearAtk=" +
      (summary.preClearAttackEpisodeRate * 100).toFixed(1) +
      "% airAtk=" +
      (summary.airborneAttackEpisodeRate * 100).toFixed(1) +
      "% precision=" +
      (summary.attackHitPrecision * 100).toFixed(1) +
      "%",
  );

  if (!pass) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
