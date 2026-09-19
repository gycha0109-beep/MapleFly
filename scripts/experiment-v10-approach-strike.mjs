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
const ATTACK_WINDOW_STEPS = 5;
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

const TRAIN_STAGES = Object.freeze([
  Object.freeze({
    name: "near",
    distances: Object.freeze([140, 180]),
  }),
  Object.freeze({
    name: "near-mid",
    distances: Object.freeze([220, 280]),
  }),
  Object.freeze({
    name: "mid",
    distances: Object.freeze([320, 380]),
  }),
  Object.freeze({
    name: "far",
    distances: Object.freeze([420, 480]),
  }),
]);

const EVAL_DISTANCES = Object.freeze([
  160,
  250,
  350,
  450,
]);

const ACTIONS = Object.freeze([
  "ATTACK",
  "WAIT",
]);

const CONDITIONS = Object.freeze([
  "FULL",
  "NEURAL_OFF",
  "TEMPORAL_OFF",
]);

const skillApi = globalThis.MapleFlySkillV7;
const movementSkill =
  skillApi.BUNDLED_STATE;

function parseArgs(argv) {
  const options = {
    runs: 2,
    trainEpisodes: 64,
    evalEpisodes: 24,
    seed: 64,
    maxSeconds: 4.5,
    learningRate: 0.035,
    gamma: 0.985,
    l2: 0.00005,
    epsilonStart: 0.28,
    epsilonEnd: 0.06,
    out: "results/experiment-v10",
    cache: ".cache/maplefly-connectome",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--runs") {
      options.runs = Number(next);
      index += 1;
    } else if (arg === "--train") {
      options.trainEpisodes = Number(next);
      index += 1;
    } else if (arg === "--eval") {
      options.evalEpisodes = Number(next);
      index += 1;
    } else if (arg === "--seed") {
      options.seed = Number(next);
      index += 1;
    } else if (arg === "--max-seconds") {
      options.maxSeconds = Number(next);
      index += 1;
    } else if (arg === "--learning-rate") {
      options.learningRate = Number(next);
      index += 1;
    } else if (arg === "--out") {
      options.out = next;
      index += 1;
    } else if (arg === "--cache") {
      options.cache = next;
      index += 1;
    } else {
      throw new Error(
        "unknown argument: " + arg,
      );
    }
  }

  for (const key of [
    "runs",
    "trainEpisodes",
    "evalEpisodes",
  ]) {
    if (
      !Number.isInteger(options[key]) ||
      options[key] <= 0
    ) {
      throw new Error(
        "--" +
        key +
        " must be a positive integer",
      );
    }
  }

  if (
    options.trainEpisodes %
      TRAIN_STAGES.length !==
    0
  ) {
    throw new Error(
      "--train must be divisible by " +
      TRAIN_STAGES.length,
    );
  }

  const episodesPerStage =
    options.trainEpisodes /
    TRAIN_STAGES.length;

  if (episodesPerStage % 4 !== 0) {
    throw new Error(
      "episodes per stage must be divisible by 4",
    );
  }

  if (options.evalEpisodes % 8 !== 0) {
    throw new Error(
      "--eval must be divisible by 8",
    );
  }

  return options;
}

function mulberry32(seed) {
  let state =
    Math.trunc(Number(seed) || 0) >>> 0;

  return function random() {
    let t = (state += 0x6d2b79f5);
    t = Math.imul(
      t ^ (t >>> 15),
      t | 1,
    );
    t ^=
      t +
      Math.imul(
        t ^ (t >>> 7),
        t | 61,
      );
    return (
      (t ^ (t >>> 14)) >>> 0
    ) / 4294967296;
  };
}

function clamp(value, min, max) {
  return Math.max(
    min,
    Math.min(max, value),
  );
}

function mean(values) {
  return values.length
    ? values.reduce(
        (sum, value) =>
          sum + value,
        0,
      ) / values.length
    : 0;
}

function makeSlotMap(n, indices) {
  const map =
    new Int32Array(n);
  map.fill(-1);

  for (
    let slot = 0;
    slot < indices.length;
    slot += 1
  ) {
    map[indices[slot]] = slot;
  }

  return map;
}

