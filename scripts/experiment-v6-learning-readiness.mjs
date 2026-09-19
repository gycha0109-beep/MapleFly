#!/usr/bin/env node

import {
  mkdir,
  writeFile,
} from "node:fs/promises";
import { resolve } from "node:path";
import {
  SOURCE,
  ConnectomeBrain,
  cells,
  cellsWithPrefix,
  loadConnectome,
} from "../src/headless/connectome-runtime.mjs";

const STEPS_PER_SECOND = 50;
const WINDOW_STEPS = 10;
const STIMULUS_DRIVE = 0.5;
const DEFAULT_LEVELS = [
  0,
  -0.24,
  -0.26,
  -0.28,
  -0.29,
  -0.30,
  -0.31,
  -0.32,
  -0.34,
];

function parseArgs(argv) {
  const values = {
    seeds: 2,
    seed: 64,
    levels: [...DEFAULT_LEVELS],
    out: "results/experiment-v6",
    cache: ".cache/maplefly-connectome",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (arg === "--seeds") {
      values.seeds = Number(next);
      i += 1;
    } else if (arg === "--seed") {
      values.seed = Number(next);
      i += 1;
    } else if (arg === "--levels") {
      values.levels = String(next)
        .split(",")
        .map((value) => Number(value.trim()));
      i += 1;
    } else if (arg === "--out") {
      values.out = next;
      i += 1;
    } else if (arg === "--cache") {
      values.cache = next;
      i += 1;
    } else {
      throw new Error("unknown argument: " + arg);
    }
  }

  if (!Number.isInteger(values.seeds) || values.seeds <= 0) {
    throw new Error("--seeds must be a positive integer");
  }

  if (!Number.isInteger(values.seed)) {
    throw new Error("--seed must be an integer");
  }

  if (
    !values.levels.length ||
    values.levels.some((value) => !Number.isFinite(value) || value > 0)
  ) {
    throw new Error("--levels must be comma-separated finite values <= 0");
  }

  if (!values.levels.includes(0)) {
    throw new Error("--levels must include 0 as the frozen-brain reference");
  }

  return values;
}

function makeSlotMap(n, indices) {
  const map = new Int32Array(n);
  map.fill(-1);

  for (let slot = 0; slot < indices.length; slot += 1) {
    map[indices[slot]] = slot;
  }

  return map;
}

function mean(values) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function fractionAtLeast(values, threshold) {
  if (!values.length) {
    return 0;
  }

  let count = 0;

  for (const value of values) {
    if (value >= threshold) {
      count += 1;
    }
  }

  return count / values.length;
}

function jaccard(a, b) {
  if (a.length !== b.length) {
    throw new Error("signature length mismatch");
  }

  let intersection = 0;
  let union = 0;

  for (let i = 0; i < a.length; i += 1) {
    const av = Boolean(a[i]);
    const bv = Boolean(b[i]);

    if (av || bv) {
      union += 1;
      if (av && bv) {
        intersection += 1;
      }
    }
  }

  return union ? intersection / union : 0;
}

function buildGroups(meta) {
  const kc = cellsWithPrefix(meta, "KC");
  const mbon = cellsWithPrefix(meta, "MBON");
  const pam = cellsWithPrefix(meta, "PAM");
  const ppl1 = cellsWithPrefix(meta, "PPL1");
  const apl = cellsWithPrefix(meta, "APL");
  const dn = cells(meta, [
    "descending_neuron",
    "descending_neuron_tbc",
  ]);
  const vinegar = cells(meta, ["ORN_VL2a"]);
  const cva = cells(meta, ["ORN_DA1", "ORN_VA1d"]);

  const required = {
    KC: kc,
    MBON: mbon,
    PAM: pam,
    PPL1: ppl1,
    vinegar,
    cVA: cva,
    descending: dn,
  };

  for (const [name, indices] of Object.entries(required)) {
    if (!indices.length) {
      throw new Error("required population not found: " + name);
    }
  }

  return {
    kc,
    mbon,
    pam,
    ppl1,
    apl,
    dn,
    vinegar,
    cva,
  };
}

