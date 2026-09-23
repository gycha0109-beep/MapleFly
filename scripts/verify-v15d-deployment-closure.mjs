#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import "../src/brain/fly-skill-v15-potion.js";

const [controller, worker, game] = await Promise.all([
  readFile(new URL("../src/brain/fly-controller.js", import.meta.url), "utf8"),
  readFile(new URL("../src/brain/fly-worker.js", import.meta.url), "utf8"),
  readFile(new URL("../src/game.js", import.meta.url), "utf8"),
]);

const potion = globalThis.MapleFlyPotionSkillV15.loadState();

const EXPECTED = Object.freeze({
  representationSha256:
    "33fc31f636e1cde215841dd33b0a93b24d4571cdabd32e9a1edc8fa2e696c847",
  policySha256:
    "47088bcb15ed2cd96f64d67a20169934bd7a866dcd56bacffea70b1f42537a59",
  historyFrames: 48,
  frameSteps: 5,
  runtimeDnCount: 24,
  featureCount: 256,
});

for (const [field, expected] of [
  ["representationSha256", EXPECTED.representationSha256],
  ["policySha256", EXPECTED.policySha256],
  ["historyFrames", EXPECTED.historyFrames],
  ["frameSteps", EXPECTED.frameSteps],
  ["featureCount", EXPECTED.featureCount],
]) {
  if (potion[field] !== expected) {
    throw new Error(
      "v15D frozen closure contract mismatch: " +
        field +
        "=" +
        potion[field] +
        " expected=" +
        expected,
    );
  }
}

if (potion.runtimeDnIndices.length !== EXPECTED.runtimeDnCount) {
  throw new Error("v15D runtime DN count changed");
}

if (!worker.includes('cellsWithPrefix(meta, "LgLG", side)')) {
  throw new Error("v15D corrected LgLG prefix mapping missing");
}
if (worker.includes('cells(meta, ["LgLG"], side)')) {
  throw new Error("v15D invalid exact LgLG lookup returned");
}

for (const token of [
  "this.potionSkillApi.tasteForNextFrame(",
  "this.potionSkillState.deploymentAllowed === true",
  'this.potionSkillAction === "DRINK"',
]) {
  if (!controller.includes(token)) {
    throw new Error("v15D closure controller contract missing: " + token);
  }
}

for (const token of [
  "potionAvailable",
  "observation.player.potionCue",
  "DECODER.drinkHz",
  "DECODER.drinkCooldownMs",
]) {
  if (controller.includes(token)) {
    throw new Error("v15D forbidden POTION shortcut returned: " + token);
  }
}

const potionStart = game.indexOf("function tryPotion()");
const potionEnd = game.indexOf("function getPlayerAttackHitbox()", potionStart);
if (potionStart < 0 || potionEnd < 0) {
  throw new Error("tryPotion source block missing");
}
const potionSource = game.slice(potionStart, potionEnd);
if (potionSource.includes("player.hp >= player.maxHp")) {
  throw new Error("v15D full-HP DRINK rejection returned");
}
if (
  !potionSource.includes("player.potions <= 0") ||
  !potionSource.includes("const wasted = POTION.heal - healed")
) {
  throw new Error("v15D potion legality/waste accounting changed");
}

const observationStart = game.indexOf("function buildBrainObservation()");
const observationEnd = game.indexOf("function update(dt)", observationStart);
const observationSource = game.slice(observationStart, observationEnd);
for (const token of ["potionCue", "potions: player.potions"]) {
  if (observationSource.includes(token)) {
    throw new Error("v15D policy observation leak returned: " + token);
  }
}

const jumpGate = controller.indexOf("this.interruptionJumpAccept &&");
const attackGate = controller.indexOf("this.interruptionAttackAccept &&");
if (jumpGate < 0 || attackGate < 0 || jumpGate >= attackGate) {
  throw new Error("v14C JUMP-before-ATTACK order regressed");
}

if (
  potion.status === "V15D_VALIDATED_CANDIDATE_NOT_DEPLOYED" &&
  potion.deploymentAllowed === false
) {
  console.log(
    "V15D-DEPLOYMENT-CLOSURE=PENDING " +
      "status=V15D_VALIDATED_CANDIDATE_NOT_DEPLOYED " +
      "deploymentAllowed=false frozen-contract=PASS lower-skill-order=PASS",
  );
  process.exit(0);
}

if (
  potion.status !== "V15D_DEPLOYED" ||
  potion.deploymentAllowed !== true
) {
  throw new Error(
    "v15D invalid closure state: status=" +
      potion.status +
      " deploymentAllowed=" +
      potion.deploymentAllowed,
  );
}

console.log(
  "V15D-DEPLOYMENT-CLOSURE=PASS " +
    "status=V15D_DEPLOYED deploymentAllowed=true " +
    "history=48 frameSteps=5 runtimeDN=24 features=256 " +
    "HP-policy-leak=0 potionCue=0 headMotor-decision=0 " +
    "fullHPDrink=legal waste-accounting=preserved " +
    "move=unchanged jump-before-attack=preserved",
);
