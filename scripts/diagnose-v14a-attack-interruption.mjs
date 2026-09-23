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
import "../src/brain/fly-interruption-v14.js";

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

const movementApi = globalThis.MapleFlySkillV7;
const movementSkill = movementApi.BUNDLED_STATE;
const attackApi = globalThis.MapleFlyAttackSkillV10;
const attackSkill = attackApi.BUNDLED_STATE;
const jumpApi = globalThis.MapleFlyJumpSkillV11H2;
const jumpSkill = jumpApi.BUNDLED_STATE;
const interruptionApi = globalThis.MapleFlyInterruptionV14;\nconst DIAG_SOURCE_RUN = 35797391192;

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
    lastActualJumpStep: null,
    lastActualAttackStep: null,
    proposalRows: [],
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
  state.lastActualAttackStep = brainStep;
  state.nextAttackStep = brainStep + ATTACK_COOLDOWN_STEPS;
  if (!obstacleCleared(state)) state.preClearAttacks += 1;
  if (!state.grounded) state.airborneAttacks += 1;

  const hit = attackWouldHit(state);
  if (hit) {
    state.hits += 1;
    state.targetHp = Math.max(0, state.targetHp - ATTACK_DAMAGE);
    if (state.firstHitStep === null) state.firstHitStep = brainStep;
    if (state.targetHp === 0 && state.killStep === null) {
      state.killStep = brainStep;
    }
  } else {
    state.whiffs += 1;
  }
  return hit;
}

function decisionBoundary({
  state,
  episode,
  brainStep,
  policy,
  proposalCounter,
}) {
  if (
    state.attackSteps !== ATTACK_WINDOW_STEPS ||
    state.jumpSteps !== JUMP_WINDOW_STEPS
  ) {
    throw new Error("v14A diagnostic decision window alignment mismatch");
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

  const moveConfidence =
    Math.abs(Math.tanh(Number(state.moveScore) || 0));
  const frame = interruptionApi.makeFrame(
    moveConfidence,
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
      () => 0.5,
      true,
    );

    const wouldHitNow = attackWouldHit(state);
    const airborneAtProposal = !state.grounded;
    const clearedAtProposal = obstacleCleared(state);
    const proposalId = proposalCounter.next;
    proposalCounter.next += 1;

    const row = {
      proposalId,
      episodeId:
        String(episode.baseSeed) +
        ":" +
        episode.side +
        ":" +
        String(episode.startDistance),
      brainStep,
      moveConfidence,
      attackP: attack.attackProbability,
      attackMargin: attack.attackProbability - 0.5,
      jumpP: jump.jumpProbability,
      waitP: jump.waitProbability,
      jumpMargin: jump.jumpProbability - jump.waitProbability,
      didJump: state.previousDidJump ? 1 : 0,
      didAttack: state.previousDidAttack ? 1 : 0,
      feature: Array.from(temporalFeature),
      gateAcceptProbability: choice.probability,
      gateDecision: choice.accept ? "ACCEPT" : "INTERRUPT",

      groundedAtProposal: state.grounded,
      airborneAtProposal,
      wouldHitNow,
      wouldWhiffNow: !wouldHitNow,
      obstacleClearedAtProposal: clearedAtProposal,
      stepsSinceActualJump:
        state.lastActualJumpStep === null
          ? null
          : brainStep - state.lastActualJumpStep,
      stepsSinceActualAttack:
        state.lastActualAttackStep === null
          ? null
          : brainStep - state.lastActualAttackStep,
      playerX: state.playerX,
      playerY: state.playerY,
      targetX: state.targetX,
      targetDistance: Math.abs(
        state.targetX - (state.playerX + PLAYER_WIDTH / 2),
      ),
      side: episode.side,
      startDistance: episode.startDistance,
      seed: episode.baseSeed,
      targetHp: state.targetHp,
      actualOutcome: null,
    };

    if (choice.accept) {
      state.acceptedAttackProposals += 1;
      const hit = executeAttack(state, brainStep);
      didAttack = true;
      row.actualOutcome = hit ? "HIT" : "WHIFF";
    } else {
      state.interruptedAttackProposals += 1;
      row.actualOutcome = "INTERRUPTED";
    }

    state.proposalRows.push(row);
  }

  if (jump.action === "JUMP" && jumpAvailable) {
    state.vy = -JUMP_VELOCITY;
    state.grounded = false;
    state.nextJumpStep =
      brainStep + jumpSkill.cooldownBrainSteps;
    state.actualJumps += 1;
    state.lastActualJumpStep = brainStep;
    jumpApi.onActuatedJump(state.jumpRuntime);
    didJump = true;
  }

  state.previousDidAttack = didAttack;
  state.previousDidJump = didJump;
}

