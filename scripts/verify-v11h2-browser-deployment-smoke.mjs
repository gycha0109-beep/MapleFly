#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  ConnectomeBrain,
  cells,
  loadConnectome,
} from "../src/headless/connectome-runtime.mjs";
import "../src/brain/fly-skill-v7.js";
import "../src/brain/fly-skill-v11h2-jump.js";

const STEP_SECONDS = 0.02;
const SETTLE_STEPS = 26;
const BASELINE_STEPS = 26;
const MOVE_WINDOW_STEPS = 26;
const JUMP_WINDOW_STEPS = 5;
const MAX_STEPS = Math.round(4.5 / STEP_SECONDS);
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
const TARGET_REACH_RADIUS = 42;
const OBSTACLE_VISUAL_RADIUS = 280;
const TARGET_OFFSET = 160;
const DISTANCES = [155, 195, 235, 275];
const FINAL_BASE_SEEDS = [2251000, 2261000, 2271000];

const movementApi = globalThis.MapleFlySkillV7;
const movementSkill = movementApi.BUNDLED_STATE;
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
    throw new Error(`DN contract mismatch ${allDn.length}`);
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

function sparseJumpFeature(currentRate, baselineRate) {
  return Float64Array.from(
    jumpSkill.runtimeDnIndices,
    (dnIndex) => clamp(
      (currentRate[dnIndex] - baselineRate[dnIndex]) / 50,
      -1,
      1,
    ),
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

    drive[`LC10a_${side}`] = clamp(0.12 + closeness * 0.68, 0, 0.8);
    drive[`LPLC1_${side}`] = clamp(
      closeness * 0.12 + approaching * 0.32,
      0,
      0.55,
    );
    drive[`LPLC2_${side}`] = clamp(
      closeness * 0.24 + approaching * 0.38,
      0,
      0.8,
    );

    if (distance < 175) {
      drive[`LC4_${side}`] = clamp(
        ((175 - distance) / 175) * 0.72 + approaching * 0.18,
        0,
        0.8,
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
      const passed =
        obstacle.side === "R"
          ? playerX > obstacle.x + obstacle.width
          : playerX + PLAYER_WIDTH < obstacle.x;

      if (!passed) {
        const obstacleDrive = clamp(
          ((OBSTACLE_VISUAL_RADIUS - Math.max(0, frontDistance)) /
            OBSTACLE_VISUAL_RADIUS) * 0.8,
          0,
          0.8,
        );
        for (const type of ["LC6", "LC16", "LC22", "LPLC4"]) {
          drive[`${type}_${obstacle.side}`] = obstacleDrive;
        }
      }
    }

    return drive;
  }
}

function makeGeometry({ side, startDistance, withObstacle }) {
  const startCenter = WORLD_WIDTH / 2;
  const playerX = startCenter - PLAYER_WIDTH / 2;
  const sideSign = side === "L" ? -1 : 1;
  let obstacle = null;
  let targetX;

  if (withObstacle) {
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
  } else {
    const matchedTargetDistance =
      startDistance + PLAYER_WIDTH / 2 + OBSTACLE_WIDTH + TARGET_OFFSET;
    targetX = startCenter + sideSign * matchedTargetDistance;
  }

  const matchedDistance = Math.abs(targetX - startCenter);
  const expectedDistance =
    startDistance + PLAYER_WIDTH / 2 + OBSTACLE_WIDTH + TARGET_OFFSET;
  if (Math.abs(matchedDistance - expectedDistance) > 1e-9) {
    throw new Error("browser-equivalent matched geometry mismatch");
  }

  return {
    playerX,
    playerY: GROUND_Y - PLAYER_HEIGHT,
    targetX,
    obstacle,
  };
}

function makeBlock(baseSeed, withObstacle, seedOffset = 0) {
  const rows = [];
  DISTANCES.forEach((startDistance, distanceIndex) => {
    const sides = distanceIndex % 2 === 0 ? ["L", "R"] : ["R", "L"];
    for (const side of sides) {
      rows.push({
        brainSeed: baseSeed + seedOffset,
        side,
        startDistance,
        withObstacle,
      });
    }
  });
  return rows;
}

function obstacleCleared(state) {
  const obstacle = state.obstacle;
  if (!obstacle) return false;
  return obstacle.side === "R"
    ? state.playerX > obstacle.x + obstacle.width
    : state.playerX + PLAYER_WIDTH < obstacle.x;
}

function targetReached(state) {
  return Math.abs(
    state.targetX - (state.playerX + PLAYER_WIDTH / 2),
  ) <= TARGET_REACH_RADIUS;
}

function applyPhysics(state, horizontalDirection) {
  const nextX = clamp(
    state.playerX + horizontalDirection * MOVE_SPEED * STEP_SECONDS,
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
    const overlapsVertically =
      nextY < obstacle.y + obstacle.height &&
      nextY + PLAYER_HEIGHT > obstacle.y;
    const overlapsHorizontally =
      nextX < obstacle.x + obstacle.width &&
      nextX + PLAYER_WIDTH > obstacle.x;
    if (overlapsVertically && overlapsHorizontally) {
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
}

function moveDirection(action) {
  return action === "LEFT" ? -1 : action === "RIGHT" ? 1 : 0;
}

async function initializeEpisode(connectome, dnSlot, episode) {
  const geometry = makeGeometry(episode);
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
    moveAction: "IDLE",
    moveCounts: new Float64Array(DN_COUNT),
    moveSteps: 0,
    jumpCooldown: 0,
    jumpRuntime: jumpApi.createRuntime(),
  };

  for (let step = 0; step < SETTLE_STEPS; step += 1) {
    stimulate(
      brain,
      connectome.inputGroups,
      encoder.encode({ ...state, obstacleVisual: false, visualEnabled: false }),
    );
    brain.step();
  }

  const baselineCounts = new Float64Array(DN_COUNT);
  for (let step = 0; step < BASELINE_STEPS; step += 1) {
    stimulate(
      brain,
      connectome.inputGroups,
      encoder.encode({ ...state, obstacleVisual: false, visualEnabled: false }),
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

async function runEpisode(connectome, dnSlot, episode) {
  const state = await initializeEpisode(connectome, dnSlot, episode);
  let totalBrainSteps = 0;
  let actualJumps = 0;

  while (totalBrainSteps < MAX_STEPS) {
    const jumpCounts = new Float64Array(DN_COUNT);

    for (let step = 0; step < JUMP_WINDOW_STEPS; step += 1) {
      stimulate(
        state.brain,
        connectome.inputGroups,
        state.encoder.encode({
          ...state,
          obstacleVisual: episode.withObstacle,
          visualEnabled: true,
        }),
      );
      state.brain.step();
      collectDn(state.brain, dnSlot, jumpCounts);
      updateMovement(state, dnSlot);
      applyPhysics(state, moveDirection(state.moveAction));
      if (state.jumpCooldown > 0) state.jumpCooldown -= 1;
    }

    totalBrainSteps += JUMP_WINDOW_STEPS;

    if (episode.withObstacle && obstacleCleared(state)) {
      return {
        outcome: "CLEAR",
        clear: true,
        targetReach: false,
        timeout: false,
        anyJump: actualJumps > 0,
        actualJumps,
        brainSteps: totalBrainSteps,
      };
    }
    if (!episode.withObstacle && targetReached(state)) {
      return {
        outcome: "TARGET",
        clear: false,
        targetReach: true,
        timeout: false,
        anyJump: actualJumps > 0,
        actualJumps,
        brainSteps: totalBrainSteps,
      };
    }

    const sparseFeature = sparseJumpFeature(
      rate(jumpCounts, JUMP_WINDOW_STEPS),
      state.baselineRate,
    );
    const available = state.grounded && state.jumpCooldown === 0;
    const decision = jumpApi.observeSparseWindow(
      sparseFeature,
      available,
      jumpSkill,
      state.jumpRuntime,
    );

    if (decision.action === "JUMP" && available) {
      state.vy = -JUMP_VELOCITY;
      state.grounded = false;
      state.jumpCooldown = jumpSkill.cooldownBrainSteps;
      actualJumps += 1;
      jumpApi.onActuatedJump(state.jumpRuntime);
    }
  }

  return {
    outcome: "TIMEOUT",
    clear: false,
    targetReach: false,
    timeout: true,
    anyJump: actualJumps > 0,
    actualJumps,
    brainSteps: totalBrainSteps,
  };
}

async function main() {
  if (!jumpApi.validState(jumpSkill)) {
    throw new Error("deployed v11H2 bundle invalid");
  }
  if (
    jumpSkill.deploymentStatus !== "DEPLOYED" ||
    jumpSkill.provenance.h2.runId !== 35748844599 ||
    jumpSkill.provenance.h2.artifactId !== 10704546925 ||
    jumpSkill.sensory.obstacleUsesLC4 !== false ||
    jumpSkill.sparseFeatureCount !== 96 ||
    jumpSkill.temporalWindows !== 4 ||
    jumpSkill.threshold !== 0.5 ||
    jumpSkill.persistenceWindows !== 2 ||
    jumpSkill.cooldownBrainSteps !== 38
  ) {
    throw new Error("deployed v11H2 contract mismatch");
  }

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
      if (!group.length) throw new Error(`${channel}_${side} missing`);
      connectome.inputGroups.set(`${channel}_${side}`, group);
    }
  }

  const perSeed = [];
  for (const baseSeed of FINAL_BASE_SEEDS) {
    const obstacleRows = [];
    for (const episode of makeBlock(baseSeed, true)) {
      obstacleRows.push(await runEpisode(connectome, dnSlot, episode));
    }
    const targetRows = [];
    for (const episode of makeBlock(baseSeed, false, 7000)) {
      targetRows.push(await runEpisode(connectome, dnSlot, episode));
    }

    const row = {
      baseSeed,
      obstacleEpisodes: obstacleRows.length,
      clearRate: mean(obstacleRows.map((x) => Number(x.clear))),
      timeoutRate: mean(obstacleRows.map((x) => Number(x.timeout))),
      meanJumps: mean(obstacleRows.map((x) => x.actualJumps)),
      targetEpisodes: targetRows.length,
      targetReachRate: mean(targetRows.map((x) => Number(x.targetReach))),
      targetAnyJumpRate: mean(targetRows.map((x) => Number(x.anyJump))),
      obstacleRows,
      targetRows,
    };
    perSeed.push(row);
    console.log(
      `[v11h2-browser-smoke] seed=${baseSeed} ` +
      `FULL=${(row.clearRate * 100).toFixed(1)}% ` +
      `timeout=${(row.timeoutRate * 100).toFixed(1)}% ` +
      `jumps=${row.meanJumps.toFixed(3)} ` +
      `TARGET=${(row.targetReachRate * 100).toFixed(1)}% ` +
      `falseJump=${(row.targetAnyJumpRate * 100).toFixed(1)}%`,
    );
  }

  const summary = {
    meanFullClearRate: mean(perSeed.map((x) => x.clearRate)),
    minFullClearRate: Math.min(...perSeed.map((x) => x.clearRate)),
    meanFullTimeoutRate: mean(perSeed.map((x) => x.timeoutRate)),
    meanFullActualJumps: mean(perSeed.map((x) => x.meanJumps)),
    targetReachRate: mean(perSeed.map((x) => x.targetReachRate)),
    targetAnyJumpRate: mean(perSeed.map((x) => x.targetAnyJumpRate)),
  };

  const deterministicRegression =
    summary.meanFullClearRate === 1 &&
    summary.minFullClearRate === 1 &&
    summary.meanFullTimeoutRate === 0 &&
    summary.targetReachRate === 1 &&
    summary.targetAnyJumpRate === 0;

  const output = {
    schema: "maplefly.v11h2.browser-deployment-smoke.1",
    purpose:
      "Deterministic deployment regression on a frozen subset of H2 final seeds; not a new scientific gate.",
    provenance: jumpSkill.provenance,
    browserContract: {
      targetDistance: "abs(dx)",
      matchedTargetGeometry: true,
      obstacleChannels: ["LC6", "LC16", "LC22", "LPLC4"],
      obstacleUsesLC4: false,
      sparseFeatureCount: jumpSkill.sparseFeatureCount,
      temporalWindows: jumpSkill.temporalWindows,
      threshold: jumpSkill.threshold,
      persistenceWindows: jumpSkill.persistenceWindows,
      cooldownBrainSteps: jumpSkill.cooldownBrainSteps,
    },
    seeds: FINAL_BASE_SEEDS,
    distances: DISTANCES,
    episodesPerSeed: { obstacle: 8, targetOnly: 8 },
    summary,
    deterministicRegression,
    perSeed,
  };

  const outDir = resolve("results/verify-v11h2-browser-deployment");
  await mkdir(outDir, { recursive: true });
  await writeFile(
    resolve(outDir, "v11h2-browser-deployment-smoke.json"),
    JSON.stringify(output, null, 2) + "\n",
  );

  console.log(
    `V11H2-BROWSER-DEPLOYMENT-SMOKE=${deterministicRegression ? "PASS" : "FAIL"} ` +
    `FULL=${(summary.meanFullClearRate * 100).toFixed(1)}% ` +
    `timeout=${(summary.meanFullTimeoutRate * 100).toFixed(1)}% ` +
    `jumps=${summary.meanFullActualJumps.toFixed(3)} ` +
    `TARGET=${(summary.targetReachRate * 100).toFixed(1)}% ` +
    `falseJump=${(summary.targetAnyJumpRate * 100).toFixed(1)}%`,
  );

  if (!deterministicRegression) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
