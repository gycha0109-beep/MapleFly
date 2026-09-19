#!/usr/bin/env node

import {
  mkdir,
  writeFile,
} from "node:fs/promises";
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

const TRAIN_STAGES = Object.freeze([
  Object.freeze({
    name: "near",
    distances: Object.freeze([120, 180]),
  }),
  Object.freeze({
    name: "near-mid",
    distances: Object.freeze([220, 280]),
  }),
  Object.freeze({
    name: "mid",
    distances: Object.freeze([320, 380]),
  }),
  Object.freeze({
    name: "far",
    distances: Object.freeze([420, 460]),
  }),
]);

const EVAL_DISTANCES = Object.freeze([
  150,
  250,
  350,
  440,
]);

const TOP_FEATURES = 128;
const FIT_EPOCHS = 80;
const PROBE_RATE = 0.18;
const MAX_PROBES_PER_EPISODE = 8;
const ATTACK_THRESHOLD = 0.5;

const skillApi = globalThis.MapleFlySkillV7;
const movementSkill = skillApi.BUNDLED_STATE;

function parseArgs(argv) {
  const options = {
    runs: 2,
    trainEpisodes: 64,
    evalEpisodes: 24,
    seed: 64,
    maxSeconds: 4.5,
    fitLearningRate: 0.12,
    fitL2: 0.002,
    out: "results/experiment-v10c",
    cache: ".cache/maplefly-connectome",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--runs") {
      options.runs = Number(next);
      index += 1;
    } else if (arg === "--train") {
      options.trainEpisodes = Number(next);
      index += 1;
    } else if (arg === "--eval") {
      options.evalEpisodes = Number(next);
      index += 1;
    } else if (arg === "--seed") {
      options.seed = Number(next);
      index += 1;
    } else if (arg === "--max-seconds") {
      options.maxSeconds = Number(next);
      index += 1;
    } else if (arg === "--out") {
      options.out = next;
      index += 1;
    } else if (arg === "--cache") {
      options.cache = next;
      index += 1;
    } else {
      throw new Error("unknown argument: " + arg);
    }
  }

  for (const key of ["runs", "trainEpisodes", "evalEpisodes"]) {
    if (!Number.isInteger(options[key]) || options[key] <= 0) {
      throw new Error("--" + key + " must be a positive integer");
    }
  }

  if (options.trainEpisodes % TRAIN_STAGES.length !== 0) {
    throw new Error("--train must be divisible by " + TRAIN_STAGES.length);
  }

  const perStage = options.trainEpisodes / TRAIN_STAGES.length;
  if (perStage % 4 !== 0) {
    throw new Error("episodes per stage must be divisible by 4");
  }

  if (options.evalEpisodes % 8 !== 0) {
    throw new Error("--eval must be divisible by 8");
  }

  return options;
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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function mean(values) {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;
}

function sigmoid(value) {
  const x = clamp(value, -30, 30);
  return 1 / (1 + Math.exp(-x));
}

function makeSlotMap(n, indices) {
  const map = new Int32Array(n);
  map.fill(-1);

  for (let slot = 0; slot < indices.length; slot += 1) {
    map[indices[slot]] = slot;
  }

  return map;
}

function dot(weights, feature) {
  let total = 0;

  for (let index = 0; index < weights.length; index += 1) {
    total += weights[index] * feature[index];
  }

  return total;
}

class VisualEncoder {
  constructor() {
    this.lastDistance = null;
  }

  reset() {
    this.lastDistance = null;
  }

  encode({
    playerX,
    targetX,
    visual = true,
  }) {
    const drive = {
      SNta_L: 0.05,
      SNta_R: 0.05,
    };

    if (!visual) {
      this.lastDistance = null;
      return drive;
    }

    const playerCenter =
      playerX + PLAYER_WIDTH / 2;
    const dx = targetX - playerCenter;
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

  return Float64Array.from(
    counts,
    (value) => value / seconds,
  );
}

function currentFeature(current, baseline) {
  const feature = new Float32Array(current.length);

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
  const feature = new Float64Array(
    movementSkill.sparseFeatureCount,
  );
  let normSquared = 0;

  for (
    let slot = 0;
    slot < movementSkill.featureIndices.length;
    slot += 1
  ) {
    const dnIndex = movementSkill.featureIndices[slot];
    const delta =
      (currentDnRate[dnIndex] -
        baselineDnRate[dnIndex]) /
      50;

    feature[slot] = delta;
    normSquared += delta * delta;
  }

  const norm = Math.sqrt(normSquared);

  if (norm > 1e-9) {
    for (let slot = 0; slot < feature.length; slot += 1) {
      feature[slot] /= norm;
    }
  }

  if (norm <= 1e-9) {
    return "IDLE";
  }

  return skillApi.choose(
    feature,
    movementSkill,
  ).action;
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
    attackBox.x < targetBox.x + targetBox.width &&
    attackBox.x + attackBox.width > targetBox.x &&
    attackBox.y < targetBox.y + targetBox.height &&
    attackBox.y + attackBox.height > targetBox.y
  );
}