async function runEpisode({
  connectome,
  dnSlot,
  episode,
  policy,
  proposalCounter,
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
        episode,
        brainStep: liveStep,
        policy,
        proposalCounter,
      });
    }

    applyPhysics(state);

    if (state.firstClearStep === null && obstacleCleared(state)) {
      state.firstClearStep = liveStep;
    }

    if (state.targetHp === 0 && state.firstClearStep !== null) {
      return summarizeEpisode(state, episode, liveStep, false);
    }
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
    proposalRows: state.proposalRows,
  };
}

function aggregate(rows) {
  const totalAttacks = rows.reduce(
    (sum, row) => sum + row.actualAttacks,
    0,
  );
  const totalHits = rows.reduce((sum, row) => sum + row.hits, 0);
  const leftRows = rows.filter((row) => row.side === "L");
  const rightRows = rows.filter((row) => row.side === "R");

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
  };
}

function assertClose(name, actual, expected, tolerance = 1e-12) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(
      "authoritative replay mismatch " +
        name +
        " actual=" +
        actual +
        " expected=" +
        expected,
    );
  }
}

function verifyReplay(summary, expected) {
  const exact = [
    "episodes",
    "attackProposals",
    "acceptedAttackProposals",
    "interruptedAttackProposals",
    "actualAttacks",
    "hits",
    "whiffs",
  ];
  for (const key of exact) {
    if (summary[key] !== expected[key]) {
      throw new Error(
        "authoritative replay count mismatch " +
          key +
          " actual=" +
          summary[key] +
          " expected=" +
          expected[key],
      );
    }
  }

  const numeric = [
    "courseCompletionRate",
    "obstacleClearRate",
    "targetKillRate",
    "timeoutRate",
    "meanActualJumps",
    "airborneAttackEpisodeRate",
    "attackHitPrecision",
    "minSeedCompletionRate",
  ];
  for (const key of numeric) {
    assertClose(key, summary[key], expected[key]);
  }
}

function conditional(rows, predicate) {
  const selected = rows.filter(predicate);
  return {
    count: selected.length,
    meanAcceptProbability: mean(
      selected.map((row) => row.gateAcceptProbability),
    ),
    acceptRate: mean(
      selected.map((row) => Number(row.gateDecision === "ACCEPT")),
    ),
  };
}

function gateConfusion(rows) {
  const count = (accept, hit) =>
    rows.filter(
      (row) =>
        (row.gateDecision === "ACCEPT") === accept &&
        row.wouldHitNow === hit,
    ).length;

  const acceptHit = count(true, true);
  const acceptWhiff = count(true, false);
  const interruptHit = count(false, true);
  const interruptWhiff = count(false, false);
  const allHit = acceptHit + interruptHit;
  const allWhiff = acceptWhiff + interruptWhiff;

  return {
    acceptWouldHit: acceptHit,
    acceptWouldWhiff: acceptWhiff,
    interruptWouldHit: interruptHit,
    interruptWouldWhiff: interruptWhiff,
    goodAcceptRate: allHit ? acceptHit / allHit : 0,
    goodInterruptRate: allWhiff ? interruptWhiff / allWhiff : 0,
    falseAcceptRate: allWhiff ? acceptWhiff / allWhiff : 0,
    falseInterruptRate: allHit ? interruptHit / allHit : 0,
    proposalDecisionAccuracy:
      rows.length
        ? (acceptHit + interruptWhiff) / rows.length
        : 0,
    grounded: conditional(rows, (row) => row.groundedAtProposal),
    airborne: conditional(rows, (row) => row.airborneAtProposal),
    wouldHit: conditional(rows, (row) => row.wouldHitNow),
    wouldWhiff: conditional(rows, (row) => row.wouldWhiffNow),
  };
}

function jumpAgeBin(value) {
  if (value === null) return "NO_PREVIOUS_JUMP";
  if (value <= 9) return "0_9";
  if (value <= 19) return "10_19";
  if (value <= 29) return "20_29";
  if (value <= 39) return "30_39";
  return "40_PLUS";
}

