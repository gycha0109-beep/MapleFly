#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  SOURCE,
  ConnectomeBrain,
  cells,
  cellsWithPrefix,
  loadConnectome,
} from "../src/headless/connectome-runtime.mjs";
import "../src/brain/fly-skill-v7.js";
import "../src/brain/fly-skill-v10-attack.js";
import "../src/brain/fly-skill-v11h2-jump.js";
import "../src/brain/fly-interruption-v14b.js";
import "../src/brain/fly-skill-v15-potion.js";

const STEP_SECONDS = 0.02;
const SETTLE_STEPS = 26;
const BASELINE_STEPS = 26;
const MOVE_WINDOW_STEPS = 26;
const ATTACK_WINDOW_STEPS = 5;
const JUMP_WINDOW_STEPS = 5;
const MAX_STEPS = 400;
const ATTACK_COOLDOWN_STEPS = 21;
const DN_COUNT = 1316;
const POTION_FRAME_STEPS = 5;
const POTION_HISTORY_FRAMES = 48;
const IMPACT_DRIVE = 0.7;
const IMPACT_PULSE_STEPS = 6;
const TASTE_DRIVE = 0.8;
const IMPACT_STARTS = [25, 55, 85, 115, 145, 175];
const FUTURE_IMPACT_STARTS = [255, 275, 295, 315, 335, 355];
const MAX_HP = 100;
const CONTACT_DAMAGE = 10;
const POTION_HEAL = 30;
const POTION_COST = 15;

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
const PRACTICE_BASE_SEEDS = [2601000, 2611000, 2621000];
const FINAL_SEEDS = [3001000, 3011000, 3021000];
const PRACTICE_BLOCKS = 4;
const TRAINER_SEED = 914002;

const GAMMA = 0.97;
const LEARNING_RATE = 0.02;
const L2 = 0.0005;
const WEIGHT_CLAMP = 4;

const GATE = Object.freeze({
  courseCompletion: 0.70,
  minSeedCompletion: 0.60,
  obstacleClear: 0.85,
  leftObstacleClear: 0.80,
  rightObstacleClear: 0.80,
  targetKill: 0.70,
  timeoutMax: 0.30,
  meanJumpsMax: 1.85,
  postClearJumpEpisodeMax: 0.25,
  preClearAttackEpisodeMax: 0.30,
  attackHitPrecisionMin: 0.45,
  airborneAttackActionFractionMax: 0.22,
  perSeedAirborneAttackActionFractionMax: 0.30,
  potionDecisionCoverageMin: 1.0,
  potionDecisionsPerEpisode: 1.0,
  potionBalancedAccuracyMin: 0.70,
  potionWaitRecallMin: 0.60,
  potionDrinkRecallMin: 0.60,
  potionMeanGMin: 27.5,
  potionMeanRegretMax: 2.5,
});