function makeSchedule(
  totalEpisodes,
  baseSeed,
  distances,
) {
  const blockSize = distances.length * 2;

  if (totalEpisodes % blockSize !== 0) {
    throw new Error(
      "episodes must be divisible by " + blockSize,
    );
  }

  const blocks = totalEpisodes / blockSize;
  const rows = [];

  for (let block = 0; block < blocks; block += 1) {
    const brainSeed = baseSeed + block;

    distances.forEach((startDistance, distanceIndex) => {
      const order =
        (block + distanceIndex) % 2 === 0
          ? ["L", "R"]
          : ["R", "L"];

      for (const side of order) {
        rows.push({
          block: block + 1,
          brainSeed,
          side,
          startDistance,
        });
      }
    });
  }

  return rows;
}

class OutcomeClassifier {
  constructor({
    selectedIndices,
    means,
    scales,
    weights,
    bias,
  }) {
    this.selectedIndices = Int32Array.from(
      selectedIndices,
    );
    this.means = Float64Array.from(means);
    this.scales = Float64Array.from(scales);
    this.weights = Float64Array.from(weights);
    this.bias = bias;
  }

  transform(rawFeature) {
    const output = new Float64Array(
      this.selectedIndices.length,
    );

    for (
      let slot = 0;
      slot < this.selectedIndices.length;
      slot += 1
    ) {
      const index = this.selectedIndices[slot];
      output[slot] =
        (rawFeature[index] - this.means[slot]) /
        this.scales[slot];
    }

    return output;
  }

  probability(rawFeature, neural = true) {
    if (!neural) {
      return sigmoid(this.bias);
    }

    const feature = this.transform(rawFeature);
    return sigmoid(
      this.bias + dot(this.weights, feature),
    );
  }

  serialize() {
    return {
      selectedIndices: Array.from(this.selectedIndices),
      means: Array.from(this.means),
      scales: Array.from(this.scales),
      weights: Array.from(this.weights),
      bias: this.bias,
    };
  }
}