function temporalBins(rows) {
  const names = [
    "NO_PREVIOUS_JUMP",
    "0_9",
    "10_19",
    "20_29",
    "30_39",
    "40_PLUS",
  ];
  const output = {};
  for (const name of names) {
    const selected = rows.filter(
      (row) => jumpAgeBin(row.stepsSinceActualJump) === name,
    );
    output[name] = {
      proposals: selected.length,
      airborneRate: mean(
        selected.map((row) => Number(row.airborneAtProposal)),
      ),
      wouldHitRate: mean(
        selected.map((row) => Number(row.wouldHitNow)),
      ),
      meanAttackP: mean(selected.map((row) => row.attackP)),
      meanJumpP: mean(selected.map((row) => row.jumpP)),
      meanJumpMargin: mean(
        selected.map((row) => row.jumpMargin),
      ),
      meanGateAcceptProbability: mean(
        selected.map((row) => row.gateAcceptProbability),
      ),
      acceptRate: mean(
        selected.map(
          (row) => Number(row.gateDecision === "ACCEPT"),
        ),
      ),
      wouldWhiffRate: mean(
        selected.map((row) => Number(row.wouldWhiffNow)),
      ),
    };
  }
  return output;
}

function standardizer(rows) {
  const featureCount = interruptionApi.FEATURE_COUNT;
  const means = new Float64Array(featureCount);
  const scales = new Float64Array(featureCount);

  for (const row of rows) {
    for (let j = 0; j < featureCount; j += 1) {
      means[j] += row.feature[j];
    }
  }
  for (let j = 0; j < featureCount; j += 1) {
    means[j] /= rows.length;
  }

  for (const row of rows) {
    for (let j = 0; j < featureCount; j += 1) {
      const delta = row.feature[j] - means[j];
      scales[j] += delta * delta;
    }
  }
  for (let j = 0; j < featureCount; j += 1) {
    scales[j] = Math.sqrt(scales[j] / rows.length);
    if (scales[j] < 1e-9) scales[j] = 1;
  }

  return { means, scales };
}

function standardizedFeature(row, stats) {
  const output = new Float64Array(interruptionApi.FEATURE_COUNT);
  for (let j = 0; j < output.length; j += 1) {
    output[j] =
      (row.feature[j] - stats.means[j]) / stats.scales[j];
  }
  return output;
}

function sigmoid(value) {
  if (value >= 0) {
    const z = Math.exp(-value);
    return 1 / (1 + z);
  }
  const z = Math.exp(value);
  return z / (1 + z);
}

function trainProbe(rows, labelKey) {
  const stats = standardizer(rows);
  const featureCount = interruptionApi.FEATURE_COUNT;
  const weights = new Float64Array(featureCount);
  let bias = 0;
  const positives = rows.filter((row) => Boolean(row[labelKey])).length;
  const negatives = rows.length - positives;
  if (!positives || !negatives) {
    throw new Error(
      "probe training class support missing for " + labelKey,
    );
  }
  const positiveWeight = 0.5 / positives;
  const negativeWeight = 0.5 / negatives;

  const prepared = rows.map((row) => ({
    x: standardizedFeature(row, stats),
    y: Boolean(row[labelKey]) ? 1 : 0,
  }));

  for (let epoch = 0; epoch < 300; epoch += 1) {
    const grad = new Float64Array(featureCount);
    let biasGrad = 0;

    for (const row of prepared) {
      let score = bias;
      for (let j = 0; j < featureCount; j += 1) {
        score += weights[j] * row.x[j];
      }
      const probability = sigmoid(score);
      const sampleWeight =
        row.y === 1 ? positiveWeight : negativeWeight;
      const error = (probability - row.y) * sampleWeight;
      biasGrad += error;
      for (let j = 0; j < featureCount; j += 1) {
        grad[j] += error * row.x[j];
      }
    }

    bias -= 0.03 * biasGrad;
    for (let j = 0; j < featureCount; j += 1) {
      weights[j] -= 0.03 * (grad[j] + 0.001 * weights[j]);
    }
  }

  return { bias, weights, stats };
}

function probeScore(model, row) {
  const x = standardizedFeature(row, model.stats);
  let score = model.bias;
  for (let j = 0; j < x.length; j += 1) {
    score += model.weights[j] * x[j];
  }
  return sigmoid(score);
}

function auroc(labels, scores) {
  const positives = [];
  const negatives = [];
  for (let i = 0; i < labels.length; i += 1) {
    (labels[i] ? positives : negatives).push(scores[i]);
  }
  if (!positives.length || !negatives.length) return null;

  let wins = 0;
  let pairs = 0;
  for (const positive of positives) {
    for (const negative of negatives) {
      pairs += 1;
      if (positive > negative) wins += 1;
      else if (positive === negative) wins += 0.5;
    }
  }
  return wins / pairs;
}

