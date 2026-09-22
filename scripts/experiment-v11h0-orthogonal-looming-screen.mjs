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
const TEMPORAL_WINDOWS = 4;
const DN_COUNT = 1316;
const TEMPORAL_FEATURE_COUNT =
  TEMPORAL_WINDOWS * DN_COUNT;
const MOVE_SPEED = 280;
const PLAYER_WIDTH = 34;
const GROUND_Y = 530;
const OBSTACLE_WIDTH = 38;
const OBSTACLE_HEIGHT = 54;
const OBSTACLE_VISUAL_RADIUS = 280;

const DISTANCES = [260, 300, 340, 380];
const SAMPLE_BINS = [150, 120, 90, 60];
const TRAIN_BASE_SEEDS = [
  2001000,
  2001100,
  2001200,
  2001300,
];
const EVAL_BASE_SEEDS = [
  2011000,
  2011100,
  2011200,
];

const EPOCHS = 120;
const LEARNING_RATE = 0.02;
const L2 = 0.0005;
const THRESHOLD = 0.5;
const ORDER_SEED = 2006000;
const LABEL_SHUFFLE_SEED = 2016000;
const REPRESENTATIONS = Object.freeze([
  "CURRENT",
  "MEAN4",
  "DELTA",
  "CONCAT4",
]);

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

