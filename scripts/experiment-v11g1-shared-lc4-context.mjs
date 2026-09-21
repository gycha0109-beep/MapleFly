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
const GROUND_Y = 530;
const OBSTACLE_WIDTH = 38;
const OBSTACLE_HEIGHT = 54;
const OBSTACLE_VISUAL_RADIUS = 280;

const DISTANCES = [260, 300, 340, 380];
const SAMPLE_BINS = [150, 120, 90, 60];
const TRAIN_BASE_SEEDS = [
  1301000,
  1301100,
  1301200,
  1301300,
];
const EVAL_BASE_SEEDS = [
  1311000,
  1311100,
  1311200,
];

const EPOCHS = 120;
const LEARNING_RATE = 0.02;
const L2 = 0.0005;
const THRESHOLD = 0.5;
const ORDER_SEED = 1306000;
const LABEL_SHUFFLE_SEED = 1316000;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function mean(values) {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) /
        values.length
    : 0;
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
  const values = Array.from(
    { length },
    (_, index) => index,
  );
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

function makePermutation(length, seed) {
  return shuffledIndices(length, seed);
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
      "DN contract mismatch: " +
        allDn.length +
        " != 1316",
    );
  }

  const slot = new Int16Array(meta.n).fill(-1);
  allDn.forEach((neuron, index) => {
    slot[neuron] = index;
  });

  return { allDn, slot };
}

function collectDn(brain, dnSlot, counts) {
  for (
    let fired = 0;
    fired < brain.firedCount;
    fired += 1
  ) {
    const dnIndex =
      dnSlot[brain.fired[fired]];
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
  const feature =
    new Float64Array(currentRate.length);
  for (
    let index = 0;
    index < currentRate.length;
    index += 1
  ) {
    feature[index] = clamp(
      (currentRate[index] -
        baselineRate[index]) /
        50,
      -1,
      1,
    );
  }
  return feature;
}

class SharedLc4Encoder {
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

    const playerCenterX =
      playerX + PLAYER_WIDTH / 2;
    const dx = targetX - playerCenterX;
    const side = dx < 0 ? "L" : "R";
    const targetDistance = Math.abs(dx);
    const closeness = clamp(
      1 - targetDistance / 620,
      0,
      1,
    );

    let approaching = 0;
    if (
      Number.isFinite(
        this.lastTargetDistance,
      )
    ) {
      approaching = clamp(
        (this.lastTargetDistance -
          targetDistance) /
          45,
        0,
        1,
      );
    }
    this.lastTargetDistance =
      targetDistance;

    drive["LC10a_" + side] = clamp(
      0.12 + closeness * 0.68,
      0,
      0.8,
    );
    drive["LPLC1_" + side] = clamp(
      closeness * 0.12 +
        approaching * 0.32,
      0,
      0.55,
    );
    drive["LPLC2_" + side] = clamp(
      closeness * 0.24 +
        approaching * 0.38,
      0,
      0.8,
    );

    if (targetDistance < 175) {
      const targetLc4 = clamp(
        ((175 - targetDistance) / 175) *
          0.72 +
          approaching * 0.18,
        0,
        0.8,
      );
      const key = "LC4_" + side;
      drive[key] = Math.max(
        Number(drive[key] ?? 0),
        targetLc4,
      );
    }

    if (obstacle) {
      const playerFront =
        obstacle.side === "R"
          ? playerX + PLAYER_WIDTH
          : playerX;
      const obstacleFront =
        obstacle.side === "R"
          ? obstacle.x
          : obstacle.x +
            obstacle.width;
      const frontDistance =
        obstacle.side === "R"
          ? obstacleFront - playerFront
          : playerFront - obstacleFront;

      const obstacleLc4 = clamp(
        ((OBSTACLE_VISUAL_RADIUS -
          Math.max(0, frontDistance)) /
          OBSTACLE_VISUAL_RADIUS) *
          0.8,
        0,
        0.8,
      );

      const key =
        "LC4_" + obstacle.side;
      drive[key] = Math.max(
        Number(drive[key] ?? 0),
        obstacleLc4,
      );
    }

    return drive;
  }
}

