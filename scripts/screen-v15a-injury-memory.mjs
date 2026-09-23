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
const FRAME_STEPS = 5;
const HISTORY_FRAMES = 48;
const DN_COUNT = 1316;
const IMPACT_DRIVE = 0.7;
const IMPACT_PULSE_STEPS = 6;
const TASTE_DRIVE = 0.8;
const IMPACT_STARTS = [25, 55, 85, 115, 145, 175];
const TRAIN_BASE_SEEDS = [2781000, 2782000, 2783000, 2784000];
const EVAL_BASE_SEEDS = [2791000, 2792000, 2793000];
const REPLICATES = 6;
const REPRESENTATIONS = [
  { name: "CURRENT", frames: 1 },
  { name: "CONCAT12", frames: 12 },
  { name: "CONCAT24", frames: 24 },
  { name: "CONCAT48", frames: 48 },
];
const TOP_FEATURES = 256;
const EPOCHS = 240;
const LEARNING_RATE = 0.03;
const L2 = 0.001;
const ORDER_SEED = 2796000;
const LABEL_SHUFFLE_SEED = 2797000;
const GATE = Object.freeze({
  balancedAccuracyMin: 0.65,
  everyClassRecallMin: 0.50,
  dnShuffleMarginMin: 0.20,
});
const PREREG_COMMIT = "3ab4c50fde40c2b745140e1cb69c58bcbed26d88";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
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
    [values[index], values[swap]] = [values[swap], values[index]];
  }
  return values;
}

function makePermutation(length, seed) {
  return shuffledIndices(length, seed);
}

function stimulate(brain, inputGroups, drive) {
  for (const [name, amount] of Object.entries(drive)) {
    if (!amount) continue;
    const indices = inputGroups.get(name);
    if (indices?.length) brain.stimulate(indices, amount);
  }
}

function buildDnContract(meta) {
  const allDn = cells(meta, ["descending_neuron", "descending_neuron_tbc"]);
  if (allDn.length !== DN_COUNT) {
    throw new Error("DN contract mismatch: " + allDn.length + " != " + DN_COUNT);
  }
  const slot = new Int16Array(meta.n).fill(-1);
  allDn.forEach((neuron, index) => {
    slot[neuron] = index;
  });
  return { allDn, slot };
}

function collectDn(brain, dnSlot, counts) {
  for (let fired = 0; fired < brain.firedCount; fired += 1) {
    const dnIndex = dnSlot[brain.fired[fired]];
    if (dnIndex >= 0) counts[dnIndex] += 1;
  }
}

function rate(counts, steps) {
  const seconds = steps * STEP_SECONDS;
  return Float64Array.from(counts, (count) => count / seconds);
}

function baselineRelative(currentRate, baselineRate) {
  const out = new Float32Array(DN_COUNT);
  for (let index = 0; index < DN_COUNT; index += 1) {
    out[index] = clamp(
      (currentRate[index] - baselineRate[index]) / 50,
      -1,
      1,
    );
  }
  return out;
}

function groundDrive() {
  return { SNta_L: 0.05, SNta_R: 0.05 };
}

function makeSchedule(brainSeed, classIndex) {
  const random = mulberry32(brainSeed + 500000);
  const order = [...IMPACT_STARTS];
  for (let index = order.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [order[index], order[swap]] = [order[swap], order[index]];
  }
  const selected = order.slice(0, classIndex);
  const events = selected.map((start) => ({
    start,
    side: random() < 0.5 ? "L" : "R",
  }));
  events.sort((a, b) => a.start - b.start);
  return events;
}

function driveForHistoryStep(step, events) {
  const drive = groundDrive();
  for (const event of events) {
    if (step >= event.start && step < event.start + IMPACT_PULSE_STEPS) {
      drive["LgLG_" + event.side] = IMPACT_DRIVE;
    }
  }
  if (step >= HISTORY_FRAMES * FRAME_STEPS - FRAME_STEPS) {
    drive.taste_L = TASTE_DRIVE;
    drive.taste_R = TASTE_DRIVE;
  }
  return drive;
}