function buildTrackers(meta, groups) {
  return {
    kc: makeSlotMap(meta.n, groups.kc),
    mbon: makeSlotMap(meta.n, groups.mbon),
    pam: makeSlotMap(meta.n, groups.pam),
    ppl1: makeSlotMap(meta.n, groups.ppl1),
    apl: makeSlotMap(meta.n, groups.apl),
    dn: makeSlotMap(meta.n, groups.dn),
  };
}

function applyKcBias(brain, kc, bias) {
  brain.tonicExtra.fill(0);

  for (const neuron of kc) {
    brain.tonicExtra[neuron] = bias;
  }
}

function stepQuiet(brain, steps) {
  for (let i = 0; i < steps; i += 1) {
    brain.step();
  }
}

function measurePhase({
  brain,
  trackers,
  groups,
  steps = STEPS_PER_SECOND,
  stimulus = null,
  drive = 0,
}) {
  const kcWindowSeen = new Uint8Array(groups.kc.length);
  const kcWindowHits = new Uint8Array(groups.kc.length);
  const kcSpikeCounts = new Uint16Array(groups.kc.length);
  const mbonSpikeCounts = new Uint16Array(groups.mbon.length);

  let activeShareSum = 0;
  let windows = 0;
  let pamSpikes = 0;
  let ppl1Spikes = 0;
  let aplSpikes = 0;
  let dnSpikes = 0;

  for (let step = 0; step < steps; step += 1) {
    if (stimulus && stimulus.length && drive) {
      brain.stimulate(stimulus, drive);
    }

    brain.step();

    for (let fired = 0; fired < brain.firedCount; fired += 1) {
      const neuron = brain.fired[fired];

      const kcSlot = trackers.kc[neuron];
      if (kcSlot >= 0) {
        kcWindowSeen[kcSlot] = 1;
        kcSpikeCounts[kcSlot] += 1;
      }

      const mbonSlot = trackers.mbon[neuron];
      if (mbonSlot >= 0) {
        mbonSpikeCounts[mbonSlot] += 1;
      }

      if (trackers.pam[neuron] >= 0) {
        pamSpikes += 1;
      }

      if (trackers.ppl1[neuron] >= 0) {
        ppl1Spikes += 1;
      }

      if (trackers.apl[neuron] >= 0) {
        aplSpikes += 1;
      }

      if (trackers.dn[neuron] >= 0) {
        dnSpikes += 1;
      }
    }

    if ((step + 1) % WINDOW_STEPS === 0) {
      let active = 0;

      for (let slot = 0; slot < kcWindowSeen.length; slot += 1) {
        if (kcWindowSeen[slot]) {
          active += 1;
          kcWindowHits[slot] += 1;
        }
      }

      activeShareSum += active / groups.kc.length;
      windows += 1;
      kcWindowSeen.fill(0);
    }
  }

  const seconds = steps / STEPS_PER_SECOND;
  const hz = (spikes, count) =>
    count ? spikes / count / seconds : 0;

  const kcHz = Array.from(
    kcSpikeCounts,
    (count) => count / seconds,
  );
  const mbonHz = Array.from(
    mbonSpikeCounts,
    (count) => count / seconds,
  );

  return {
    kcActiveShare: windows ? activeShareSum / windows : 0,
    kcMeanHz: mean(kcHz),
    kcCeilingShare: fractionAtLeast(kcHz, 49.999),
    kcSignature: Uint8Array.from(
      kcWindowHits,
      (hits) => (hits >= Math.ceil(windows * 0.6) ? 1 : 0),
    ),
    mbonHz,
    mbonMeanHz: mean(mbonHz),
    pamHz: hz(pamSpikes, groups.pam.length),
    ppl1Hz: hz(ppl1Spikes, groups.ppl1.length),
    aplHz: hz(aplSpikes, groups.apl.length),
    dnHz: hz(dnSpikes, groups.dn.length),
  };
}

function runCondition({
  connectome,
  groups,
  trackers,
  seed,
  kcBias,
  stimulus,
}) {
  const brain = new ConnectomeBrain(
    connectome.weights,
    connectome.meta.params,
    seed,
  );

  applyKcBias(brain, groups.kc, kcBias);
  stepQuiet(brain, STEPS_PER_SECOND);

  const baseline = measurePhase({
    brain,
    trackers,
    groups,
  });

  const measured = measurePhase({
    brain,
    trackers,
    groups,
    stimulus: stimulus ? stimulus.indices : null,
    drive: stimulus ? stimulus.drive : 0,
  });

  return {
    baseline,
    measured,
  };
}

