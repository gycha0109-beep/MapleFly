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
const TRAIN_BASE_SEEDS = [2890000, 2890100, 2890200, 2890300];
const EVAL_BASE_SEEDS = [2895000, 2895100, 2895200];
const REPLICATES = 6;
const EPOCHS = 240;
const LEARNING_RATE = 0.03;
const L2 = 0.001;
const THRESHOLD = 0.5;
const ORDER_SEED = 2896000;
const PREREG_COMMIT = "cc9d7e3bd840be96739bfdff7bee58114ab063ec";

const GATE = Object.freeze({
  balancedAccuracyMin: 0.70,
  everyClassRecallMin: 0.60,
  dnShuffleMarginMin: 0.20,
});

const REPRESENTATIONS = [
  { name: "FULL48_REWARD_ADVANTAGE", index: 0, startFrame: 0, frameCount: 48 },
];

const TASKS = [
  { name: "A_COUNTERFACTUAL_DRINK_VS_WAIT", index: 0, primary: true },
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
    console.log("[v15A12-" + label + "] baseSeed=" + baseSeed + " rows=" + rows.length);
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

  const halfCounts = null;

  return {
    representation: object,
    sha256: createHash("sha256").update(JSON.stringify(object)).digest("hex"),
    selected,
    means,
    scales,
    halfCounts,
  };
}

function vector(row, fitted, startFrame, dnPermutation = null) {
  const out = new Float64Array(TOP_FEATURES);
  for (let i = 0; i < TOP_FEATURES; i += 1) {
    const value = rawValue(row, startFrame, fitted.selected[i], dnPermutation);
    out[i] = clamp((value - fitted.means[i]) / fitted.scales[i], -5, 5);
  }
  return out;
}

function counterfactualReturn(classIndex) {
  const maxHp = 100;
  const contactDamage = 10;
  const potionHeal = 30;
  const potionCost = 15;
  const futureContacts = 6;
  const decisionHp = maxHp - contactDamage * classIndex;

  function rollout(drink) {
    let hp = decisionHp;
    if (drink) hp = Math.min(maxHp, hp + potionHeal);
    for (let i = 0; i < futureContacts; i += 1) {
      hp = Math.max(0, hp - contactDamage);
    }
    return hp - (drink ? potionCost : 0);
  }

  const gWait = rollout(false);
  const gDrink = rollout(true);
  const deltaG = gDrink - gWait;
  if (deltaG === 0) throw new Error("counterfactual advantage must be non-zero");
  return {
    classIndex,
    decisionHp,
    gWait,
    gDrink,
    deltaG,
    optimalAction: deltaG > 0 ? "DRINK" : "WAIT",
    label: Number(deltaG > 0),
  };
}

function taskRows(rows, task, fitted, startFrame, options = {}) {
  return rows.map((row) => {
    const reward = counterfactualReturn(row.classIndex);
    return {
      row,
      groupKey: pairKey(row),
      label: reward.label,
      deltaG: reward.deltaG,
      x: vector(
        row,
        fitted,
        startFrame,
        options.dnPermutations?.get(row.baseSeed) ?? null,
      ),
    };
  });
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

async function main() {
  const outDir = resolve("results/screen-v15a12-reward-advantage");
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

  for (const representation of REPRESENTATIONS) {
    const fitted = fitRepresentation(trainAll, representation);
    fittedByName.set(representation.name, fitted);
    console.log(
      "[v15A12] " + representation.name + " sha256=" + fitted.sha256 +
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

      const labelSeed = 2897000;
      const labelModel = train(trainRows, shuffledLabels(trainRows, labelSeed));
      const label = evaluate(evalRows, labelModel);

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
        "[v15A12] " + representation.name + " " + task.name +
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

  const primary = results[0].tasks[0];
  const pass = primary.gatePass;
  const outcome = pass ? "REWARD_ADVANTAGE_SUFFICIENCY_PASS" : "REWARD_ADVANTAGE_SUFFICIENCY_FAIL";
  const v15B = pass ? "PREREGISTRATION_AUTHORIZED" : "BLOCKED";

  const rewardAudit = Array.from({ length: 4 }, (_, classIndex) => {
    const reward = counterfactualReturn(classIndex);
    return {
      ...reward,
      trainRows: trainAll.filter((row) => row.classIndex === classIndex).length,
      evalRows: evalAll.filter((row) => row.classIndex === classIndex).length,
    };
  });

  const fittedPrimary = fittedByName.get("FULL48_REWARD_ADVANTAGE");
  const calibrationModel = train(taskRows(trainAll, TASKS[0], fittedPrimary, 0));
  const drinkProbabilityByOriginalState = {};
  for (let classIndex = 0; classIndex < 4; classIndex += 1) {
    const values = evalAll
      .filter((row) => row.classIndex === classIndex)
      .map((row) => probability(calibrationModel, vector(row, fittedPrimary, 0)));
    drinkProbabilityByOriginalState[classIndex] = {
      count: values.length,
      mean: values.reduce((sum, value) => sum + value, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }

  console.log("[v15A12] outcome=" + outcome + " v15B=" + v15B);

  const output = {
    schema: "maplefly.v15a12.reward-advantage-sufficiency.1",
    brainRepository: SOURCE.repository,
    brainCommit: SOURCE.commit,
    preregistration: {
      path: "history/prereg_v15a12.md",
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
    representations: results,
    rewardEvaluator: {
      maxHp: 100,
      contactDamage: 10,
      potionHeal: 30,
      potionOpportunityCost: 15,
      futureContacts: 6,
      futureDamage: 60,
      returnFormula: "terminalHP - 15*potionUsed",
    },
    rewardAudit,
    drinkProbabilityByOriginalState,
    outcome,
    pass,
    v15B,
  };

  await writeFile(
    resolve(outDir, "v15a12_screen.json"),
    JSON.stringify(output, null, 2) + "\n",
    "utf8",
  );

  if (!pass) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