function fitClassifier(
  samples,
  dnCount,
  options,
) {
  const positives = samples.filter(
    (sample) => sample.label === 1,
  );
  const negatives = samples.filter(
    (sample) => sample.label === 0,
  );

  if (positives.length < 8 || negatives.length < 8) {
    throw new Error(
      "insufficient outcome classes: hit=" +
      positives.length +
      " whiff=" +
      negatives.length,
    );
  }

  const means = new Float64Array(dnCount);

  for (const sample of samples) {
    for (let index = 0; index < dnCount; index += 1) {
      means[index] += sample.feature[index];
    }
  }

  for (let index = 0; index < dnCount; index += 1) {
    means[index] /= samples.length;
  }

  const variance = new Float64Array(dnCount);

  for (const sample of samples) {
    for (let index = 0; index < dnCount; index += 1) {
      const delta =
        sample.feature[index] - means[index];
      variance[index] += delta * delta;
    }
  }

  const ranked = Array.from(
    { length: dnCount },
    (_, index) => ({
      index,
      variance:
        variance[index] /
        Math.max(1, samples.length - 1),
    }),
  ).sort(
    (a, b) =>
      b.variance - a.variance,
  );

  const selected = ranked
    .slice(0, Math.min(TOP_FEATURES, dnCount))
    .map((item) => item.index);

  const selectedMeans = selected.map(
    (index) => means[index],
  );
  const selectedScales = selected.map(
    (index) =>
      Math.max(
        Math.sqrt(
          variance[index] /
          Math.max(1, samples.length - 1),
        ),
        0.02,
      ),
  );

  const transformed = samples.map((sample) => {
    const values = new Float64Array(selected.length);

    for (let slot = 0; slot < selected.length; slot += 1) {
      values[slot] = clamp(
        (sample.feature[selected[slot]] -
          selectedMeans[slot]) /
          selectedScales[slot],
        -5,
        5,
      );
    }

    return {
      values,
      label: sample.label,
    };
  });

  const weights = new Float64Array(selected.length);
  let bias = 0;

  const positiveWeight =
    samples.length / (2 * positives.length);
  const negativeWeight =
    samples.length / (2 * negatives.length);

  for (let epoch = 0; epoch < FIT_EPOCHS; epoch += 1) {
    const gradient = new Float64Array(selected.length);
    let biasGradient = 0;

    for (const sample of transformed) {
      const probability = sigmoid(
        bias + dot(weights, sample.values),
      );
      const classWeight =
        sample.label === 1
          ? positiveWeight
          : negativeWeight;
      const error =
        (probability - sample.label) *
        classWeight;

      biasGradient += error;

      for (
        let slot = 0;
        slot < weights.length;
        slot += 1
      ) {
        gradient[slot] +=
          error * sample.values[slot];
      }
    }

    const scale = 1 / samples.length;

    bias -=
      options.fitLearningRate *
      biasGradient *
      scale;

    for (
      let slot = 0;
      slot < weights.length;
      slot += 1
    ) {
      weights[slot] -=
        options.fitLearningRate *
        (
          gradient[slot] * scale +
          options.fitL2 * weights[slot]
        );
    }
  }

  const classifier = new OutcomeClassifier({
    selectedIndices: selected,
    means: selectedMeans,
    scales: selectedScales,
    weights,
    bias,
  });

  let correct = 0;

  for (const sample of samples) {
    const predicted =
      classifier.probability(sample.feature) >=
      ATTACK_THRESHOLD
        ? 1
        : 0;

    if (predicted === sample.label) {
      correct += 1;
    }
  }

  return {
    classifier,
    diagnostics: {
      samples: samples.length,
      hits: positives.length,
      whiffs: negatives.length,
      hitShare:
        positives.length / samples.length,
      trainAccuracy:
        correct / samples.length,
      selectedFeatures: selected.length,
      maxVariance:
        ranked[0]?.variance ?? 0,
    },
  };
}

async function collectPracticeEpisode({
  connectome,
  dnSlot,
  dnCount,
  episode,
  random,
  options,
}) {
  const brain = new ConnectomeBrain(
    connectome.weights,
    connectome.meta.params,
    episode.brainSeed,
  );
  const encoder = new VisualEncoder();

  const center = WORLD_WIDTH / 2;
  let playerX =
    center - PLAYER_WIDTH / 2;
  const targetX =
    center +
    (episode.side === "L"
      ? -episode.startDistance
      : episode.startDistance);
  let facing =
    episode.side === "L" ? -1 : 1;
  let moveAction = "IDLE";

  for (let step = 0; step < SETTLE_STEPS; step += 1) {
    stimulate(
      brain,
      connectome.inputGroups,
      encoder.encode({
        playerX,
        targetX,
        visual: false,
      }),
    );
    brain.step();
  }

  const baselineCounts = new Float64Array(dnCount);

  for (let step = 0; step < BASELINE_STEPS; step += 1) {
    stimulate(
      brain,
      connectome.inputGroups,
      encoder.encode({
        playerX,
        targetX,
        visual: false,
      }),
    );
    brain.step();
    collectDn(
      brain,
      dnSlot,
      baselineCounts,
    );
  }

  const baseline = makeRate(
    baselineCounts,
    BASELINE_STEPS,
  );

  encoder.reset();

  let attackCounts = new Float64Array(dnCount);
  let moveCounts = new Float64Array(dnCount);
  let attackSteps = 0;
  let moveSteps = 0;
  let probes = 0;
  let hits = 0;
  let whiffs = 0;
  let closestDistance = Math.abs(
    targetX - (playerX + PLAYER_WIDTH / 2),
  );
  const samples = [];

  const maxSteps = Math.round(
    options.maxSeconds / STEP_SECONDS,
  );

  for (let step = 0; step < maxSteps; step += 1) {
    stimulate(
      brain,
      connectome.inputGroups,
      encoder.encode({
        playerX,
        targetX,
        visual: true,
      }),
    );
    brain.step();

    collectDn(brain, dnSlot, attackCounts);
    collectDn(brain, dnSlot, moveCounts);

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

    closestDistance = Math.min(
      closestDistance,
      Math.abs(
        targetX - (playerX + PLAYER_WIDTH / 2),
      ),
    );

    attackSteps += 1;
    moveSteps += 1;

    if (moveSteps >= MOVE_WINDOW_STEPS) {
      const rate = makeRate(
        moveCounts,
        moveSteps,
      );

      moveAction = movementChoice(
        rate,
        baseline,
      );

      moveCounts = new Float64Array(dnCount);
      moveSteps = 0;
    }

    if (attackSteps < ATTACK_WINDOW_STEPS) {
      continue;
    }

    const current = makeRate(
      attackCounts,
      attackSteps,
    );
    const rawFeature = currentFeature(
      current,
      baseline,
    );

    const shouldProbe =
      probes < MAX_PROBES_PER_EPISODE &&
      random() < PROBE_RATE;

    if (shouldProbe) {
      const hit = attackWouldHit({
        playerX,
        targetX,
        facing,
      });

      samples.push({
        feature: rawFeature,
        label: hit ? 1 : 0,
      });

      probes += 1;
      if (hit) {
        hits += 1;
      } else {
        whiffs += 1;
      }
    }

    attackCounts = new Float64Array(dnCount);
    attackSteps = 0;

    if (step > 0 && step % 1000 === 0) {
      await new Promise((resolve) =>
        setImmediate(resolve),
      );
    }
  }

  return {
    samples,
    probes,
    hits,
    whiffs,
    closestDistance,
    movementReached:
      closestDistance <= 115,
  };
}

