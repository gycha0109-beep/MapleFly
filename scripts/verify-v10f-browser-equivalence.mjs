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

const STEP_SECONDS = 0.02;
const SETTLE_STEPS = 26;
const BASELINE_STEPS = 26;
const MOVE_WINDOW_STEPS = 26;
const ATTACK_WINDOW_STEPS = 5;
const MAX_SECONDS = 4.5;

const WORLD_WIDTH = 1000;
const PLAYER_WIDTH = 34;
const PLAYER_HEIGHT = 46;
const PLAYER_Y = 530 - PLAYER_HEIGHT;
const TARGET_BASELINE_Y = 530;
const TARGET_WIDTH = 56;
const TARGET_HEIGHT = 62;
const MOVE_SPEED = 280;
const ATTACK_RANGE = 76;

const FINAL_SEEDS = [401000, 411000, 421000];
const FINAL_DISTANCES = [185, 285, 385, 485];
const EPISODES_PER_RUN = 32;
const EXPECTED_HITS = [30, 26, 25];

const movementApi = globalThis.MapleFlySkillV7;
const attackApi = globalThis.MapleFlyAttackSkillV10;
const movementSkill = movementApi.BUNDLED_STATE;
const attackSkill = attackApi.BUNDLED_STATE;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function makeSchedule(totalEpisodes, baseSeed, distances) {
  const blockSize = distances.length * 2;
  if (totalEpisodes % blockSize !== 0) {
    throw new Error("episodes must be divisible by " + blockSize);
  }

  const rows = [];
  const blocks = totalEpisodes / blockSize;

  for (let block = 0; block < blocks; block += 1) {
    const brainSeed = baseSeed + block;
    distances.forEach((startDistance, distanceIndex) => {
      const sides =
        (block + distanceIndex) % 2 === 0
          ? ["L", "R"]
          : ["R", "L"];

      for (const side of sides) {
        rows.push({ brainSeed, side, startDistance });
      }
    });
  }

  return rows;
}

class VisualEncoder {
  constructor() {
    this.lastDistance = null;
  }

  reset() {
    this.lastDistance = null;
  }

