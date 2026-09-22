#!/usr/bin/env node
import fs from "node:fs";
import "../src/brain/fly-skill-v11h2-jump.js";

const api = globalThis.MapleFlyJumpSkillV11H2;
const state = api?.loadState?.();
if (!state || !api.validState(state)) {
  throw new Error("v11H2 deployed bundle invalid");
}
if (
  state.deploymentStatus !== "DEPLOYED" ||
  state.provenance.h2.runId !== 35748844599 ||
  state.provenance.h2.artifactId !== 10704546925 ||
  state.sensory.obstacleUsesLC4 !== false ||
  state.sparseFeatureCount !== 96 ||
  state.temporalWindows !== 4 ||
  state.threshold !== 0.5 ||
  state.persistenceWindows !== 2 ||
  state.cooldownBrainSteps !== 38
) {
  throw new Error("v11H2 deployed contract mismatch");
}

const controller = fs.readFileSync(
  "src/brain/fly-controller.js",
  "utf8",
);
const worker = fs.readFileSync(
  "src/brain/fly-worker.js",
  "utf8",
);
const game = fs.readFileSync(
  "src/game.js",
  "utf8",
);
const index = fs.readFileSync(
  "index.html",
  "utf8",
);

for (const token of [
  "MapleFlyJumpSkillV11H2",
  "runtimeDnIndices",
  "observeSparseWindow",
  "jumpCooldownSteps: 38",
  '"LC6"',
  '"LC16"',
  '"LC22"',
  '"LPLC4"',
]) {
  if (!controller.includes(token)) {
    throw new Error("controller missing " + token);
  }
}
if (
  controller.includes(
    "const key = `LC4_${obstacleSide}`",
  )
) {
  throw new Error(
    "obstacle LC4 collision path reintroduced",
  );
}
for (const token of [
  '"LC6"',
  '"LC16"',
  '"LC22"',
  '"LPLC4"',
]) {
  if (!worker.includes(token)) {
    throw new Error("worker missing " + token);
  }
}
for (const token of [
  "const JUMP_TUTORIAL",
  "const obstacle =",
  "obstacles: obstacle.active",
  "skillObstacle: false",
  "drawObstacle();",
  "playerFront + startDistance",
  "playerFront - startDistance",
  "matchedDistance - expectedDistance",
  "v11H2 matched geometry mismatch",
]) {
  if (!game.includes(token)) {
    throw new Error("game missing " + token);
  }
}
if (
  !index.includes(
    "src/brain/fly-skill-v11h2-jump.js",
  ) ||
  index.includes(
    "src/brain/fly-skill-v11-jump.js",
  )
) {
  throw new Error("index JUMP bundle mismatch");
}

console.log(
  "V11H2-COMBINED-WIRING-STATIC=PASS " +
    "move=v7 attack=v10F jump=v11H2 " +
    "sparse=96 CONCAT4 obstacleLC4=false",
);
