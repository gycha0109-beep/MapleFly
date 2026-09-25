#!/usr/bin/env node
// v15M: reward-only terminal-health shaping on long frozen neural history.
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
const V15M_TRAIN_BASE_SEEDS = [3871000, 3881000, 3891000];
const V15M_EVAL_BASE_SEEDS = [3901000, 3911000, 3921000];
const V15M_PREREG_COMMIT =
  "e0aea2eed43942f6543fbcf40398501e1c99f432";
const V15M_CEM_SEED = 3958000;
const V15M_GENERATIONS = 100;
const V15M_POPULATION = 256;
const V15M_ELITES = 32;
const V15M_OLD_WEIGHT = 0.20;
const V15M_ELITE_WEIGHT = 0.80;
const V15M_MIN_STD = 0.05;
const V15M_PARAM_CLAMP = 8;
const V15M_TRACE_HALF_LIFE_SECONDS = 2.0;
const V15M_TRACE_DECAY = 0.9659363289248456;
const V15M_PCA_COMPONENTS = 32;
const V15M_PCA_ITERATIONS = 80;
const V15M_PCA_SEED = 3948000;
const V15M_POLICY_PARAMS = 35;
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
    throw new Error("v15M POTION frame alignment mismatch");
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
      V15M_TRACE_DECAY * state.potionTrace[dn] +
      (1 - V15M_TRACE_DECAY) * frameValue;
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
        throw new Error("v15M incomplete trainer tape");
      }
      rows.push(row);
      console.log(
        "[v15M-" + label + "] seed=" + row.seed +
          " kills=" + row.killEvents.length +
          " contacts=" + row.damageEvents.length +
          " decisions=" + row.potionEvents.length,
      );
    }
  }
  return rows;
}

function normalSample(random) {
  const u1 = Math.max(random(), 1e-12);
  const u2 = random();
  return Math.sqrt(-2 * Math.log(u1)) *
    Math.cos(2 * Math.PI * u2);
}



function vectorDot(a, b) {
  let value = 0;
  for (let i = 0; i < a.length; i += 1) value += a[i] * b[i];
  return value;
}

function normalizeVector(vector) {
  let norm2 = 0;
  for (let i = 0; i < vector.length; i += 1) {
    norm2 += vector[i] * vector[i];
  }
  const norm = Math.sqrt(norm2);
  if (!(norm > 1e-12)) {
    throw new Error("v15M PCA vector collapsed");
  }
  for (let i = 0; i < vector.length; i += 1) vector[i] /= norm;
  return vector;
}

function orthogonalize(vector, basis) {
  for (const prior of basis) {
    const projection = vectorDot(vector, prior);
    for (let i = 0; i < vector.length; i += 1) {
      vector[i] -= projection * prior[i];
    }
  }
  return vector;
}

function traceSnapshots(tapes) {
  const rows = [];
  for (const tape of tapes) {
    if (tape.potionEvents.length !== 10) {
      throw new Error("v15M trace snapshot decision count mismatch");
    }
    for (const event of tape.potionEvents) {
      if (!Array.isArray(event.trace) || event.trace.length !== DN_COUNT) {
        throw new Error("v15M trace snapshot width mismatch");
      }
      rows.push(Float64Array.from(event.trace));
    }
  }
  return rows;
}