async function evaluateEpisode({
  connectome,
  dnSlot,
  dnCount,
  episode,
  classifier,
  options,
  neural,
  movementOnly = false,
}) {
  const brain = new ConnectomeBrain(
    connectome.weights,
    connectome.meta.params,
    episode.brainSeed,
  );
  const encoder = new VisualEncoder();

  const center = WORLD_WIDTH / 2;
  let playerX =
    center - PLAYER_WIDTH / 2;
  const targetX =
    center +
    (episode.side === "L"
      ? -episode.startDistance
      : episode.startDistance);
  let facing =
    episode.side === "L" ? -1 : 1;
  let moveAction = "IDLE";

  for (let step = 0; step < SETTLE_STEPS; step += 1) {
    stimulate(
      brain,
      connectome.inputGroups,
      encoder.encode({
        playerX,
        targetX,
        visual: false,
      }),
    );
    brain.step();
  }

  const baselineCounts = new Float64Array(dnCount);

  for (let step = 0; step < BASELINE_STEPS; step += 1) {
    stimulate(
      brain,
      connectome.inputGroups,
      encoder.encode({
        playerX,
        targetX,
        visual: false,
      }),
    );
    brain.step();
    collectDn(
      brain,
      dnSlot,
      baselineCounts,
    );
  }

  const baseline = makeRate(
    baselineCounts,
    BASELINE_STEPS,
  );

  encoder.reset();

  let attackCounts = new Float64Array(dnCount);
  let moveCounts = new Float64Array(dnCount);
  let attackSteps = 0;
  let moveSteps = 0;
  let decisions = 0;
  let closestDistance = Math.abs(
    targetX - (playerX + PLAYER_WIDTH / 2),
  );
  let maxAttackProbability = 0;

  const maxSteps = Math.round(
    options.maxSeconds / STEP_SECONDS,
  );

  let outcome = "TIMEOUT";
  let terminalTime = options.maxSeconds;
  let terminalDistance = closestDistance;

  for (let step = 0; step < maxSteps; step += 1) {
    stimulate(
      brain,
      connectome.inputGroups,
      encoder.encode({
        playerX,
        targetX,
        visual: true,
      }),
    );
    brain.step();

    collectDn(brain, dnSlot, attackCounts);
    collectDn(brain, dnSlot, moveCounts);

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
    closestDistance = Math.min(
      closestDistance,
      distance,
    );

    attackSteps += 1;
    moveSteps += 1;

    if (moveSteps >= MOVE_WINDOW_STEPS) {
      const rate = makeRate(
        moveCounts,
        moveSteps,
      );

      moveAction = movementChoice(
        rate,
        baseline,
      );

      moveCounts = new Float64Array(dnCount);
      moveSteps = 0;
    }

    if (attackSteps < ATTACK_WINDOW_STEPS) {
      continue;
    }

    const current = makeRate(
      attackCounts,
      attackSteps,
    );
    const rawFeature = currentFeature(
      current,
      baseline,
    );
    const attackProbability =
      movementOnly
        ? 0
        : classifier.probability(
            rawFeature,
            neural,
          );

    maxAttackProbability = Math.max(
      maxAttackProbability,
      attackProbability,
    );
    decisions += 1;

    attackCounts = new Float64Array(dnCount);
    attackSteps = 0;

    if (
      !movementOnly &&
      attackProbability >= ATTACK_THRESHOLD
    ) {
      const hit = attackWouldHit({
        playerX,
        targetX,
        facing,
      });

      outcome = hit ? "HIT" : "WHIFF";
      terminalTime =
        (step + 1) * STEP_SECONDS;
      terminalDistance = distance;
      break;
    }
  }

  return {
    side: episode.side,
    startDistance: episode.startDistance,
    brainSeed: episode.brainSeed,
    condition: movementOnly
      ? "MOVEMENT_ONLY"
      : neural
        ? "FULL"
        : "NEURAL_OFF",
    outcome,
    terminalTime,
    terminalDistance,
    closestDistance,
    movementReached:
      closestDistance <= 115,
    decisions,
    maxAttackProbability,
  };
}

