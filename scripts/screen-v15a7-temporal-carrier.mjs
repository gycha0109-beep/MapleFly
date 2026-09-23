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
const RAW_SLOTS = HISTORY_FRAMES * DN_COUNT;
const TOP_FEATURES = 256;
const IMPACT_DRIVE = 0.7;
const IMPACT_PULSE_STEPS = 6;
const TASTE_DRIVE = 0.8;
const IMPACT_STARTS = [25, 55, 85, 115, 145, 175];
const TRAIN_BASE_SEEDS = [2840000, 2840100, 2840200, 2840300];
const EVAL_BASE_SEEDS = [2845000, 2845100, 2845200];
const REPLICATES = 6;
const EPOCHS = 240;
const LEARNING_RATE = 0.03;
const L2 = 0.001;
const THRESHOLD = 0.5;
const ORDER_SEED = 2846000;
const BOOTSTRAP_SEED = 2849000;
const BOOTSTRAP_ITERATIONS = 2000;
const MATERIAL_LOSS_MIN = 0.10;
const PREREG_COMMIT = "41010853e9eba8124bee34b23fb88bb08bebde4f";

const GATE = Object.freeze({
  balancedAccuracyMin: 0.70,
  everyClassRecallMin: 0.60,
  dnShuffleMarginMin: 0.20,
});

const REPRESENTATIONS = [
  { name: "R0_FULL_CONCAT48", index: 0, transform: "IDENTITY" },
  { name: "R1_WHOLE_FRAME_CIRCULAR_SHIFT", index: 1, transform: "WHOLE_FRAME_CIRCULAR_SHIFT" },
  { name: "R2_WHOLE_FRAME_PERMUTATION", index: 2, transform: "WHOLE_FRAME_PERMUTATION" },
  { name: "R3_INDEPENDENT_DN_CIRCULAR_SHIFT", index: 3, transform: "INDEPENDENT_DN_CIRCULAR_SHIFT" },
];

