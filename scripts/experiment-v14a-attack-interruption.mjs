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
import "../src/brain/fly-skill-v11h2-jump.js";\nimport "../src/brain/fly-interruption-v14.js";

const STEP_SECONDS = 0.02;
const SETTLE_STEPS = 26;
const BASELINE_STEPS = 26;
const MOVE_WINDOW_STEPS = 26;
const ATTACK_WINDOW_STEPS = 5;
const JUMP_WINDOW_STEPS = 5;
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
const PRACTICE_BASE_SEEDS = [2501000, 2511000, 2521000];
const FINAL_SEEDS = [2551000, 2561000, 2571000];
const PRACTICE_BLOCKS = 3;
const TRAINER_SEED = 914001;

const GAMMA = 0.97;
const LEARNING_RATE = 0.02;
const L2 = 0.0005;
const WEIGHT_CLAMP = 4;

const GATE = Object.freeze({
  courseCompletion: 0.75,
  minSeedCompletion: 0.625,
  obstacleClear: 0.875,
  leftObstacleClear: 0.875,
  rightObstacleClear: 0.875,
  targetKill: 0.75,
  timeoutMax: 0.25,
  airborneAttackEpisodeMax: 0.30,
  attackHitPrecisionMin: 0.50,
});

const const movementApi = globalThis.MapleFlySkillV7;
const movementSkill = movementApi.BUNDLED_STATE;
const attackApi = globalThis.MapleFlyAttackSkillV10;
const attackSkill = attackApi.BUNDLED_STATE;
const jumpApi = globalThis.MapleFlyJumpSkillV11H2;
const jumpSkill = jumpApi.BUNDLED_STATE;
const interruptionApi = globalThis.MapleFlyInterruptionV14;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function mean(values) {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;
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

function movementChoice(currentRate, baselineRate) {
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

function attackChoice(currentRate, baselineRate) {
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
    throw new Error("v14A matched geometry mismatch");
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

function obstacleCleared(state) {
  return state.obstacle.side === "R"
    ? state.playerX > state.obstacle.x + state.obstacle.width
    : state.playerX + PLAYER_WIDTH < state.obstacle.x;
}

function moveDirection(action) {
  return action === "LEFT" ? -1 : action === "RIGHT" ? 1 : 0;
}

function applyPhysics(state) {
  const direction = moveDirection(state.moveAction);
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
    targetHp: TARGET_HP,
    actualJumps: 0,
    actualAttacks: 0,
    attackProposals: 0,
    acceptedAttackProposals: 0,
    interruptedAttackProposals: 0,
    hits: 0,
    whiffs: 0,
    preClearAttacks: 0,
    airborneAttacks: 0,
    firstClearStep: null,
    firstHitStep: null,
    killStep: null,
    history: interruptionApi.createHistory(),
    previousDidJump: false,
    previousDidAttack: false,
    trajectory: [],
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

function updateMovement(state, dnSlot) {
  collectDn(state.brain, dnSlot, state.moveCounts);
  state.moveSteps += 1;
  if (state.moveSteps < MOVE_WINDOW_STEPS) return;

  const proposal = movementChoice(
    rate(state.moveCounts, state.moveSteps),
    state.baselineRate,
  );
  state.moveAction = proposal.action;
  state.moveScore = proposal.leftScore;
  state.moveCounts.fill(0);
  state.moveSteps = 0;
}

function collectDecisionWindows(state, dnSlot) {
  collectDn(state.brain, dnSlot, state.attackCounts);
  collectDn(state.brain, dnSlot, state.jumpCounts);
  state.attackSteps += 1;
  state.jumpSteps += 1;
}

function executeAttack(state, brainStep) {
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
      return 3.5;
    }
    return 1.5;
  }

  state.whiffs += 1;
  return -1.0;
}

function decisionBoundary({
  state,
  brainStep,
  policy,
  random,
  deterministic,
}) {
  if (
    state.attackSteps !== ATTACK_WINDOW_STEPS ||
    state.jumpSteps !== JUMP_WINDOW_STEPS
  ) {
    throw new Error("v14A decision window alignment mismatch");
  }

  const attack = attackChoice(
    rate(state.attackCounts, state.attackSteps),
    state.baselineRate,
  );
  state.attackCounts.fill(0);
  state.attackSteps = 0;

  const jumpAvailable =
    state.grounded && brainStep >= state.nextJumpStep;
  const jump = jumpApi.observeSparseWindow(
    jumpFeature(
      rate(state.jumpCounts, state.jumpSteps),
      state.baselineRate,
    ),
    jumpAvailable,
    jumpSkill,
    state.jumpRuntime,
  );
  state.jumpCounts.fill(0);
  state.jumpSteps = 0;

  const frame = interruptionApi.makeFrame(
    Math.abs(Math.tanh(Number(state.moveScore) || 0)),
    attack.attackProbability,
    jump.jumpProbability,
    jump.waitProbability,
    state.previousDidJump,
    state.previousDidAttack,
  );
  interruptionApi.pushFrame(state.history, frame);
  const temporalFeature = interruptionApi.concatHistory(state.history);

  let didAttack = false;
  let didJump = false;

  if (
    attack.action === "ATTACK" &&
    brainStep >= state.nextAttackStep
  ) {
    state.attackProposals += 1;
    const choice = interruptionApi.choose(
      policy,
      temporalFeature,
      random,
      deterministic,
    );
    const transition = {
      feature: Array.from(temporalFeature),
      accept: choice.accept,
      probability: choice.probability,
      reward: 0,
    };
    state.trajectory.push(transition);

    if (choice.accept) {
      state.acceptedAttackProposals += 1;
      transition.reward += executeAttack(state, brainStep);
      didAttack = true;
    } else {
      state.interruptedAttackProposals += 1;
    }
  }

  if (jump.action === "JUMP" && jumpAvailable) {
    state.vy = -JUMP_VELOCITY;
    state.grounded = false;
    state.nextJumpStep =
      brainStep + jumpSkill.cooldownBrainSteps;
    state.actualJumps += 1;
    jumpApi.onActuatedJump(state.jumpRuntime);
    didJump = true;
  }

  state.previousDidAttack = didAttack;
  state.previousDidJump = didJump;
}

function addTerminalReward(state, value) {
  if (!state.trajectory.length) return;
  state.trajectory[state.trajectory.length - 1].reward += value;
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

  for (let liveStep = 1; liveStep <= MAX_STEPS; liveStep += 1) {
    stimulate(
      state.brain,
      connectome.inputGroups,
      state.encoder.encode({ ...state, visualEnabled: true }),
    );
    state.brain.step();

    updateMovement(state, dnSlot);
    collectDecisionWindows(state, dnSlot);

    if (liveStep % ATTACK_WINDOW_STEPS === 0) {
      decisionBoundary({
        state,
        brainStep: liveStep,
        policy,
        random,
        deterministic,
      });
    }

    applyPhysics(state);

    if (state.firstClearStep === null && obstacleCleared(state)) {
      state.firstClearStep = liveStep;
    }

    if (state.targetHp === 0 && state.firstClearStep !== null) {
      addTerminalReward(state, 5.0);
      if (train) {
        interruptionApi.updatePolicy(
          policy,
          state.trajectory,
          {
            gamma: GAMMA,
            learningRate: LEARNING_RATE,
            l2: L2,
            weightClamp: WEIGHT_CLAMP,
          },
        );
      }
      return summarizeEpisode(
        state,
        episode,
        liveStep,
        false,
      );
    }
  }

  addTerminalReward(state, -3.0);
  if (train) {
    interruptionApi.updatePolicy(
      policy,
      state.trajectory,
      {
        gamma: GAMMA,
        learningRate: LEARNING_RATE,
        l2: L2,
        weightClamp: WEIGHT_CLAMP,
      },
    );
  }
  return summarizeEpisode(state, episode, MAX_STEPS, true);
}

function summarizeEpisode(state, episode, liveSteps, timeout) {
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
    attackProposals: state.attackProposals,
    acceptedAttackProposals: state.acceptedAttackProposals,
    interruptedAttackProposals: state.interruptedAttackProposals,
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
    reward: state.trajectory.reduce(
      (sum, row) => sum + row.reward,
      0,
    ),
    gateDecisions: state.trajectory.length,
  };
}

function aggregate(rows) {
  const totalAttacks = rows.reduce(
    (sum, row) => sum + row.actualAttacks,
    0,
  );
  const totalHits = rows.reduce((sum, row) => sum + row.hits, 0);
  const sideRows = (side) => rows.filter((row) => row.side === side);
  const leftRows = sideRows("L");
  const rightRows = sideRows("R");

  return {
    episodes: rows.length,
    courseCompletionRate: mean(
      rows.map((row) => Number(row.courseComplete)),
    ),
    obstacleClearRate: mean(rows.map((row) => Number(row.clear))),
    leftObstacleClearRate: mean(
      leftRows.map((row) => Number(row.clear)),
    ),
    rightObstacleClearRate: mean(
      rightRows.map((row) => Number(row.clear)),
    ),
    targetKillRate: mean(rows.map((row) => Number(row.kill))),
    timeoutRate: mean(rows.map((row) => Number(row.timeout))),
    meanActualJumps: mean(rows.map((row) => row.actualJumps)),
    attackProposals: rows.reduce(
      (sum, row) => sum + row.attackProposals,
      0,
    ),
    acceptedAttackProposals: rows.reduce(
      (sum, row) => sum + row.acceptedAttackProposals,
      0,
    ),
    interruptedAttackProposals: rows.reduce(
      (sum, row) => sum + row.interruptedAttackProposals,
      0,
    ),
    preClearAttackEpisodeRate: mean(
      rows.map((row) => Number(row.preClearAttacks > 0)),
    ),
    airborneAttackEpisodeRate: mean(
      rows.map((row) => Number(row.airborneAttacks > 0)),
    ),
    actualAttacks: totalAttacks,
    hits: totalHits,
    whiffs: rows.reduce((sum, row) => sum + row.whiffs, 0),
    attackHitPrecision:
      totalAttacks > 0 ? totalHits / totalAttacks : 0,
    meanReward: mean(rows.map((row) => row.reward)),
  };
}

async function verifyStaticContract() {
  const controller = await readFile(
    new URL("../src/brain/fly-controller.js", import.meta.url),
    "utf8",
  );
  const interruptionSource = await readFile(
    new URL("../src/brain/fly-interruption-v14.js", import.meta.url),
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

  if (
    interruptionApi.FRAME_SIZE !== 8 ||
    interruptionApi.HISTORY_FRAMES !== 8 ||
    interruptionApi.FEATURE_COUNT !== 64 ||
    interruptionApi.makeFrame.length !== 6
  ) {
    throw new Error("v14A interruption interface mismatch");
  }

  const forbidden = [
    "player",
    "target",
    "obstacle",
    "grounded",
    "airborne",
    "distance",
    "collision",
    "hittable",
    "seed",
  ];
  for (const token of forbidden) {
    if (interruptionSource.toLowerCase().includes(token)) {
      throw new Error(
        "v14A pure interruption module contains forbidden game-state token: " +
          token,
      );
    }
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

  const policy = interruptionApi.createPolicy();
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
        "[v14A-practice] " +
          (index + 1) +
          "/" +
          orderedPractice.length +
          " complete=" +
          (recent.courseCompletionRate * 100).toFixed(1) +
          "% clear=" +
          (recent.obstacleClearRate * 100).toFixed(1) +
          "% airAtk=" +
          (recent.airborneAttackEpisodeRate * 100).toFixed(1) +
          "% precision=" +
          (recent.attackHitPrecision * 100).toFixed(1) +
          "% reward=" +
          recent.meanReward.toFixed(3),
      );
      await new Promise((resolveNow) => setImmediate(resolveNow));
    }
  }

  const frozenPolicy = {
    bias: policy.bias,
    weights: Array.from(policy.weights),
  };

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
      "[v14A-final] seed=" +
        baseSeed +
        " complete=" +
        (seedSummary.courseCompletionRate * 100).toFixed(1) +
        "% clear=" +
        (seedSummary.obstacleClearRate * 100).toFixed(1) +
        "% left=" +
        (seedSummary.leftObstacleClearRate * 100).toFixed(1) +
        "% right=" +
        (seedSummary.rightObstacleClearRate * 100).toFixed(1) +
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
    obstacleClear:
      summary.obstacleClearRate >= GATE.obstacleClear,
    leftObstacleClear:
      summary.leftObstacleClearRate >= GATE.leftObstacleClear,
    rightObstacleClear:
      summary.rightObstacleClearRate >= GATE.rightObstacleClear,
    targetKill:
      summary.targetKillRate >= GATE.targetKill,
    timeout:
      summary.timeoutRate <= GATE.timeoutMax,
    airborneAttack:
      summary.airborneAttackEpisodeRate <=
      GATE.airborneAttackEpisodeMax,
    attackHitPrecision:
      summary.attackHitPrecision >=
      GATE.attackHitPrecisionMin,
  };
  const pass = Object.values(gateChecks).every(Boolean);

  const output = {
    schema: "maplefly.v14a.attack-interruption.1",
    brainCommit: SOURCE.commit,
    preregistration:
      "history/prereg_v14a.md@35dd16531facee98742a22f66af98890ba7d097c",
    lowerLevelSkills: {
      movement: movementSkill.version,
      attack: attackSkill.version,
      jump: jumpSkill.version,
    },
    learner: {
      actions: ["ACCEPT", "INTERRUPT"],
      frameSize: interruptionApi.FRAME_SIZE,
      historyFrames: interruptionApi.HISTORY_FRAMES,
      featureCount: interruptionApi.FEATURE_COUNT,
      gamma: GAMMA,
      learningRate: LEARNING_RATE,
      l2: L2,
      weightClamp: WEIGHT_CLAMP,
      trainerSeed: TRAINER_SEED,
      policy: frozenPolicy,
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

  const outDir = resolve(
    "results/experiment-v14a-attack-interruption",
  );
  await mkdir(outDir, { recursive: true });
  await writeFile(
    resolve(outDir, "experiment_v14a.json"),
    JSON.stringify(output, null, 2) + "\n",
  );

  console.log(
    "V14A-ATTACK-INTERRUPTION=" +
      (pass ? "PASS" : "FAIL") +
      " complete=" +
      (summary.courseCompletionRate * 100).toFixed(1) +
      "% minSeed=" +
      (summary.minSeedCompletionRate * 100).toFixed(1) +
      "% clear=" +
      (summary.obstacleClearRate * 100).toFixed(1) +
      "% left=" +
      (summary.leftObstacleClearRate * 100).toFixed(1) +
      "% right=" +
      (summary.rightObstacleClearRate * 100).toFixed(1) +
      "% kill=" +
      (summary.targetKillRate * 100).toFixed(1) +
      "% timeout=" +
      (summary.timeoutRate * 100).toFixed(1) +
      "% jumps=" +
      summary.meanActualJumps.toFixed(3) +
      " proposals=" +
      summary.attackProposals +
      " accepted=" +
      summary.acceptedAttackProposals +
      " interrupted=" +
      summary.interruptedAttackProposals +
      " airAtk=" +
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
