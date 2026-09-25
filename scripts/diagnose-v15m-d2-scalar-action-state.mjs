#!/usr/bin/env node
// v15M-D2: optimistic scalar recurrent own-action state upper-bound audit.
import { createHash } from "node:crypto";
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
const V15G_TRAIN_BASE_SEEDS = [3231000, 3241000, 3251000];
const V15G_EVAL_BASE_SEEDS = [3261000, 3271000, 3281000];
const V15L_TRAIN_BASE_SEEDS = [3751000, 3761000, 3771000];
const V15L_EVAL_BASE_SEEDS = [3781000, 3791000, 3801000];
const V15L_PREREG_COMMIT =
  "613143b63fd4149015d6b0b2a3f435bfb3362573";
const V15L_CEM_SEED = 3858000;
const V15L_GENERATIONS = 100;
const V15L_POPULATION = 256;
const V15L_ELITES = 32;
const V15L_OLD_WEIGHT = 0.20;
const V15L_ELITE_WEIGHT = 0.80;
const V15L_MIN_STD = 0.05;
const V15L_PARAM_CLAMP = 8;
const V15L_TRACE_HALF_LIFE_SECONDS = 2.0;
const V15L_TRACE_DECAY = 0.9659363289248456;
const V15L_PCA_COMPONENTS = 32;
const V15L_PCA_ITERATIONS = 80;
const V15L_PCA_SEED = 3838000;
const V15L_POLICY_PARAMS = 37;
const V15L_D1_BASE_SEEDS = [3811000, 3821000, 3831000];
const V15L_D1_PREREG_COMMIT =
  "a2e58587672ece9bef8a62d70eac401d455cebef";
const V15L_D1_INTERRUPTION_SEED = 3867000;
const V15M_D2_BASE_SEEDS = [4001000, 4011000, 4021000];
const V15M_D2_INTERRUPTION_SEED = 4037000;
const V15M_D2_PREREG_COMMIT =
  "59ca34a3edd103489bb98f09b325ef3915d43b59";
const V15M_D2_DECAYS = Object.freeze([
  0.00, 0.05, 0.10, 0.15, 0.20, 0.25, 0.30,
  0.35, 0.40, 0.45, 0.50, 0.55, 0.60, 0.65,
  0.70, 0.75, 0.80, 0.85, 0.90, 0.95, 0.99,
]);
const V15M_D2_MIN_FORCED_SUPPORT = 500;
const V15M_D2_MIN_MIXED_GROUPS = 20;
const V15G_POLICY_SEED = 3298000;
const V15G_EPOCHS = 400;
const V15G_LEARNING_RATE = 0.05;
const V15G_L2 = 0.001;
const V15G_SURVIVAL_BONUS = 165;
const V15G_EXCESS_USES_MAX = 1.5;
const V15G_HISTORY_MARGIN_MIN = 10;
const V15G_NEURAL_MARGIN_MIN = 20;
const V15G_PREREG_COMMIT =
  "2a4c80560fa772dcf0caa974443912bac71476cc";
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

const V15E2_ARTIFACT_ID = 10793265453;
const V15E2_ARTIFACT_DIGEST =
  "sha256:a119bc0e425d08c5ce2381e6054c6ee358bf9402d5c442a57c00c916fd3b9405";
const V15E2_REPRESENTATION_SHA256 =
  "244464c8b5e9c7f5871f35cb3acc4ac1e2e0c9b61860c1dd3c267de79d4758db";
const V15E2_MODEL_SHA256 =
  "18be00b46303f46d62f8f63f26ca1a280b66f50f0004be6f469c637123077c96";
const V15F_PREREG_COMMIT =
  "2d916ac4797d4175bb0f497d6c1050551fcedadf";

let remediationPotion = null;

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

