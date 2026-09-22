#!/usr/bin/env node
import fs from "node:fs";

const CANDIDATE_PATH =
  "src/brain/fly-skill-v11h2-jump-candidate.json";
const OUT_PATH =
  "src/brain/fly-skill-v11h2-jump.js";

const source = JSON.parse(
  fs.readFileSync(CANDIDATE_PATH, "utf8"),
);
const c = source.candidate;

if (
  source.status !== "frozen-authoritative-pass-not-deployed" ||
  source.acceptance?.gate !== true ||
  source.sensory?.obstacleUsesLC4 !== false ||
  source.representation?.type !== "CONCAT4" ||
  source.representation?.rawFeatureCount !== 5264 ||
  source.representation?.historyWindows !== 4 ||
  c.selectedIndices?.length !== 256 ||
  c.selectedTemporalSlots?.length !== 256 ||
  c.means?.length !== 256 ||
  c.scales?.length !== 256 ||
  c.waitWeights?.length !== 256 ||
  c.jumpWeights?.length !== 256 ||
  c.threshold !== 0.5 ||
  c.persistenceWindows !== 2 ||
  source.policy?.cooldownSteps !== 38
) {
  throw new Error("v11H2 frozen candidate contract mismatch");
}

const state = {
  schema: "maplefly.fly-jump-skill.v11h2.1",
  flyId: "Fly #001",
  version: source.version,
  deploymentStatus: "WITHHELD",
  provenance: source.provenance,
  brainCommit: source.brain.commit,
  dnCount: source.brain.dnCount,
  temporalWindows: source.representation.historyWindows,
  rawFeatureCount: source.representation.rawFeatureCount,
  selectedFeatureCount: source.representation.selectedFeatureCount,
  threshold: c.threshold,
  persistenceWindows: c.persistenceWindows,
  cooldownBrainSteps: source.policy.cooldownSteps,
  sensory: source.sensory,
  selectedIndices: c.selectedIndices,
  selectedTemporalSlots: c.selectedTemporalSlots,
  means: c.means,
  scales: c.scales,
  waitWeights: c.waitWeights,
  waitBias: c.waitBias,
  jumpWeights: c.jumpWeights,
  jumpBias: c.jumpBias,
};

const bundled = JSON.stringify(state, null, 2);