function fitTracePreprocessing(trainTapes) {
  const raw = traceSnapshots(trainTapes);
  if (raw.length !== 240) {
    throw new Error("v15M PCA TRAIN snapshot count mismatch " + raw.length);
  }

  const means = new Float64Array(DN_COUNT);
  for (const row of raw) {
    for (let d = 0; d < DN_COUNT; d += 1) means[d] += row[d];
  }
  for (let d = 0; d < DN_COUNT; d += 1) means[d] /= raw.length;

  const scales = new Float64Array(DN_COUNT);
  for (const row of raw) {
    for (let d = 0; d < DN_COUNT; d += 1) {
      const delta = row[d] - means[d];
      scales[d] += delta * delta;
    }
  }
  for (let d = 0; d < DN_COUNT; d += 1) {
    scales[d] = Math.max(Math.sqrt(scales[d] / raw.length), 1e-6);
  }

  const standardized = raw.map((row) => {
    const out = new Float64Array(DN_COUNT);
    for (let d = 0; d < DN_COUNT; d += 1) {
      out[d] = (row[d] - means[d]) / scales[d];
    }
    return out;
  });

  const n = standardized.length;
  const gram = new Float64Array(n * n);
  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j <= i; j += 1) {
      const value = vectorDot(standardized[i], standardized[j]) / n;
      gram[i * n + j] = value;
      gram[j * n + i] = value;
    }
  }

  const sampleEigenvectors = [];
  const components = [];
  const eigenvalues = [];
  for (let component = 0; component < V15M_PCA_COMPONENTS; component += 1) {
    const random = mulberry32(V15M_PCA_SEED + component);
    let u = Float64Array.from(
      { length: n },
      () => random() * 2 - 1,
    );
    orthogonalize(u, sampleEigenvectors);
    normalizeVector(u);

    for (let iteration = 0; iteration < V15M_PCA_ITERATIONS; iteration += 1) {
      const next = new Float64Array(n);
      for (let i = 0; i < n; i += 1) {
        let value = 0;
        const offset = i * n;
        for (let j = 0; j < n; j += 1) {
          value += gram[offset + j] * u[j];
        }
        next[i] = value;
      }
      orthogonalize(next, sampleEigenvectors);
      normalizeVector(next);
      u = next;
    }

    const gu = new Float64Array(n);
    for (let i = 0; i < n; i += 1) {
      let value = 0;
      const offset = i * n;
      for (let j = 0; j < n; j += 1) {
        value += gram[offset + j] * u[j];
      }
      gu[i] = value;
    }
    const eigenvalue = vectorDot(u, gu);

    const loading = new Float64Array(DN_COUNT);
    for (let i = 0; i < n; i += 1) {
      const scale = u[i];
      const row = standardized[i];
      for (let d = 0; d < DN_COUNT; d += 1) {
        loading[d] += scale * row[d];
      }
    }
    normalizeVector(loading);

    let maxIndex = 0;
    for (let d = 1; d < DN_COUNT; d += 1) {
      if (Math.abs(loading[d]) > Math.abs(loading[maxIndex])) {
        maxIndex = d;
      }
    }
    if (loading[maxIndex] < 0) {
      for (let d = 0; d < DN_COUNT; d += 1) loading[d] *= -1;
      for (let i = 0; i < n; i += 1) u[i] *= -1;
    }

    sampleEigenvectors.push(u);
    components.push(loading);
    eigenvalues.push(eigenvalue);
  }

  return { means, scales, components, eigenvalues };
}

function projectTrace(trace, preprocessing) {
  const z = new Float64Array(DN_COUNT);
  for (let d = 0; d < DN_COUNT; d += 1) {
    z[d] = (trace[d] - preprocessing.means[d]) / preprocessing.scales[d];
  }
  return preprocessing.components.map((component) => vectorDot(z, component));
}