async function loadRemediationPotion() {
  const artifactPath = resolve(
    process.env.V15E2_ARTIFACT_FILE ??
      ".cache/v15e2-artifact/v15e2_training.json",
  );
  const raw = await readFile(artifactPath, "utf8");
  const parsed = JSON.parse(raw);

  if (
    parsed.schema !== "maplefly.v15e2.phase-invariant-pooled-dn.1" ||
    parsed.brainCommit !==
      "95a3dbcb05241b0a5c07028ca8ad945b23fbbe6e" ||
    parsed.preregistration?.commit !==
      "749dbe369248277033aee6fdc9a334dfc6c3b081" ||
    parsed.outcome !== "V15E2_PHASE_INVARIANT_POOLED_DN_PASS" ||
    parsed.pass !== true ||
    parsed.representation?.sha256 !== V15E2_REPRESENTATION_SHA256 ||
    parsed.frozenModelSha256 !== V15E2_MODEL_SHA256
  ) {
    throw new Error("v15E2 artifact provenance mismatch");
  }

  const rep = parsed.representation;
  const dnIds = Array.isArray(rep.dnIds)
    ? rep.dnIds
    : Object.keys(rep.dnIds ?? {})
        .sort((a, b) => Number(a) - Number(b))
        .map((key) => rep.dnIds[key]);
  if (
    rep.type !== "MEAN_POOLED_ALL_DN" ||
    rep.dnCount !== DN_COUNT ||
    rep.historyFrames !== POTION_HISTORY_FRAMES ||
    rep.means?.length !== DN_COUNT ||
    rep.scales?.length !== DN_COUNT ||
    dnIds.length !== DN_COUNT
  ) {
    throw new Error("v15E2 representation contract mismatch");
  }

  const repObject = {
    type: rep.type,
    dnCount: rep.dnCount,
    historyFrames: rep.historyFrames,
    pooling: rep.pooling,
    standardization: rep.standardization,
    scaleFloor: rep.scaleFloor,
    dnIds: rep.dnIds,
    means: rep.means,
    scales: rep.scales,
  };
  const repHash = createHash("sha256")
    .update(JSON.stringify(repObject))
    .digest("hex");
  if (repHash !== V15E2_REPRESENTATION_SHA256) {
    throw new Error("v15E2 representation hash mismatch " + repHash);
  }

  const modelHash = createHash("sha256")
    .update(JSON.stringify(parsed.frozenModel))
    .digest("hex");
  if (modelHash !== V15E2_MODEL_SHA256) {
    throw new Error("v15E2 model hash mismatch " + modelHash);
  }

  const model = parsed.frozenModel;
  if (
    model.type !== "LINEAR_TWO_HEAD_ACTION_VALUE" ||
    model.featureCount !== DN_COUNT ||
    model.wait?.weights?.length !== DN_COUNT ||
    model.drink?.weights?.length !== DN_COUNT
  ) {
    throw new Error("v15E2 model contract mismatch");
  }

  return {
    artifactId: V15E2_ARTIFACT_ID,
    artifactDigest: V15E2_ARTIFACT_DIGEST,
    representationSha256: repHash,
    modelSha256: modelHash,
    dnIds,
    means: Float64Array.from(rep.means),
    scales: Float64Array.from(rep.scales),
    wait: {
      bias: model.wait.bias,
      weights: Float64Array.from(model.wait.weights),
    },
    drink: {
      bias: model.drink.bias,
      weights: Float64Array.from(model.drink.weights),
    },
  };
}

function remediationQ(head, feature) {
  let value = head.bias;
  for (let i = 0; i < DN_COUNT; i += 1) {
    value += head.weights[i] * feature[i];
  }
  if (!Number.isFinite(value)) {
    throw new Error("v15E2 non-finite Q value");
  }
  return value;
}

function remediationPotionDecision(state) {
  if (!remediationPotion) throw new Error("v15E2 candidate not loaded");
  const feature = new Float64Array(DN_COUNT);
  for (let dn = 0; dn < DN_COUNT; dn += 1) {
    const pooled =
      state.potionPooledSum[dn] / POTION_HISTORY_FRAMES;
    feature[dn] = clamp(
      (pooled - remediationPotion.means[dn]) /
        remediationPotion.scales[dn],
      -5,
      5,
    );
  }
  const qWait = remediationQ(remediationPotion.wait, feature);
  const qDrink = remediationQ(remediationPotion.drink, feature);
  return {
    action: qDrink > qWait ? "DRINK" : "WAIT",
    qWait,
    qDrink,
  };
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
    potionPooledSum: new Float64Array(DN_COUNT),
    potionFrameCount: 0,
    potionTrace: new Float64Array(DN_COUNT),
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
    throw new Error("v15L POTION frame alignment mismatch");
  }

  const potionRate = rate(
    state.potionCounts,
    state.potionSteps,
  );
  for (let dn = 0; dn < DN_COUNT; dn += 1) {
    const frameValue = clamp(
      (potionRate[dn] - state.baselineRate[dn]) / 50,
      -1,
      1,
    );
    state.potionTrace[dn] =
      V15L_TRACE_DECAY * state.potionTrace[dn] +
      (1 - V15L_TRACE_DECAY) * frameValue;
  }
  state.potionFrameCount += 1;
  state.potionCounts.fill(0);
  state.potionSteps = 0;

  if (state.potionFrameCount === POTION_HISTORY_FRAMES) {
    state.potionDecisions += 1;
    state.potionEvents.push({
      step: brainStep,
      trace: Array.from(state.potionTrace),
    });
    state.potionFrameCount = 0;
  }

  state.tasteActive =
    state.potionFrameCount === POTION_HISTORY_FRAMES - 1;

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
      state.respawnAtStep === liveStep
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


function sigmoid(value) {
  if (value >= 0) {
    const z = Math.exp(-value);
    return 1 / (1 + z);
  }
  const z = Math.exp(value);
  return z / (1 + z);
}