async function collectEpisode({ connectome, dnSlot, baseSeed, classIndex, replicate }) {
  const brainSeed = baseSeed + replicate * 7 + 1;
  const events = makeSchedule(brainSeed, classIndex);
  const brain = new ConnectomeBrain(
    connectome.weights,
    connectome.meta.params,
    brainSeed,
  );

  for (let step = 0; step < SETTLE_STEPS; step += 1) {
    stimulate(brain, connectome.inputGroups, groundDrive());
    brain.step();
  }

  const baselineCounts = new Float64Array(DN_COUNT);
  for (let step = 0; step < BASELINE_STEPS; step += 1) {
    stimulate(brain, connectome.inputGroups, groundDrive());
    brain.step();
    collectDn(brain, dnSlot, baselineCounts);
  }
  const baselineRate = rate(baselineCounts, BASELINE_STEPS);

  const history = [];
  for (let frame = 0; frame < HISTORY_FRAMES; frame += 1) {
    const counts = new Float64Array(DN_COUNT);
    for (let local = 0; local < FRAME_STEPS; local += 1) {
      const historyStep = frame * FRAME_STEPS + local;
      stimulate(
        brain,
        connectome.inputGroups,
        driveForHistoryStep(historyStep, events),
      );
      brain.step();
      collectDn(brain, dnSlot, counts);
    }
    history.push(
      baselineRelative(rate(counts, FRAME_STEPS), baselineRate),
    );
  }

  return {
    baseSeed,
    brainSeed,
    classIndex,
    replicate,
    impactEvents: events,
    history,
  };
}

async function collectDataset(connectome, dnSlot, baseSeeds, label) {
  const rows = [];
  for (const baseSeed of baseSeeds) {
    for (let replicate = 0; replicate < REPLICATES; replicate += 1) {
      for (let classIndex = 0; classIndex < 4; classIndex += 1) {
        rows.push(
          await collectEpisode({
            connectome,
            dnSlot,
            baseSeed,
            classIndex,
            replicate,
          }),
        );
      }
    }
    console.log("[v15A-" + label + "] baseSeed=" + baseSeed + " rows=" + rows.length);
    await new Promise((resolveNow) => setImmediate(resolveNow));
  }
  return rows;
}

function rawValue(row, frames, rawSlot, permutation = null) {
  const frameOffset = Math.floor(rawSlot / DN_COUNT);
  const dnIndex = rawSlot % DN_COUNT;
  const sourceFrame = HISTORY_FRAMES - frames + frameOffset;
  const sourceDn = permutation ? permutation[dnIndex] : dnIndex;
  return row.history[sourceFrame][sourceDn];
}

function selectVarianceSlots(rows, frames) {
  const rawCount = frames * DN_COUNT;
  const sums = new Float64Array(rawCount);
  const sumSquares = new Float64Array(rawCount);

  for (const row of rows) {
    for (let frameOffset = 0; frameOffset < frames; frameOffset += 1) {
      const sourceFrame = HISTORY_FRAMES - frames + frameOffset;
      const feature = row.history[sourceFrame];
      const base = frameOffset * DN_COUNT;
      for (let dn = 0; dn < DN_COUNT; dn += 1) {
        const value = feature[dn];
        sums[base + dn] += value;
        sumSquares[base + dn] += value * value;
      }
    }
  }

  const denom = Math.max(1, rows.length - 1);
  const ranked = [];
  for (let slot = 0; slot < rawCount; slot += 1) {
    const mean = sums[slot] / rows.length;
    const variance = Math.max(
      0,
      (sumSquares[slot] - rows.length * mean * mean) / denom,
    );
    if (variance > 1e-12) ranked.push({ slot, variance });
  }
  ranked.sort((a, b) => b.variance - a.variance || a.slot - b.slot);
  if (ranked.length < TOP_FEATURES) {
    throw new Error(
      "insufficient nonzero-variance slots for frames=" +
        frames +
        ": " +
        ranked.length,
    );
  }
  return ranked.slice(0, TOP_FEATURES).map((row) => row.slot);
}

