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

const PLAYER_WIDTH = 34;
const PLAYER_X = 500 - PLAYER_WIDTH / 2;
const PLAYER_Y = 530 - 46;
const PLAYER_HEIGHT = 46;
const TARGET_BASELINE_Y = 530;
const ATTACK_RANGE = 76;

const ACTIONS = Object.freeze(["ATTACK", "WAIT"]);
const TRAIN_DISTANCES = Object.freeze([45, 75, 105, 135, 175, 230]);
const EVAL_DISTANCES = Object.freeze([55, 85, 110, 130, 155, 205]);

function parseArgs(argv) {
  const options = {
    runs: 2,
    trainEpisodes: 144,
    evalEpisodes: 72,
    seed: 64,
    learningRate: 0.22,
    l2: 0.0003,
    whiffPenalty: -1.0,
    out: "results/experiment-v9",
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

  if (options.trainEpisodes % 12 !== 0) {
    throw new Error("--train must be divisible by 12");
  }

  if (options.evalEpisodes % 12 !== 0) {
    throw new Error("--eval must be divisible by 12");
  }

  if (!Number.isInteger(options.seed)) {
    throw new Error("--seed must be an integer");
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
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;
}

function makeSlotMap(n, indices) {
  const map = new Int32Array(n);
  map.fill(-1);

  for (let slot = 0; slot < indices.length; slot += 1) {
    map[indices[slot]] = slot;
  }

  return map;
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
    if (!amount) {
      continue;
    }

    const indices = inputGroups.get(name);
    if (indices?.length) {
      brain.stimulate(indices, amount);
    }
  }
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
    stimulate(brain, inputGroups, drive);
    brain.step();

    for (let fired = 0; fired < brain.firedCount; fired += 1) {
      const slot = dnSlot[brain.fired[fired]];
      if (slot >= 0) {
        counts[slot] += 1;
      }
    }
  }

  const seconds = steps * STEP_SECONDS;

  for (let index = 0; index < counts.length; index += 1) {
    counts[index] /= seconds;
  }

  return counts;
}

function makeFeature({
  connectome,
  dnSlot,
  dnCount,
  seed,
  side,
  distance,
  sensory,
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
    drive: sensory
      ? targetDrive(side, distance)
      : groundDrive(),
  });

  const feature = new Float64Array(dnCount + 1);
  let normSquared = 0;

  for (let index = 0; index < dnCount; index += 1) {
    const delta =
      (cue[index] - baseline[index]) / 50;
    feature[index] = delta;
    normSquared += delta * delta;
  }

  const norm = Math.sqrt(normSquared);

  // v9 ATTACK timing must retain neural response magnitude.
  // L2-normalizing the DN vector is appropriate for a direction-only
  // skill like LEFT/RIGHT, but it erases a major candidate signal for
  // target proximity. Values are already scaled by the 50 Hz ceiling.
  feature[dnCount] = 1;

  return { feature, norm };
}