function simulateSequentialPolicy(
  tape,
  theta,
  {
    random = null,
    stochastic = false,
    historyOff = false,
    neuralOff = false,
    fixedActions = null,
  } = {},
) {
  const decisions = new Map(
    tape.potionEvents.map((event, index) => [
      event.step,
      { ...event, index },
    ]),
  );
  if (decisions.size !== 10) {
    throw new Error("v15G tape must contain exactly 10 decisions");
  }

  const contacts = new Map();
  for (const event of tape.damageEvents) {
    contacts.set(event.step, (contacts.get(event.step) ?? 0) + 1);
  }

  const steps = [...new Set([
    ...decisions.keys(),
    ...contacts.keys(),
  ])].sort((a, b) => a - b);

  let hp = MAX_HP;
  let uses = 0;
  let healed = 0;
  let wasted = 0;
  let alive = true;
  const history = [0, 0, 0, 0];
  const trajectory = [];

  for (const step of steps) {
    if (!alive) break;

    const decision = decisions.get(step);
    if (decision) {
      const h = historyOff ? [0, 0, 0, 0] : [...history];
      const baseMargin = neuralOff ? 0 : decision.baseMargin;
      const score =
        baseMargin +
        theta[0] +
        theta[1] * h[0] +
        theta[2] * h[1] +
        theta[3] * h[2] +
        theta[4] * h[3];
      const probability = sigmoid(score);

      let action;
      if (fixedActions) {
        action = fixedActions[decision.index];
      } else if (stochastic) {
        action = random() < probability ? 1 : 0;
      } else {
        action = score > 0 ? 1 : 0;
      }

      const hpBefore = hp;
      let thisHealed = 0;
      let thisWasted = 0;
      if (action === 1) {
        thisHealed = Math.min(POTION_HEAL, MAX_HP - hp);
        thisWasted = POTION_HEAL - thisHealed;
        hp += thisHealed;
        uses += 1;
        healed += thisHealed;
        wasted += thisWasted;
      }

      trajectory.push({
        step,
        baseMargin,
        history: h,
        score,
        probability,
        action,
        hpBefore,
        hpAfterPotion: hp,
        healed: thisHealed,
        wasted: thisWasted,
      });

      history.unshift(action);
      history.length = 4;
    }

    const count = contacts.get(step) ?? 0;
    for (let i = 0; i < count; i += 1) {
      hp = Math.max(0, hp - CONTACT_DAMAGE);
      if (hp === 0) {
        alive = false;
        break;
      }
    }
  }

  const utility =
    (alive ? V15G_SURVIVAL_BONUS : 0) -
    POTION_COST * uses;

  return {
    seed: tape.seed,
    baseSeed: tape.baseSeed,
    survived: alive,
    finalHp: hp,
    uses,
    healed,
    wasted,
    utility,
    decisionsTaken: trajectory.length,
    trajectory,
  };
}

function tapeValidity(rows) {
  const encounters = rows.flatMap((row) => row.encounters);
  const left = encounters.filter((row) => row.side === "L");
  const right = encounters.filter((row) => row.side === "R");
  const attacks = encounters.reduce((sum, row) => sum + row.attacks, 0);
  const hits = encounters.reduce((sum, row) => sum + row.hits, 0);
  const airborne = encounters.reduce(
    (sum, row) => sum + row.airborneAttacks,
    0,
  );
  return {
    threeKillEpisodeRate: mean(
      rows.map((row) => Number(row.killEvents.length >= 3)),
    ),
    encounterObstacleClearRate: mean(
      encounters.map((row) => Number(row.clearStep !== null)),
    ),
    encounterTargetKillRate: mean(
      encounters.map((row) => Number(row.killed)),
    ),
    leftEncounterTargetKillRate: mean(
      left.map((row) => Number(row.killed)),
    ),
    rightEncounterTargetKillRate: mean(
      right.map((row) => Number(row.killed)),
    ),
    attackHitPrecision: attacks ? hits / attacks : 0,
    airborneAttackActionFraction:
      attacks ? airborne / attacks : 0,
    postClearJumpEncounterRate: mean(
      encounters.map((row) => Number(row.postClearJumps > 0)),
    ),
    preClearAttackEncounterRate: mean(
      encounters.map((row) => Number(row.preClearAttacks > 0)),
    ),
  };
}

async function collectTapes({
  connectome,
  dnSlot,
  attackPolicy,
  jumpPolicy,
  baseSeeds,
  interruptionRandom,
  label,
}) {
  const rows = [];
  for (const baseSeed of baseSeeds) {
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
      if (row.liveSteps !== MAX_STEPS || row.potionEvents.length !== 10) {
        throw new Error("v15L incomplete trainer tape");
      }
      rows.push(row);
      console.log(
        "[v15L-" + label + "] seed=" + row.seed +
          " kills=" + row.killEvents.length +
          " contacts=" + row.damageEvents.length +
          " decisions=" + row.potionEvents.length,
      );
    }
  }
  return rows;
}

