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
const WINDOW_STEPS = 26;
const WORLD_WIDTH = 1000;
const PLAYER_WIDTH = 34;
const MOVE_SPEED = 280;
const REACH_DISTANCE = 42;
const skillApi = globalThis.MapleFlySkillV7;
const skill = skillApi.BUNDLED_STATE;

function parseArgs(argv) {
  const values = {
    seconds: 60,
    pairs: 3,
    seed: 64,
    out: "results/experiment-v8-live",
    cache: ".cache/maplefly-connectome",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (arg === "--seconds") {
      values.seconds = Number(next);
      i += 1;
    } else if (arg === "--pairs") {
      values.pairs = Number(next);
      i += 1;
    } else if (arg === "--seed") {
      values.seed = Number(next);
      i += 1;
    } else if (arg === "--out") {
      values.out = next;
      i += 1;
    } else if (arg === "--cache") {
      values.cache = next;
      i += 1;
    } else {
      throw new Error("unknown argument: " + arg);
    }
  }

  if (!Number.isFinite(values.seconds) || values.seconds <= 0) {
    throw new Error("--seconds must be > 0");
  }
  if (!Number.isInteger(values.pairs) || values.pairs <= 0) {
    throw new Error("--pairs must be a positive integer");
  }

  return values;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function mean(values) {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) /
      values.length
    : 0;
}

function hashUnit(seed, spawnIndex) {
  let value = (
    Math.trunc(Number(seed) || 0) ^
    Math.imul(spawnIndex + 1, 0x9e3779b1)
  ) >>> 0;

  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d);
  value ^= value >>> 15;
  value = Math.imul(value, 0x846ca68b);
  value ^= value >>> 16;

  return (value >>> 0) / 4294967296;
}

function spawnPosition(seed, spawnIndex) {
  return Math.round(
    55 + hashUnit(seed, spawnIndex) * (945 - 55),
  );
}

function groundDrive() {
  return {
    SNta_L: 0.05,
    SNta_R: 0.05,
  };
}

class LiveEncoder {
  constructor() {
    this.reset();
  }

  reset() {
    this.lastDistance = null;
  }

  encode(playerX, targetX, visual) {
    const drive = groundDrive();

    if (!visual) {
      this.reset();
      return drive;
    }

    const playerCenter = playerX + PLAYER_WIDTH / 2;
    const dx = targetX - playerCenter;
    const distance = Math.abs(dx);
    const side = dx < 0 ? "L" : "R";
    const closeness = clamp(
      1 - distance / 620,
      0,
      1,
    );

    let approaching = 0;
    if (Number.isFinite(this.lastDistance)) {
      approaching = clamp(
        (this.lastDistance - distance) / 45,
        0,
        1,
      );
    }
    this.lastDistance = distance;

    drive["LC10a_" + side] = clamp(
      0.12 + closeness * 0.68,
      0,
      0.8,
    );
    drive["LPLC1_" + side] = clamp(
      closeness * 0.12 + approaching * 0.32,
      0,
      0.55,
    );
    drive["LPLC2_" + side] = clamp(
      closeness * 0.24 + approaching * 0.38,
      0,
      0.8,
    );

    if (distance < 175) {
      drive["LC4_" + side] = clamp(
        ((175 - distance) / 175) * 0.72 +
          approaching * 0.18,
        0,
        0.8,
      );
    }

    return drive;
  }
}

function stimulate(brain, inputGroups, drive) {
  for (const [name, amount] of Object.entries(drive)) {
    const indices = inputGroups.get(name);
    if (indices?.length && amount) {
      brain.stimulate(indices, amount);
    }
  }
}

function selectedContract(meta) {
  const allDn = cells(
    meta,
    ["descending_neuron", "descending_neuron_tbc"],
  );

  if (allDn.length !== skill.originalFeatureCount) {
    throw new Error(
      "DN contract mismatch: " +
      allDn.length +
      " != " +
      skill.originalFeatureCount,
    );
  }

  const selected = Int32Array.from(
    skill.featureIndices.map(
      (relativeIndex) => allDn[relativeIndex],
    ),
  );

  const slot = new Int16Array(meta.n).fill(-1);
  selected.forEach((neuron, index) => {
    slot[neuron] = index;
  });

  return { selected, slot };
}

