#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
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

const TRAIN_BASE_SEEDS = [3210000, 3210100, 3210200, 3210300];
const EVAL_BASE_SEEDS = [3215000, 3215100, 3215200];
const REPLICATES = 10;

const EPOCHS = 80;
const MU = 0.5;
const L2 = 0.001;
const EPSILON = 1.00;
const ORDER_SEED_BASE = 3216000;
const POLICY_SEED = 3218000;

const PREREG_COMMIT = "6b58967912533cf068c6687a84584a9b0a7f2dc4";
const FROZEN_REPRESENTATION_SHA256 =
  "33fc31f636e1cde215841dd33b0a93b24d4571cdabd32e9a1edc8fa2e696c847";
const FROZEN_REPRESENTATION_SOURCE = Object.freeze({
  runId: 35898698946,
  head: "353bbdc91bbe125434c1263d8c8d1be308e1844d",
  artifactId: 10768761312,
  artifactDigest:
    "sha256:8aa759b04643d618e69aaa647d7251eb237816ee3b84bcc97a0f451d20cbba78",
});

const GATE = Object.freeze({
  balancedAccuracyMin: 0.75,
  waitRecallMin: 0.65,
  drinkRecallMin: 0.65,
  phaseBinMinN: 10,
  phaseBinDrinkRecallMin: 0.60,
  dnShuffleMarginMin: 0.20,
  neuralOffMarginMin: 0.20,
  meanReturnMin: 27.5,
  meanRegretMax: 2.5,
});

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
  const starts = [];
  let attempts = 0;
  while (starts.length < classIndex) {
    attempts += 1;
    if (attempts > 10000) throw new Error("phase-randomized timing rejection overflow");
    const start = 10 + Math.floor(random() * 211);
    if (starts.every((existing) => Math.abs(existing - start) >= 10)) {
      starts.push(start);
    }
  }
  starts.sort((a, b) => a - b);
  return starts.map((start) => ({
    start,
    side: random() < 0.5 ? "L" : "R",
  }));
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

  return {
    baseSeed,
    brainSeed,
    classIndex,
    replicate,
    events,
    history,
  };
}

async function collectDataset(connectome, dnSlot, baseSeeds, label) {
  const rows = [];
  for (const baseSeed of baseSeeds) {
    for (let replicate = 0; replicate < REPLICATES; replicate += 1) {
      for (let classIndex = 0; classIndex < 4; classIndex += 1) {
        rows.push(
          await collectEpisode(
            connectome,
            dnSlot,
            baseSeed,
            classIndex,
            replicate,
          ),
        );
      }
    }
    console.log(
      "[v15B3-" + label + "] baseSeed=" + baseSeed + " rows=" + rows.length,
    );
    await new Promise((resolveNow) => setImmediate(resolveNow));
  }
  return rows;
}

async function loadFrozenRepresentation(path) {
  const parsed = JSON.parse(await readFile(path, "utf8"));
  const entry = parsed.representations?.find(
    (row) => row.name === "FULL48_REWARD_ADVANTAGE",
  );
  if (!entry?.representation) {
    throw new Error("v15A12 FULL48 representation missing");
  }

  const representation = entry.representation;
  const digest = createHash("sha256")
    .update(JSON.stringify(representation))
    .digest("hex");

  if (digest !== FROZEN_REPRESENTATION_SHA256) {
    throw new Error("v15A12 representation hash mismatch: " + digest);
  }
  if (entry.representationSha256 !== digest) {
    throw new Error("v15A12 entry hash mismatch");
  }
  if (representation.frameCount !== HISTORY_FRAMES) {
    throw new Error("history frame mismatch");
  }
  if (representation.selectedFeatureCount !== TOP_FEATURES) {
    throw new Error("feature count mismatch");
  }
  if (representation.selectedSlots?.length !== TOP_FEATURES) {
    throw new Error("selected slot count mismatch");
  }
  if (representation.means?.length !== TOP_FEATURES) {
    throw new Error("mean count mismatch");
  }
  if (representation.scales?.length !== TOP_FEATURES) {
    throw new Error("scale count mismatch");
  }

  const slots = representation.selectedSlots.map((entryNow) => {
    const rawSlot = entryNow.relativeSlot;
    if (
      !Number.isInteger(rawSlot) ||
      rawSlot < 0 ||
      rawSlot >= HISTORY_FRAMES * DN_COUNT
    ) {
      throw new Error("invalid frozen raw slot: " + rawSlot);
    }
    return rawSlot;
  });

  return {
    representation,
    digest,
    slots,
    means: Float64Array.from(representation.means),
    scales: Float64Array.from(representation.scales),
  };
}