function fitStats(rows, frames, slots) {
  const means = new Float64Array(slots.length);
  const scales = new Float64Array(slots.length);
  for (const row of rows) {
    for (let index = 0; index < slots.length; index += 1) {
      means[index] += rawValue(row, frames, slots[index]);
    }
  }
  for (let index = 0; index < slots.length; index += 1) {
    means[index] /= rows.length;
  }
  for (const row of rows) {
    for (let index = 0; index < slots.length; index += 1) {
      const delta = rawValue(row, frames, slots[index]) - means[index];
      scales[index] += delta * delta;
    }
  }
  for (let index = 0; index < slots.length; index += 1) {
    scales[index] = Math.sqrt(
      scales[index] / Math.max(1, rows.length - 1),
    );
    if (!Number.isFinite(scales[index]) || scales[index] < 1e-6) {
      scales[index] = 1;
    }
  }
  return { means, scales };
}

function makeMatrix(rows, frames, slots, stats, permutations = null) {
  return rows.map((row) => {
    const permutation = permutations?.get(row.baseSeed) ?? null;
    const x = new Float64Array(slots.length);
    for (let index = 0; index < slots.length; index += 1) {
      x[index] = clamp(
        (rawValue(row, frames, slots[index], permutation) - stats.means[index]) /
          stats.scales[index],
        -5,
        5,
      );
    }
    return x;
  });
}

function softmax(scores) {
  const maxScore = Math.max(...scores);
  const exp = scores.map((value) => Math.exp(value - maxScore));
  const total = exp.reduce((sum, value) => sum + value, 0);
  return exp.map((value) => value / total);
}

function trainSoftmax(matrix, labels) {
  const featureCount = matrix[0].length;
  const weights = Array.from({ length: 4 }, () => new Float64Array(featureCount));
  const bias = new Float64Array(4);
  const order = shuffledIndices(matrix.length, ORDER_SEED);

  for (let epoch = 0; epoch < EPOCHS; epoch += 1) {
    const gradW = Array.from({ length: 4 }, () => new Float64Array(featureCount));
    const gradB = new Float64Array(4);

    for (const rowIndex of order) {
      const x = matrix[rowIndex];
      const scores = new Array(4).fill(0);
      for (let cls = 0; cls < 4; cls += 1) {
        let score = bias[cls];
        const w = weights[cls];
        for (let feature = 0; feature < featureCount; feature += 1) {
          score += w[feature] * x[feature];
        }
        scores[cls] = score;
      }
      const probabilities = softmax(scores);
      const label = labels[rowIndex];

      for (let cls = 0; cls < 4; cls += 1) {
        const error = probabilities[cls] - Number(label === cls);
        gradB[cls] += error;
        for (let feature = 0; feature < featureCount; feature += 1) {
          gradW[cls][feature] += error * x[feature];
        }
      }
    }

    const invN = 1 / matrix.length;
    for (let cls = 0; cls < 4; cls += 1) {
      bias[cls] -= LEARNING_RATE * gradB[cls] * invN;
      for (let feature = 0; feature < featureCount; feature += 1) {
        weights[cls][feature] -=
          LEARNING_RATE *
          (gradW[cls][feature] * invN + L2 * weights[cls][feature]);
      }
    }
  }

  return { weights, bias };
}

function predict(model, x) {
  let bestClass = 0;
  let bestScore = -Infinity;
  for (let cls = 0; cls < 4; cls += 1) {
    let score = model.bias[cls];
    for (let feature = 0; feature < x.length; feature += 1) {
      score += model.weights[cls][feature] * x[feature];
    }
    if (score > bestScore) {
      bestScore = score;
      bestClass = cls;
    }
  }
  return bestClass;
}