function makeContextEpisode({
  baseSeed,
  distanceIndex,
  side,
  context,
}) {
  const center = 500;
  const playerX =
    center - PLAYER_WIDTH / 2;
  const startDistance =
    DISTANCES[distanceIndex];
  const sideIndex =
    side === "L" ? 0 : 1;
  const contextIndex =
    context === "OBSTACLE" ? 0 : 1;
  const brainSeed =
    baseSeed +
    distanceIndex * 4 +
    sideIndex * 2 +
    contextIndex;

  if (context === "OBSTACLE") {
    let obstacle;
    let targetX;

    if (side === "R") {
      const playerFront =
        playerX + PLAYER_WIDTH;
      obstacle = {
        side,
        x:
          playerFront +
          startDistance,
        y:
          GROUND_Y -
          OBSTACLE_HEIGHT,
        width: OBSTACLE_WIDTH,
        height: OBSTACLE_HEIGHT,
      };
      targetX =
        obstacle.x +
        obstacle.width +
        160;
    } else {
      const playerFront = playerX;
      obstacle = {
        side,
        x:
          playerFront -
          startDistance -
          OBSTACLE_WIDTH,
        y:
          GROUND_Y -
          OBSTACLE_HEIGHT,
        width: OBSTACLE_WIDTH,
        height: OBSTACLE_HEIGHT,
      };
      targetX =
        obstacle.x - 160;
    }

    return {
      baseSeed,
      brainSeed,
      distanceIndex,
      startDistance,
      side,
      context,
      playerX,
      targetX,
      obstacle,
    };
  }

  const playerCenterX =
    playerX + PLAYER_WIDTH / 2;
  const targetX =
    playerCenterX +
    (side === "R"
      ? startDistance
      : -startDistance);

  return {
    baseSeed,
    brainSeed,
    distanceIndex,
    startDistance,
    side,
    context,
    playerX,
    targetX,
    obstacle: null,
  };
}

function sourceDistance({
  playerX,
  targetX,
  obstacle,
  context,
}) {
  if (context === "TARGET_ONLY") {
    return Math.abs(
      targetX -
        (playerX + PLAYER_WIDTH / 2),
    );
  }

  if (obstacle.side === "R") {
    return (
      obstacle.x -
      (playerX + PLAYER_WIDTH)
    );
  }
  return (
    playerX -
    (obstacle.x + obstacle.width)
  );
}

async function collectEpisodeSamples({
  connectome,
  dnSlot,
  episode,
}) {
  const brain = new ConnectomeBrain(
    connectome.weights,
    connectome.meta.params,
    episode.brainSeed,
  );
  const encoder =
    new SharedLc4Encoder();
  let playerX = episode.playerX;

  for (
    let step = 0;
    step < SETTLE_STEPS;
    step += 1
  ) {
    stimulate(
      brain,
      connectome.inputGroups,
      encoder.encode({
        playerX,
        targetX: episode.targetX,
        obstacle: episode.obstacle,
        visualEnabled: false,
      }),
    );
    brain.step();
  }

  const baselineCounts =
    new Float64Array(1316);
  for (
    let step = 0;
    step < BASELINE_STEPS;
    step += 1
  ) {
    stimulate(
      brain,
      connectome.inputGroups,
      encoder.encode({
        playerX,
        targetX: episode.targetX,
        obstacle: episode.obstacle,
        visualEnabled: false,
      }),
    );
    brain.step();
    collectDn(
      brain,
      dnSlot,
      baselineCounts,
    );
  }

  const baselineRate = makeRate(
    baselineCounts,
    BASELINE_STEPS,
  );
  encoder.reset();

  const direction =
    episode.side === "R" ? 1 : -1;
  const remaining =
    new Set(SAMPLE_BINS);
  const samples = [];

  for (
    let window = 0;
    window < 48;
    window += 1
  ) {
    const counts =
      new Float64Array(1316);

    for (
      let step = 0;
      step <
      SAMPLE_WINDOW_STEPS;
      step += 1
    ) {
      stimulate(
        brain,
        connectome.inputGroups,
        encoder.encode({
          playerX,
          targetX: episode.targetX,
          obstacle: episode.obstacle,
          visualEnabled: true,
        }),
      );
      brain.step();
      collectDn(
        brain,
        dnSlot,
        counts,
      );
      playerX +=
        direction *
        MOVE_SPEED *
        STEP_SECONDS;
    }

    const distance = sourceDistance({
      playerX,
      targetX: episode.targetX,
      obstacle: episode.obstacle,
      context: episode.context,
    });

    const feature = makeFeature(
      makeRate(
        counts,
        SAMPLE_WINDOW_STEPS,
      ),
      baselineRate,
    );

    for (const bin of SAMPLE_BINS) {
      if (
        remaining.has(bin) &&
        distance <= bin
      ) {
        samples.push({
          bin,
          endSourceDistance:
            distance,
          feature,
        });
        remaining.delete(bin);
      }
    }

    if (remaining.size === 0) {
      break;
    }
  }

  if (
    samples.length !==
    SAMPLE_BINS.length
  ) {
    throw new Error(
      "missing bins context=" +
        episode.context +
        " seed=" +
        episode.brainSeed +
        " side=" +
        episode.side +
        " start=" +
        episode.startDistance,
    );
  }

  return samples;
}