const movementApi = globalThis.MapleFlySkillV7;
const movementSkill = movementApi.BUNDLED_STATE;
const attackApi = globalThis.MapleFlyAttackSkillV10;
const attackSkill = attackApi.BUNDLED_STATE;
const jumpApi = globalThis.MapleFlyJumpSkillV11H2;
const jumpSkill = jumpApi.BUNDLED_STATE;
const interruptionApi = globalThis.MapleFlyInterruptionV14B;
const potionApi = globalThis.MapleFlyPotionSkillV15;
const potionSkill = potionApi.loadState();

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

  encode({
    playerX,
    grounded,
    targetX,
    targetHp,
    obstacle,
    visualEnabled = true,
    impactActive = false,
    impactSide = null,
    tasteActive = false,
  }) {
    const drive = {
      SNta_L: grounded ? 0.05 : 0,
      SNta_R: grounded ? 0.05 : 0,
    };

    if (
      impactActive &&
      (impactSide === "L" || impactSide === "R")
    ) {
      drive["LgLG_" + impactSide] = IMPACT_DRIVE;
    }

    if (tasteActive) {
      drive.taste_L = TASTE_DRIVE;
      drive.taste_R = TASTE_DRIVE;
    }

    if (!visualEnabled) {
      this.reset();
      return drive;
    }

    if (targetHp > 0) {
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
          ((175 - distance) / 175) * 0.72 +
            approaching * 0.18,
          0,
          0.8,
        );
      }
    } else {
      this.lastTargetDistance = null;
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
    throw new Error("v14C matched geometry mismatch");
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
    for (const side of ["L", "R"]) {
      const sideIndex = side === "L" ? 0 : 1;
      const brainSeed =
        baseSeed + distanceIndex * 10 + sideIndex;
      for (let classIndex = 0; classIndex < 4; classIndex += 1) {
        rows.push({
          brainSeed,
          baseSeed,
          block,
          side,
          startDistance,
          classIndex,
        });
      }
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

function makeInjurySchedule(brainSeed, classIndex) {
  const random = mulberry32(brainSeed + 500000);
  const order = [...IMPACT_STARTS];
  for (let index = order.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [order[index], order[swap]] = [order[swap], order[index]];
  }

  const allPre = order
    .map((start) => ({
      start,
      side: random() < 0.5 ? "L" : "R",
      phase: "PRE",
    }))
    .sort((a, b) => a.start - b.start);

  const future = FUTURE_IMPACT_STARTS.map((start) => ({
    start,
    side: random() < 0.5 ? "L" : "R",
    phase: "FUTURE",
  }));

  return {
    pre: allPre.slice(0, classIndex).sort((a, b) => a.start - b.start),
    future,
  };
}

function allInjuryEvents(state) {
  return [...state.injurySchedule.pre, ...state.injurySchedule.future];
}

function updateInjury(state, liveStep) {
  const events = allInjuryEvents(state);
  const starting = events.find((event) => event.start === liveStep);
  if (starting) {
    state.hp = Math.max(0, state.hp - CONTACT_DAMAGE);
    state.damageTaken += CONTACT_DAMAGE;
    state.contacts += 1;
  }

  const active = events.find(
    (event) =>
      liveStep >= event.start &&
      liveStep < event.start + IMPACT_PULSE_STEPS,
  );
  state.impactActive = Boolean(active);
  state.impactSide = active?.side ?? null;
}

function potionOracle(classIndex) {
  const decisionHp = MAX_HP - CONTACT_DAMAGE * classIndex;
  const waitHp = Math.max(
    0,
    decisionHp - FUTURE_IMPACT_STARTS.length * CONTACT_DAMAGE,
  );
  const drinkHp = Math.max(
    0,
    Math.min(MAX_HP, decisionHp + POTION_HEAL) -
      FUTURE_IMPACT_STARTS.length * CONTACT_DAMAGE,
  );
  const gWait = waitHp;
  const gDrink = drinkHp - POTION_COST;
  return {
    gWait,
    gDrink,
    optimalAction: gDrink > gWait ? "DRINK" : "WAIT",
    oracleG: Math.max(gWait, gDrink),
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
  const injurySchedule = makeInjurySchedule(
    episode.brainSeed,
    episode.classIndex,
  );
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
    potionCounts: new Float64Array(DN_COUNT),
    potionSteps: 0,
    jumpRuntime: jumpApi.createRuntime(),
    potionRuntime: potionApi.createRuntime(),
    nextJumpStep: 0,
    nextAttackStep: 0,
    targetHp: TARGET_HP,
    hp: MAX_HP,
    damageTaken: 0,
    contacts: 0,
    injurySchedule,
    impactActive: false,
    impactSide: null,
    tasteActive: false,
    potionAction: "WAIT",
    potionQWait: 0,
    potionQDrink: 0,
    potionDecisionStep: null,
    potionDecisions: 0,
    potionUses: 0,
    totalHealed: 0,
    wastedHealing: 0,
    actualJumps: 0,
    preClearJumps: 0,
    postClearJumps: 0,
    postKillJumps: 0,
    actualAttacks: 0,
    postKillAttacks: 0,
    attackProposals: 0,
    acceptedAttackProposals: 0,
    interruptedAttackProposals: 0,
    jumpProposals: 0,
    acceptedJumpProposals: 0,
    interruptedJumpProposals: 0,
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
    attackTrajectory: [],
    jumpTrajectory: [],
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
  potionApi.setBaseline(
    state.potionRuntime,
    Float64Array.from(
      potionSkill.runtimeDnIndices,
      (dnIndex) => state.baselineRate[dnIndex],
    ),
  );
  return state;
}

function updateMovement(state, dnSlot) {
  collectDn(state.brain, dnSlot, state.moveCounts);
  state.moveSteps += 1;
  if (state.moveSteps < MOVE_WINDOW_STEPS) return;

  if (state.targetHp > 0) {
    const proposal = movementChoice(
      rate(state.moveCounts, state.moveSteps),
      state.baselineRate,
    );
    state.moveAction = proposal.action;
    state.moveScore = proposal.leftScore;
  } else {
    state.moveAction = "IDLE";
    state.moveScore = 0;
  }
  state.moveCounts.fill(0);
  state.moveSteps = 0;
}

function collectDecisionWindows(state, dnSlot) {
  collectDn(state.brain, dnSlot, state.attackCounts);
  collectDn(state.brain, dnSlot, state.jumpCounts);
  collectDn(state.brain, dnSlot, state.potionCounts);
  state.attackSteps += 1;
  state.jumpSteps += 1;
  state.potionSteps += 1;
}

function makeTransition(feature, choice) {
  return {
    feature: Array.from(feature),
    accept: choice.accept,
    probability: choice.probability,
    reward: 0,
  };
}

function addReward(trajectory, value) {
  if (!trajectory.length) return;
  trajectory[trajectory.length - 1].reward += value;
}

function executeAttack(state, brainStep) {
  state.actualAttacks += 1;
  state.nextAttackStep = brainStep + ATTACK_COOLDOWN_STEPS;

  if (state.targetHp === 0) {
    state.postKillAttacks += 1;
    return 0;
  }
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
  attackPolicy,
  jumpPolicy,
  random,
  deterministic,
}) {
  if (
    state.attackSteps !== ATTACK_WINDOW_STEPS ||
    state.jumpSteps !== JUMP_WINDOW_STEPS
  ) {
    throw new Error("v14C decision window alignment mismatch");
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

  let didJump = false;
  let didAttack = false;

  if (jump.action === "JUMP" && jumpAvailable) {
    state.jumpProposals += 1;
    const choice = interruptionApi.choose(
      jumpPolicy,
      temporalFeature,
      random,
      deterministic,
    );
    const transition = makeTransition(temporalFeature, choice);
    state.jumpTrajectory.push(transition);

    if (choice.accept) {
      state.acceptedJumpProposals += 1;
      transition.reward -= 0.35;
      if (obstacleCleared(state)) {
        state.postClearJumps += 1;
      } else {
        state.preClearJumps += 1;
      }
      state.vy = -JUMP_VELOCITY;
      state.grounded = false;
      state.nextJumpStep =
        brainStep + jumpSkill.cooldownBrainSteps;
      state.actualJumps += 1;
      if (state.targetHp === 0) state.postKillJumps += 1;
      jumpApi.onActuatedJump(state.jumpRuntime);
      didJump = true;
    } else {
      state.interruptedJumpProposals += 1;
    }
  }

  if (
    attack.action === "ATTACK" &&
    brainStep >= state.nextAttackStep
  ) {
    state.attackProposals += 1;
    const choice = interruptionApi.choose(
      attackPolicy,
      temporalFeature,
      random,
      deterministic,
    );
    const transition = makeTransition(temporalFeature, choice);
    state.attackTrajectory.push(transition);

    if (choice.accept) {
      state.acceptedAttackProposals += 1;
      transition.reward += executeAttack(state, brainStep);
      didAttack = true;
    } else {
      state.interruptedAttackProposals += 1;
    }
  }

  if (state.potionSteps !== POTION_FRAME_STEPS) {
    throw new Error("v16A POTION frame alignment mismatch");
  }

  const potionSpikes = Float64Array.from(
    potionSkill.runtimeDnIndices,
    (dnIndex) => state.potionCounts[dnIndex],
  );
  const potionFrame = potionApi.makeFrame(
    state.potionRuntime,
    potionSpikes,
    state.potionSteps,
  );
  const potionFrames = potionApi.pushFrame(
    state.potionRuntime,
    potionFrame,
  );
  state.potionCounts.fill(0);
  state.potionSteps = 0;

  if (potionFrames === potionSkill.historyFrames) {
    const potionDecision = potionApi.choose(
      state.potionRuntime,
      potionSkill,
    );
    state.potionAction = potionDecision.action;
    state.potionQWait = potionDecision.qWait;
    state.potionQDrink = potionDecision.qDrink;
    state.potionDecisionStep = brainStep;
    state.potionDecisions += 1;

    if (potionDecision.action === "DRINK") {
      const missingHp = MAX_HP - state.hp;
      const healed = Math.min(POTION_HEAL, missingHp);
      state.hp += healed;
      state.potionUses += 1;
      state.totalHealed += healed;
      state.wastedHealing += POTION_HEAL - healed;
    }

    potionApi.finishCycle(state.potionRuntime);
  }

  state.tasteActive = potionApi.tasteForNextFrame(
    state.potionRuntime,
  );

  state.previousDidJump = didJump;
  state.previousDidAttack = didAttack;
}

function updatePolicies(attackPolicy, jumpPolicy, state) {
  const options = {
    gamma: GAMMA,
    learningRate: LEARNING_RATE,
    l2: L2,
    weightClamp: WEIGHT_CLAMP,
  };
  interruptionApi.updatePolicy(
    attackPolicy,
    state.attackTrajectory,
    options,
  );
  interruptionApi.updatePolicy(
    jumpPolicy,
    state.jumpTrajectory,
    options,
  );
}

async function runEpisode({
  connectome,
  dnSlot,
  episode,
  attackPolicy,
  jumpPolicy,
  random,
  deterministic,
}) {
  const state = await initializeEpisode(connectome, dnSlot, episode);

  for (let liveStep = 1; liveStep <= MAX_STEPS; liveStep += 1) {
    updateInjury(state, liveStep);

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
        attackPolicy,
        jumpPolicy,
        random,
        deterministic,
      });
    }

    applyPhysics(state);

    if (state.firstClearStep === null && obstacleCleared(state)) {
      state.firstClearStep = liveStep;
    }
  }

  return summarizeEpisode(
    state,
    episode,
    MAX_STEPS,
    !(state.firstClearStep !== null && state.targetHp === 0),
  );
}