function metrics(rows, matrix, model) {
  const totals = new Array(4).fill(0);
  const correct = new Array(4).fill(0);
  const confusion = Array.from({ length: 4 }, () => new Array(4).fill(0));

  rows.forEach((row, index) => {
    const actual = row.classIndex;
    const predicted = predict(model, matrix[index]);
    totals[actual] += 1;
    confusion[actual][predicted] += 1;
    if (actual === predicted) correct[actual] += 1;
  });

  const recall = totals.map((total, cls) =>
    total ? correct[cls] / total : 0,
  );
  const balancedAccuracy =
    recall.reduce((sum, value) => sum + value, 0) / recall.length;

  return {
    balancedAccuracy,
    recall,
    minClassRecall: Math.min(...recall),
    confusion,
  };
}

function shuffledLabels(labels) {
  const order = shuffledIndices(labels.length, LABEL_SHUFFLE_SEED);
  return order.map((source) => labels[source]);
}

function summarizeSlots(slots, frames) {
  return slots.map((rawSlot) => ({
    rawSlot,
    frameOffset: Math.floor(rawSlot / DN_COUNT),
    frameFromHistoryStart:
      HISTORY_FRAMES - frames + Math.floor(rawSlot / DN_COUNT),
    dnIndex: rawSlot % DN_COUNT,
  }));
}

