#!/usr/bin/env node

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
const TRAIN_BASE_SEEDS = [2810000, 2810100, 2810200, 2810300];
const EVAL_BASE_SEEDS = [2815000, 2815100, 2815200];
const REPLICATES = 6;
const EPOCHS = 240;
const LEARNING_RATE = 0.03;
const L2 = 0.001;
const THRESHOLD = 0.5;
const ORDER_SEED = 2816000;
const PREREG_COMMIT = "0e815c65b8cc3ea269fd9d784cc41c677afb6704";
const GATE = Object.freeze({
  balancedAccuracyMin: 0.70,
  everyClassRecallMin: 0.60,
  dnShuffleMarginMin: 0.20,
});
const TASKS = [
  { name: "A_PRESENCE_0v1", lowClass: 0, highClass: 1, required: true, labelSeed: 2817000 },
  { name: "B_BURDEN_1v3", lowClass: 1, highClass: 3, required: true, labelSeed: 2817001 },
  { name: "C_WIDE_0v3", lowClass: 0, highClass: 3, required: false, labelSeed: 2817002 },
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

function feature(current, baseline) {
  const out = new Float32Array(DN_COUNT);
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

  const history = [];
  for (let frameIndex = 0; frameIndex < HISTORY_FRAMES; frameIndex += 1) {
    const counts = new Float64Array(DN_COUNT);
    for (let local = 0; local < FRAME_STEPS; local += 1) {
      const step = frameIndex * FRAME_STEPS + local;
      stimulate(brain, connectome.inputGroups, historyDrive(step, events));
      brain.step();
      collectDn(brain, dnSlot, counts);
    }
    history.push(feature(rate(counts, FRAME_STEPS), baseline));
  }

  return { baseSeed, brainSeed, classIndex, replicate, events, history };
}

async function collectDataset(connectome, dnSlot, baseSeeds, label) {
  const rows = [];
  for (const baseSeed of baseSeeds) {
    for (let replicate = 0; replicate < REPLICATES; replicate += 1) {
      for (let classIndex = 0; classIndex < 4; classIndex += 1) {
        rows.push(await collectEpisode(connectome, dnSlot, baseSeed, classIndex, replicate));
      }
    }
    console.log("[v15A4-" + label + "] baseSeed=" + baseSeed + " rows=" + rows.length);
    await new Promise((resolveNow) => setImmediate(resolveNow));
  }
  return rows;
}

function rawValue(row, rawSlot, permutation = null) {
  const frame = Math.floor(rawSlot / DN_COUNT);
  const dn = rawSlot % DN_COUNT;
  return row.history[frame][permutation ? permutation[dn] : dn];
}

function selectSlots(rows) {
  const rawCount = HISTORY_FRAMES * DN_COUNT;
  const sums = new Float64Array(rawCount);
  const squares = new Float64Array(rawCount);
  for (const row of rows) {
    for (let frame = 0; frame < HISTORY_FRAMES; frame += 1) {
      const values = row.history[frame];
      const base = frame * DN_COUNT;
      for (let dn = 0; dn < DN_COUNT; dn += 1) {
        const value = values[dn];
        sums[base + dn] += value;
        squares[base + dn] += value * value;
      }
    }
  }
  const denom = Math.max(1, rows.length - 1);
  const ranked = [];
  for (let slot = 0; slot < rawCount; slot += 1) {
    const mean = sums[slot] / rows.length;
    const variance = Math.max(0, (squares[slot] - rows.length * mean * mean) / denom);
    if (variance > 1e-12) ranked.push({ slot, variance });
  }
  ranked.sort((a, b) => b.variance - a.variance || a.slot - b.slot);
  if (ranked.length < TOP_FEATURES) throw new Error("insufficient variance slots");
  return ranked.slice(0, TOP_FEATURES).map((row) => row.slot);
}

function fitStats(rows, slots) {
  const means = new Float64Array(slots.length);
  const scales = new Float64Array(slots.length);
  for (const row of rows) {
    for (let i = 0; i < slots.length; i += 1) means[i] += rawValue(row, slots[i]);
  }
  for (let i = 0; i < slots.length; i += 1) means[i] /= rows.length;
  for (const row of rows) {
    for (let i = 0; i < slots.length; i += 1) {
      const delta = rawValue(row, slots[i]) - means[i];
      scales[i] += delta * delta;
    }
  }
  for (let i = 0; i < slots.length; i += 1) {
    scales[i] = Math.sqrt(scales[i] / Math.max(1, rows.length - 1));
    if (!Number.isFinite(scales[i]) || scales[i] < 1e-6) scales[i] = 1;
  }
  return { means, scales };
}

function vector(row, slots, stats, permutation = null) {
  const out = new Float64Array(slots.length);
  for (let i = 0; i < slots.length; i += 1) {
    out[i] = clamp(
      (rawValue(row, slots[i], permutation) - stats.means[i]) / stats.scales[i],
      -5,
      5,
    );
  }
  return out;
}

function taskRows(rows, task, slots, stats, permutations = null) {
  return rows
    .filter((row) => row.classIndex === task.lowClass || row.classIndex === task.highClass)
    .map((row) => ({
      row,
      label: Number(row.classIndex === task.highClass),
      x: vector(row, slots, stats, permutations?.get(row.baseSeed) ?? null),
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

function predict(model, x) {
  let score = model.bias;
  for (let f = 0; f < TOP_FEATURES; f += 1) score += model.weights[f] * x[f];
  return sigmoid(score) >= THRESHOLD ? 1 : 0;
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

async function main() {
  const outDir = resolve("results/screen-v15a4-injury-burden");
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

  const slots = selectSlots(trainAll);
  const stats = fitStats(trainAll, slots);
  const permutations = new Map(
    EVAL_BASE_SEEDS.map((baseSeed) => [
      baseSeed,
      makePermutation(DN_COUNT, baseSeed + 900000),
    ]),
  );

  const results = [];
  for (const task of TASKS) {
    const trainRows = taskRows(trainAll, task, slots, stats);
    const evalRows = taskRows(evalAll, task, slots, stats);
    const shuffledEvalRows = taskRows(evalAll, task, slots, stats, permutations);
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

    results.push({
      ...task,
      trainRows: trainRows.length,
      evalRows: evalRows.length,
      full,
      dnShuffled,
      dnShuffleMargin: margin,
      labelShuffled,
      gateChecks,
      pass,
    });

    console.log(
      "[v15A4] " + task.name +
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
    schema: "maplefly.v15a4.injury-burden-separability.1",
    brainRepository: SOURCE.repository,
    brainCommit: SOURCE.commit,
    preregistration: { path: "history/prereg_v15a4.md", commit: PREREG_COMMIT },
    representation: {
      name: "CONCAT48",
      historyFrames: HISTORY_FRAMES,
      selectedFeatureCount: TOP_FEATURES,
      selectedSlots: slots.map((rawSlot) => ({
        rawSlot,
        frame: Math.floor(rawSlot / DN_COUNT),
        dnIndex: rawSlot % DN_COUNT,
      })),
      means: Array.from(stats.means),
      scales: Array.from(stats.scales),
    },
    dataset: {
      trainBaseSeeds: TRAIN_BASE_SEEDS,
      evalBaseSeeds: EVAL_BASE_SEEDS,
      replicates: REPLICATES,
      trainRows: trainAll.length,
      evalRows: evalAll.length,
    },
    gate: GATE,
    tasks: results,
    pass,
  };

  await writeFile(
    resolve(outDir, "v15a4_screen.json"),
    JSON.stringify(output, null, 2) + "\n",
  );

  console.log("V15A4-INJURY-BURDEN-SCREEN=" + (pass ? "PASS" : "FAIL"));
  if (!pass) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