async function collectDataset({
  connectome,
  dnSlot,
  baseSeeds,
}) {
  const rows = [];

  for (const baseSeed of baseSeeds) {
    for (
      let distanceIndex = 0;
      distanceIndex <
      DISTANCES.length;
      distanceIndex += 1
    ) {
      for (const side of ["L", "R"]) {
        for (const context of [
          "TARGET_ONLY",
          "OBSTACLE",
        ]) {
          const episode =
            makeContextEpisode({
              baseSeed,
              distanceIndex,
              side,
              context,
            });
          const samples =
            await collectEpisodeSamples({
              connectome,
              dnSlot,
              episode,
            });

          for (
            const sample of samples
          ) {
            rows.push({
              baseSeed,
              brainSeed:
                episode.brainSeed,
              distanceIndex,
              startDistance:
                episode.startDistance,
              side,
              bin: sample.bin,
              context,
              label:
                context ===
                "OBSTACLE"
                  ? 1
                  : 0,
              feature:
                sample.feature,
            });
          }
        }
      }
    }

    console.log(
      "[v11g1-collect] baseSeed=" +
        baseSeed +
        " rows=" +
        rows.length,
    );
    await new Promise((resolve) =>
      setImmediate(resolve),
    );
  }

  return rows;
}

function fitStandardizer(rows) {
  const featureCount =
    rows[0].feature.length;
  const means =
    new Float64Array(featureCount);
  const scales =
    new Float64Array(featureCount);

  for (const row of rows) {
    for (
      let index = 0;
      index < featureCount;
      index += 1
    ) {
      means[index] +=
        row.feature[index];
    }
  }
  for (
    let index = 0;
    index < featureCount;
    index += 1
  ) {
    means[index] /= rows.length;
  }

  for (const row of rows) {
    for (
      let index = 0;
      index < featureCount;
      index += 1
    ) {
      const delta =
        row.feature[index] -
        means[index];
      scales[index] +=
        delta * delta;
    }
  }
  for (
    let index = 0;
    index < featureCount;
    index += 1
  ) {
    scales[index] = Math.sqrt(
      scales[index] /
        Math.max(
          1,
          rows.length - 1,
        ),
    );
    if (
      !Number.isFinite(
        scales[index],
      ) ||
      scales[index] < 1e-6
    ) {
      scales[index] = 1;
    }
  }

  return { means, scales };
}

function standardize(
  feature,
  stats,
  permutation = null,
) {
  const output =
    new Float64Array(feature.length);
  for (
    let index = 0;
    index < feature.length;
    index += 1
  ) {
    const source =
      permutation
        ? permutation[index]
        : index;
    output[index] = clamp(
      (feature[source] -
        stats.means[index]) /
        stats.scales[index],
      -5,
      5,
    );
  }
  return output;
}