const TASKS = [
  { name: "A_ECONOMIC_STATE_01v23", index: 0, lowClasses: [0, 1], highClasses: [2, 3], primary: true },
  { name: "B_ECONOMIC_BOUNDARY_1v2", index: 1, lowClasses: [1], highClasses: [2], primary: false },
  { name: "C_WIDE_ANCHOR_0v3", index: 2, lowClasses: [0], highClasses: [3], primary: false },
  { name: "D_WITHIN_LOW_0v1", index: 3, lowClasses: [0], highClasses: [1], primary: false },
  { name: "E_WITHIN_HIGH_2v3", index: 4, lowClasses: [2], highClasses: [3], primary: false },
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function sigmoid(value) {
  return 1 / (1 + Math.exp(-clamp(value, -30, 30)));
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

function percentile(sorted, p) {
  if (!sorted.length) return null;
  const position = (sorted.length - 1) * p;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  const weight = position - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
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
    history.push(frameFeature(rate(counts, FRAME_STEPS), baseline));
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
    console.log("[v15A7-" + label + "] baseSeed=" + baseSeed + " rows=" + rows.length);
    await new Promise((resolveNow) => setImmediate(resolveNow));
  }
  return rows;
}

function pairKey(row) {
  return row.baseSeed + ":" + row.replicate;
}

function buildTransformDescriptors(rows) {
  const descriptors = new Map();
  for (const row of rows) {
    const key = pairKey(row);
    if (descriptors.has(key)) continue;

    const shiftRandom = mulberry32(row.baseSeed + row.replicate * 1009 + 2848100);
    const wholeShift = 1 + Math.floor(shiftRandom() * 47);

    const framePermutation = shuffledIndices(
      HISTORY_FRAMES,
      row.baseSeed + row.replicate * 1009 + 2848200,
    );

    const dnRandom = mulberry32(row.baseSeed + row.replicate * 1009 + 2848300);
    const dnShifts = new Uint8Array(DN_COUNT);
    for (let dn = 0; dn < DN_COUNT; dn += 1) {
      dnShifts[dn] = 1 + Math.floor(dnRandom() * 47);
    }

    descriptors.set(key, { wholeShift, framePermutation, dnShifts });
  }
  return descriptors;
}

function transformedValue(row, representationName, frame, dn, descriptors) {
  const descriptor = descriptors.get(pairKey(row));
  if (!descriptor) throw new Error("missing transform descriptor");

  if (representationName === "R0_FULL_CONCAT48") {
    return row.history[frame][dn];
  }
  if (representationName === "R1_WHOLE_FRAME_CIRCULAR_SHIFT") {
    const sourceFrame = (frame - descriptor.wholeShift + HISTORY_FRAMES) % HISTORY_FRAMES;
    return row.history[sourceFrame][dn];
  }
  if (representationName === "R2_WHOLE_FRAME_PERMUTATION") {
    return row.history[descriptor.framePermutation[frame]][dn];
  }
  if (representationName === "R3_INDEPENDENT_DN_CIRCULAR_SHIFT") {
    const sourceFrame = (frame - descriptor.dnShifts[dn] + HISTORY_FRAMES) % HISTORY_FRAMES;
    return row.history[sourceFrame][dn];
  }
  throw new Error("unknown representation: " + representationName);
}

function transformedRawSlotValue(row, representationName, rawSlot, descriptors, dnPermutation = null) {
  const frame = Math.floor(rawSlot / DN_COUNT);
  const targetDn = rawSlot % DN_COUNT;
  const sourceDn = dnPermutation ? dnPermutation[targetDn] : targetDn;
  return transformedValue(row, representationName, frame, sourceDn, descriptors);
}

function fitRepresentation(trainAll, representation, descriptors) {
  if (trainAll.length !== 96) throw new Error("representation fit requires 96 TRAIN rows");

  const meansAll = new Float64Array(RAW_SLOTS);
  for (const row of trainAll) {
    for (let rawSlot = 0; rawSlot < RAW_SLOTS; rawSlot += 1) {
      meansAll[rawSlot] += transformedRawSlotValue(
        row,
        representation.name,
        rawSlot,
        descriptors,
      ) / trainAll.length;
    }
  }

  const variancesAll = new Float64Array(RAW_SLOTS);
  for (const row of trainAll) {
    for (let rawSlot = 0; rawSlot < RAW_SLOTS; rawSlot += 1) {
      const value = transformedRawSlotValue(row, representation.name, rawSlot, descriptors);
      const delta = value - meansAll[rawSlot];
      variancesAll[rawSlot] += (delta * delta) / trainAll.length;
    }
  }

  const selected = Array.from({ length: RAW_SLOTS }, (_, rawSlot) => rawSlot)
    .sort((a, b) => variancesAll[b] - variancesAll[a] || a - b)
    .slice(0, TOP_FEATURES);

  const means = selected.map((rawSlot) => meansAll[rawSlot]);
  const scales = selected.map((rawSlot) => Math.max(Math.sqrt(variancesAll[rawSlot]), 1e-6));
  const selectedSlots = selected.map((rawSlot) => ({
    rawSlot,
    frame: Math.floor(rawSlot / DN_COUNT),
    dnSlot: rawSlot % DN_COUNT,
    variance: variancesAll[rawSlot],
  }));

  const representationObject = {
    name: representation.name,
    transform: representation.transform,
    historyFrames: HISTORY_FRAMES,
    frameSteps: FRAME_STEPS,
    frameSeconds: FRAME_STEPS * STEP_SECONDS,
    historySeconds: HISTORY_FRAMES * FRAME_STEPS * STEP_SECONDS,
    dnCount: DN_COUNT,
    rawSlotCount: RAW_SLOTS,
    selectedFeatureCount: TOP_FEATURES,
    selection: "TRAIN_ALL_STATES_LABEL_BLIND_VARIANCE_TOP256",
    tieBreak: "VARIANCE_DESC_THEN_RAW_SLOT_ASC",
    normalization: "TRAIN_ALL_STATES_POPULATION_STD_CLAMP_5",
    selectedSlots,
    means,
    scales,
  };
  const sha256 = createHash("sha256")
    .update(JSON.stringify(representationObject))
    .digest("hex");

  return {
    representation: representationObject,
    sha256,
    selected,
    means,
    scales,
  };
}

function vector(row, representationName, fitted, descriptors, dnPermutation = null) {
  const out = new Float64Array(TOP_FEATURES);
  for (let i = 0; i < TOP_FEATURES; i += 1) {
    const value = transformedRawSlotValue(
      row,
      representationName,
      fitted.selected[i],
      descriptors,
      dnPermutation,
    );
    out[i] = clamp((value - fitted.means[i]) / fitted.scales[i], -5, 5);
  }
  return out;
}

function taskRows(rows, task, representationName, fitted, descriptors, dnPermutations = null) {
  const low = new Set(task.lowClasses);
  const high = new Set(task.highClasses);
  return rows
    .filter((row) => low.has(row.classIndex) || high.has(row.classIndex))
    .map((row) => ({
      row,
      groupKey: pairKey(row),
      label: Number(high.has(row.classIndex)),
      x: vector(
        row,
        representationName,
        fitted,
        descriptors,
        dnPermutations?.get(row.baseSeed) ?? null,
      ),
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

function metricsFromPredictions(predictions) {
  const total = [0, 0];
  const correct = [0, 0];
  const confusion = [[0, 0], [0, 0]];
  for (const item of predictions) {
    total[item.label] += 1;
    confusion[item.label][item.predicted] += 1;
    if (item.predicted === item.label) correct[item.label] += 1;
  }
  const recall = total.map((n, cls) => n ? correct[cls] / n : 0);
  return {
    balancedAccuracy: (recall[0] + recall[1]) / 2,
    recall,
    minClassRecall: Math.min(...recall),
    confusion,
  };
}

function evaluate(rows, model) {
  const predictions = rows.map((item) => ({
    groupKey: item.groupKey,
    label: item.label,
    predicted: predict(model, item.x),
    probability: probability(model, item.x),
    classIndex: item.row.classIndex,
  }));
  return { metrics: metricsFromPredictions(predictions), predictions };
}

function shuffledLabels(rows, seed) {
  const labels = rows.map((row) => row.label);
  const order = shuffledIndices(labels.length, seed);
  return order.map((source) => labels[source]);
}

function stateProbabilities(predictions) {
  const output = {};
  for (let classIndex = 0; classIndex < 4; classIndex += 1) {
    const values = predictions
      .filter((row) => row.classIndex === classIndex)
      .map((row) => row.probability)
      .sort((a, b) => a - b);
    const middle = Math.floor(values.length / 2);
    const median = values.length % 2
      ? values[middle]
      : (values[middle - 1] + values[middle]) / 2;
    output[classIndex] = {
      count: values.length,
      mean: values.reduce((sum, value) => sum + value, 0) / values.length,
      median,
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }
  return output;
}

function gateResult(full, dnShuffled) {
  const margin = full.balancedAccuracy - dnShuffled.balancedAccuracy;
  const checks = {
    balancedAccuracy: full.balancedAccuracy >= GATE.balancedAccuracyMin,
    everyClassRecall: full.minClassRecall >= GATE.everyClassRecallMin,
    dnShuffleMargin: margin >= GATE.dnShuffleMarginMin,
  };
  return {
    margin,
    checks,
    pass: Object.values(checks).every(Boolean),
  };
}

function pairedBootstrap(referencePredictions, variantPredictions) {
  const refByGroup = new Map();
  const variantByGroup = new Map();

  for (const item of referencePredictions) {
    if (!refByGroup.has(item.groupKey)) refByGroup.set(item.groupKey, []);
    refByGroup.get(item.groupKey).push(item);
  }
  for (const item of variantPredictions) {
    if (!variantByGroup.has(item.groupKey)) variantByGroup.set(item.groupKey, []);
    variantByGroup.get(item.groupKey).push(item);
  }

  const groups = [...refByGroup.keys()].sort();
  if (groups.length !== 18) throw new Error("bootstrap requires 18 paired EVAL groups");
  for (const group of groups) {
    if (!variantByGroup.has(group)) throw new Error("bootstrap group mismatch");
  }

  const pointReference = metricsFromPredictions(referencePredictions).balancedAccuracy;
  const pointVariant = metricsFromPredictions(variantPredictions).balancedAccuracy;
  const random = mulberry32(BOOTSTRAP_SEED);
  const deltas = [];

  for (let iteration = 0; iteration < BOOTSTRAP_ITERATIONS; iteration += 1) {
    const refSample = [];
    const variantSample = [];
    for (let draw = 0; draw < groups.length; draw += 1) {
      const group = groups[Math.floor(random() * groups.length)];
      refSample.push(...refByGroup.get(group));
      variantSample.push(...variantByGroup.get(group));
    }
    const refBa = metricsFromPredictions(refSample).balancedAccuracy;
    const variantBa = metricsFromPredictions(variantSample).balancedAccuracy;
    deltas.push(refBa - variantBa);
  }

  deltas.sort((a, b) => a - b);
  return {
    iterations: BOOTSTRAP_ITERATIONS,
    seed: BOOTSTRAP_SEED,
    pairedGroups: groups.length,
    pointDelta: pointReference - pointVariant,
    ci95: [percentile(deltas, 0.025), percentile(deltas, 0.975)],
  };
}

async function main() {
  const outDir = resolve("results/screen-v15a7-temporal-carrier");
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

  const descriptors = buildTransformDescriptors([...trainAll, ...evalAll]);
  const dnPermutations = new Map(
    EVAL_BASE_SEEDS.map((baseSeed) => [
      baseSeed,
      shuffledIndices(DN_COUNT, baseSeed + 900000),
    ]),
  );

  const representationResults = [];
  const taskAPredictions = new Map();

  for (const representation of REPRESENTATIONS) {
    console.log("[v15A7] fitting " + representation.name);
    const fitted = fitRepresentation(trainAll, representation, descriptors);
    console.log("[v15A7] " + representation.name + " sha256=" + fitted.sha256);

    const tasks = [];
    for (const task of TASKS) {
      const trainRows = taskRows(
        trainAll,
        task,
        representation.name,
        fitted,
        descriptors,
      );
      const evalRows = taskRows(
        evalAll,
        task,
        representation.name,
        fitted,
        descriptors,
      );
      const dnShuffledRows = taskRows(
        evalAll,
        task,
        representation.name,
        fitted,
        descriptors,
        dnPermutations,
      );

      const model = train(trainRows);
      const fullEvaluation = evaluate(evalRows, model);
      const dnEvaluation = evaluate(dnShuffledRows, model);

      const labelSeed = 2847000 + representation.index * 10 + task.index;
      const shuffledModel = train(trainRows, shuffledLabels(trainRows, labelSeed));
      const labelEvaluation = evaluate(evalRows, shuffledModel);

      const gate = gateResult(fullEvaluation.metrics, dnEvaluation.metrics);
      const taskResult = {
        name: task.name,
        primary: task.primary,
        trainRows: trainRows.length,
        evalRows: evalRows.length,
        full: fullEvaluation.metrics,
        dnShuffled: dnEvaluation.metrics,
        dnShuffleMargin: gate.margin,
        labelShuffled: labelEvaluation.metrics,
        labelShuffleSeed: labelSeed,
        gateChecks: gate.checks,
        gatePass: gate.pass,
      };

      if (task.primary) {
        taskResult.originalStateHighProbability = stateProbabilities(fullEvaluation.predictions);
        taskAPredictions.set(representation.name, fullEvaluation.predictions);
      }

      tasks.push(taskResult);
      console.log(
        "[v15A7] " + representation.name + " " + task.name +
        " FULL=" + (fullEvaluation.metrics.balancedAccuracy * 100).toFixed(1) +
        "% recall=" + fullEvaluation.metrics.recall.map((x) => (x * 100).toFixed(1)).join("/") +
        "% DN_SHUFFLED=" + (dnEvaluation.metrics.balancedAccuracy * 100).toFixed(1) +
        "% margin=" + (gate.margin * 100).toFixed(1) +
        "pp LABEL_SHUFFLED=" + (labelEvaluation.metrics.balancedAccuracy * 100).toFixed(1) +
        "% gate=" + (gate.pass ? "PASS" : "FAIL"),
      );
    }

    representationResults.push({
      name: representation.name,
      transform: representation.transform,
      representation: fitted.representation,
      representationSha256: fitted.sha256,
      tasks,
    });
  }

  const r0 = representationResults[0];
  const r0TaskA = r0.tasks.find((task) => task.name === "A_ECONOMIC_STATE_01v23");
  const baselineReplicated = r0TaskA.gatePass;

  const degradation = [];
  for (const representation of representationResults.slice(1)) {
    const taskA = representation.tasks.find((task) => task.name === "A_ECONOMIC_STATE_01v23");
    const bootstrap = pairedBootstrap(
      taskAPredictions.get("R0_FULL_CONCAT48"),
      taskAPredictions.get(representation.name),
    );
    const materialCarrierLoss =
      baselineReplicated &&
      !taskA.gatePass &&
      bootstrap.pointDelta >= MATERIAL_LOSS_MIN &&
      bootstrap.ci95[0] > 0;

    degradation.push({
      representation: representation.name,
      taskAGatePass: taskA.gatePass,
      bootstrap,
      materialCarrierLoss,
    });

    console.log(
      "[v15A7] degradation " + representation.name +
      " delta=" + (bootstrap.pointDelta * 100).toFixed(1) +
      "pp CI95=[" + (bootstrap.ci95[0] * 100).toFixed(1) +
      "," + (bootstrap.ci95[1] * 100).toFixed(1) +
      "]pp material=" + materialCarrierLoss,
    );
  }

  const byName = new Map(degradation.map((row) => [row.representation, row]));
  let outcome;
  const carrierFindings = [];

  if (!baselineReplicated) {
    outcome = "BASELINE_NOT_REPLICATED";
  } else {
    outcome = "BASELINE_REPLICATED";
    if (byName.get("R1_WHOLE_FRAME_CIRCULAR_SHIFT").materialCarrierLoss) {
      carrierFindings.push("ABSOLUTE_ALIGNMENT_CONTRIBUTES");
    }
    if (
      !byName.get("R1_WHOLE_FRAME_CIRCULAR_SHIFT").materialCarrierLoss &&
      byName.get("R2_WHOLE_FRAME_PERMUTATION").materialCarrierLoss
    ) {
      carrierFindings.push("TEMPORAL_ORDER_CONTRIBUTES_BEYOND_ABSOLUTE_ALIGNMENT");
    }
    if (byName.get("R3_INDEPENDENT_DN_CIRCULAR_SHIFT").materialCarrierLoss) {
      carrierFindings.push("CROSS_DN_PHASE_CONTRIBUTES");
    }
    if (!carrierFindings.length) {
      carrierFindings.push("CARRIER_NOT_LOCALIZED_BY_PREREGISTERED_CONTROLS");
    }
  }

  const output = {
    schema: "maplefly.v15a7.temporal-carrier.1",
    brainRepository: SOURCE.repository,
    brainCommit: SOURCE.commit,
    preregistration: {
      path: "history/prereg_v15a7.md",
      commit: PREREG_COMMIT,
    },
    sensory: {
      lglgLeft: 331,
      lglgRight: 338,
      impactDrive: IMPACT_DRIVE,
      impactPulseSteps: IMPACT_PULSE_STEPS,
      impactPulseMs: IMPACT_PULSE_STEPS * STEP_SECONDS * 1000,
      groundSnta: 0.05,
      tasteDrive: TASTE_DRIVE,
      tasteFinalSteps: FRAME_STEPS,
      historyFrames: HISTORY_FRAMES,
      historySeconds: HISTORY_FRAMES * FRAME_STEPS * STEP_SECONDS,
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
    materialLossRule: {
      minimumPointDelta: MATERIAL_LOSS_MIN,
      bootstrapIterations: BOOTSTRAP_ITERATIONS,
      bootstrapSeed: BOOTSTRAP_SEED,
      ci: "PERCENTILE_95",
      lowerBoundMustExceedZero: true,
      transformedTaskAMustFailGate: true,
      r0TaskAMustPassGate: true,
    },
    representations: representationResults,
    degradation,
    baselineReplicated,
    outcome,
    carrierFindings,
    v15B: "BLOCKED",
  };

  await writeFile(
    resolve(outDir, "v15a7_screen.json"),
    JSON.stringify(output, null, 2) + "\n",
    "utf8",
  );

  console.log(
    "[v15A7] outcome=" + outcome +
    " findings=" + carrierFindings.join(",") +
    " v15B=BLOCKED",
  );

  if (!baselineReplicated) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
