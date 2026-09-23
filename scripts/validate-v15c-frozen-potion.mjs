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
const IMPACT_STARTS = [25, 55, 85, 115, 145, 175];

const HOLDOUT_BASE_SEEDS = [2935000, 2935100, 2935200, 2935300];
const REPLICATES = 6;

const PREREG_COMMIT = "1a8f92f3e139074fb97b01b6ac9b421b6ae48908";
const FROZEN_REPRESENTATION_SHA256 =
  "33fc31f636e1cde215841dd33b0a93b24d4571cdabd32e9a1edc8fa2e696c847";
const FROZEN_MODEL_SHA256 =
  "47088bcb15ed2cd96f64d67a20169934bd7a866dcd56bacffea70b1f42537a59";

const GATE = Object.freeze({
  balancedAccuracyMin: 0.70,
  everyClassRecallMin: 0.60,
  dnShuffleMarginMin: 0.20,
  neuralOffMarginMin: 0.20,
  injurySensoryOffMarginMin: 0.20,
  meanReturnMin: 27.5,
  meanRegretMax: 2.5,
});

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function finite(value, label) {
  if (!Number.isFinite(value)) throw new Error(label + " is non-finite");
  return value;
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

function historyDrive(step, events, injurySensoryEnabled) {
  const drive = groundDrive();

  if (injurySensoryEnabled) {
    for (const event of events) {
      if (step >= event.start && step < event.start + IMPACT_PULSE_STEPS) {
        drive["LgLG_" + event.side] = IMPACT_DRIVE;
      }
    }
  }

  if (step >= HISTORY_FRAMES * FRAME_STEPS - FRAME_STEPS) {
    drive.taste_L = TASTE_DRIVE;
    drive.taste_R = TASTE_DRIVE;
  }

  return drive;
}

async function collectEpisode(
  connectome,
  dnSlot,
  baseSeed,
  classIndex,
  replicate,
  injurySensoryEnabled,
) {
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
      stimulate(
        brain,
        connectome.inputGroups,
        historyDrive(step, events, injurySensoryEnabled),
      );
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
    injurySensoryEnabled,
    history,
  };
}

