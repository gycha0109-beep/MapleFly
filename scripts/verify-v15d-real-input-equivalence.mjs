#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  ConnectomeBrain,
  cells,
  cellsWithPrefix,
  loadConnectome,
} from "../src/headless/connectome-runtime.mjs";
import "../src/brain/fly-skill-v15-potion.js";

const STEP_SECONDS = 0.02;
const SETTLE_STEPS = 26;
const BASELINE_STEPS = 26;
const FRAME_STEPS = 5;
const HISTORY_FRAMES = 48;
const DN_COUNT = 1316;
const IMPACT_STARTS = [25, 55, 85, 115, 145, 175];
const BASE_SEEDS = [2945000, 2945100];
const REPLICATES = 2;

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

function driveAt(step, events) {
  const drive = { SNta_L: 0.05, SNta_R: 0.05 };
  for (const event of events) {
    if (step >= event.start && step < event.start + 6) {
      drive["LgLG_" + event.side] = 0.7;
    }
  }
  if (step >= HISTORY_FRAMES * FRAME_STEPS - FRAME_STEPS) {
    drive.taste_L = 0.8;
    drive.taste_R = 0.8;
  }
  return drive;
}

function stimulate(brain, inputGroups, drive) {
  for (const [name, amount] of Object.entries(drive)) {
    if (!amount) continue;
    const group = inputGroups.get(name);
    if (group?.length) brain.stimulate(group, amount);
  }
}

function collectSelected(brain, slot, counts) {
  for (let i = 0; i < brain.firedCount; i += 1) {
    const index = slot[brain.fired[i]];
    if (index >= 0) counts[index] += 1;
  }
}

function maxAbs(a, b) {
  if (a.length !== b.length) return Infinity;
  let max = 0;
  for (let i = 0; i < a.length; i += 1) {
    max = Math.max(max, Math.abs(Number(a[i]) - Number(b[i])));
  }
  return max;
}

const repPath = resolve(
  process.env.V15A12_REPRESENTATION_FILE ??
    ".cache/v15a12-artifact/v15a12_screen.json",
);
const policyPath = resolve(
  process.env.V15B3_MODEL_FILE ??
    ".cache/v15b3-artifact/v15b3_training.json",
);
const repJson = JSON.parse(await readFile(repPath, "utf8"));
const policyJson = JSON.parse(await readFile(policyPath, "utf8"));
const referenceRep = repJson.representations.find(
  (row) => row.name === "FULL48_REWARD_ADVANTAGE",
).representation;
const referenceModel = policyJson.frozenModel;

const browserApi = globalThis.MapleFlyPotionSkillV15;
const browserState = browserApi.loadState();

const connectome = await loadConnectome({
  cacheDir: resolve(".cache/maplefly-connectome"),
  onProgress(message) {
    console.log("[connectome] " + message);
  },
});

for (const side of ["L", "R"]) {
  const impact = cellsWithPrefix(connectome.meta, "LgLG", side);
  if (impact.length !== (side === "L" ? 331 : 338)) {
    throw new Error("LgLG family count mismatch");
  }
  connectome.inputGroups.set("LgLG_" + side, impact);

  const taste = cells(connectome.meta, ["LB3", "claw_tpGRN"], side);
  if (!taste.length) throw new Error("taste group missing");
  connectome.inputGroups.set("taste_" + side, taste);
}

const allDn = cells(
  connectome.meta,
  ["descending_neuron", "descending_neuron_tbc"],
);
if (allDn.length !== DN_COUNT) throw new Error("DN count mismatch");

const selectedNeuronSlot = new Int16Array(connectome.meta.n).fill(-1);
browserState.runtimeDnIndices.forEach((dnIndex, runtimeIndex) => {
  selectedNeuronSlot[allDn[dnIndex]] = runtimeIndex;
});
const runtimeIndexByDn = new Map(
  browserState.runtimeDnIndices.map((dn, index) => [dn, index]),
);

let maxFrameError = 0;
let maxQWaitError = 0;
let maxQDrinkError = 0;
let actionMismatch = 0;
let contexts = 0;

