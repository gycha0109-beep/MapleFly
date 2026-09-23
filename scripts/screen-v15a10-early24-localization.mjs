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
const SUBHALF_FRAMES = 12;
const DN_COUNT = 1316;
const TOP_FEATURES = 256;
const IMPACT_DRIVE = 0.7;
const IMPACT_PULSE_STEPS = 6;
const TASTE_DRIVE = 0.8;
const IMPACT_STARTS = [25, 55, 85, 115, 145, 175];
const TRAIN_BASE_SEEDS = [2870000, 2870100, 2870200, 2870300];
const EVAL_BASE_SEEDS = [2875000, 2875100, 2875200];
const REPLICATES = 6;
const EPOCHS = 240;
const LEARNING_RATE = 0.03;
const L2 = 0.001;
const THRESHOLD = 0.5;
const ORDER_SEED = 2876000;
const BOOTSTRAP_SEED = 2879000;
const BOOTSTRAP_ITERATIONS = 2000;
const MATERIAL_LOSS_MIN = 0.10;
const PREREG_COMMIT = "3a6ec0367a53e203bfcc073ab10b2f15630bfdf9";

const GATE = Object.freeze({
  balancedAccuracyMin: 0.70,
  everyClassRecallMin: 0.60,
  dnShuffleMarginMin: 0.20,
});

const REPRESENTATIONS = [
  { name: "R0_EARLY24", index: 0, startFrame: 0, frameCount: 24 },
  { name: "R1_EARLY12_A", index: 1, startFrame: 0, frameCount: 12 },
  { name: "R2_EARLY12_B", index: 2, startFrame: 12, frameCount: 12 },
];

const TASKS = [
  { name: "A_ECONOMIC_STATE_01v23", index: 0, lowClasses: [0, 1], highClasses: [2, 3], primary: true },
  { name: "B_ECONOMIC_BOUNDARY_1v2", index: 1, lowClasses: [1], highClasses: [2], primary: false },
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
    console.log("[v15A10-" + label + "] baseSeed=" + baseSeed + " rows=" + rows.length);
    await new Promise((resolveNow) => setImmediate(resolveNow));
  }
  return rows;
}

function pairKey(row) {
  return row.baseSeed + ":" + row.replicate;
}

function rawValue(row, startFrame, relativeSlot, dnPermutation = null) {
  const localFrame = Math.floor(relativeSlot / DN_COUNT);
  const targetDn = relativeSlot % DN_COUNT;
  const sourceDn = dnPermutation ? dnPermutation[targetDn] : targetDn;
  return row.history[startFrame + localFrame][sourceDn];
}

function fitRepresentation(trainAll, representation) {
  const rawSlots = representation.frameCount * DN_COUNT;
  const meansAll = new Float64Array(rawSlots);

  for (const row of trainAll) {
    for (let slot = 0; slot < rawSlots; slot += 1) {
      meansAll[slot] += rawValue(row, representation.startFrame, slot) / trainAll.length;
    }
  }

  const variancesAll = new Float64Array(rawSlots);
  for (const row of trainAll) {
    for (let slot = 0; slot < rawSlots; slot += 1) {
      const value = rawValue(row, representation.startFrame, slot);
      const delta = value - meansAll[slot];
      variancesAll[slot] += (delta * delta) / trainAll.length;
    }
  }

  const selected = Array.from({ length: rawSlots }, (_, slot) => slot)
    .sort((a, b) => variancesAll[b] - variancesAll[a] || a - b)
    .slice(0, TOP_FEATURES);

  const means = selected.map((slot) => meansAll[slot]);
  const scales = selected.map((slot) => Math.max(Math.sqrt(variancesAll[slot]), 1e-6));
  const selectedSlots = selected.map((slot) => ({
    relativeSlot: slot,
    localFrame: Math.floor(slot / DN_COUNT),
    absoluteFrame: representation.startFrame + Math.floor(slot / DN_COUNT),
    dnSlot: slot % DN_COUNT,
    variance: variancesAll[slot],
  }));

  const object = {
    name: representation.name,
    startFrame: representation.startFrame,
    frameCount: representation.frameCount,
    dnCount: DN_COUNT,
    candidateSlotCount: rawSlots,
    selectedFeatureCount: TOP_FEATURES,
    selection: "TRAIN_ALL_STATES_LABEL_BLIND_VARIANCE_TOP256",
    tieBreak: "VARIANCE_DESC_THEN_RELATIVE_SLOT_ASC",
    normalization: "TRAIN_ALL_STATES_POPULATION_STD_CLAMP_5",
    selectedSlots,
    means,
    scales,
  };

  const halfCounts = representation.name === "R0_EARLY24"
    ? {
        early12A: selectedSlots.filter((slot) => slot.absoluteFrame < SUBHALF_FRAMES).length,
        early12B: selectedSlots.filter((slot) => slot.absoluteFrame >= SUBHALF_FRAMES).length,
      }
    : null;

  return {
    representation: object,
    sha256: createHash("sha256").update(JSON.stringify(object)).digest("hex"),
    selected,
    means,
    scales,
    halfCounts,
  };
}