function contactSchedule(tape) {
  if (tape.potionEvents.length !== 10) {
    throw new Error("v15L-D1 tape must contain exactly 10 decisions");
  }
  const decisionSteps = tape.potionEvents.map((event) => event.step);
  const contactsBeforeFirst = tape.damageEvents.filter(
    (event) => event.step < decisionSteps[0],
  ).length;
  const contactsAfter = [];
  for (let i = 0; i < 10; i += 1) {
    const start = decisionSteps[i];
    const end = i < 9 ? decisionSteps[i + 1] : MAX_STEPS + 1;
    contactsAfter.push(
      tape.damageEvents.filter(
        (event) => event.step >= start && event.step < end,
      ).length,
    );
  }
  return { contactsBeforeFirst, contactsAfter };
}

function historyKey(actions) {
  const recent = [0, 0, 0, 0];
  for (let lag = 0; lag < 4; lag += 1) {
    const index = actions.length - 1 - lag;
    recent[lag] = index >= 0 ? actions[index] : 0;
  }
  return recent.join("");
}

function hpBeforeDecision(schedule, priorActions) {
  let hp = MAX_HP - CONTACT_DAMAGE * schedule.contactsBeforeFirst;
  if (hp <= 0) return null;
  for (let i = 0; i < priorActions.length; i += 1) {
    if (priorActions[i] === 1) {
      hp = Math.min(MAX_HP, hp + POTION_HEAL);
    }
    hp = Math.max(
      0,
      hp - CONTACT_DAMAGE * schedule.contactsAfter[i],
    );
    if (hp <= 0) return null;
  }
  return hp;
}

function classifyImmediate(schedule, decisionIndex, hpBefore) {
  const remaining = 10 - decisionIndex;
  let minimumUses = Infinity;
  const firstActions = new Set();

  for (let mask = 0; mask < 2 ** remaining; mask += 1) {
    let hp = hpBefore;
    let uses = 0;
    let firstAction = 0;
    let alive = true;

    for (let offset = 0; offset < remaining; offset += 1) {
      const action = (mask >> offset) & 1;
      if (offset === 0) firstAction = action;
      if (action === 1) {
        hp = Math.min(MAX_HP, hp + POTION_HEAL);
        uses += 1;
      }
      hp = Math.max(
        0,
        hp - CONTACT_DAMAGE * schedule.contactsAfter[decisionIndex + offset],
      );
      if (hp <= 0) {
        alive = false;
        break;
      }
    }

    if (!alive) continue;
    if (uses < minimumUses) {
      minimumUses = uses;
      firstActions.clear();
      firstActions.add(firstAction);
    } else if (uses === minimumUses) {
      firstActions.add(firstAction);
    }
  }

  if (!Number.isFinite(minimumUses)) {
    return { classification: "UNSURVIVABLE", minimumUses: null };
  }
  if (firstActions.size === 2) {
    return { classification: "EITHER", minimumUses };
  }
  return {
    classification:
      firstActions.has(1) ? "FORCED_DRINK" : "FORCED_WAIT",
    minimumUses,
  };
}

function enumerateTapeAliasing(tape) {
  const schedule = contactSchedule(tape);
  const groups = new Map();
  const oracleCache = new Map();
  let reachableStates = 0;

  for (let decisionIndex = 0; decisionIndex < 10; decisionIndex += 1) {
    const historyCount = 2 ** decisionIndex;
    for (let mask = 0; mask < historyCount; mask += 1) {
      const priorActions = Array.from(
        { length: decisionIndex },
        (_, index) => (mask >> index) & 1,
      );
      const hp = hpBeforeDecision(schedule, priorActions);
      if (hp === null) continue;
      reachableStates += 1;

      const key =
        tape.seed + ":" + decisionIndex + ":" + historyKey(priorActions);
      if (!groups.has(key)) {
        groups.set(key, {
          seed: tape.seed,
          baseSeed: tape.baseSeed,
          decisionIndex,
          recentActions: historyKey(priorActions),
          states: [],
        });
      }

      const oracleKey = decisionIndex + ":" + hp;
      if (!oracleCache.has(oracleKey)) {
        oracleCache.set(
          oracleKey,
          classifyImmediate(schedule, decisionIndex, hp),
        );
      }
      const oracle = oracleCache.get(oracleKey);
      groups.get(key).states.push({
        hp,
        priorActions,
        classification: oracle.classification,
        minimumUses: oracle.minimumUses,
      });
    }
  }

  const rows = [];
  for (const group of groups.values()) {
    const classes = new Set(
      group.states.map((state) => state.classification),
    );
    const hpValues = [...new Set(group.states.map((state) => state.hp))]
      .sort((a, b) => a - b);
    const conflict =
      classes.has("FORCED_WAIT") && classes.has("FORCED_DRINK");
    rows.push({
      seed: group.seed,
      baseSeed: group.baseSeed,
      decisionIndex: group.decisionIndex,
      recentActions: group.recentActions,
      stateCount: group.states.length,
      distinctHpCount: hpValues.length,
      hpMin: Math.min(...hpValues),
      hpMax: Math.max(...hpValues),
      hpRange: Math.max(...hpValues) - Math.min(...hpValues),
      classifications: [...classes].sort(),
      conflict,
      states: conflict ? group.states : undefined,
    });
  }

  return {
    seed: tape.seed,
    baseSeed: tape.baseSeed,
    reachableStates,
    groups: rows,
    conflictGroups: rows.filter((row) => row.conflict),
  };
}

