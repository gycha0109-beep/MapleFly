#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  SOURCE,
  ConnectomeBrain,
  cells,
  cellsWithPrefix,
  loadConnectome,
} from "../src/headless/connectome-runtime.mjs";

const STEP_SECONDS = 0.02;
const SETTLE_STEPS = 26;
const BASELINE_STEPS = 26;
const LIVE_STEPS = 150;
const IMPACT_START = 25;
const IMPACT_PULSE_STEPS = 6;
const IMPACT_DRIVE = 0.7;
const DN_COUNT = 1316;
const EXPECTED_L = 331;
const EXPECTED_R = 338;
const SEEDS = [
  2799000, 2799001, 2799002, 2799003,
  2799004, 2799005, 2799006, 2799007,
];
const PREREG_COMMIT = "df7e47271e4d9ca96786f55eb5d3995d25350325";

function groundDrive() {
  return { SNta_L: 0.05, SNta_R: 0.05 };
}

function stimulate(brain, inputGroups, drive) {
  for (const [name, amount] of Object.entries(drive)) {
    if (!amount) continue;
    const indices = inputGroups.get(name);
    if (indices?.length) brain.stimulate(indices, amount);
  }
}

function buildDnContract(meta) {
  const allDn = cells(meta, ["descending_neuron", "descending_neuron_tbc"]);
  if (allDn.length !== DN_COUNT) throw new Error("DN contract mismatch");
  const slot = new Int16Array(meta.n).fill(-1);
  const mask = new Uint8Array(meta.n);
  allDn.forEach((neuron, index) => {
    slot[neuron] = index;
    mask[neuron] = 1;
  });
  return { allDn, slot, mask };
}

function firedSymmetricDifference(a, b) {
  let i = 0, j = 0, diff = 0;
  while (i < a.firedCount || j < b.firedCount) {
    if (i >= a.firedCount) return diff + b.firedCount - j;
    if (j >= b.firedCount) return diff + a.firedCount - i;
    const av = a.fired[i], bv = b.fired[j];
    if (av === bv) { i += 1; j += 1; }
    else if (av < bv) { diff += 1; i += 1; }
    else { diff += 1; j += 1; }
  }
  return diff;
}

function makeMask(n, indices) {
  const mask = new Uint8Array(n);
  for (const index of indices) mask[index] = 1;
  return mask;
}

function firedInMask(brain, mask) {
  let count = 0;
  for (let i = 0; i < brain.firedCount; i += 1) {
    if (mask[brain.fired[i]]) count += 1;
  }
  return count;
}

function dnSpikeDifference(onBrain, offBrain, dnSlot) {
  const state = new Int8Array(DN_COUNT);
  for (let i = 0; i < onBrain.firedCount; i += 1) {
    const slot = dnSlot[onBrain.fired[i]];
    if (slot >= 0) state[slot] += 1;
  }
  for (let i = 0; i < offBrain.firedCount; i += 1) {
    const slot = dnSlot[offBrain.fired[i]];
    if (slot >= 0) state[slot] -= 1;
  }
  let diff = 0;
  for (let i = 0; i < DN_COUNT; i += 1) diff += Math.abs(state[i]);
  return diff;
}

function voltageDifference(onBrain, offBrain, indices = null) {
  let sumSquares = 0;
  let maxAbs = 0;
  if (indices) {
    for (const neuron of indices) {
      const delta = onBrain.v[neuron] - offBrain.v[neuron];
      sumSquares += delta * delta;
      maxAbs = Math.max(maxAbs, Math.abs(delta));
    }
  } else {
    for (let neuron = 0; neuron < onBrain.n; neuron += 1) {
      const delta = onBrain.v[neuron] - offBrain.v[neuron];
      sumSquares += delta * delta;
      maxAbs = Math.max(maxAbs, Math.abs(delta));
    }
  }
  return { l2: Math.sqrt(sumSquares), maxAbs };
}