function makeDnTemporalPermutation(seed) {
  const dnPermutation =
    makePermutation(DN_COUNT, seed);
  const permutation =
    new Int32Array(
      TEMPORAL_FEATURE_COUNT,
    );

  for (
    let window = 0;
    window < TEMPORAL_WINDOWS;
    window += 1
  ) {
    const offset =
      window * DN_COUNT;
    for (
      let dn = 0;
      dn < DN_COUNT;
      dn += 1
    ) {
      permutation[offset + dn] =
        offset + dnPermutation[dn];
    }
  }

  return permutation;
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
  if (allDn.length !== DN_COUNT) {
    throw new Error(
      "DN contract mismatch: " +
        allDn.length +
        " != " +
        DN_COUNT,
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

class OrthogonalLoomingEncoder {
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

      const obstacleLooming = clamp(
        ((OBSTACLE_VISUAL_RADIUS -
          Math.max(0, frontDistance)) /
          OBSTACLE_VISUAL_RADIUS) *
          0.8,
        0,
        0.8,
      );

      drive["LC6_" + obstacle.side] =
        obstacleLooming;
      drive["LC16_" + obstacle.side] =
        obstacleLooming;
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
  const brainSeed =
    baseSeed +
    distanceIndex * 2 +
    sideIndex;

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
    new OrthogonalLoomingEncoder();
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
  const history = [];

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

    history.push(feature);
    if (
      history.length >
      TEMPORAL_WINDOWS
    ) {
      history.shift();
    }

    for (const bin of SAMPLE_BINS) {
      if (
        remaining.has(bin) &&
        distance <= bin &&
        history.length ===
          TEMPORAL_WINDOWS
      ) {
        const current =
          Float64Array.from(
            history[
              TEMPORAL_WINDOWS - 1
            ],
          );
        const mean4 =
          new Float64Array(DN_COUNT);
        const delta =
          new Float64Array(DN_COUNT);
        const concat4 =
          new Float64Array(
            TEMPORAL_FEATURE_COUNT,
          );

        for (
          let historyIndex = 0;
          historyIndex <
          TEMPORAL_WINDOWS;
          historyIndex += 1
        ) {
          const windowFeature =
            history[historyIndex];
          concat4.set(
            windowFeature,
            historyIndex * DN_COUNT,
          );
          for (
            let dn = 0;
            dn < DN_COUNT;
            dn += 1
          ) {
            mean4[dn] +=
              windowFeature[dn] /
              TEMPORAL_WINDOWS;
          }
        }

        for (
          let dn = 0;
          dn < DN_COUNT;
          dn += 1
        ) {
          delta[dn] =
            history[
              TEMPORAL_WINDOWS - 1
            ][dn] -
            history[0][dn];
        }

        samples.push({
          bin,
          endSourceDistance:
            distance,
          representations: {
            CURRENT: current,
            MEAN4: mean4,
            DELTA: delta,
            CONCAT4: concat4,
          },
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
              representations:
                sample.representations,
            });
          }
        }
      }
    }

    console.log(
      "[v11g2b-collect] baseSeed=" +
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


function featureOf(row, representation) {
  return row.representations[representation];
}

function fitStandardizer(rows, representation) {
  const featureCount =
    featureOf(rows[0], representation).length;
  const means =
    new Float64Array(featureCount);
  const scales =
    new Float64Array(featureCount);

  for (const row of rows) {
    const feature =
      featureOf(row, representation);
    for (
      let index = 0;
      index < featureCount;
      index += 1
    ) {
      means[index] += feature[index];
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
    const feature =
      featureOf(row, representation);
    for (
      let index = 0;
      index < featureCount;
      index += 1
    ) {
      const delta =
        feature[index] - means[index];
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
        Math.max(1, rows.length - 1),
    );
    if (
      !Number.isFinite(scales[index]) ||
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
  representation,
  orderSeed,
}) {
  const featureCount =
    featureOf(
      rows[0],
      representation,
    ).length;
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
        featureOf(
          rows[rowIndex],
          representation,
        ),
        stats,
      );
      const label =
        labels[rowIndex];

      let score = bias;
      for (
        let index = 0;
        index < featureCount;
        index += 1
      ) {
        score +=
          weights[index] * x[index];
      }

      const error =
        sigmoid(score) - label;
      gradBias += error;

      for (
        let index = 0;
        index < featureCount;
        index += 1
      ) {
        grad[index] +=
          error * x[index];
      }
    }

    const invN = 1 / rows.length;
    bias -=
      LEARNING_RATE *
      gradBias *
      invN;

    for (
      let index = 0;
      index < featureCount;
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

  return sigmoid(score) >= THRESHOLD
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
  representation,
  permutation = null,
}) {
  const predictions = rows.map(
    (row) =>
      predict(
        model,
        featureOf(
          row,
          representation,
        ),
        stats,
        permutation,
      ),
  );

  return balancedAccuracy(
    rows,
    predictions,
  );
}

function representationPermutation(
  representation,
  seed,
) {
  if (representation === "CONCAT4") {
    return makeDnTemporalPermutation(seed);
  }
  return Int32Array.from(
    makePermutation(DN_COUNT, seed),
  );
}

async function evaluateRepresentation({
  trainRows,
  evalRows,
  representation,
  trueLabels,
  shuffledLabels,
}) {
  const stats =
    fitStandardizer(
      trainRows,
      representation,
    );
  const salt =
    REPRESENTATIONS.indexOf(
      representation,
    ) *
    1000;

  const model =
    trainClassifier({
      rows: trainRows,
      labels: trueLabels,
      stats,
      representation,
      orderSeed:
        ORDER_SEED + salt,
    });

  const shuffledModel =
    trainClassifier({
      rows: trainRows,
      labels: shuffledLabels,
      stats,
      representation,
      orderSeed:
        ORDER_SEED + salt,
    });

  const perRun = [];

  for (
    let run = 0;
    run < EVAL_BASE_SEEDS.length;
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
      representationPermutation(
        representation,
        baseSeed +
          900000 +
          salt,
      );

    const full =
      evaluateModel({
        rows,
        model,
        stats,
        representation,
      });
    const labelShuffled =
      evaluateModel({
        rows,
        model: shuffledModel,
        stats,
        representation,
      });
    const dnPermuted =
      evaluateModel({
        rows,
        model,
        stats,
        representation,
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
      "[v11g2b-" +
        representation +
        "] run=" +
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

  const gate =
    fullMean >= 0.85 &&
    minRun >= 0.75 &&
    fullMean -
        shuffledMean >=
      0.25 &&
    fullMean -
        permutedMean >=
      0.25;

  return {
    representation,
    featureCount:
      featureOf(
        trainRows[0],
        representation,
      ).length,
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
      gate,
    },
    perRun,
  };
}

function selectRepresentation(results) {
  const current = results.find(
    (row) =>
      row.representation ===
      "CURRENT",
  );
  const passingHistory =
    results.filter(
      (row) =>
        row.representation !==
          "CURRENT" &&
        row.summary.gate &&
        row.summary
            .fullBalancedAccuracy -
          current.summary
            .fullBalancedAccuracy >=
          0.15,
    );

  if (!passingHistory.length) {
    return null;
  }

  const dimensionPreference = {
    MEAN4: 0,
    DELTA: 0,
    CONCAT4: 1,
  };

  passingHistory.sort((a, b) => {
    const delta =
      b.summary
        .fullBalancedAccuracy -
      a.summary
        .fullBalancedAccuracy;

    if (Math.abs(delta) > 0.02) {
      return delta;
    }

    const dimensionDelta =
      dimensionPreference[
        a.representation
      ] -
      dimensionPreference[
        b.representation
      ];
    if (dimensionDelta !== 0) {
      return dimensionDelta;
    }

    return a.representation.localeCompare(
      b.representation,
    );
  });

  return passingHistory[0]
    .representation;
}

async function main() {
  const outDir = resolve(
    "results/experiment-v11h0",
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

  const loomingCounts = {};
  for (const channel of ["LC6", "LC16"]) {
    loomingCounts[channel] = {};
    for (const side of ["L", "R"]) {
      const group = cells(
        connectome.meta,
        [channel],
        side,
      );
      if (group.length === 0) {
        throw new Error(
          channel + "_" + side +
            " missing from pinned MaleCNS",
        );
      }
      connectome.inputGroups.set(
        channel + "_" + side,
        group,
      );
      loomingCounts[channel][side] =
        group.length;
    }
  }

  const trainRows =
    await collectDataset({
      connectome,
      dnSlot: dn.slot,
      baseSeeds:
        TRAIN_BASE_SEEDS,
    });
  const evalRows =
    await collectDataset({
      connectome,
      dnSlot: dn.slot,
      baseSeeds:
        EVAL_BASE_SEEDS,
    });

  if (
    trainRows.length !== 256 ||
    evalRows.length !== 192
  ) {
    throw new Error(
      "dataset size mismatch train=" +
        trainRows.length +
        " eval=" +
        evalRows.length,
    );
  }

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

  const results = [];
  for (
    const representation of
      REPRESENTATIONS
  ) {
    results.push(
      await evaluateRepresentation({
        trainRows,
        evalRows,
        representation,
        trueLabels,
        shuffledLabels,
      }),
    );
  }

  const selectedRepresentation =
    selectRepresentation(results);
  const current = results.find(
    (row) =>
      row.representation ===
      "CURRENT",
  );
  const selected =
    selectedRepresentation
      ? results.find(
          (row) =>
            row.representation ===
            selectedRepresentation,
        )
      : null;

  const historyGain =
    selected
      ? selected.summary
          .fullBalancedAccuracy -
        current.summary
          .fullBalancedAccuracy
      : null;

  const gate =
    selected !== null &&
    historyGain >= 0.15;

  const output = {
    meta: {
      schema:
        "maplefly.experiment-v11h0.orthogonal-looming-composite-screen.1",
      brainRepository:
        SOURCE.repository,
      brainCommit:
        SOURCE.commit,
      dnCount:
        dn.allDn.length,
      representations:
        REPRESENTATIONS,
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
        history:
          TEMPORAL_WINDOWS,
        historySeconds:
          TEMPORAL_WINDOWS *
          SAMPLE_WINDOW_STEPS *
          STEP_SECONDS,
      },
      classifier: {
        epochs: EPOCHS,
        learningRate:
          LEARNING_RATE,
        l2: L2,
        threshold: THRESHOLD,
      },
      sensoryArchitecture: {
        target:
          "v10F target sensory unchanged: LC10a/LPLC1/LPLC2 plus close-target LC4",
        obstacle:
          "equal fixed looming drive to LC6 and LC16 on obstacle side; obstacle LC4 disabled",
        loomingCounts,
      },
      antiLeak:
        "model input is DN activity-derived representation only; context identity/distance/coordinates/side/seed/obstacle flag/target flag/bin are metadata only",
      selectionRule:
        "history candidate must pass representation gate and exceed CURRENT by >=15pp; highest mean FULL wins, <=2pp tie prefers lower dimensional candidate",
    },
    results,
    selectedRepresentation,
    currentFullBalancedAccuracy:
      current.summary
        .fullBalancedAccuracy,
    selectedHistoryGain:
      historyGain,
    gate,
  };

  await writeFile(
    resolve(
      outDir,
      "experiment_v11h0.json",
    ),
    JSON.stringify(
      output,
      null,
      2,
    ) + "\n",
  );

  for (const result of results) {
    console.log(
      "V11H0-" +
        result.representation +
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
    "V11H0-SCREEN=" +
      (gate ? "PASS" : "FAIL") +
      " SELECTED=" +
      (
        selectedRepresentation ??
        "NONE"
      ) +
      " HISTORY_GAIN=" +
      (
        historyGain === null
          ? "NA"
          : (
              historyGain * 100
            ).toFixed(1) + "pp"
      ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