function verifyActionIndependentTapeContract() {
  const source = decisionBoundary.toString();
  const forbidden = [
    "POTION_HEAL",
    "hp + POTION_HEAL",
    "potionAction ===",
    "action === 1",
  ];
  const hits = forbidden.filter((token) => source.includes(token));
  return {
    pass: hits.length === 0,
    forbiddenHits: hits,
    boundarySha256: createHash("sha256").update(source).digest("hex"),
  };
}

function summarizeClassifications(tapeResults) {
  const counts = {
    FORCED_WAIT: 0,
    FORCED_DRINK: 0,
    EITHER: 0,
    UNSURVIVABLE: 0,
  };
  for (const tape of tapeResults) {
    for (const group of tape.groups) {
      if (!group.conflict) continue;
      for (const state of group.states ?? []) {
        counts[state.classification] += 1;
      }
    }
  }
  return counts;
}

function ownActionScalar(priorActions, decay) {
  let value = 0;
  for (let decision = 0; decision <= priorActions.length; decision += 1) {
    const previousAction =
      decision === 0 ? 0 : priorActions[decision - 1];
    value = decay * value + previousAction;
  }
  return value;
}

function enumerateTapeStates(tape) {
  const schedule = contactSchedule(tape);
  const oracleCache = new Map();
  const states = [];

  for (let decisionIndex = 0; decisionIndex < 10; decisionIndex += 1) {
    const historyCount = 2 ** decisionIndex;
    for (let mask = 0; mask < historyCount; mask += 1) {
      const priorActions = Array.from(
        { length: decisionIndex },
        (_, index) => (mask >> index) & 1,
      );
      const hp = hpBeforeDecision(schedule, priorActions);
      if (hp === null) continue;

      const oracleKey = decisionIndex + ":" + hp;
      if (!oracleCache.has(oracleKey)) {
        oracleCache.set(
          oracleKey,
          classifyImmediate(schedule, decisionIndex, hp),
        );
      }
      const oracle = oracleCache.get(oracleKey);
      states.push({
        seed: tape.seed,
        baseSeed: tape.baseSeed,
        decisionIndex,
        historyMask: mask,
        priorActions,
        hp,
        classification: oracle.classification,
        minimumUses: oracle.minimumUses,
      });
    }
  }

  return {
    seed: tape.seed,
    baseSeed: tape.baseSeed,
    states,
  };
}

function forcedLabel(classification) {
  if (classification === "FORCED_WAIT") return 0;
  if (classification === "FORCED_DRINK") return 1;
  return null;
}

function groupForcedStates(tapeResults, decay) {
  const groups = new Map();
  for (const tape of tapeResults) {
    for (const state of tape.states) {
      const label = forcedLabel(state.classification);
      if (label === null) continue;
      const key = state.seed + ":" + state.decisionIndex;
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          seed: state.seed,
          baseSeed: state.baseSeed,
          decisionIndex: state.decisionIndex,
          states: [],
        });
      }
      groups.get(key).states.push({
        ...state,
        label,
        u: ownActionScalar(state.priorActions, decay),
      });
    }
  }
  return [...groups.values()];
}

function groupedByScalar(states) {
  const byValue = new Map();
  for (const state of states) {
    const key = state.u.toPrecision(17);
    if (!byValue.has(key)) {
      byValue.set(key, { u: state.u, states: [] });
    }
    byValue.get(key).states.push(state);
  }
  return [...byValue.values()].sort((a, b) => a.u - b.u);
}