function rawValue(row, rawSlot, permutation = null) {
  const frame = Math.floor(rawSlot / DN_COUNT);
  const targetDn = rawSlot % DN_COUNT;
  const sourceDn = permutation ? permutation[targetDn] : targetDn;
  return row.history[frame][sourceDn];
}

function vector(row, frozen, permutation = null) {
  const out = new Float64Array(TOP_FEATURES);
  for (let i = 0; i < TOP_FEATURES; i += 1) {
    out[i] = clamp(
      (rawValue(row, frozen.slots[i], permutation) - frozen.means[i]) /
        frozen.scales[i],
      -5,
      5,
    );
  }
  return out;
}

function rewardOutcome(classIndex, action) {
  const maxHp = 100;
  const contactDamage = 10;
  const potionHeal = 30;
  const potionCost = 15;
  const futureContacts = 6;
  const decisionHp = maxHp - contactDamage * classIndex;

  let hp = decisionHp;
  const drink = action === 1;

  if (drink) {
    hp = Math.min(maxHp, hp + potionHeal);
  }

  for (let i = 0; i < futureContacts; i += 1) {
    hp = Math.max(0, hp - contactDamage);
  }

  const g = hp - (drink ? potionCost : 0);
  const normalizedReward = (g - 25) / 15;

  return {
    action: drink ? "DRINK" : "WAIT",
    g,
    normalizedReward,
    terminalHp: hp,
  };
}

function counterfactualAudit(classIndex) {
  const wait = rewardOutcome(classIndex, 0);
  const drink = rewardOutcome(classIndex, 1);
  const deltaG = drink.g - wait.g;
  if (deltaG === 0) throw new Error("zero counterfactual advantage");
  return {
    classIndex,
    decisionHp: 100 - 10 * classIndex,
    gWait: wait.g,
    gDrink: drink.g,
    deltaG,
    optimalAction: deltaG > 0 ? 1 : 0,
  };
}

function makeHead() {
  return {
    weights: new Float64Array(TOP_FEATURES),
    bias: 0,
  };
}

function finite(value, label) {
  if (!Number.isFinite(value)) throw new Error(label + " is non-finite");
  return value;
}

function qValue(head, x) {
  let value = finite(head.bias, "head bias");
  for (let i = 0; i < TOP_FEATURES; i += 1) {
    value += finite(head.weights[i], "head weight") * finite(x[i], "feature");
  }
  return finite(value, "Q value");
}

function greedyAction(model, x) {
  const qWait = qValue(model.wait, x);
  const qDrink = qValue(model.drink, x);
  return {
    action: qDrink > qWait ? 1 : 0,
    qWait,
    qDrink,
  };
}

function exploratoryAction(model, x, random) {
  const greedy = greedyAction(model, x);

  if (random() < EPSILON) {
    return {
      ...greedy,
      action: random() < 0.5 ? 0 : 1,
      explored: true,
    };
  }

  if (greedy.qWait === greedy.qDrink) {
    return {
      ...greedy,
      action: random() < 0.5 ? 0 : 1,
      explored: false,
      tieBroken: true,
    };
  }

  return {
    ...greedy,
    explored: false,
    tieBroken: false,
  };
}

function updateChosenHead(model, action, x, reward) {
  const head = action === 1 ? model.drink : model.wait;
  const prediction = qValue(head, x);
  const error = finite(prediction - finite(reward, "reward"), "error");

  let normSq = 0;
  for (let i = 0; i < TOP_FEATURES; i += 1) {
    const value = finite(x[i], "feature");
    normSq += value * value;
  }
  finite(normSq, "feature norm squared");

  const denom = finite(1 + normSq, "normalized-update denominator");
  const step = finite(MU / denom, "normalized-update step");

  head.bias = finite(head.bias - step * error, "updated bias");
  for (let i = 0; i < TOP_FEATURES; i += 1) {
    head.weights[i] = finite(
      head.weights[i] - step * (
        error * x[i] + L2 * head.weights[i]
      ),
      "updated weight",
    );
  }

  return { prediction, error, normSq, denom, step };
}