function classificationMetrics(rows, labelKey, scoreFn) {
  let tp = 0;
  let tn = 0;
  let fp = 0;
  let fn = 0;
  const labels = [];
  const scores = [];

  for (const row of rows) {
    const label = Boolean(row[labelKey]);
    const score = scoreFn(row);
    const predicted = score >= 0.5;
    labels.push(label);
    scores.push(score);
    if (label && predicted) tp += 1;
    else if (!label && !predicted) tn += 1;
    else if (!label && predicted) fp += 1;
    else fn += 1;
  }

  const sensitivity = tp + fn ? tp / (tp + fn) : 0;
  const specificity = tn + fp ? tn / (tn + fp) : 0;
  return {
    auroc: auroc(labels, scores),
    balancedAccuracy: (sensitivity + specificity) / 2,
    sensitivity,
    specificity,
    positiveSupport: tp + fn,
    negativeSupport: tn + fp,
    tp,
    tn,
    fp,
    fn,
  };
}

function runProbe(rows, labelKey) {
  const folds = [];
  for (const heldOutSeed of FINAL_SEEDS) {
    const trainRows = rows.filter(
      (row) => row.seed !== heldOutSeed,
    );
    const testRows = rows.filter(
      (row) => row.seed === heldOutSeed,
    );
    const model = trainProbe(trainRows, labelKey);
    const metrics = classificationMetrics(
      testRows,
      labelKey,
      (row) => probeScore(model, row),
    );
    folds.push({
      heldOutSeed,
      trainRows: trainRows.length,
      testRows: testRows.length,
      ...metrics,
    });
  }

  return {
    label: labelKey,
    folds,
    macroMeanAuroc: mean(
      folds.map((fold) => fold.auroc ?? 0),
    ),
    minSeedAuroc: Math.min(
      ...folds.map((fold) => fold.auroc ?? 0),
    ),
    macroBalancedAccuracy: mean(
      folds.map((fold) => fold.balancedAccuracy),
    ),
    minBalancedAccuracy: Math.min(
      ...folds.map((fold) => fold.balancedAccuracy),
    ),
  };
}

function separabilityBand(probe) {
  if (
    probe.macroMeanAuroc >= 0.75 &&
    probe.macroBalancedAccuracy >= 0.70
  ) {
    return "STRONGLY_SEPARABLE";
  }
  if (
    probe.macroMeanAuroc <= 0.60 ||
    probe.macroBalancedAccuracy <= 0.60
  ) {
    return "WEAKLY_SEPARABLE";
  }
  return "AMBIGUOUS";
}

function diagnosticClassification(hitProbe, airProbe, gateHitMetrics) {
  const hitBand = separabilityBand(hitProbe);
  const airBand = separabilityBand(airProbe);

  if (hitBand === "STRONGLY_SEPARABLE") {
    if ((gateHitMetrics.auroc ?? 0) >= 0.75) {
      return "CALIBRATION";
    }
    return "LEARNER_CREDIT";
  }

  if (hitBand === "WEAKLY_SEPARABLE") {
    if (airBand === "STRONGLY_SEPARABLE") {
      return "COMBAT_REPRESENTATION";
    }
    return "REPRESENTATION";
  }

  return "AMBIGUOUS";
}

async function verifyStaticContract() {
  const interruptionSource = await readFile(
    new URL("../src/brain/fly-interruption-v14.js", import.meta.url),
    "utf8",
  );

  if (
    movementSkill.originalFeatureCount !== DN_COUNT ||
    attackSkill.version !== "v10f-after-run-35516619170" ||
    attackSkill.attackThreshold !== 0.5 ||
    jumpSkill.provenance.h2.runId !== 35748844599 ||
    jumpSkill.sensory.obstacleUsesLC4 !== false ||
    jumpSkill.sparseFeatureCount !== 96 ||
    jumpSkill.temporalWindows !== 4 ||
    jumpSkill.threshold !== 0.5 ||
    jumpSkill.persistenceWindows !== 2 ||
    jumpSkill.cooldownBrainSteps !== 38 ||
    interruptionApi.FRAME_SIZE !== 8 ||
    interruptionApi.HISTORY_FRAMES !== 8 ||
    interruptionApi.FEATURE_COUNT !== 64
  ) {
    throw new Error("v14A diagnostic frozen contract mismatch");
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
        "v14A policy module contains forbidden game-state token: " +
          token,
      );
    }
  }
}