function optimizeGroupThreshold(
  group,
  orientation,
  waitWeight,
  drinkWeight,
) {
  const values = groupedByScalar(group.states);
  let best = null;

  for (let cut = 0; cut <= values.length; cut += 1) {
    let weightedCorrect = 0;
    let correct = 0;
    let waitPredictions = 0;
    const errorsByDecision = Array(10).fill(0);

    for (let valueIndex = 0; valueIndex < values.length; valueIndex += 1) {
      const predictDrink =
        orientation === "NEGATIVE"
          ? valueIndex < cut
          : valueIndex >= cut;
      for (const state of values[valueIndex].states) {
        const prediction = predictDrink ? 1 : 0;
        if (!predictDrink) waitPredictions += 1;
        if (prediction === state.label) {
          correct += 1;
          weightedCorrect += state.label === 1
            ? drinkWeight
            : waitWeight;
        } else {
          errorsByDecision[state.decisionIndex] += 1;
        }
      }
    }

    const candidate = {
      cut,
      weightedCorrect,
      correct,
      waitPredictions,
      errorsByDecision,
    };
    if (
      best === null ||
      candidate.weightedCorrect > best.weightedCorrect + 1e-15 ||
      (
        Math.abs(candidate.weightedCorrect - best.weightedCorrect) <= 1e-15 &&
        (
          candidate.waitPredictions > best.waitPredictions ||
          (
            candidate.waitPredictions === best.waitPredictions &&
            candidate.cut < best.cut
          )
        )
      )
    ) {
      best = candidate;
    }
  }

  const left =
    best.cut === 0 ? null : values[best.cut - 1].u;
  const right =
    best.cut === values.length ? null : values[best.cut].u;

  return {
    ...best,
    distinctScalarValues: values.length,
    perfect: best.correct === group.states.length,
    thresholdBracket: { left, right },
  };
}

function findWitness(group, orientation) {
  const states = [...group.states].sort(
    (a, b) =>
      a.u - b.u ||
      a.historyMask - b.historyMask,
  );

  for (let i = 0; i < states.length; i += 1) {
    for (let j = i + 1; j < states.length; j += 1) {
      const low = states[i];
      const high = states[j];
      const violates =
        orientation === "NEGATIVE"
          ? low.label === 0 && high.label === 1
          : low.label === 1 && high.label === 0;
      const sameValueConflict =
        Math.abs(low.u - high.u) <= 1e-15 &&
        low.label !== high.label;
      if (violates || sameValueConflict) {
        return [low, high].map((state) => ({
          u: state.u,
          historyMask: state.historyMask,
          priorActions: state.priorActions,
          classification: state.classification,
          hp: state.hp,
          minimumUses: state.minimumUses,
        }));
      }
    }
  }
  return [];
}

function auditDecay(tapeResults, decay, orientation, supports) {
  const groups = groupForcedStates(tapeResults, decay);
  const waitWeight = 0.5 / supports.forcedWait;
  const drinkWeight = 0.5 / supports.forcedDrink;
  let weightedCorrect = 0;
  let correct = 0;
  const errorsByDecision = Array(10).fill(0);
  let mixedGroupCount = 0;
  let nonSeparableMixedGroupCount = 0;
  const nonSeparableGroups = [];

  for (const group of groups) {
    const labels = new Set(group.states.map((state) => state.label));
    const mixed = labels.size === 2;
    if (mixed) mixedGroupCount += 1;

    const optimum = optimizeGroupThreshold(
      group,
      orientation,
      waitWeight,
      drinkWeight,
    );
    weightedCorrect += optimum.weightedCorrect;
    correct += optimum.correct;
    for (let i = 0; i < 10; i += 1) {
      errorsByDecision[i] += optimum.errorsByDecision[i];
    }

    if (mixed && !optimum.perfect) {
      nonSeparableMixedGroupCount += 1;
      nonSeparableGroups.push({
        seed: group.seed,
        baseSeed: group.baseSeed,
        decisionIndex: group.decisionIndex,
        forcedStateCount: group.states.length,
        distinctScalarValues: optimum.distinctScalarValues,
        thresholdBracket: optimum.thresholdBracket,
        witness: findWitness(group, orientation),
      });
    }
  }

  return {
    decay,
    orientation,
    balancedAccuracy: weightedCorrect,
    ordinaryAccuracy: correct / supports.forcedTotal,
    mixedGroupCount,
    nonSeparableMixedGroupCount,
    nonSeparableMixedGroupFraction:
      mixedGroupCount
        ? nonSeparableMixedGroupCount / mixedGroupCount
        : 0,
    errorsByDecision,
    nonSeparableGroups,
  };
}

function selectBestAudit(audits) {
  const orientationRank = { NEGATIVE: 0, POSITIVE: 1 };
  return [...audits].sort(
    (a, b) =>
      b.balancedAccuracy - a.balancedAccuracy ||
      a.decay - b.decay ||
      orientationRank[a.orientation] - orientationRank[b.orientation],
  )[0];
}