async function collectDataset(connectome, dnSlot, injurySensoryEnabled, label) {
  const rows = [];
  for (const baseSeed of HOLDOUT_BASE_SEEDS) {
    for (let replicate = 0; replicate < REPLICATES; replicate += 1) {
      for (let classIndex = 0; classIndex < 4; classIndex += 1) {
        rows.push(
          await collectEpisode(
            connectome,
            dnSlot,
            baseSeed,
            classIndex,
            replicate,
            injurySensoryEnabled,
          ),
        );
      }
    }
    console.log(
      "[v15C-" + label + "] baseSeed=" + baseSeed + " rows=" + rows.length,
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
  if (!entry?.representation) throw new Error("v15A12 representation missing");

  const representation = entry.representation;
  const digest = createHash("sha256")
    .update(JSON.stringify(representation))
    .digest("hex");

  if (digest !== FROZEN_REPRESENTATION_SHA256) {
    throw new Error("representation hash mismatch: " + digest);
  }
  if (entry.representationSha256 !== digest) {
    throw new Error("representation entry hash mismatch");
  }

  const slots = representation.selectedSlots.map((entryNow) => {
    const rawSlot = entryNow.relativeSlot;
    if (
      !Number.isInteger(rawSlot) ||
      rawSlot < 0 ||
      rawSlot >= HISTORY_FRAMES * DN_COUNT
    ) {
      throw new Error("invalid representation slot");
    }
    return rawSlot;
  });

  if (
    slots.length !== TOP_FEATURES ||
    representation.means?.length !== TOP_FEATURES ||
    representation.scales?.length !== TOP_FEATURES
  ) {
    throw new Error("representation dimensionality mismatch");
  }

  return {
    digest,
    slots,
    means: Float64Array.from(representation.means),
    scales: Float64Array.from(representation.scales),
  };
}

async function loadFrozenModel(path) {
  const parsed = JSON.parse(await readFile(path, "utf8"));
  const model = parsed.frozenModel;
  if (!model) throw new Error("v15B3 frozen model missing");

  const digest = createHash("sha256")
    .update(JSON.stringify(model))
    .digest("hex");

  if (digest !== FROZEN_MODEL_SHA256) {
    throw new Error("v15B3 model hash mismatch: " + digest);
  }
  if (parsed.frozenModelSha256 !== digest) {
    throw new Error("v15B3 model entry hash mismatch");
  }
  if (parsed.pass !== true || parsed.outcome !== "V15B3_NORMALIZED_VALUE_LEARNING_PASS") {
    throw new Error("v15B3 source artifact is not authoritative PASS");
  }

  for (const action of ["wait", "drink"]) {
    if (model[action]?.weights?.length !== TOP_FEATURES) {
      throw new Error(action + " head dimensionality mismatch");
    }
  }

  return {
    digest,
    wait: {
      bias: finite(model.wait.bias, "WAIT bias"),
      weights: Float64Array.from(model.wait.weights),
    },
    drink: {
      bias: finite(model.drink.bias, "DRINK bias"),
      weights: Float64Array.from(model.drink.weights),
    },
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
    out[i] = finite(
      clamp(
        (rawValue(row, frozen.slots[i], permutation) - frozen.means[i]) /
          frozen.scales[i],
        -5,
        5,
      ),
      "standardized feature",
    );
  }
  return out;
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

function rewardOutcome(classIndex, action) {
  const decisionHp = 100 - 10 * classIndex;
  let hp = decisionHp;
  const drink = action === 1;

  if (drink) hp = Math.min(100, hp + 30);
  for (let i = 0; i < 6; i += 1) hp = Math.max(0, hp - 10);

  const g = hp - (drink ? 15 : 0);
  return { g, terminalHp: hp };
}

function counterfactualAudit(classIndex) {
  const wait = rewardOutcome(classIndex, 0);
  const drink = rewardOutcome(classIndex, 1);
  const deltaG = drink.g - wait.g;
  if (deltaG === 0) throw new Error("zero counterfactual advantage");
  return {
    gWait: wait.g,
    gDrink: drink.g,
    optimalAction: deltaG > 0 ? 1 : 0,
  };
}

function evaluate(rows, frozen, model, options = {}) {
  const total = [0, 0];
  const correct = [0, 0];
  const confusion = [[0, 0], [0, 0]];
  const stateStats = Array.from({ length: 4 }, () => ({
    count: 0,
    drink: 0,
    sumG: 0,
  }));
  const qStats = {
    wait: { min: Infinity, max: -Infinity, sum: 0 },
    drink: { min: Infinity, max: -Infinity, sum: 0 },
  };

  let sumG = 0;
  let sumOracleG = 0;

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
    const audit = counterfactualAudit(row.classIndex);
    const outcome = rewardOutcome(row.classIndex, decision.action);
    const oracleG = Math.max(audit.gWait, audit.gDrink);

    total[audit.optimalAction] += 1;
    confusion[audit.optimalAction][decision.action] += 1;
    if (decision.action === audit.optimalAction) {
      correct[audit.optimalAction] += 1;
    }

    qStats.wait.min = Math.min(qStats.wait.min, decision.qWait);
    qStats.wait.max = Math.max(qStats.wait.max, decision.qWait);
    qStats.wait.sum += decision.qWait;
    qStats.drink.min = Math.min(qStats.drink.min, decision.qDrink);
    qStats.drink.max = Math.max(qStats.drink.max, decision.qDrink);
    qStats.drink.sum += decision.qDrink;

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

async function main() {
  const outDir = resolve("results/validate-v15c-frozen-potion");
  await mkdir(outDir, { recursive: true });

  const representationPath = resolve(
    process.env.V15A12_REPRESENTATION_FILE ??
      ".cache/v15a12-artifact/v15a12_screen.json",
  );
  const modelPath = resolve(
    process.env.V15B3_MODEL_FILE ??
      ".cache/v15b3-artifact/v15b3_training.json",
  );

  const frozen = await loadFrozenRepresentation(representationPath);
  const model = await loadFrozenModel(modelPath);

  console.log("[v15C] representation sha256=" + frozen.digest);
  console.log("[v15C] frozen model sha256=" + model.digest);

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

  const fullRows = await collectDataset(
    connectome,
    dnSlot,
    true,
    "full",
  );
  const injuryOffRows = await collectDataset(
    connectome,
    dnSlot,
    false,
    "injury-off",
  );

  if (fullRows.length !== 96 || injuryOffRows.length !== 96) {
    throw new Error("holdout dataset size mismatch");
  }

  const permutations = new Map(
    HOLDOUT_BASE_SEEDS.map((baseSeed) => [
      baseSeed,
      shuffledIndices(DN_COUNT, baseSeed + 900000),
    ]),
  );

  const full = evaluate(fullRows, frozen, model);
  const dnShuffled = evaluate(
    fullRows,
    frozen,
    model,
    { permutations },
  );
  const neuralOff = evaluate(
    fullRows,
    frozen,
    model,
    { neuralOff: true },
  );
  const injurySensoryOff = evaluate(
    injuryOffRows,
    frozen,
    model,
  );

  const dnMargin = full.balancedAccuracy - dnShuffled.balancedAccuracy;
  const offMargin = full.balancedAccuracy - neuralOff.balancedAccuracy;
  const injuryOffMargin =
    full.balancedAccuracy - injurySensoryOff.balancedAccuracy;

  const gateChecks = {
    balancedAccuracy:
      full.balancedAccuracy >= GATE.balancedAccuracyMin,
    everyClassRecall:
      full.minClassRecall >= GATE.everyClassRecallMin,
    dnShuffleMargin:
      dnMargin >= GATE.dnShuffleMarginMin,
    neuralOffMargin:
      offMargin >= GATE.neuralOffMarginMin,
    injurySensoryOffMargin:
      injuryOffMargin >= GATE.injurySensoryOffMarginMin,
    meanReturn:
      full.meanG >= GATE.meanReturnMin,
    meanRegret:
      full.meanRegret <= GATE.meanRegretMax,
  };

  const pass = Object.values(gateChecks).every(Boolean);
  const outcome = pass
    ? "V15C_FROZEN_POLICY_HOLDOUT_PASS"
    : "V15C_FROZEN_POLICY_HOLDOUT_FAIL";

  for (const [name, result] of [
    ["FULL", full],
    ["DN_SHUFFLED", dnShuffled],
    ["NEURAL_OFF", neuralOff],
    ["INJURY_SENSORY_OFF", injurySensoryOff],
  ]) {
    console.log(
      "[v15C] " + name +
        " BA=" + (result.balancedAccuracy * 100).toFixed(1) +
        "% recall=" + result.recall.map((x) => (x * 100).toFixed(1)).join("/") +
        "% G=" + result.meanG.toFixed(3) +
        " regret=" + result.meanRegret.toFixed(3),
    );
  }

  console.log(
    "[v15C] margins DN=" + (dnMargin * 100).toFixed(1) +
      "pp OFF=" + (offMargin * 100).toFixed(1) +
      "pp INJURY_OFF=" + (injuryOffMargin * 100).toFixed(1) +
      "pp outcome=" + outcome +
      " v15D=" + (pass ? "PREREGISTRATION_AUTHORIZED" : "BLOCKED"),
  );

  const output = {
    schema: "maplefly.v15c.frozen-policy-holdout.1",
    brainRepository: SOURCE.repository,
    brainCommit: SOURCE.commit,
    preregistration: {
      path: "history/prereg_v15c.md",
      commit: PREREG_COMMIT,
    },
    frozenRepresentation: {
      artifactId: 10768761312,
      artifactDigest:
        "sha256:8aa759b04643d618e69aaa647d7251eb237816ee3b84bcc97a0f451d20cbba78",
      sha256: frozen.digest,
    },
    frozenPolicy: {
      artifactId: 10770299335,
      artifactDigest:
        "sha256:3f715ef7f4f62e854db02c4e0f05b8662d5dab2a46d1ea0675320bffbe3bc838",
      sha256: model.digest,
      learningDuringV15C: false,
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
    holdout: {
      baseSeeds: HOLDOUT_BASE_SEEDS,
      replicates: REPLICATES,
      rows: fullRows.length,
    },
    controls: {
      dnPermutationSeedRule: "baseSeed+900000",
      neuralOff: "ALL_256_STANDARDIZED_FEATURES_ZERO",
      injurySensoryOff:
        "SAME_SEEDS_AND_EVENT_SCHEDULES_WITH_LgLG_IMPACT_DRIVE_ZERO",
    },
    gate: GATE,
    evaluation: {
      full,
      dnShuffled,
      neuralOff,
      injurySensoryOff,
      margins: {
        dnShuffled: dnMargin,
        neuralOff: offMargin,
        injurySensoryOff: injuryOffMargin,
      },
      gateChecks,
    },
    pass,
    outcome,
    v15D: pass ? "PREREGISTRATION_AUTHORIZED" : "BLOCKED",
    browserPotionDeployment: "BLOCKED",
  };

  await writeFile(
    resolve(outDir, "v15c_holdout.json"),
    JSON.stringify(output, null, 2) + "\n",
    "utf8",
  );

  if (!pass) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