function summarizeEval(rows) {
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
    hitRate:
      rows.length
        ? hits.length / rows.length
        : 0,
    whiffRate:
      rows.length
        ? whiffs.length / rows.length
        : 0,
    timeoutRate:
      rows.length
        ? timeouts.length / rows.length
        : 0,
    movementReachRate: mean(
      rows.map(
        (row) =>
          row.movementReached ? 1 : 0,
      ),
    ),
    meanHitTime:
      hits.length
        ? mean(
            hits.map(
              (row) => row.terminalTime,
            ),
          )
        : null,
    meanHitDistance:
      hits.length
        ? mean(
            hits.map(
              (row) => row.terminalDistance,
            ),
          )
        : null,
    meanMaxAttackProbability: mean(
      rows.map(
        (row) => row.maxAttackProbability,
      ),
    ),
  };
}

async function evaluateSet({
  connectome,
  dnSlot,
  dnCount,
  classifier,
  options,
  runSeed,
  neural,
  movementOnly = false,
}) {
  const rows = [];
  const schedule = makeSchedule(
    options.evalEpisodes,
    runSeed + 20000,
    EVAL_DISTANCES,
  );

  for (let index = 0; index < schedule.length; index += 1) {
    rows.push(
      await evaluateEpisode({
        connectome,
        dnSlot,
        dnCount,
        episode: schedule[index],
        classifier,
        options,
        neural,
        movementOnly,
      }),
    );

    if ((index + 1) % 8 === 0) {
      const recent = summarizeEval(
        rows.slice(-8),
      );

      console.log(
        "[" +
        (movementOnly
          ? "MOVEMENT_ONLY"
          : neural
            ? "FULL"
            : "NEURAL_OFF") +
        "] " +
        (index + 1) +
        "/" +
        schedule.length +
        " hit=" +
        (recent.hitRate * 100).toFixed(1) +
        "% whiff=" +
        (recent.whiffRate * 100).toFixed(1) +
        "% timeout=" +
        (recent.timeoutRate * 100).toFixed(1) +
        "% reach=" +
        (recent.movementReachRate * 100).toFixed(1) +
        "%",
      );
    }
  }

  return {
    ...summarizeEval(rows),
    rows,
  };
}

function summarizeRuns(runs) {
  const movementReach = mean(
    runs.map(
      (run) =>
        run.evaluation.MOVEMENT_ONLY
          .movementReachRate,
    ),
  );
  const fullHit = mean(
    runs.map(
      (run) =>
        run.evaluation.FULL.hitRate,
    ),
  );
  const offHit = mean(
    runs.map(
      (run) =>
        run.evaluation.NEURAL_OFF.hitRate,
    ),
  );
  const fullWhiff = mean(
    runs.map(
      (run) =>
        run.evaluation.FULL.whiffRate,
    ),
  );
  const fullTimeout = mean(
    runs.map(
      (run) =>
        run.evaluation.FULL.timeoutRate,
    ),
  );

  const gate =
    movementReach >= 0.85 &&
    fullHit >= 0.70 &&
    fullHit - offHit >= 0.25 &&
    fullWhiff <= 0.30 &&
    fullTimeout <= 0.25 &&
    runs.every(
      (run) =>
        run.evaluation.FULL.hitRate >= 0.60,
    );

  return {
    meanMovementReachRate: movementReach,
    meanFullHitRate: fullHit,
    meanNeuralOffHitRate: offHit,
    neuralContribution:
      fullHit - offHit,
    meanFullWhiffRate: fullWhiff,
    meanFullTimeoutRate: fullTimeout,
    gate,
  };
}