function trainRewardOnly(trainRows, frozen) {
  const model = {
    wait: makeHead(),
    drink: makeHead(),
  };
  const policyRandom = mulberry32(POLICY_SEED);
  const epochTrace = [];
  const actionCounts = [0, 0];
  let explorationCount = 0;
  const optimizerStats = {
    count: 0,
    normSqMin: Infinity,
    normSqMax: -Infinity,
    normSqSum: 0,
    stepMin: Infinity,
    stepMax: -Infinity,
    stepSum: 0,
  };

  for (let epoch = 0; epoch < EPOCHS; epoch += 1) {
    const order = shuffledIndices(trainRows.length, ORDER_SEED_BASE + epoch);
    let sumG = 0;
    let sumReward = 0;
    let correct = 0;

    for (const index of order) {
      const row = trainRows[index];
      const x = vector(row, frozen);
      const choice = exploratoryAction(model, x, policyRandom);
      const outcome = rewardOutcome(row.classIndex, choice.action);
      const audit = counterfactualAudit(row.classIndex);

      const update = updateChosenHead(
        model,
        choice.action,
        x,
        outcome.normalizedReward,
      );
      optimizerStats.count += 1;
      optimizerStats.normSqMin = Math.min(optimizerStats.normSqMin, update.normSq);
      optimizerStats.normSqMax = Math.max(optimizerStats.normSqMax, update.normSq);
      optimizerStats.normSqSum += update.normSq;
      optimizerStats.stepMin = Math.min(optimizerStats.stepMin, update.step);
      optimizerStats.stepMax = Math.max(optimizerStats.stepMax, update.step);
      optimizerStats.stepSum += update.step;

      actionCounts[choice.action] += 1;
      if (choice.explored) explorationCount += 1;
      sumG += outcome.g;
      sumReward += outcome.normalizedReward;
      if (choice.action === audit.optimalAction) correct += 1;
    }

    epochTrace.push({
      epoch,
      meanG: sumG / trainRows.length,
      meanNormalizedReward: sumReward / trainRows.length,
      actionAccuracyForAuditOnly: correct / trainRows.length,
    });
  }

  return {
    model,
    epochTrace,
    actionCounts: {
      wait: actionCounts[0],
      drink: actionCounts[1],
    },
    explorationCount,
    optimizerDiagnostics: {
      featureNormSquared: {
        min: optimizerStats.normSqMin,
        mean: optimizerStats.normSqSum / optimizerStats.count,
        max: optimizerStats.normSqMax,
      },
      effectiveStep: {
        min: optimizerStats.stepMin,
        mean: optimizerStats.stepSum / optimizerStats.count,
        max: optimizerStats.stepMax,
      },
    },
  };
}

function evaluatePolicy(rows, frozen, model, options = {}) {
  const total = [0, 0];
  const correct = [0, 0];
  const confusion = [[0, 0], [0, 0]];
  const stateStats = Array.from({ length: 4 }, () => ({
    count: 0,
    drink: 0,
    sumG: 0,
  }));

  let sumG = 0;
  let sumOracleG = 0;
  const qStats = {
    wait: { min: Infinity, max: -Infinity, sum: 0 },
    drink: { min: Infinity, max: -Infinity, sum: 0 },
  };

  for (const row of rows) {
    let x;
    if (options.neuralOff) {
      x = new Float64Array(TOP_FEATURES);
    } else {
      x = vector(
        row,
        frozen,
        options.permutations?.get(row.baseSeed) ?? null,
      );
    }

    const decision = greedyAction(model, x);
    qStats.wait.min = Math.min(qStats.wait.min, decision.qWait);
    qStats.wait.max = Math.max(qStats.wait.max, decision.qWait);
    qStats.wait.sum += decision.qWait;
    qStats.drink.min = Math.min(qStats.drink.min, decision.qDrink);
    qStats.drink.max = Math.max(qStats.drink.max, decision.qDrink);
    qStats.drink.sum += decision.qDrink;
    const audit = counterfactualAudit(row.classIndex);
    const outcome = rewardOutcome(row.classIndex, decision.action);
    const oracleG = Math.max(audit.gWait, audit.gDrink);

    total[audit.optimalAction] += 1;
    confusion[audit.optimalAction][decision.action] += 1;
    if (decision.action === audit.optimalAction) {
      correct[audit.optimalAction] += 1;
    }

    const state = stateStats[row.classIndex];
    state.count += 1;
    state.drink += decision.action;
    state.sumG += outcome.g;

    sumG += outcome.g;
    sumOracleG += oracleG;
  }

  const recall = total.map((n, cls) => n ? correct[cls] / n : 0);
  const meanG = sumG / rows.length;
  const meanOracleG = sumOracleG / rows.length;

  return {
    balancedAccuracy: (recall[0] + recall[1]) / 2,
    recall,
    minClassRecall: Math.min(...recall),
    confusion,
    meanG,
    meanOracleG,
    meanRegret: meanOracleG - meanG,
    qValues: {
      wait: {
        min: qStats.wait.min,
        mean: qStats.wait.sum / rows.length,
        max: qStats.wait.max,
      },
      drink: {
        min: qStats.drink.min,
        mean: qStats.drink.sum / rows.length,
        max: qStats.drink.max,
      },
    },
    byOriginalState: Object.fromEntries(
      stateStats.map((state, classIndex) => [
        classIndex,
        {
          count: state.count,
          drinkRate: state.count ? state.drink / state.count : 0,
          meanG: state.count ? state.sumG / state.count : 0,
        },
      ]),
    ),
  };
}

