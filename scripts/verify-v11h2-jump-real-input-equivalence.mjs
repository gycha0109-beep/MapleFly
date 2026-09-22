#!/usr/bin/env node
import fs from "node:fs";
import {
  ConnectomeBrain,
  cells,
  loadConnectome,
} from "../src/headless/connectome-runtime.mjs";
import "../src/brain/fly-skill-v11h2-jump.js";

const candidate = JSON.parse(
  fs.readFileSync(
    "src/brain/fly-skill-v11h2-jump-candidate.json",
    "utf8",
  ),
).candidate;
const api = globalThis.MapleFlyJumpSkillV11H2;
const state = api.BUNDLED_STATE;

const DN_COUNT = 1316;
const STEP_SECONDS = 0.02;
const SETTLE_STEPS = 26;
const BASELINE_STEPS = 26;
const WINDOW_STEPS = 5;
const COOLDOWN_STEPS = 38;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function sigmoid(value) {
  return 1 / (
    1 +
    Math.exp(-clamp(value, -30, 30))
  );
}

function buildDnContract(meta) {
  const allDn = cells(
    meta,
    ["descending_neuron", "descending_neuron_tbc"],
  );
  if (allDn.length !== DN_COUNT) {
    throw new Error("DN contract mismatch");
  }
  const slot =
    new Int16Array(meta.n).fill(-1);
  allDn.forEach((neuron, index) => {
    slot[neuron] = index;
  });
  return slot;
}

function stimulate(brain, inputGroups, drive) {
  for (
    const [name, amount]
    of Object.entries(drive)
  ) {
    if (!amount) continue;
    const indices = inputGroups.get(name);
    if (indices?.length) {
      brain.stimulate(indices, amount);
    }
  }
}

function collectDn(brain, dnSlot, counts) {
  for (
    let fired = 0;
    fired < brain.firedCount;
    fired += 1
  ) {
    const dn = dnSlot[brain.fired[fired]];
    if (dn >= 0) counts[dn] += 1;
  }
}

function rate(counts, steps) {
  const seconds = steps * STEP_SECONDS;
  return Float64Array.from(
    counts,
    (count) => count / seconds,
  );
}

function feature(current, baseline) {
  const out = new Float64Array(DN_COUNT);
  for (let i = 0; i < DN_COUNT; i += 1) {
    out[i] = clamp(
      (current[i] - baseline[i]) / 50,
      -1,
      1,
    );
  }
  return out;
}

function reference(history) {
  const selected = new Float64Array(256);
  const standardized =
    new Float64Array(256);
  let waitScore = candidate.waitBias;
  let jumpScore = candidate.jumpBias;

  for (let slot = 0; slot < 256; slot += 1) {
    const t =
      candidate.selectedTemporalSlots[slot];
    selected[slot] =
      history[t.window][t.dnIndex];
    standardized[slot] = clamp(
      (
        selected[slot] -
        candidate.means[slot]
      ) /
        candidate.scales[slot],
      -5,
      5,
    );
    waitScore +=
      candidate.waitWeights[slot] *
      standardized[slot];
    jumpScore +=
      candidate.jumpWeights[slot] *
      standardized[slot];
  }

  return {
    selected,
    standardized,
    waitScore,
    jumpScore,
    waitProbability: sigmoid(waitScore),
    jumpProbability: sigmoid(jumpScore),
  };
}

function assertNear(a, b, label) {
  if (Math.abs(a - b) > 1e-15) {
    throw new Error(
      label + " mismatch " + a + " != " + b,
    );
  }
}

function assertArray(a, b, label) {
  if (a.length !== b.length) {
    throw new Error(label + " length mismatch");
  }
  for (let i = 0; i < a.length; i += 1) {
    assertNear(a[i], b[i], label + "[" + i + "]");
  }
}

function sensoryDrive(windowIndex, side) {
  const target = clamp(
    0.16 + windowIndex * 0.025,
    0,
    0.8,
  );
  const looming =
    windowIndex >= 4 &&
    windowIndex <= 11
      ? clamp(
          0.08 +
            (windowIndex - 4) * 0.09,
          0,
          0.8,
        )
      : 0;

  const drive = {
    SNta_L: 0.05,
    SNta_R: 0.05,
  };

  drive["LC10a_" + side] = target;
  drive["LPLC1_" + side] =
    clamp(target * 0.45, 0, 0.55);
  drive["LPLC2_" + side] =
    clamp(target * 0.7, 0, 0.8);

  if (target > 0.44) {
    drive["LC4_" + side] =
      clamp((target - 0.44) * 1.6, 0, 0.8);
  }

  if (looming > 0) {
    drive["LC6_" + side] = looming;
    drive["LC16_" + side] = looming;
    drive["LC22_" + side] = looming;
    drive["LPLC4_" + side] = looming;
  }

  return drive;
}

