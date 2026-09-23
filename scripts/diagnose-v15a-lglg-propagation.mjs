#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  SOURCE,
  ConnectomeBrain,
  cells,
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
const SEEDS = [
  2798000, 2798001, 2798002, 2798003,
  2798004, 2798005, 2798006, 2798007,
];
const PREREG_COMMIT = "c1434d2c2303b0224925039f8b5ed7b60b648537";

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
  if (allDn.length !== DN_COUNT) {
    throw new Error("DN contract mismatch: " + allDn.length);
  }
  const slot = new Int16Array(meta.n).fill(-1);
  const mask = new Uint8Array(meta.n);
  allDn.forEach((neuron, index) => {
    slot[neuron] = index;
    mask[neuron] = 1;
  });
  return { allDn, slot, mask };
}

function firedSymmetricDifference(a, b) {
  let i = 0;
  let j = 0;
  let diff = 0;
  while (i < a.firedCount || j < b.firedCount) {
    if (i >= a.firedCount) {
      diff += b.firedCount - j;
      break;
    }
    if (j >= b.firedCount) {
      diff += a.firedCount - i;
      break;
    }
    const av = a.fired[i];
    const bv = b.fired[j];
    if (av === bv) {
      i += 1;
      j += 1;
    } else if (av < bv) {
      diff += 1;
      i += 1;
    } else {
      diff += 1;
      j += 1;
    }
  }
  return diff;
}

function firedInGroup(brain, groupMask) {
  let count = 0;
  for (let index = 0; index < brain.firedCount; index += 1) {
    if (groupMask[brain.fired[index]]) count += 1;
  }
  return count;
}

function dnSpikeDifference(onBrain, offBrain, dnSlot) {
  const on = new Uint8Array(DN_COUNT);
  const off = new Uint8Array(DN_COUNT);
  for (let index = 0; index < onBrain.firedCount; index += 1) {
    const slot = dnSlot[onBrain.fired[index]];
    if (slot >= 0) on[slot] = 1;
  }
  for (let index = 0; index < offBrain.firedCount; index += 1) {
    const slot = dnSlot[offBrain.fired[index]];
    if (slot >= 0) off[slot] = 1;
  }
  let diff = 0;
  for (let index = 0; index < DN_COUNT; index += 1) {
    diff += Math.abs(on[index] - off[index]);
  }
  return diff;
}

function voltageDifference(onBrain, offBrain, indices = null) {
  let sumSquares = 0;
  let maxAbs = 0;
  if (indices) {
    for (const neuron of indices) {
      const delta = onBrain.v[neuron] - offBrain.v[neuron];
      const abs = Math.abs(delta);
      sumSquares += delta * delta;
      if (abs > maxAbs) maxAbs = abs;
    }
  } else {
    for (let neuron = 0; neuron < onBrain.n; neuron += 1) {
      const delta = onBrain.v[neuron] - offBrain.v[neuron];
      const abs = Math.abs(delta);
      sumSquares += delta * delta;
      if (abs > maxAbs) maxAbs = abs;
    }
  }
  return { l2: Math.sqrt(sumSquares), maxAbs };
}