function vector(row, fitted, startFrame, dnPermutation = null, maskHalf = null) {
  const out = new Float64Array(TOP_FEATURES);
  for (let i = 0; i < TOP_FEATURES; i += 1) {
    const localFrame = Math.floor(fitted.selected[i] / DN_COUNT);
    const absoluteFrame = startFrame + localFrame;
    const masked =
      (maskHalf === "EARLY12_A" && absoluteFrame < SUBHALF_FRAMES) ||
      (maskHalf === "EARLY12_B" && absoluteFrame >= SUBHALF_FRAMES);
    if (masked) {
      out[i] = 0;
      continue;
    }
    const value = rawValue(row, startFrame, fitted.selected[i], dnPermutation);
    out[i] = clamp((value - fitted.means[i]) / fitted.scales[i], -5, 5);
  }
  return out;
}

function taskRows(rows, task, fitted, startFrame, options = {}) {
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
        fitted,
        startFrame,
        options.dnPermutations?.get(row.baseSeed) ?? null,
        options.maskHalf ?? null,
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

function evaluate(rows, model) {
  const total = [0, 0];
  const correct = [0, 0];
  const confusion = [[0, 0], [0, 0]];
  const predictions = [];
  for (const item of rows) {
    const p = probability(model, item.x);
    const predicted = p >= THRESHOLD ? 1 : 0;
    total[item.label] += 1;
    confusion[item.label][predicted] += 1;
    if (predicted === item.label) correct[item.label] += 1;
    predictions.push({
      groupKey: item.groupKey,
      label: item.label,
      predicted,
      probability: p,
      classIndex: item.row.classIndex,
    });
  }
  const recall = total.map((n, cls) => n ? correct[cls] / n : 0);
  return {
    metrics: {
      balancedAccuracy: (recall[0] + recall[1]) / 2,
      recall,
      minClassRecall: Math.min(...recall),
      confusion,
    },
    predictions,
  };
}

function shuffledLabels(rows, seed) {
  const labels = rows.map((row) => row.label);
  const order = shuffledIndices(labels.length, seed);
  return order.map((source) => labels[source]);
}

function gateResult(full, dnShuffled) {
  const margin = full.balancedAccuracy - dnShuffled.balancedAccuracy;
  const checks = {
    balancedAccuracy: full.balancedAccuracy >= GATE.balancedAccuracyMin,
    everyClassRecall: full.minClassRecall >= GATE.everyClassRecallMin,
    dnShuffleMargin: margin >= GATE.dnShuffleMarginMin,
  };
  return { margin, checks, pass: Object.values(checks).every(Boolean) };
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
  const pointRef = metricsFromPredictions(referencePredictions).balancedAccuracy;
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
    deltas.push(
      metricsFromPredictions(refSample).balancedAccuracy -
      metricsFromPredictions(variantSample).balancedAccuracy,
    );
  }

  deltas.sort((a, b) => a - b);
  return {
    iterations: BOOTSTRAP_ITERATIONS,
    seed: BOOTSTRAP_SEED,
    pairedGroups: groups.length,
    pointDelta: pointRef - pointVariant,
    ci95: [percentile(deltas, 0.025), percentile(deltas, 0.975)],
  };
}