function mbonResponderShare(result) {
  const delta = result.measured.mbonHz.map(
    (value, index) =>
      value - result.baseline.mbonHz[index],
  );

  return {
    share: fractionAtLeast(delta, 2),
    meanDeltaHz: mean(delta),
  };
}

function compactPhase(phase) {
  return {
    kcActiveShare: phase.kcActiveShare,
    kcMeanHz: phase.kcMeanHz,
    kcCeilingShare: phase.kcCeilingShare,
    mbonMeanHz: phase.mbonMeanHz,
    pamHz: phase.pamHz,
    ppl1Hz: phase.ppl1Hz,
    aplHz: phase.aplHz,
    dnHz: phase.dnHz,
  };
}

function runCandidate({
  connectome,
  groups,
  trackers,
  seed,
  kcBias,
}) {
  const rest = runCondition({
    connectome,
    groups,
    trackers,
    seed,
    kcBias,
    stimulus: null,
  });

  const vinegar = runCondition({
    connectome,
    groups,
    trackers,
    seed,
    kcBias,
    stimulus: {
      indices: groups.vinegar,
      drive: STIMULUS_DRIVE,
    },
  });

  const cva = runCondition({
    connectome,
    groups,
    trackers,
    seed,
    kcBias,
    stimulus: {
      indices: groups.cva,
      drive: STIMULUS_DRIVE,
    },
  });

  const vinegarMbon = mbonResponderShare(vinegar);
  const cvaMbon = mbonResponderShare(cva);

  return {
    seed,
    kcBias,
    rest: compactPhase(rest.measured),
    vinegar: compactPhase(vinegar.measured),
    cva: compactPhase(cva.measured),
    vinegarGain:
      rest.measured.kcActiveShare > 0
        ? vinegar.measured.kcActiveShare /
          rest.measured.kcActiveShare
        : null,
    cvaGain:
      rest.measured.kcActiveShare > 0
        ? cva.measured.kcActiveShare /
          rest.measured.kcActiveShare
        : null,
    signatureJaccard: jaccard(
      vinegar.measured.kcSignature,
      cva.measured.kcSignature,
    ),
    vinegarMbonResponderShare: vinegarMbon.share,
    cvaMbonResponderShare: cvaMbon.share,
    vinegarMbonMeanDeltaHz: vinegarMbon.meanDeltaHz,
    cvaMbonMeanDeltaHz: cvaMbon.meanDeltaHz,
  };
}

function averageRows(rows, key) {
  return mean(
    rows.map((row) => Number(row[key] || 0)),
  );
}