function trainClassifier({
  rows,
  labels,
  stats,
  orderSeed,
}) {
  const featureCount =
    rows[0].feature.length;
  const weights =
    new Float64Array(featureCount);
  let bias = 0;
  const order = shuffledIndices(
    rows.length,
    orderSeed,
  );

  for (
    let epoch = 0;
    epoch < EPOCHS;
    epoch += 1
  ) {
    let gradBias = 0;
    const grad =
      new Float64Array(featureCount);

    for (const rowIndex of order) {
      const x = standardize(
        rows[rowIndex].feature,
        stats,
      );
      const label =
        labels[rowIndex];

      let score = bias;
      for (
        let index = 0;
        index <
        featureCount;
        index += 1
      ) {
        score +=
          weights[index] *
          x[index];
      }

      const error =
        sigmoid(score) - label;
      gradBias += error;

      for (
        let index = 0;
        index <
        featureCount;
        index += 1
      ) {
        grad[index] +=
          error * x[index];
      }
    }

    const invN =
      1 / rows.length;
    bias -=
      LEARNING_RATE *
      gradBias *
      invN;

    for (
      let index = 0;
      index <
      featureCount;
      index += 1
    ) {
      weights[index] -=
        LEARNING_RATE *
        (
          grad[index] *
            invN +
          L2 * weights[index]
        );
    }
  }

  return { weights, bias };
}

function predict(
  model,
  feature,
  stats,
  permutation = null,
) {
  const x = standardize(
    feature,
    stats,
    permutation,
  );
  let score = model.bias;

  for (
    let index = 0;
    index < x.length;
    index += 1
  ) {
    score +=
      model.weights[index] *
      x[index];
  }

  const probability =
    sigmoid(score);
  return probability >= THRESHOLD
    ? 1
    : 0;
}

function balancedAccuracy(
  rows,
  predictions,
) {
  let tp = 0;
  let tn = 0;
  let pos = 0;
  let neg = 0;

  rows.forEach(
    (row, index) => {
      if (row.label === 1) {
        pos += 1;
        if (
          predictions[index] === 1
        ) {
          tp += 1;
        }
      } else {
        neg += 1;
        if (
          predictions[index] === 0
        ) {
          tn += 1;
        }
      }
    },
  );

  return 0.5 *
    (
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
      ),
  );
  return balancedAccuracy(
    rows,
    predictions,
  );
}

function pairedL2(rows) {
  const groups = new Map();

  for (const row of rows) {
    const key = [
      row.baseSeed,
      row.distanceIndex,
      row.side,
      row.bin,
    ].join(":");
    const group =
      groups.get(key) ?? {};
    group[
      row.context ===
      "OBSTACLE"
        ? "obstacle"
        : "target"
    ] = row.feature;
    groups.set(key, group);
  }

  const distances = [];
  for (
    const group of groups.values()
  ) {
    if (
      !group.obstacle ||
      !group.target
    ) {
      continue;
    }

    let sum = 0;
    for (
      let index = 0;
      index <
      group.obstacle.length;
      index += 1
    ) {
      const delta =
        group.obstacle[index] -
        group.target[index];
      sum += delta * delta;
    }
    distances.push(
      Math.sqrt(sum),
    );
  }

  return {
    pairCount: distances.length,
    meanL2: mean(distances),
    minL2: Math.min(
      ...distances,
    ),
    maxL2: Math.max(
      ...distances,
    ),
  };
}

