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
const MOVE_WINDOW_STEPS = 26;
const ATTACK_WINDOW_STEPS = 10;
const SETTLE_STEPS = 26;
const BASELINE_STEPS = 26;

const WORLD_WIDTH = 1000;
const PLAYER_WIDTH = 34;
const PLAYER_HEIGHT = 46;
const PLAYER_Y = 530 - PLAYER_HEIGHT;
const TARGET_BASELINE_Y = 530;
const TARGET_WIDTH = 56;
const TARGET_HEIGHT = 62;
const MOVE_SPEED = 280;
const ATTACK_RANGE = 76;

const TRAIN_DISTANCES = Object.freeze([260, 340, 420, 500]);
const EVAL_DISTANCES = Object.freeze([290, 370, 450, 530]);

const ACTIONS = Object.freeze(["ATTACK", "WAIT"]);
const CONDITIONS = Object.freeze([
  "FULL",
  "NEURAL_OFF",
  "TEMPORAL_OFF",
]);

const skillApi = globalThis.MapleFlySkillV7;
const movementSkill = skillApi.BUNDLED_STATE;

function parseArgs(argv) {
  const options = {
    runs: 2,
    trainEpisodes: 48,
    evalEpisodes: 24,
    seed: 64,
    maxSeconds: 4.5,
    learningRate: 0.045,
    l2: 0.00015,
    gamma: 0.985,
    explorationFloor: 0.04,
    out: "results/experiment-v10",
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
    } else if (arg === "--max-seconds") {
      options.maxSeconds = Number(next);
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

  if (options.trainEpisodes % 8 !== 0) {
    throw new Error("--train must be divisible by 8");
  }

  if (options.evalEpisodes % 8 !== 0) {
    throw new Error("--eval must be divisible by 8");
  }

  if (!Number.isFinite(options.maxSeconds) || options.maxSeconds <= 1) {
    throw new Error("--max-seconds must be > 1");
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

class AttackPolicy {
  constructor({
    featureCount,
    learningRate,
    l2,
    gamma,
    explorationFloor,
  }) {
    this.weights = [
      new Float64Array(featureCount),
      new Float64Array(featureCount),
    ];
    this.learningRate = learningRate;
    this.l2 = l2;
    this.gamma = gamma;
    this.explorationFloor = explorationFloor;
    this.rewardBaseline = 0;
    this.updates = 0;
  }

  probabilities(feature) {
    const raw = softmax2(
      dot(this.weights[0], feature),
      dot(this.weights[1], feature),
    );

    const floor = this.explorationFloor;

    return [
      floor + (1 - 2 * floor) * raw[0],
      floor + (1 - 2 * floor) * raw[1],
    ];
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
    const raw = softmax2(
      dot(this.weights[0], feature),
      dot(this.weights[1], feature),
    );

    return {
      action: raw[0] >= raw[1] ? 0 : 1,
      probabilities: raw,
    };
  }

  updateTrajectory(trajectory, terminalReward) {
    const advantage = terminalReward - this.rewardBaseline;
    const decay = 1 - this.l2;

    for (let step = 0; step < trajectory.length; step += 1) {
      const item = trajectory[step];
      const remaining =
        trajectory.length - 1 - step;
      const discounted =
        Math.pow(this.gamma, remaining);
      const signal =
        this.learningRate *
        advantage *
        discounted;

      for (let which = 0; which < 2; which += 1) {
        const chosen =
          which === item.action ? 1 : 0;
        const coefficient =
          signal *
          (chosen - item.probabilities[which]);

        for (
          let index = 0;
          index < item.feature.length;
          index += 1
        ) {
          this.weights[which][index] =
            this.weights[which][index] * decay +
            coefficient * item.feature[index];
        }
      }
    }

    this.rewardBaseline +=
      0.06 * (terminalReward - this.rewardBaseline);
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

class VisualEncoder {
  constructor() {
    this.lastDistance = null;
  }

  reset() {
    this.lastDistance = null;
  }

  encode({
    playerX,
    targetX,
    grounded = true,
    visual = true,
  }) {
    const drive = {
      SNta_L: grounded ? 0.05 : 0,
      SNta_R: grounded ? 0.05 : 0,
    };

    if (!visual) {
      this.lastDistance = null;
      return drive;
    }

    const playerCenter =
      playerX + PLAYER_WIDTH / 2;
    const dx = targetX - playerCenter;
    const side = dx < 0 ? "L" : "R";
    const distance = Math.abs(dx);
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
    if (!amount) {
      continue;
    }

    const indices = inputGroups.get(name);

    if (indices?.length) {
      brain.stimulate(indices, amount);
    }
  }
}

function collectDn(brain, dnSlot, counts) {
  for (let fired = 0; fired < brain.firedCount; fired += 1) {
    const slot = dnSlot[brain.fired[fired]];

    if (slot >= 0) {
      counts[slot] += 1;
    }
  }
}

function attackWouldHit({
  playerX,
  targetX,
  facing,
}) {
  const attackX =
    facing > 0
      ? playerX + PLAYER_WIDTH - 2
      : playerX - ATTACK_RANGE + 2;

  const attackBox = {
    x: attackX,
    y: PLAYER_Y + 4,
    width: ATTACK_RANGE,
    height: PLAYER_HEIGHT - 8,
  };

  const targetBox = {
    x: targetX - TARGET_WIDTH / 2,
    y: TARGET_BASELINE_Y - TARGET_HEIGHT,
    width: TARGET_WIDTH,
    height: TARGET_HEIGHT,
  };

  return (
    attackBox.x < targetBox.x + targetBox.width &&
    attackBox.x + attackBox.width > targetBox.x &&
    attackBox.y < targetBox.y + targetBox.height &&
    attackBox.y + attackBox.height > targetBox.y
  );
}

function schedule(totalEpisodes, baseSeed, distances) {
  const blockSize = distances.length * 2;

  if (totalEpisodes % blockSize !== 0) {
    throw new Error(
      "episodes must be divisible by " + blockSize,
    );
  }

  const blocks = totalEpisodes / blockSize;
  const rows = [];

  for (let block = 0; block < blocks; block += 1) {
    const brainSeed = baseSeed + block;

    distances.forEach((distance, distanceIndex) => {
      const order =
        (block + distanceIndex) % 2 === 0
          ? ["L", "R"]
          : ["R", "L"];

      for (const side of order) {
        rows.push({
          block: block + 1,
          brainSeed,
          side,
          startDistance: distance,
        });
      }
    });
  }

  return rows;
}

function movementChoice(
  currentDnRate,
  baselineDnRate,
) {
  const feature =
    new Float64Array(
      movementSkill.sparseFeatureCount,
    );
  let normSquared = 0;

  for (
    let slot = 0;
    slot < movementSkill.featureIndices.length;
    slot += 1
  ) {
    const dnIndex =
      movementSkill.featureIndices[slot];
    const delta =
      (currentDnRate[dnIndex] -
        baselineDnRate[dnIndex]) /
      50;

    feature[slot] = delta;
    normSquared += delta * delta;
  }

  const norm = Math.sqrt(normSquared);

  if (norm > 1e-9) {
    for (let slot = 0; slot < feature.length; slot += 1) {
      feature[slot] /= norm;
    }
  }

  if (norm <= 1e-9) {
    return "IDLE";
  }

  return skillApi.choose(
    feature,
    movementSkill,
  ).action;
}

function makeAttackFeature({
  current,
  baseline,
  fast,
  slow,
  condition,
}) {
  const count = current.length;
  const feature = new Float64Array(
    count * 3 + 1,
  );

  if (condition === "NEURAL_OFF") {
    feature[feature.length - 1] = 1;
    return feature;
  }

  for (let index = 0; index < count; index += 1) {
    const currentDelta =
      (current[index] - baseline[index]) / 50;

    feature[index] = currentDelta;

    if (condition === "TEMPORAL_OFF") {
      feature[count + index] = 0;
      feature[count * 2 + index] = 0;
      continue;
    }

    feature[count + index] =
      (fast[index] - slow[index]) / 50;
    feature[count * 2 + index] =
      (current[index] - fast[index]) / 50;
  }

  feature[feature.length - 1] = 1;

  return feature;
}

function makeRate(counts, steps) {
  const seconds = steps * STEP_SECONDS;

  return Float64Array.from(
    counts,
    (value) => value / seconds,
  );
}

function summarizeEpisodes(rows) {
  const success = rows.filter(
    (row) => row.outcome === "HIT",
  );
  const whiffs = rows.filter(
    (row) => row.outcome === "WHIFF",
  );
  const timeouts = rows.filter(
    (row) => row.outcome === "TIMEOUT",
  );

  return {
    hitRate:
      rows.length > 0
        ? success.length / rows.length
        : 0,
    whiffRate:
      rows.length > 0
        ? whiffs.length / rows.length
        : 0,
    timeoutRate:
      rows.length > 0
        ? timeouts.length / rows.length
        : 0,
    meanHitTime:
      success.length > 0
        ? mean(
            success.map((row) => row.terminalTime),
          )
        : null,
    meanHitDistance:
      success.length > 0
        ? mean(
            success.map(
              (row) => row.terminalDistance,
            ),
          )
        : null,
    meanTerminalReward: mean(
      rows.map((row) => row.terminalReward),
    ),
    meanDecisionCount: mean(
      rows.map((row) => row.decisions),
    ),
  };
}

async function runEpisode({
  connectome,
  dnSlot,
  dnCount,
  episode,
  policy,
  random,
  options,
  training,
  condition,
}) {
  const brain = new ConnectomeBrain(
    connectome.weights,
    connectome.meta.params,
    episode.brainSeed,
  );
  const encoder = new VisualEncoder();

  const playerCenterStart = WORLD_WIDTH / 2;
  let playerX =
    playerCenterStart - PLAYER_WIDTH / 2;
  const targetX =
    playerCenterStart +
    (episode.side === "L"
      ? -episode.startDistance
      : episode.startDistance);
  let facing =
    episode.side === "L" ? -1 : 1;
  let moveAction = "IDLE";

  for (let step = 0; step < SETTLE_STEPS; step += 1) {
    stimulate(
      brain,
      connectome.inputGroups,
      encoder.encode({
        playerX,
        targetX,
        visual: false,
      }),
    );
    brain.step();
  }

  const baselineCounts =
    new Float64Array(dnCount);

  for (let step = 0; step < BASELINE_STEPS; step += 1) {
    stimulate(
      brain,
      connectome.inputGroups,
      encoder.encode({
        playerX,
        targetX,
        visual: false,
      }),
    );
    brain.step();
    collectDn(
      brain,
      dnSlot,
      baselineCounts,
    );
  }

  const baselineDnRate = makeRate(
    baselineCounts,
    BASELINE_STEPS,
  );

  const fast = Float64Array.from(
    baselineDnRate,
  );
  const slow = Float64Array.from(
    baselineDnRate,
  );

  encoder.reset();

  let attackCounts =
    new Float64Array(dnCount);
  let moveCounts =
    new Float64Array(dnCount);
  let attackSteps = 0;
  let moveSteps = 0;
  const trajectory = [];
  const maxSteps = Math.round(
    options.maxSeconds / STEP_SECONDS,
  );

  let terminalReward = -1;
  let outcome = "TIMEOUT";
  let terminalTime = options.maxSeconds;
  let terminalDistance = Math.abs(
    targetX -
      (playerX + PLAYER_WIDTH / 2),
  );

  for (let step = 0; step < maxSteps; step += 1) {
    const drive = encoder.encode({
      playerX,
      targetX,
      visual: true,
    });

    stimulate(
      brain,
      connectome.inputGroups,
      drive,
    );
    brain.step();

    collectDn(
      brain,
      dnSlot,
      attackCounts,
    );
    collectDn(
      brain,
      dnSlot,
      moveCounts,
    );

    const direction =
      moveAction === "LEFT"
        ? -1
        : moveAction === "RIGHT"
          ? 1
          : 0;

    if (direction !== 0) {
      facing = direction;
    }

    playerX = clamp(
      playerX +
        direction * MOVE_SPEED * STEP_SECONDS,
      0,
      WORLD_WIDTH - PLAYER_WIDTH,
    );

    attackSteps += 1;
    moveSteps += 1;

    if (moveSteps >= MOVE_WINDOW_STEPS) {
      const currentMoveRate = makeRate(
        moveCounts,
        moveSteps,
      );

      moveAction = movementChoice(
        currentMoveRate,
        baselineDnRate,
      );

      moveCounts =
        new Float64Array(dnCount);
      moveSteps = 0;
    }

    if (attackSteps < ATTACK_WINDOW_STEPS) {
      continue;
    }

    const current = makeRate(
      attackCounts,
      attackSteps,
    );

    for (let index = 0; index < dnCount; index += 1) {
      fast[index] =
        0.58 * current[index] +
        0.42 * fast[index];
      slow[index] =
        0.16 * current[index] +
        0.84 * slow[index];
    }

    const feature = makeAttackFeature({
      current,
      baseline: baselineDnRate,
      fast,
      slow,
      condition,
    });

    const decision = training
      ? policy.sample(feature, random)
      : policy.greedy(feature);

    trajectory.push({
      feature,
      action: decision.action,
      probabilities:
        decision.probabilities,
    });

    attackCounts =
      new Float64Array(dnCount);
    attackSteps = 0;

    if (decision.action === 0) {
      const hit = attackWouldHit({
        playerX,
        targetX,
        facing,
      });

      terminalReward = hit ? 1 : -1;
      outcome = hit ? "HIT" : "WHIFF";
      terminalTime =
        (step + 1) * STEP_SECONDS;
      terminalDistance = Math.abs(
        targetX -
          (playerX + PLAYER_WIDTH / 2),
      );
      break;
    }
  }

  if (training) {
    policy.updateTrajectory(
      trajectory,
      terminalReward,
    );
  }

  return {
    side: episode.side,
    startDistance: episode.startDistance,
    brainSeed: episode.brainSeed,
    condition,
    outcome,
    terminalReward,
    terminalTime,
    terminalDistance,
    decisions: trajectory.length,
    finalMoveAction: moveAction,
  };
}

async function runSet({
  connectome,
  dnSlot,
  dnCount,
  policy,
  scheduleRows,
  options,
  training,
  condition,
  random,
}) {
  const rows = [];

  for (
    let index = 0;
    index < scheduleRows.length;
    index += 1
  ) {
    rows.push(
      await runEpisode({
        connectome,
        dnSlot,
        dnCount,
        episode: scheduleRows[index],
        policy,
        random,
        options,
        training,
        condition,
      }),
    );

    if ((index + 1) % 8 === 0) {
      const recent = summarizeEpisodes(
        rows.slice(-8),
      );

      console.log(
        "[" +
        (training ? "train" : condition) +
        "] " +
        (index + 1) +
        "/" +
        scheduleRows.length +
        " hit=" +
        (recent.hitRate * 100).toFixed(1) +
        "% whiff=" +
        (recent.whiffRate * 100).toFixed(1) +
        "% timeout=" +
        (recent.timeoutRate * 100).toFixed(1) +
        "%",
      );

      await new Promise((resolve) =>
        setImmediate(resolve),
      );
    }
  }

  return {
    ...summarizeEpisodes(rows),
    rows,
  };
}

function summarizeRuns(runs) {
  const meanFullHit = mean(
    runs.map(
      (run) =>
        run.evaluation.FULL.hitRate,
    ),
  );
  const meanOffHit = mean(
    runs.map(
      (run) =>
        run.evaluation.NEURAL_OFF.hitRate,
    ),
  );
  const meanTemporalOffHit = mean(
    runs.map(
      (run) =>
        run.evaluation.TEMPORAL_OFF.hitRate,
    ),
  );
  const meanWhiff = mean(
    runs.map(
      (run) =>
        run.evaluation.FULL.whiffRate,
    ),
  );
  const meanTimeout = mean(
    runs.map(
      (run) =>
        run.evaluation.FULL.timeoutRate,
    ),
  );

  const gate =
    meanFullHit >= 0.70 &&
    meanFullHit - meanOffHit >= 0.25 &&
    meanWhiff <= 0.30 &&
    meanTimeout <= 0.25 &&
    runs.every(
      (run) =>
        run.evaluation.FULL.hitRate >= 0.60,
    );

  return {
    meanFullHitRate: meanFullHit,
    meanNeuralOffHitRate: meanOffHit,
    neuralContribution:
      meanFullHit - meanOffHit,
    meanTemporalOffHitRate:
      meanTemporalOffHit,
    temporalContribution:
      meanFullHit - meanTemporalOffHit,
    meanFullWhiffRate: meanWhiff,
    meanFullTimeoutRate: meanTimeout,
    gate,
  };
}

function topSparsePolicy(policy, dnCount, count = 96) {
  const attack = policy.weights[0];
  const wait = policy.weights[1];
  const items = [];

  for (let dn = 0; dn < dnCount; dn += 1) {
    let energy = 0;
    const weights = [];

    for (let channel = 0; channel < 3; channel += 1) {
      const index =
        channel * dnCount + dn;
      const weight =
        attack[index] - wait[index];
      weights.push(weight);
      energy += weight * weight;
    }

    items.push({
      dn,
      energy,
      weights,
    });
  }

  items.sort(
    (a, b) => b.energy - a.energy,
  );

  const selected = items.slice(0, count);
  const totalEnergy = items.reduce(
    (sum, item) => sum + item.energy,
    0,
  );
  const selectedEnergy = selected.reduce(
    (sum, item) => sum + item.energy,
    0,
  );
  const biasIndex = dnCount * 3;

  return {
    featureIndices: selected.map(
      (item) => item.dn,
    ),
    channelWeights: selected.map(
      (item) => item.weights,
    ),
    attackBias:
      attack[biasIndex] - wait[biasIndex],
    l2MassFraction:
      totalEnergy > 0
        ? Math.sqrt(
            selectedEnergy / totalEnergy,
          )
        : 0,
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

  await mkdir(outDir, {
    recursive: true,
  });

  console.log(
    "MapleFly v10 Approach-to-Strike · runs=" +
    options.runs +
    " train=" +
    options.trainEpisodes +
    " eval=" +
    options.evalEpisodes +
    " max=" +
    options.maxSeconds +
    "s",
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

  if (
    dn.length !==
    movementSkill.originalFeatureCount
  ) {
    throw new Error(
      "movement skill DN contract mismatch",
    );
  }

  console.log(
    "[features] DN=" +
    dn.length +
    " attackFeature=" +
    (dn.length * 3 + 1),
  );

  const runs = [];

  for (
    let runIndex = 0;
    runIndex < options.runs;
    runIndex += 1
  ) {
    const runSeed =
      options.seed + runIndex * 10000;
    const random = mulberry32(
      runSeed ^ 0xa771c0de,
    );
    const policy = new AttackPolicy({
      featureCount: dn.length * 3 + 1,
      learningRate:
        options.learningRate,
      l2: options.l2,
      gamma: options.gamma,
      explorationFloor:
        options.explorationFloor,
    });

    console.log(
      "\n[run] " +
      (runIndex + 1) +
      "/" +
      options.runs,
    );

    const training = await runSet({
      connectome,
      dnSlot,
      dnCount: dn.length,
      policy,
      scheduleRows: schedule(
        options.trainEpisodes,
        runSeed + 1000,
        TRAIN_DISTANCES,
      ),
      options,
      training: true,
      condition: "FULL",
      random,
    });

    const evaluation = {};

    for (const condition of CONDITIONS) {
      evaluation[condition] =
        await runSet({
          connectome,
          dnSlot,
          dnCount: dn.length,
          policy,
          scheduleRows: schedule(
            options.evalEpisodes,
            runSeed + 20000,
            EVAL_DISTANCES,
          ),
          options,
          training: false,
          condition,
          random,
        });
    }

    runs.push({
      run: runIndex + 1,
      runSeed,
      training,
      evaluation,
      policy: policy.serialize(),
    });

    console.log(
      "[run-summary] run=" +
      (runIndex + 1) +
      " FULL=" +
      percent(evaluation.FULL.hitRate) +
      " OFF=" +
      percent(
        evaluation.NEURAL_OFF.hitRate,
      ) +
      " TEMP_OFF=" +
      percent(
        evaluation.TEMPORAL_OFF.hitRate,
      ),
    );
  }

  const summary = summarizeRuns(runs);

  const best = [...runs].sort(
    (a, b) =>
      b.evaluation.FULL.hitRate -
      a.evaluation.FULL.hitRate,
  )[0];

  const deploy = topSparsePolicy(
    best.policy,
    dn.length,
    96,
  );

  const meta = {
    schema:
      "maplefly.experiment-v10.approach-to-strike.1",
    brainRepository: SOURCE.repository,
    brainCommit: SOURCE.commit,
    movementSkillVersion:
      movementSkill.version,
    neurons: SOURCE.neurons,
    synapses: SOURCE.synapses,
    descendingNeurons: dn.length,
    temporalChannels: [
      "current-baseline",
      "fast-slow",
      "current-fast",
    ],
    runs: options.runs,
    trainEpisodes:
      options.trainEpisodes,
    evalEpisodes:
      options.evalEpisodes,
    trainingDistances:
      TRAIN_DISTANCES,
    evaluationDistances:
      EVAL_DISTANCES,
    maxSeconds:
      options.maxSeconds,
    terminalReward:
      "first ATTACK hit=+1; first ATTACK whiff=-1; no ATTACK before timeout=-1",
    movement:
      "frozen Fly #001 v7 LEFT/RIGHT skill",
    leakageGuard:
      "attack policy receives only temporal DN activity + bias; distance, target coordinates, hit range and hittable are not policy inputs",
    gate:
      "mean FULL hit>=70%; FULL-NEURAL_OFF>=25pp; FULL whiff<=30%; FULL timeout<=25%; every run FULL hit>=60%",
  };

  await writeFile(
    resolve(
      outDir,
      "experiment_v10.json",
    ),
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

  console.log(
    "\nV10-GATE=" +
    (summary.gate ? "PASS" : "FAIL") +
    " FULL=" +
    percent(summary.meanFullHitRate) +
    " NEURAL_OFF=" +
    percent(
      summary.meanNeuralOffHitRate,
    ) +
    " delta=" +
    percent(summary.neuralContribution) +
    " TEMP_OFF=" +
    percent(
      summary.meanTemporalOffHitRate,
    ) +
    " temporalDelta=" +
    percent(
      summary.temporalContribution,
    ) +
    " whiff=" +
    percent(
      summary.meanFullWhiffRate,
    ) +
    " timeout=" +
    percent(
      summary.meanFullTimeoutRate,
    ),
  );

  console.log(
    "DEPLOY_STATE_JSON=" +
    JSON.stringify({
      sourceRunIndex: best.run,
      originalFeatureCount:
        dn.length,
      sparseFeatureCount:
        deploy.featureIndices.length,
      featureIndices:
        deploy.featureIndices,
      channelWeights:
        deploy.channelWeights,
      attackBias:
        deploy.attackBias,
      l2MassFraction:
        deploy.l2MassFraction,
    }),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
