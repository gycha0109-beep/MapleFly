#!/usr/bin/env node
import fs from "node:fs";

const controller = fs.readFileSync(
  "src/brain/fly-controller.js",
  "utf8",
);
const game = fs.readFileSync("src/game.js", "utf8");
const index = fs.readFileSync("index.html", "utf8");

const requiredController = [
  "global.MapleFlyJumpSkillV11",
  'id: "jump-baseline"',
  'id: "jump"',
  "jumpWindowSteps: 5",
  "jumpCooldownSteps: 38",
  "positiveStreak",
  "this.playerGrounded",
  "this.nextJumpSkillStep",
  "observeUnavailableSparseCurrent",
  "this.jumpSkillApi.onActuatedJump",
  "observation.obstacles",
  "((280 - Math.max(0, frontDistance)) / 280) *",
];

for (const token of requiredController) {
  if (!controller.includes(token)) {
    throw new Error("controller contract missing: " + token);
  }
}

if (!controller.includes(
  'this.jumpSkillAction === "JUMP"',
)) {
  throw new Error("learned JUMP actuator missing");
}

if (!controller.includes(
  "decisionStep +\n            SKILL_RUNTIME.jumpCooldownSteps",
)) {
  throw new Error("38-step cooldown scheduling missing");
}

const requiredGame = [
  "obstacleWidth: 38",
  "obstacleHeight: 54",
  "targetOffset: 160",
  "distances: Object.freeze([155, 195, 235, 275])",
  "configureJumpTutorial(seed)",
  "skillObstacle = true",
  "resetArena(seed, { skillObstacle: false })",
  "obstacles: obstacle.active",
  "overlapsVertically",
  "overlapsHorizontally",
  "drawObstacle()",
];

for (const token of requiredGame) {
  if (!game.includes(token)) {
    throw new Error("game obstacle contract missing: " + token);
  }
}

const jumpScript =
  '<script src="./src/brain/fly-skill-v11-jump.js"></script>';
const controllerScript =
  '<script src="./src/brain/fly-controller.js"></script>';
if (
  !index.includes(jumpScript) ||
  !index.includes(controllerScript) ||
  index.indexOf(jumpScript) > index.indexOf(controllerScript)
) {
  throw new Error("JUMP bundle load order invalid");
}

console.log(
  "V11F-JUMP-RUNTIME-WIRING=PASS " +
    "window=5 persistence=2 cooldown=38 obstacle=38x54",
);
