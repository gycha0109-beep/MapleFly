#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  SOURCE,
  ConnectomeBrain,
  cells,
  cellsWithPrefix,
  loadConnectome,
} from "../src/headless/connectome-runtime.mjs";

const STEP_SECONDS = 0.02;
const SETTLE_STEPS = 26;
const BASELINE_STEPS = 26;
const FRAME_STEPS = 5;
const HISTORY_FRAMES = 48;
const DN_COUNT = 1316;
const TOP_FEATURES = 256;
const IMPACT_DRIVE = 0.7;
const IMPACT_PULSE_STEPS = 6;
const TASTE_DRIVE = 0.8;
const IMPACT_STARTS = [25, 55, 85, 115, 145, 175];
const TRAIN_BASE_SEEDS = [2830000, 2830100, 2830200, 2830300];
const EVAL_BASE_SEEDS = [2835000, 2835100, 2835200];
const REPLICATES = 6;
const EPOCHS = 240;
const LEARNING_RATE = 0.03;
const L2 = 0.001;
const THRESHOLD = 0.5;
const ORDER_SEED = 2836000;
const PREREG_COMMIT = "06e1cdcf09f0475f69491fb7243c254f917e1473";
const GATE = Object.freeze({
  balancedAccuracyMin: 0.70,
  everyClassRecallMin: 0.60,
  dnShuffleMarginMin: 0.20,
});
const TASKS = [
  { name: "A_ECONOMIC_STATE_01v23", lowClasses: [0, 1], highClasses: [2, 3], required: true, labelSeed: 2837000 },
  { name: "B_ECONOMIC_BOUNDARY_1v2", lowClasses: [1], highClasses: [2], required: true, labelSeed: 2837001 },
  { name: "C_WIDE_ANCHOR_0v3", lowClasses: [0], highClasses: [3], required: false, labelSeed: 2837002 },
  { name: "D_WITHIN_LOW_0v1", lowClasses: [0], highClasses: [1], required: false, labelSeed: 2837003 },
  { name: "E_WITHIN_HIGH_2v3", lowClasses: [2], highClasses: [3], required: false, labelSeed: 2837004 },
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function sigmoid(value) {
  const x = clamp(value, -30, 30);
  return 1 / (1 + Math.exp(-x));
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

function buildDnSlot(meta) {
  const allDn = cells(meta, ["descending_neuron", "descending_neuron_tbc"]);
  if (allDn.length !== DN_COUNT) throw new Error("DN contract mismatch");
  const slot = new Int16Array(meta.n).fill(-1);
  allDn.forEach((neuron, index) => {
    slot[neuron] = index;
  });
  return slot;
}

function collectDn(brain, dnSlot, counts) {
  for (let i = 0; i < brain.firedCount; i += 1) {
    const slot = dnSlot[brain.fired[i]];
    if (slot >= 0) counts[slot] += 1;
  }
}

function rate(counts, steps) {
  const seconds = steps * STEP_SECONDS;
  return Float64Array.from(counts, (count) => count / seconds);
}

function frameFeature(current, baseline) {
  const out = new Float64Array(DN_COUNT);
  for (let i = 0; i < DN_COUNT; i += 1) {
    out[i] = clamp((current[i] - baseline[i]) / 50, -1, 1);
  }
  return out;
}

function groundDrive() {
  return { SNta_L: 0.05, SNta_R: 0.05 };
}

function makeEvents(brainSeed, classIndex) {
  const random = mulberry32(brainSeed + 500000);
  const order = [...IMPACT_STARTS];
  for (let index = order.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [order[index], order[swap]] = [order[swap], order[index]];
  }
  const events = order.slice(0, classIndex).map((start) => ({
    start,
    side: random() < 0.5 ? "L" : "R",
  }));
  events.sort((a, b) => a.start - b.start);
  return events;
}

function historyDrive(step, events) {
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

async function collectEpisode(connectome, dnSlot, baseSeed, classIndex, replicate) {
  const brainSeed = baseSeed + replicate * 7 + 1;
  const events = makeEvents(brainSeed, classIndex);
  const brain = new ConnectomeBrain(connectome.weights, connectome.meta.params, brainSeed);

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
  const baseline = rate(baselineCounts, BASELINE_STEPS);

  const pooled = new Float64Array(DN_COUNT);
  for (let frameIndex = 0; frameIndex < HISTORY_FRAMES; frameIndex += 1) {
    const counts = new Float64Array(DN_COUNT);
    for (let local = 0; local < FRAME_STEPS; local += 1) {
      const step = frameIndex * FRAME_STEPS + local;
      stimulate(brain, connectome.inputGroups, historyDrive(step, events));
      brain.step();
      collectDn(brain, dnSlot, counts);
    }
    const current = frameFeature(rate(counts, FRAME_STEPS), baseline);
    for (let d = 0; d < DN_COUNT; d += 1) pooled[d] += current[d] / HISTORY_FRAMES;
  }

  return { baseSeed, brainSeed, classIndex, replicate, events, pooled };
}

async function collectDataset(connectome, dnSlot, baseSeeds, label) {
  const rows = [];
  for (const baseSeed of baseSeeds) {
    for (let replicate = 0; replicate < REPLICATES; replicate += 1) {
      for (let classIndex = 0; classIndex < 4; classIndex += 1) {
        rows.push(await collectEpisode(connectome, dnSlot, baseSeed, classIndex, replicate));
      }
    }
    console.log("[v15A6-" + label + "] baseSeed=" + baseSeed + " rows=" + rows.length);
    await new Promise((resolveNow) => setImmediate(resolveNow));
  }
  return rows;
}

function fitRepresentation(trainAll) {
  if (trainAll.length !== 96) throw new Error("POOL48 fit requires 96 TRAIN rows");
  const meansAll = new Float64Array(DN_COUNT);
  for (const row of trainAll) {
    for (let d = 0; d < DN_COUNT; d += 1) meansAll[d] += row.pooled[d] / trainAll.length;
  }

  const variancesAll = new Float64Array(DN_COUNT);
  for (const row of trainAll) {
    for (let d = 0; d < DN_COUNT; d += 1) {
      const delta = row.pooled[d] - meansAll[d];
      variancesAll[d] += (delta * delta) / trainAll.length;
    }
  }

  const selected = Array.from({ length: DN_COUNT }, (_, dnSlot) => dnSlot)
    .sort((a, b) => variancesAll[b] - variancesAll[a] || a - b)
    .slice(0, TOP_FEATURES);

  const means = selected.map((dnSlot) => meansAll[dnSlot]);
  const scales = selected.map((dnSlot) => Math.max(Math.sqrt(variancesAll[dnSlot]), 1e-6));
  const selectedSlots = selected.map((dnSlot) => ({
    dnSlot,
    variance: variancesAll[dnSlot],
  }));

  const representation = {
    name: "POOL48",
    historyFrames: HISTORY_FRAMES,
    frameSteps: FRAME_STEPS,
    frameSeconds: FRAME_STEPS * STEP_SECONDS,
    historySeconds: HISTORY_FRAMES * FRAME_STEPS * STEP_SECONDS,
    dnCount: DN_COUNT,
    selectedFeatureCount: TOP_FEATURES,
    selection: "TRAIN_ALL_STATES_LABEL_BLIND_VARIANCE_TOP256",
    tieBreak: "VARIANCE_DESC_THEN_DN_SLOT_ASC",
    normalization: "TRAIN_ALL_STATES_POPULATION_STD_CLAMP_5",
    selectedSlots,
    means,
    scales,
  };
  const sha256 = createHash("sha256").update(JSON.stringify(representation)).digest("hex");
  return { representation, sha256, selected, means, scales };
}

function vector(row, fitted, permutation = null) {
  const out = new Float64Array(TOP_FEATURES);
  for (let i = 0; i < TOP_FEATURES; i += 1) {
    const selectedDn = fitted.selected[i];
    const sourceDn = permutation ? permutation[selectedDn] : selectedDn;
    out[i] = clamp((row.pooled[sourceDn] - fitted.means[i]) / fitted.scales[i], -5, 5);
  }
  return out;
}

function taskRows(rows, task, fitted, permutations = null) {
  const low = new Set(task.lowClasses);
  const high = new Set(task.highClasses);
  return rows
    .filter((row) => low.has(row.classIndex) || high.has(row.classIndex))
    .map((row) => ({
      row,
      label: Number(high.has(row.classIndex)),
      x: vector(row, fitted, permutations?.get(row.baseSeed) ?? null),
    }));
}

function train(rows, labelsOverride = null) {
  const weights = new Float64Array(TOP_FEATURES);
  let bias = 0;
  const order = shuffledIndices(rows.length, ORDER_SEED);

  for (let epoch = 0; epoch < EPOCHS; epoch += 1) {
    let gradBias = 0;
    const grad = new Float64Array(TOP_FEATURES);
    for (const index of order) {
      const item = rows[index];
      const label = labelsOverride ? labelsOverride[index] : item.label;
      let score = bias;
      for (let f = 0; f < TOP_FEATURES; f += 1) score += weights[f] * item.x[f];
      const error = sigmoid(score) - label;
      gradBias += error;
      for (let f = 0; f < TOP_FEATURES; f += 1) grad[f] += error * item.x[f];
    }
    const invN = 1 / rows.length;
    bias -= LEARNING_RATE * gradBias * invN;
    for (let f = 0; f < TOP_FEATURES; f += 1) {
      weights[f] -= LEARNING_RATE * (grad[f] * invN + L2 * weights[f]);
    }
  }
  return { weights, bias };
}

function probability(model, x) {
  let score = model.bias;
  for (let f = 0; f < TOP_FEATURES; f += 1) score += model.weights[f] * x[f];
  return sigmoid(score);
}

function predict(model, x) {
  return probability(model, x) >= THRESHOLD ? 1 : 0;
}

function evaluate(rows, model) {
  const total = [0, 0];
  const correct = [0, 0];
  const confusion = [[0, 0], [0, 0]];
  for (const item of rows) {
    const predicted = predict(model, item.x);
    total[item.label] += 1;
    confusion[item.label][predicted] += 1;
    if (predicted === item.label) correct[item.label] += 1;
  }
  const recall = total.map((n, cls) => n ? correct[cls] / n : 0);
  return {
    balancedAccuracy: (recall[0] + recall[1]) / 2,
    recall,
    minClassRecall: Math.min(...recall),
    confusion,
  };
}

function shuffledLabels(rows, seed) {
  const labels = rows.map((row) => row.label);
  const order = shuffledIndices(labels.length, seed);
  return order.map((source) => labels[source]);
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function taskAStateProbabilities(evalAll, model, fitted) {
  const output = {};
  for (let classIndex = 0; classIndex < 4; classIndex += 1) {
    const values = evalAll
      .filter((row) => row.classIndex === classIndex)
      .map((row) => probability(model, vector(row, fitted)));
    output[classIndex] = {
      count: values.length,
      mean: values.reduce((sum, value) => sum + value, 0) / values.length,
      median: median(values),
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }
  return output;
}

async function main() {
  const outDir = resolve("results/screen-v15a6-temporal-integration");
  await mkdir(outDir, { recursive: true });

  const connectome = await loadConnectome({
    cacheDir: resolve(".cache/maplefly-connectome"),
    onProgress(message) { console.log("[connectome] " + message); },
  });

  for (const side of ["L", "R"]) {
    const impact = cellsWithPrefix(connectome.meta, "LgLG", side);
    const expected = side === "L" ? 331 : 338;
    if (impact.length !== expected) throw new Error("LgLG_" + side + " count mismatch");
    connectome.inputGroups.set("LgLG_" + side, impact);

    const taste = cells(connectome.meta, ["LB3", "claw_tpGRN"], side);
    if (!taste.length) throw new Error("taste_" + side + " missing");
    connectome.inputGroups.set("taste_" + side, taste);
  }

  const dnSlot = buildDnSlot(connectome.meta);
  const trainAll = await collectDataset(connectome, dnSlot, TRAIN_BASE_SEEDS, "train");
  const evalAll = await collectDataset(connectome, dnSlot, EVAL_BASE_SEEDS, "eval");
  if (trainAll.length !== 96 || evalAll.length !== 72) throw new Error("dataset size mismatch");

  const fitted = fitRepresentation(trainAll);
  console.log("[v15A6] POOL48 representation sha256=" + fitted.sha256);
  console.log("[v15A6] selected DN slots=" + fitted.selected.join(","));

  const permutations = new Map(
    EVAL_BASE_SEEDS.map((baseSeed) => [
      baseSeed,
      makePermutation(DN_COUNT, baseSeed + 900000),
    ]),
  );

  const results = [];
  for (let taskIndex = 0; taskIndex < TASKS.length; taskIndex += 1) {
    const task = TASKS[taskIndex];
    const trainRows = taskRows(trainAll, task, fitted);
    const evalRows = taskRows(evalAll, task, fitted);
    const shuffledEvalRows = taskRows(evalAll, task, fitted, permutations);
    const model = train(trainRows);
    const full = evaluate(evalRows, model);
    const dnShuffled = evaluate(shuffledEvalRows, model);
    const shuffledModel = train(trainRows, shuffledLabels(trainRows, task.labelSeed));
    const labelShuffled = evaluate(evalRows, shuffledModel);
    const margin = full.balancedAccuracy - dnShuffled.balancedAccuracy;
    const gateChecks = {
      balancedAccuracy: full.balancedAccuracy >= GATE.balancedAccuracyMin,
      everyClassRecall: full.minClassRecall >= GATE.everyClassRecallMin,
      dnShuffleMargin: margin >= GATE.dnShuffleMarginMin,
    };
    const pass = Object.values(gateChecks).every(Boolean);

    const result = {
      ...task,
      trainRows: trainRows.length,
      evalRows: evalRows.length,
      full,
      dnShuffled,
      dnShuffleMargin: margin,
      labelShuffled,
      gateChecks,
      pass,
    };
    if (taskIndex === 0) {
      result.originalStateHighProbability = taskAStateProbabilities(evalAll, model, fitted);
    }
    results.push(result);

    console.log(
      "[v15A6] " + task.name +
      " FULL=" + (full.balancedAccuracy * 100).toFixed(1) +
      "% recall=" + full.recall.map((x) => (x * 100).toFixed(1)).join("/") +
      "% DN_SHUFFLED=" + (dnShuffled.balancedAccuracy * 100).toFixed(1) +
      "% margin=" + (margin * 100).toFixed(1) +
      "pp LABEL_SHUFFLED=" + (labelShuffled.balancedAccuracy * 100).toFixed(1) +
      "% " + (pass ? "PASS" : "FAIL"),
    );
  }

  const pass = results.filter((row) => row.required).every((row) => row.pass);
  const output = {
    schema: "maplefly.v15a6.temporal-integration.1",
    brainRepository: SOURCE.repository,
    brainCommit: SOURCE.commit,
    preregistration: { path: "history/prereg_v15a6.md", commit: PREREG_COMMIT },
    sensory: {
      lglgLeft: 331,
      lglgRight: 338,
      impactDrive: IMPACT_DRIVE,
      impactPulseSteps: IMPACT_PULSE_STEPS,
      impactPulseMs: IMPACT_PULSE_STEPS * STEP_SECONDS * 1000,
      groundSnta: 0.05,
      tasteDrive: TASTE_DRIVE,
      tasteFinalSteps: FRAME_STEPS,
    },
    representation: fitted.representation,
    representationSha256: fitted.sha256,
    economicBoundary: {
      potionNominalHeal: 30,
      contactDamage: 10,
      lowOriginalStates: [0, 1],
      highOriginalStates: [2, 3],
      utilizationBoundary: 0.5,
    },
    dataset: {
      trainBaseSeeds: TRAIN_BASE_SEEDS,
      evalBaseSeeds: EVAL_BASE_SEEDS,
      replicates: REPLICATES,
      trainRows: trainAll.length,
      evalRows: evalAll.length,
    },
    classifier: {
      epochs: EPOCHS,
      learningRate: LEARNING_RATE,
      l2: L2,
      threshold: THRESHOLD,
      orderSeed: ORDER_SEED,
    },
    gate: GATE,
    tasks: results,
    pass,
    v15B: pass ? "PREREGISTRATION_PERMITTED" : "BLOCKED",
  };

  await writeFile(
    resolve(outDir, "v15a6_screen.json"),
    JSON.stringify(output, null, 2) + "\n",
    "utf8",
  );

  console.log("[v15A6] overall=" + (pass ? "PASS" : "FAIL") + " v15B=" + output.v15B);
  if (!pass) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