async function main() {
  const outDir = resolve("results/screen-v15a-injury-memory");
  await mkdir(outDir, { recursive: true });

  const connectome = await loadConnectome({
    cacheDir: resolve(".cache/maplefly-connectome"),
    onProgress(message) {
      console.log("[connectome] " + message);
    },
  });

  for (const side of ["L", "R"]) {
    const taste = cells(connectome.meta, ["LB3", "claw_tpGRN"], side);
    if (!taste.length) throw new Error("taste_" + side + " missing");
    connectome.inputGroups.set("taste_" + side, taste);
  }

  const dn = buildDnContract(connectome.meta);
  const trainRows = await collectDataset(
    connectome,
    dn.slot,
    TRAIN_BASE_SEEDS,
    "train",
  );
  const evalRows = await collectDataset(
    connectome,
    dn.slot,
    EVAL_BASE_SEEDS,
    "eval",
  );

  if (trainRows.length !== 96 || evalRows.length !== 72) {
    throw new Error(
      "dataset size mismatch train=" +
        trainRows.length +
        " eval=" +
        evalRows.length,
    );
  }

  const trainLabels = trainRows.map((row) => row.classIndex);
  const labelShuffled = shuffledLabels(trainLabels);
  const representations = [];

  for (const spec of REPRESENTATIONS) {
    const slots = selectVarianceSlots(trainRows, spec.frames);
    const stats = fitStats(trainRows, spec.frames, slots);
    const trainMatrix = makeMatrix(trainRows, spec.frames, slots, stats);
    const evalMatrix = makeMatrix(evalRows, spec.frames, slots, stats);
    const model = trainSoftmax(trainMatrix, trainLabels);
    const full = metrics(evalRows, evalMatrix, model);

    const permutations = new Map(
      EVAL_BASE_SEEDS.map((baseSeed) => [
        baseSeed,
        makePermutation(DN_COUNT, baseSeed + 900000),
      ]),
    );
    const shuffledMatrix = makeMatrix(
      evalRows,
      spec.frames,
      slots,
      stats,
      permutations,
    );
    const dnShuffled = metrics(evalRows, shuffledMatrix, model);

    const shuffledModel = trainSoftmax(trainMatrix, labelShuffled);
    const labelShuffle = metrics(evalRows, evalMatrix, shuffledModel);
    const dnShuffleMargin =
      full.balancedAccuracy - dnShuffled.balancedAccuracy;

    const gateChecks = {
      balancedAccuracy:
        full.balancedAccuracy >= GATE.balancedAccuracyMin,
      everyClassRecall:
        full.minClassRecall >= GATE.everyClassRecallMin,
      dnShuffleMargin:
        dnShuffleMargin >= GATE.dnShuffleMarginMin,
    };
    const pass = Object.values(gateChecks).every(Boolean);

    representations.push({
      name: spec.name,
      frames: spec.frames,
      seconds: spec.frames * FRAME_STEPS * STEP_SECONDS,
      rawFeatureCount: spec.frames * DN_COUNT,
      selectedFeatureCount: slots.length,
      selectedSlots: summarizeSlots(slots, spec.frames),
      full,
      dnShuffled,
      dnShuffleMargin,
      labelShuffle,
      gateChecks,
      pass,
    });

    console.log(
      "[v15A-screen] " +
        spec.name +
        " FULL=" +
        (full.balancedAccuracy * 100).toFixed(1) +
        "% minRecall=" +
        (full.minClassRecall * 100).toFixed(1) +
        "% DN_SHUFFLED=" +
        (dnShuffled.balancedAccuracy * 100).toFixed(1) +
        "% margin=" +
        (dnShuffleMargin * 100).toFixed(1) +
        "pp LABEL_SHUFFLED=" +
        (labelShuffle.balancedAccuracy * 100).toFixed(1) +
        "% " +
        (pass ? "PASS" : "FAIL"),
    );
  }

  const selected =
    representations.find((row) => row.pass)?.name ?? null;
  const pass = selected !== null;

  const output = {
    schema: "maplefly.v15a.injury-history-screen.1",
    brainRepository: SOURCE.repository,
    brainCommit: SOURCE.commit,
    preregistration: {
      path: "history/prereg_v15a.md",
      commit: PREREG_COMMIT,
    },
    sensory: {
      ground: { SNta_L: 0.05, SNta_R: 0.05 },
      impact: {
        population: "LgLG",
        drive: IMPACT_DRIVE,
        pulseSteps: IMPACT_PULSE_STEPS,
        pulseMs: IMPACT_PULSE_STEPS * STEP_SECONDS * 1000,
      },
      tasteOffer: {
        populations: ["LB3", "claw_tpGRN"],
        drive: TASTE_DRIVE,
        durationSteps: FRAME_STEPS,
        durationMs: FRAME_STEPS * STEP_SECONDS * 1000,
        independentOfClass: true,
      },
    },
    timing: {
      stepSeconds: STEP_SECONDS,
      settleSteps: SETTLE_STEPS,
      baselineSteps: BASELINE_STEPS,
      frameSteps: FRAME_STEPS,
      historyFrames: HISTORY_FRAMES,
      impactStartSteps: IMPACT_STARTS,
    },
    dataset: {
      trainBaseSeeds: TRAIN_BASE_SEEDS,
      evalBaseSeeds: EVAL_BASE_SEEDS,
      replicatesPerClassPerSeed: REPLICATES,
      trainRows: trainRows.length,
      evalRows: evalRows.length,
      pairedBrainSeedAcrossClasses: true,
    },
    featureContract: {
      source: "baseline-relative frozen MaleCNS DN temporal activity only",
      dnCount: DN_COUNT,
      topVarianceSlots: TOP_FEATURES,
      labelUsedForFeatureSelection: false,
      forbiddenGameStateInputsPresent: false,
    },
    classifier: {
      classes: 4,
      epochs: EPOCHS,
      learningRate: LEARNING_RATE,
      l2: L2,
      orderSeed: ORDER_SEED,
      labelShuffleSeed: LABEL_SHUFFLE_SEED,
    },
    gate: GATE,
    representations,
    selectedRepresentation: selected,
    pass,
    trainSchedule: trainRows.map((row) => ({
      baseSeed: row.baseSeed,
      brainSeed: row.brainSeed,
      classIndex: row.classIndex,
      replicate: row.replicate,
      impactEvents: row.impactEvents,
    })),
    evalSchedule: evalRows.map((row) => ({
      baseSeed: row.baseSeed,
      brainSeed: row.brainSeed,
      classIndex: row.classIndex,
      replicate: row.replicate,
      impactEvents: row.impactEvents,
    })),
  };

  await writeFile(
    resolve(outDir, "v15a_screen.json"),
    JSON.stringify(output, null, 2) + "\n",
  );

  console.log(
    "V15A-INJURY-HISTORY-SCREEN=" +
      (pass ? "PASS" : "FAIL") +
      " selected=" +
      (selected ?? "NONE"),
  );

  if (!pass) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