function structuralReachability(connectome, sources, dnMask) {
  const { n, colPtr, rowIdx } = connectome.weights;
  const visited = new Uint8Array(n);
  let frontier = Array.from(sources);
  for (const source of frontier) visited[source] = 1;
  const levels = [];

  for (let depth = 1; depth <= 3; depth += 1) {
    const next = [];
    for (const presynaptic of frontier) {
      for (
        let edge = colPtr[presynaptic];
        edge < colPtr[presynaptic + 1];
        edge += 1
      ) {
        const post = rowIdx[edge];
        if (!visited[post]) {
          visited[post] = 1;
          next.push(post);
        }
      }
    }
    let cumulativeUnique = 0;
    let cumulativeDn = 0;
    for (let neuron = 0; neuron < n; neuron += 1) {
      if (!visited[neuron]) continue;
      cumulativeUnique += 1;
      if (dnMask[neuron]) cumulativeDn += 1;
    }
    levels.push({
      depth,
      newUnique: next.length,
      cumulativeUnique: cumulativeUnique - sources.length,
      cumulativeDn,
    });
    frontier = next;
  }
  return levels;
}

async function runPair(connectome, dn, seed, side) {
  const onBrain = new ConnectomeBrain(connectome.weights, connectome.meta.params, seed);
  const offBrain = new ConnectomeBrain(connectome.weights, connectome.meta.params, seed);
  const group = connectome.inputGroups.get("LgLG_" + side);
  const groupMask = makeMask(connectome.meta.n, group);

  for (let step = 0; step < SETTLE_STEPS + BASELINE_STEPS; step += 1) {
    const drive = groundDrive();
    stimulate(onBrain, connectome.inputGroups, drive);
    stimulate(offBrain, connectome.inputGroups, drive);
    onBrain.step();
    offBrain.step();
  }

  let pulseInputFireDiff = 0;
  let inputVoltageMaxAbs = 0;
  let wholeFireDiff = 0;
  let wholeVoltageMaxAbs = 0;
  let dnSpikeMismatch = 0;
  let dnVoltageMaxAbs = 0;
  let frameDn = 0;
  const frames = [];

  for (let step = 0; step < LIVE_STEPS; step += 1) {
    const onDrive = groundDrive();
    const offDrive = groundDrive();
    const pulse = step >= IMPACT_START && step < IMPACT_START + IMPACT_PULSE_STEPS;
    if (pulse) onDrive["LgLG_" + side] = IMPACT_DRIVE;

    stimulate(onBrain, connectome.inputGroups, onDrive);
    stimulate(offBrain, connectome.inputGroups, offDrive);
    onBrain.step();
    offBrain.step();

    if (pulse) {
      pulseInputFireDiff += Math.abs(
        firedInMask(onBrain, groupMask) - firedInMask(offBrain, groupMask),
      );
    }
    inputVoltageMaxAbs = Math.max(
      inputVoltageMaxAbs,
      voltageDifference(onBrain, offBrain, group).maxAbs,
    );

    wholeFireDiff += firedSymmetricDifference(onBrain, offBrain);
    wholeVoltageMaxAbs = Math.max(
      wholeVoltageMaxAbs,
      voltageDifference(onBrain, offBrain).maxAbs,
    );

    const dnDiff = dnSpikeDifference(onBrain, offBrain, dn.slot);
    dnSpikeMismatch += dnDiff;
    frameDn += dnDiff;
    dnVoltageMaxAbs = Math.max(
      dnVoltageMaxAbs,
      voltageDifference(onBrain, offBrain, dn.allDn).maxAbs,
    );

    if ((step + 1) % 5 === 0) {
      frames.push({
        frame: (step + 1) / 5 - 1,
        endStep: step,
        dnSpikeMismatch: frameDn,
      });
      frameDn = 0;
    }
  }

  return {
    seed,
    side,
    groupCount: group.length,
    pulseInputFireDiff,
    inputVoltageMaxAbs,
    wholeFireDiff,
    wholeVoltageMaxAbs,
    dnSpikeMismatch,
    dnVoltageMaxAbs,
    frames,
  };
}

