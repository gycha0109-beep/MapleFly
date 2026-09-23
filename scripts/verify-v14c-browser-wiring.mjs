#!/usr/bin/env node
import { readFile } from "node:fs/promises";

const controller = await readFile(
  new URL("../src/brain/fly-controller.js", import.meta.url),
  "utf8",
);
const index = await readFile(
  new URL("../index.html", import.meta.url),
  "utf8",
);
const candidate = JSON.parse(
  await readFile(
    new URL(
      "../src/brain/fly-interruption-v14b-candidate.json",
      import.meta.url,
    ),
    "utf8",
  ),
);

const requiredController = [
  "global.MapleFlyInterruptionV14B",
  "candidate.source?.runId !== 35798458282",
  "candidate.validation?.runId !== 35799237521",
  "candidate.deploymentAllowed !== true",
  "candidate.deployment?.closureRunId !== 35803350811",
  "candidate.historyFrames !== 12",
  "candidate.featureCount !== 96",
  "this.interruptionApi.makeFrame(",
  "this.interruptionApi.concatHistory(",
  "this.interruptionState.jump",
  "this.interruptionState.attack",
  "decisionStep === this.interruptionDecisionStep",
  "this.interruptionPreviousDidJump = jump",
  "this.interruptionPreviousDidAttack = attack",
];

for (const token of requiredController) {
  if (!controller.includes(token)) {
    throw new Error("v14C browser wiring missing: " + token);
  }
}

const jumpGate = controller.indexOf(
  "this.interruptionJumpAccept &&",
);
const attackGate = controller.indexOf(
  "this.interruptionAttackAccept &&",
);
if (jumpGate < 0 || attackGate < 0 || jumpGate >= attackGate) {
  throw new Error(
    "v14C browser action order must gate JUMP before ATTACK",
  );
}

if (
  !index.includes(
    './src/brain/fly-interruption-v14b.js',
  )
) {
  throw new Error("v14C interruption module not page-loaded");
}

if (
  candidate.status !==
    "V14C_DEPLOYED" ||
  candidate.deploymentAllowed !== true ||
  candidate.deployment?.closureRunId !== 35803350811 ||
  candidate.source.runId !== 35798458282 ||
  candidate.validation.runId !== 35799237521 ||
  candidate.historyFrames !== 12 ||
  candidate.featureCount !== 96 ||
  candidate.policies.attack.weights.length !== 96 ||
  candidate.policies.jump.weights.length !== 96
) {
  throw new Error("v14C candidate contract mismatch");
}

console.log(
  "V14C-BROWSER-WIRING=PASS history=12 features=96 " +
    "move=ungated attack=dual-head jump=dual-head " +
    "source=35798458282 validation=35799237521 deployment=35803350811",
);