async function main() {
  await verifyStaticContract();
  remediationPotion = await loadRemediationPotion();

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
    candidate.historyFrames !== 12 ||
    candidate.featureCount !== 96
  ) {
    throw new Error("v15M-D2 v14C provenance mismatch");
  }
  const attackPolicy = {
    bias: candidate.policies.attack.bias,
    weights: Float64Array.from(candidate.policies.attack.weights),
  };
  const jumpPolicy = {
    bias: candidate.policies.jump.bias,
    weights: Float64Array.from(candidate.policies.jump.weights),
  };

  const actionIndependence = verifyActionIndependentTapeContract();
  if (!actionIndependence.pass) {
    throw new Error(
      "v15M-D2 counterfactual action leaks into neural tape: " +
        actionIndependence.forbiddenHits.join(","),
    );
  }

  const connectome = await loadConnectome({
    cacheDir: resolve(".cache/maplefly-connectome"),
    onProgress(message) {
      console.log("[connectome] " + message);
    },
  });
  const dnSlot = buildDnSlot(connectome.meta);
  const runtimeDnIds = cells(
    connectome.meta,
    ["descending_neuron", "descending_neuron_tbc"],
  );
  if (
    runtimeDnIds.length !== remediationPotion.dnIds.length ||
    runtimeDnIds.some(
      (value, index) => value !== remediationPotion.dnIds[index],
    )
  ) {
    throw new Error("v15M-D2 DN identity/order mismatch");
  }

  for (const channel of ["LC6", "LC16", "LC22", "LPLC4"]) {
    for (const side of ["L", "R"]) {
      const group = cells(connectome.meta, [channel], side);
      if (!group.length) throw new Error(channel + "_" + side + " missing");
      connectome.inputGroups.set(channel + "_" + side, group);
    }
  }
  for (const side of ["L", "R"]) {
    const impact = cellsWithPrefix(connectome.meta, "LgLG", side);
    const expectedCount = side === "L" ? 331 : 338;
    if (impact.length !== expectedCount) {
      throw new Error("LgLG_" + side + " mismatch");
    }
    connectome.inputGroups.set("LgLG_" + side, impact);
    const taste = cells(
      connectome.meta,
      ["LB3", "claw_tpGRN"],
      side,
    );
    if (!taste.length) throw new Error("taste_" + side + " missing");
    connectome.inputGroups.set("taste_" + side, taste);
  }

  const interruptionRandom = mulberry32(V15M_D2_INTERRUPTION_SEED);
  const tapes = await collectTapes({
    connectome,
    dnSlot,
    attackPolicy,
    jumpPolicy,
    baseSeeds: V15M_D2_BASE_SEEDS,
    interruptionRandom,
    label: "v15m-d2-holdout",
  });
  if (tapes.length !== 24) {
    throw new Error("v15M-D2 tape count mismatch");
  }

  const validity = tapeValidity(tapes);
  const validityChecks = {
    threeKillEpisodeRate: validity.threeKillEpisodeRate >= 0.75,
    encounterObstacleClear: validity.encounterObstacleClearRate >= 0.85,
    encounterTargetKill: validity.encounterTargetKillRate >= 0.70,
    leftEncounterTargetKill: validity.leftEncounterTargetKillRate >= 0.65,
    rightEncounterTargetKill: validity.rightEncounterTargetKillRate >= 0.65,
    attackHitPrecision: validity.attackHitPrecision >= 0.45,
    airborneAttackActionFraction:
      validity.airborneAttackActionFraction <= 0.22,
    postClearJumpEncounter: validity.postClearJumpEncounterRate <= 0.25,
    preClearAttackEncounter: validity.preClearAttackEncounterRate <= 0.30,
  };
  const ecologyPass = Object.values(validityChecks).every(Boolean);

  const tapeResults = tapes.map(enumerateTapeStates);
  const allStates = tapeResults.flatMap((row) => row.states);
  const classificationCounts = {
    FORCED_WAIT: 0,
    FORCED_DRINK: 0,
    EITHER: 0,
    UNSURVIVABLE: 0,
  };
  for (const state of allStates) {
    classificationCounts[state.classification] += 1;
  }

  const supports = {
    forcedWait: classificationCounts.FORCED_WAIT,
    forcedDrink: classificationCounts.FORCED_DRINK,
    forcedTotal:
      classificationCounts.FORCED_WAIT +
      classificationCounts.FORCED_DRINK,
  };

  const audits = [];
  for (const decay of V15M_D2_DECAYS) {
    for (const orientation of ["NEGATIVE", "POSITIVE"]) {
      audits.push(
        auditDecay(
          tapeResults,
          decay,
          orientation,
          supports,
        ),
      );
    }
  }
  const selected = selectBestAudit(audits);
  const supportPass =
    supports.forcedWait >= V15M_D2_MIN_FORCED_SUPPORT &&
    supports.forcedDrink >= V15M_D2_MIN_FORCED_SUPPORT &&
    selected.mixedGroupCount >= V15M_D2_MIN_MIXED_GROUPS;

  let outcome;
  if (!ecologyPass) {
    outcome = "V15M_D2_IMPLEMENTATION_OR_ECOLOGY_INVALID";
  } else if (!supportPass) {
    outcome = "V15M_D2_INSUFFICIENT_ORACLE_SUPPORT";
  } else if (
    selected.balancedAccuracy < 0.90 ||
    selected.nonSeparableMixedGroupFraction >= 0.10
  ) {
    outcome = "V15M_D2_SCALAR_ACTION_STATE_BOTTLENECK";
  } else if (
    selected.balancedAccuracy >= 0.95 &&
    selected.nonSeparableMixedGroupFraction < 0.02
  ) {
    outcome = "V15M_D2_SCALAR_ACTION_STATE_NOT_RULED_OUT";
  } else {
    outcome = "V15M_D2_SCALAR_ACTION_STATE_INCONCLUSIVE";
  }

  const compactAudits = audits.map((row) => ({
    decay: row.decay,
    orientation: row.orientation,
    balancedAccuracy: row.balancedAccuracy,
    ordinaryAccuracy: row.ordinaryAccuracy,
    mixedGroupCount: row.mixedGroupCount,
    nonSeparableMixedGroupCount: row.nonSeparableMixedGroupCount,
    nonSeparableMixedGroupFraction:
      row.nonSeparableMixedGroupFraction,
    errorsByDecision: row.errorsByDecision,
  }));

  const witnesses = [...selected.nonSeparableGroups]
    .sort(
      (a, b) =>
        a.decisionIndex - b.decisionIndex ||
        a.seed - b.seed,
    )
    .slice(0, 20);

  console.log(
    "[v15M-D2] reachable=" + allStates.length +
      " forcedWait=" + supports.forcedWait +
      " forcedDrink=" + supports.forcedDrink +
      " mixedGroups=" + selected.mixedGroupCount,
  );
  console.log(
    "[v15M-D2] best decay=" + selected.decay.toFixed(2) +
      " orientation=" + selected.orientation +
      " BA=" + (selected.balancedAccuracy * 100).toFixed(2) +
      "% accuracy=" + (selected.ordinaryAccuracy * 100).toFixed(2) +
      "% nonseparable=" +
      selected.nonSeparableMixedGroupCount + "/" +
      selected.mixedGroupCount +
      " (" +
      (selected.nonSeparableMixedGroupFraction * 100).toFixed(2) +
      "%) outcome=" + outcome,
  );

  const output = {
    schema: "maplefly.v15m-d2.scalar-action-state-upper-bound.1",
    preregistration: {
      path: "history/prereg_v15m_d2.md",
      commit: V15M_D2_PREREG_COMMIT,
    },
    evidenceChain: {
      v15mD1Receipt:
        "976766d42983b8070c78651660532a1103100f13",
      v15mD1Outcome:
        "V15M_D1_TRACE_AND_PCA_SIGNAL_STABLE",
    },
    cohort: {
      baseSeeds: V15M_D2_BASE_SEEDS,
      tapes: tapes.length,
      interruptionRngSeed: V15M_D2_INTERRUPTION_SEED,
    },
    actionIndependence,
    ecology: {
      metrics: validity,
      checks: validityChecks,
      pass: ecologyPass,
    },
    oracle: {
      reachableStates: allStates.length,
      classificationCounts,
      supports,
      mixedGroupMinimum: V15M_D2_MIN_MIXED_GROUPS,
    },
    scalarAudit: {
      recurrence:
        "u_t=decay*u_(t-1)+previousOwnAction",
      decayGrid: V15M_D2_DECAYS,
      orientations: ["NEGATIVE", "POSITIVE"],
      classWeighting:
        "0.5/totalForcedWait and 0.5/totalForcedDrink",
      perTapeDecisionThresholds:
        "INDEPENDENT_OPTIMISTIC_UPPER_BOUND",
      audits: compactAudits,
      selected: {
        decay: selected.decay,
        orientation: selected.orientation,
        balancedAccuracy: selected.balancedAccuracy,
        ordinaryAccuracy: selected.ordinaryAccuracy,
        mixedGroupCount: selected.mixedGroupCount,
        nonSeparableMixedGroupCount:
          selected.nonSeparableMixedGroupCount,
        nonSeparableMixedGroupFraction:
          selected.nonSeparableMixedGroupFraction,
        errorsByDecision: selected.errorsByDecision,
      },
      witnesses,
    },
    supportPass,
    outcome,
    replacementPolicyTrained: false,
    deployment: "BLOCKED",
    deployedPotion: "v15D",
    v16c180SecondEndurance: "BLOCKED",
  };

  const outDir = resolve(
    "results/v15m-d2-scalar-action-state-upper-bound",
  );
  await mkdir(outDir, { recursive: true });
  await writeFile(
    resolve(outDir, "v15m_d2.json"),
    JSON.stringify(output, null, 2) + "\n",
  );

  if (
    outcome === "V15M_D2_IMPLEMENTATION_OR_ECOLOGY_INVALID" ||
    outcome === "V15M_D2_INSUFFICIENT_ORACLE_SUPPORT"
  ) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