async function collectTrace(
  connectome,
  dnSlot,
  seed,
  side,
) {
  const brain = new ConnectomeBrain(
    connectome.weights,
    connectome.meta.params,
    seed,
  );

  const baselineDrive = {
    SNta_L: 0.05,
    SNta_R: 0.05,
  };

  for (
    let step = 0;
    step < SETTLE_STEPS;
    step += 1
  ) {
    stimulate(
      brain,
      connectome.inputGroups,
      baselineDrive,
    );
    brain.step();
  }

  const baselineCounts =
    new Float64Array(DN_COUNT);
  for (
    let step = 0;
    step < BASELINE_STEPS;
    step += 1
  ) {
    stimulate(
      brain,
      connectome.inputGroups,
      baselineDrive,
    );
    brain.step();
    collectDn(
      brain,
      dnSlot,
      baselineCounts,
    );
  }
  const baseline = rate(
    baselineCounts,
    BASELINE_STEPS,
  );

  const windows = [];
  for (
    let windowIndex = 0;
    windowIndex < 16;
    windowIndex += 1
  ) {
    const counts =
      new Float64Array(DN_COUNT);
    const drive =
      sensoryDrive(windowIndex, side);

    for (
      let step = 0;
      step < WINDOW_STEPS;
      step += 1
    ) {
      stimulate(
        brain,
        connectome.inputGroups,
        drive,
      );
      brain.step();
      collectDn(brain, dnSlot, counts);
    }

    windows.push(
      feature(
        rate(counts, WINDOW_STEPS),
        baseline,
      ),
    );
  }
  return windows;
}

async function main() {
  if (!api.validState(state)) {
    throw new Error("bundle state invalid");
  }
  if (
    state.cooldownBrainSteps !==
      COOLDOWN_STEPS ||
    state.sensory.obstacleUsesLC4 !== false
  ) {
    throw new Error(
      "cooldown/sensory invariant mismatch",
    );
  }

  const connectome =
    await loadConnectome({
      cacheDir:
        ".cache/maplefly-connectome",
      onProgress(message) {
        console.log(
          "[connectome] " + message,
        );
      },
    });
  const dnSlot =
    buildDnContract(connectome.meta);

  const cases = [
    { seed: 2251000, side: "R" },
    { seed: 2261000, side: "L" },
    { seed: 2271000, side: "R" },
  ];

  let compared = 0;
  let cooldownComparisons = 0;

  for (const row of cases) {
    const windows =
      await collectTrace(
        connectome,
        dnSlot,
        row.seed,
        row.side,
      );

    const runtime = api.createRuntime();
    const manual = {
      positiveStreak: 0,
      cooldown: 0,
    };
    const history = [];

    for (
      let index = 0;
      index < windows.length;
      index += 1
    ) {
      manual.cooldown = Math.max(
        0,
        manual.cooldown - WINDOW_STEPS,
      );

      history.push(windows[index]);
      if (history.length > 4) {
        history.shift();
      }
      if (history.length < 4) {
        continue;
      }

      const grounded =
        !(
          index === 8 ||
          index === 13
        );
      const available =
        grounded &&
        manual.cooldown === 0;

      const want = reference(history);
      const gotEval =
        api.evaluateHistory(
          history,
          state,
        );

      assertArray(
        gotEval.selected,
        want.selected,
        "selected",
      );
      assertArray(
        gotEval.standardized,
        want.standardized,
        "standardized",
      );
      assertNear(
        gotEval.waitProbability,
        want.waitProbability,
        "waitProbability",
      );
      assertNear(
        gotEval.jumpProbability,
        want.jumpProbability,
        "jumpProbability",
      );

      let positive = false;
      let action = "WAIT";

      if (!available) {
        manual.positiveStreak = 0;
      } else {
        positive =
          want.jumpProbability >= 0.5 &&
          want.jumpProbability >
            want.waitProbability;
        manual.positiveStreak =
          positive
            ? manual.positiveStreak + 1
            : 0;
        if (
          manual.positiveStreak >= 2
        ) {
          action = "JUMP";
        }
      }

      const got =
        api.chooseHistory(
          history,
          available,
          state,
          runtime,
        );

      if (
        got.action !== action ||
        got.positive !== positive ||
        got.positiveStreak !==
          manual.positiveStreak
      ) {
        throw new Error(
          "action state mismatch seed=" +
            row.seed +
            " window=" +
            index,
        );
      }

      if (action === "JUMP") {
        manual.cooldown = COOLDOWN_STEPS;
        manual.positiveStreak = 0;
        api.onActuatedJump(runtime);
      }

      cooldownComparisons += 1;
      compared += 1;
    }
  }

  const forced = api.createRuntime();
  const high = {
    selected: new Float64Array(256),
    standardized: new Float64Array(256),
    waitScore: 0,
    jumpScore: 2,
    waitProbability: 0.2,
    jumpProbability: 0.8,
  };
  const first =
    api.decideEvaluation(
      high,
      true,
      state,
      forced,
    );
  const second =
    api.decideEvaluation(
      high,
      true,
      state,
      forced,
    );
  api.onActuatedJump(forced);
  const unavailable =
    api.decideEvaluation(
      high,
      false,
      state,
      forced,
    );

  if (
    first.action !== "WAIT" ||
    second.action !== "JUMP" ||
    forced.positiveStreak !== 0 ||
    unavailable.action !== "WAIT" ||
    unavailable.positiveStreak !== 0
  ) {
    throw new Error(
      "forced persistence/unavailable mismatch",
    );
  }

  console.log(
    "V11H2-JUMP-REAL-INPUT-EQUIVALENCE=PASS " +
      "cases=" + cases.length +
      " decisions=" + compared +
      " cooldown=38 obstacleLC4=false",
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