function phaseBinAudit(rows, frozen, model) {
  const bins = {
    early: { n: 0, drink: 0 },
    mid: { n: 0, drink: 0 },
    late: { n: 0, drink: 0 },
  };
  for (const row of rows) {
    if (row.classIndex < 2) continue;
    const latest = row.events.at(-1)?.start;
    if (!Number.isInteger(latest)) throw new Error("missing latest impact onset");
    const key = latest <= 139 ? "early" : latest <= 189 ? "mid" : "late";
    const decision = greedyAction(model, vector(row, frozen));
    bins[key].n += 1;
    if (decision.action === 1) bins[key].drink += 1;
  }
  return Object.fromEntries(
    Object.entries(bins).map(([key, value]) => [
      key,
      {
        n: value.n,
        drinkRecall: value.n ? value.drink / value.n : 0,
      },
    ]),
  );
}

function headDiagnostics(head) {
  let normSq = 0;
  let maxAbsWeight = 0;
  for (const weight of head.weights) {
    finite(weight, "final head weight");
    normSq += weight * weight;
    maxAbsWeight = Math.max(maxAbsWeight, Math.abs(weight));
  }
  return {
    bias: finite(head.bias, "final head bias"),
    weightL2Norm: Math.sqrt(normSq),
    maxAbsWeight,
  };
}

function frozenModelObject(model) {
  return {
    type: "LINEAR_TWO_HEAD_ACTION_VALUE",
    featureCount: TOP_FEATURES,
    actions: ["WAIT", "DRINK"],
    wait: {
      bias: model.wait.bias,
      weights: Array.from(model.wait.weights),
    },
    drink: {
      bias: model.drink.bias,
      weights: Array.from(model.drink.weights),
    },
  };
}