  encode(playerX, targetX, visual = true) {
    const drive = {
      SNta_L: 0.05,
      SNta_R: 0.05,
    };

    if (!visual) {
      this.lastDistance = null;
      return drive;
    }

    const dx = targetX - (playerX + PLAYER_WIDTH / 2);
    const side = dx < 0 ? "L" : "R";
    const distance = Math.abs(dx);
    const closeness = clamp(1 - distance / 620, 0, 1);
    let approaching = 0;

    if (Number.isFinite(this.lastDistance)) {
      approaching = clamp(
        (this.lastDistance - distance) / 45,
        0,
        1,
      );
    }

    this.lastDistance = distance;

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

    return drive;
  }
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

function buildSlot(meta, allDn, relativeIndices) {
  const slot = new Int16Array(meta.n).fill(-1);
  relativeIndices.forEach((relativeIndex, index) => {
    slot[allDn[relativeIndex]] = index;
  });
  return slot;
}

function accumulate(brain, slot, counts) {
  for (let fired = 0; fired < brain.firedCount; fired += 1) {
    const index = slot[brain.fired[fired]];
    if (index >= 0) {
      counts[index] += 1;
    }
  }
}

function movementDecision(counts, baselineHz) {
  const seconds = MOVE_WINDOW_STEPS * STEP_SECONDS;
  const feature = new Float64Array(counts.length);
  let normSquared = 0;

  for (let index = 0; index < counts.length; index += 1) {
    const currentHz = counts[index] / seconds;
    const delta = (currentHz - baselineHz[index]) / 50;
    feature[index] = delta;
    normSquared += delta * delta;
  }

  const norm = Math.sqrt(normSquared);
  if (norm <= 1e-9) {
    return "IDLE";
  }

  for (let index = 0; index < feature.length; index += 1) {
    feature[index] /= norm;
  }

  return movementApi.choose(feature, movementSkill).action;
}

function attackDecision(counts, baselineHz) {
  const seconds = ATTACK_WINDOW_STEPS * STEP_SECONDS;
  const feature = new Float64Array(counts.length);

  for (let index = 0; index < counts.length; index += 1) {
    const currentHz = counts[index] / seconds;
    feature[index] = clamp(
      (currentHz - baselineHz[index]) / 50,
      -1,
      1,
    );
  }

  return attackApi.chooseSparseCurrent(
    feature,
    attackSkill,
  );
}

function attackWouldHit({ playerX, targetX, facing }) {
  const attackX =
    facing > 0
      ? playerX + PLAYER_WIDTH - 2
      : playerX - ATTACK_RANGE + 2;

  const attackBox = {
    x: attackX,
    y: PLAYER_Y + 4,
    width: ATTACK_RANGE,
    height: PLAYER_HEIGHT - 8,
  };

  const targetBox = {
    x: targetX - TARGET_WIDTH / 2,
    y: TARGET_BASELINE_Y - TARGET_HEIGHT,
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

async function runEpisode({
  connectome,
  moveSlot,
  attackSlot,
  episode,
}) {
  const brain = new ConnectomeBrain(
    connectome.weights,
    connectome.meta.params,
    episode.brainSeed,
  );
  const encoder = new VisualEncoder();
  const center = WORLD_WIDTH / 2;
  const targetX =
    center +
    (episode.side === "L"
      ? -episode.startDistance
      : episode.startDistance);

  let playerX = center - PLAYER_WIDTH / 2;
  let facing = episode.side === "L" ? -1 : 1;

  for (let step = 0; step < SETTLE_STEPS; step += 1) {
    stimulate(
      brain,
      connectome.inputGroups,
      encoder.encode(playerX, targetX, false),
    );
    brain.step();
  }

  const moveBaselineCounts =
    new Float64Array(movementSkill.sparseFeatureCount);
  const attackBaselineCounts =
    new Float64Array(attackSkill.sparseFeatureCount);

  for (let step = 0; step < BASELINE_STEPS; step += 1) {
    stimulate(
      brain,
      connectome.inputGroups,
      encoder.encode(playerX, targetX, false),
    );
    brain.step();
    accumulate(brain, moveSlot, moveBaselineCounts);
    accumulate(brain, attackSlot, attackBaselineCounts);
  }

  const baselineSeconds =
    BASELINE_STEPS * STEP_SECONDS;
  const moveBaselineHz = Float64Array.from(
    moveBaselineCounts,
    (count) => count / baselineSeconds,
  );
  const attackBaselineHz = Float64Array.from(
    attackBaselineCounts,
    (count) => count / baselineSeconds,
  );

  encoder.reset();

  let moveCounts =
    new Float64Array(movementSkill.sparseFeatureCount);
  let attackCounts =
    new Float64Array(attackSkill.sparseFeatureCount);
  let moveSteps = 0;
  let attackSteps = 0;
  let moveAction = "IDLE";
  let closestDistance = Math.abs(
    targetX - (playerX + PLAYER_WIDTH / 2),
  );
  let firstOutcome = null;
  let firstAttackProbability = null;
  let firstStrikeStep = null;

  const maxSteps = Math.round(MAX_SECONDS / STEP_SECONDS);

  for (let step = 0; step < maxSteps; step += 1) {
    stimulate(
      brain,
      connectome.inputGroups,
      encoder.encode(playerX, targetX, true),
    );
    brain.step();
    accumulate(brain, moveSlot, moveCounts);
    accumulate(brain, attackSlot, attackCounts);

    const direction =
      moveAction === "LEFT"
        ? -1
        : moveAction === "RIGHT"
          ? 1
          : 0;

    if (direction !== 0) {
      facing = direction;
    }

    playerX = clamp(
      playerX +
        direction * MOVE_SPEED * STEP_SECONDS,
      0,
      WORLD_WIDTH - PLAYER_WIDTH,
    );

    const distance = Math.abs(
      targetX - (playerX + PLAYER_WIDTH / 2),
    );
    closestDistance = Math.min(closestDistance, distance);

    moveSteps += 1;
    attackSteps += 1;

    if (moveSteps >= MOVE_WINDOW_STEPS) {
      moveAction = movementDecision(
        moveCounts,
        moveBaselineHz,
      );
      moveCounts =
        new Float64Array(movementSkill.sparseFeatureCount);
      moveSteps = 0;
    }

    if (attackSteps >= ATTACK_WINDOW_STEPS) {
      const decision = attackDecision(
        attackCounts,
        attackBaselineHz,
      );
      attackCounts =
        new Float64Array(attackSkill.sparseFeatureCount);
      attackSteps = 0;

      if (
        decision.action === "ATTACK" &&
        firstOutcome === null
      ) {
        firstOutcome = attackWouldHit({
          playerX,
          targetX,
          facing,
        })
          ? "HIT"
          : "WHIFF";
        firstAttackProbability =
          decision.attackProbability;
        firstStrikeStep = step + 1;
      }
    }
  }

  return {
    outcome: firstOutcome ?? "TIMEOUT",
    movementReached: closestDistance <= 115,
    attackProbability: firstAttackProbability,
    strikeStep: firstStrikeStep,
  };
}

async function verifyStaticContract() {
  const candidate = JSON.parse(
    await readFile(
      new URL(
        "../src/brain/fly-skill-v10f-candidate.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );

  if (
    attackSkill.version !== candidate.version ||
    attackSkill.sourceRun !== candidate.sourceRun ||
    attackSkill.sourceArtifact !== candidate.sourceArtifact ||
    attackSkill.sourceArtifactDigest !==
      candidate.sourceArtifactDigest ||
    JSON.stringify(attackSkill.selectedIndices) !==
      JSON.stringify(candidate.selectedIndices) ||
    JSON.stringify(attackSkill.weights) !==
      JSON.stringify(candidate.weights) ||
    attackSkill.bias !== candidate.bias
  ) {
    throw new Error(
      "browser ATTACK bundle does not exactly match frozen v10F candidate",
    );
  }

  const [worker, controller, index] = await Promise.all([
    readFile(
      new URL("../src/brain/fly-worker.js", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../src/brain/fly-controller.js", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../index.html", import.meta.url),
      "utf8",
    ),
  ]);

  const attackScript =
    "./src/brain/fly-skill-v10-attack.js";
  const controllerScript =
    "./src/brain/fly-controller.js";

  if (
    !worker.includes('type: "skill-window"') ||
    !worker.includes(
      "sampler.steps >= sampler.windowSteps",
    ) ||
    !controller.includes("attackWindowSteps: 5") ||
    !controller.includes(
      "attackSkillApi.chooseSparseCurrent",
    ) ||
    !controller.includes(
      'id: "attack-baseline"',
    ) ||
    !controller.includes(
      'reason: "live"',
    ) ||
    !controller.includes(
      "decisionStep === this.attackSkillDecisionStep",
    ) ||
    index.indexOf(attackScript) < 0 ||
    index.indexOf(controllerScript) < 0 ||
    index.indexOf(attackScript) >
      index.indexOf(controllerScript)
  ) {
    throw new Error(
      "browser exact-window deployment contract mismatch",
    );
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

  const allDn = cells(
    connectome.meta,
    ["descending_neuron", "descending_neuron_tbc"],
  );

  if (
    allDn.length !== movementSkill.originalFeatureCount ||
    allDn.length !== attackSkill.originalFeatureCount
  ) {
    throw new Error(
      "DN contract mismatch: " + allDn.length,
    );
  }

  const moveSlot = buildSlot(
    connectome.meta,
    allDn,
    movementSkill.featureIndices,
  );
  const attackSlot = buildSlot(
    connectome.meta,
    allDn,
    attackSkill.selectedIndices,
  );

  const runs = [];

  for (let run = 0; run < FINAL_SEEDS.length; run += 1) {
    const schedule = makeSchedule(
      EPISODES_PER_RUN,
      FINAL_SEEDS[run],
      FINAL_DISTANCES,
    );
    const rows = [];

    for (let index = 0; index < schedule.length; index += 1) {
      rows.push(
        await runEpisode({
          connectome,
          moveSlot,
          attackSlot,
          episode: schedule[index],
        }),
      );

      if ((index + 1) % 8 === 0) {
        console.log(
          "[browser-equivalence] run=" +
          (run + 1) +
          " " +
          (index + 1) +
          "/" +
          schedule.length,
        );
        await new Promise((resolve) =>
          setImmediate(resolve),
        );
      }
    }

    const hits = rows.filter(
      (row) => row.outcome === "HIT",
    ).length;
    const whiffs = rows.filter(
      (row) => row.outcome === "WHIFF",
    ).length;
    const timeouts = rows.filter(
      (row) => row.outcome === "TIMEOUT",
    ).length;
    const movementReach =
      rows.filter((row) => row.movementReached).length /
      rows.length;

    if (hits !== EXPECTED_HITS[run]) {
      throw new Error(
        "v10F browser equivalence mismatch run " +
        (run + 1) +
        ": hits=" +
        hits +
        " expected=" +
        EXPECTED_HITS[run],
      );
    }

    runs.push({
      run: run + 1,
      seed: FINAL_SEEDS[run],
      hits,
      whiffs,
      timeouts,
      hitRate: hits / rows.length,
      whiffRate: whiffs / rows.length,
      timeoutRate: timeouts / rows.length,
      movementReachRate: movementReach,
    });
  }

  const meanHit =
    runs.reduce((sum, run) => sum + run.hitRate, 0) /
    runs.length;
  const meanWhiff =
    runs.reduce((sum, run) => sum + run.whiffRate, 0) /
    runs.length;

  if (
    Math.abs(meanHit - 0.84375) > 1e-12 ||
    Math.abs(meanWhiff - 0.15625) > 1e-12 ||
    runs.some((run) => run.movementReachRate !== 1)
  ) {
    throw new Error(
      "v10F browser aggregate equivalence mismatch",
    );
  }

  const output = {
    schema:
      "maplefly.verify-v10f-browser-equivalence.1",
    brainCommit: SOURCE.commit,
    movementVersion: movementSkill.version,
    attackVersion: attackSkill.version,
    exactWindows: {
      settle: SETTLE_STEPS,
      baseline: BASELINE_STEPS,
      movement: MOVE_WINDOW_STEPS,
      attack: ATTACK_WINDOW_STEPS,
    },
    expectedSourceRun: 35516619170,
    summary: {
      meanHitRate: meanHit,
      meanWhiffRate: meanWhiff,
      gateEquivalent: true,
    },
    runs,
  };

  await mkdir(
    resolve("results/verify-v10f-browser"),
    { recursive: true },
  );
  await writeFile(
    resolve(
      "results/verify-v10f-browser/equivalence.json",
    ),
    JSON.stringify(output, null, 2) + "\n",
  );

  console.log(
    "V10F-BROWSER-EQUIVALENCE=PASS FULL=" +
    (meanHit * 100).toFixed(1) +
    "% whiff=" +
    (meanWhiff * 100).toFixed(1) +
    "%",
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