for (const baseSeed of BASE_SEEDS) {
  for (let replicate = 0; replicate < REPLICATES; replicate += 1) {
    for (let classIndex = 0; classIndex < 4; classIndex += 1) {
      const brainSeed = baseSeed + replicate * 7 + 1;
      const events = makeEvents(brainSeed, classIndex);
      const brain = new ConnectomeBrain(
        connectome.weights,
        connectome.meta.params,
        brainSeed,
      );

      for (let step = 0; step < SETTLE_STEPS; step += 1) {
        stimulate(brain, connectome.inputGroups, {
          SNta_L: 0.05,
          SNta_R: 0.05,
        });
        brain.step();
      }

      const baselineCounts =
        new Float64Array(browserState.runtimeDnIndices.length);
      for (let step = 0; step < BASELINE_STEPS; step += 1) {
        stimulate(brain, connectome.inputGroups, {
          SNta_L: 0.05,
          SNta_R: 0.05,
        });
        brain.step();
        collectSelected(brain, selectedNeuronSlot, baselineCounts);
      }
      const baselineHz = Float64Array.from(
        baselineCounts,
        (count) => count / (BASELINE_STEPS * STEP_SECONDS),
      );

      const runtime = browserApi.createRuntime();
      browserApi.setBaseline(runtime, baselineHz);
      const referenceHistory = [];

      for (let frameIndex = 0; frameIndex < HISTORY_FRAMES; frameIndex += 1) {
        const counts =
          new Float64Array(browserState.runtimeDnIndices.length);
        for (let local = 0; local < FRAME_STEPS; local += 1) {
          const step = frameIndex * FRAME_STEPS + local;
          stimulate(
            brain,
            connectome.inputGroups,
            driveAt(step, events),
          );
          brain.step();
          collectSelected(brain, selectedNeuronSlot, counts);
        }

        const browserFrame = browserApi.makeFrame(
          runtime,
          counts,
          FRAME_STEPS,
        );
        const referenceFrame = Float64Array.from(
          counts,
          (count, index) =>
            clamp(
              (
                count / (FRAME_STEPS * STEP_SECONDS) -
                baselineHz[index]
              ) / 50,
              -1,
              1,
            ),
        );
        maxFrameError = Math.max(
          maxFrameError,
          maxAbs(browserFrame, referenceFrame),
        );
        referenceHistory.push(referenceFrame);
        browserApi.pushFrame(runtime, browserFrame);
      }

      const browserDecision = browserApi.choose(
        runtime,
        browserState,
      );

      const feature = new Float64Array(256);
      for (let index = 0; index < feature.length; index += 1) {
        const rawSlot = referenceRep.selectedSlots[index].relativeSlot;
        const frameIndex = Math.floor(rawSlot / DN_COUNT);
        const dnIndex = rawSlot % DN_COUNT;
        const runtimeIndex = runtimeIndexByDn.get(dnIndex);
        const raw = referenceHistory[frameIndex][runtimeIndex];
        feature[index] = clamp(
          (raw - referenceRep.means[index]) /
            referenceRep.scales[index],
          -5,
          5,
        );
      }

      let qWait = referenceModel.wait.bias;
      let qDrink = referenceModel.drink.bias;
      for (let index = 0; index < feature.length; index += 1) {
        qWait += referenceModel.wait.weights[index] * feature[index];
        qDrink += referenceModel.drink.weights[index] * feature[index];
      }
      const action = qDrink > qWait ? "DRINK" : "WAIT";

      maxQWaitError = Math.max(
        maxQWaitError,
        Math.abs(browserDecision.qWait - qWait),
      );
      maxQDrinkError = Math.max(
        maxQDrinkError,
        Math.abs(browserDecision.qDrink - qDrink),
      );
      actionMismatch += Number(browserDecision.action !== action);
      contexts += 1;
    }
  }
}

const pass =
  contexts === 16 &&
  maxFrameError <= 1e-12 &&
  maxQWaitError <= 1e-12 &&
  maxQDrinkError <= 1e-12 &&
  actionMismatch === 0;

console.log(
  "V15D-REAL-INPUT-EQUIVALENCE=" + (pass ? "PASS" : "FAIL") +
    " contexts=" + contexts +
    " frameErr=" + maxFrameError +
    " qWaitErr=" + maxQWaitError +
    " qDrinkErr=" + maxQDrinkError +
    " actionMismatch=" + actionMismatch,
);

if (!pass) process.exitCode = 1;
