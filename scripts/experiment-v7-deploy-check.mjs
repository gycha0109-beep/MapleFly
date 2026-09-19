#!/usr/bin/env node

import {
  mkdir,
  writeFile,
} from "node:fs/promises";
import { resolve } from "node:path";
import {
  SOURCE,
  ConnectomeBrain,
  cells,
  loadConnectome,
} from "../src/headless/connectome-runtime.mjs";
import "../src/brain/fly-skill-v7.js";

const STEP_SECONDS = 0.02;
const SETTLE_STEPS = 25;
const BASELINE_STEPS = 25;
const CUE_STEPS = 25;
const DISTANCES = [80, 150, 300, 500];

const skillApi = globalThis.MapleFlySkillV7;
const skill = skillApi.BUNDLED_STATE;

function parseArgs(argv) {
  const out = {
    episodes: 40,
    seed: 9000,
    cache: ".cache/maplefly-connectome",
    out: "results/experiment-v7-deploy",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (arg === "--episodes") {
      out.episodes = Number(next);
      i += 1;
    } else if (arg === "--seed") {
      out.seed = Number(next);
      i += 1;
    } else if (arg === "--cache") {
      out.cache = next;
      i += 1;
    } else if (arg === "--out") {
      out.out = next;
      i += 1;
    } else {
      throw new Error("unknown argument: " + arg);
    }
  }

  if (!Number.isInteger(out.episodes) || out.episodes <= 0 || out.episodes % 2) {
    throw new Error("--episodes must be a positive even integer");
  }

  return out;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function groundDrive() {
  return {
    SNta_L: 0.05,
    SNta_R: 0.05,
  };
}

function targetDrive(side, distance) {
  const closeness = clamp(1 - distance / 620, 0, 1);
  const drive = groundDrive();

  drive["LC10a_" + side] = clamp(
    0.12 + closeness * 0.68,
    0,
    0.8,
  );
  drive["LPLC1_" + side] = clamp(
    closeness * 0.12,
    0,
    0.55,
  );
  drive["LPLC2_" + side] = clamp(
    closeness * 0.24,
    0,
    0.8,
  );

  if (distance < 175) {
    drive["LC4_" + side] = clamp(
      ((175 - distance) / 175) * 0.72,
      0,
      0.8,
    );
  }

  return drive;
}

function stimulate(brain, inputGroups, drive) {
  for (const [name, amount] of Object.entries(drive)) {
    const indices = inputGroups.get(name);
    if (indices?.length && amount) {
      brain.stimulate(indices, amount);
    }
  }
}

function selectedNeurons(meta) {
  const allDn = cells(
    meta,
    ["descending_neuron", "descending_neuron_tbc"],
  );

  if (allDn.length !== skill.originalFeatureCount) {
    throw new Error(
      "DN count changed: " +
      allDn.length +
      " != " +
      skill.originalFeatureCount,
    );
  }

  return Int32Array.from(
    skill.featureIndices.map((index) => allDn[index]),
  );
}

function slotMap(n, selected) {
  const map = new Int16Array(n).fill(-1);

  for (let slot = 0; slot < selected.length; slot += 1) {
    map[selected[slot]] = slot;
  }

  return map;
}

function collect(brain, inputGroups, slots, count, steps, drive) {
  const spikes = new Float64Array(count);

  for (let step = 0; step < steps; step += 1) {
    stimulate(brain, inputGroups, drive);
    brain.step();

    for (let fired = 0; fired < brain.firedCount; fired += 1) {
      const slot = slots[brain.fired[fired]];
      if (slot >= 0) {
        spikes[slot] += 1;
      }
    }
  }

  return spikes;
}

function feature({
  connectome,
  slots,
  selectedCount,
  seed,
  side,
  distance,
  visual,
}) {
  const brain = new ConnectomeBrain(
    connectome.weights,
    connectome.meta.params,
    seed,
  );

  for (let step = 0; step < SETTLE_STEPS; step += 1) {
    stimulate(
      brain,
      connectome.inputGroups,
      groundDrive(),
    );
    brain.step();
  }

  const baseline = collect(
    brain,
    connectome.inputGroups,
    slots,
    selectedCount,
    BASELINE_STEPS,
    groundDrive(),
  );

  const cue = collect(
    brain,
    connectome.inputGroups,
    slots,
    selectedCount,
    CUE_STEPS,
    visual ? targetDrive(side, distance) : groundDrive(),
  );

  const values = new Float64Array(selectedCount);
  let normSquared = 0;

  for (let i = 0; i < selectedCount; i += 1) {
    const delta =
      (cue[i] / (CUE_STEPS * STEP_SECONDS) -
       baseline[i] / (BASELINE_STEPS * STEP_SECONDS)) /
      50;

    values[i] = delta;
    normSquared += delta * delta;
  }

  const norm = Math.sqrt(normSquared);
  if (norm > 1e-9) {
    for (let i = 0; i < values.length; i += 1) {
      values[i] /= norm;
    }
  }

  return values;
}

function evaluate({
  connectome,
  slots,
  selectedCount,
  episodes,
  baseSeed,
  distance,
  visual,
}) {
  let correct = 0;
  const rows = [];

  for (let episode = 0; episode < episodes; episode += 1) {
    const pair = Math.floor(episode / 2);
    const side =
      episode % 2 === (pair % 2) ? "L" : "R";
    const seed = baseSeed + pair;

    const values = feature({
      connectome,
      slots,
      selectedCount,
      seed,
      side,
      distance,
      visual,
    });

    const decision = skillApi.choose(values, skill);
    const ok = decision.action === (side === "L" ? "LEFT" : "RIGHT");

    if (ok) {
      correct += 1;
    }

    rows.push({
      episode: episode + 1,
      seed,
      targetSide: side,
      action: decision.action,
      correct: ok,
      score: decision.leftScore,
    });
  }

  return {
    accuracy: correct / episodes,
    rows,
  };
}

function percent(value) {
  return (value * 100).toFixed(1) + "%";
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const outDir = resolve(options.out);
  await mkdir(outDir, { recursive: true });

  const connectome = await loadConnectome({
    cacheDir: resolve(options.cache),
    onProgress(message) {
      console.log("[connectome] " + message);
    },
  });

  const selected = selectedNeurons(connectome.meta);
  const slots = slotMap(connectome.meta.n, selected);

  console.log(
    "[skill] " +
    skill.flyId +
    " " +
    skill.version +
    " selectedDN=" +
    selected.length,
  );

  const results = [];

  for (const distance of DISTANCES) {
    const on = evaluate({
      connectome,
      slots,
      selectedCount: selected.length,
      episodes: options.episodes,
      baseSeed: options.seed + distance * 10,
      distance,
      visual: true,
    });

    const off = evaluate({
      connectome,
      slots,
      selectedCount: selected.length,
      episodes: options.episodes,
      baseSeed: options.seed + distance * 10,
      distance,
      visual: false,
    });

    results.push({
      distance,
      visualOnAccuracy: on.accuracy,
      visualOffAccuracy: off.accuracy,
      delta: on.accuracy - off.accuracy,
      onRows: on.rows,
      offRows: off.rows,
    });

    console.log(
      "distance=" +
      distance +
      " ON=" +
      percent(on.accuracy) +
      " OFF=" +
      percent(off.accuracy) +
      " delta=" +
      percent(on.accuracy - off.accuracy),
    );
  }

  const trainingDistance = results.find(
    (row) => row.distance === 150,
  );
  const minOn = Math.min(
    ...results.map((row) => row.visualOnAccuracy),
  );
  const maxOff = Math.max(
    ...results.map((row) => row.visualOffAccuracy),
  );

  const gate =
    trainingDistance.visualOnAccuracy >= 0.90 &&
    minOn >= 0.75 &&
    maxOff <= 0.60;

  const summary = {
    trainingDistanceOn:
      trainingDistance.visualOnAccuracy,
    minVisualOn: minOn,
    maxVisualOff: maxOff,
    gate,
  };

  console.log(
    "deploy-gate=" +
    (gate ? "PASS" : "FAIL") +
    " training150=" +
    percent(summary.trainingDistanceOn) +
    " minON=" +
    percent(minOn) +
    " maxOFF=" +
    percent(maxOff),
  );

  await writeFile(
    resolve(outDir, "experiment_v7_deploy.json"),
    JSON.stringify(
      {
        meta: {
          schema: "maplefly.experiment-v7.deploy-check.1",
          brainRepository: SOURCE.repository,
          brainCommit: SOURCE.commit,
          skillVersion: skill.version,
          sourceRun: skill.sourceRun,
          selectedDnFeatures: selected.length,
          episodesPerConditionPerDistance: options.episodes,
          distances: DISTANCES,
          gate:
            "150px ON>=90%; all distances ON>=75%; all OFF<=60%",
        },
        summary,
        results,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