function rectanglesOverlap(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function attackWouldHit(side, distance) {
  const playerCenterX =
    PLAYER_X + PLAYER_WIDTH / 2;
  const facing = side === "L" ? -1 : 1;
  const targetX =
    playerCenterX +
    (side === "L" ? -distance : distance);

  const attackX =
    facing > 0
      ? PLAYER_X + PLAYER_WIDTH - 2
      : PLAYER_X - ATTACK_RANGE + 2;

  const attackBox = {
    x: attackX,
    y: PLAYER_Y + 4,
    width: ATTACK_RANGE,
    height: PLAYER_HEIGHT - 8,
  };

  const mushroomBox = {
    x: targetX - 28,
    y: TARGET_BASELINE_Y - 62,
    width: 56,
    height: 62,
  };

  return rectanglesOverlap(
    attackBox,
    mushroomBox,
  );
}

function dot(weights, feature) {
  let total = 0;

  for (let index = 0; index < weights.length; index += 1) {
    total += weights[index] * feature[index];
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

class AttackReadout {
  constructor({
    featureCount,
    learningRate,
    l2,
  }) {
    this.weights = [
      new Float64Array(featureCount),
      new Float64Array(featureCount),
    ];
    this.learningRate = learningRate;
    this.l2 = l2;
    this.updates = 0;
  }

  probabilities(feature) {
    return softmax2(
      dot(this.weights[0], feature),
      dot(this.weights[1], feature),
    );
  }

  sample(feature, random) {
    const probabilities =
      this.probabilities(feature);
    const action =
      random() < probabilities[0] ? 0 : 1;

    return {
      action,
      probabilities,
    };
  }

  greedy(feature) {
    const probabilities =
      this.probabilities(feature);
    const action =
      probabilities[0] >= probabilities[1]
        ? 0
        : 1;

    return {
      action,
      probabilities,
    };
  }

  update(feature, action, reward, probabilities) {
    const decay = 1 - this.l2;

    for (let which = 0; which < 2; which += 1) {
      const chosen = which === action ? 1 : 0;
      const coefficient =
        this.learningRate *
        reward *
        (chosen - probabilities[which]);

      for (let index = 0; index < feature.length; index += 1) {
        this.weights[which][index] =
          this.weights[which][index] * decay +
          coefficient * feature[index];
      }
    }

    this.updates += 1;
  }

  serialize() {
    return {
      updates: this.updates,
      weights: this.weights.map((values) =>
        Array.from(values),
      ),
    };
  }
}

function outcome(actionIndex, side, distance, whiffPenalty) {
  const hit = attackWouldHit(side, distance);

  if (actionIndex === 0) {
    return {
      hit,
      reward: hit ? 1 : whiffPenalty,
      opportunityCorrect: hit,
    };
  }

  return {
    hit: false,
    reward: 0,
    opportunityCorrect: !hit,
  };
}

function schedule(totalEpisodes, baseSeed, distances) {
  const blockSize = distances.length * 2;
  if (totalEpisodes % blockSize !== 0) {
    throw new Error(
      "episode count must be divisible by " +
      blockSize,
    );
  }

  const blocks = totalEpisodes / blockSize;
  const rows = [];

  for (let block = 0; block < blocks; block += 1) {
    const seed = baseSeed + block;

    distances.forEach((distance, distanceIndex) => {
      const order =
        (block + distanceIndex) % 2 === 0
          ? ["L", "R"]
          : ["R", "L"];

      for (const side of order) {
        rows.push({
          block: block + 1,
          brainSeed: seed,
          side,
          distance,
          hittable:
            attackWouldHit(side, distance),
        });
      }
    });
  }

  return rows;
}

function summarizeRows(rows) {
  const near = rows.filter((row) => row.hittable);
  const far = rows.filter((row) => !row.hittable);
  const attacks = rows.filter(
    (row) => row.action === "ATTACK",
  );
  const hits = attacks.filter((row) => row.hit);

  return {
    opportunityAccuracy: mean(
      rows.map((row) =>
        row.opportunityCorrect ? 1 : 0,
      ),
    ),
    hittableAttackRate: mean(
      near.map((row) =>
        row.action === "ATTACK" ? 1 : 0,
      ),
    ),
    unhittableAttackRate: mean(
      far.map((row) =>
        row.action === "ATTACK" ? 1 : 0,
      ),
    ),
    attackPrecision:
      attacks.length > 0
        ? hits.length / attacks.length
        : 0,
    attackRate:
      rows.length > 0
        ? attacks.length / rows.length
        : 0,
    meanReward: mean(
      rows.map((row) => row.reward),
    ),
  };
}

function evaluate({
  connectome,
  dnSlot,
  dnCount,
  readout,
  totalEpisodes,
  baseSeed,
  sensory,
  whiffPenalty,
}) {
  const rows = [];

  for (const episode of schedule(
    totalEpisodes,
    baseSeed,
    EVAL_DISTANCES,
  )) {
    const { feature, norm } = makeFeature({
      connectome,
      dnSlot,
      dnCount,
      seed: episode.brainSeed,
      side: episode.side,
      distance: episode.distance,
      sensory,
    });

    const decision = readout.greedy(feature);
    const result = outcome(
      decision.action,
      episode.side,
      episode.distance,
      whiffPenalty,
    );

    rows.push({
      ...episode,
      sensory: sensory ? "ON" : "OFF",
      action: ACTIONS[decision.action],
      ...result,
      featureNorm: norm,
      probabilityAttack:
        decision.probabilities[0],
      probabilityWait:
        decision.probabilities[1],
    });
  }

  return {
    ...summarizeRows(rows),
    rows,
  };
}

function topSparsePolicy(policy, dnCount, count = 64) {
  const attack = policy.weights[0];
  const wait = policy.weights[1];
  const differences = [];

  for (let index = 0; index < dnCount; index += 1) {
    differences.push({
      index,
      weight:
        attack[index] - wait[index],
    });
  }

  differences.sort(
    (a, b) =>
      Math.abs(b.weight) - Math.abs(a.weight),
  );

  const selected = differences.slice(0, count);
  const bias =
    attack[dnCount] - wait[dnCount];

  const totalL2 = Math.sqrt(
    differences.reduce(
      (sum, item) =>
        sum + item.weight * item.weight,
      0,
    ),
  );
  const selectedL2 = Math.sqrt(
    selected.reduce(
      (sum, item) =>
        sum + item.weight * item.weight,
      0,
    ),
  );

  return {
    featureIndices: selected.map(
      (item) => item.index,
    ),
    attackWeights: selected.map(
      (item) => item.weight,
    ),
    attackBias: bias,
    l2MassFraction:
      totalL2 > 0
        ? selectedL2 / totalL2
        : 0,
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
  const random = mulberry32(
    runSeed ^ 0x91a2b3c4,
  );
  const readout = new AttackReadout({
    featureCount: dnCount + 1,
    learningRate: options.learningRate,
    l2: options.l2,
  });

  const trainRows = [];
  const episodes = schedule(
    options.trainEpisodes,
    runSeed + 1000,
    TRAIN_DISTANCES,
  );

  for (let index = 0; index < episodes.length; index += 1) {
    const episode = episodes[index];
    const { feature, norm } = makeFeature({
      connectome,
      dnSlot,
      dnCount,
      seed: episode.brainSeed,
      side: episode.side,
      distance: episode.distance,
      sensory: true,
    });

    const decision = readout.sample(
      feature,
      random,
    );
    const result = outcome(
      decision.action,
      episode.side,
      episode.distance,
      options.whiffPenalty,
    );

    readout.update(
      feature,
      decision.action,
      result.reward,
      decision.probabilities,
    );

    trainRows.push({
      episode: index + 1,
      ...episode,
      action: ACTIONS[decision.action],
      ...result,
      featureNorm: norm,
      probabilityAttack:
        decision.probabilities[0],
      probabilityWait:
        decision.probabilities[1],
    });

    if ((index + 1) % 24 === 0) {
      const recent = summarizeRows(
        trainRows.slice(-24),
      );
      console.log(
        "[train] run=" +
        (runIndex + 1) +
        " episode=" +
        (index + 1) +
        "/" +
        episodes.length +
        " correct=" +
        (recent.opportunityAccuracy * 100).toFixed(1) +
        "% precision=" +
        (recent.attackPrecision * 100).toFixed(1) +
        "%",
      );

      await new Promise((resolve) =>
        setImmediate(resolve),
      );
    }
  }

  const evalOn = evaluate({
    connectome,
    dnSlot,
    dnCount,
    readout,
    totalEpisodes: options.evalEpisodes,
    baseSeed: runSeed + 20000,
    sensory: true,
    whiffPenalty: options.whiffPenalty,
  });

  const evalOff = evaluate({
    connectome,
    dnSlot,
    dnCount,
    readout,
    totalEpisodes: options.evalEpisodes,
    baseSeed: runSeed + 20000,
    sensory: false,
    whiffPenalty: options.whiffPenalty,
  });

  return {
    run: runIndex + 1,
    runSeed,
    train: {
      ...summarizeRows(trainRows),
      episodes: trainRows.length,
      first24: summarizeRows(
        trainRows.slice(0, 24),
      ),
      last24: summarizeRows(
        trainRows.slice(-24),
      ),
      rows: trainRows,
    },
    evaluation: {
      visualOn: evalOn,
      visualOff: evalOff,
      visualContribution:
        evalOn.opportunityAccuracy -
        evalOff.opportunityAccuracy,
    },
    policy: readout.serialize(),
  };
}

function summarizeRuns(runs) {
  const meanOn = mean(
    runs.map(
      (run) =>
        run.evaluation.visualOn
          .opportunityAccuracy,
    ),
  );
  const meanOff = mean(
    runs.map(
      (run) =>
        run.evaluation.visualOff
          .opportunityAccuracy,
    ),
  );
  const meanNearAttack = mean(
    runs.map(
      (run) =>
        run.evaluation.visualOn
          .hittableAttackRate,
    ),
  );
  const meanFarAttack = mean(
    runs.map(
      (run) =>
        run.evaluation.visualOn
          .unhittableAttackRate,
    ),
  );
  const meanPrecision = mean(
    runs.map(
      (run) =>
        run.evaluation.visualOn
          .attackPrecision,
    ),
  );

  const gate =
    meanOn >= 0.75 &&
    meanOn - meanOff >= 0.15 &&
    meanNearAttack >= 0.70 &&
    meanFarAttack <= 0.30 &&
    meanPrecision >= 0.70 &&
    runs.every(
      (run) =>
        run.evaluation.visualOn
          .opportunityAccuracy >= 0.70,
    );

  return {
    meanVisualOnAccuracy: meanOn,
    meanVisualOffAccuracy: meanOff,
    visualContribution: meanOn - meanOff,
    meanHittableAttackRate: meanNearAttack,
    meanUnhittableAttackRate: meanFarAttack,
    meanAttackPrecision: meanPrecision,
    gate,
  };
}

function percent(value) {
  return (value * 100).toFixed(1) + "%";
}

async function main() {
  const options = parseArgs(
    process.argv.slice(2),
  );
  const outDir = resolve(options.out);
  await mkdir(outDir, { recursive: true });

  console.log(
    "MapleFly v9 ATTACK timing · runs=" +
    options.runs +
    " train=" +
    options.trainEpisodes +
    " eval=" +
    options.evalEpisodes,
  );

  const connectome = await loadConnectome({
    cacheDir: resolve(options.cache),
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

  const dnSlot = makeSlotMap(
    connectome.meta.n,
    dn,
  );

  console.log(
    "[features] descending neurons=" +
    dn.length,
  );

  console.log(
    "[physics] training contexts=" +
    TRAIN_DISTANCES.map(
      (distance) =>
        distance +
        ":" +
        (attackWouldHit("R", distance)
          ? "HIT"
          : "MISS"),
    ).join(","),
  );

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

  const summary = summarizeRuns(runs);

  const best = [...runs].sort((a, b) => {
    const acc =
      b.evaluation.visualOn.opportunityAccuracy -
      a.evaluation.visualOn.opportunityAccuracy;

    if (Math.abs(acc) > 1e-12) {
      return acc;
    }

    return (
      b.evaluation.visualOn.attackPrecision -
      a.evaluation.visualOn.attackPrecision
    );
  })[0];

  const deploy = topSparsePolicy(
    best.policy,
    dn.length,
    64,
  );

  const meta = {
    schema:
      "maplefly.experiment-v9.attack-timing.1",
    brainRepository: SOURCE.repository,
    brainCommit: SOURCE.commit,
    neurons: SOURCE.neurons,
    synapses: SOURCE.synapses,
    descendingNeurons: dn.length,
    runs: options.runs,
    trainEpisodes: options.trainEpisodes,
    evalEpisodes: options.evalEpisodes,
    trainingDistances: TRAIN_DISTANCES,
    evaluationDistances: EVAL_DISTANCES,
    reward:
      "ATTACK hit=+1; ATTACK whiff=-1; WAIT=0",
    leakageGuard:
      "policy receives only DN cue-minus-baseline firing-rate deltas scaled by 50Hz + bias; distance/side/hittable are not features",
    gate:
      "ON accuracy>=75%; ON-OFF>=15pp; hittable attack>=70%; unhittable attack<=30%; attack precision>=70%; every run ON>=70%",
  };

  await writeFile(
    resolve(outDir, "experiment_v9.json"),
    JSON.stringify(
      {
        meta,
        summary,
        bestRun: best.run,
        deploy,
        runs,
      },
      null,
      2,
    ),
  );

  console.log("\n=== v9 ATTACK timing summary ===");

  for (const run of runs) {
    const on = run.evaluation.visualOn;
    const off = run.evaluation.visualOff;

    console.log(
      "run " +
      run.run +
      " train first/last=" +
      percent(
        run.train.first24
          .opportunityAccuracy,
      ) +
      "/" +
      percent(
        run.train.last24
          .opportunityAccuracy,
      ) +
      " ON=" +
      percent(on.opportunityAccuracy) +
      " OFF=" +
      percent(off.opportunityAccuracy) +
      " nearAttack=" +
      percent(on.hittableAttackRate) +
      " farAttack=" +
      percent(on.unhittableAttackRate) +
      " precision=" +
      percent(on.attackPrecision),
    );
  }

  console.log(
    "V9-GATE=" +
    (summary.gate ? "PASS" : "FAIL") +
    " ON=" +
    percent(summary.meanVisualOnAccuracy) +
    " OFF=" +
    percent(summary.meanVisualOffAccuracy) +
    " delta=" +
    percent(summary.visualContribution) +
    " nearAttack=" +
    percent(summary.meanHittableAttackRate) +
    " farAttack=" +
    percent(summary.meanUnhittableAttackRate) +
    " precision=" +
    percent(summary.meanAttackPrecision),
  );

  console.log(
    "DEPLOY_STATE_JSON=" +
    JSON.stringify({
      sourceRunIndex: best.run,
      originalFeatureCount: dn.length,
      sparseFeatureCount:
        deploy.featureIndices.length,
      featureIndices: deploy.featureIndices,
      attackWeights: deploy.attackWeights,
      attackBias: deploy.attackBias,
      l2MassFraction:
        deploy.l2MassFraction,
    }),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
