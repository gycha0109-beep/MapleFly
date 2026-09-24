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
const MAX_STEPS = 2400;
const ATTACK_COOLDOWN_STEPS = 21;
const DN_COUNT = 1316;
const POTION_FRAME_STEPS = 5;
const POTION_HISTORY_FRAMES = 48;
const IMPACT_DRIVE = 0.7;
const IMPACT_PULSE_STEPS = 6;
const TASTE_DRIVE = 0.8;
const RESPAWN_GAP_STEPS = 35;
const TIME_BIN_STEPS = 400;
const TIME_BIN_COUNT = 6;
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
const FINAL_SEEDS = [3101000, 3111000, 3121000];
const PRACTICE_BLOCKS = 4;
const TRAINER_SEED = 914002;

const GAMMA = 0.97;
const LEARNING_RATE = 0.02;
const L2 = 0.0005;
const WEIGHT_CLAMP = 4;

const GATE = Object.freeze({
  survivalRateMin: 0.75,
  minSeedSurvivalMin: 0.625,
  threeKillEpisodeRateMin: 0.75,
  encounterObstacleClearMin: 0.85,
  encounterTargetKillMin: 0.70,
  leftEncounterTargetKillMin: 0.65,
  rightEncounterTargetKillMin: 0.65,
  attackHitPrecisionMin: 0.45,
  airborneAttackActionFractionMax: 0.22,
  postClearJumpEncounterMax: 0.25,
  preClearAttackEncounterMax: 0.30,
  survivorPotionDecisions: 10,
  offDeathRateStressMin: 0.25,
  survivalBenefitMin: 0.15,
  meanKillBenefitMin: 0.5,
  meanValueImprovementMin: 5,
  wastedHealingPerDrinkMax: 10,
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
    targetActive,
    obstacle,
    obstacleActive,
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

    if (targetActive && targetHp > 0) {
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

    if (obstacleActive) {
      const playerFront =
        obstacle.side === "R" ? playerX + PLAYER_WIDTH : playerX;
      const obstacleFront =
        obstacle.side === "R"
          ? obstacle.x
          : obstacle.x + obstacle.width;
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
    }

    return drive;
  }
}

function geometryFromPlayer(playerX, side, startDistance) {
  const playerCenter = playerX + PLAYER_WIDTH / 2;
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

  return {
    playerCenter,
    side,
    startDistance,
    obstacle,
    targetX,
  };
}

function geometryFits(geometry) {
  return (
    geometry.obstacle.x >= 0 &&
    geometry.obstacle.x + geometry.obstacle.width <= WORLD_WIDTH &&
    geometry.targetX - TARGET_WIDTH / 2 >= 0 &&
    geometry.targetX + TARGET_WIDTH / 2 <= WORLD_WIDTH
  );
}

function makeInitialGeometry(side, startDistance) {
  const playerX = WORLD_WIDTH / 2 - PLAYER_WIDTH / 2;
  const geometry = geometryFromPlayer(playerX, side, startDistance);
  if (!geometryFits(geometry)) {
    throw new Error("initial v16B geometry does not fit world");
  }
  return {
    playerX,
    playerY: GROUND_Y - PLAYER_HEIGHT,
    ...geometry,
  };
}

function makeContinuousGeometry(playerX, sampledSide, sampledDistance) {
  const startIndex = DISTANCES.indexOf(sampledDistance);
  if (startIndex < 0) {
    throw new Error("unknown sampled distance " + sampledDistance);
  }

  for (let index = startIndex; index >= 0; index -= 1) {
    const distance = DISTANCES[index];
    for (const side of [
      sampledSide,
      sampledSide === "L" ? "R" : "L",
    ]) {
      const geometry = geometryFromPlayer(playerX, side, distance);
      if (geometryFits(geometry)) {
        return {
          ...geometry,
          sampledSide,
          sampledDistance,
          fitAdjusted:
            side !== sampledSide || distance !== sampledDistance,
        };
      }
    }
  }

  throw new Error("v16B impossible geometry after frozen fit rule");
}

function makeBlock(baseSeed) {
  const rows = [];
  DISTANCES.forEach((startDistance, distanceIndex) => {
    for (const side of ["L", "R"]) {
      const sideIndex = side === "L" ? 0 : 1;
      rows.push({
        brainSeed: baseSeed + distanceIndex * 10 + sideIndex,
        baseSeed,
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

function obstacleCleared(state) {
  if (!state.obstacleActive) return false;
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
  if (state.obstacleActive) {
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
  }

  state.playerX = resolvedX;
  state.playerY = nextY;
}

function rectanglesOverlap(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function playerBodyHitbox(state) {
  return {
    x: state.playerX + 3,
    y: state.playerY + 3,
    width: PLAYER_WIDTH - 6,
    height: PLAYER_HEIGHT - 3,
  };
}

function targetHitbox(state) {
  return {
    x: state.targetX - TARGET_WIDTH / 2,
    y: GROUND_Y - TARGET_HEIGHT,
    width: TARGET_WIDTH,
    height: TARGET_HEIGHT,
  };
}

function attackWouldHit(state) {
  if (!state.targetActive || state.targetHp <= 0) return false;

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

  return rectanglesOverlap(attackBox, targetHitbox(state));
}

function makeTimeBins() {
  return Array.from({ length: TIME_BIN_COUNT }, (_, index) => ({
    index,
    startStep: index * TIME_BIN_STEPS + 1,
    endStep: (index + 1) * TIME_BIN_STEPS,
    kills: 0,
    clears: 0,
    attacks: 0,
    hits: 0,
    airborneAttacks: 0,
    jumps: 0,
    contacts: 0,
    damage: 0,
    potionWait: 0,
    potionDrink: 0,
    qWait: [],
    qDrink: [],
    acceptedAttack: 0,
    interruptedAttack: 0,
    acceptedJump: 0,
    interruptedJump: 0,
    dnFired: 0,
    hpEnd: null,
  }));
}

function binForStep(state, step) {
  const index = Math.min(
    TIME_BIN_COUNT - 1,
    Math.floor((step - 1) / TIME_BIN_STEPS),
  );
  return state.timeBins[index];
}

function makeEncounter(index, geometry, spawnStep) {
  return {
    index,
    spawnStep,
    side: geometry.side,
    distance: geometry.startDistance,
    sampledSide: geometry.sampledSide ?? geometry.side,
    sampledDistance:
      geometry.sampledDistance ?? geometry.startDistance,
    fitAdjusted: Boolean(geometry.fitAdjusted),
    clearStep: null,
    killStep: null,
    endStep: null,
    killed: false,
    jumps: 0,
    postClearJumps: 0,
    attacks: 0,
    preClearAttacks: 0,
    hits: 0,
    whiffs: 0,
    airborneAttacks: 0,
    contacts: 0,
    damage: 0,
  };
}

function finalizeEncounter(state, step, killed) {
  if (!state.currentEncounter) return;
  state.currentEncounter.endStep = step;
  state.currentEncounter.killed = Boolean(killed);
  state.encounters.push({ ...state.currentEncounter });
  state.currentEncounter = null;
}

function spawnNextEncounter(state, step) {
  const sampledSide = state.ecologyRandom() < 0.5 ? "L" : "R";
  const sampledDistance =
    DISTANCES[
      Math.floor(state.ecologyRandom() * DISTANCES.length)
    ];
  const geometry = makeContinuousGeometry(
    state.playerX,
    sampledSide,
    sampledDistance,
  );

  state.obstacle = geometry.obstacle;
  state.targetX = geometry.targetX;
  state.targetHp = TARGET_HP;
  state.targetActive = true;
  state.obstacleActive = true;
  state.touchingTarget = false;
  state.currentEncounter = makeEncounter(
    state.nextEncounterIndex,
    geometry,
    step,
  );
  state.nextEncounterIndex += 1;
  state.respawnAtStep = null;
  state.encoder.reset();
}

function updateContactAfterPhysics(state, step) {
  if (!state.targetActive || state.targetHp <= 0) {
    state.touchingTarget = false;
    return;
  }

  const touching = rectanglesOverlap(
    playerBodyHitbox(state),
    targetHitbox(state),
  );

  if (touching && !state.touchingTarget) {
    const playerCenterX = state.playerX + PLAYER_WIDTH / 2;
    const impactSide = state.targetX < playerCenterX ? "L" : "R";
    state.hp = Math.max(0, state.hp - CONTACT_DAMAGE);
    state.damageTaken += CONTACT_DAMAGE;
    state.contacts += 1;
    state.impactSide = impactSide;
    state.impactPulseRemaining = IMPACT_PULSE_STEPS;
    state.damageEvents.push({
      step,
      amount: CONTACT_DAMAGE,
      side: impactSide,
      hpAfter: state.hp,
      encounterIndex: state.currentEncounter?.index ?? null,
    });

    const bin = binForStep(state, step);
    bin.contacts += 1;
    bin.damage += CONTACT_DAMAGE;

    if (state.currentEncounter) {
      state.currentEncounter.contacts += 1;
      state.currentEncounter.damage += CONTACT_DAMAGE;
    }

    if (state.hp === 0 && state.deathStep === null) {
      state.deathStep = step;
    }
  }

  state.touchingTarget = touching;
}

async function initializeEpisode(connectome, dnSlot, episode) {
  const geometry = makeInitialGeometry(
    episode.side,
    episode.startDistance,
  );
  const brain = new ConnectomeBrain(
    connectome.weights,
    connectome.meta.params,
    episode.brainSeed,
  );
  const encoder = new BrowserVisualEncoder();
  const state = {
    brain,
    encoder,
    playerX: geometry.playerX,
    playerY: geometry.playerY,
    obstacle: geometry.obstacle,
    targetX: geometry.targetX,
    targetHp: TARGET_HP,
    targetActive: true,
    obstacleActive: true,
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
    hp: MAX_HP,
    damageTaken: 0,
    contacts: 0,
    impactActive: false,
    impactSide: null,
    impactPulseRemaining: 0,
    tasteActive: false,
    touchingTarget: false,
    deathStep: null,
    potionAction: "WAIT",
    potionQWait: 0,
    potionQDrink: 0,
    potionDecisionStep: null,
    potionDecisions: 0,
    potionUses: 0,
    totalHealed: 0,
    wastedHealing: 0,
    potionEvents: [],
    actualJumps: 0,
    actualAttacks: 0,
    attackProposals: 0,
    acceptedAttackProposals: 0,
    interruptedAttackProposals: 0,
    jumpProposals: 0,
    acceptedJumpProposals: 0,
    interruptedJumpProposals: 0,
    airborneAttacks: 0,
    hits: 0,
    whiffs: 0,
    gapAttacks: 0,
    gapJumps: 0,
    history: interruptionApi.createHistory(),
    previousDidJump: false,
    previousDidAttack: false,
    attackTrajectory: [],
    jumpTrajectory: [],
    ecologyRandom: mulberry32(episode.brainSeed + 700000),
    encounters: [],
    currentEncounter: makeEncounter(
      0,
      {
        side: episode.side,
        startDistance: episode.startDistance,
      },
      1,
    ),
    nextEncounterIndex: 1,
    respawnAtStep: null,
    damageEvents: [],
    killEvents: [],
    timeBins: makeTimeBins(),
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

  if (state.targetActive && state.targetHp > 0) {
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

  if (!state.targetActive || state.targetHp <= 0) {
    state.gapAttacks += 1;
    return 0;
  }

  const encounter = state.currentEncounter;
  encounter.attacks += 1;
  const bin = binForStep(state, brainStep);
  bin.attacks += 1;

  if (encounter.clearStep === null) {
    encounter.preClearAttacks += 1;
  }
  if (!state.grounded) {
    state.airborneAttacks += 1;
    encounter.airborneAttacks += 1;
    bin.airborneAttacks += 1;
  }

  if (attackWouldHit(state)) {
    state.hits += 1;
    encounter.hits += 1;
    bin.hits += 1;
    state.targetHp = Math.max(0, state.targetHp - ATTACK_DAMAGE);

    if (state.targetHp === 0) {
      encounter.killStep = brainStep;
      state.killEvents.push({
        step: brainStep,
        encounterIndex: encounter.index,
      });
      bin.kills += 1;
      finalizeEncounter(state, brainStep, true);
      state.targetActive = false;
      state.obstacleActive = false;
      state.touchingTarget = false;
      state.respawnAtStep = brainStep + RESPAWN_GAP_STEPS;
      return 3.5;
    }
    return 1.5;
  }

  state.whiffs += 1;
  encounter.whiffs += 1;
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
    throw new Error("v16B v14C decision window alignment mismatch");
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
  const bin = binForStep(state, brainStep);

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
      bin.acceptedJump += 1;
      transition.reward -= 0.35;
      state.vy = -JUMP_VELOCITY;
      state.grounded = false;
      state.nextJumpStep =
        brainStep + jumpSkill.cooldownBrainSteps;
      state.actualJumps += 1;
      bin.jumps += 1;

      if (state.currentEncounter) {
        state.currentEncounter.jumps += 1;
        if (state.currentEncounter.clearStep !== null) {
          state.currentEncounter.postClearJumps += 1;
        }
      } else {
        state.gapJumps += 1;
      }

      jumpApi.onActuatedJump(state.jumpRuntime);
      didJump = true;
    } else {
      state.interruptedJumpProposals += 1;
      bin.interruptedJump += 1;
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
      bin.acceptedAttack += 1;
      transition.reward += executeAttack(state, brainStep);
      didAttack = true;
    } else {
      state.interruptedAttackProposals += 1;
      bin.interruptedAttack += 1;
    }
  }

  if (state.potionSteps !== POTION_FRAME_STEPS) {
    throw new Error("v16B POTION frame alignment mismatch");
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
    const hpBefore = state.hp;
    let healed = 0;
    let wasted = 0;

    state.potionAction = potionDecision.action;
    state.potionQWait = potionDecision.qWait;
    state.potionQDrink = potionDecision.qDrink;
    state.potionDecisionStep = brainStep;
    state.potionDecisions += 1;

    if (potionDecision.action === "DRINK") {
      const missingHp = MAX_HP - state.hp;
      healed = Math.min(POTION_HEAL, missingHp);
      wasted = POTION_HEAL - healed;
      state.hp += healed;
      state.potionUses += 1;
      state.totalHealed += healed;
      state.wastedHealing += wasted;
      bin.potionDrink += 1;
    } else {
      bin.potionWait += 1;
    }

    bin.qWait.push(potionDecision.qWait);
    bin.qDrink.push(potionDecision.qDrink);
    state.potionEvents.push({
      step: brainStep,
      action: potionDecision.action,
      qWait: potionDecision.qWait,
      qDrink: potionDecision.qDrink,
      hpBefore,
      hpAfter: state.hp,
      healed,
      wastedHealing: wasted,
    });

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
  let liveSteps = 0;

  for (let liveStep = 1; liveStep <= MAX_STEPS; liveStep += 1) {
    liveSteps = liveStep;

    if (
      !state.targetActive &&
      state.respawnAtStep === liveStep &&
      state.hp > 0
    ) {
      spawnNextEncounter(state, liveStep);
    }

    state.impactActive = state.impactPulseRemaining > 0;

    stimulate(
      state.brain,
      connectome.inputGroups,
      state.encoder.encode({ ...state, visualEnabled: true }),
    );
    state.brain.step();
    binForStep(state, liveStep).dnFired += state.brain.firedCount;

    if (state.impactPulseRemaining > 0) {
      state.impactPulseRemaining -= 1;
      if (state.impactPulseRemaining === 0) {
        state.impactSide = null;
      }
    }

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

    if (
      state.currentEncounter &&
      state.currentEncounter.clearStep === null &&
      obstacleCleared(state)
    ) {
      state.currentEncounter.clearStep = liveStep;
      binForStep(state, liveStep).clears += 1;
    }

    updateContactAfterPhysics(state, liveStep);

    if (liveStep % TIME_BIN_STEPS === 0) {
      binForStep(state, liveStep).hpEnd = state.hp;
    }

    if (state.hp === 0) break;
  }

  if (state.currentEncounter) {
    finalizeEncounter(state, liveSteps, false);
  }

  return summarizeEpisode(state, episode, liveSteps);
}

function summarizeEpisode(state, episode, liveSteps) {
  const survived = state.hp > 0 && liveSteps === MAX_STEPS;
  const offDeathEvent = state.damageEvents[9] ?? null;
  const offDeathStep = offDeathEvent?.step ?? null;
  const offSurvived = offDeathStep === null;
  const offKills = state.killEvents.filter(
    (event) =>
      offDeathStep === null || event.step < offDeathStep,
  ).length;
  const offTerminalHp = Math.max(
    0,
    MAX_HP - CONTACT_DAMAGE * state.damageEvents.length,
  );
  const fullCostAdjustedValue =
    state.hp - POTION_COST * state.potionUses;

  for (const bin of state.timeBins) {
    if (bin.hpEnd === null && bin.startStep <= liveSteps) {
      bin.hpEnd = state.hp;
    }
    bin.attackPrecision =
      bin.attacks > 0 ? bin.hits / bin.attacks : 0;
    bin.meanQWait = mean(bin.qWait);
    bin.meanQDrink = mean(bin.qDrink);
    delete bin.qWait;
    delete bin.qDrink;
  }

  return {
    seed: episode.brainSeed,
    baseSeed: episode.baseSeed,
    initialSide: episode.side,
    initialDistance: episode.startDistance,
    survived,
    deathStep: state.deathStep,
    liveSteps,
    finalHp: state.hp,
    contacts: state.contacts,
    damageTaken: state.damageTaken,
    kills: state.killEvents.length,
    actualJumps: state.actualJumps,
    actualAttacks: state.actualAttacks,
    airborneAttacks: state.airborneAttacks,
    hits: state.hits,
    whiffs: state.whiffs,
    gapAttacks: state.gapAttacks,
    gapJumps: state.gapJumps,
    attackProposals: state.attackProposals,
    acceptedAttackProposals: state.acceptedAttackProposals,
    interruptedAttackProposals: state.interruptedAttackProposals,
    jumpProposals: state.jumpProposals,
    acceptedJumpProposals: state.acceptedJumpProposals,
    interruptedJumpProposals: state.interruptedJumpProposals,
    potionDecisions: state.potionDecisions,
    potionUses: state.potionUses,
    totalHealed: state.totalHealed,
    wastedHealing: state.wastedHealing,
    wastedHealingPerDrink:
      state.potionUses > 0
        ? state.wastedHealing / state.potionUses
        : 0,
    potionEvents: state.potionEvents,
    encounters: state.encounters,
    damageEvents: state.damageEvents,
    killEvents: state.killEvents,
    timeBins: state.timeBins,
    offSurvived,
    offDeathStep,
    offKills,
    offTerminalHp,
    fullCostAdjustedValue,
    valueImprovement:
      fullCostAdjustedValue - offTerminalHp,
  };
}

function aggregate(rows) {
  const encounters = rows.flatMap((row) => row.encounters);
  const leftEncounters = encounters.filter(
    (row) => row.side === "L",
  );
  const rightEncounters = encounters.filter(
    (row) => row.side === "R",
  );
  const encounterAttacks = encounters.reduce(
    (sum, row) => sum + row.attacks,
    0,
  );
  const encounterHits = encounters.reduce(
    (sum, row) => sum + row.hits,
    0,
  );
  const encounterAirborne = encounters.reduce(
    (sum, row) => sum + row.airborneAttacks,
    0,
  );
  const survivors = rows.filter((row) => row.survived);
  const totalPotionUses = rows.reduce(
    (sum, row) => sum + row.potionUses,
    0,
  );
  const totalWasted = rows.reduce(
    (sum, row) => sum + row.wastedHealing,
    0,
  );

  return {
    episodes: rows.length,
    encounters: encounters.length,
    survivalRate: mean(
      rows.map((row) => Number(row.survived)),
    ),
    threeKillEpisodeRate: mean(
      rows.map((row) => Number(row.kills >= 3)),
    ),
    meanKills: mean(rows.map((row) => row.kills)),
    encounterObstacleClearRate: mean(
      encounters.map((row) => Number(row.clearStep !== null)),
    ),
    encounterTargetKillRate: mean(
      encounters.map((row) => Number(row.killed)),
    ),
    leftEncounterTargetKillRate: mean(
      leftEncounters.map((row) => Number(row.killed)),
    ),
    rightEncounterTargetKillRate: mean(
      rightEncounters.map((row) => Number(row.killed)),
    ),
    attackHitPrecision:
      encounterAttacks > 0
        ? encounterHits / encounterAttacks
        : 0,
    airborneAttackActionFraction:
      encounterAttacks > 0
        ? encounterAirborne / encounterAttacks
        : 0,
    postClearJumpEncounterRate: mean(
      encounters.map((row) =>
        Number(row.postClearJumps > 0),
      ),
    ),
    preClearAttackEncounterRate: mean(
      encounters.map((row) =>
        Number(row.preClearAttacks > 0),
      ),
    ),
    survivorPotionDecisionExactRate:
      survivors.length > 0
        ? mean(
            survivors.map((row) =>
              Number(
                row.potionDecisions ===
                  GATE.survivorPotionDecisions,
              ),
            ),
          )
        : 0,
    offDeathRate: mean(
      rows.map((row) => Number(!row.offSurvived)),
    ),
    offSurvivalRate: mean(
      rows.map((row) => Number(row.offSurvived)),
    ),
    survivalBenefit:
      mean(rows.map((row) => Number(row.survived))) -
      mean(rows.map((row) => Number(row.offSurvived))),
    offMeanKills: mean(rows.map((row) => row.offKills)),
    meanKillBenefit:
      mean(rows.map((row) => row.kills)) -
      mean(rows.map((row) => row.offKills)),
    meanFullCostAdjustedValue: mean(
      rows.map((row) => row.fullCostAdjustedValue),
    ),
    meanOffTerminalHp: mean(
      rows.map((row) => row.offTerminalHp),
    ),
    meanValueImprovement: mean(
      rows.map((row) => row.valueImprovement),
    ),
    meanPotionDecisions: mean(
      rows.map((row) => row.potionDecisions),
    ),
    meanPotionUses: mean(rows.map((row) => row.potionUses)),
    wastedHealingPerDrink:
      totalPotionUses > 0 ? totalWasted / totalPotionUses : 0,
    totalPotionUses,
    totalWastedHealing: totalWasted,
    meanContacts: mean(rows.map((row) => row.contacts)),
    meanDamageTaken: mean(
      rows.map((row) => row.damageTaken),
    ),
    gapAttacks: rows.reduce(
      (sum, row) => sum + row.gapAttacks,
      0,
    ),
    gapJumps: rows.reduce(
      (sum, row) => sum + row.gapJumps,
      0,
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
  const potionSource = await readFile(
    new URL("../src/brain/fly-skill-v15-potion.js", import.meta.url),
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

  for (const token of [
    "missinghp",
    "damagetaken",
    "impact count",
    "correct action",
    "wastedhealing",
  ]) {
    if (potionSource.toLowerCase().includes(token)) {
      throw new Error(
        "v15D POTION module contains forbidden oracle token: " +
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

  const interruptionRandom = mulberry32(3109000);
  const perSeed = [];
  const finalRows = [];

  for (const baseSeed of FINAL_SEEDS) {
    const rows = [];
    for (const episode of makeBlock(baseSeed)) {
      const row = await runEpisode({
        connectome,
        dnSlot,
        episode,
        attackPolicy,
        jumpPolicy,
        random: interruptionRandom,
        deterministic: true,
      });
      rows.push(row);
      finalRows.push(row);

      console.log(
        "[v16B] episode seed=" +
          row.seed +
          " survived=" +
          row.survived +
          " kills=" +
          row.kills +
          " encounters=" +
          row.encounters.length +
          " contacts=" +
          row.contacts +
          " potions=" +
          row.potionUses +
          " decisions=" +
          row.potionDecisions +
          " offSurvived=" +
          row.offSurvived,
      );
    }

    const seedSummary = aggregate(rows);
    perSeed.push({ baseSeed, ...seedSummary });
    console.log(
      "[v16B] seed=" +
        baseSeed +
        " survival=" +
        (seedSummary.survivalRate * 100).toFixed(1) +
        "% kills=" +
        seedSummary.meanKills.toFixed(2) +
        " offDeath=" +
        (seedSummary.offDeathRate * 100).toFixed(1) +
        "% benefit=" +
        (seedSummary.survivalBenefit * 100).toFixed(1) +
        "pp",
    );
  }

  const summary = aggregate(finalRows);
  summary.minSeedSurvivalRate = Math.min(
    ...perSeed.map((row) => row.survivalRate),
  );

  const stressSufficient =
    summary.offDeathRate >= GATE.offDeathRateStressMin;

  const gateChecks = {
    survivalRate:
      summary.survivalRate >= GATE.survivalRateMin,
    minSeedSurvival:
      summary.minSeedSurvivalRate >=
      GATE.minSeedSurvivalMin,
    threeKillEpisodeRate:
      summary.threeKillEpisodeRate >=
      GATE.threeKillEpisodeRateMin,
    encounterObstacleClear:
      summary.encounterObstacleClearRate >=
      GATE.encounterObstacleClearMin,
    encounterTargetKill:
      summary.encounterTargetKillRate >=
      GATE.encounterTargetKillMin,
    leftEncounterTargetKill:
      summary.leftEncounterTargetKillRate >=
      GATE.leftEncounterTargetKillMin,
    rightEncounterTargetKill:
      summary.rightEncounterTargetKillRate >=
      GATE.rightEncounterTargetKillMin,
    attackHitPrecision:
      summary.attackHitPrecision >=
      GATE.attackHitPrecisionMin,
    airborneAttackActionFraction:
      summary.airborneAttackActionFraction <=
      GATE.airborneAttackActionFractionMax,
    postClearJumpEncounter:
      summary.postClearJumpEncounterRate <=
      GATE.postClearJumpEncounterMax,
    preClearAttackEncounter:
      summary.preClearAttackEncounterRate <=
      GATE.preClearAttackEncounterMax,
    survivorPotionDecisionCount:
      summary.survivorPotionDecisionExactRate === 1,
    survivalBenefit:
      summary.survivalBenefit >= GATE.survivalBenefitMin,
    meanKillBenefit:
      summary.meanKillBenefit >= GATE.meanKillBenefitMin,
    meanValueImprovement:
      summary.meanValueImprovement >=
      GATE.meanValueImprovementMin,
    wastedHealingPerDrink:
      summary.wastedHealingPerDrink <=
      GATE.wastedHealingPerDrinkMax,
  };

  const scientificPass =
    stressSufficient &&
    Object.values(gateChecks).every(Boolean);

  const outcome = !stressSufficient
    ? "V16B_ECOLOGY_STRESS_INSUFFICIENT"
    : scientificPass
      ? "V16B_CONTINUOUS_ECOLOGY_PASS"
      : "V16B_CONTINUOUS_ECOLOGY_FAIL";

  console.log(
    "[v16B] FULL survival=" +
      (summary.survivalRate * 100).toFixed(1) +
      "% minSeed=" +
      (summary.minSeedSurvivalRate * 100).toFixed(1) +
      "% >=3kills=" +
      (summary.threeKillEpisodeRate * 100).toFixed(1) +
      "% encounterClear=" +
      (summary.encounterObstacleClearRate * 100).toFixed(1) +
      "% encounterKill=" +
      (summary.encounterTargetKillRate * 100).toFixed(1) +
      "% precision=" +
      (summary.attackHitPrecision * 100).toFixed(1) +
      "% airAction=" +
      (summary.airborneAttackActionFraction * 100).toFixed(1) +
      "%",
  );
  console.log(
    "[v16B] POTION offDeath=" +
      (summary.offDeathRate * 100).toFixed(1) +
      "% survivalBenefit=" +
      (summary.survivalBenefit * 100).toFixed(1) +
      "pp killBenefit=" +
      summary.meanKillBenefit.toFixed(3) +
      " valueImprovement=" +
      summary.meanValueImprovement.toFixed(3) +
      " wastePerDrink=" +
      summary.wastedHealingPerDrink.toFixed(3),
  );
  console.log(
    "[v16B] outcome=" +
      outcome +
      " next=" +
      (scientificPass
        ? "V16C_ENDURANCE_BROWSER_PARITY_PREREGISTRATION_AUTHORIZED"
        : "FREEZE_AND_DIAGNOSE"),
  );

  const output = {
    schema: "maplefly.v16b.continuous-ecology.1",
    brainRepository: SOURCE.repository,
    brainCommit: SOURCE.commit,
    preregistration: {
      path: "history/prereg_v16b.md",
      commit: "04cb62206312f4b3b452548a35dfc26c46d3646e",
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
      episodes: finalRows.length,
      horizonSteps: MAX_STEPS,
      horizonSeconds: MAX_STEPS * STEP_SECONDS,
    },
    environment: {
      respawnGapSteps: RESPAWN_GAP_STEPS,
      respawnGapSeconds: RESPAWN_GAP_STEPS * STEP_SECONDS,
      contactDamage: CONTACT_DAMAGE,
      impactDrive: IMPACT_DRIVE,
      impactPulseSteps: IMPACT_PULSE_STEPS,
      potionHeal: POTION_HEAL,
      potionCost: POTION_COST,
      targetHp: TARGET_HP,
      targetRespawn: true,
      persistentBrainState: true,
      persistentSkillState: true,
      syntheticInjurySchedule: false,
    },
    gate: GATE,
    stressSufficient,
    gateChecks,
    summary,
    perSeed,
    rows: finalRows,
    outcome,
    pass: scientificPass,
    next: scientificPass
      ? "V16C_ENDURANCE_BROWSER_PARITY_PREREGISTRATION_AUTHORIZED"
      : "FREEZE_AND_DIAGNOSE",
  };

  const outDir = resolve(
    "results/v16b-continuous-ecology",
  );
  await mkdir(outDir, { recursive: true });
  await writeFile(
    resolve(outDir, "v16b_ecology.json"),
    JSON.stringify(output, null, 2) + "\n",
  );

  if (!scientificPass) process.exitCode = 1;
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
