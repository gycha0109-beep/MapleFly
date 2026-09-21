#!/usr/bin/env node
import fs from "node:fs";
import "../src/brain/fly-skill-v11-jump.js";

const api = globalThis.MapleFlyJumpSkillV11;
const state = api.BUNDLED_STATE;
const candidate = JSON.parse(
  fs.readFileSync(
    "src/brain/fly-skill-v11f-jump-candidate.json",
    "utf8",
  ),
);

function sameArray(a, b, name) {
  if (a.length !== b.length) {
    throw new Error(name + " length mismatch");
  }
  for (let i = 0; i < a.length; i += 1) {
    if (!Object.is(a[i], b[i])) {
      throw new Error(
        name + " mismatch at " + i + ": " + a[i] + " != " + b[i],
      );
    }
  }
}

if (!api.validState(state)) {
  throw new Error("bundled state invalid");
}
if (state.sourceRun !== candidate.provenance.runId) {
  throw new Error("source run mismatch");
}
if (state.sourceHeadSha !== candidate.provenance.headSha) {
  throw new Error("source head mismatch");
}
if (state.sourceArtifact !== candidate.provenance.artifactId) {
  throw new Error("source artifact mismatch");
}
if (
  state.sourceArtifactDigest !==
  "sha256:" + candidate.provenance.artifactDigest
) {
  throw new Error("source digest mismatch");
}
if (state.brainCommit !== candidate.brain.commit) {
  throw new Error("brain commit mismatch");
}
if (state.jumpThreshold !== candidate.classifier.threshold) {
  throw new Error("threshold mismatch");
}
if (
  state.persistenceWindows !==
  candidate.temporal.positivePersistenceWindows
) {
  throw new Error("persistence mismatch");
}
if (
  state.cooldownBrainSteps !==
  candidate.actuator.cooldownBrainSteps
) {
  throw new Error("cooldown mismatch");
}

sameArray(
  state.selectedIndices,
  candidate.classifier.featureIndices,
  "selectedIndices",
);
sameArray(state.means, candidate.classifier.means, "means");
sameArray(state.scales, candidate.classifier.scales, "scales");
sameArray(state.weights, candidate.classifier.weights, "weights");
if (!Object.is(state.bias, candidate.classifier.bias)) {
  throw new Error("bias mismatch");
}

const raw = new Float64Array(1316);
for (let i = 0; i < raw.length; i += 1) {
  raw[i] = Math.max(
    -1,
    Math.min(1, Math.sin(i * 0.37) * 0.5),
  );
}

let manualScore = candidate.classifier.bias;
for (
  let slot = 0;
  slot < candidate.classifier.featureIndices.length;
  slot += 1
) {
  const dn = candidate.classifier.featureIndices[slot];
  const z = Math.max(
    -5,
    Math.min(
      5,
      (raw[dn] - candidate.classifier.means[slot]) /
        candidate.classifier.scales[slot],
    ),
  );
  manualScore += candidate.classifier.weights[slot] * z;
}
const bundleScore = api.scoreRaw(raw, state);
if (Math.abs(manualScore - bundleScore) > 1e-12) {
  throw new Error(
    "score mismatch: " + manualScore + " != " + bundleScore,
  );
}

const runtime = api.createRuntime();
const first = api.decideProbability
  ? api.decideProbability(1, state, runtime)
  : null;
if (first !== null) {
  throw new Error("private helper unexpectedly exported");
}
const sparse = new Float64Array(128);
for (let i = 0; i < sparse.length; i += 1) {
  sparse[i] = candidate.classifier.means[i];
}
const rt = api.createRuntime();
const a = api.chooseSparseCurrent(sparse, state, rt);
api.resetRuntime(rt);
api.onActuatedJump(rt);
if (rt.positiveStreak !== 0) {
  throw new Error("runtime reset mismatch");
}
if (!["WAIT", "JUMP"].includes(a.action)) {
  throw new Error("invalid action");
}

console.log(
  "V11F-JUMP-BUNDLE-STATIC=PASS " +
    "features=128 threshold=0.5 persistence=2 cooldown=38",
);