async function main() {
  await verifyStaticContract();

  const receipt = JSON.parse(
    await readFile(
      new URL(
        "../history/run_receipts/v14a_authoritative_policy.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  if (
    receipt.sourceRun !== DIAG_SOURCE_RUN ||
    receipt.status !== "FAILED_POLICY_DIAGNOSTIC_ONLY" ||
    receipt.policy.weights.length !==
      interruptionApi.FEATURE_COUNT
  ) {
    throw new Error("v14A authoritative policy receipt mismatch");
  }
  const policy = {
    bias: receipt.policy.bias,
    weights: Float64Array.from(receipt.policy.weights),
  };

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

  const episodeRows = [];
  const proposalCounter = { next: 1 };
  const perSeed = [];

  for (const baseSeed of FINAL_SEEDS) {
    const rows = [];
    for (const episode of makeBlock(baseSeed, 0)) {
      const row = await runEpisode({
        connectome,
        dnSlot,
        episode,
        policy,
        proposalCounter,
      });
      rows.push(row);
      episodeRows.push(row);
    }
    const seedSummary = aggregate(rows);
    perSeed.push({ baseSeed, ...seedSummary });
    console.log(
      "[v14A-diag] seed=" +
        baseSeed +
        " proposals=" +
        seedSummary.attackProposals +
        " complete=" +
        (seedSummary.courseCompletionRate * 100).toFixed(1) +
        "% airAtk=" +
        (seedSummary.airborneAttackEpisodeRate * 100).toFixed(1) +
        "% precision=" +
        (seedSummary.attackHitPrecision * 100).toFixed(1) +
        "%",
    );
  }

  const summary = aggregate(episodeRows);
  summary.minSeedCompletionRate = Math.min(
    ...perSeed.map((row) => row.courseCompletionRate),
  );
  verifyReplay(summary, receipt.expectedFinal);

  const proposalRows = episodeRows.flatMap(
    (row) => row.proposalRows,
  );
  if (proposalRows.length !== receipt.expectedFinal.attackProposals) {
    throw new Error("proposal row count mismatch");
  }

  const confusion = gateConfusion(proposalRows);
  const bins = temporalBins(proposalRows);
  const airProbe = runProbe(proposalRows, "airborneAtProposal");
  const hitProbe = runProbe(proposalRows, "wouldHitNow");
  const gateHitMetrics = classificationMetrics(
    proposalRows,
    "wouldHitNow",
    (row) => row.gateAcceptProbability,
  );
  const classification = diagnosticClassification(
    hitProbe,
    airProbe,
    gateHitMetrics,
  );

  const diagnosticSummary = {
    schema: "maplefly.v14a.attack-interruption-diagnostic.1",
    chronology:
      "retrospective diagnostic executed after v14C; does not alter prior results",
    sourceRun: DIAG_SOURCE_RUN,
    sourceArtifact: receipt.sourceArtifact,
    sourceDigest: receipt.sourceDigest,
    replayExact: true,
    proposalCount: proposalRows.length,
    authoritativeReplay: summary,
    gateAgainstWouldHit: gateHitMetrics,
    airProbeBand: separabilityBand(airProbe),
    hitProbeBand: separabilityBand(hitProbe),
    classification,
  };

  const outDir = resolve(
    "results/v14a-attack-interruption-diagnostic",
  );
  await mkdir(outDir, { recursive: true });
  await Promise.all([
    writeFile(
      resolve(outDir, "proposal_rows.json"),
      JSON.stringify(proposalRows, null, 2) + "\n",
    ),
    writeFile(
      resolve(outDir, "summary.json"),
      JSON.stringify(diagnosticSummary, null, 2) + "\n",
    ),
    writeFile(
      resolve(outDir, "probe_air_state.json"),
      JSON.stringify(airProbe, null, 2) + "\n",
    ),
    writeFile(
      resolve(outDir, "probe_hit_state.json"),
      JSON.stringify(hitProbe, null, 2) + "\n",
    ),
    writeFile(
      resolve(outDir, "temporal_bins.json"),
      JSON.stringify(bins, null, 2) + "\n",
    ),
    writeFile(
      resolve(outDir, "gate_confusion.json"),
      JSON.stringify(confusion, null, 2) + "\n",
    ),
  ]);

  console.log(
    "V14A-ATTACK-DIAGNOSTIC=PASS replayExact=true proposals=" +
      proposalRows.length +
      " hitProbeAUROC=" +
      hitProbe.macroMeanAuroc.toFixed(3) +
      " hitProbeBalAcc=" +
      hitProbe.macroBalancedAccuracy.toFixed(3) +
      " airProbeAUROC=" +
      airProbe.macroMeanAuroc.toFixed(3) +
      " airProbeBalAcc=" +
      airProbe.macroBalancedAccuracy.toFixed(3) +
      " gateHitAUROC=" +
      (gateHitMetrics.auroc ?? 0).toFixed(3) +
      " classification=" +
      classification,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