function dot(weights, feature) {
  let total = 0;

  for (
    let index = 0;
    index < weights.length;
    index += 1
  ) {
    total +=
      weights[index] *
      feature[index];
  }

  return total;
}

class LinearQ {
  constructor({
    featureCount,
    learningRate,
    gamma,
    l2,
  }) {
    this.weights = [
      new Float64Array(featureCount),
      new Float64Array(featureCount),
    ];
    this.learningRate =
      learningRate;
    this.gamma = gamma;
    this.l2 = l2;
    this.updates = 0;
  }

  values(feature) {
    return [
      dot(this.weights[0], feature),
      dot(this.weights[1], feature),
    ];
  }

  choose({
    feature,
    random,
    epsilon,
  }) {
    const q = this.values(feature);

    if (random() < epsilon) {
      return {
        action:
          random() < 0.5 ? 0 : 1,
        q,
        explored: true,
      };
    }

    return {
      action:
        q[0] >= q[1] ? 0 : 1,
      q,
      explored: false,
    };
  }

  greedy(feature) {
    const q = this.values(feature);

    return {
      action:
        q[0] >= q[1] ? 0 : 1,
      q,
    };
  }

  update(
    feature,
    action,
    target,
  ) {
    const q =
      dot(
        this.weights[action],
        feature,
      );
    const error = clamp(
      target - q,
      -2,
      2,
    );
    const decay = 1 - this.l2;

    for (
      let index = 0;
      index < feature.length;
      index += 1
    ) {
      this.weights[action][index] =
        this.weights[action][index] *
          decay +
        this.learningRate *
          error *
          feature[index];
    }

    this.updates += 1;

    return {
      q,
      target,
      error,
    };
  }

  replayBackward(
    trajectory,
    terminalReward,
    outcome,
  ) {
    const diagnostics = [];

    for (
      let index =
        trajectory.length - 1;
      index >= 0;
      index -= 1
    ) {
      const item =
        trajectory[index];
      let target;

      if (
        item.action === 0
      ) {
        target =
          index ===
          trajectory.length - 1
            ? terminalReward
            : terminalReward;
      } else if (
        index ===
          trajectory.length - 1 &&
        outcome === "TIMEOUT"
      ) {
        target = -1;
      } else {
        const next =
          trajectory[index + 1];

        if (!next) {
          target = 0;
        } else {
          const nextQ =
            this.values(
              next.feature,
            );
          target =
            this.gamma *
            Math.max(
              nextQ[0],
              nextQ[1],
            );
        }
      }

      diagnostics.push(
        this.update(
          item.feature,
          item.action,
          target,
        ),
      );
    }

    return diagnostics;
  }

