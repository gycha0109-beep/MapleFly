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

const STEP_SECONDS = 0.02;
const MOVE_WINDOW_STEPS = 26;
const ATTACK_WINDOW_STEPS = 5;
const SETTLE_STEPS = 26;
const BASELINE_STEPS = 26;

const WORLD_WIDTH = 1000;
const PLAYER_WIDTH = 34;
const PLAYER_HEIGHT = 46;
const PLAYER_Y = 530 - PLAYER_HEIGHT;
const TARGET_BASELINE_Y = 530;
const TARGET_WIDTH = 56;
const TARGET_HEIGHT = 62;
const MOVE_SPEED = 280;
const ATTACK_RANGE = 76;

const PRACTICE_SEEDS = Object.freeze([181000, 191000, 201000]);
const PRACTICE_DISTANCES = Object.freeze([135, 235, 335, 435]);
const FINAL_SEEDS = Object.freeze([251000, 261000, 271000]);
const FINAL_DISTANCES = Object.freeze([175, 275, 375, 465]);

const PRACTICE_EPISODES = 96;
const FINAL_EPISODES = 32;
const MAX_SECONDS = 4.5;
const ATTACK_THRESHOLD = 0.5;
const REPLAY_BATCH = 32;
const LEARNING_RATE = 0.01;
const WEIGHT_ANCHOR = 0.10;
const BIAS_ANCHOR = 0.10;

const OUT_DIR = "results/experiment-v10e";
const CACHE_DIR = ".cache/maplefly-connectome";
const CANDIDATE_PATH = "src/brain/fly-skill-v10d-candidate.json";

const movementApi = globalThis.MapleFlySkillV7;
const movementSkill = movementApi.BUNDLED_STATE;

function mulberry32(seed) {
  let state = Math.trunc(Number(seed) || 0) >>> 0;
  return function random() {
    let t = (state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function mean(values) {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;
}

function percent(value) {
  return (value * 100).toFixed(1) + "%";
}

function sigmoid(value) {
  const bounded = clamp(value, -30, 30);
  return 1 / (1 + Math.exp(-bounded));
}

function dot(weights, feature) {
  let total = 0;
  for (let index = 0; index < weights.length; index += 1) {
    total += weights[index] * feature[index];
  }
  return total;
}

function makeSlotMap(n, indices) {
  const map = new Int32Array(n).fill(-1);
  indices.forEach((index, slot) => {
    map[index] = slot;
  });
  return map;
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

function collectDn(brain, dnSlot, counts) {
  for (let fired = 0; fired < brain.firedCount; fired += 1) {
    const slot = dnSlot[brain.fired[fired]];
    if (slot >= 0) {
      counts[slot] += 1;
    }
  }
}

function makeRate(counts, steps) {
  const seconds = steps * STEP_SECONDS;
  return Float64Array.from(counts, (value) => value / seconds);
}

function currentFeature(current, baseline) {
  const feature = new Float64Array(current.length);
  for (let index = 0; index < current.length; index += 1) {
    feature[index] = clamp(
      (current[index] - baseline[index]) / 50,
      -1,
      1,
    );
  }
  return feature;
}

function movementChoice(currentDnRate, baselineDnRate) {
  const feature = new Float64Array(movementSkill.sparseFeatureCount);
  let normSquared = 0;

  for (
    let slot = 0;
    slot < movementSkill.featureIndices.length;
    slot += 1
  ) {
    const dnIndex = movementSkill.featureIndices[slot];
    const delta =
      (currentDnRate[dnIndex] - baselineDnRate[dnIndex]) / 50;
    feature[slot] = delta;
    normSquared += delta * delta;
  }

  const norm = Math.sqrt(normSquared);
  if (norm <= 1e-9) {
    return "IDLE";
  }

  for (let slot = 0; slot < feature.length; slot += 1) {
    feature[slot] /= norm;
  }

  return movementApi.choose(feature, movementSkill).action;
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
        rows.push({
          brainSeed,
          side,
          startDistance,
        });
      }
    });
  }

  return rows;
}