function percent(value) {
  return (value * 100).toFixed(1) + "%";
}

async function main() {
  const options = parseArgs(
    process.argv.slice(2),
  );
  const outDir = resolve(options.out);

  await mkdir(outDir, {
    recursive: true,
  });

  console.log(
    "MapleFly v10C current-DN outcome learning · runs=" +
    options.runs +
    " train=" +
    options.trainEpisodes +
    " eval=" +
    options.evalEpisodes,
  );

  const connectome = await loadConnectome({
    cacheDir: resolve(options.cache),
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
    movementSkill.originalFeatureCount
  ) {
    throw new Error(
      "movement skill DN contract mismatch",
    );
  }

  const dnSlot = makeSlotMap(
    connectome.meta.n,
    dn,
  );

  console.log(
    "[features] DN=" +
    dn.length +
    " raw=current-baseline only · selector=top" +
    TOP_FEATURES +
    " unsupervised variance",
  );

  const runs = [];

  for (
    let runIndex = 0;
    runIndex < options.runs;
    runIndex += 1
  ) {
    const runSeed =
      options.seed + runIndex * 10000;
    const random = mulberry32(
      runSeed ^ 0xc0100c0a,
    );
    const samples = [];
    const stageDiagnostics = [];

    console.log(
      "\n[run] " +
      (runIndex + 1) +
      "/" +
      options.runs,
    );

    const perStage =
      options.trainEpisodes /
      TRAIN_STAGES.length;

    for (
      let stageIndex = 0;
      stageIndex < TRAIN_STAGES.length;
      stageIndex += 1
    ) {
      const stage =
        TRAIN_STAGES[stageIndex];
      const schedule = makeSchedule(
        perStage,
        runSeed +
          1000 +
          stageIndex * 100,
        stage.distances,
      );

      let stageProbes = 0;
      let stageHits = 0;
      let stageWhiffs = 0;
      let stageReach = 0;

      console.log(
        "[stage] " +
        (stageIndex + 1) +
        "/" +
        TRAIN_STAGES.length +
        " " +
        stage.name +
        " distances=" +
        stage.distances.join(","),
      );

      for (
        let index = 0;
        index < schedule.length;
        index += 1
      ) {
        const result =
          await collectPracticeEpisode({
            connectome,
            dnSlot,
            dnCount: dn.length,
            episode: schedule[index],
            random,
            options,
          });

        samples.push(
          ...result.samples,
        );
        stageProbes +=
          result.probes;
        stageHits +=
          result.hits;
        stageWhiffs +=
          result.whiffs;
        stageReach +=
          result.movementReached
            ? 1
            : 0;

        if ((index + 1) % 4 === 0) {
          console.log(
            "[practice] " +
            stage.name +
            " " +
            (index + 1) +
            "/" +
            schedule.length +
            " probes=" +
            stageProbes +
            " hit=" +
            stageHits +
            " whiff=" +
            stageWhiffs +
            " reach=" +
            percent(
              stageReach /
                (index + 1),
            ),
          );

          await new Promise((resolve) =>
            setImmediate(resolve),
          );
        }
      }

      const fit = fitClassifier(
        samples,
        dn.length,
        options,
      );

      stageDiagnostics.push({
        stage: stage.name,
        episodes: schedule.length,
        probes: stageProbes,
        hits: stageHits,
        whiffs: stageWhiffs,
        movementReachRate:
          stageReach /
          schedule.length,
        cumulativeFit:
          fit.diagnostics,
      });

      console.log(
        "[fit] stage=" +
        stage.name +
        " cumulativeSamples=" +
        fit.diagnostics.samples +
        " hitShare=" +
        percent(
          fit.diagnostics.hitShare,
        ) +
        " trainAcc=" +
        percent(
          fit.diagnostics.trainAccuracy,
        ),
      );
    }

    const fit = fitClassifier(
      samples,
      dn.length,
      options,
    );

    const evaluation = {
      MOVEMENT_ONLY:
        await evaluateSet({
          connectome,
          dnSlot,
          dnCount: dn.length,
          classifier:
            fit.classifier,
          options,
          runSeed,
          neural: true,
          movementOnly: true,
        }),
      FULL:
        await evaluateSet({
          connectome,
          dnSlot,
          dnCount: dn.length,
          classifier:
            fit.classifier,
          options,
          runSeed,
          neural: true,
        }),
      NEURAL_OFF:
        await evaluateSet({
          connectome,
          dnSlot,
          dnCount: dn.length,
          classifier:
            fit.classifier,
          options,
          runSeed,
          neural: false,
        }),
    };

    runs.push({
      run: runIndex + 1,
      runSeed,
      practice: {
        samples:
          samples.length,
        diagnostics:
          stageDiagnostics,
        finalFit:
          fit.diagnostics,
      },
      evaluation,
      classifier:
        fit.classifier.serialize(),
    });

    console.log(
      "[run-summary] run=" +
      (runIndex + 1) +
      " moveReach=" +
      percent(
        evaluation.MOVEMENT_ONLY
          .movementReachRate,
      ) +
      " FULL=" +
      percent(
        evaluation.FULL.hitRate,
      ) +
      " OFF=" +
      percent(
        evaluation.NEURAL_OFF.hitRate,
      ) +
      " whiff=" +
      percent(
        evaluation.FULL.whiffRate,
      ) +
      " timeout=" +
      percent(
        evaluation.FULL.timeoutRate,
      ),
    );
  }

  const summary =
    summarizeRuns(runs);

  const best =
    [...runs].sort(
      (a, b) =>
        b.evaluation.FULL.hitRate -
        a.evaluation.FULL.hitRate,
    )[0];

  const meta = {
    schema:
      "maplefly.experiment-v10.current-dn-outcome.1",
    phase: "C",
    brainRepository:
      SOURCE.repository,
    brainCommit:
      SOURCE.commit,
    movementSkillVersion:
      movementSkill.version,
    neurons: SOURCE.neurons,
    synapses: SOURCE.synapses,
    descendingNeurons:
      dn.length,
    rawAttackFeature:
      "(current DN Hz - baseline DN Hz) / 50, clipped [-1,1]",
    selector:
      "top 128 DN by unlabeled training variance",
    learner:
      "class-balanced logistic outcome classifier fit only on actual exploratory ATTACK outcomes",
    practice:
      "random motor-babbling ATTACK probes; hit=1, whiff=0; WAIT states are not labeled",
    attackThreshold:
      ATTACK_THRESHOLD,
    trainStages:
      TRAIN_STAGES,
    evalDistances:
      EVAL_DISTANCES,
    leakageGuard:
      "classifier never receives target distance, coordinates, attack range, hittable flag, stage name or correct timing",
    gate:
      "movement-only reach>=85%; FULL hit>=70%; FULL-NEURAL_OFF>=25pp; FULL whiff<=30%; FULL timeout<=25%; every run FULL>=60%",
  };

  await writeFile(
    resolve(
      outDir,
      "experiment_v10c.json",
    ),
    JSON.stringify(
      {
        meta,
        summary,
        bestRun:
          best.run,
        deployCandidate:
          best.classifier,
        runs,
      },
      null,
      2,
    ),
  );

  console.log(
    "\nV10C-GATE=" +
    (summary.gate
      ? "PASS"
      : "FAIL") +
    " moveReach=" +
    percent(
      summary.meanMovementReachRate,
    ) +
    " FULL=" +
    percent(
      summary.meanFullHitRate,
    ) +
    " NEURAL_OFF=" +
    percent(
      summary.meanNeuralOffHitRate,
    ) +
    " delta=" +
    percent(
      summary.neuralContribution,
    ) +
    " whiff=" +
    percent(
      summary.meanFullWhiffRate,
    ) +
    " timeout=" +
    percent(
      summary.meanFullTimeoutRate,
    ),
  );

  console.log(
    "DEPLOY_CANDIDATE_JSON=" +
    JSON.stringify({
      sourceRunIndex:
        best.run,
      selectedIndices:
        best.classifier
          .selectedIndices,
      means:
        best.classifier.means,
      scales:
        best.classifier.scales,
      weights:
        best.classifier.weights,
      bias:
        best.classifier.bias,
    }),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