function attachTraceFeatures(tapes, preprocessing) {
  for (const tape of tapes) {
    tape.neuralFeatures = tape.potionEvents.map((event) =>
      projectTrace(event.trace, preprocessing),
    );
    if (
      tape.neuralFeatures.length !== 10 ||
      tape.neuralFeatures.some((row) => row.length !== V15M_PCA_COMPONENTS)
    ) {
      throw new Error("v15M projected feature contract mismatch");
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

function policyActions(
  neuralSequence,
  params,
  {
    memoryOff = false,
    actionFeedbackOff = false,
    neuralOff = false,
  } = {},
) {
  if (
    neuralSequence.length !== 10 ||
    params.length !== V15M_POLICY_PARAMS
  ) {
    throw new Error("v15M policy contract mismatch");
  }

  const rawDecay = params[0];
  const decay = sigmoid(rawDecay);
  const actionFeedback = params[V15M_PCA_COMPONENTS + 1];
  const bias = params[V15M_PCA_COMPONENTS + 2];

  let belief = 0;
  let previousAction = 0;
  const actions = [];
  const scores = [];
  const beliefs = [];

  for (const rawNeural of neuralSequence) {
    if (rawNeural.length !== V15M_PCA_COMPONENTS) {
      throw new Error("v15M neural feature width mismatch");
    }

    const priorBelief = memoryOff ? 0 : belief;
    let neuralContribution = 0;
    if (!neuralOff) {
      for (let pc = 0; pc < V15M_PCA_COMPONENTS; pc += 1) {
        neuralContribution += params[pc + 1] * rawNeural[pc];
      }
    }
    const ownActionContribution = actionFeedbackOff
      ? 0
      : actionFeedback * previousAction;

    belief =
      decay * priorBelief +
      neuralContribution +
      ownActionContribution;

    const score = belief + bias;
    const action = score > 0 ? 1 : 0;
    actions.push(action);
    scores.push(score);
    beliefs.push(belief);
    previousAction = action;
  }

  return {
    actions,
    scores,
    beliefs,
    decay,
  };
}

function tapeContactSchedule(tape) {
  const decisions = tape.potionEvents;
  if (decisions.length !== 10) {
    throw new Error("v15M tape must contain exactly 10 decisions");
  }
  const decisionSteps = decisions.map((event) => event.step);
  const contactsBeforeFirst = tape.damageEvents.filter(
    (event) => event.step < decisionSteps[0],
  ).length;
  const contactsAfter = [];
  for (let i = 0; i < 10; i += 1) {
    const start = decisionSteps[i];
    const end =
      i < 9 ? decisionSteps[i + 1] : MAX_STEPS + 1;
    contactsAfter.push(
      tape.damageEvents.filter(
        (event) =>
          event.step >= start &&
          event.step < end,
      ).length,
    );
  }
  return { contactsBeforeFirst, contactsAfter };
}

function simulateFromActions(tape, actions) {
  const contact = tapeContactSchedule(tape);
  let hp = MAX_HP - CONTACT_DAMAGE * contact.contactsBeforeFirst;
  let uses = 0;
  let wasted = 0;
  const trajectory = [];
  for (let i = 0; i < 10; i += 1) {
    if (hp <= 0) break;
    const action = actions[i];
    const hpBefore = hp;
    let thisWasted = 0;
    if (action === 1) {
      const healed = Math.min(POTION_HEAL, MAX_HP - hp);
      thisWasted = POTION_HEAL - healed;
      hp += healed;
      uses += 1;
      wasted += thisWasted;
    }
    trajectory.push({
      decisionIndex: i,
      action,
      hpBefore,
      hpAfterPotion: hp,
      wasted: thisWasted,
    });
    hp = Math.max(
      0,
      hp - CONTACT_DAMAGE * contact.contactsAfter[i],
    );
  }
  return {
    seed: tape.seed,
    baseSeed: tape.baseSeed,
    survived: hp > 0,
    finalHp: hp,
    uses,
    wasted,
    utility:
      (hp > 0 ? V15G_SURVIVAL_BONUS : 0) -
      POTION_COST * uses,
    trajectory,
  };
}

function tapeNeuralSequence(tape) {
  if (
    !Array.isArray(tape.neuralFeatures) ||
    tape.neuralFeatures.length !== 10
  ) {
    throw new Error("v15M neural feature tape mismatch");
  }
  return tape.neuralFeatures;
}

function simulatePolicy(
  tape,
  params,
  options = {},
  neuralOverride = null,
) {
  const neuralSequence = neuralOverride ?? tapeNeuralSequence(tape);
  const { actions, scores, beliefs, decay } =
    policyActions(neuralSequence, params, options);
  const row = simulateFromActions(tape, actions);
  row.policyActions = actions;
  row.policyScores = scores;
  row.policyBeliefs = beliefs;
  row.policyDecay = decay;
  return row;
}

function evaluatePolicy(
  tapes,
  params,
  options = {},
  neuralSequences = null,
) {
  const rows = tapes.map((tape, index) =>
    simulatePolicy(
      tape,
      params,
      options,
      neuralSequences ? neuralSequences[index] : null,
    ),
  );
  const totalUses = rows.reduce((sum, row) => sum + row.uses, 0);
  const totalWasted = rows.reduce((sum, row) => sum + row.wasted, 0);
  return {
    rows,
    survivalRate: mean(rows.map((row) => Number(row.survived))),
    meanUses: mean(rows.map((row) => row.uses)),
    meanUtility: mean(rows.map((row) => row.utility)),
    wastedHealingPerDrink:
      totalUses ? totalWasted / totalUses : 0,
  };
}

function trainingFitness(tapes, params) {
  const result = evaluatePolicy(tapes, params);
  const meanTerminalHp = mean(
    result.rows.map((row) => row.finalHp),
  );
  return {
    fitness:
      10000 * result.survivalRate +
      meanTerminalHp -
      POTION_COST * result.meanUses,
    survivalRate: result.survivalRate,
    meanTerminalHp,
    meanUses: result.meanUses,
  };
}

function trainCem(tapes) {
  const random = mulberry32(V15M_CEM_SEED);
  let distributionMean = new Float64Array(V15M_POLICY_PARAMS);
  let distributionStd = new Float64Array(V15M_POLICY_PARAMS).fill(1);
  const trace = [];

  for (
    let generation = 1;
    generation <= V15M_GENERATIONS;
    generation += 1
  ) {
    const population = [];
    for (let member = 0; member < V15M_POPULATION; member += 1) {
      const params = new Float64Array(V15M_POLICY_PARAMS);
      for (let i = 0; i < V15M_POLICY_PARAMS; i += 1) {
        params[i] = clamp(
          distributionMean[i] +
            distributionStd[i] * normalSample(random),
          -V15M_PARAM_CLAMP,
          V15M_PARAM_CLAMP,
        );
      }
      population.push({
        params,
        ...trainingFitness(tapes, params),
      });
    }
    population.sort(
      (a, b) =>
        b.fitness - a.fitness ||
        b.survivalRate - a.survivalRate ||
        a.meanUses - b.meanUses,
    );
    const elites = population.slice(0, V15M_ELITES);
    const eliteMean = new Float64Array(V15M_POLICY_PARAMS);
    for (const elite of elites) {
      for (let i = 0; i < V15M_POLICY_PARAMS; i += 1) {
        eliteMean[i] += elite.params[i];
      }
    }
    for (let i = 0; i < V15M_POLICY_PARAMS; i += 1) {
      eliteMean[i] /= elites.length;
    }
    const eliteStd = new Float64Array(V15M_POLICY_PARAMS);
    for (const elite of elites) {
      for (let i = 0; i < V15M_POLICY_PARAMS; i += 1) {
        eliteStd[i] += (elite.params[i] - eliteMean[i]) ** 2;
      }
    }
    for (let i = 0; i < V15M_POLICY_PARAMS; i += 1) {
      eliteStd[i] = Math.sqrt(eliteStd[i] / elites.length);
      distributionMean[i] = clamp(
        V15M_OLD_WEIGHT * distributionMean[i] +
          V15M_ELITE_WEIGHT * eliteMean[i],
        -V15M_PARAM_CLAMP,
        V15M_PARAM_CLAMP,
      );
      distributionStd[i] = Math.max(
        V15M_MIN_STD,
        V15M_OLD_WEIGHT * distributionStd[i] +
          V15M_ELITE_WEIGHT * eliteStd[i],
      );
    }
    if (
      generation === 1 ||
      generation % 5 === 0 ||
      generation === V15M_GENERATIONS
    ) {
      const score = trainingFitness(tapes, distributionMean);
      trace.push({
        generation,
        mean: Array.from(distributionMean),
        std: Array.from(distributionStd),
        meanFitness: score.fitness,
        meanSurvivalRate: score.survivalRate,
        meanTerminalHp: score.meanTerminalHp,
        meanUses: score.meanUses,
        bestFitness: population[0].fitness,
        bestSurvivalRate: population[0].survivalRate,
        bestMeanTerminalHp: population[0].meanTerminalHp,
        bestMeanUses: population[0].meanUses,
      });
    }
  }
  return {
    params: Float64Array.from(distributionMean),
    finalStd: Array.from(distributionStd),
    trace,
  };
}

function oracleMinimumUses(tape) {
  let minimum = Infinity;
  let bestActions = null;
  for (let mask = 0; mask < 1024; mask += 1) {
    const actions = Array.from(
      { length: 10 },
      (_, index) => (mask >> index) & 1,
    );
    const row = simulateFromActions(tape, actions);
    if (row.survived && row.uses < minimum) {
      minimum = row.uses;
      bestActions = actions;
    }
  }
  if (!Number.isFinite(minimum)) {
    throw new Error("v15M oracle cannot survive tape " + tape.seed);
  }
  return { minimumUses: minimum, bestActions };
}

function addEconomyMetrics(evaluation, oracle) {
  const survivors = evaluation.rows.filter((row) => row.survived);
  const perSeed = V15M_EVAL_BASE_SEEDS.map((baseSeed) => {
    const rows = evaluation.rows.filter(
      (row) => row.baseSeed === baseSeed,
    );
    return {
      baseSeed,
      survivalRate: mean(
        rows.map((row) => Number(row.survived)),
      ),
      meanUses: mean(rows.map((row) => row.uses)),
    };
  });
  return {
    ...evaluation,
    meanExcessUses: survivors.length
      ? mean(
          survivors.map(
            (row) => row.uses - oracle.get(row.seed).minimumUses,
          ),
        )
      : Infinity,
    minSeedSurvivalRate: Math.min(
      ...perSeed.map((row) => row.survivalRate),
    ),
    perSeed,
  };
}

function contribution(full, control, excessThreshold) {
  const survivalDrop = full.survivalRate - control.survivalRate;
  const excessIncrease =
    Number.isFinite(control.meanExcessUses)
      ? control.meanExcessUses - full.meanExcessUses
      : Infinity;
  return {
    survivalDrop,
    excessIncrease,
    zeroSurvivorControl:
      full.survivalRate > 0 && control.survivalRate === 0,
    contributes:
      survivalDrop >= 0.125 ||
      excessIncrease >= excessThreshold ||
      (full.survivalRate > 0 && control.survivalRate === 0),
  };
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
    throw new Error("v14C frozen candidate provenance mismatch");
  }
  const attackPolicy = {
    bias: candidate.policies.attack.bias,
    weights: Float64Array.from(candidate.policies.attack.weights),
  };
  const jumpPolicy = {
    bias: candidate.policies.jump.bias,
    weights: Float64Array.from(candidate.policies.jump.weights),
  };

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
    throw new Error("v15M DN identity/order mismatch");
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

  const interruptionRandom = mulberry32(3937000);
  const trainTapes = await collectTapes({
    connectome,
    dnSlot,
    attackPolicy,
    jumpPolicy,
    baseSeeds: V15M_TRAIN_BASE_SEEDS,
    interruptionRandom,
    label: "train",
  });
  const evalTapes = await collectTapes({
    connectome,
    dnSlot,
    attackPolicy,
    jumpPolicy,
    baseSeeds: V15M_EVAL_BASE_SEEDS,
    interruptionRandom,
    label: "eval",
  });
  if (trainTapes.length !== 24 || evalTapes.length !== 24) {
    throw new Error("v15M tape count mismatch");
  }

  const validity = tapeValidity(evalTapes);
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
  const tapeValid = Object.values(validityChecks).every(Boolean);

  const preprocessing = fitTracePreprocessing(trainTapes);
  attachTraceFeatures(trainTapes, preprocessing);
  attachTraceFeatures(evalTapes, preprocessing);

  const preprocessingSha256 = createHash("sha256")
    .update(JSON.stringify({
      means: Array.from(preprocessing.means),
      scales: Array.from(preprocessing.scales),
      components: preprocessing.components.map((row) => Array.from(row)),
    }))
    .digest("hex");

  const trained = trainCem(trainTapes);
  const params = trained.params;
  const paramsSha256 = createHash("sha256")
    .update(JSON.stringify(Array.from(params)))
    .digest("hex");
  const oracle = new Map(
    evalTapes.map((tape) => [tape.seed, oracleMinimumUses(tape)]),
  );

  const full = addEconomyMetrics(
    evaluatePolicy(evalTapes, params),
    oracle,
  );
  const memoryOff = addEconomyMetrics(
    evaluatePolicy(evalTapes, params, {
      memoryOff: true,
    }),
    oracle,
  );
  const actionFeedbackOff = addEconomyMetrics(
    evaluatePolicy(evalTapes, params, {
      actionFeedbackOff: true,
    }),
    oracle,
  );
  const neuralOff = addEconomyMetrics(
    evaluatePolicy(evalTapes, params, {
      neuralOff: true,
    }),
    oracle,
  );

  const sourceNeural = evalTapes.map(tapeNeuralSequence);
  const shiftedNeural = sourceNeural.map(
    (_, index) => sourceNeural[(index + 1) % sourceNeural.length],
  );
  const episodeShift1 = addEconomyMetrics(
    evaluatePolicy(evalTapes, params, {}, shiftedNeural),
    oracle,
  );

  const trainDecisionMean = Array.from(
    { length: 10 },
    (_, decision) =>
      Array.from(
        { length: V15M_PCA_COMPONENTS },
        (_, pc) =>
          mean(trainTapes.map((tape) => tape.neuralFeatures[decision][pc])),
      ),
  );
  const decisionMeanNeural = addEconomyMetrics(
    evaluatePolicy(
      evalTapes,
      params,
      {},
      evalTapes.map(() => trainDecisionMean),
    ),
    oracle,
  );

  const memoryContribution = contribution(full, memoryOff, 1.0);
  const actionFeedbackContribution = contribution(
    full,
    actionFeedbackOff,
    1.0,
  );
  const neuralContribution = contribution(full, neuralOff, 1.0);
  const shiftContribution = contribution(full, episodeShift1, 0.5);
  const meanContribution = contribution(
    full,
    decisionMeanNeural,
    0.5,
  );

  const gateChecks = {
    tapeValidity: tapeValid,
    survivalRate: full.survivalRate >= 0.75,
    minSeedSurvival: full.minSeedSurvivalRate >= 0.625,
    meanExcessUses: full.meanExcessUses <= 1.5,
    wastedHealingPerDrink: full.wastedHealingPerDrink <= 10,
    memoryContribution: memoryContribution.contributes,
    actionFeedbackContribution: actionFeedbackContribution.contributes,
    neuralContribution: neuralContribution.contributes,
    episodeShift1Contribution: shiftContribution.contributes,
    decisionMeanNeuralContribution: meanContribution.contributes,
  };
  const scientificPass =
    tapeValid && Object.values(gateChecks).every(Boolean);
  const outcome = !tapeValid
    ? "V15M_IMPLEMENTATION_OR_ECOLOGY_INVALID"
    : scientificPass
      ? "V15M_PERSISTENT_NEURAL_ACTION_BELIEF_PASS"
      : "V15M_PERSISTENT_NEURAL_ACTION_BELIEF_FAIL";

  console.log(
    "[v15M] FULL survival=" +
      (full.survivalRate * 100).toFixed(1) +
      "% minSeed=" +
      (full.minSeedSurvivalRate * 100).toFixed(1) +
      "% uses=" +
      full.meanUses.toFixed(3) +
      " excess=" +
      Number(full.meanExcessUses).toFixed(3) +
      " waste=" +
      full.wastedHealingPerDrink.toFixed(3),
  );
  console.log(
    "[v15M] MEMORY_OFF survival=" +
      (memoryOff.survivalRate * 100).toFixed(1) +
      "% excess=" +
      Number(memoryOff.meanExcessUses).toFixed(3) +
      " contributes=" +
      memoryContribution.contributes +
      " ACTION_FEEDBACK_OFF survival=" +
      (actionFeedbackOff.survivalRate * 100).toFixed(1) +
      "% excess=" +
      Number(actionFeedbackOff.meanExcessUses).toFixed(3) +
      " contributes=" +
      actionFeedbackContribution.contributes,
  );
  console.log(
    "[v15M] NEURAL_OFF survival=" +
      (neuralOff.survivalRate * 100).toFixed(1) +
      "% excess=" +
      Number(neuralOff.meanExcessUses).toFixed(3) +
      " contributes=" +
      neuralContribution.contributes,
  );
  console.log(
    "[v15M] SHIFT1 survival=" +
      (episodeShift1.survivalRate * 100).toFixed(1) +
      "% excess=" +
      Number(episodeShift1.meanExcessUses).toFixed(3) +
      " contributes=" +
      shiftContribution.contributes +
      " MEAN survival=" +
      (decisionMeanNeural.survivalRate * 100).toFixed(1) +
      "% excess=" +
      Number(decisionMeanNeural.meanExcessUses).toFixed(3) +
      " contributes=" +
      meanContribution.contributes,
  );
  console.log(
    "[v15M] params=" +
      JSON.stringify(Array.from(params)) +
      " sha256=" +
      paramsSha256 +
      " preprocessing=" +
      preprocessingSha256 +
      " outcome=" +
      outcome,
  );

  const output = {
    schema: "maplefly.v15m.persistent-neural-action-belief.1",
    brainRepository: SOURCE.repository,
    brainCommit: SOURCE.commit,
    preregistration: {
      path: "history/prereg_v15m.md",
      commit: V15M_PREREG_COMMIT,
    },
    evidenceChain: {
      v15kD2Outcome: "V15K_D2_PERSISTENT_IMPACT_SIGNAL_PRESENT",
      v15lOutcome: "V15L_CAUSAL_NEURAL_TRACE_REMEDIATION_FAIL",
      v15lD1Receipt:
        "d5b6023f0e5d068893519025e052a2a2d77fdbb8",
      v15lD1Outcome:
        "V15L_D1_DECISION_RELEVANT_ALIASING_PRESENT",
      supervisedD2WeightsLoaded: false,
    },
    frozenNeuralCore: {
      artifactId: remediationPotion.artifactId,
      artifactDigest: remediationPotion.artifactDigest,
      representationSha256:
        remediationPotion.representationSha256,
      modelSha256: remediationPotion.modelSha256,
    },
    cohorts: {
      trainBaseSeeds: V15M_TRAIN_BASE_SEEDS,
      evalBaseSeeds: V15M_EVAL_BASE_SEEDS,
      trainTapes: trainTapes.length,
      evalTapes: evalTapes.length,
      interruptionRngSeed: 3937000,
    },
    representation: {
      type: "CAUSAL_EXPONENTIAL_DN_TRACE_PCA32_PLUS_RECURRENT_BELIEF",
      dnCount: DN_COUNT,
      frameSteps: POTION_FRAME_STEPS,
      frameSeconds: POTION_FRAME_STEPS * STEP_SECONDS,
      traceHalfLifeSeconds: V15M_TRACE_HALF_LIFE_SECONDS,
      traceDecay: V15M_TRACE_DECAY,
      traceUpdate:
        "trace=lambda*previous+(1-lambda)*baseline_relative_100ms_dn_frame",
      standardization: "TRAIN_ONLY_MEAN_STD_SCALE_FLOOR_1E-6",
      pca: {
        components: V15M_PCA_COMPONENTS,
        iterations: V15M_PCA_ITERATIONS,
        seedBase: V15M_PCA_SEED,
        labelsUsed: false,
        evalUsedForFit: false,
        eigenvalues: preprocessing.eigenvalues,
      },
      preprocessingSha256,
      recurrentBelief: {
        initialBelief: 0,
        initialPreviousAction: 0,
        update:
          "belief=sigmoid(rawDecay)*previousBelief+neuralWeights_dot_PCA32+actionFeedback*previousOwnAction",
        score: "belief+bias",
        drinkRule: "score>0",
        explicitLagVector: false,
        constantInsideRecurrentUpdate: false,
      },
      forbiddenRuntimeInputs: [
        "hp",
        "max_hp",
        "missing_hp",
        "damage",
        "damage_count",
        "contact_flag",
        "contact_count",
        "contact_timestamp",
        "time_since_hit",
        "potion_count",
        "cumulative_potion_count",
        "decision_index",
        "absolute_time",
        "future_damage",
        "future_contact",
        "effective_healing",
        "wasted_healing",
        "oracle_minimum_uses",
        "oracle_action",
        "oracle_injury_state",
        "seed",
        "target_geometry",
        "obstacle_geometry",
      ],
    },
    optimizer: {
      type: "DETERMINISTIC_CROSS_ENTROPY_METHOD",
      generations: V15M_GENERATIONS,
      population: V15M_POPULATION,
      elites: V15M_ELITES,
      oldWeight: V15M_OLD_WEIGHT,
      eliteWeight: V15M_ELITE_WEIGHT,
      minimumStd: V15M_MIN_STD,
      parameterClamp: [-V15M_PARAM_CLAMP, V15M_PARAM_CLAMP],
      seed: V15M_CEM_SEED,
      initialMean: Array(V15M_POLICY_PARAMS).fill(0),
      initialStd: Array(V15M_POLICY_PARAMS).fill(1),
      trainingFitness:
        "10000*survivalRate + meanTerminalHP - 15*meanPotionUses",
      runtimeHpInput: false,
      oracleTraining: false,
      trace: trained.trace,
    },
    policy: {
      parameterCount: V15M_POLICY_PARAMS,
      parameters: {
        rawDecay: params[0],
        decay: sigmoid(params[0]),
        neuralWeights: Array.from(
          params.slice(1, V15M_PCA_COMPONENTS + 1),
        ),
        actionFeedback: params[V15M_PCA_COMPONENTS + 1],
        bias: params[V15M_PCA_COMPONENTS + 2],
      },
      paramsSha256,
      runtimeInputs: [
        "current_32d_pca_of_causal_malecns_dn_trace",
        "previous_recurrent_belief",
        "previous_own_potion_action",
      ],
    },
    tapeValidity: {
      metrics: validity,
      checks: validityChecks,
      pass: tapeValid,
    },
    evaluation: {
      full,
      memoryOff,
      actionFeedbackOff,
      neuralOff,
      episodeShift1,
      decisionMeanNeural,
      trainDecisionMean,
      contributions: {
        memory: memoryContribution,
        actionFeedback: actionFeedbackContribution,
        neural: neuralContribution,
        episodeShift1: shiftContribution,
        decisionMeanNeural: meanContribution,
      },
      oracle: Object.fromEntries(
        [...oracle.entries()].map(([seed, value]) => [seed, value]),
      ),
      gateChecks,
    },
    outcome,
    pass: scientificPass,
    next: scientificPass
      ? "FREEZE_EVIDENCE_THEN_ONLINE_DEPLOYMENT_VALIDATION_PREREGISTRATION_AUTHORIZED"
      : "FREEZE_AND_DIAGNOSE",
    deployment: "BLOCKED",
    deployedPotion: "v15D",
    v16c180SecondEndurance: "BLOCKED",
  };

  const outDir = resolve(
    "results/v15m-persistent-neural-action-belief",
  );
  await mkdir(outDir, { recursive: true });
  await writeFile(
    resolve(outDir, "v15m_training.json"),
    JSON.stringify(output, null, 2) + "\n",
  );

  if (!scientificPass) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
