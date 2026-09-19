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

const STEP_SECONDS = 0.02;
const SETTLE_STEPS = 25;
const BASELINE_STEPS = 25;
const CUE_STEPS = 25;
const TARGET_DISTANCE_PX = 150;

const ACTIONS = Object.freeze(["LEFT", "RIGHT"]);
const SIDES = Object.freeze(["L", "R"]);

function parseArgs(argv) {
  const options = {
    runs: 2,
    trainEpisodes: 120,
    evalEpisodes: 60,
    seed: 64,
    learningRate: 0.18,
    baselineRate: 0.08,
    l2: 0.0005,
    out: "results/experiment-v7",
    cache: ".cache/maplefly-connectome",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (arg === "--runs") {
      options.runs = Number(next);
      i += 1;
    } else if (arg === "--train") {
      options.trainEpisodes = Number(next);
      i += 1;
    } else if (arg === "--eval") {
      options.evalEpisodes = Number(next);
      i += 1;
    } else if (arg === "--seed") {
      options.seed = Number(next);
      i += 1;
    } else if (arg === "--learning-rate") {
      options.learningRate = Number(next);
      i += 1;
    } else if (arg === "--out") {
      options.out = next;
      i += 1;
    } else if (arg === "--cache") {
      options.cache = next;
      i += 1;
    } else {
      throw new Error("unknown argument: " + arg);
    }
  }

  for (const key of ["runs", "trainEpisodes", "evalEpisodes"]) {
    if (!Number.isInteger(options[key]) || options[key] <= 0) {
      throw new Error("--" + key + " must be a positive integer");
    }
  }

  if (options.trainEpisodes % 2 !== 0 || options.evalEpisodes % 2 !== 0) {
    throw new Error("--train and --eval must be even so L/R episodes are exactly balanced");
  }

  if (!Number.isInteger(options.seed)) {
    throw new Error("--seed must be an integer");
  }

  if (!Number.isFinite(options.learningRate) || options.learningRate <= 0) {
    throw new Error("--learning-rate must be > 0");
  }

  return options;
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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function mean(values) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function makeSlotMap(n, indices) {
  const map = new Int32Array(n);
  map.fill(-1);

  for (let slot = 0; slot < indices.length; slot += 1) {
    map[indices[slot]] = slot;
  }

  return map;
}

function stimulateFromDrive(brain, inputGroups, drive) {
  for (const [name, amount] of Object.entries(drive)) {
    if (!amount) {
      continue;
    }

    const indices = inputGroups.get(name);
    if (indices?.length) {
      brain.stimulate(indices, amount);
    }
  }
}

function groundDrive() {
  return {
    SNta_L: 0.05,
    SNta_R: 0.05,
  };
}

function targetDrive(side) {
  const distance = TARGET_DISTANCE_PX;
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

function countDnSpikes({
  brain,
  inputGroups,
  dnSlot,
  dnCount,
  steps,
  drive,
}) {
  const counts = new Float64Array(dnCount);

  for (let step = 0; step < steps; step += 1) {
    stimulateFromDrive(brain, inputGroups, drive);
    brain.step();

    for (let fired = 0; fired < brain.firedCount; fired += 1) {
      const slot = dnSlot[brain.fired[fired]];
      if (slot >= 0) {
        counts[slot] += 1;
      }
    }
  }

  const seconds = steps * STEP_SECONDS;
  for (let i = 0; i < counts.length; i += 1) {
    counts[i] /= seconds;
  }

  return counts;
}

function makeFeature({
  connectome,
  dnSlot,
  dnCount,
  seed,
  side,
  sensory,
}) {
  const brain = new ConnectomeBrain(
    connectome.weights,
    connectome.meta.params,
    seed,
  );

  for (let step = 0; step < SETTLE_STEPS; step += 1) {
    stimulateFromDrive(
      brain,
      connectome.inputGroups,
      groundDrive(),
    );
    brain.step();
  }

  const baseline = countDnSpikes({
    brain,
    inputGroups: connectome.inputGroups,
    dnSlot,
    dnCount,
    steps: BASELINE_STEPS,
    drive: groundDrive(),
  });

  const cue = countDnSpikes({
    brain,
    inputGroups: connectome.inputGroups,
    dnSlot,
    dnCount,
    steps: CUE_STEPS,
    drive: sensory ? targetDrive(side) : groundDrive(),
  });

  const feature = new Float64Array(dnCount + 1);
  let normSquared = 0;

  for (let i = 0; i < dnCount; i += 1) {
    const delta = (cue[i] - baseline[i]) / 50;
    feature[i] = delta;
    normSquared += delta * delta;
  }

  const norm = Math.sqrt(normSquared);

  if (norm > 1e-9) {
    for (let i = 0; i < dnCount; i += 1) {
      feature[i] /= norm;
    }
  }

  // Bias is part of the readout only. It does not contain game state.
  feature[dnCount] = 1;

  return {
    feature,
    norm,
  };
}

function dot(weights, feature) {
  let total = 0;

  for (let i = 0; i < weights.length; i += 1) {
    total += weights[i] * feature[i];
  }

  return total;
}

function softmax2(a, b) {
  const max = Math.max(a, b);
  const ea = Math.exp(clamp(a - max, -40, 40));
  const eb = Math.exp(clamp(b - max, -40, 40));
  const sum = ea + eb;

  return [ea / sum, eb / sum];
}

class MotorReadout {
  constructor({
    featureCount,
    learningRate,
    baselineRate,
    l2,
  }) {
    this.weights = [
      new Float64Array(featureCount),
      new Float64Array(featureCount),
    ];
    this.learningRate = learningRate;
    this.baselineRate = baselineRate;
    this.l2 = l2;
    this.rewardBaseline = 0.5;
    this.updates = 0;
  }

  probabilities(feature) {
    return softmax2(
      dot(this.weights[0], feature),
      dot(this.weights[1], feature),
    );
  }

  sample(feature, random) {
    const probabilities = this.probabilities(feature);
    const action = random() < probabilities[0] ? 0 : 1;

    return {
      action,
      probabilities,
    };
  }

  greedy(feature) {
    const probabilities = this.probabilities(feature);
    const action =
      probabilities[0] >= probabilities[1] ? 0 : 1;

    return {
      action,
      probabilities,
    };
  }

  update(feature, action, reward, probabilities) {
    const advantage = reward - this.rewardBaseline;
    const decay = 1 - this.l2;

    for (let which = 0; which < 2; which += 1) {
      const chosen = which === action ? 1 : 0;
      const coefficient =
        this.learningRate *
        advantage *
        (chosen - probabilities[which]);

      for (let i = 0; i < feature.length; i += 1) {
        this.weights[which][i] =
          this.weights[which][i] * decay +
          coefficient * feature[i];
      }
    }

    this.rewardBaseline +=
      this.baselineRate *
      (reward - this.rewardBaseline);
    this.updates += 1;
  }

  serialize() {
    return {
      rewardBaseline: this.rewardBaseline,
      updates: this.updates,
      weights: this.weights.map((values) =>
        Array.from(values),
      ),
    };
  }
}

function tutorialOutcome(actionIndex, targetSide) {
  // The readout never sees targetSide. This is environment physics:
  // one LEFT/RIGHT move reaches the reward object on that side.
  const playerStartX = 0;
  const targetX = targetSide === "L" ? -1 : 1;
  const move = actionIndex === 0 ? -1 : 1;
  const playerAfterX = playerStartX + move;
  const reached = Math.abs(playerAfterX - targetX) < 0.01;

  return {
    reward: reached ? 1 : 0,
    reached,
  };
}

function pairedSchedule(totalEpisodes, baseSeed) {
  const pairs = totalEpisodes / 2;
  const schedule = [];

  for (let pair = 0; pair < pairs; pair += 1) {
    const brainSeed = baseSeed + pair;
    const order =
      pair % 2 === 0
        ? ["L", "R"]
        : ["R", "L"];

    for (const side of order) {
      schedule.push({
        pair: pair + 1,
        brainSeed,
        side,
      });
    }
  }

  return schedule;
}

function accuracy(rows) {
  if (!rows.length) {
    return 0;
  }

  return mean(rows.map((row) => row.reward));
}

function runEvaluation({
  connectome,
  dnSlot,
  dnCount,
  readout,
  totalEpisodes,
  baseSeed,
  sensory,
}) {
  const rows = [];

  for (const episode of pairedSchedule(totalEpisodes, baseSeed)) {
    const { feature, norm } = makeFeature({
      connectome,
      dnSlot,
      dnCount,
      seed: episode.brainSeed,
      side: episode.side,
      sensory,
    });

    const decision = readout.greedy(feature);
    const outcome = tutorialOutcome(
      decision.action,
      episode.side,
    );

    rows.push({
      ...episode,
      sensory: sensory ? "ON" : "OFF",
      action: ACTIONS[decision.action],
      targetSide: episode.side,
      reward: outcome.reward,
      featureNorm: norm,
      probabilityLeft: decision.probabilities[0],
      probabilityRight: decision.probabilities[1],
    });
  }

  return {
    accuracy: accuracy(rows),
    rows,
  };
}

async function trainOne({
  connectome,
  dnSlot,
  dnCount,
  runIndex,
  options,
}) {
  const runSeed =
    options.seed + runIndex * 10000;
  const policyRandom = mulberry32(
    runSeed ^ 0x5a17c9e3,
  );

  const readout = new MotorReadout({
    featureCount: dnCount + 1,
    learningRate: options.learningRate,
    baselineRate: options.baselineRate,
    l2: options.l2,
  });

  const trainRows = [];
  const schedule = pairedSchedule(
    options.trainEpisodes,
    runSeed + 1000,
  );

  for (let index = 0; index < schedule.length; index += 1) {
    const episode = schedule[index];

    const { feature, norm } = makeFeature({
      connectome,
      dnSlot,
      dnCount,
      seed: episode.brainSeed,
      side: episode.side,
      sensory: true,
    });

    const decision = readout.sample(
      feature,
      policyRandom,
    );
    const outcome = tutorialOutcome(
      decision.action,
      episode.side,
    );

    readout.update(
      feature,
      decision.action,
      outcome.reward,
      decision.probabilities,
    );

    trainRows.push({
      episode: index + 1,
      pair: episode.pair,
      brainSeed: episode.brainSeed,
      targetSide: episode.side,
      action: ACTIONS[decision.action],
      reward: outcome.reward,
      featureNorm: norm,
      probabilityLeft: decision.probabilities[0],
      probabilityRight: decision.probabilities[1],
      rewardBaseline: readout.rewardBaseline,
    });

    if ((index + 1) % 20 === 0) {
      const recent = trainRows.slice(-20);
      console.log(
        "[train] run=" +
          (runIndex + 1) +
          " episode=" +
          (index + 1) +
          "/" +
          schedule.length +
          " recent=" +
          (accuracy(recent) * 100).toFixed(1) +
          "%",
      );
      await new Promise((resolve) =>
        setImmediate(resolve),
      );
    }
  }

  const window = Math.min(40, trainRows.length / 2);
  const firstAccuracy = accuracy(
    trainRows.slice(0, window),
  );
  const lastAccuracy = accuracy(
    trainRows.slice(-window),
  );

  const evalOn = runEvaluation({
    connectome,
    dnSlot,
    dnCount,
    readout,
    totalEpisodes: options.evalEpisodes,
    baseSeed: runSeed + 20000,
    sensory: true,
  });

  const evalOff = runEvaluation({
    connectome,
    dnSlot,
    dnCount,
    readout,
    totalEpisodes: options.evalEpisodes,
    baseSeed: runSeed + 20000,
    sensory: false,
  });

  return {
    run: runIndex + 1,
    runSeed,
    train: {
      episodes: trainRows.length,
      firstWindow: window,
      firstAccuracy,
      lastAccuracy,
      overallAccuracy: accuracy(trainRows),
      rows: trainRows,
    },
    evaluation: {
      visualOnAccuracy: evalOn.accuracy,
      visualOffAccuracy: evalOff.accuracy,
      visualContribution:
        evalOn.accuracy - evalOff.accuracy,
      visualOnRows: evalOn.rows,
      visualOffRows: evalOff.rows,
    },
    policy: readout.serialize(),
  };
}

function summarize(runs) {
  const meanOn = mean(
    runs.map((run) =>
      run.evaluation.visualOnAccuracy,
    ),
  );
  const meanOff = mean(
    runs.map((run) =>
      run.evaluation.visualOffAccuracy,
    ),
  );
  const meanFirst = mean(
    runs.map((run) =>
      run.train.firstAccuracy,
    ),
  );
  const meanLast = mean(
    runs.map((run) =>
      run.train.lastAccuracy,
    ),
  );

  const gate =
    meanOn >= 0.70 &&
    meanOn - meanOff >= 0.15 &&
    runs.every(
      (run) =>
        run.evaluation.visualOnAccuracy >= 0.65,
    );

  return {
    meanTrainFirstAccuracy: meanFirst,
    meanTrainLastAccuracy: meanLast,
    meanVisualOnAccuracy: meanOn,
    meanVisualOffAccuracy: meanOff,
    meanVisualContribution: meanOn - meanOff,
    allRunsVisualOnAtLeast65: runs.every(
      (run) =>
        run.evaluation.visualOnAccuracy >= 0.65,
    ),
    gate,
  };
}

function percent(value) {
  return (value * 100).toFixed(1) + "%";
}

function summaryMarkdown(meta, runs, summary) {
  const lines = [
    "# MapleFly Experiment v7 — tutorial left/right motor readout",
    "",
    "- brain: " + meta.brainRepository + " @ " + meta.brainCommit,
    "- descending-neuron features: " + meta.descendingNeurons,
    "- training: " + meta.trainEpisodes + " episodes / run",
    "- evaluation: " + meta.evalEpisodes + " balanced episodes / condition / run",
    "- policy input: DN cue-minus-baseline activity only",
    "- policy feedback: reward object reached = 1, missed = 0",
    "",
    "| run | train first | train last | eval visual ON | eval visual OFF | ON-OFF |",
    "| ---: | ---: | ---: | ---: | ---: | ---: |",
  ];

  for (const run of runs) {
    lines.push(
      "| " +
        run.run +
        " | " +
        percent(run.train.firstAccuracy) +
        " | " +
        percent(run.train.lastAccuracy) +
        " | " +
        percent(run.evaluation.visualOnAccuracy) +
        " | " +
        percent(run.evaluation.visualOffAccuracy) +
        " | " +
        percent(run.evaluation.visualContribution) +
        " |",
    );
  }

  lines.push(
    "",
    "**mean visual ON:** " +
      percent(summary.meanVisualOnAccuracy),
    "",
    "**mean visual OFF:** " +
      percent(summary.meanVisualOffAccuracy),
    "",
    "**mean ON-OFF:** " +
      percent(summary.meanVisualContribution),
    "",
    "**tutorial gate:** " +
      (summary.gate ? "PASS" : "FAIL"),
    "",
    "> LEFT/RIGHT 정답은 policy input으로 들어가지 않는다. policy는 full connectome의 descending-neuron activity만 보고 버튼을 고른다. 환경은 선택한 이동이 reward object에 닿았는지만 반환한다.",
    "",
  );

  return lines.join("\n");
}

async function main() {
  const options = parseArgs(
    process.argv.slice(2),
  );
  const outDir = resolve(options.out);
  const cacheDir = resolve(options.cache);

  await mkdir(outDir, { recursive: true });

  console.log(
    "MapleFly v7 tutorial · runs=" +
      options.runs +
      " train=" +
      options.trainEpisodes +
      " eval=" +
      options.evalEpisodes,
  );

  const connectome = await loadConnectome({
    cacheDir,
    onProgress(message) {
      console.log("[connectome] " + message);
    },
  });

  const dn = cells(
    connectome.meta,
    [
      "descending_neuron",
      "descending_neuron_tbc",
    ],
  );

  if (!dn.length) {
    throw new Error("descending neurons not found");
  }

  const dnSlot = makeSlotMap(
    connectome.meta.n,
    dn,
  );

  console.log(
    "[features] descending neurons=" +
      dn.length,
  );

  const startedAt = new Date().toISOString();
  const runs = [];

  for (let runIndex = 0; runIndex < options.runs; runIndex += 1) {
    console.log(
      "\n[run] " +
        (runIndex + 1) +
        "/" +
        options.runs,
    );

    runs.push(
      await trainOne({
        connectome,
        dnSlot,
        dnCount: dn.length,
        runIndex,
        options,
      }),
    );
  }

  const summary = summarize(runs);

  const meta = {
    schema:
      "maplefly.experiment-v7.motor-readout.1",
    startedAt,
    finishedAt: new Date().toISOString(),
    brainRepository: SOURCE.repository,
    brainCommit: SOURCE.commit,
    neurons: SOURCE.neurons,
    synapses: SOURCE.synapses,
    descendingNeurons: dn.length,
    runs: options.runs,
    trainEpisodes: options.trainEpisodes,
    evalEpisodes: options.evalEpisodes,
    baseSeed: options.seed,
    learningRate: options.learningRate,
    baselineRate: options.baselineRate,
    l2: options.l2,
    targetDistancePx: TARGET_DISTANCE_PX,
    settleSeconds:
      SETTLE_STEPS * STEP_SECONDS,
    baselineSeconds:
      BASELINE_STEPS * STEP_SECONDS,
    cueSeconds:
      CUE_STEPS * STEP_SECONDS,
    policy:
      "two-action softmax policy-gradient readout",
    policyInput:
      "L2-normalized DN cue-minus-baseline firing rates + bias",
    reward:
      "1 only when the chosen movement reaches the reward object; otherwise 0",
    leakageGuard:
      "target side and target coordinates are never policy features",
    gate:
      "mean visual ON >=70%; mean ON-OFF >=15pp; every run visual ON >=65%",
  };

  await writeFile(
    resolve(outDir, "experiment_v7.json"),
    JSON.stringify(
      {
        meta,
        summary,
        runs,
      },
      null,
      2,
    ),
  );

  await writeFile(
    resolve(outDir, "summary.md"),
    summaryMarkdown(meta, runs, summary),
  );

  console.log("\n=== v7 tutorial summary ===");

  for (const run of runs) {
    console.log(
      "run " +
        run.run +
        " · train first/last=" +
        percent(run.train.firstAccuracy) +
        "/" +
        percent(run.train.lastAccuracy) +
        " · eval ON=" +
        percent(run.evaluation.visualOnAccuracy) +
        " OFF=" +
        percent(run.evaluation.visualOffAccuracy) +
        " delta=" +
        percent(run.evaluation.visualContribution),
    );
  }

  console.log(
    "mean ON=" +
      percent(summary.meanVisualOnAccuracy) +
      " OFF=" +
      percent(summary.meanVisualOffAccuracy) +
      " delta=" +
      percent(summary.meanVisualContribution) +
      " tutorial-gate=" +
      (summary.gate ? "PASS" : "FAIL"),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