function summarizeEpisode(state, episode, liveSteps, timeout) {
  const clear = state.firstClearStep !== null;
  const kill = state.targetHp === 0;
  const oracle = potionOracle(episode.classIndex);
  const terminalG = state.hp - POTION_COST * state.potionUses;
  const decisionCorrect =
    state.potionDecisions === 1 &&
    state.potionAction === oracle.optimalAction;

  return {
    seed: episode.brainSeed,
    baseSeed: episode.baseSeed,
    block: episode.block,
    side: episode.side,
    startDistance: episode.startDistance,
    classIndex: episode.classIndex,
    clear,
    actualJumps: state.actualJumps,
    preClearJumps: state.preClearJumps,
    postClearJumps: state.postClearJumps,
    postKillJumps: state.postKillJumps,
    actualAttacks: state.actualAttacks,
    postKillAttacks: state.postKillAttacks,
    attackProposals: state.attackProposals,
    acceptedAttackProposals: state.acceptedAttackProposals,
    interruptedAttackProposals: state.interruptedAttackProposals,
    jumpProposals: state.jumpProposals,
    acceptedJumpProposals: state.acceptedJumpProposals,
    interruptedJumpProposals: state.interruptedJumpProposals,
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
    finalHp: state.hp,
    damageTaken: state.damageTaken,
    contacts: state.contacts,
    potionDecisions: state.potionDecisions,
    potionDecisionStep: state.potionDecisionStep,
    potionAction: state.potionAction,
    potionQWait: state.potionQWait,
    potionQDrink: state.potionQDrink,
    potionUses: state.potionUses,
    totalHealed: state.totalHealed,
    wastedHealing: state.wastedHealing,
    optimalPotionAction: oracle.optimalAction,
    potionDecisionCorrect: decisionCorrect,
    gWait: oracle.gWait,
    gDrink: oracle.gDrink,
    oracleG: oracle.oracleG,
    terminalG,
    regret: oracle.oracleG - terminalG,
    preImpactEvents: state.injurySchedule.pre,
    futureImpactEvents: state.injurySchedule.future,
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
  const waitRows = rows.filter(
    (row) => row.optimalPotionAction === "WAIT",
  );
  const drinkRows = rows.filter(
    (row) => row.optimalPotionAction === "DRINK",
  );
  const waitRecall = mean(
    waitRows.map((row) =>
      Number(
        row.potionDecisions === 1 &&
          row.potionAction === "WAIT",
      ),
    ),
  );
  const drinkRecall = mean(
    drinkRows.map((row) =>
      Number(
        row.potionDecisions === 1 &&
          row.potionAction === "DRINK",
      ),
    ),
  );

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
    postClearJumpEpisodeRate: mean(
      rows.map((row) => Number(row.postClearJumps > 0)),
    ),
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
    jumpProposals: rows.reduce(
      (sum, row) => sum + row.jumpProposals,
      0,
    ),
    acceptedJumpProposals: rows.reduce(
      (sum, row) => sum + row.acceptedJumpProposals,
      0,
    ),
    interruptedJumpProposals: rows.reduce(
      (sum, row) => sum + row.interruptedJumpProposals,
      0,
    ),
    preClearAttackEpisodeRate: mean(
      rows.map((row) => Number(row.preClearAttacks > 0)),
    ),
    airborneAttackEpisodeRate: mean(
      rows.map((row) => Number(row.airborneAttacks > 0)),
    ),
    airborneAttackActions: rows.reduce(
      (sum, row) => sum + row.airborneAttacks,
      0,
    ),
    airborneAttackActionFraction:
      totalAttacks > 0
        ? rows.reduce(
            (sum, row) => sum + row.airborneAttacks,
            0,
          ) / totalAttacks
        : 0,
    actualAttacks: totalAttacks,
    hits: totalHits,
    whiffs: rows.reduce((sum, row) => sum + row.whiffs, 0),
    attackHitPrecision:
      totalAttacks > 0 ? totalHits / totalAttacks : 0,
    postKillAttacks: rows.reduce(
      (sum, row) => sum + row.postKillAttacks,
      0,
    ),
    postKillJumps: rows.reduce(
      (sum, row) => sum + row.postKillJumps,
      0,
    ),
    potionDecisionCoverage: mean(
      rows.map((row) => Number(row.potionDecisions === 1)),
    ),
    meanPotionDecisions: mean(
      rows.map((row) => row.potionDecisions),
    ),
    potionWaitRecall: waitRecall,
    potionDrinkRecall: drinkRecall,
    potionBalancedAccuracy: (waitRecall + drinkRecall) / 2,
    potionMeanG: mean(rows.map((row) => row.terminalG)),
    potionMeanRegret: mean(rows.map((row) => row.regret)),
    meanPotionUses: mean(rows.map((row) => row.potionUses)),
    meanWastedHealing: mean(
      rows.map((row) => row.wastedHealing),
    ),
  };
}

