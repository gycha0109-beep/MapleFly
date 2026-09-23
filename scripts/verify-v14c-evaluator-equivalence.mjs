#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import "../src/brain/fly-interruption-v14b.js";

const api = globalThis.MapleFlyInterruptionV14B;
const candidate = JSON.parse(
  await readFile(
    new URL("../src/brain/fly-interruption-v14b-candidate.json", import.meta.url),
    "utf8",
  ),
);

if (
  candidate.status !== "V14C_VALIDATED_CANDIDATE_NOT_DEPLOYED" ||
  candidate.source.runId !== 35798458282 ||
  candidate.validation?.runId !== 35799237521 ||
  candidate.historyFrames !== 12 ||
  candidate.frameSize !== 8 ||
  candidate.featureCount !== 96
) {
  throw new Error("v14C candidate provenance mismatch");
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function referenceFrame(
  moveConfidence,
  attackProbability,
  jumpProbability,
  waitProbability,
  didJump,
  didAttack,
) {
  const move = clamp(Number(moveConfidence) || 0, 0, 1);
  const attack = clamp(Number(attackProbability) || 0, 0, 1);
  const jump = clamp(Number(jumpProbability) || 0, 0, 1);
  const wait = clamp(Number(waitProbability) || 0, 0, 1);
  return [
    move,
    attack,
    attack - 0.5,
    jump,
    wait,
    jump - wait,
    didJump ? 1 : 0,
    didAttack ? 1 : 0,
  ];
}

function sigmoid(value) {
  if (value >= 0) {
    const z = Math.exp(-value);
    return 1 / (1 + z);
  }
  const z = Math.exp(value);
  return z / (1 + z);
}

function referenceProbability(policy, feature) {
  let score = Number(policy.bias) || 0;
  for (let i = 0; i < feature.length; i += 1) {
    score += (Number(policy.weights[i]) || 0) * feature[i];
  }
  return sigmoid(score);
}

const browserHistory = api.createHistory();
const referenceHistory = Array.from(
  { length: 12 },
  () => Array(8).fill(0),
);

const attackPolicy = {
  bias: candidate.policies.attack.bias,
  weights: Float64Array.from(candidate.policies.attack.weights),
};
const jumpPolicy = {
  bias: candidate.policies.jump.bias,
  weights: Float64Array.from(candidate.policies.jump.weights),
};

let maxHistoryError = 0;
let maxAttackProbabilityError = 0;
let maxJumpProbabilityError = 0;
let attackDecisionMismatch = 0;
let jumpDecisionMismatch = 0;
let comparisons = 0;

for (let step = 0; step < 96; step += 1) {
  const move = ((step * 17 + 3) % 101) / 100;
  const attack = ((step * 29 + 11) % 103) / 102;
  const jump = ((step * 37 + 7) % 107) / 106;
  const wait = ((step * 43 + 13) % 109) / 108;
  const didJump = step % 11 === 3 || step % 17 === 5;
  const didAttack = step % 7 === 2 || step % 19 === 4;

  const browserFrame = api.makeFrame(
    move,
    attack,
    jump,
    wait,
    didJump,
    didAttack,
  );
  const refFrame = referenceFrame(
    move,
    attack,
    jump,
    wait,
    didJump,
    didAttack,
  );

  api.pushFrame(browserHistory, browserFrame);
  referenceHistory.shift();
  referenceHistory.push(refFrame);

  const browserFeature = api.concatHistory(browserHistory);
  const referenceFeature = referenceHistory.flat();

  for (let i = 0; i < browserFeature.length; i += 1) {
    maxHistoryError = Math.max(
      maxHistoryError,
      Math.abs(browserFeature[i] - referenceFeature[i]),
    );
  }

  for (const [name, policy] of [
    ["attack", attackPolicy],
    ["jump", jumpPolicy],
  ]) {
    const browser = api.choose(policy, browserFeature, () => 0.5, true);
    const reference = referenceProbability(policy, referenceFeature);
    const error = Math.abs(browser.probability - reference);
    const refDecision = reference >= 0.5;
    if (name === "attack") {
      maxAttackProbabilityError = Math.max(
        maxAttackProbabilityError,
        error,
      );
      if (browser.accept !== refDecision) attackDecisionMismatch += 1;
    } else {
      maxJumpProbabilityError = Math.max(
        maxJumpProbabilityError,
        error,
      );
      if (browser.accept !== refDecision) jumpDecisionMismatch += 1;
    }
  }
  comparisons += 1;
}

const pass =
  maxHistoryError <= 1e-12 &&
  maxAttackProbabilityError <= 1e-12 &&
  maxJumpProbabilityError <= 1e-12 &&
  attackDecisionMismatch === 0 &&
  jumpDecisionMismatch === 0;

console.log(
  "V14C-EVALUATOR-EQUIVALENCE=" +
    (pass ? "PASS" : "FAIL") +
    " comparisons=" +
    comparisons +
    " historyError=" +
    maxHistoryError +
    " attackError=" +
    maxAttackProbabilityError +
    " jumpError=" +
    maxJumpProbabilityError +
    " attackMismatch=" +
    attackDecisionMismatch +
    " jumpMismatch=" +
    jumpDecisionMismatch,
);

if (!pass) process.exitCode = 1;