function summarizeByLevel(rows, levels) {
  const baselineDnBySeed = new Map(
    rows
      .filter((row) => row.kcBias === 0)
      .map((row) => [row.seed, row.rest.dnHz]),
  );

  for (const row of rows) {
    const baseline = baselineDnBySeed.get(row.seed) || 0;
    row.dnRestDrift =
      baseline > 0
        ? Math.abs(row.rest.dnHz - baseline) / baseline
        : 0;
  }

  const summary = levels.map((level) => {
    const same = rows.filter((row) => row.kcBias === level);
    const restActive = mean(
      same.map((row) => row.rest.kcActiveShare),
    );
    const vinegarActive = mean(
      same.map((row) => row.vinegar.kcActiveShare),
    );
    const cvaActive = mean(
      same.map((row) => row.cva.kcActiveShare),
    );
    const vinegarGain =
      restActive > 0 ? vinegarActive / restActive : 0;
    const cvaGain =
      restActive > 0 ? cvaActive / restActive : 0;
    const signatureJaccard = averageRows(
      same,
      "signatureJaccard",
    );
    const dnRestDrift = averageRows(
      same,
      "dnRestDrift",
    );
    const vinegarMbonResponderShare = averageRows(
      same,
      "vinegarMbonResponderShare",
    );
    const cvaMbonResponderShare = averageRows(
      same,
      "cvaMbonResponderShare",
    );

    const gate1 =
      restActive <= 0.20 &&
      vinegarGain >= 2 &&
      cvaGain >= 2 &&
      signatureJaccard < 0.5 &&
      dnRestDrift <= 0.20;

    const gate2 =
      gate1 &&
      vinegarMbonResponderShare >= 0.10 &&
      cvaMbonResponderShare >= 0.10;

    return {
      kcBias: level,
      trials: same.length,
      restActive,
      vinegarActive,
      cvaActive,
      vinegarGain,
      cvaGain,
      signatureJaccard,
      dnRestDrift,
      vinegarMbonResponderShare,
      cvaMbonResponderShare,
      restKcMeanHz: mean(
        same.map((row) => row.rest.kcMeanHz),
      ),
      restKcCeilingShare: mean(
        same.map((row) => row.rest.kcCeilingShare),
      ),
      restPamHz: mean(
        same.map((row) => row.rest.pamHz),
      ),
      restPpl1Hz: mean(
        same.map((row) => row.rest.ppl1Hz),
      ),
      restAplHz: mean(
        same.map((row) => row.rest.aplHz),
      ),
      gate1,
      gate2,
    };
  });

  const robustWindows = [];

  for (let i = 0; i + 2 < summary.length; i += 1) {
    const window = summary.slice(i, i + 3);

    if (window.every((row) => row.gate2)) {
      robustWindows.push(
        window.map((row) => row.kcBias),
      );
    }
  }

  return {
    levels: summary,
    robustWindows,
    readyForPlasticity: robustWindows.length > 0,
  };
}

function percent(value) {
  return (value * 100).toFixed(1) + "%";
}