function groupMask(n, indices) {
  const mask = new Uint8Array(n);
  for (const index of indices) mask[index] = 1;
  return mask;
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
        const postsynaptic = rowIdx[edge];
        if (!visited[postsynaptic]) {
          visited[postsynaptic] = 1;
          next.push(postsynaptic);
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
  const onBrain = new ConnectomeBrain(
    connectome.weights,
    connectome.meta.params,
    seed,
  );
  const offBrain = new ConnectomeBrain(
    connectome.weights,
    connectome.meta.params,
    seed,
  );
  const lglg = connectome.inputGroups.get("LgLG_" + side);
  const lglgMask = groupMask(connectome.meta.n, lglg);

  for (let step = 0; step < SETTLE_STEPS + BASELINE_STEPS; step += 1) {
    const drive = groundDrive();
    stimulate(onBrain, connectome.inputGroups, drive);
    stimulate(offBrain, connectome.inputGroups, drive);
    onBrain.step();
    offBrain.step();
  }

  const frames = [];
  let frameDnDiff = 0;
  let frameWholeDiff = 0;
  let pulseLgLGFiredAbsDiff = 0;
  let lglgVoltageMaxAbs = 0;
  let wholeFiredSymDiff = 0;
  let wholeVoltageMaxAbs = 0;
  let wholeVoltageMaxL2 = 0;
  let dnSpikeMismatch = 0;
  let dnVoltageMaxAbs = 0;
  let dnVoltageMaxL2 = 0;

  for (let step = 0; step < LIVE_STEPS; step += 1) {
    const onDrive = groundDrive();
    const offDrive = groundDrive();
    const pulse =
      step >= IMPACT_START &&
      step < IMPACT_START + IMPACT_PULSE_STEPS;
    if (pulse) onDrive["LgLG_" + side] = IMPACT_DRIVE;

    stimulate(onBrain, connectome.inputGroups, onDrive);
    stimulate(offBrain, connectome.inputGroups, offDrive);
    onBrain.step();
    offBrain.step();

    const lglgOn = firedInGroup(onBrain, lglgMask);
    const lglgOff = firedInGroup(offBrain, lglgMask);
    if (pulse) {
      pulseLgLGFiredAbsDiff += Math.abs(lglgOn - lglgOff);
    }

    const lglgVoltage = voltageDifference(onBrain, offBrain, lglg);
    lglgVoltageMaxAbs = Math.max(lglgVoltageMaxAbs, lglgVoltage.maxAbs);

    const wholeFired = firedSymmetricDifference(onBrain, offBrain);
    wholeFiredSymDiff += wholeFired;
    frameWholeDiff += wholeFired;

    const wholeVoltage = voltageDifference(onBrain, offBrain);
    wholeVoltageMaxAbs = Math.max(wholeVoltageMaxAbs, wholeVoltage.maxAbs);
    wholeVoltageMaxL2 = Math.max(wholeVoltageMaxL2, wholeVoltage.l2);

    const dnFired = dnSpikeDifference(onBrain, offBrain, dn.slot);
    dnSpikeMismatch += dnFired;
    frameDnDiff += dnFired;

    const dnVoltage = voltageDifference(onBrain, offBrain, dn.allDn);
    dnVoltageMaxAbs = Math.max(dnVoltageMaxAbs, dnVoltage.maxAbs);
    dnVoltageMaxL2 = Math.max(dnVoltageMaxL2, dnVoltage.l2);

    if ((step + 1) % 5 === 0) {
      frames.push({
        frame: (step + 1) / 5 - 1,
        endStep: step,
        dnSpikeMismatch: frameDnDiff,
        wholeFiredSymDiff: frameWholeDiff,
      });
      frameDnDiff = 0;
      frameWholeDiff = 0;
    }
  }

  return {
    seed,
    side,
    lglgCount: lglg.length,
    pulseLgLGFiredAbsDiff,
    lglgVoltageMaxAbs,
    wholeFiredSymDiff,
    wholeVoltageMaxAbs,
    wholeVoltageMaxL2,
    dnSpikeMismatch,
    dnVoltageMaxAbs,
    dnVoltageMaxL2,
    frames,
  };
}

function classify(summary) {
  if (summary.dnSpikeMismatch > 0) {
    return "E_DN_SPIKE_PROPAGATION";
  }
  if (
    summary.pulseLgLGFiredAbsDiff > 0 &&
    summary.dnVoltageMaxAbs > 1e-9
  ) {
    return "D_DN_SUBTHRESHOLD";
  }
  if (
    summary.pulseLgLGFiredAbsDiff > 0 &&
    summary.wholeFiredSymDiff > 0 &&
    summary.dnVoltageMaxAbs <= 1e-9
  ) {
    return "C_NETWORK_PROPAGATES_DN_NULL";
  }
  if (
    summary.lglgVoltageMaxAbs > 1e-9 &&
    summary.pulseLgLGFiredAbsDiff === 0
  ) {
    return "B_INPUT_SUBTHRESHOLD";
  }
  return "A_INPUT_NOT_ACTIVATED";
}

async function main() {
  const outDir = resolve("results/diagnose-v15a-lglg-propagation");
  await mkdir(outDir, { recursive: true });

  const connectome = await loadConnectome({
    cacheDir: resolve(".cache/maplefly-connectome"),
    onProgress(message) {
      console.log("[connectome] " + message);
    },
  });
  const dn = buildDnContract(connectome.meta);

  const lglgL = connectome.inputGroups.get("LgLG_L");
  const lglgR = connectome.inputGroups.get("LgLG_R");
  if (!lglgL?.length || !lglgR?.length) {
    throw new Error("LgLG input group missing");
  }
  const sourceSet = new Set([...lglgL, ...lglgR]);
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
      "[v15A-diag] seed=" +
        row.seed +
        " side=" +
        side +
        " inputFireDiff=" +
        row.pulseLgLGFiredAbsDiff +
        " inputV=" +
        row.lglgVoltageMaxAbs.toExponential(3) +
        " wholeFireDiff=" +
        row.wholeFiredSymDiff +
        " dnSpikeDiff=" +
        row.dnSpikeMismatch +
        " dnV=" +
        row.dnVoltageMaxAbs.toExponential(3),
    );
  }

  const summary = {
    pulseLgLGFiredAbsDiff: pairs.reduce(
      (sum, row) => sum + row.pulseLgLGFiredAbsDiff,
      0,
    ),
    lglgVoltageMaxAbs: Math.max(...pairs.map((row) => row.lglgVoltageMaxAbs)),
    wholeFiredSymDiff: pairs.reduce(
      (sum, row) => sum + row.wholeFiredSymDiff,
      0,
    ),
    wholeVoltageMaxAbs: Math.max(...pairs.map((row) => row.wholeVoltageMaxAbs)),
    wholeVoltageMaxL2: Math.max(...pairs.map((row) => row.wholeVoltageMaxL2)),
    dnSpikeMismatch: pairs.reduce(
      (sum, row) => sum + row.dnSpikeMismatch,
      0,
    ),
    dnVoltageMaxAbs: Math.max(...pairs.map((row) => row.dnVoltageMaxAbs)),
    dnVoltageMaxL2: Math.max(...pairs.map((row) => row.dnVoltageMaxL2)),
  };
  const route = classify(summary);
  const structuralDisconnect =
    (reachability.at(-1)?.cumulativeDn ?? 0) === 0;

  const output = {
    schema: "maplefly.v15a.lglg-propagation-diagnostic.1",
    brainRepository: SOURCE.repository,
    brainCommit: SOURCE.commit,
    preregistration: {
      path: "history/prereg_v15a_diag.md",
      commit: PREREG_COMMIT,
    },
    stimulus: {
      impactDrive: IMPACT_DRIVE,
      impactPulseSteps: IMPACT_PULSE_STEPS,
      impactPulseMs: IMPACT_PULSE_STEPS * STEP_SECONDS * 1000,
      impactStartStep: IMPACT_START,
      tasteUsed: false,
    },
    seeds: SEEDS,
    reachability: {
      sourceLgLGCount: sourceSet.size,
      levels: reachability,
      structuralDisconnect,
    },
    summary,
    route,
    pairs,
  };

  await writeFile(
    resolve(outDir, "v15a_diag.json"),
    JSON.stringify(output, null, 2) + "\n",
  );

  console.log(
    "V15A-LGLG-PROPAGATION-DIAG=" +
      route +
      " inputFireDiff=" +
      summary.pulseLgLGFiredAbsDiff +
      " wholeFireDiff=" +
      summary.wholeFiredSymDiff +
      " dnSpikeDiff=" +
      summary.dnSpikeMismatch +
      " dnV=" +
      summary.dnVoltageMaxAbs.toExponential(3) +
      " reach3DN=" +
      (reachability.at(-1)?.cumulativeDn ?? 0) +
      " structuralDisconnect=" +
      structuralDisconnect,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