async function main() {
  const outDir = resolve("results/screen-v15a10-early24-localization");
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

  const dnPermutations = new Map(
    EVAL_BASE_SEEDS.map((baseSeed) => [
      baseSeed,
      shuffledIndices(DN_COUNT, baseSeed + 900000),
    ]),
  );

  const fittedByName = new Map();
  const results = [];
  let r0TaskAModel = null;
  let r0TaskAEval = null;

  for (const representation of REPRESENTATIONS) {
    const fitted = fitRepresentation(trainAll, representation);
    fittedByName.set(representation.name, fitted);
    console.log(
      "[v15A10] " + representation.name + " sha256=" + fitted.sha256 +
      (fitted.halfCounts ? " halfCounts=" + JSON.stringify(fitted.halfCounts) : ""),
    );

    const taskResults = [];
    for (const task of TASKS) {
      const trainRows = taskRows(trainAll, task, fitted, representation.startFrame);
      const evalRows = taskRows(evalAll, task, fitted, representation.startFrame);
      const dnRows = taskRows(evalAll, task, fitted, representation.startFrame, { dnPermutations });

      const model = train(trainRows);
      const full = evaluate(evalRows, model);
      const dn = evaluate(dnRows, model);
      const gate = gateResult(full.metrics, dn.metrics);

      const labelSeed = 2877000 + representation.index * 10 + task.index;
      const labelModel = train(trainRows, shuffledLabels(trainRows, labelSeed));
      const label = evaluate(evalRows, labelModel);

      if (representation.name === "R0_EARLY24" && task.primary) {
        r0TaskAModel = model;
        r0TaskAEval = full;
      }

      taskResults.push({
        name: task.name,
        primary: task.primary,
        trainRows: trainRows.length,
        evalRows: evalRows.length,
        full: full.metrics,
        dnShuffled: dn.metrics,
        dnShuffleMargin: gate.margin,
        labelShuffled: label.metrics,
        labelShuffleSeed: labelSeed,
        gateChecks: gate.checks,
        gatePass: gate.pass,
      });

      console.log(
        "[v15A10] " + representation.name + " " + task.name +
        " FULL=" + (full.metrics.balancedAccuracy * 100).toFixed(1) +
        "% recall=" + full.metrics.recall.map((x) => (x * 100).toFixed(1)).join("/") +
        "% DN_SHUFFLED=" + (dn.metrics.balancedAccuracy * 100).toFixed(1) +
        "% margin=" + (gate.margin * 100).toFixed(1) +
        "pp LABEL_SHUFFLED=" + (label.metrics.balancedAccuracy * 100).toFixed(1) +
        "% gate=" + (gate.pass ? "PASS" : "FAIL"),
      );
    }

    results.push({
      name: representation.name,
      startFrame: representation.startFrame,
      frameCount: representation.frameCount,
      representation: fitted.representation,
      representationSha256: fitted.sha256,
      selectedHalfCounts: fitted.halfCounts,
      tasks: taskResults,
    });
  }

  const r0TaskA = results[0].tasks.find((task) => task.name === "A_ECONOMIC_STATE_01v23");
  const r1TaskA = results[1].tasks.find((task) => task.name === "A_ECONOMIC_STATE_01v23");
  const r2TaskA = results[2].tasks.find((task) => task.name === "A_ECONOMIC_STATE_01v23");
  const baselineReplicated = r0TaskA.gatePass;

  const r0Fitted = fittedByName.get("R0_EARLY24");
  const maskResults = [];
  for (const maskHalf of ["EARLY12_A", "EARLY12_B"]) {
    const rows = taskRows(evalAll, TASKS[0], r0Fitted, 0, { maskHalf });
    const evaluation = evaluate(rows, r0TaskAModel);
    const bootstrap = pairedBootstrap(r0TaskAEval.predictions, evaluation.predictions);
    const materialDecoderContribution =
      baselineReplicated &&
      bootstrap.pointDelta >= MATERIAL_LOSS_MIN &&
      bootstrap.ci95[0] > 0;

    maskResults.push({
      maskHalf,
      metrics: evaluation.metrics,
      bootstrap,
      materialDecoderContribution,
    });

    console.log(
      "[v15A10] MASK_" + maskHalf +
      " BA=" + (evaluation.metrics.balancedAccuracy * 100).toFixed(1) +
      "% delta=" + (bootstrap.pointDelta * 100).toFixed(1) +
      "pp CI95=[" + (bootstrap.ci95[0] * 100).toFixed(1) +
      "," + (bootstrap.ci95[1] * 100).toFixed(1) +
      "]pp material=" + materialDecoderContribution,
    );
  }

  const firstMask = maskResults.find((row) => row.maskHalf === "EARLY12_A");
  const secondMask = maskResults.find((row) => row.maskHalf === "EARLY12_B");

  const findings = [];
  let outcome;
  if (!baselineReplicated) {
    outcome = "BASELINE_NOT_REPLICATED";
  } else {
    if (r1TaskA.gatePass) findings.push("EARLY12_A_SUFFICIENT");
    if (r2TaskA.gatePass) findings.push("EARLY12_B_SUFFICIENT");
    if (!r1TaskA.gatePass && !r2TaskA.gatePass) findings.push("NO_SINGLE_1P2S_HALF_SUFFICIENT");
    if (firstMask.materialDecoderContribution) findings.push("EARLY12_A_DECODER_CONTRIBUTES");
    if (secondMask.materialDecoderContribution) findings.push("EARLY12_B_DECODER_CONTRIBUTES");
    if (firstMask.materialDecoderContribution && secondMask.materialDecoderContribution) {
      findings.push("BOTH_1P2S_HALVES_DECODER_CONTRIBUTE");
    }
    if (
      !r1TaskA.gatePass &&
      !r2TaskA.gatePass &&
      firstMask.materialDecoderContribution &&
      secondMask.materialDecoderContribution
    ) {
      findings.push("EARLY24_DISTRIBUTED_ACROSS_1P2S_HALVES");
      outcome = "EARLY24_DISTRIBUTED_ACROSS_1P2S_HALVES";
    } else if (r1TaskA.gatePass && r2TaskA.gatePass) {
      outcome = "BOTH_1P2S_HALVES_SUFFICIENT";
    } else if (r1TaskA.gatePass || r2TaskA.gatePass) {
      outcome = "SINGLE_1P2S_HALF_SUFFICIENCY_PRESENT";
    } else {
      outcome = "1P2S_LOCALIZATION_INCONCLUSIVE";
    }
  }

  console.log(
    "[v15A10] outcome=" + outcome +
    " findings=" + (findings.join(",") || "none") +
    " v15B=BLOCKED",
  );

  const output = {
    schema: "maplefly.v15a10.early24-localization.1",
    brainRepository: SOURCE.repository,
    brainCommit: SOURCE.commit,
    preregistration: {
      path: "history/prereg_v15a10.md",
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
      subHalfFrames: SUBHALF_FRAMES,
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
    },
    representations: results,
    maskResults,
    baselineReplicated,
    findings,
    outcome,
    v15B: "BLOCKED",
  };

  await writeFile(
    resolve(outDir, "v15a10_screen.json"),
    JSON.stringify(output, null, 2) + "\n",
    "utf8",
  );

  if (!baselineReplicated) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
