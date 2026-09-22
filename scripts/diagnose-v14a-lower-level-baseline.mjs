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
const FINAL_SEEDS = [2551000, 2561000, 2571000];
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
  if (norm <= 1e-9) return "IDLE";
  for (let slot = 0; slot < feature.length; slot += 1) {
    feature[slot] /= norm;
  }
  return movementApi.choose(feature, movementSkill).action;
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
    throw new Error("v12 matched geometry mismatch");
  }

  return {
    playerX,
    playerY: GROUND_Y - PLAYER_HEIGHT,
    obstacle,
    targetX,
  };
}

function makeSchedule(baseSeed) {
  const rows = [];
  DISTANCES.forEach((startDistance, distanceIndex) => {
    const sides =
      distanceIndex % 2 === 0 ? ["L", "R"] : ["R", "L"];
    for (const side of sides) {
      rows.push({ brainSeed: baseSeed, side, startDistance });
    }
  });
  return rows;
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
    preClearJumps: 0,
    postClearJumps: 0,
    actualAttacks: 0,
    hits: 0,
    whiffs: 0,
    preClearAttacks: 0,
    airborneAttacks: 0,
    jumpBeforeClear: false,
    firstPostClearJumpStep: null,
    firstAirborneAttackStep: null,
    jumpEvents: [],
    attackEvents: [],
    firstClearStep: null,
    firstHitStep: null,
    killStep: null,
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

  state.moveAction = movementChoice(
    rate(state.moveCounts, state.moveSteps),
    state.baselineRate,
  );
  state.moveCounts.fill(0);
  state.moveSteps = 0;
}

function updateAttackWindow(state, dnSlot, brainStep) {
  collectDn(state.brain, dnSlot, state.attackCounts);
  state.attackSteps += 1;
  if (state.attackSteps < ATTACK_WINDOW_STEPS) return;

  const decision = attackChoice(
    rate(state.attackCounts, state.attackSteps),
    state.baselineRate,
  );
  state.attackCounts.fill(0);
  state.attackSteps = 0;

  if (
    decision.action !== "ATTACK" ||
    brainStep < state.nextAttackStep
  ) {
    return;
  }

  const cleared = obstacleCleared(state);
  const airborne = !state.grounded;
  const targetDistance = Math.abs(
    state.targetX - (state.playerX + PLAYER_WIDTH / 2),
  );
  state.actualAttacks += 1;
  state.nextAttackStep = brainStep + ATTACK_COOLDOWN_STEPS;
  if (!cleared) state.preClearAttacks += 1;
  if (airborne) {
    state.airborneAttacks += 1;
    if (state.firstAirborneAttackStep === null) {
      state.firstAirborneAttackStep = brainStep;
    }
  }

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

  state.attackEvents.push({
    step: brainStep,
    cleared,
    airborne,
    hit,
    playerX: state.playerX,
    playerY: state.playerY,
    targetDistance,
    targetHpAfter: state.targetHp,
  });
}

function updateJumpWindow(state, dnSlot, brainStep) {
  collectDn(state.brain, dnSlot, state.jumpCounts);
  state.jumpSteps += 1;
  if (state.jumpSteps < JUMP_WINDOW_STEPS) return;

  const feature = jumpFeature(
    rate(state.jumpCounts, state.jumpSteps),
    state.baselineRate,
  );
  state.jumpCounts.fill(0);
  state.jumpSteps = 0;

  const available =
    state.grounded && brainStep >= state.nextJumpStep;
  const decision = jumpApi.observeSparseWindow(
    feature,
    available,
    jumpSkill,
    state.jumpRuntime,
  );

  if (decision.action !== "JUMP" || !available) return;

  const cleared = obstacleCleared(state);
  if (!cleared) {
    state.jumpBeforeClear = true;
    state.preClearJumps += 1;
  } else {
    state.postClearJumps += 1;
    if (state.firstPostClearJumpStep === null) {
      state.firstPostClearJumpStep = brainStep;
    }
  }
  state.jumpEvents.push({
    step: brainStep,
    cleared,
    playerX: state.playerX,
    playerY: state.playerY,
    targetDistance: Math.abs(
      state.targetX - (state.playerX + PLAYER_WIDTH / 2),
    ),
  });
  state.vy = -JUMP_VELOCITY;
  state.grounded = false;
  state.nextJumpStep = brainStep + jumpSkill.cooldownBrainSteps;
  state.actualJumps += 1;
  jumpApi.onActuatedJump(state.jumpRuntime);
}

