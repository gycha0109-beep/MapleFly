#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  SOURCE,
  ConnectomeBrain,
  cells,
  loadConnectome,
} from "../src/headless/connectome-runtime.mjs";

const STEP_SECONDS = 0.02;
const SETTLE_STEPS = 26;
const BASELINE_STEPS = 26;
const SAMPLE_WINDOW_STEPS = 5;
const MOVE_SPEED = 280;
const PLAYER_WIDTH = 34;
const PLAYER_HEIGHT = 46;
const GROUND_Y = 530;
const OBSTACLE_WIDTH = 38;
const OBSTACLE_HEIGHT = 54;
const OBSTACLE_VISUAL_RADIUS = 280;

const DISTANCES = [300, 340, 380, 420];
const SAMPLE_BINS = [240, 180, 120, 60];
const TRAIN_BASE_SEEDS = [1201000, 1201100, 1201200, 1201300];
const EVAL_BASE_SEEDS = [1211000, 1211100, 1211200];

const EPOCHS = 120;
const LEARNING_RATE = 0.02;
const L2 = 0.0005;
const THRESHOLD = 0.5;
const SHUFFLE_SEED = 606000;
const LABEL_SHUFFLE_SEED = 1216000;
const CANDIDATE_CHANNELS = Object.freeze(["LC6", "LC16"]);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
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

function shuffledIndices(length, seed) {
  const random = mulberry32(seed);
  const values = Array.from({ length }, (_, index) => index);
  for (let index = values.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [values[index], values[swap]] = [
      values[swap],
      values[index],
    ];
  }
  return values;
}

function makePermutation(length, seed) {
  return shuffledIndices(length, seed);
}

