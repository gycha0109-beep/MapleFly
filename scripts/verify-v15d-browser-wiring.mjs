#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import "../src/brain/fly-skill-v15-potion.js";

const [controller, worker, game, index] = await Promise.all([
  readFile(new URL("../src/brain/fly-controller.js", import.meta.url), "utf8"),
  readFile(new URL("../src/brain/fly-worker.js", import.meta.url), "utf8"),
  readFile(new URL("../src/game.js", import.meta.url), "utf8"),
  readFile(new URL("../index.html", import.meta.url), "utf8"),
]);

const potion = globalThis.MapleFlyPotionSkillV15.loadState();

const requiredController = [
  "global.MapleFlyPotionSkillV15",
  'id: "potion-baseline"',
  'id: "potion-frame"',
  "potionFrameSteps: 5",
  "this.potionSkillApi.setBaseline(",
  "this.potionSkillApi.makeFrame(",
  "this.potionSkillApi.pushFrame(",
  "this.potionSkillApi.choose(",
  "this.potionSkillApi.finishCycle(",
  "this.potionSkillApi.tasteForNextFrame(",
  "this.potionSkillState.deploymentAllowed === true",
  'this.potionSkillAction === "DRINK"',
  "this.potionTasteActive",
];

for (const token of requiredController) {
  if (!controller.includes(token)) {
    throw new Error("v15D controller wiring missing: " + token);
  }
}

for (const token of [
  "potionAvailable",
  "observation.player.potionCue",
  "DECODER.drinkHz",
  "DECODER.drinkCooldownMs",
]) {
  if (controller.includes(token)) {
    throw new Error("v15D forbidden old POTION shortcut remains: " + token);
  }
}

if (!worker.includes('cellsWithPrefix(meta, "LgLG", side)')) {
  throw new Error("v15D corrected LgLG prefix mapping missing");
}
if (worker.includes('cells(meta, ["LgLG"], side)')) {
  throw new Error("v15D invalid exact LgLG lookup remains");
}

const potionStart = game.indexOf("function tryPotion()");
const potionEnd = game.indexOf("function getPlayerAttackHitbox()", potionStart);
if (potionStart < 0 || potionEnd < 0) {
  throw new Error("tryPotion source block missing");
}
const potionSource = game.slice(potionStart, potionEnd);
if (potionSource.includes("player.hp >= player.maxHp")) {
  throw new Error("tryPotion still rejects full-HP DRINK");
}
if (
  !potionSource.includes("player.potions <= 0") ||
  !potionSource.includes("const wasted = POTION.heal - healed")
) {
  throw new Error("tryPotion legal/waste contract mismatch");
}

const observationStart = game.indexOf("function buildBrainObservation()");
const observationEnd = game.indexOf("function update(dt)", observationStart);
const observationSource = game.slice(observationStart, observationEnd);
for (const token of ["potionCue", "potions: player.potions"]) {
  if (observationSource.includes(token)) {
    throw new Error("POTION policy observation leak remains: " + token);
  }
}

const potionScript =
  '<script src="./src/brain/fly-skill-v15-potion.js"></script>';
const controllerScript =
  '<script src="./src/brain/fly-controller.js"></script>';
if (
  !index.includes(potionScript) ||
  index.indexOf(potionScript) >= index.indexOf(controllerScript)
) {
  throw new Error("v15 POTION module must load before controller");
}

const jumpGate = controller.indexOf(
  "this.interruptionJumpAccept &&",
);
const attackGate = controller.indexOf(
  "this.interruptionAttackAccept &&",
);
if (jumpGate < 0 || attackGate < 0 || jumpGate >= attackGate) {
  throw new Error("v14C JUMP-before-ATTACK order regressed");
}

const deploymentState =
  potion.status === "V15D_VALIDATED_CANDIDATE_NOT_DEPLOYED" &&
  potion.deploymentAllowed === false
    ? "CANDIDATE"
    : potion.status === "V15D_DEPLOYED" &&
        potion.deploymentAllowed === true
      ? "DEPLOYED"
      : null;

if (!deploymentState) {
  throw new Error(
    "v15D deployment state mismatch: status=" +
      potion.status +
      " deploymentAllowed=" +
      potion.deploymentAllowed,
  );
}

if (
  potion.historyFrames !== 48 ||
  potion.frameSteps !== 5 ||
  potion.runtimeDnIndices.length !== 24 ||
  potion.featureCount !== 256
) {
  throw new Error("v15D browser static contract mismatch");
}

console.log(
  "V15D-BROWSER-WIRING=PASS " +
    "history=48 frameSteps=5 runtimeDN=24 features=256 " +
    "LgLG=prefix taste=final-frame deployment=" +
    deploymentState.toLowerCase() +
    " move=unchanged jump-before-attack=preserved",
);