  serialize() {
    return {
      updates: this.updates,
      weights:
        this.weights.map(
          (values) =>
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
    visual = true,
  }) {
    const drive = {
      SNta_L: 0.05,
      SNta_R: 0.05,
    };

    if (!visual) {
      this.lastDistance = null;
      return drive;
    }

    const playerCenter =
      playerX +
      PLAYER_WIDTH / 2;
    const dx =
      targetX -
      playerCenter;
    const side =
      dx < 0 ? "L" : "R";
    const distance =
      Math.abs(dx);
    const closeness =
      clamp(
        1 -
          distance / 620,
        0,
        1,
      );

    let approaching = 0;

    if (
      Number.isFinite(
        this.lastDistance,
      )
    ) {
      approaching =
        clamp(
          (
            this.lastDistance -
            distance
          ) / 45,
          0,
          1,
        );
    }

    this.lastDistance =
      distance;

    drive[
      "LC10a_" + side
    ] = clamp(
      0.12 +
        closeness * 0.68,
      0,
      0.8,
    );

    drive[
      "LPLC1_" + side
    ] = clamp(
      closeness * 0.12 +
        approaching * 0.32,
      0,
      0.55,
    );

    drive[
      "LPLC2_" + side
    ] = clamp(
      closeness * 0.24 +
        approaching * 0.38,
      0,
      0.8,
    );

    if (distance < 175) {
      drive[
        "LC4_" + side
      ] = clamp(
        (
          (175 - distance) /
          175
        ) *
          0.72 +
          approaching *
            0.18,
        0,
        0.8,
      );
    }

    return drive;
  }
}

function stimulate(
  brain,
  inputGroups,
  drive,
) {
  for (
    const [name, amount]
    of Object.entries(drive)
  ) {
    if (!amount) {
      continue;
    }

    const indices =
      inputGroups.get(name);

    if (indices?.length) {
      brain.stimulate(
        indices,
        amount,
      );
    }
  }
}

function collectDn(
  brain,
  dnSlot,
  counts,
) {
  for (
    let fired = 0;
    fired < brain.firedCount;
    fired += 1
  ) {
    const slot =
      dnSlot[
        brain.fired[fired]
      ];

    if (slot >= 0) {
      counts[slot] += 1;
    }
  }
}

function makeRate(
  counts,
  steps,
) {
  const seconds =
    steps * STEP_SECONDS;

  return Float64Array.from(
    counts,
    (value) =>
      value / seconds,
  );
}

function movementChoice(
  currentDnRate,
  baselineDnRate,
) {
  const feature =
    new Float64Array(
      movementSkill
        .sparseFeatureCount,
    );
  let normSquared = 0;

  for (
    let slot = 0;
    slot <
    movementSkill
      .featureIndices.length;
    slot += 1
  ) {
    const dnIndex =
      movementSkill
        .featureIndices[slot];
    const delta =
      (
        currentDnRate[
          dnIndex
        ] -
        baselineDnRate[
          dnIndex
        ]
      ) / 50;

    feature[slot] =
      delta;
    normSquared +=
      delta * delta;
  }

  const norm =
    Math.sqrt(normSquared);

  if (norm > 1e-9) {
    for (
      let slot = 0;
      slot <
      feature.length;
      slot += 1
    ) {
      feature[slot] /=
        norm;
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
  const count =
    current.length;
  const feature =
    new Float64Array(
      count * 3 + 1,
    );

  if (
    condition ===
    "NEURAL_OFF"
  ) {
    feature[
      feature.length - 1
    ] = 1;
    return feature;
  }

  for (
    let index = 0;
    index < count;
    index += 1
  ) {
    feature[index] =
      (
        current[index] -
        baseline[index]
      ) / 50;

    if (
      condition ===
      "TEMPORAL_OFF"
    ) {
      continue;
    }

    feature[
      count + index
    ] =
      (
        fast[index] -
        slow[index]
      ) / 50;

    feature[
      count * 2 + index
    ] =
      (
        current[index] -
        fast[index]
      ) / 50;
  }

  feature[
    feature.length - 1
  ] = 1;

  return feature;
}

function attackWouldHit({
  playerX,
  targetX,
  facing,
}) {
  const attackX =
    facing > 0
      ? playerX +
        PLAYER_WIDTH -
        2
      : playerX -
        ATTACK_RANGE +
        2;

  const attackBox = {
    x: attackX,
    y: PLAYER_Y + 4,
    width: ATTACK_RANGE,
    height:
      PLAYER_HEIGHT - 8,
  };

  const targetBox = {
    x:
      targetX -
      TARGET_WIDTH / 2,
    y:
      TARGET_BASELINE_Y -
      TARGET_HEIGHT,
    width: TARGET_WIDTH,
    height: TARGET_HEIGHT,
  };

  return (
    attackBox.x <
      targetBox.x +
        targetBox.width &&
    attackBox.x +
      attackBox.width >
      targetBox.x &&
    attackBox.y <
      targetBox.y +
        targetBox.height &&
    attackBox.y +
      attackBox.height >
      targetBox.y
  );
}

function makeSchedule(
  totalEpisodes,
  baseSeed,
  distances,
) {
  const blockSize =
    distances.length * 2;

  if (
    totalEpisodes %
      blockSize !==
    0
  ) {
    throw new Error(
      "episodes must be divisible by " +
      blockSize,
    );
  }

  const blocks =
    totalEpisodes /
    blockSize;
  const rows = [];

  for (
    let block = 0;
    block < blocks;
    block += 1
  ) {
    const brainSeed =
      baseSeed + block;

    distances.forEach(
      (
        startDistance,
        distanceIndex,
      ) => {
        const order =
          (
            block +
            distanceIndex
          ) %
            2 ===
          0
            ? ["L", "R"]
            : ["R", "L"];

        for (
          const side
          of order
        ) {
          rows.push({
            block:
              block + 1,
            brainSeed,
            side,
            startDistance,
          });
        }
      },
    );
  }

  return rows;
}

function summarizeEpisodes(
  rows,
) {
  const hits =
    rows.filter(
      (row) =>
        row.outcome ===
        "HIT",
    );
  const whiffs =
    rows.filter(
      (row) =>
        row.outcome ===
        "WHIFF",
    );
  const timeouts =
    rows.filter(
      (row) =>
        row.outcome ===
        "TIMEOUT",
    );

  return {
    hitRate:
      rows.length
        ? hits.length /
          rows.length
        : 0,
    whiffRate:
      rows.length
        ? whiffs.length /
          rows.length
        : 0,
    timeoutRate:
      rows.length
        ? timeouts.length /
          rows.length
        : 0,
    meanHitTime:
      hits.length
        ? mean(
            hits.map(
              (row) =>
                row.terminalTime,
            ),
          )
        : null,
    meanHitDistance:
      hits.length
        ? mean(
            hits.map(
              (row) =>
                row.terminalDistance,
            ),
          )
        : null,
    meanClosestDistance:
      mean(
        rows.map(
          (row) =>
            row.closestDistance,
        ),
      ),
    movementReachRate:
      mean(
        rows.map(
          (row) =>
            row.closestDistance <=
            115
              ? 1
              : 0,
        ),
      ),
    meanDecisionCount:
      mean(
        rows.map(
          (row) =>
            row.decisions,
        ),
      ),
  };
}

async function runEpisode({
  connectome,
  dnSlot,
  dnCount,
  episode,
  q,
  random,
  options,
  training,
  condition,
  epsilon,
}) {
  const brain =
    new ConnectomeBrain(
      connectome.weights,
      connectome.meta.params,
      episode.brainSeed,
    );

  const encoder =
    new VisualEncoder();

  const center =
    WORLD_WIDTH / 2;

  let playerX =
    center -
    PLAYER_WIDTH / 2;

  const targetX =
    center +
    (
      episode.side === "L"
        ? -episode.startDistance
        : episode.startDistance
    );

  let facing =
    episode.side === "L"
      ? -1
      : 1;

  let moveAction =
    "IDLE";

  for (
    let step = 0;
    step < SETTLE_STEPS;
    step += 1
  ) {
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
    new Float64Array(
      dnCount,
    );

  for (
    let step = 0;
    step < BASELINE_STEPS;
    step += 1
  ) {
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

  const baseline =
    makeRate(
      baselineCounts,
      BASELINE_STEPS,
    );

  const fast =
    Float64Array.from(
      baseline,
    );
  const slow =
    Float64Array.from(
      baseline,
    );

  encoder.reset();

  let attackCounts =
    new Float64Array(
      dnCount,
    );
  let moveCounts =
    new Float64Array(
      dnCount,
    );
  let attackSteps = 0;
  let moveSteps = 0;
  const trajectory = [];

  const maxSteps =
    Math.round(
      options.maxSeconds /
        STEP_SECONDS,
    );

  let outcome =
    "TIMEOUT";
  let terminalReward = -1;
  let terminalTime =
    options.maxSeconds;
  let terminalDistance =
    Math.abs(
      targetX -
        (
          playerX +
          PLAYER_WIDTH / 2
        ),
    );
  let closestDistance =
    terminalDistance;

  for (
    let step = 0;
    step < maxSteps;
    step += 1
  ) {
    const drive =
      encoder.encode({
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
        : moveAction ===
            "RIGHT"
          ? 1
          : 0;

    if (direction !== 0) {
      facing = direction;
    }

    playerX =
      clamp(
        playerX +
          direction *
            MOVE_SPEED *
            STEP_SECONDS,
        0,
        WORLD_WIDTH -
          PLAYER_WIDTH,
      );

    const distance =
      Math.abs(
        targetX -
          (
            playerX +
            PLAYER_WIDTH /
              2
          ),
      );

    closestDistance =
      Math.min(
        closestDistance,
        distance,
      );

    attackSteps += 1;
    moveSteps += 1;

    if (
      moveSteps >=
      MOVE_WINDOW_STEPS
    ) {
      const rate =
        makeRate(
          moveCounts,
          moveSteps,
        );

      moveAction =
        movementChoice(
          rate,
          baseline,
        );

      moveCounts =
        new Float64Array(
          dnCount,
        );
      moveSteps = 0;
    }

    if (
      attackSteps <
      ATTACK_WINDOW_STEPS
    ) {
      continue;
    }

    const current =
      makeRate(
        attackCounts,
        attackSteps,
      );

    for (
      let index = 0;
      index < dnCount;
      index += 1
    ) {
      fast[index] =
        0.50 *
          current[index] +
        0.50 *
          fast[index];

      slow[index] =
        0.12 *
          current[index] +
        0.88 *
          slow[index];
    }

    const feature =
      makeAttackFeature({
        current,
        baseline,
        fast,
        slow,
        condition,
      });

    const decision =
      training
        ? q.choose({
            feature,
            random,
            epsilon,
          })
        : q.greedy(
            feature,
          );

    trajectory.push({
      feature,
      action:
        decision.action,
      q: decision.q,
      explored:
        Boolean(
          decision.explored,
        ),
    });

    attackCounts =
      new Float64Array(
        dnCount,
      );
    attackSteps = 0;

    if (
      decision.action === 0
    ) {
      const hit =
        attackWouldHit({
          playerX,
          targetX,
          facing,
        });

      outcome =
        hit
          ? "HIT"
          : "WHIFF";
      terminalReward =
        hit ? 1 : -1;
      terminalTime =
        (step + 1) *
        STEP_SECONDS;
      terminalDistance =
        distance;
      break;
    }
  }

  if (training) {
    q.replayBackward(
      trajectory,
      terminalReward,
      outcome,
    );
  }

  return {
    side:
      episode.side,
    startDistance:
      episode.startDistance,
    brainSeed:
      episode.brainSeed,
    condition,
    outcome,
    terminalReward,
    terminalTime,
    terminalDistance,
    closestDistance,
    decisions:
      trajectory.length,
    exploredDecisions:
      trajectory.filter(
        (item) =>
          item.explored,
      ).length,
    finalMoveAction:
      moveAction,
  };
}

async function runTraining({
  connectome,
  dnSlot,
  dnCount,
  q,
  random,
  options,
  runSeed,
}) {
  const rows = [];
  const perStage =
    options.trainEpisodes /
    TRAIN_STAGES.length;
  let completed = 0;

  for (
    let stageIndex = 0;
    stageIndex <
    TRAIN_STAGES.length;
    stageIndex += 1
  ) {
    const stage =
      TRAIN_STAGES[
        stageIndex
      ];

    const schedule =
      makeSchedule(
        perStage,
        runSeed +
          1000 +
          stageIndex *
            100,
        stage.distances,
      );

    const progressBase =
      completed /
      options.trainEpisodes;

    console.log(
      "[stage] " +
      (stageIndex + 1) +
      "/" +
      TRAIN_STAGES.length +
      " " +
      stage.name +
      " distances=" +
      stage.distances.join(
        ",",
      ),
    );

    for (
      let index = 0;
      index <
      schedule.length;
      index += 1
    ) {
      const globalIndex =
        completed + index;
      const progress =
        globalIndex /
        Math.max(
          1,
          options.trainEpisodes -
            1,
        );

      const epsilon =
        options.epsilonStart +
        (
          options.epsilonEnd -
          options.epsilonStart
        ) *
          progress;

      const row =
        await runEpisode({
          connectome,
          dnSlot,
          dnCount,
          episode:
            schedule[index],
          q,
          random,
          options,
          training: true,
          condition: "FULL",
          epsilon,
        });

      rows.push({
        ...row,
        stage:
          stage.name,
        epsilon,
      });

      if (
        (index + 1) % 4 ===
        0
      ) {
        const recent =
          summarizeEpisodes(
            rows.slice(-4),
          );

        console.log(
          "[train] stage=" +
          stage.name +
          " " +
          (index + 1) +
          "/" +
          schedule.length +
          " hit=" +
          (
            recent.hitRate *
            100
          ).toFixed(1) +
          "% whiff=" +
          (
            recent.whiffRate *
            100
          ).toFixed(1) +
          "% timeout=" +
          (
            recent.timeoutRate *
            100
          ).toFixed(1) +
          "% reach=" +
          (
            recent.movementReachRate *
            100
          ).toFixed(1) +
          "%",
        );

        await new Promise(
          (resolve) =>
            setImmediate(
              resolve,
            ),
        );
      }
    }

    completed +=
      schedule.length;

    const stageRows =
      rows.slice(
        completed -
          schedule.length,
        completed,
      );

    const stageSummary =
      summarizeEpisodes(
        stageRows,
      );

    console.log(
      "[stage-summary] " +
      stage.name +
      " hit=" +
      (
        stageSummary.hitRate *
        100
      ).toFixed(1) +
      "% reach=" +
      (
        stageSummary
          .movementReachRate *
        100
      ).toFixed(1) +
      "%",
    );

    void progressBase;
  }

  return {
    ...summarizeEpisodes(
      rows,
    ),
    rows,
  };
}

async function runEvaluation({
  connectome,
  dnSlot,
  dnCount,
  q,
  options,
  runSeed,
  condition,
}) {
  const rows = [];
  const schedule =
    makeSchedule(
      options.evalEpisodes,
      runSeed + 20000,
      EVAL_DISTANCES,
    );
  const random =
    mulberry32(
      runSeed ^
        0xe11a0001,
    );

  for (
    let index = 0;
    index <
    schedule.length;
    index += 1
  ) {
    rows.push(
      await runEpisode({
        connectome,
        dnSlot,
        dnCount,
        episode:
          schedule[index],
        q,
        random,
        options,
        training: false,
        condition,
        epsilon: 0,
      }),
    );

    if (
      (index + 1) % 8 ===
      0
    ) {
      const recent =
        summarizeEpisodes(
          rows.slice(-8),
        );

      console.log(
        "[" +
        condition +
        "] " +
        (index + 1) +
        "/" +
        schedule.length +
        " hit=" +
        (
          recent.hitRate *
          100
        ).toFixed(1) +
        "% whiff=" +
        (
          recent.whiffRate *
          100
        ).toFixed(1) +
        "% timeout=" +
        (
          recent.timeoutRate *
          100
        ).toFixed(1) +
        "% reach=" +
        (
          recent
            .movementReachRate *
          100
        ).toFixed(1) +
        "%",
      );
    }
  }

  return {
    ...summarizeEpisodes(
      rows,
    ),
    rows,
  };
}

function summarizeRuns(runs) {
  const meanFullHit =
    mean(
      runs.map(
        (run) =>
          run.evaluation
            .FULL.hitRate,
      ),
    );

  const meanOffHit =
    mean(
      runs.map(
        (run) =>
          run.evaluation
            .NEURAL_OFF
            .hitRate,
      ),
    );

  const meanTemporalOffHit =
    mean(
      runs.map(
        (run) =>
          run.evaluation
            .TEMPORAL_OFF
            .hitRate,
      ),
    );

  const meanWhiff =
    mean(
      runs.map(
        (run) =>
          run.evaluation
            .FULL.whiffRate,
      ),
    );

  const meanTimeout =
    mean(
      runs.map(
        (run) =>
          run.evaluation
            .FULL.timeoutRate,
      ),
    );

  const meanReach =
    mean(
      runs.map(
        (run) =>
          run.evaluation
            .FULL
            .movementReachRate,
      ),
    );

  const gate =
    meanReach >= 0.85 &&
    meanFullHit >= 0.70 &&
    meanFullHit -
      meanOffHit >=
      0.25 &&
    meanWhiff <= 0.30 &&
    meanTimeout <= 0.25 &&
    runs.every(
      (run) =>
        run.evaluation
          .FULL.hitRate >=
        0.60,
    );

  return {
    meanMovementReachRate:
      meanReach,
    meanFullHitRate:
      meanFullHit,
    meanNeuralOffHitRate:
      meanOffHit,
    neuralContribution:
      meanFullHit -
      meanOffHit,
    meanTemporalOffHitRate:
      meanTemporalOffHit,
    temporalContribution:
      meanFullHit -
      meanTemporalOffHit,
    meanFullWhiffRate:
      meanWhiff,
    meanFullTimeoutRate:
      meanTimeout,
    gate,
  };
}

function topSparsePolicy(
  policy,
  dnCount,
  count = 96,
) {
  const attack =
    policy.weights[0];
  const wait =
    policy.weights[1];
  const items = [];

  for (
    let dn = 0;
    dn < dnCount;
    dn += 1
  ) {
    const weights = [];
    let energy = 0;

    for (
      let channel = 0;
      channel < 3;
      channel += 1
    ) {
      const index =
        channel *
          dnCount +
        dn;
      const weight =
        attack[index] -
        wait[index];

      weights.push(
        weight,
      );
      energy +=
        weight *
        weight;
    }

    items.push({
      dn,
      weights,
      energy,
    });
  }

  items.sort(
    (a, b) =>
      b.energy -
      a.energy,
  );

  const selected =
    items.slice(
      0,
      count,
    );

  const totalEnergy =
    items.reduce(
      (sum, item) =>
        sum +
        item.energy,
      0,
    );

  const selectedEnergy =
    selected.reduce(
      (sum, item) =>
        sum +
        item.energy,
      0,
    );

  const biasIndex =
    dnCount * 3;

  return {
    featureIndices:
      selected.map(
        (item) =>
          item.dn,
      ),
    channelWeights:
      selected.map(
        (item) =>
          item.weights,
      ),
    attackBias:
      attack[biasIndex] -
      wait[biasIndex],
    l2MassFraction:
      totalEnergy > 0
        ? Math.sqrt(
            selectedEnergy /
              totalEnergy,
          )
        : 0,
  };
}

function percent(value) {
  return (
    value * 100
  ).toFixed(1) + "%";
}

async function main() {
  const options =
    parseArgs(
      process.argv.slice(2),
    );

  const outDir =
    resolve(options.out);

  await mkdir(
    outDir,
    {
      recursive: true,
    },
  );

  console.log(
    "MapleFly v10B Q-learning Approach-to-Strike · runs=" +
    options.runs +
    " train=" +
    options.trainEpisodes +
    " eval=" +
    options.evalEpisodes,
  );

  const connectome =
    await loadConnectome({
      cacheDir:
        resolve(
          options.cache,
        ),
      onProgress(
        message,
      ) {
        console.log(
          "[connectome] " +
          message,
        );
      },
    });

  const dn =
    cells(
      connectome.meta,
      [
        "descending_neuron",
        "descending_neuron_tbc",
      ],
    );

  if (
    dn.length !==
    movementSkill
      .originalFeatureCount
  ) {
    throw new Error(
      "movement skill DN contract mismatch",
    );
  }

  const dnSlot =
    makeSlotMap(
      connectome.meta.n,
      dn,
    );

  const featureCount =
    dn.length * 3 + 1;

  console.log(
    "[features] DN=" +
    dn.length +
    " attackFeature=" +
    featureCount +
    " decision=" +
    (
      ATTACK_WINDOW_STEPS *
      STEP_SECONDS *
      1000
    ).toFixed(0) +
    "ms",
  );

  const runs = [];

  for (
    let runIndex = 0;
    runIndex <
    options.runs;
    runIndex += 1
  ) {
    const runSeed =
      options.seed +
      runIndex *
        10000;

    const random =
      mulberry32(
        runSeed ^
          0xa771c0de,
      );

    const q =
      new LinearQ({
        featureCount,
        learningRate:
          options.learningRate,
        gamma:
          options.gamma,
        l2:
          options.l2,
      });

    console.log(
      "\n[run] " +
      (runIndex + 1) +
      "/" +
      options.runs,
    );

    const training =
      await runTraining({
        connectome,
        dnSlot,
        dnCount:
          dn.length,
        q,
        random,
        options,
        runSeed,
      });

    const evaluation = {};

    for (
      const condition
      of CONDITIONS
    ) {
      evaluation[
        condition
      ] =
        await runEvaluation({
          connectome,
          dnSlot,
          dnCount:
            dn.length,
          q,
          options,
          runSeed,
          condition,
        });
    }

    runs.push({
      run:
        runIndex + 1,
      runSeed,
      training,
      evaluation,
      policy:
        q.serialize(),
    });

    console.log(
      "[run-summary] run=" +
      (runIndex + 1) +
      " reach=" +
      percent(
        evaluation.FULL
          .movementReachRate,
      ) +
      " FULL=" +
      percent(
        evaluation.FULL
          .hitRate,
      ) +
      " OFF=" +
      percent(
        evaluation
          .NEURAL_OFF
          .hitRate,
      ) +
      " TEMP_OFF=" +
      percent(
        evaluation
          .TEMPORAL_OFF
          .hitRate,
      ),
    );
  }

  const summary =
    summarizeRuns(runs);

  const best =
    [...runs].sort(
      (a, b) =>
        b.evaluation
          .FULL.hitRate -
        a.evaluation
          .FULL.hitRate,
    )[0];

  const deploy =
    topSparsePolicy(
      best.policy,
      dn.length,
      96,
    );

  const meta = {
    schema:
      "maplefly.experiment-v10.approach-to-strike.q1",
    phase:
      "B",
    brainRepository:
      SOURCE.repository,
    brainCommit:
      SOURCE.commit,
    movementSkillVersion:
      movementSkill.version,
    neurons:
      SOURCE.neurons,
    synapses:
      SOURCE.synapses,
    descendingNeurons:
      dn.length,
    temporalChannels: [
      "current-baseline",
      "fast-slow",
      "current-fast",
    ],
    decisionMs:
      ATTACK_WINDOW_STEPS *
      STEP_SECONDS *
      1000,
    runs:
      options.runs,
    trainEpisodes:
      options.trainEpisodes,
    evalEpisodes:
      options.evalEpisodes,
    trainStages:
      TRAIN_STAGES,
    evaluationDistances:
      EVAL_DISTANCES,
    maxSeconds:
      options.maxSeconds,
    learner:
      "linear Q-learning with backward replay over ATTACK/WAIT trajectory",
    reward:
      "ATTACK hit=+1; ATTACK whiff=-1; timeout=-1; WAIT immediate reward=0",
    exploration:
      "epsilon-greedy decays from 0.28 to 0.06 across curriculum",
    leakageGuard:
      "attack policy receives only temporal DN activity + bias; distance, coordinates, attack range and hittable are excluded",
    gate:
      "movement reach>=85%; FULL hit>=70%; FULL-NEURAL_OFF>=25pp; whiff<=30%; timeout<=25%; every run FULL>=60%",
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
        bestRun:
          best.run,
        deploy,
        runs,
      },
      null,
      2,
    ),
  );

  console.log(
    "\nV10-GATE=" +
    (
      summary.gate
        ? "PASS"
        : "FAIL"
    ) +
    " reach=" +
    percent(
      summary
        .meanMovementReachRate,
    ) +
    " FULL=" +
    percent(
      summary
        .meanFullHitRate,
    ) +
    " NEURAL_OFF=" +
    percent(
      summary
        .meanNeuralOffHitRate,
    ) +
    " delta=" +
    percent(
      summary
        .neuralContribution,
    ) +
    " TEMP_OFF=" +
    percent(
      summary
        .meanTemporalOffHitRate,
    ) +
    " temporalDelta=" +
    percent(
      summary
        .temporalContribution,
    ) +
    " whiff=" +
    percent(
      summary
        .meanFullWhiffRate,
    ) +
    " timeout=" +
    percent(
      summary
        .meanFullTimeoutRate,
    ),
  );

  console.log(
    "DEPLOY_STATE_JSON=" +
    JSON.stringify({
      sourceRunIndex:
        best.run,
      originalFeatureCount:
        dn.length,
      sparseFeatureCount:
        deploy
          .featureIndices
          .length,
      featureIndices:
        deploy
          .featureIndices,
      channelWeights:
        deploy
          .channelWeights,
      attackBias:
        deploy.attackBias,
      l2MassFraction:
        deploy
          .l2MassFraction,
    }),
  );
}

main().catch(
  (error) => {
    console.error(error);
    process.exitCode = 1;
  },
);
