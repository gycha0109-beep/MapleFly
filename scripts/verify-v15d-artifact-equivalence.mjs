#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import "../src/brain/fly-skill-v15-potion.js";

const representationPath = resolve(
  process.env.V15A12_REPRESENTATION_FILE ??
    ".cache/v15a12-artifact/v15a12_screen.json",
);
const policyPath = resolve(
  process.env.V15B3_MODEL_FILE ??
    ".cache/v15b3-artifact/v15b3_training.json",
);

const repJson = JSON.parse(await readFile(representationPath, "utf8"));
const policyJson = JSON.parse(await readFile(policyPath, "utf8"));
const repEntry = repJson.representations.find(
  (row) => row.name === "FULL48_REWARD_ADVANTAGE",
);
const reference = repEntry.representation;
const browserApi = globalThis.MapleFlyPotionSkillV15;
const browser = browserApi.loadState();

function maxAbs(a, b) {
  if (a.length !== b.length) return Infinity;
  let max = 0;
  for (let i = 0; i < a.length; i += 1) {
    max = Math.max(max, Math.abs(Number(a[i]) - Number(b[i])));
  }
  return max;
}

const refSlots = reference.selectedSlots.map((row) => row.relativeSlot);
const slotMismatch = refSlots.reduce(
  (sum, value, index) =>
    sum + Number(value !== browser.selectedSlots[index]),
  0,
);

const waitError = maxAbs(
  policyJson.frozenModel.wait.weights,
  browser.wait.weights,
);
const drinkError = maxAbs(
  policyJson.frozenModel.drink.weights,
  browser.drink.weights,
);
const meanError = maxAbs(reference.means, browser.means);
const scaleError = maxAbs(reference.scales, browser.scales);
const waitBiasError = Math.abs(
  policyJson.frozenModel.wait.bias - browser.wait.bias,
);
const drinkBiasError = Math.abs(
  policyJson.frozenModel.drink.bias - browser.drink.bias,
);

const deploymentState =
  browser.status === "V15D_VALIDATED_CANDIDATE_NOT_DEPLOYED" &&
  browser.deploymentAllowed === false
    ? "CANDIDATE"
    : browser.status === "V15D_DEPLOYED" &&
        browser.deploymentAllowed === true
      ? "DEPLOYED"
      : null;

const checks = {
  deploymentState: deploymentState !== null,
  representationHash:
    browser.representationSha256 === repEntry.representationSha256,
  policyHash:
    browser.policySha256 === policyJson.frozenModelSha256,
  historyFrames: browser.historyFrames === 48,
  featureCount: browser.featureCount === 256,
  runtimeDnCount: browser.runtimeDnIndices.length === 24,
  slotMismatch: slotMismatch === 0,
  means: meanError <= 1e-15,
  scales: scaleError <= 1e-15,
  waitWeights: waitError <= 1e-15,
  waitBias: waitBiasError <= 1e-15,
  drinkWeights: drinkError <= 1e-15,
  drinkBias: drinkBiasError <= 1e-15,
};

console.log(
  "V15D-ARTIFACT-EQUIVALENCE=" +
    (Object.values(checks).every(Boolean) ? "PASS" : "FAIL") +
    " slots=" + slotMismatch +
    " meanErr=" + meanError +
    " scaleErr=" + scaleError +
    " waitErr=" + waitError +
    " waitBiasErr=" + waitBiasError +
    " drinkErr=" + drinkError +
    " drinkBiasErr=" + drinkBiasError +
    " runtimeDN=" + browser.runtimeDnIndices.length +\n    " deployment=" + String(deploymentState).toLowerCase(),
);

if (!Object.values(checks).every(Boolean)) {
  console.error(checks);
  process.exitCode = 1;
}