function toMarkdown(meta, summary) {
  const lines = [
    "# MapleFly Experiment v6 — learning readiness",
    "",
    "- brain: " + meta.brainRepository + " @ " + meta.brainCommit,
    "- seeds: " + meta.seeds,
    "- odour stimulus: " + meta.stimulusDrive + " V / 20 ms step",
    "- KC window: " + meta.windowMs + " ms",
    "",
    "| KC bias | rest active | vinegar active | cVA active | vinegar/rest | cVA/rest | signature Jaccard | DN drift | vinegar MBON >=2Hz | cVA MBON >=2Hz | Gate1 | Gate2 |",
    "| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | :---: | :---: |",
  ];

  for (const row of summary.levels) {
    lines.push(
      "| " +
        row.kcBias.toFixed(2) +
        " | " +
        percent(row.restActive) +
        " | " +
        percent(row.vinegarActive) +
        " | " +
        percent(row.cvaActive) +
        " | " +
        row.vinegarGain.toFixed(2) +
        "x | " +
        row.cvaGain.toFixed(2) +
        "x | " +
        row.signatureJaccard.toFixed(2) +
        " | " +
        percent(row.dnRestDrift) +
        " | " +
        percent(row.vinegarMbonResponderShare) +
        " | " +
        percent(row.cvaMbonResponderShare) +
        " | " +
        (row.gate1 ? "PASS" : "FAIL") +
        " | " +
        (row.gate2 ? "PASS" : "FAIL") +
        " |",
    );
  }

  lines.push(
    "",
    "**plasticity-ready:** " +
      (summary.readyForPlasticity ? "YES" : "NO"),
    "",
    summary.robustWindows.length
      ? "robust 3-level windows: " +
          summary.robustWindows
            .map((window) => window.join(" / "))
            .join(", ")
      : "robust 3-level window: none",
    "",
    "> KC bias는 학습 구현이 아니라 포화 원인 확인용 진단 개입이다. 이 단계에서 PASS가 나와도 정답 행동이나 게임 보상 조건식은 추가하지 않는다.",
    "",
  );

  return lines.join("\n");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const outDir = resolve(options.out);
  const cacheDir = resolve(options.cache);

  await mkdir(outDir, { recursive: true });

  console.log(
    "MapleFly v6 learning-readiness · " +
      options.seeds +
      " seeds · " +
      options.levels.length +
      " KC-bias levels",
  );

  const connectome = await loadConnectome({
    cacheDir,
    onProgress(message) {
      console.log("[connectome] " + message);
    },
  });

  const groups = buildGroups(connectome.meta);
  const trackers = buildTrackers(
    connectome.meta,
    groups,
  );

  console.log(
    "[populations] KC=" +
      groups.kc.length +
      " MBON=" +
      groups.mbon.length +
      " PAM=" +
      groups.pam.length +
      " PPL1=" +
      groups.ppl1.length +
      " APL=" +
      groups.apl.length +
      " DN=" +
      groups.dn.length,
  );
  console.log(
    "[stimuli] vinegar ORN_VL2a=" +
      groups.vinegar.length +
      " cVA ORN_DA1/VA1d=" +
      groups.cva.length,
  );

  const rows = [];
  const startedAt = new Date().toISOString();

  for (let seedOffset = 0; seedOffset < options.seeds; seedOffset += 1) {
    const seed = options.seed + seedOffset;

    for (let index = 0; index < options.levels.length; index += 1) {
      const kcBias = options.levels[index];

      console.log(
        "[trial] seed=" +
          seed +
          " KC bias=" +
          kcBias.toFixed(2) +
          " (" +
          (index + 1) +
          "/" +
          options.levels.length +
          ")",
      );

      const row = runCandidate({
        connectome,
        groups,
        trackers,
        seed,
        kcBias,
      });

      rows.push(row);

      console.log(
        "  rest=" +
          percent(row.rest.kcActiveShare) +
          " vinegar=" +
          percent(row.vinegar.kcActiveShare) +
          " cVA=" +
          percent(row.cva.kcActiveShare) +
          " J=" +
          row.signatureJaccard.toFixed(2) +
          " PAMrest=" +
          row.rest.pamHz.toFixed(2) +
          "Hz",
      );
    }
  }

  const summary = summarizeByLevel(
    rows,
    options.levels,
  );

  const meta = {
    schema:
      "maplefly.experiment-v6.learning-readiness.1",
    startedAt,
    finishedAt: new Date().toISOString(),
    brainRepository: SOURCE.repository,
    brainCommit: SOURCE.commit,
    neurons: SOURCE.neurons,
    synapses: SOURCE.synapses,
    seeds: options.seeds,
    baseSeed: options.seed,
    kcBiasLevels: options.levels,
    stimulusDrive: STIMULUS_DRIVE,
    settleSeconds: 1,
    baselineSeconds: 1,
    stimulusSeconds: 1,
    windowMs:
      (WINDOW_STEPS / STEPS_PER_SECOND) * 1000,
    signatureRule:
      "KC fired in >=60% of five 200ms windows",
    gates: {
      gate1:
        "rest active <=20%; vinegar/rest >=2x; cVA/rest >=2x; signature Jaccard <0.5; resting descending-neuron drift <=20%",
      gate2:
        "Gate1 plus >=10% MBON cells increase by >=2Hz for each odour",
      robust:
        "three adjacent KC-bias levels all pass Gate2",
    },
    populations: {
      kc: groups.kc.length,
      mbon: groups.mbon.length,
      pam: groups.pam.length,
      ppl1: groups.ppl1.length,
      apl: groups.apl.length,
      descending: groups.dn.length,
      vinegarInput: groups.vinegar.length,
      cvaInput: groups.cva.length,
    },
  };

  await writeFile(
    resolve(outDir, "experiment_v6.json"),
    JSON.stringify(
      {
        meta,
        summary,
        rows,
      },
      null,
      2,
    ),
  );

  await writeFile(
    resolve(outDir, "summary.md"),
    toMarkdown(meta, summary),
  );

  console.log("\n=== v6 readiness summary ===");

  for (const row of summary.levels) {
    console.log(
      "KC " +
        row.kcBias.toFixed(2) +
        " · rest=" +
        percent(row.restActive) +
        " · vinegar=" +
        row.vinegarGain.toFixed(2) +
        "x · cVA=" +
        row.cvaGain.toFixed(2) +
        "x · J=" +
        row.signatureJaccard.toFixed(2) +
        " · MBON=" +
        percent(row.vinegarMbonResponderShare) +
        "/" +
        percent(row.cvaMbonResponderShare) +
        " · G1=" +
        (row.gate1 ? "PASS" : "FAIL") +
        " G2=" +
        (row.gate2 ? "PASS" : "FAIL"),
    );
  }

  console.log(
    "plasticity-ready=" +
      summary.readyForPlasticity,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