function accumulateSelected(brain, slot, counts) {
  for (let fired = 0; fired < brain.firedCount; fired += 1) {
    const selected = slot[brain.fired[fired]];
    if (selected >= 0) {
      counts[selected] += 1;
    }
  }
}

function settleAndBaseline({
  brain,
  inputGroups,
  slot,
  selectedCount,
}) {
  for (let step = 0; step < WINDOW_STEPS; step += 1) {
    stimulate(brain, inputGroups, groundDrive());
    brain.step();
  }

  const counts = new Float64Array(selectedCount);

  for (let step = 0; step < WINDOW_STEPS; step += 1) {
    stimulate(brain, inputGroups, groundDrive());
    brain.step();
    accumulateSelected(brain, slot, counts);
  }

  const seconds = WINDOW_STEPS * STEP_SECONDS;
  return Float64Array.from(
    counts,
    (count) => count / seconds,
  );
}

function decisionFromWindow(counts, baselineHz) {
  const seconds = WINDOW_STEPS * STEP_SECONDS;
  const feature = new Float64Array(counts.length);
  let normSquared = 0;

  for (let index = 0; index < counts.length; index += 1) {
    const cueHz = counts[index] / seconds;
    const delta = (cueHz - baselineHz[index]) / 50;
    feature[index] = delta;
    normSquared += delta * delta;
  }

  const norm = Math.sqrt(normSquared);
  if (norm > 1e-9) {
    for (let index = 0; index < feature.length; index += 1) {
      feature[index] /= norm;
    }
  }

  if (norm <= 1e-9) {
    return {
      action: "IDLE",
      score: 0,
      norm,
    };
  }

  const choice = skillApi.choose(feature, skill);

  return {
    action: choice.action,
    score: choice.leftScore,
    norm,
  };
}

