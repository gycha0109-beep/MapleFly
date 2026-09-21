#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
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

const movementApi = globalThis.MapleFlySkillV7;
const attackApi = globalThis.MapleFlyAttackSkillV10;
const movementSkill = movementApi.BUNDLED_STATE;
const attackSkill = attackApi.BUNDLED_STATE;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function mean(values) {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) /
        values.length
    : 0;
}

function percent(value) {
  return (value * 100).toFixed(1) + "%";
}

function sigmoid(value) {
  const bounded = clamp(value, -30, 30);
  return 1 / (1 + Math.exp(-bounded));
}

function mulberry32(seed) {
  let state = Math.trunc(Number(seed) || 0) >>> 0;
  return function random() {
    let t = (state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function permutation(length, seed) {
  const values = Array.from(
    { length },
    (_, index) => index,
  );
  const random = mulberry32(seed);
  for (
    let index = values.length - 1;
    index > 0;
    index -= 1
  ) {
    const swap = Math.floor(
      random() * (index + 1),
    );
    [values[index], values[swap]] = [
      values[swap],
      values[index],
    ];
  }
  return values;
}

function makeSchedule(totalEpisodes, baseSeed, distances) {
  const blockSize = distances.length * 2;
  if (totalEpisodes % blockSize !== 0) {
    throw new Error(
      "episodes must be divisible by " + blockSize,
    );
  }

  const rows = [];
  const blocks = totalEpisodes / blockSize;

  for (let block = 0; block < blocks; block += 1) {
    const brainSeed = baseSeed + block;
    distances.forEach(
      (startDistance, distanceIndex) => {
        const sides =
          (block + distanceIndex) % 2 === 0
            ? ["L", "R"]
            : ["R", "L"];
        for (const side of sides) {
          rows.push({
            brainSeed,
            side,
            startDistance,
          });
        }
      },
    );
  }

  return rows;
}

class VisualEncoderNoTargetLc4 {
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

    const dx =
      targetX - (playerX + PLAYER_WIDTH / 2);
    const side = dx < 0 ? "L" : "R";
    const distance = Math.abs(dx);
    const closeness = clamp(
      1 - distance / 620,
      0,
      1,
    );
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

    return drive;
  }
}

function stimulate(brain, inputGroups, drive) {
  for (const [name, amount] of Object.entries(drive)) {
    if (!amount) continue;
    const indices = inputGroups.get(name);
    if (indices?.length) {
      brain.stimulate(indices, amount);
    }
  }
}

function buildSlot(meta, allDn, relativeIndices) {
  const slot = new Int16Array(meta.n).fill(-1);
  relativeIndices.forEach(
    (relativeIndex, index) => {
      slot[allDn[relativeIndex]] = index;
    },
  );
  return slot;
}

function accumulate(brain, slot, counts) {
  for (
    let fired = 0;
    fired < brain.firedCount;
    fired += 1
  ) {
    const index = slot[brain.fired[fired]];
    if (index >= 0) {
      counts[index] += 1;
    }
  }
}

function movementDecision(counts, baselineHz) {
  const seconds =
    MOVE_WINDOW_STEPS * STEP_SECONDS;
  const feature = new Float64Array(
    counts.length,
  );
  let normSquared = 0;

  for (
    let index = 0;
    index < counts.length;
    index += 1
  ) {
    const currentHz =
      counts[index] / seconds;
    const delta =
      (currentHz - baselineHz[index]) / 50;
    feature[index] = delta;
    normSquared += delta * delta;
  }

  const norm = Math.sqrt(normSquared);
  if (norm <= 1e-9) {
    return "IDLE";
  }
  for (
    let index = 0;
    index < feature.length;
    index += 1
  ) {
    feature[index] /= norm;
  }
  return movementApi.choose(
    feature,
    movementSkill,
  ).action;
}

function attackFeature(counts, baselineHz) {
  const seconds =
    ATTACK_WINDOW_STEPS * STEP_SECONDS;
  const feature = new Float64Array(
    counts.length,
  );

  for (
    let index = 0;
    index < counts.length;
    index += 1
  ) {
    const currentHz =
      counts[index] / seconds;
    feature[index] = clamp(
      (currentHz - baselineHz[index]) / 50,
      -1,
      1,
    );
  }

  return feature;
}

function attackWouldHit({
  playerX,
  targetX,
  facing,
}) {
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
    attackBox.x <
      targetBox.x + targetBox.width &&
    attackBox.x + attackBox.width >
      targetBox.x &&
    attackBox.y <
      targetBox.y + targetBox.height &&
    attackBox.y + attackBox.height >
      targetBox.y
  );
}

async function traceEpisode({
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
  const encoder =
    new VisualEncoderNoTargetLc4();
  const center = WORLD_WIDTH / 2;
  const targetX =
    center +
    (episode.side === "L"
      ? -episode.startDistance
      : episode.startDistance);

  let playerX =
    center - PLAYER_WIDTH / 2;
  let facing =
    episode.side === "L" ? -1 : 1;

  for (
    let step = 0;
    step < SETTLE_STEPS;
    step += 1
  ) {
    stimulate(
      brain,
      connectome.inputGroups,
      encoder.encode(
        playerX,
        targetX,
        false,
      ),
    );
    brain.step();
  }

  const moveBaselineCounts =
    new Float64Array(
      movementSkill.sparseFeatureCount,
    );
  const attackBaselineCounts =
    new Float64Array(
      attackSkill.sparseFeatureCount,
    );

  for (
    let step = 0;
    step < BASELINE_STEPS;
    step += 1
  ) {
    stimulate(
      brain,
      connectome.inputGroups,
      encoder.encode(
        playerX,
        targetX,
        false,
      ),
    );
    brain.step();
    accumulate(
      brain,
      moveSlot,
      moveBaselineCounts,
    );
    accumulate(
      brain,
      attackSlot,
      attackBaselineCounts,
    );
  }

  const baselineSeconds =
    BASELINE_STEPS * STEP_SECONDS;
  const moveBaselineHz =
    Float64Array.from(
      moveBaselineCounts,
      (count) => count / baselineSeconds,
    );
  const attackBaselineHz =
    Float64Array.from(
      attackBaselineCounts,
      (count) => count / baselineSeconds,
    );

  encoder.reset();

  let moveCounts =
    new Float64Array(
      movementSkill.sparseFeatureCount,
    );
  let attackCounts =
    new Float64Array(
      attackSkill.sparseFeatureCount,
    );
  let moveSteps = 0;
  let attackSteps = 0;
  let moveAction = "IDLE";
  let closestDistance = Math.abs(
    targetX -
      (playerX + PLAYER_WIDTH / 2),
  );
  const decisions = [];

  const maxSteps = Math.round(
    MAX_SECONDS / STEP_SECONDS,
  );

  for (
    let step = 0;
    step < maxSteps;
    step += 1
  ) {
    stimulate(
      brain,
      connectome.inputGroups,
      encoder.encode(
        playerX,
        targetX,
        true,
      ),
    );
    brain.step();
    accumulate(
      brain,
      moveSlot,
      moveCounts,
    );
    accumulate(
      brain,
      attackSlot,
      attackCounts,
    );

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
        direction *
          MOVE_SPEED *
          STEP_SECONDS,
      0,
      WORLD_WIDTH - PLAYER_WIDTH,
    );

    const distance = Math.abs(
      targetX -
        (playerX + PLAYER_WIDTH / 2),
    );
    closestDistance = Math.min(
      closestDistance,
      distance,
    );

    moveSteps += 1;
    attackSteps += 1;

    if (
      moveSteps >= MOVE_WINDOW_STEPS
    ) {
      moveAction = movementDecision(
        moveCounts,
        moveBaselineHz,
      );
      moveCounts =
        new Float64Array(
          movementSkill.sparseFeatureCount,
        );
      moveSteps = 0;
    }

    if (
      attackSteps >= ATTACK_WINDOW_STEPS
    ) {
      decisions.push({
        feature: attackFeature(
          attackCounts,
          attackBaselineHz,
        ),
        playerX,
        targetX,
        facing,
        distance,
        closestDistance,
        time:
          (step + 1) * STEP_SECONDS,
      });
      attackCounts =
        new Float64Array(
          attackSkill.sparseFeatureCount,
        );
      attackSteps = 0;
    }
  }

  return {
    movementReached:
      closestDistance <= 115,
    decisions,
  };
}

function scoreTrace(
  trace,
  condition,
  perm,
) {
  let maxAttackProbability = 0;

  for (const decision of trace.decisions) {
    const attackProbability =
      condition === "NEURAL_OFF"
        ? sigmoid(attackSkill.bias)
        : attackApi.probabilitySparseCurrent(
            decision.feature,
            attackSkill,
            condition === "DN_SHUFFLED"
              ? perm
              : null,
          );

    maxAttackProbability = Math.max(
      maxAttackProbability,
      attackProbability,
    );

    if (
      attackProbability <
      attackSkill.attackThreshold
    ) {
      continue;
    }

    const hit = attackWouldHit({
      playerX: decision.playerX,
      targetX: decision.targetX,
      facing: decision.facing,
    });

    return {
      outcome: hit ? "HIT" : "WHIFF",
      movementReached:
        decision.closestDistance <= 115,
      terminalTime: decision.time,
      terminalDistance:
        decision.distance,
      maxAttackProbability,
    };
  }

  return {
    outcome: "TIMEOUT",
    movementReached:
      trace.movementReached,
    terminalTime: MAX_SECONDS,
    terminalDistance: null,
    maxAttackProbability,
  };
}

function summarize(rows) {
  const hits = rows.filter(
    (row) => row.outcome === "HIT",
  );
  const whiffs = rows.filter(
    (row) => row.outcome === "WHIFF",
  );
  const timeouts = rows.filter(
    (row) => row.outcome === "TIMEOUT",
  );

  return {
    hitRate: hits.length / rows.length,
    whiffRate:
      whiffs.length / rows.length,
    timeoutRate:
      timeouts.length / rows.length,
    movementReachRate: mean(
      rows.map((row) =>
        row.movementReached ? 1 : 0,
      ),
    ),
  };
}

async function main() {
  const connectome = await loadConnectome({
    cacheDir: resolve(
      ".cache/maplefly-connectome",
    ),
    onProgress(message) {
      console.log("[connectome] " + message);
    },
  });

  const allDn = cells(
    connectome.meta,
    [
      "descending_neuron",
      "descending_neuron_tbc",
    ],
  );

  if (
    allDn.length !== 1316 ||
    allDn.length !==
      movementSkill.originalFeatureCount ||
    allDn.length !==
      attackSkill.originalFeatureCount
  ) {
    throw new Error(
      "DN contract mismatch: " +
        allDn.length,
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

  for (
    let run = 0;
    run < FINAL_SEEDS.length;
    run += 1
  ) {
    const schedule = makeSchedule(
      EPISODES_PER_RUN,
      FINAL_SEEDS[run],
      FINAL_DISTANCES,
    );
    const perm = permutation(
      attackSkill.sparseFeatureCount,
      FINAL_SEEDS[run] ^ 0xd15ea5e,
    );

    const rows = {
      FULL: [],
      NEURAL_OFF: [],
      DN_SHUFFLED: [],
    };

    for (
      let index = 0;
      index < schedule.length;
      index += 1
    ) {
      const trace = await traceEpisode({
        connectome,
        moveSlot,
        attackSlot,
        episode: schedule[index],
      });

      for (const condition of [
        "FULL",
        "NEURAL_OFF",
        "DN_SHUFFLED",
      ]) {
        rows[condition].push(
          scoreTrace(
            trace,
            condition,
            perm,
          ),
        );
      }

      if ((index + 1) % 8 === 0) {
        console.log(
          "[v10f-no-target-lc4] run=" +
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

    runs.push({
      run: run + 1,
      seed: FINAL_SEEDS[run],
      FULL: summarize(rows.FULL),
      NEURAL_OFF:
        summarize(rows.NEURAL_OFF),
      DN_SHUFFLED:
        summarize(rows.DN_SHUFFLED),
    });
  }

  const movementReach = mean(
    runs.map(
      (run) =>
        run.FULL.movementReachRate,
    ),
  );
  const fullHit = mean(
    runs.map(
      (run) => run.FULL.hitRate,
    ),
  );
  const offHit = mean(
    runs.map(
      (run) =>
        run.NEURAL_OFF.hitRate,
    ),
  );
  const shuffledHit = mean(
    runs.map(
      (run) =>
        run.DN_SHUFFLED.hitRate,
    ),
  );
  const whiff = mean(
    runs.map(
      (run) => run.FULL.whiffRate,
    ),
  );
  const timeout = mean(
    runs.map(
      (run) => run.FULL.timeoutRate,
    ),
  );

  const gate =
    movementReach >= 0.85 &&
    fullHit >= 0.70 &&
    fullHit - offHit >= 0.25 &&
    fullHit - shuffledHit >= 0.20 &&
    whiff <= 0.30 &&
    timeout <= 0.25 &&
    runs.every(
      (run) =>
        run.FULL.hitRate >= 0.60,
    );

  const summary = {
    meanMovementReachRate:
      movementReach,
    meanFullHitRate: fullHit,
    meanNeuralOffHitRate: offHit,
    neuralContribution:
      fullHit - offHit,
    meanDnShuffledHitRate:
      shuffledHit,
    neuronIdentityContribution:
      fullHit - shuffledHit,
    meanFullWhiffRate: whiff,
    meanFullTimeoutRate: timeout,
    gate,
  };

  const output = {
    schema:
      "maplefly.verify-v10f-target-lc4-ablation.1",
    brainCommit: SOURCE.commit,
    attackVersion:
      attackSkill.version,
    ablation: {
      targetLc4: false,
      retainedTargetCues: [
        "LC10a",
        "LPLC1",
        "LPLC2",
      ],
    },
    finalSeeds: FINAL_SEEDS,
    finalDistances:
      FINAL_DISTANCES,
    summary,
    runs,
  };

  await mkdir(
    resolve(
      "results/verify-v10f-target-lc4-ablation",
    ),
    { recursive: true },
  );
  await writeFile(
    resolve(
      "results/verify-v10f-target-lc4-ablation/result.json",
    ),
    JSON.stringify(output, null, 2) +
      "\n",
  );

  console.log(
    "V10F-TARGET-LC4-ABLATION=" +
      (gate ? "PASS" : "FAIL") +
      " FULL=" +
      percent(fullHit) +
      " OFF=" +
      percent(offHit) +
      " SHUFFLED=" +
      percent(shuffledHit) +
      " WHIFF=" +
      percent(whiff) +
      " TIMEOUT=" +
      percent(timeout) +
      " MOVE=" +
      percent(movementReach),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