function permutation(length, seed) {
  const values = Array.from({ length }, (_, index) => index);
  const random = mulberry32(seed);
  for (let index = values.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [values[index], values[swap]] = [values[swap], values[index]];
  }
  return values;
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

class AttackClassifier {
  constructor(state) {
    this.selectedIndices = Int32Array.from(state.selectedIndices);
    this.means = Float64Array.from(state.means);
    this.scales = Float64Array.from(state.scales);
    this.weights = Float64Array.from(state.weights);
    this.bias = state.bias;
    this.anchorWeights = Float64Array.from(state.weights);
    this.anchorBias = state.bias;
  }

  transform(rawFeature) {
    const output = new Float64Array(this.selectedIndices.length);
    for (let slot = 0; slot < output.length; slot += 1) {
      const dnIndex = this.selectedIndices[slot];
      output[slot] = clamp(
        (rawFeature[dnIndex] - this.means[slot]) /
          this.scales[slot],
        -5,
        5,
      );
    }
    return output;
  }

  probability(rawFeature, neural = true, perm = null) {
    if (!neural) {
      return sigmoid(this.bias);
    }

    let score = this.bias;
    for (let slot = 0; slot < this.weights.length; slot += 1) {
      const sourceSlot = perm ? perm[slot] : slot;
      const dnIndex = this.selectedIndices[sourceSlot];
      const standardized = clamp(
        (rawFeature[dnIndex] - this.means[slot]) /
          this.scales[slot],
        -5,
        5,
      );
      score += this.weights[slot] * standardized;
    }

    return sigmoid(score);
  }

  updateFromReplay(pool, random) {
    if (pool.length < REPLAY_BATCH) {
      return false;
    }

    const gradient = new Float64Array(this.weights.length);
    let biasGradient = 0;

    for (let item = 0; item < REPLAY_BATCH; item += 1) {
      const sample = pool[Math.floor(random() * pool.length)];
      const probability = sigmoid(
        this.bias + dot(this.weights, sample.feature),
      );
      const error = probability - sample.label;
      biasGradient += error;

      for (let slot = 0; slot < gradient.length; slot += 1) {
        gradient[slot] += error * sample.feature[slot];
      }
    }

    const inv = 1 / REPLAY_BATCH;
    this.bias -=
      LEARNING_RATE *
      (
        biasGradient * inv +
        BIAS_ANCHOR * (this.bias - this.anchorBias)
      );

    for (let slot = 0; slot < this.weights.length; slot += 1) {
      this.weights[slot] -=
        LEARNING_RATE *
        (
          gradient[slot] * inv +
          WEIGHT_ANCHOR *
            (this.weights[slot] - this.anchorWeights[slot])
        );
    }

    return true;
  }

  serialize() {
    return {
      selectedIndices: Array.from(this.selectedIndices),
      means: Array.from(this.means),
      scales: Array.from(this.scales),
      weights: Array.from(this.weights),
      bias: this.bias,
      attackThreshold: ATTACK_THRESHOLD,
    };
  }
}

function validateCandidate(state) {
  if (
    state?.schema !== "maplefly.fly-attack-candidate.v10d.1" ||
    state.originalFeatureCount !== 1316 ||
    state.sparseFeatureCount !== 128 ||
    state.attackThreshold !== ATTACK_THRESHOLD ||
    !Array.isArray(state.selectedIndices) ||
    state.selectedIndices.length !== 128 ||
    !Array.isArray(state.means) ||
    state.means.length !== 128 ||
    !Array.isArray(state.scales) ||
    state.scales.length !== 128 ||
    !Array.isArray(state.weights) ||
    state.weights.length !== 128 ||
    !Number.isFinite(state.bias)
  ) {
    throw new Error("Phase D candidate contract mismatch");
  }
}

async function initializeEpisode(connectome, dnSlot, dnCount, episode) {
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

  const baselineCounts = new Float64Array(dnCount);
  for (let step = 0; step < BASELINE_STEPS; step += 1) {
    stimulate(
      brain,
      connectome.inputGroups,
      encoder.encode(playerX, targetX, false),
    );
    brain.step();
    collectDn(brain, dnSlot, baselineCounts);
  }

  encoder.reset();

  return {
    brain,
    encoder,
    playerX,
    targetX,
    facing,
    moveAction: "IDLE",
    baseline: makeRate(baselineCounts, BASELINE_STEPS),
  };
}

async function practiceEpisode({
  connectome,
  dnSlot,
  dnCount,
  episode,
  classifier,
}) {
  const state = await initializeEpisode(
    connectome,
    dnSlot,
    dnCount,
    episode,
  );

  let attackCounts = new Float64Array(dnCount);
  let moveCounts = new Float64Array(dnCount);
  let attackSteps = 0;
  let moveSteps = 0;
  let closestDistance = Math.abs(
    state.targetX - (state.playerX + PLAYER_WIDTH / 2),
  );

  const maxSteps = Math.round(MAX_SECONDS / STEP_SECONDS);

  for (let step = 0; step < maxSteps; step += 1) {
    stimulate(
      state.brain,
      connectome.inputGroups,
      state.encoder.encode(
        state.playerX,
        state.targetX,
        true,
      ),
    );
    state.brain.step();

    collectDn(state.brain, dnSlot, attackCounts);
    collectDn(state.brain, dnSlot, moveCounts);

    const direction =
      state.moveAction === "LEFT"
        ? -1
        : state.moveAction === "RIGHT"
          ? 1
          : 0;

    if (direction !== 0) {
      state.facing = direction;
    }

    state.playerX = clamp(
      state.playerX +
        direction * MOVE_SPEED * STEP_SECONDS,
      0,
      WORLD_WIDTH - PLAYER_WIDTH,
    );

    const distance = Math.abs(
      state.targetX -
        (state.playerX + PLAYER_WIDTH / 2),
    );
    closestDistance = Math.min(
      closestDistance,
      distance,
    );

    attackSteps += 1;
    moveSteps += 1;

    if (moveSteps >= MOVE_WINDOW_STEPS) {
      state.moveAction = movementChoice(
        makeRate(moveCounts, moveSteps),
        state.baseline,
      );
      moveCounts = new Float64Array(dnCount);
      moveSteps = 0;
    }

    if (attackSteps < ATTACK_WINDOW_STEPS) {
      continue;
    }

    const rawFeature = currentFeature(
      makeRate(attackCounts, attackSteps),
      state.baseline,
    );
    attackCounts = new Float64Array(dnCount);
    attackSteps = 0;

    const attackProbability =
      classifier.probability(rawFeature);

    if (attackProbability < ATTACK_THRESHOLD) {
      continue;
    }

    const hit = attackWouldHit({
      playerX: state.playerX,
      targetX: state.targetX,
      facing: state.facing,
    });

    return {
      outcome: hit ? "HIT" : "WHIFF",
      sample: {
        feature: classifier.transform(rawFeature),
        label: hit ? 1 : 0,
      },
      attackProbability,
      terminalTime: (step + 1) * STEP_SECONDS,
      terminalDistance: distance,
      closestDistance,
      movementReached: closestDistance <= 115,
    };
  }

  return {
    outcome: "NO_STRIKE",
    sample: null,
    attackProbability: null,
    terminalTime: MAX_SECONDS,
    terminalDistance: Math.abs(
      state.targetX -
        (state.playerX + PLAYER_WIDTH / 2),
    ),
    closestDistance,
    movementReached: closestDistance <= 115,
  };
}

async function traceEpisode({
  connectome,
  dnSlot,
  dnCount,
  episode,
}) {
  const state = await initializeEpisode(
    connectome,
    dnSlot,
    dnCount,
    episode,
  );

  let attackCounts = new Float64Array(dnCount);
  let moveCounts = new Float64Array(dnCount);
  let attackSteps = 0;
  let moveSteps = 0;
  let closestDistance = Math.abs(
    state.targetX - (state.playerX + PLAYER_WIDTH / 2),
  );
  const decisions = [];
  const maxSteps = Math.round(MAX_SECONDS / STEP_SECONDS);

  for (let step = 0; step < maxSteps; step += 1) {
    stimulate(
      state.brain,
      connectome.inputGroups,
      state.encoder.encode(
        state.playerX,
        state.targetX,
        true,
      ),
    );
    state.brain.step();

    collectDn(state.brain, dnSlot, attackCounts);
    collectDn(state.brain, dnSlot, moveCounts);

    const direction =
      state.moveAction === "LEFT"
        ? -1
        : state.moveAction === "RIGHT"
          ? 1
          : 0;

    if (direction !== 0) {
      state.facing = direction;
    }

    state.playerX = clamp(
      state.playerX +
        direction * MOVE_SPEED * STEP_SECONDS,
      0,
      WORLD_WIDTH - PLAYER_WIDTH,
    );

    const distance = Math.abs(
      state.targetX -
        (state.playerX + PLAYER_WIDTH / 2),
    );
    closestDistance = Math.min(
      closestDistance,
      distance,
    );

    attackSteps += 1;
    moveSteps += 1;

    if (moveSteps >= MOVE_WINDOW_STEPS) {
      state.moveAction = movementChoice(
        makeRate(moveCounts, moveSteps),
        state.baseline,
      );
      moveCounts = new Float64Array(dnCount);
      moveSteps = 0;
    }

    if (attackSteps < ATTACK_WINDOW_STEPS) {
      continue;
    }

    const rawFeature = currentFeature(
      makeRate(attackCounts, attackSteps),
      state.baseline,
    );
    attackCounts = new Float64Array(dnCount);
    attackSteps = 0;

    decisions.push({
      feature: rawFeature,
      playerX: state.playerX,
      targetX: state.targetX,
      facing: state.facing,
      time: (step + 1) * STEP_SECONDS,
      distance,
      closestDistance,
    });
  }

  return {
    brainSeed: episode.brainSeed,
    side: episode.side,
    startDistance: episode.startDistance,
    movementReached: closestDistance <= 115,
    decisions,
  };
}

function scoreTrace(trace, classifier, condition, perm) {
  if (condition === "MOVEMENT_ONLY") {
    return {
      outcome: "TIMEOUT",
      movementReached: trace.movementReached,
      terminalTime: MAX_SECONDS,
      terminalDistance: null,
      maxAttackProbability: 0,
    };
  }

  let maxAttackProbability = 0;

  for (const decision of trace.decisions) {
    const attackProbability =
      condition === "NEURAL_OFF"
        ? classifier.probability(
            decision.feature,
            false,
          )
        : classifier.probability(
            decision.feature,
            true,
            condition === "DN_SHUFFLED"
              ? perm
              : null,
          );

    maxAttackProbability = Math.max(
      maxAttackProbability,
      attackProbability,
    );

    if (attackProbability < ATTACK_THRESHOLD) {
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
      terminalDistance: decision.distance,
      maxAttackProbability,
    };
  }

  return {
    outcome: "TIMEOUT",
    movementReached: trace.movementReached,
    terminalTime: MAX_SECONDS,
    terminalDistance: null,
    maxAttackProbability,
  };
}

function summarize(rows) {
  const hits = rows.filter((row) => row.outcome === "HIT");
  const whiffs = rows.filter((row) => row.outcome === "WHIFF");
  const timeouts = rows.filter((row) => row.outcome === "TIMEOUT");
  const strikes = [...hits, ...whiffs];

  return {
    hitRate: hits.length / rows.length,
    whiffRate: whiffs.length / rows.length,
    timeoutRate: timeouts.length / rows.length,
    movementReachRate: mean(
      rows.map((row) => (row.movementReached ? 1 : 0)),
    ),
    meanStrikeTime: strikes.length
      ? mean(strikes.map((row) => row.terminalTime))
      : null,
    meanStrikeDistance: strikes.length
      ? mean(
          strikes
            .map((row) => row.terminalDistance)
            .filter(Number.isFinite),
        )
      : null,
    rows,
  };
}

async function evaluatePaired({
  connectome,
  dnSlot,
  dnCount,
  schedule,
  before,
  after,
  perm,
}) {
  const movementRows = [];
  const beforeRows = {
    FULL: [],
    NEURAL_OFF: [],
    DN_SHUFFLED: [],
  };
  const afterRows = {
    FULL: [],
    NEURAL_OFF: [],
    DN_SHUFFLED: [],
  };

  for (let index = 0; index < schedule.length; index += 1) {
    const trace = await traceEpisode({
      connectome,
      dnSlot,
      dnCount,
      episode: schedule[index],
    });

    movementRows.push(
      scoreTrace(
        trace,
        before,
        "MOVEMENT_ONLY",
        perm,
      ),
    );

    for (const condition of [
      "FULL",
      "NEURAL_OFF",
      "DN_SHUFFLED",
    ]) {
      beforeRows[condition].push(
        scoreTrace(
          trace,
          before,
          condition,
          perm,
        ),
      );
      afterRows[condition].push(
        scoreTrace(
          trace,
          after,
          condition,
          perm,
        ),
      );
    }

    if ((index + 1) % 8 === 0) {
      console.log(
        "[paired-final] " +
        (index + 1) +
        "/" +
        schedule.length +
        " BEFORE=" +
        percent(summarize(beforeRows.FULL).hitRate) +
        " AFTER=" +
        percent(summarize(afterRows.FULL).hitRate),
      );
      await new Promise((resolve) =>
        setImmediate(resolve),
      );
    }
  }

  return {
    MOVEMENT_ONLY: summarize(movementRows),
    BEFORE: {
      FULL: summarize(beforeRows.FULL),
      NEURAL_OFF: summarize(beforeRows.NEURAL_OFF),
      DN_SHUFFLED: summarize(beforeRows.DN_SHUFFLED),
    },
    AFTER: {
      FULL: summarize(afterRows.FULL),
      NEURAL_OFF: summarize(afterRows.NEURAL_OFF),
      DN_SHUFFLED: summarize(afterRows.DN_SHUFFLED),
    },
  };
}

function summarizeVersion(runs, key) {
  const movementReach = mean(
    runs.map(
      (run) =>
        run.MOVEMENT_ONLY.movementReachRate,
    ),
  );
  const fullHit = mean(
    runs.map((run) => run[key].FULL.hitRate),
  );
  const offHit = mean(
    runs.map(
      (run) => run[key].NEURAL_OFF.hitRate,
    ),
  );
  const shuffledHit = mean(
    runs.map(
      (run) => run[key].DN_SHUFFLED.hitRate,
    ),
  );
  const whiff = mean(
    runs.map((run) => run[key].FULL.whiffRate),
  );
  const timeout = mean(
    runs.map((run) => run[key].FULL.timeoutRate),
  );

  const gate =
    movementReach >= 0.85 &&
    fullHit >= 0.70 &&
    fullHit - offHit >= 0.25 &&
    fullHit - shuffledHit >= 0.20 &&
    whiff <= 0.30 &&
    timeout <= 0.25 &&
    runs.every(
      (run) => run[key].FULL.hitRate >= 0.60,
    );

  return {
    meanMovementReachRate: movementReach,
    meanFullHitRate: fullHit,
    meanNeuralOffHitRate: offHit,
    neuralContribution: fullHit - offHit,
    meanDnShuffledHitRate: shuffledHit,
    neuronIdentityContribution:
      fullHit - shuffledHit,
    meanFullWhiffRate: whiff,
    meanFullTimeoutRate: timeout,
    gate,
  };
}

function weightDiagnostics(before, after) {
  let l2 = 0;
  let absTotal = 0;
  let maxAbs = 0;
  let signFlips = 0;
  const changes = [];

  for (let slot = 0; slot < before.weights.length; slot += 1) {
    const delta =
      after.weights[slot] - before.weights[slot];
    const absDelta = Math.abs(delta);
    l2 += delta * delta;
    absTotal += absDelta;
    maxAbs = Math.max(maxAbs, absDelta);

    if (
      before.weights[slot] !== 0 &&
      after.weights[slot] !== 0 &&
      Math.sign(before.weights[slot]) !==
        Math.sign(after.weights[slot])
    ) {
      signFlips += 1;
    }

    changes.push({
      slot,
      dnIndex: before.selectedIndices[slot],
      before: before.weights[slot],
      after: after.weights[slot],
      delta,
      absDelta,
    });
  }

  changes.sort(
    (a, b) => b.absDelta - a.absDelta,
  );

  return {
    l2Delta: Math.sqrt(l2),
    biasDelta: after.bias - before.bias,
    signFlipCount: signFlips,
    meanAbsWeightDelta:
      absTotal / before.weights.length,
    maxAbsWeightDelta: maxAbs,
    largestWeightChanges: changes.slice(0, 12),
  };
}

async function main() {
  await mkdir(resolve(OUT_DIR), {
    recursive: true,
  });

  const candidate = JSON.parse(
    await readFile(
      resolve(CANDIDATE_PATH),
      "utf8",
    ),
  );
  validateCandidate(candidate);

  const connectome = await loadConnectome({
    cacheDir: resolve(CACHE_DIR),
    onProgress(message) {
      console.log("[connectome] " + message);
    },
  });

  const dn = cells(
    connectome.meta,
    [
      "descending_neuron",
      "descending_neuron_tbc",
    ],
  );

  if (
    dn.length !==
      candidate.originalFeatureCount ||
    dn.length !==
      movementSkill.originalFeatureCount
  ) {
    throw new Error(
      "descending-neuron contract mismatch",
    );
  }

  const dnSlot = makeSlotMap(
    connectome.meta.n,
    dn,
  );

  const before = new AttackClassifier(candidate);
  const after = new AttackClassifier(candidate);
  const replayPool = [];
  const replayRandom = mulberry32(0xe0012026);
  const practice = [];
  let totalUpdates = 0;

  console.log(
    "[v10E] source=" +
    candidate.version +
    " practice=" +
    PRACTICE_SEEDS.join(",") +
    " final=" +
    FINAL_SEEDS.join(","),
  );

  for (
    let cohort = 0;
    cohort < PRACTICE_SEEDS.length;
    cohort += 1
  ) {
    const schedule = makeSchedule(
      PRACTICE_EPISODES,
      PRACTICE_SEEDS[cohort],
      PRACTICE_DISTANCES,
    );

    let hits = 0;
    let whiffs = 0;
    let noStrike = 0;
    let movementReached = 0;
    const updatesAtStart = totalUpdates;

    for (
      let index = 0;
      index < schedule.length;
      index += 1
    ) {
      const result = await practiceEpisode({
        connectome,
        dnSlot,
        dnCount: dn.length,
        episode: schedule[index],
        classifier: after,
      });

      if (result.outcome === "HIT") {
        hits += 1;
      } else if (result.outcome === "WHIFF") {
        whiffs += 1;
      } else {
        noStrike += 1;
      }

      if (result.sample) {
        replayPool.push(result.sample);
      }

      if (result.movementReached) {
        movementReached += 1;
      }

      if (
        after.updateFromReplay(
          replayPool,
          replayRandom,
        )
      ) {
        totalUpdates += 1;
      }

      if ((index + 1) % 8 === 0) {
        console.log(
          "[practice] cohort=" +
          (cohort + 1) +
          " " +
          (index + 1) +
          "/" +
          schedule.length +
          " hit=" +
          hits +
          " whiff=" +
          whiffs +
          " noStrike=" +
          noStrike +
          " pool=" +
          replayPool.length +
          " updates=" +
          totalUpdates,
        );

        await new Promise((resolve) =>
          setImmediate(resolve),
        );
      }
    }

    practice.push({
      cohort: cohort + 1,
      baseSeed: PRACTICE_SEEDS[cohort],
      distances: PRACTICE_DISTANCES,
      episodes: schedule.length,
      firstStrikeHits: hits,
      firstStrikeWhiffs: whiffs,
      noStrike,
      movementReachRate:
        movementReached / schedule.length,
      updates:
        totalUpdates - updatesAtStart,
      cumulativeUpdates: totalUpdates,
      replayPoolSize: replayPool.length,
      replayHitShare:
        replayPool.length
          ? mean(
              replayPool.map(
                (sample) => sample.label,
              ),
            )
          : 0,
    });
  }

  const runs = [];

  for (
    let runIndex = 0;
    runIndex < FINAL_SEEDS.length;
    runIndex += 1
  ) {
    const finalSchedule = makeSchedule(
      FINAL_EPISODES,
      FINAL_SEEDS[runIndex],
      FINAL_DISTANCES,
    );
    const perm = permutation(
      candidate.sparseFeatureCount,
      FINAL_SEEDS[runIndex] ^ 0xd15ea5e,
    );

    const evaluation = await evaluatePaired({
      connectome,
      dnSlot,
      dnCount: dn.length,
      schedule: finalSchedule,
      before,
      after,
      perm,
    });

    runs.push({
      run: runIndex + 1,
      seed: FINAL_SEEDS[runIndex],
      ...evaluation,
    });

    console.log(
      "[final] run=" +
      (runIndex + 1) +
      " BEFORE=" +
      percent(evaluation.BEFORE.FULL.hitRate) +
      " AFTER=" +
      percent(evaluation.AFTER.FULL.hitRate) +
      " OFF=" +
      percent(
        evaluation.AFTER.NEURAL_OFF.hitRate,
      ) +
      " SHUFFLED=" +
      percent(
        evaluation.AFTER.DN_SHUFFLED.hitRate,
      ),
    );
  }

  const beforeSummary =
    summarizeVersion(runs, "BEFORE");
  const afterSummary =
    summarizeVersion(runs, "AFTER");
  const beforeState = before.serialize();
  const afterState = after.serialize();
  const weightChange = weightDiagnostics(
    beforeState,
    afterState,
  );

  const comparison = {
    fullHitDelta:
      afterSummary.meanFullHitRate -
      beforeSummary.meanFullHitRate,
    whiffDelta:
      afterSummary.meanFullWhiffRate -
      beforeSummary.meanFullWhiffRate,
    timeoutDelta:
      afterSummary.meanFullTimeoutRate -
      beforeSummary.meanFullTimeoutRate,
    neuronIdentityContributionDelta:
      afterSummary.neuronIdentityContribution -
      beforeSummary.neuronIdentityContribution,
  };

  const replayHits = replayPool.filter(
    (sample) => sample.label === 1,
  ).length;
  const replayWhiffs = replayPool.filter(
    (sample) => sample.label === 0,
  ).length;

  const meta = {
    schema:
      "maplefly.experiment-v10e.first-strike-practice.1",
    phase: "E",
    brainRepository: SOURCE.repository,
    brainCommit: SOURCE.commit,
    sourceCandidate: {
      version: candidate.version,
      run: candidate.sourceRun,
      artifact: candidate.sourceArtifact,
      digest:
        candidate.sourceArtifactDigest,
      receiptCommit:
        candidate.sourceReceiptCommit,
    },
    practiceSeeds: PRACTICE_SEEDS,
    practiceDistances:
      PRACTICE_DISTANCES,
    practiceEpisodesPerCohort:
      PRACTICE_EPISODES,
    finalSeeds: FINAL_SEEDS,
    finalDistances: FINAL_DISTANCES,
    finalEpisodesPerConditionPerRun:
      FINAL_EPISODES,
    learner:
      "on-policy first-threshold strike outcome replay; no random attack probes",
    replay:
      "uniform replay over actual first-strike HIT/WHIFF samples; no class balancing",
    replayBatch: REPLAY_BATCH,
    learningRate: LEARNING_RATE,
    weightAnchor: WEIGHT_ANCHOR,
    biasAnchor: BIAS_ANCHOR,
    attackThreshold: ATTACK_THRESHOLD,
    pairedEvaluation:
      "BEFORE/AFTER/OFF/SHUFFLED share each final MaleCNS trajectory",
    leakageGuard:
      "classifier never receives target distance, coordinates, attack range, hittable flag or correct timing; trainer never chooses ATTACK",
    gate:
      "movement>=85%; FULL>=70%; FULL-OFF>=25pp; FULL-SHUFFLED>=20pp; whiff<=30%; timeout<=25%; every FULL>=60%",
  };

  await writeFile(
    resolve(
      OUT_DIR,
      "experiment_v10e.json",
    ),
    JSON.stringify(
      {
        meta,
        practice,
        totalUpdates,
        replayPool: {
          samples: replayPool.length,
          hits: replayHits,
          whiffs: replayWhiffs,
          hitShare:
            replayPool.length
              ? replayHits / replayPool.length
              : 0,
        },
        beforeCandidate: beforeState,
        afterCandidate: afterState,
        weightChange,
        comparison,
        beforeSummary,
        afterSummary,
        runs,
      },
      null,
      2,
    ),
  );

  console.log(
    "V10E-BEFORE-GATE=" +
    (beforeSummary.gate ? "PASS" : "FAIL") +
    " FULL=" +
    percent(beforeSummary.meanFullHitRate) +
    " OFF=" +
    percent(beforeSummary.meanNeuralOffHitRate) +
    " SHUFFLED=" +
    percent(beforeSummary.meanDnShuffledHitRate) +
    " whiff=" +
    percent(beforeSummary.meanFullWhiffRate) +
    " timeout=" +
    percent(beforeSummary.meanFullTimeoutRate),
  );

  console.log(
    "V10E-AFTER-GATE=" +
    (afterSummary.gate ? "PASS" : "FAIL") +
    " FULL=" +
    percent(afterSummary.meanFullHitRate) +
    " OFF=" +
    percent(afterSummary.meanNeuralOffHitRate) +
    " SHUFFLED=" +
    percent(afterSummary.meanDnShuffledHitRate) +
    " whiff=" +
    percent(afterSummary.meanFullWhiffRate) +
    " timeout=" +
    percent(afterSummary.meanFullTimeoutRate),
  );

  console.log(
    "V10E-WEIGHT-DELTA=" +
    JSON.stringify(weightChange),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