async function runTrial({
  connectome,
  slot,
  selectedCount,
  seed,
  visual,
  seconds,
}) {
  const brain = new ConnectomeBrain(
    connectome.weights,
    connectome.meta.params,
    seed,
  );
  const encoder = new LiveEncoder();
  const baselineHz = settleAndBaseline({
    brain,
    inputGroups: connectome.inputGroups,
    slot,
    selectedCount,
  });

  let playerX = WORLD_WIDTH / 2 - PLAYER_WIDTH / 2;
  let spawnIndex = 0;
  let targetX = spawnPosition(seed, spawnIndex);
  let action = "IDLE";
  let toward = 0;
  let away = 0;
  let reaches = 0;
  let windows = 0;
  let correctDirectionWindows = 0;
  let scoreSum = 0;
  let scoreCount = 0;

  const targetSteps = Math.round(seconds / STEP_SECONDS);
  let windowCounts = new Float64Array(selectedCount);
  let windowSteps = 0;

  for (let step = 0; step < targetSteps; step += 1) {
    const drive = encoder.encode(
      playerX,
      targetX,
      visual,
    );
    stimulate(
      brain,
      connectome.inputGroups,
      drive,
    );
    brain.step();
    accumulateSelected(
      brain,
      slot,
      windowCounts,
    );

    const before = playerX;
    const direction =
      action === "LEFT"
        ? -1
        : action === "RIGHT"
          ? 1
          : 0;

    playerX = clamp(
      playerX +
        direction * MOVE_SPEED * STEP_SECONDS,
      0,
      WORLD_WIDTH - PLAYER_WIDTH,
    );

    const dx = playerX - before;
    if (Math.abs(dx) > 1e-9) {
      const targetDirection = Math.sign(
        targetX - (before + PLAYER_WIDTH / 2),
      );

      if (Math.sign(dx) === targetDirection) {
        toward += Math.abs(dx);
      } else {
        away += Math.abs(dx);
      }
    }

    const distance = Math.abs(
      targetX - (playerX + PLAYER_WIDTH / 2),
    );

    if (distance <= REACH_DISTANCE) {
      reaches += 1;
      spawnIndex += 1;
      targetX = spawnPosition(seed, spawnIndex);
      encoder.reset();
    }

    windowSteps += 1;

    if (windowSteps >= WINDOW_STEPS) {
      const decision = decisionFromWindow(
        windowCounts,
        baselineHz,
      );
      action = decision.action;
      scoreSum += Math.abs(decision.score);
      scoreCount += 1;

      const currentDirection = Math.sign(
        targetX - (playerX + PLAYER_WIDTH / 2),
      );
      if (
        (action === "LEFT" && currentDirection < 0) ||
        (action === "RIGHT" && currentDirection > 0)
      ) {
        correctDirectionWindows += 1;
      }

      windows += 1;
      windowCounts = new Float64Array(selectedCount);
      windowSteps = 0;
    }

    if (step > 0 && step % 1000 === 0) {
      await new Promise((resolve) =>
        setImmediate(resolve),
      );
    }
  }

  const travel = toward + away;

  return {
    seed,
    condition: visual ? "VISUAL_ON" : "VISUAL_OFF",
    seconds,
    towardDistancePx: toward,
    awayDistancePx: away,
    towardRatio: travel > 0 ? toward / travel : 0,
    reaches,
    skillWindows: windows,
    correctDirectionWindowRatio:
      windows > 0
        ? correctDirectionWindows / windows
        : 0,
    meanAbsoluteScore:
      scoreCount > 0
        ? scoreSum / scoreCount
        : 0,
    finalPlayerX: playerX,
    finalTargetX: targetX,
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

  const contract = selectedContract(
    connectome.meta,
  );

  const trials = [];

  for (let pair = 0; pair < options.pairs; pair += 1) {
    const seed = options.seed + pair;
    const order =
      pair % 2 === 0
        ? [true, false]
        : [false, true];

    for (const visual of order) {
      const result = await runTrial({
        connectome,
        slot: contract.slot,
        selectedCount: contract.selected.length,
        seed,
        visual,
        seconds: options.seconds,
      });

      trials.push({
        pair: pair + 1,
        ...result,
      });

      console.log(
        "pair=" +
        (pair + 1) +
        " seed=" +
        seed +
        " " +
        result.condition +
        " toward=" +
        percent(result.towardRatio) +
        " directionWindows=" +
        percent(result.correctDirectionWindowRatio) +
        " reaches=" +
        result.reaches,
      );
    }
  }

  const on = trials.filter(
    (trial) => trial.condition === "VISUAL_ON",
  );
  const off = trials.filter(
    (trial) => trial.condition === "VISUAL_OFF",
  );

  const meanOn = mean(
    on.map((trial) => trial.towardRatio),
  );
  const meanOff = mean(
    off.map((trial) => trial.towardRatio),
  );
  const minOn = Math.min(
    ...on.map((trial) => trial.towardRatio),
  );
  const meanOnReaches = mean(
    on.map((trial) => trial.reaches),
  );

  const gate =
    meanOn >= 0.70 &&
    meanOn - meanOff >= 0.15 &&
    minOn >= 0.60 &&
    meanOnReaches >= 1;

  const summary = {
    meanVisualOnTowardRatio: meanOn,
    meanVisualOffTowardRatio: meanOff,
    visualContribution: meanOn - meanOff,
    minVisualOnTowardRatio: minOn,
    meanVisualOnReaches: meanOnReaches,
    gate,
  };

  console.log(
    "LIVE-GATE=" +
    (gate ? "PASS" : "FAIL") +
    " ON=" +
    percent(meanOn) +
    " OFF=" +
    percent(meanOff) +
    " delta=" +
    percent(meanOn - meanOff) +
    " minON=" +
    percent(minOn) +
    " reaches=" +
    meanOnReaches.toFixed(1),
  );

  await writeFile(
    resolve(outDir, "experiment_v8_live.json"),
    JSON.stringify(
      {
        meta: {
          schema:
            "maplefly.experiment-v8.live-skill.1",
          brainRepository: SOURCE.repository,
          brainCommit: SOURCE.commit,
          skillVersion: skill.version,
          selectedDnFeatures:
            contract.selected.length,
          seconds: options.seconds,
          pairs: options.pairs,
          baseSeed: options.seed,
          browserWindowSteps: WINDOW_STEPS,
          gate:
            "mean ON toward>=70%; ON-OFF>=15pp; every ON>=60%; mean ON reaches>=1",
        },
        summary,
        trials,
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