async function main() {
  const outDir = resolve(
    "results/experiment-v11g1",
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
          "[connectome] " +
            message,
        );
      },
    });

  const dn =
    buildDnContract(
      connectome.meta,
    );

  const trainRows =
    await collectDataset({
      connectome,
      dnSlot: dn.slot,
      baseSeeds:
        TRAIN_BASE_SEEDS,
    });

  if (trainRows.length !== 256) {
    throw new Error(
      "train sample mismatch: " +
        trainRows.length,
    );
  }

  const stats =
    fitStandardizer(trainRows);
  const trueLabels =
    trainRows.map(
      (row) => row.label,
    );
  const labelOrder =
    shuffledIndices(
      trueLabels.length,
      LABEL_SHUFFLE_SEED,
    );
  const shuffledLabels =
    labelOrder.map(
      (index) =>
        trueLabels[index],
    );

  const model =
    trainClassifier({
      rows: trainRows,
      labels: trueLabels,
      stats,
      orderSeed: ORDER_SEED,
    });
  const shuffledModel =
    trainClassifier({
      rows: trainRows,
      labels: shuffledLabels,
      stats,
      orderSeed: ORDER_SEED,
    });

  const evalRows =
    await collectDataset({
      connectome,
      dnSlot: dn.slot,
      baseSeeds:
        EVAL_BASE_SEEDS,
    });

  if (evalRows.length !== 192) {
    throw new Error(
      "eval sample mismatch: " +
        evalRows.length,
    );
  }

  const perRun = [];
  for (
    let run = 0;
    run <
    EVAL_BASE_SEEDS.length;
    run += 1
  ) {
    const baseSeed =
      EVAL_BASE_SEEDS[run];
    const rows =
      evalRows.filter(
        (row) =>
          row.baseSeed ===
          baseSeed,
      );
    const permutation =
      makePermutation(
        1316,
        baseSeed + 900000,
      );

    const full =
      evaluateModel({
        rows,
        model,
        stats,
      });
    const labelShuffled =
      evaluateModel({
        rows,
        model: shuffledModel,
        stats,
      });
    const dnPermuted =
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
        full,
      labelShuffledBalancedAccuracy:
        labelShuffled,
      dnPermutedBalancedAccuracy:
        dnPermuted,
    });

    console.log(
      "[v11g1] run=" +
        (run + 1) +
        " FULL=" +
        (full * 100).toFixed(1) +
        "% LABEL_SHUFFLED=" +
        (
          labelShuffled * 100
        ).toFixed(1) +
        "% DN_PERMUTED=" +
        (
          dnPermuted * 100
        ).toFixed(1) +
        "%",
    );
  }

  const fullMean = mean(
    perRun.map(
      (row) =>
        row.fullBalancedAccuracy,
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
      (row) =>
        row.fullBalancedAccuracy,
    ),
  );
  const paired =
    pairedL2(evalRows);

  const gate =
    fullMean >= 0.85 &&
    minRun >= 0.75 &&
    fullMean - shuffledMean >= 0.25 &&
    fullMean - permutedMean >= 0.25;

  const output = {
    meta: {
      schema:
        "maplefly.experiment-v11g1.shared-lc4-context-separability.1",
      brainRepository:
        SOURCE.repository,
      brainCommit:
        SOURCE.commit,
      dnCount:
        dn.allDn.length,
      trainBaseSeeds:
        TRAIN_BASE_SEEDS,
      evalBaseSeeds:
        EVAL_BASE_SEEDS,
      distances: DISTANCES,
      sampleBins:
        SAMPLE_BINS,
      windows: {
        settle: SETTLE_STEPS,
        baseline:
          BASELINE_STEPS,
        sample:
          SAMPLE_WINDOW_STEPS,
      },
      classifier: {
        epochs: EPOCHS,
        learningRate:
          LEARNING_RATE,
        l2: L2,
        threshold: THRESHOLD,
        orderSeed:
          ORDER_SEED,
        labelShuffleSeed:
          LABEL_SHUFFLE_SEED,
      },
      antiLeak:
        "classifier input is 1316-DN activity only; context identity/distance/coordinates/side/seed are metadata only",
    },
    summary: {
      fullBalancedAccuracy:
        fullMean,
      labelShuffledBalancedAccuracy:
        shuffledMean,
      fullMinusLabelShuffled:
        fullMean -
        shuffledMean,
      dnPermutedBalancedAccuracy:
        permutedMean,
      fullMinusDnPermuted:
        fullMean -
        permutedMean,
      minRunFullBalancedAccuracy:
        minRun,
      pairedL2: paired,
      gate,
    },
    perRun,
  };

  await writeFile(
    resolve(
      outDir,
      "experiment_v11g1.json",
    ),
    JSON.stringify(
      output,
      null,
      2,
    ) + "\n",
  );

  console.log(
    "V11G1-CONTEXT-GATE=" +
      (gate ? "PASS" : "FAIL") +
      " FULL=" +
      (
        fullMean * 100
      ).toFixed(1) +
      "% LABEL_SHUFFLED=" +
      (
        shuffledMean * 100
      ).toFixed(1) +
      "% DN_PERMUTED=" +
      (
        permutedMean * 100
      ).toFixed(1) +
      "% PAIRED_L2=" +
      paired.meanL2.toFixed(4),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