async function verifyStaticContract() {
  const controller = await readFile(
    new URL("../src/brain/fly-controller.js", import.meta.url),
    "utf8",
  );
  const interruptionSource = await readFile(
    new URL("../src/brain/fly-interruption-v14b.js", import.meta.url),
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
    interruptionApi.HISTORY_FRAMES !== 12 ||
    interruptionApi.FEATURE_COUNT !== 96 ||
    interruptionApi.makeFrame.length !== 6
  ) {
    throw new Error("v14B interruption interface mismatch");
  }

  if (
    potionSkill.status !== "V15D_DEPLOYED" ||
    potionSkill.deploymentAllowed !== true ||
    potionSkill.representationSha256 !==
      "33fc31f636e1cde215841dd33b0a93b24d4571cdabd32e9a1edc8fa2e696c847" ||
    potionSkill.policySha256 !==
      "47088bcb15ed2cd96f64d67a20169934bd7a866dcd56bacffea70b1f42537a59" ||
    potionSkill.historyFrames !== POTION_HISTORY_FRAMES ||
    potionSkill.frameSteps !== POTION_FRAME_STEPS ||
    potionSkill.runtimeDnIndices.length !== 24 ||
    potionSkill.featureCount !== 256
  ) {
    throw new Error("v15D frozen POTION contract mismatch");
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
        "v14B pure interruption module contains forbidden game-state token: " +
          token,
      );
    }
  }
}

