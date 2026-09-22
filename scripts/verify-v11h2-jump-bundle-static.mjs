#!/usr/bin/env node
import fs from "node:fs";
import "../src/brain/fly-skill-v11h2-jump.js";

const source = JSON.parse(
  fs.readFileSync(
    "src/brain/fly-skill-v11h2-jump-candidate.json",
    "utf8",
  ),
);
const c = source.candidate;
const api = globalThis.MapleFlyJumpSkillV11H2;
const state = api.BUNDLED_STATE;

function sameArray(a, b, name, tolerance = 0) {
  if (a.length !== b.length) {
    throw new Error(name + " length mismatch");
  }
  for (let i = 0; i < a.length; i += 1) {
    if (
      tolerance === 0
        ? !Object.is(a[i], b[i])
        : Math.abs(a[i] - b[i]) > tolerance
    ) {
      throw new Error(
        name + " mismatch at " + i,
      );
    }
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function sigmoid(value) {
  const bounded = clamp(value, -30, 30);
  return 1 / (1 + Math.exp(-bounded));
}

function reference(history) {
  const selected = new Float64Array(256);
  const standardized =
    new Float64Array(256);
  let waitScore = c.waitBias;
  let jumpScore = c.jumpBias;

  for (let slot = 0; slot < 256; slot += 1) {
    const x =
      c.selectedTemporalSlots[slot];
    selected[slot] =
      history[x.window][x.dnIndex];
    standardized[slot] = clamp(
      (
        selected[slot] -
        c.means[slot]
      ) /
        c.scales[slot],
      -5,
      5,
    );
    waitScore +=
      c.waitWeights[slot] *
      standardized[slot];
    jumpScore +=
      c.jumpWeights[slot] *
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

if (!api.validState(state)) {
  throw new Error("bundled state invalid");
}
if (
  state.sparseFeatureCount !== 96 ||
  state.runtimeDnIndices.length !== 96 ||
  state.selectedSparseSlots.length !== 256
) {
  throw new Error("runtime sparse contract mismatch");
}

if (
  state.provenance.h2.runId !==
    35748844599 ||
  state.provenance.h2.artifactId !==
    10704546925 ||
  state.provenance.h2.artifactDigest !==
    "sha256:de8cbd9f37704728605b1624e04c891bf47f329b81569553ab2e7be49b895495"
) {
  throw new Error("H2 provenance mismatch");
}
if (
  state.provenance.h1.runId !==
    35748359986 ||
  state.sensory.obstacleUsesLC4 !== false
) {
  throw new Error("H1/sensory provenance mismatch");
}

sameArray(
  state.selectedIndices,
  c.selectedIndices,
  "selectedIndices",
);
for (let i = 0; i < 256; i += 1) {
  const a = state.selectedTemporalSlots[i];
  const b = c.selectedTemporalSlots[i];
  if (
    a.index !== b.index ||
    a.window !== b.window ||
    a.dnIndex !== b.dnIndex ||
    a.index !==
      a.window * 1316 + a.dnIndex
  ) {
    throw new Error(
      "selectedTemporalSlots mismatch at " + i,
    );
  }
}
sameArray(state.means, c.means, "means");
sameArray(state.scales, c.scales, "scales");
sameArray(
  state.waitWeights,
  c.waitWeights,
  "waitWeights",
);
sameArray(
  state.jumpWeights,
  c.jumpWeights,
  "jumpWeights",
);
if (
  !Object.is(state.waitBias, c.waitBias) ||
  !Object.is(state.jumpBias, c.jumpBias)
) {
  throw new Error("bias mismatch");
}

const histories = [];
for (let trace = 0; trace < 12; trace += 1) {
  const history = [];
  for (let window = 0; window < 4; window += 1) {
    const x = new Float64Array(1316);
    for (let dn = 0; dn < 1316; dn += 1) {
      x[dn] = clamp(
        Math.sin(
          (trace + 1) * 0.113 +
          window * 0.71 +
          dn * 0.019,
        ) *
          0.83 +
          Math.cos(dn * 0.007) * 0.11,
        -1,
        1,
      );
    }
    history.push(x);
  }
  histories.push(history);
}

for (let i = 0; i < histories.length; i += 1) {
  const want = reference(histories[i]);
  const got =
    api.evaluateHistory(histories[i], state);
  sameArray(
    got.selected,
    want.selected,
    "selected trace " + i,
  );
  sameArray(
    got.standardized,
    want.standardized,
    "standardized trace " + i,
    1e-15,
  );
  for (const key of [
    "waitScore",
    "jumpScore",
    "waitProbability",
    "jumpProbability",
  ]) {
    if (
      Math.abs(got[key] - want[key]) >
      1e-15
    ) {
      throw new Error(
        key + " mismatch trace " + i,
      );
    }
  }
  const sparseHistory = histories[i].map(
    (window) =>
      Float64Array.from(
        state.runtimeDnIndices,
        (dnIndex) => window[dnIndex],
      ),
  );
  const sparseGot =
    api.evaluateSparseHistory(
      sparseHistory,
      state,
    );
  sameArray(
    sparseGot.selected,
    want.selected,
    "sparse selected trace " + i,
  );
  sameArray(
    sparseGot.standardized,
    want.standardized,
    "sparse standardized trace " + i,
    1e-15,
  );
  if (
    Math.abs(
      sparseGot.waitProbability -
        want.waitProbability,
    ) > 1e-15 ||
    Math.abs(
      sparseGot.jumpProbability -
        want.jumpProbability,
    ) > 1e-15
  ) {
    throw new Error(
      "sparse probability mismatch trace " + i,
    );
  }
}

const sparseRt = api.createRuntime();
for (let window = 0; window < 4; window += 1) {
  const sparse = Float64Array.from(
    state.runtimeDnIndices,
    (dnIndex) => histories[0][window][dnIndex],
  );
  const got = api.observeSparseWindow(
    sparse,
    true,
    state,
    sparseRt,
  );
  if (got.ready !== (window === 3)) {
    throw new Error(
      "sparse stream readiness mismatch window " +
        window,
    );
  }
}

const rt = api.createRuntime();
const manual = {
  positiveStreak: 0,
};
const availability = [
  true, true, false, true,
  true, true, true, false,
  true, true, true, true,
];

for (let i = 0; i < histories.length; i += 1) {
  const evalRef = reference(histories[i]);
  const available = availability[i];
  let manualAction = "WAIT";
  let positive = false;

  if (!available) {
    manual.positiveStreak = 0;
  } else {
    positive =
      evalRef.jumpProbability >= 0.5 &&
      evalRef.jumpProbability >
        evalRef.waitProbability;
    manual.positiveStreak = positive
      ? manual.positiveStreak + 1
      : 0;
    manualAction =
      manual.positiveStreak >= 2
        ? "JUMP"
        : "WAIT";
  }

  const got = api.chooseHistory(
    histories[i],
    available,
    state,
    rt,
  );

  if (
    got.action !== manualAction ||
    got.positive !== positive ||
    got.positiveStreak !==
      manual.positiveStreak
  ) {
    throw new Error(
      "decision transition mismatch trace " + i,
    );
  }

  if (got.action === "JUMP") {
    api.onActuatedJump(rt);
    manual.positiveStreak = 0;
  }
}

const streamRt = api.createRuntime();
for (let window = 0; window < 4; window += 1) {
  const got = api.observeWindow(
    histories[0][window],
    true,
    state,
    streamRt,
  );
  if (got.ready !== (window === 3)) {
    throw new Error(
      "stream readiness mismatch window " + window,
    );
  }
}
if (
  state.cooldownBrainSteps !== 38 ||
  state.threshold !== 0.5 ||
  state.persistenceWindows !== 2
) {
  throw new Error("frozen actuator contract mismatch");
}

console.log(
  "V11H2-JUMP-BUNDLE-STATIC=PASS " +
    "selected=256 sparse=96 windows=4 threshold=0.5 " +
    "persistence=2 cooldown=38 obstacleLC4=false",
);