function mean(values) {
  if (!values.length) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
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

function buildDnContract(meta) {
  const allDn = cells(
    meta,
    ["descending_neuron", "descending_neuron_tbc"],
  );

  if (allDn.length !== 1316) {
    throw new Error(
      "DN contract mismatch: " + allDn.length + " != 1316",
    );
  }

  const slot = new Int16Array(meta.n).fill(-1);
  allDn.forEach((neuron, index) => {
    slot[neuron] = index;
  });

  return {
    allDn,
    slot,
  };
}

function collectDn(brain, dnSlot, counts) {
  for (let fired = 0; fired < brain.firedCount; fired += 1) {
    const dnIndex = dnSlot[brain.fired[fired]];
    if (dnIndex >= 0) {
      counts[dnIndex] += 1;
    }
  }
}

function makeRate(counts, steps) {
  const seconds = steps * STEP_SECONDS;
  return Float64Array.from(
    counts,
    (count) => count / seconds,
  );
}

function makeFeature(currentRate, baselineRate) {
  const feature = new Float64Array(currentRate.length);
  for (let index = 0; index < currentRate.length; index += 1) {
    feature[index] = clamp(
      (currentRate[index] - baselineRate[index]) / 50,
      -1,
      1,
    );
  }
  return feature;
}

class VisualEncoder {
  constructor() {
    this.lastTargetDistance = null;
  }

  reset() {
    this.lastTargetDistance = null;
  }

  encode({
    playerX,
    targetX,
    obstacle,
    obstacleVisual,
    obstacleChannel,
    visualEnabled = true,
  }) {
    const drive = {
      SNta_L: 0.05,
      SNta_R: 0.05,
    };

    if (!visualEnabled) {
      this.reset();
      return drive;
    }

    const playerCenterX = playerX + PLAYER_WIDTH / 2;
    const dx = targetX - playerCenterX;
    const side = dx < 0 ? "L" : "R";
    const targetDistance = Math.abs(dx);
    const closeness = clamp(1 - targetDistance / 620, 0, 1);
    let approaching = 0;

    if (Number.isFinite(this.lastTargetDistance)) {
      approaching = clamp(
        (this.lastTargetDistance - targetDistance) / 45,
        0,
        1,
      );
    }
    this.lastTargetDistance = targetDistance;

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

    if (targetDistance < 175) {
      drive["LC4_" + side] = clamp(
        ((175 - targetDistance) / 175) * 0.72 +
          approaching * 0.18,
        0,
        0.8,
      );
    }

    if (obstacleVisual) {
      const playerFront =
        obstacle.side === "R"
          ? playerX + PLAYER_WIDTH
          : playerX;
      const obstacleNear =
        obstacle.side === "R"
          ? obstacle.x
          : obstacle.x + obstacle.width;
      const frontDistance =
        obstacle.side === "R"
          ? obstacleNear - playerFront
          : playerFront - obstacleNear;

      drive[obstacleChannel + "_" + obstacle.side] = clamp(
        ((OBSTACLE_VISUAL_RADIUS -
          Math.max(0, frontDistance)) /
          OBSTACLE_VISUAL_RADIUS) *
          0.8,
        0,
        0.8,
      );
    }

    return drive;
  }
}

function makeEpisode(baseSeed, distanceIndex, side) {
  const startCenter = 500;
  const playerX = startCenter - PLAYER_WIDTH / 2;
  const sideIndex = side === "L" ? 0 : 1;
  const startDistance = DISTANCES[distanceIndex];

  let obstacle;
  let targetX;

  if (side === "R") {
    const playerFront = playerX + PLAYER_WIDTH;
    obstacle = {
      side,
      x: playerFront + startDistance,
      y: GROUND_Y - OBSTACLE_HEIGHT,
      width: OBSTACLE_WIDTH,
      height: OBSTACLE_HEIGHT,
    };
    targetX = obstacle.x + obstacle.width + 160;
  } else {
    const playerFront = playerX;
    obstacle = {
      side,
      x: playerFront - startDistance - OBSTACLE_WIDTH,
      y: GROUND_Y - OBSTACLE_HEIGHT,
      width: OBSTACLE_WIDTH,
      height: OBSTACLE_HEIGHT,
    };
    targetX = obstacle.x - 160;
  }

  return {
    baseSeed,
    brainSeed:
      baseSeed + distanceIndex * 2 + sideIndex,
    distanceIndex,
    startDistance,
    side,
    playerX,
    targetX,
    obstacle,
  };
}

function frontDistance(playerX, obstacle) {
  if (obstacle.side === "R") {
    return obstacle.x - (playerX + PLAYER_WIDTH);
  }
  return playerX - (obstacle.x + obstacle.width);
}

async function collectEpisodeSamples({
  connectome,
  dnSlot,
  episode,
  obstacleVisual,
  obstacleChannel,
}) {
  const brain = new ConnectomeBrain(
    connectome.weights,
    connectome.meta.params,
    episode.brainSeed,
  );
  const encoder = new VisualEncoder();
  let playerX = episode.playerX;

  for (let step = 0; step < SETTLE_STEPS; step += 1) {
    stimulate(
      brain,
      connectome.inputGroups,
      encoder.encode({
        playerX,
        targetX: episode.targetX,
        obstacle: episode.obstacle,
        obstacleVisual: false,
        obstacleChannel,
        visualEnabled: false,
      }),
    );
    brain.step();
  }

  const baselineCounts = new Float64Array(1316);
  for (let step = 0; step < BASELINE_STEPS; step += 1) {
    stimulate(
      brain,
      connectome.inputGroups,
      encoder.encode({
        playerX,
        targetX: episode.targetX,
        obstacle: episode.obstacle,
        obstacleVisual: false,
        obstacleChannel,
        visualEnabled: false,
      }),
    );
    brain.step();
    collectDn(brain, dnSlot, baselineCounts);
  }

  const baselineRate = makeRate(
    baselineCounts,
    BASELINE_STEPS,
  );
  encoder.reset();

  const direction = episode.side === "R" ? 1 : -1;
  const binsRemaining = new Set(SAMPLE_BINS);
  const samples = [];

  for (let window = 0; window < 40; window += 1) {
    const counts = new Float64Array(1316);

    for (
      let step = 0;
      step < SAMPLE_WINDOW_STEPS;
      step += 1
    ) {
      stimulate(
        brain,
        connectome.inputGroups,
        encoder.encode({
          playerX,
          targetX: episode.targetX,
          obstacle: episode.obstacle,
          obstacleVisual,
          obstacleChannel,
          visualEnabled: true,
        }),
      );
      brain.step();
      collectDn(brain, dnSlot, counts);
      playerX +=
        direction * MOVE_SPEED * STEP_SECONDS;
    }

    const distance = frontDistance(
      playerX,
      episode.obstacle,
    );
    const feature = makeFeature(
      makeRate(counts, SAMPLE_WINDOW_STEPS),
      baselineRate,
    );

    for (const bin of SAMPLE_BINS) {
      if (binsRemaining.has(bin) && distance <= bin) {
        samples.push({
          bin,
          endFrontDistance: distance,
          feature,
        });
        binsRemaining.delete(bin);
      }
    }

    if (binsRemaining.size === 0) {
      break;
    }
  }

  if (samples.length !== SAMPLE_BINS.length) {
    throw new Error(
      "missing sample bins for seed=" +
        episode.brainSeed +
        " side=" +
        episode.side +
        " distance=" +
        episode.startDistance,
    );
  }

  return samples;
}

async function collectDataset({
  connectome,
  dnSlot,
  baseSeeds,
  obstacleChannel,
}) {
  const rows = [];

  for (let baseIndex = 0; baseIndex < baseSeeds.length; baseIndex += 1) {
    const baseSeed = baseSeeds[baseIndex];

    for (
      let distanceIndex = 0;
      distanceIndex < DISTANCES.length;
      distanceIndex += 1
    ) {
      for (const side of ["L", "R"]) {
        const episode = makeEpisode(
          baseSeed,
          distanceIndex,
          side,
        );

        const off = await collectEpisodeSamples({
          connectome,
          dnSlot,
          episode,
          obstacleVisual: false,
          obstacleChannel,
        });
        const on = await collectEpisodeSamples({
          connectome,
          dnSlot,
          episode,
          obstacleVisual: true,
          obstacleChannel,
        });

        for (let i = 0; i < SAMPLE_BINS.length; i += 1) {
          const offSample = off[i];
          const onSample = on[i];

          rows.push({
            baseIndex,
            baseSeed,
            brainSeed: episode.brainSeed,
            distanceIndex,
            startDistance: episode.startDistance,
            side,
            bin: offSample.bin,
            label: 0,
            feature: offSample.feature,
          });
          rows.push({
            baseIndex,
            baseSeed,
            brainSeed: episode.brainSeed,
            distanceIndex,
            startDistance: episode.startDistance,
            side,
            bin: onSample.bin,
            label: 1,
            feature: onSample.feature,
          });
        }
      }
    }

    console.log(
      "[v11b-collect] baseSeed=" +
        baseSeed +
        " rows=" +
        rows.length,
    );
    await new Promise((resolve) => setImmediate(resolve));
  }

  return rows;
}

function fitStandardizer(rows) {
  const featureCount = rows[0].feature.length;
  const means = new Float64Array(featureCount);
  const scales = new Float64Array(featureCount);

  for (const row of rows) {
    for (let index = 0; index < featureCount; index += 1) {
      means[index] += row.feature[index];
    }
  }
  for (let index = 0; index < featureCount; index += 1) {
    means[index] /= rows.length;
  }

  for (const row of rows) {
    for (let index = 0; index < featureCount; index += 1) {
      const delta = row.feature[index] - means[index];
      scales[index] += delta * delta;
    }
  }
  for (let index = 0; index < featureCount; index += 1) {
    scales[index] = Math.sqrt(
      scales[index] / Math.max(1, rows.length - 1),
    );
    if (!Number.isFinite(scales[index]) || scales[index] < 1e-6) {
      scales[index] = 1;
    }
  }

  return { means, scales };
}

function standardize(feature, stats, permutation = null) {
  const result = new Float64Array(feature.length);
  for (let index = 0; index < feature.length; index += 1) {
    const source = permutation
      ? permutation[index]
      : index;
    result[index] = clamp(
      (feature[source] - stats.means[index]) /
        stats.scales[index],
      -5,
      5,
    );
  }
  return result;
}

function trainClassifier({
  rows,
  labels,
  stats,
  orderSeed,
}) {
  const featureCount = rows[0].feature.length;
  const weights = new Float64Array(featureCount);
  let bias = 0;
  const order = shuffledIndices(rows.length, orderSeed);

  for (let epoch = 0; epoch < EPOCHS; epoch += 1) {
    let gradBias = 0;
    const grad = new Float64Array(featureCount);

    for (const rowIndex of order) {
      const x = standardize(rows[rowIndex].feature, stats);
      const label = labels[rowIndex];

      let score = bias;
      for (let index = 0; index < featureCount; index += 1) {
        score += weights[index] * x[index];
      }

      const error = sigmoid(score) - label;
      gradBias += error;

      for (let index = 0; index < featureCount; index += 1) {
        grad[index] += error * x[index];
      }
    }

    const invN = 1 / rows.length;
    bias -= LEARNING_RATE * gradBias * invN;

    for (let index = 0; index < featureCount; index += 1) {
      const gradient =
        grad[index] * invN + L2 * weights[index];
      weights[index] -= LEARNING_RATE * gradient;
    }
  }

  return { weights, bias };
}

function predict(model, feature, stats, permutation = null) {
  const x = standardize(feature, stats, permutation);
  let score = model.bias;

  for (let index = 0; index < x.length; index += 1) {
    score += model.weights[index] * x[index];
  }

  const probability = sigmoid(score);
  return {
    probability,
    label: probability >= THRESHOLD ? 1 : 0,
  };
}

function balancedAccuracy(rows, predictions) {
  let tp = 0;
  let tn = 0;
  let pos = 0;
  let neg = 0;

  rows.forEach((row, index) => {
    if (row.label === 1) {
      pos += 1;
      if (predictions[index] === 1) {
        tp += 1;
      }
    } else {
      neg += 1;
      if (predictions[index] === 0) {
        tn += 1;
      }
    }
  });

  return 0.5 * (
    (pos ? tp / pos : 0) +
    (neg ? tn / neg : 0)
  );
}

function evaluateModel({
  rows,
  model,
  stats,
  permutation = null,
}) {
  const predictions = rows.map(
    (row) =>
      predict(
        model,
        row.feature,
        stats,
        permutation,
      ).label,
  );

  return {
    balancedAccuracy: balancedAccuracy(rows, predictions),
    predictions,
  };
}

function pairedL2(rows) {
  const groups = new Map();

  for (const row of rows) {
    const key = [
      row.baseSeed,
      row.brainSeed,
      row.startDistance,
      row.side,
      row.bin,
    ].join(":");
    const group = groups.get(key) ?? {};
    group[row.label === 1 ? "on" : "off"] = row.feature;
    groups.set(key, group);
  }

  const distances = [];
  for (const group of groups.values()) {
    if (!group.on || !group.off) {
      continue;
    }
    let sum = 0;
    for (let index = 0; index < group.on.length; index += 1) {
      const delta = group.on[index] - group.off[index];
      sum += delta * delta;
    }
    distances.push(Math.sqrt(sum));
  }

  return {
    pairCount: distances.length,
    meanL2: mean(distances),
    minL2: Math.min(...distances),
    maxL2: Math.max(...distances),
  };
}

function compactRows(rows) {
  return rows.map((row) => ({
    baseIndex: row.baseIndex,
    baseSeed: row.baseSeed,
    brainSeed: row.brainSeed,
    startDistance: row.startDistance,
    side: row.side,
    bin: row.bin,
    label: row.label,
  }));
}

async function screenChannel({
  connectome,
  dn,
  obstacleChannel,
}) {
  const trainRows = await collectDataset({
    connectome,
    dnSlot: dn.slot,
    baseSeeds: TRAIN_BASE_SEEDS,
    obstacleChannel,
  });

  if (trainRows.length !== 256) {
    throw new Error(
      obstacleChannel +
        " train sample count mismatch: " +
        trainRows.length,
    );
  }

  const stats = fitStandardizer(trainRows);
  const trueLabels = trainRows.map(
    (row) => row.label,
  );
  const labelShuffleOrder =
    shuffledIndices(
      trueLabels.length,
      LABEL_SHUFFLE_SEED +
        obstacleChannel.charCodeAt(2),
    );
  const shuffledLabels =
    labelShuffleOrder.map(
      (index) => trueLabels[index],
    );

  const model = trainClassifier({
    rows: trainRows,
    labels: trueLabels,
    stats,
    orderSeed:
      SHUFFLE_SEED +
      obstacleChannel.charCodeAt(2),
  });
  const labelShuffledModel =
    trainClassifier({
      rows: trainRows,
      labels: shuffledLabels,
      stats,
      orderSeed:
        SHUFFLE_SEED +
        obstacleChannel.charCodeAt(2),
    });

  const evalRows = await collectDataset({
    connectome,
    dnSlot: dn.slot,
    baseSeeds: EVAL_BASE_SEEDS,
    obstacleChannel,
  });

  if (evalRows.length !== 192) {
    throw new Error(
      obstacleChannel +
        " eval sample count mismatch: " +
        evalRows.length,
    );
  }

  const perRun = [];
  for (
    let run = 0;
    run < EVAL_BASE_SEEDS.length;
    run += 1
  ) {
    const baseSeed = EVAL_BASE_SEEDS[run];
    const rows = evalRows.filter(
      (row) => row.baseSeed === baseSeed,
    );
    const permutation = makePermutation(
      1316,
      baseSeed +
        900000 +
        obstacleChannel.charCodeAt(2),
    );

    const runFull = evaluateModel({
      rows,
      model,
      stats,
    });
    const runLabelShuffled =
      evaluateModel({
        rows,
        model: labelShuffledModel,
        stats,
      });
    const runDnPermuted =
      evaluateModel({
        rows,
        model,
        stats,
        permutation,
      });

    perRun.push({
      run: run + 1,
      baseSeed,
      fullBalancedAccuracy:
        runFull.balancedAccuracy,
      labelShuffledBalancedAccuracy:
        runLabelShuffled.balancedAccuracy,
      dnPermutedBalancedAccuracy:
        runDnPermuted.balancedAccuracy,
    });

    console.log(
      "[v11g0-" +
        obstacleChannel +
        "] run=" +
        (run + 1) +
        " FULL=" +
        (
          runFull.balancedAccuracy * 100
        ).toFixed(1) +
        "% LABEL_SHUFFLED=" +
        (
          runLabelShuffled.balancedAccuracy *
          100
        ).toFixed(1) +
        "% DN_PERMUTED=" +
        (
          runDnPermuted.balancedAccuracy *
          100
        ).toFixed(1) +
        "%",
    );
  }

  const fullMean = mean(
    perRun.map(
      (row) => row.fullBalancedAccuracy,
    ),
  );
  const shuffledMean = mean(
    perRun.map(
      (row) =>
        row.labelShuffledBalancedAccuracy,
    ),
  );
  const permutedMean = mean(
    perRun.map(
      (row) =>
        row.dnPermutedBalancedAccuracy,
    ),
  );
  const minRun = Math.min(
    ...perRun.map(
      (row) => row.fullBalancedAccuracy,
    ),
  );
  const paired = pairedL2(evalRows);

  const gate =
    fullMean >= 0.80 &&
    minRun >= 0.70 &&
    fullMean - shuffledMean >= 0.20 &&
    fullMean - permutedMean >= 0.20;

  return {
    obstacleChannel,
    trainSamples: trainRows.length,
    evalSamples: evalRows.length,
    summary: {
      fullBalancedAccuracy: fullMean,
      labelShuffledBalancedAccuracy:
        shuffledMean,
      fullMinusLabelShuffled:
        fullMean - shuffledMean,
      dnPermutedBalancedAccuracy:
        permutedMean,
      fullMinusDnPermuted:
        fullMean - permutedMean,
      minRunFullBalancedAccuracy: minRun,
      pairedL2: paired,
      gate,
    },
    perRun,
  };
}

function selectChannel(results) {
  const passing = results.filter(
    (result) => result.summary.gate,
  );

  if (passing.length === 0) {
    return null;
  }
  if (passing.length === 1) {
    return passing[0].obstacleChannel;
  }

  const sorted = [...passing].sort(
    (a, b) =>
      b.summary.fullBalancedAccuracy -
      a.summary.fullBalancedAccuracy,
  );
  const difference =
    sorted[0].summary.fullBalancedAccuracy -
    sorted[1].summary.fullBalancedAccuracy;

  if (difference <= 0.02) {
    return "LC16";
  }
  return sorted[0].obstacleChannel;
}

async function main() {
  const outDir = resolve(
    "results/experiment-v11g0",
  );
  await mkdir(outDir, {
    recursive: true,
  });

  const connectome =
    await loadConnectome({
      cacheDir: resolve(
        ".cache/maplefly-connectome",
      ),
      onProgress(message) {
        console.log(
          "[connectome] " + message,
        );
      },
    });

  const dn =
    buildDnContract(connectome.meta);

  const channelCounts = {};
  for (
    const channel of CANDIDATE_CHANNELS
  ) {
    channelCounts[channel] = {
      L: cells(
        connectome.meta,
        [channel],
        "L",
      ).length,
      R: cells(
        connectome.meta,
        [channel],
        "R",
      ).length,
    };

    if (
      channelCounts[channel].L === 0 ||
      channelCounts[channel].R === 0
    ) {
      throw new Error(
        channel +
          " missing from pinned MaleCNS: " +
          JSON.stringify(
            channelCounts[channel],
          ),
      );
    }

    for (const side of ["L", "R"]) {
      connectome.inputGroups.set(
        channel + "_" + side,
        cells(
          connectome.meta,
          [channel],
          side,
        ),
      );
    }
  }

  const results = [];
  for (
    const obstacleChannel of
      CANDIDATE_CHANNELS
  ) {
    results.push(
      await screenChannel({
        connectome,
        dn,
        obstacleChannel,
      }),
    );
  }

  const selectedChannel =
    selectChannel(results);
  const gate =
    selectedChannel !== null;

  const output = {
    meta: {
      schema:
        "maplefly.experiment-v11g0.alternate-looming-screen.1",
      brainRepository:
        SOURCE.repository,
      brainCommit: SOURCE.commit,
      dnCount: dn.allDn.length,
      candidateChannels:
        CANDIDATE_CHANNELS,
      channelCounts,
      trainBaseSeeds:
        TRAIN_BASE_SEEDS,
      evalBaseSeeds:
        EVAL_BASE_SEEDS,
      distances: DISTANCES,
      sampleBins: SAMPLE_BINS,
      windows: {
        settle: SETTLE_STEPS,
        baseline: BASELINE_STEPS,
        sample: SAMPLE_WINDOW_STEPS,
      },
      classifier: {
        epochs: EPOCHS,
        learningRate:
          LEARNING_RATE,
        l2: L2,
        threshold: THRESHOLD,
      },
      sharedTargetSensory:
        "LC10a + LPLC1 + LPLC2 + target LC4 preserved",
      antiLeak:
        "diagnostic classifier input is 1316-DN activity only; distance/side/geometry/seed/channel identity are never model inputs",
      selectionRule:
        "single passing candidate wins; if both pass choose higher mean FULL; <=2pp tie chooses LC16",
    },
    results,
    selectedChannel,
    gate,
  };

  await writeFile(
    resolve(
      outDir,
      "experiment_v11g0.json",
    ),
    JSON.stringify(
      output,
      null,
      2,
    ) + "\n",
  );

  for (const result of results) {
    console.log(
      "V11G0-" +
        result.obstacleChannel +
        "=" +
        (
          result.summary.gate
            ? "PASS"
            : "FAIL"
        ) +
        " FULL=" +
        (
          result.summary
            .fullBalancedAccuracy *
          100
        ).toFixed(1) +
        "% LABEL_SHUFFLED=" +
        (
          result.summary
            .labelShuffledBalancedAccuracy *
          100
        ).toFixed(1) +
        "% DN_PERMUTED=" +
        (
          result.summary
            .dnPermutedBalancedAccuracy *
          100
        ).toFixed(1) +
        "%",
    );
  }

  console.log(
    "V11G0-SCREEN=" +
      (gate ? "PASS" : "FAIL") +
      " SELECTED=" +
      (selectedChannel ?? "NONE"),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