async function main() {
  const outDir = resolve("results/train-v15e-phase-randomized-reward-potion");
  await mkdir(outDir, { recursive: true });

  const representationPath = process.env.V15A12_REPRESENTATION_FILE
    ? resolve(process.env.V15A12_REPRESENTATION_FILE)
    : resolve(".cache/v15a12-artifact/v15a12_screen.json");

  const frozen = await loadFrozenRepresentation(representationPath);
  console.log(
    "[v15E] frozen v15A12 representation sha256=" + frozen.digest,
  );

  const audit = Array.from({ length: 4 }, (_, classIndex) =>
    counterfactualAudit(classIndex),
  );
  const expected = [
    [40, 25, -15, 0],
    [30, 25, -5, 0],
    [20, 25, 5, 1],
    [10, 25, 15, 1],
  ];
  for (let i = 0; i < audit.length; i += 1) {
    const row = audit[i];
    const want = expected[i];
    if (
      row.gWait !== want[0] ||
      row.gDrink !== want[1] ||
      row.deltaG !== want[2] ||
      row.optimalAction !== want[3]
    ) {
      throw new Error("reward audit mismatch at state " + i);
    }
  }

  const connectome = await loadConnectome({
    cacheDir: resolve(".cache/maplefly-connectome"),
    onProgress(message) {
      console.log("[connectome] " + message);
    },
  });

  for (const side of ["L", "R"]) {
    const impact = cellsWithPrefix(connectome.meta, "LgLG", side);
    const expectedCount = side === "L" ? 331 : 338;
    if (impact.length !== expectedCount) {
      throw new Error("LgLG_" + side + " count mismatch");
    }
    connectome.inputGroups.set("LgLG_" + side, impact);

    const taste = cells(connectome.meta, ["LB3", "claw_tpGRN"], side);
    if (!taste.length) throw new Error("taste_" + side + " missing");
    connectome.inputGroups.set("taste_" + side, taste);
  }

  const dnSlot = buildDnSlot(connectome.meta);
  const trainRows = await collectDataset(
    connectome,
    dnSlot,
    TRAIN_BASE_SEEDS,
    "train",
  );
  const evalRows = await collectDataset(
    connectome,
    dnSlot,
    EVAL_BASE_SEEDS,
    "eval",
  );

  if (trainRows.length !== 160 || evalRows.length !== 120) {
    throw new Error("dataset size mismatch");
  }

  const trained = trainRewardOnly(trainRows, frozen);
  const modelObject = frozenModelObject(trained.model);
  const finalHeadDiagnostics = {
    wait: headDiagnostics(trained.model.wait),
    drink: headDiagnostics(trained.model.drink),
  };
  const modelSha256 = createHash("sha256")
    .update(JSON.stringify(modelObject))
    .digest("hex");

  const permutations = new Map(
    EVAL_BASE_SEEDS.map((baseSeed) => [
      baseSeed,
      shuffledIndices(DN_COUNT, baseSeed + 900000),
    ]),
  );

  const full = evaluatePolicy(evalRows, frozen, trained.model);
  const dnShuffled = evaluatePolicy(
    evalRows,
    frozen,
    trained.model,
    { permutations },
  );
  const neuralOff = evaluatePolicy(
    evalRows,
    frozen,
    trained.model,
    { neuralOff: true },
  );

  const dnMargin =
    full.balancedAccuracy - dnShuffled.balancedAccuracy;
  const offMargin =
    full.balancedAccuracy - neuralOff.balancedAccuracy;
  const phaseBins = phaseBinAudit(evalRows, frozen, trained.model);
  const phaseSupportValid = Object.values(phaseBins).every(
    (bin) => bin.n >= GATE.phaseBinMinN,
  );

  const gateChecks = {
    phaseBinSupport: phaseSupportValid,
    balancedAccuracy:
      full.balancedAccuracy >= GATE.balancedAccuracyMin,
    waitRecall:
      full.recall[0] >= GATE.waitRecallMin,
    drinkRecall:
      full.recall[1] >= GATE.drinkRecallMin,
    earlyDrinkRecall:
      phaseBins.early.drinkRecall >= GATE.phaseBinDrinkRecallMin,
    midDrinkRecall:
      phaseBins.mid.drinkRecall >= GATE.phaseBinDrinkRecallMin,
    lateDrinkRecall:
      phaseBins.late.drinkRecall >= GATE.phaseBinDrinkRecallMin,
    dnShuffleMargin:
      dnMargin >= GATE.dnShuffleMarginMin,
    neuralOffMargin:
      offMargin >= GATE.neuralOffMarginMin,
    meanReturn:
      full.meanG >= GATE.meanReturnMin,
    meanRegret:
      full.meanRegret <= GATE.meanRegretMax,
  };

  const pass = Object.values(gateChecks).every(Boolean);
  const outcome = !phaseSupportValid
    ? "V15E_IMPLEMENTATION_INVALID"
    : pass
      ? "V15E_PHASE_RANDOMIZED_REWARD_POLICY_PASS"
      : "V15E_PHASE_RANDOMIZED_REWARD_POLICY_FAIL";

  console.log(
    "[v15E] FULL BA=" +
      (full.balancedAccuracy * 100).toFixed(1) +
      "% recall=" +
      full.recall.map((x) => (x * 100).toFixed(1)).join("/") +
      "% G=" +
      full.meanG.toFixed(3) +
      " regret=" +
      full.meanRegret.toFixed(3),
  );
  console.log(
    "[v15E] DN_SHUFFLED BA=" +
      (dnShuffled.balancedAccuracy * 100).toFixed(1) +
      "% margin=" +
      (dnMargin * 100).toFixed(1) +
      "pp G=" +
      dnShuffled.meanG.toFixed(3),
  );
  console.log(
    "[v15E] NEURAL_OFF BA=" +
      (neuralOff.balancedAccuracy * 100).toFixed(1) +
      "% margin=" +
      (offMargin * 100).toFixed(1) +
      "pp G=" +
      neuralOff.meanG.toFixed(3),
  );
  console.log(
    "[v15E] PHASE_BINS early=" + phaseBins.early.n + "/" +
      (phaseBins.early.drinkRecall * 100).toFixed(1) + "% mid=" +
      phaseBins.mid.n + "/" + (phaseBins.mid.drinkRecall * 100).toFixed(1) +
      "% late=" + phaseBins.late.n + "/" +
      (phaseBins.late.drinkRecall * 100).toFixed(1) + "%",
  );
  console.log(
    "[v15E] model sha256=" + modelSha256 +
      " outcome=" + outcome +
      " v15F=" + (pass ? "PREREGISTRATION_AUTHORIZED" : "BLOCKED"),
  );

  const output = {
    schema: "maplefly.v15e.phase-randomized-reward-value-learning.1",
    brainRepository: SOURCE.repository,
    brainCommit: SOURCE.commit,
    preregistration: {
      path: "history/prereg_v15e.md",
      commit: PREREG_COMMIT,
    },
    frozenRepresentation: {
      source: FROZEN_REPRESENTATION_SOURCE,
      name: "FULL48_REWARD_ADVANTAGE",
      sha256: frozen.digest,
      selectedFeatureCount: TOP_FEATURES,
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
      tasteOfferHpIndependent: true,
      historyFrames: HISTORY_FRAMES,
      historySeconds: HISTORY_FRAMES * FRAME_STEPS * STEP_SECONDS,
    },
    rewardEvaluator: {
      maxHp: 100,
      contactDamage: 10,
      potionHeal: 30,
      potionOpportunityCost: 15,
      futureContacts: 6,
      returnFormula: "terminalHP - 15*potionUsed",
      learnerRewardNormalization: "(G-25)/15",
      audit,
    },
    dataset: {
      trainBaseSeeds: TRAIN_BASE_SEEDS,
      evalBaseSeeds: EVAL_BASE_SEEDS,
      replicates: REPLICATES,
      trainRows: trainRows.length,
      evalRows: evalRows.length,
      timingGenerator: {
        onsetMin: 10,
        onsetMax: 220,
        minimumSeparationSteps: 10,
        rngRule: "brainSeed+500000",
        canonicalGridUsed: false,
      },
    },
    learner: {
      type: "TWO_HEAD_LINEAR_ACTION_VALUE",
      acquisitionMode: "UNIFORM_POLICY_EXPLORATION",
      epochs: EPOCHS,
      optimizer: "NORMALIZED_LINEAR_UPDATE",
      mu: MU,
      l2: L2,
      epsilon: EPSILON,
      orderSeedBase: ORDER_SEED_BASE,
      policySeed: POLICY_SEED,
      initialization: "ZERO",
      trainingSignal: "REALIZED_CHOSEN_ACTION_REWARD_ONLY",
      counterfactualTraining: false,
      previousPotionMotorHistoryInput: false,
    },
    training: {
      actionCounts: trained.actionCounts,
      explorationCount: trained.explorationCount,
      epochTrace: trained.epochTrace,
      optimizerDiagnostics: trained.optimizerDiagnostics,
      finalHeadDiagnostics,
    },
    frozenModel: modelObject,
    frozenModelSha256: modelSha256,
    controls: {
      dnPermutationSeedRule: "baseSeed+900000",
      neuralOff: "ALL_256_STANDARDIZED_FEATURES_ZERO",
    },
    baselines: {
      alwaysWaitMeanG: 25,
      alwaysDrinkMeanG: 25,
      oracleMeanG: 30,
    },
    gate: GATE,
    evaluation: {
      full,
      dnShuffled,
      neuralOff,
      phaseBins,
      dnShuffleMargin: dnMargin,
      neuralOffMargin: offMargin,
      gateChecks,
    },
    pass,
    outcome,
    v15F: pass ? "PREREGISTRATION_AUTHORIZED" : "BLOCKED",
    browserPotionDeployment: "BLOCKED",
  };

  await writeFile(
    resolve(outDir, "v15e_training.json"),
    JSON.stringify(output, null, 2) + "\n",
    "utf8",
  );

  if (!pass) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