async function main() {
  const outDir = resolve("results/experiment-v15a2-lglg-family-propagation");
  await mkdir(outDir, { recursive: true });

  const connectome = await loadConnectome({
    cacheDir: resolve(".cache/maplefly-connectome"),
    onProgress(message) {
      console.log("[connectome] " + message);
    },
  });
  const dn = buildDnContract(connectome.meta);

  const left = cellsWithPrefix(connectome.meta, "LgLG", "L");
  const right = cellsWithPrefix(connectome.meta, "LgLG", "R");
  connectome.inputGroups.set("LgLG_L", left);
  connectome.inputGroups.set("LgLG_R", right);

  const sourceSet = new Set([...left, ...right]);
  const reachability = structuralReachability(
    connectome,
    Array.from(sourceSet),
    dn.mask,
  );

  const pairs = [];
  for (let index = 0; index < SEEDS.length; index += 1) {
    const side = index % 2 === 0 ? "L" : "R";
    const row = await runPair(connectome, dn, SEEDS[index], side);
    pairs.push(row);
    console.log(
      "[v15A2] seed=" + row.seed +
      " side=" + side +
      " group=" + row.groupCount +
      " inputFireDiff=" + row.pulseInputFireDiff +
      " wholeFireDiff=" + row.wholeFireDiff +
      " dnSpikeDiff=" + row.dnSpikeMismatch +
      " dnV=" + row.dnVoltageMaxAbs.toExponential(3),
    );
  }

  const reach3Dn = reachability.at(-1)?.cumulativeDn ?? 0;
  const gateChecks = {
    leftCount: left.length === EXPECTED_L,
    rightCount: right.length === EXPECTED_R,
    reach3Dn: reach3Dn > 0,
    everyPairInputFire: pairs.every((row) => row.pulseInputFireDiff > 0),
    everyPairWholeFire: pairs.every((row) => row.wholeFireDiff > 0),
    everyPairDnSpike: pairs.every((row) => row.dnSpikeMismatch > 0),
  };
  const pass = Object.values(gateChecks).every(Boolean);

  const output = {
    schema: "maplefly.v15a2.lglg-family-propagation.1",
    brainRepository: SOURCE.repository,
    brainCommit: SOURCE.commit,
    preregistration: {
      path: "history/prereg_v15a2.md",
      commit: PREREG_COMMIT,
    },
    mapping: {
      method: "cellsWithPrefix(meta, 'LgLG', side)",
      leftCount: left.length,
      rightCount: right.length,
      expectedLeft: EXPECTED_L,
      expectedRight: EXPECTED_R,
    },
    stimulus: {
      drive: IMPACT_DRIVE,
      pulseSteps: IMPACT_PULSE_STEPS,
      pulseMs: IMPACT_PULSE_STEPS * STEP_SECONDS * 1000,
    },
    reachability,
    reach3Dn,
    seeds: SEEDS,
    gateChecks,
    pass,
    pairs,
  };

  await writeFile(
    resolve(outDir, "v15a2_propagation.json"),
    JSON.stringify(output, null, 2) + "\n",
  );

  console.log(
    "V15A2-LGLG-FAMILY-PROPAGATION=" +
      (pass ? "PASS" : "FAIL") +
      " L=" + left.length +
      " R=" + right.length +
      " reach3DN=" + reach3Dn +
      " minInputFire=" + Math.min(...pairs.map((row) => row.pulseInputFireDiff)) +
      " minWholeFire=" + Math.min(...pairs.map((row) => row.wholeFireDiff)) +
      " minDnSpike=" + Math.min(...pairs.map((row) => row.dnSpikeMismatch)),
  );

  if (!pass) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