const code = `(function attachMapleFlyJumpSkillV11H2(global) {
  "use strict";

  const BUNDLED_STATE = Object.freeze(${bundled});

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function sigmoid(value) {
    const bounded = clamp(value, -30, 30);
    return 1 / (1 + Math.exp(-bounded));
  }

  function validState(state) {
    return Boolean(
      state &&
      state.schema === "maplefly.fly-jump-skill.v11h2.1" &&
      state.version === "v11h2-after-run-35748844599" &&
      state.deploymentStatus === "WITHHELD" &&
      state.brainCommit ===
        "95a3dbcb05241b0a5c07028ca8ad945b23fbbe6e" &&
      state.dnCount === 1316 &&
      state.temporalWindows === 4 &&
      state.rawFeatureCount === 5264 &&
      state.selectedFeatureCount === 256 &&
      state.threshold === 0.5 &&
      state.persistenceWindows === 2 &&
      state.cooldownBrainSteps === 38 &&
      state.sensory?.obstacleUsesLC4 === false &&
      Array.isArray(state.selectedIndices) &&
      Array.isArray(state.selectedTemporalSlots) &&
      Array.isArray(state.means) &&
      Array.isArray(state.scales) &&
      Array.isArray(state.waitWeights) &&
      Array.isArray(state.jumpWeights) &&
      state.selectedIndices.length === 256 &&
      state.selectedTemporalSlots.length === 256 &&
      state.means.length === 256 &&
      state.scales.length === 256 &&
      state.waitWeights.length === 256 &&
      state.jumpWeights.length === 256 &&
      state.scales.every(
        (value) => Number.isFinite(value) && value > 0,
      ) &&
      Number.isFinite(state.waitBias) &&
      Number.isFinite(state.jumpBias)
    );
  }

  function createRuntime() {
    return {
      positiveStreak: 0,
      history: [],
    };
  }

  function resetRuntime(runtime) {
    runtime.positiveStreak = 0;
    runtime.history.length = 0;
    return runtime;
  }

  function onActuatedJump(runtime) {
    runtime.positiveStreak = 0;
    return runtime;
  }

  function pushWindow(
    windowFeature,
    state = BUNDLED_STATE,
    runtime = createRuntime(),
  ) {
    if (
      !windowFeature ||
      windowFeature.length !== state.dnCount
    ) {
      throw new Error(
        "v11H2 window feature length mismatch",
      );
    }
    runtime.history.push(
      Float64Array.from(windowFeature),
    );
    if (
      runtime.history.length >
      state.temporalWindows
    ) {
      runtime.history.shift();
    }
    return runtime.history.length ===
      state.temporalWindows;
  }

  function selectedFromHistory(
    history,
    state = BUNDLED_STATE,
  ) {
    if (
      !Array.isArray(history) ||
      history.length !== state.temporalWindows
    ) {
      throw new Error(
        "v11H2 history window count mismatch",
      );
    }
    const selected = new Float64Array(
      state.selectedFeatureCount,
    );
    for (
      let slot = 0;
      slot < state.selectedFeatureCount;
      slot += 1
    ) {
      const temporal =
        state.selectedTemporalSlots[slot];
      const window = history[temporal.window];
      if (
        !window ||
        window.length !== state.dnCount
      ) {
        throw new Error(
          "v11H2 history DN length mismatch",
        );
      }
      selected[slot] =
        window[temporal.dnIndex];
    }
    return selected;
  }

  function standardizeSelected(
    selected,
    state = BUNDLED_STATE,
  ) {
    if (
      selected.length !==
      state.selectedFeatureCount
    ) {
      throw new Error(
        "v11H2 selected feature length mismatch",
      );
    }
    const z = new Float64Array(
      state.selectedFeatureCount,
    );
    for (
      let slot = 0;
      slot < z.length;
      slot += 1
    ) {
      z[slot] = clamp(
        (
          selected[slot] -
          state.means[slot]
        ) /
          state.scales[slot],
        -5,
        5,
      );
    }
    return z;
  }

  function scoreStandardized(
    standardized,
    weights,
    bias,
  ) {
    let score = bias;
    for (
      let slot = 0;
      slot < standardized.length;
      slot += 1
    ) {
      score +=
        weights[slot] *
        standardized[slot];
    }
    return score;
  }

  function evaluateHistory(
    history,
    state = BUNDLED_STATE,
  ) {
    const selected =
      selectedFromHistory(history, state);
    const standardized =
      standardizeSelected(selected, state);
    const waitScore =
      scoreStandardized(
        standardized,
        state.waitWeights,
        state.waitBias,
      );
    const jumpScore =
      scoreStandardized(
        standardized,
        state.jumpWeights,
        state.jumpBias,
      );
    return {
      selected,
      standardized,
      waitScore,
      jumpScore,
      waitProbability: sigmoid(waitScore),
      jumpProbability: sigmoid(jumpScore),
    };
  }

  function decideEvaluation(
    evaluation,
    available,
    state = BUNDLED_STATE,
    runtime = createRuntime(),
  ) {
    if (!available) {
      runtime.positiveStreak = 0;
      return {
        action: "WAIT",
        ...evaluation,
        positive: false,
        positiveStreak: 0,
      };
    }

    const positive =
      evaluation.jumpProbability >=
        state.threshold &&
      evaluation.jumpProbability >
        evaluation.waitProbability;

    runtime.positiveStreak = positive
      ? runtime.positiveStreak + 1
      : 0;

    return {
      action:
        runtime.positiveStreak >=
        state.persistenceWindows
          ? "JUMP"
          : "WAIT",
      ...evaluation,
      positive,
      positiveStreak:
        runtime.positiveStreak,
    };
  }

  function chooseHistory(
    history,
    available,
    state = BUNDLED_STATE,
    runtime = createRuntime(),
  ) {
    return decideEvaluation(
      evaluateHistory(history, state),
      Boolean(available),
      state,
      runtime,
    );
  }

  function observeWindow(
    windowFeature,
    available,
    state = BUNDLED_STATE,
    runtime = createRuntime(),
  ) {
    const ready =
      pushWindow(
        windowFeature,
        state,
        runtime,
      );
    if (!ready) {
      return {
        action: "WAIT",
        ready: false,
        waitProbability: null,
        jumpProbability: null,
        positive: false,
        positiveStreak:
          runtime.positiveStreak,
      };
    }
    return {
      ready: true,
      ...chooseHistory(
        runtime.history,
        available,
        state,
        runtime,
      ),
    };
  }

  global.MapleFlyJumpSkillV11H2 =
    Object.freeze({
      BUNDLED_STATE,
      validState,
      sigmoid,
      createRuntime,
      resetRuntime,
      onActuatedJump,
      pushWindow,
      selectedFromHistory,
      standardizeSelected,
      evaluateHistory,
      decideEvaluation,
      chooseHistory,
      observeWindow,
    });
})(globalThis);
`;

fs.writeFileSync(OUT_PATH, code);
console.log(
  "V11H2-JUMP-BUNDLE-BUILD=PASS " +
    "selected=256 windows=4 obstacleLC4=false",
);