async function runEpisode(connectome, dnSlot, episode) {
  const state = await initializeEpisode(connectome, dnSlot, episode);

  for (let liveStep = 1; liveStep <= MAX_STEPS; liveStep += 1) {
    stimulate(
      state.brain,
      connectome.inputGroups,
      state.encoder.encode({ ...state, visualEnabled: true }),
    );
    state.brain.step();

    updateMovement(state, dnSlot);
    updateAttackWindow(state, dnSlot, liveStep);
    updateJumpWindow(state, dnSlot, liveStep);
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
    side: episode.side,
    startDistance: episode.startDistance,
    clear,
    jumpBeforeClear: state.jumpBeforeClear,
    actualJumps: state.actualJumps,
    preClearJumps: state.preClearJumps,
    postClearJumps: state.postClearJumps,
    firstPostClearJumpStep: state.firstPostClearJumpStep,
    actualAttacks: state.actualAttacks,
    preClearAttacks: state.preClearAttacks,
    airborneAttacks: state.airborneAttacks,
    firstAirborneAttackStep: state.firstAirborneAttackStep,
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
    jumpEvents: state.jumpEvents,
    attackEvents: state.attackEvents,
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
    "\"LC6\"",
    "\"LC16\"",
    "\"LC22\"",
    "\"LPLC4\"",
    "attackSkillApi.chooseSparseCurrent",
    "jumpSkillApi.observeSparseWindow",
  ];
  for (const token of required) {
    if (!controller.includes(token)) {
      throw new Error("browser integration contract missing: " + token);
    }
  }

  if (
    movementSkill.originalFeatureCount !== DN_COUNT ||
    attackSkill.originalFeatureCount !== DN_COUNT ||
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
    throw new Error("frozen learned-skill contract mismatch");
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

  const perSeed = [];
  const allRows = [];

  for (const baseSeed of FINAL_SEEDS) {
    const rows = [];
    for (const episode of makeSchedule(baseSeed)) {
      const row = await runEpisode(connectome, dnSlot, episode);
      rows.push(row);
      allRows.push(row);
    }

    const seedSummary = {
      baseSeed,
      episodes: rows.length,
      courseCompletionRate: mean(
        rows.map((row) => Number(row.courseComplete)),
      ),
      obstacleClearRate: mean(rows.map((row) => Number(row.clear))),
      targetKillRate: mean(rows.map((row) => Number(row.kill))),
      timeoutRate: mean(rows.map((row) => Number(row.timeout))),
      rows,
    };
    perSeed.push(seedSummary);

    console.log(
      "[v12] seed=" +
        baseSeed +
        " complete=" +
        (seedSummary.courseCompletionRate * 100).toFixed(1) +
        "% clear=" +
        (seedSummary.obstacleClearRate * 100).toFixed(1) +
        "% kill=" +
        (seedSummary.targetKillRate * 100).toFixed(1) +
        "% timeout=" +
        (seedSummary.timeoutRate * 100).toFixed(1) +
        "%",
    );
  }

  const totalAttacks = allRows.reduce(
    (sum, row) => sum + row.actualAttacks,
    0,
  );
  const totalHits = allRows.reduce((sum, row) => sum + row.hits, 0);

  const summary = {
    episodes: allRows.length,
    courseCompletionRate: mean(
      allRows.map((row) => Number(row.courseComplete)),
    ),
    minSeedCompletionRate: Math.min(
      ...perSeed.map((row) => row.courseCompletionRate),
    ),
    obstacleClearRate: mean(allRows.map((row) => Number(row.clear))),
    targetKillRate: mean(allRows.map((row) => Number(row.kill))),
    timeoutRate: mean(allRows.map((row) => Number(row.timeout))),
    meanActualJumps: mean(allRows.map((row) => row.actualJumps)),
    meanPreClearJumps: mean(allRows.map((row) => row.preClearJumps)),
    meanPostClearJumps: mean(allRows.map((row) => row.postClearJumps)),
    postClearJumpEpisodeRate: mean(
      allRows.map((row) => Number(row.postClearJumps > 0)),
    ),
    jumpBeforeClearEpisodeRate: mean(
      allRows.map((row) => Number(row.jumpBeforeClear)),
    ),
    preClearAttackEpisodeRate: mean(
      allRows.map((row) => Number(row.preClearAttacks > 0)),
    ),
    airborneAttackEpisodeRate: mean(
      allRows.map((row) => Number(row.airborneAttacks > 0)),
    ),
    actualAttacks: totalAttacks,
    hits: totalHits,
    whiffs: allRows.reduce((sum, row) => sum + row.whiffs, 0),
    attackHitPrecision: totalAttacks > 0 ? totalHits / totalAttacks : 0,
  };

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
    schema: "maplefly.v14a.lower-level-baseline-diagnostic.1",
    purpose:
      "Diagnostic replay of frozen lower-level stack on v14A final seeds; no new gate.",
    brainCommit: SOURCE.commit,
    frozenSkills: {
      movement: movementSkill.version,
      attack: attackSkill.version,
      jump: jumpSkill.version,
    },
    seeds: FINAL_SEEDS,
    distances: DISTANCES,
    episodesPerSeed: 8,
    gate: GATE,
    gateChecks,
    summary,
    perSeed,
    pass,
  };

  const outDir = resolve("results/diagnose-v14a-lower-level-baseline");
  await mkdir(outDir, { recursive: true });
  await writeFile(
    resolve(outDir, "diagnostic_v14a_lower_level.json"),
    JSON.stringify(output, null, 2) + "\n",
  );

  console.log(
    "V14A-LOWER-LEVEL-BASELINE=" +
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
      "% hitPrecision=" +
      (summary.attackHitPrecision * 100).toFixed(1) +
      "% postClearJumpEp=" +
      (summary.postClearJumpEpisodeRate * 100).toFixed(1) +
      "% postClearJumps=" +
      summary.meanPostClearJumps.toFixed(3),
  );

  // Diagnostic only: preserve computed v12-style checks but do not gate this run.
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