async function main() {
  await verifyStaticContract();

  const candidate = JSON.parse(
    await readFile(
      new URL(
        "../src/brain/fly-interruption-v14b-candidate.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );

  if (
    candidate.status !== "V14C_DEPLOYED" ||
    candidate.source.runId !== 35798458282 ||
    candidate.validation?.runId !== 35799237521 ||
    candidate.historyFrames !== 12 ||
    candidate.featureCount !== 96 ||
    candidate.policies.attack.weights.length !== 96 ||
    candidate.policies.jump.weights.length !== 96
  ) {
    throw new Error("v14C frozen candidate provenance mismatch");
  }

  const attackPolicy = {
    bias: candidate.policies.attack.bias,
    weights: Float64Array.from(
      candidate.policies.attack.weights,
    ),
  };
  const jumpPolicy = {
    bias: candidate.policies.jump.bias,
    weights: Float64Array.from(
      candidate.policies.jump.weights,
    ),
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

  for (const side of ["L", "R"]) {
    const impact = cellsWithPrefix(connectome.meta, "LgLG", side);
    const expected = side === "L" ? 331 : 338;
    if (impact.length !== expected) {
      throw new Error(
        "corrected LgLG_" + side + " count mismatch " + impact.length,
      );
    }
    connectome.inputGroups.set("LgLG_" + side, impact);

    const taste = cells(
      connectome.meta,
      ["LB3", "claw_tpGRN"],
      side,
    );
    if (!taste.length) {
      throw new Error("taste_" + side + " missing");
    }
    connectome.inputGroups.set("taste_" + side, taste);
  }

  const random = mulberry32(3009000);
  const perSeed = [];
  const finalRows = [];

  for (const baseSeed of FINAL_SEEDS) {
    const rows = [];
    for (const episode of makeBlock(baseSeed, 0)) {
      const row = await runEpisode({
        connectome,
        dnSlot,
        episode,
        attackPolicy,
        jumpPolicy,
        random,
        deterministic: true,
      });
      rows.push(row);
      finalRows.push(row);
    }

    const seedSummary = aggregate(rows);
    perSeed.push({ baseSeed, ...seedSummary, rows });

    console.log(
      "[v16A] seed=" +
        baseSeed +
        " complete=" +
        (seedSummary.courseCompletionRate * 100).toFixed(1) +
        "% clear=" +
        (seedSummary.obstacleClearRate * 100).toFixed(1) +
        "% kill=" +
        (seedSummary.targetKillRate * 100).toFixed(1) +
        "% potionBA=" +
        (seedSummary.potionBalancedAccuracy * 100).toFixed(1) +
        "% G=" +
        seedSummary.potionMeanG.toFixed(3) +
        " regret=" +
        seedSummary.potionMeanRegret.toFixed(3),
    );
  }

  const summary = aggregate(finalRows);
  summary.minSeedCompletionRate = Math.min(
    ...perSeed.map((row) => row.courseCompletionRate),
  );
  summary.maxSeedAirborneAttackActionFraction = Math.max(
    ...perSeed.map(
      (row) => row.airborneAttackActionFraction,
    ),
  );

  const perClass = Object.fromEntries(
    [0, 1, 2, 3].map((classIndex) => {
      const rows = finalRows.filter(
        (row) => row.classIndex === classIndex,
      );
      return [classIndex, aggregate(rows)];
    }),
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
    meanJumps:
      summary.meanActualJumps <= GATE.meanJumpsMax,
    postClearJump:
      summary.postClearJumpEpisodeRate <=
      GATE.postClearJumpEpisodeMax,
    preClearAttack:
      summary.preClearAttackEpisodeRate <=
      GATE.preClearAttackEpisodeMax,
    attackHitPrecision:
      summary.attackHitPrecision >=
      GATE.attackHitPrecisionMin,
    airborneAttackActionFraction:
      summary.airborneAttackActionFraction <=
      GATE.airborneAttackActionFractionMax,
    perSeedAirborneAttackActionFraction:
      summary.maxSeedAirborneAttackActionFraction <=
      GATE.perSeedAirborneAttackActionFractionMax,
    potionDecisionCoverage:
      summary.potionDecisionCoverage >=
      GATE.potionDecisionCoverageMin,
    potionDecisionCount:
      Math.abs(
        summary.meanPotionDecisions -
          GATE.potionDecisionsPerEpisode,
      ) <= 1e-12,
    potionBalancedAccuracy:
      summary.potionBalancedAccuracy >=
      GATE.potionBalancedAccuracyMin,
    potionWaitRecall:
      summary.potionWaitRecall >=
      GATE.potionWaitRecallMin,
    potionDrinkRecall:
      summary.potionDrinkRecall >=
      GATE.potionDrinkRecallMin,
    potionMeanG:
      summary.potionMeanG >= GATE.potionMeanGMin,
    potionMeanRegret:
      summary.potionMeanRegret <= GATE.potionMeanRegretMax,
  };
  const pass = Object.values(gateChecks).every(Boolean);
  const outcome = pass
    ? "V16A_FROZEN_FIVE_SKILL_INTEGRATION_PASS"
    : "V16A_FROZEN_FIVE_SKILL_INTEGRATION_FAIL";

  console.log(
    "[v16A] FULL complete=" +
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
      " precision=" +
      (summary.attackHitPrecision * 100).toFixed(1) +
      "% airAction=" +
      (summary.airborneAttackActionFraction * 100).toFixed(1) +
      "%",
  );
  console.log(
    "[v16A] POTION coverage=" +
      (summary.potionDecisionCoverage * 100).toFixed(1) +
      "% decisions=" +
      summary.meanPotionDecisions.toFixed(3) +
      " BA=" +
      (summary.potionBalancedAccuracy * 100).toFixed(1) +
      "% recallWAIT=" +
      (summary.potionWaitRecall * 100).toFixed(1) +
      "% recallDRINK=" +
      (summary.potionDrinkRecall * 100).toFixed(1) +
      "% G=" +
      summary.potionMeanG.toFixed(3) +
      " regret=" +
      summary.potionMeanRegret.toFixed(3),
  );
  console.log(
    "[v16A] outcome=" +
      outcome +
      " next=" +
      (pass ? "V16B_PREREGISTRATION_AUTHORIZED" : "DIAGNOSTIC_REQUIRED"),
  );

  const output = {
    schema: "maplefly.v16a.five-skill-integration.1",
    brainRepository: SOURCE.repository,
    brainCommit: SOURCE.commit,
    preregistration: {
      path: "history/prereg_v16a.md",
      commit: "622e9c6e790c0506a5672544ff2576cd0814ff72",
    },
    frozenSkills: {
      move: movementSkill.version,
      attack: attackSkill.version,
      jump: jumpSkill.deploymentStatus,
      interruption: {
        status: candidate.status,
        sourceRun: candidate.source.runId,
        validationRun: candidate.validation.runId,
      },
      potion: {
        status: potionSkill.status,
        representationSha256: potionSkill.representationSha256,
        policySha256: potionSkill.policySha256,
      },
    },
    cohort: {
      baseSeeds: FINAL_SEEDS,
      distances: DISTANCES,
      sides: ["L", "R"],
      injuryClasses: [0, 1, 2, 3],
      episodes: finalRows.length,
      pairedBrainSeedRule:
        "baseSeed + distanceIndex*10 + sideIndex; same across injury classes",
    },
    environment: {
      liveSteps: MAX_STEPS,
      horizonSeconds: MAX_STEPS * STEP_SECONDS,
      maxHp: MAX_HP,
      contactDamage: CONTACT_DAMAGE,
      potionHeal: POTION_HEAL,
      potionCost: POTION_COST,
      preImpactStarts: IMPACT_STARTS,
      futureImpactStarts: FUTURE_IMPACT_STARTS,
      impactDrive: IMPACT_DRIVE,
      impactPulseSteps: IMPACT_PULSE_STEPS,
      tasteDrive: TASTE_DRIVE,
      targetRespawn: false,
    },
    gate: GATE,
    gateChecks,
    summary,
    perClass,
    perSeed,
    outcome,
    pass,
    next: pass
      ? "V16B_PREREGISTRATION_AUTHORIZED"
      : "V16A_DIAGNOSTIC_REQUIRED",
  };

  const outDir = resolve(
    "results/v16a-five-skill-integration",
  );
  await mkdir(outDir, { recursive: true });
  await writeFile(
    resolve(outDir, "v16a_integration.json"),
    JSON.stringify(output, null, 2) + "\n",
  );

  if (!pass) process.exitCode = 1;
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
