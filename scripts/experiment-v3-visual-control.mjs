#!/usr/bin/env node

import {
  mkdir,
  writeFile,
} from "node:fs/promises";
import { resolve } from "node:path";
import {
  SOURCE,
  loadConnectome,
} from "../src/headless/connectome-runtime.mjs";
import {
  CONDITIONS,
  buildVisualControlSchedule,
  runVisualControlTrial,
} from "../src/headless/experiment-v3-core.mjs";

function parseArgs(argv) {
  const values = {
    seconds: 180,
    pairs: 3,
    seed: 64,
    out: "results/experiment-v3",
    cache: ".cache/maplefly-connectome",
  };

  for (
    let index = 0;
    index < argv.length;
    index += 1
  ) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--seconds") {
      values.seconds = Number(next);
      index += 1;
    } else if (arg === "--pairs") {
      values.pairs = Number(next);
      index += 1;
    } else if (arg === "--seed") {
      values.seed = Number(next);
      index += 1;
    } else if (arg === "--out") {
      values.out = next;
      index += 1;
    } else if (arg === "--cache") {
      values.cache = next;
      index += 1;
    } else if (
      arg === "--help" ||
      arg === "-h"
    ) {
      console.log(`
MapleFly Experiment v3 visual-control runner

Usage:
  node scripts/experiment-v3-visual-control.mjs [options]

Options:
  --seconds N   simulated seconds per trial (default: 180)
  --pairs N     FULL/VISUAL_OFF pairs (default: 3)
  --seed N      base seed (default: 64)
  --out PATH    output directory
  --cache PATH  connectome cache directory
`);
      process.exit(0);
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }

  if (
    !Number.isFinite(values.seconds) ||
    values.seconds <= 0
  ) {
    throw new Error("--seconds must be > 0");
  }

  if (
    !Number.isInteger(values.pairs) ||
    values.pairs <= 0
  ) {
    throw new Error(
      "--pairs must be a positive integer",
    );
  }

  if (!Number.isInteger(values.seed)) {
    throw new Error("--seed must be an integer");
  }

  return values;
}

function average(rows, key) {
  if (rows.length === 0) {
    return 0;
  }

  return (
    rows.reduce(
      (sum, row) =>
        sum + Number(row[key] ?? 0),
      0,
    ) / rows.length
  );
}

function buildSummary(results) {
  const full = results.filter(
    (row) =>
      row.condition === CONDITIONS.FULL,
  );
  const visualOff = results.filter(
    (row) =>
      row.condition ===
      CONDITIONS.VISUAL_OFF,
  );

  const byPair = new Map();

  for (const row of results) {
    const pair =
      byPair.get(row.pair) ?? {};
    pair[row.condition] = row;
    byPair.set(row.pair, pair);
  }

  const paired = [];

  for (const [pair, rows] of byPair) {
    if (
      !rows[CONDITIONS.FULL] ||
      !rows[CONDITIONS.VISUAL_OFF]
    ) {
      continue;
    }

    const enabled = rows[CONDITIONS.FULL];
    const disabled =
      rows[CONDITIONS.VISUAL_OFF];

    paired.push({
      pair,
      towardDelta:
        enabled.towardMovementRatio -
        disabled.towardMovementRatio,
      hitRateDelta:
        enabled.hitRate -
        disabled.hitRate,
      killsDelta:
        enabled.kills -
        disabled.kills,
      minDistanceDelta:
        enabled.minTargetDistancePx -
        disabled.minTargetDistancePx,
    });
  }

  const summarize = (rows) => ({
    trials: rows.length,
    towardMovementRatio:
      average(
        rows,
        "towardMovementRatio",
      ),
    minTargetDistancePx:
      average(
        rows,
        "minTargetDistancePx",
      ),
    attacks: average(rows, "attack"),
    hits: average(rows, "hits"),
    hitRate: average(rows, "hitRate"),
    kills: average(rows, "kills"),
    avgBrainStepMs:
      average(rows, "avgBrainStepMs"),
  });

  return {
    full: summarize(full),
    visualOff: summarize(visualOff),
    pairedMeanDelta: {
      towardMovementRatio:
        average(paired, "towardDelta"),
      hitRate:
        average(paired, "hitRateDelta"),
      kills:
        average(paired, "killsDelta"),
      minTargetDistancePx:
        average(
          paired,
          "minDistanceDelta",
        ),
    },
    pairs: paired,
  };
}

function csvEscape(value) {
  const normalized = Array.isArray(value)
    ? value.join("|")
    : value ?? "";

  const text = String(normalized);

  return /[",\n]/.test(text)
    ? `"${text.replaceAll('"', '""')}"`
    : text;
}

function toCsv(results) {
  const columns = [
    "pair",
    "seed",
    "condition",
    "requestedSimSeconds",
    "simulatedSeconds",
    "brainSteps",
    "wallDurationMs",
    "totalDistancePx",
    "towardDistancePx",
    "awayDistancePx",
    "towardMovementRatio",
    "minTargetDistancePx",
    "timeWithinAttackRangeMs",
    "left",
    "right",
    "jump",
    "attack",
    "idle",
    "hits",
    "hitRate",
    "kills",
    "respawns",
    "spawnPositions",
    "firstHitMs",
    "firstKillMs",
    "finalTargetHp",
    "finalTargetX",
    "finalPlayerX",
    "avgFiredPerStep",
    "avgBrainStepMs",
  ];

  const lines = [columns.join(",")];

  for (const row of results) {
    lines.push(
      columns
        .map((column) =>
          csvEscape(row[column]),
        )
        .join(","),
    );
  }

  return "\ufeff" + lines.join("\n");
}

function percent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function toMarkdown(meta, summary) {
  const full = summary.full;
  const off = summary.visualOff;
  const delta = summary.pairedMeanDelta;

  return `# MapleFly Experiment v3 — Visual-only 대조군

## 조건

- FULL: SNta + LC10a/LPLC1/LPLC2/LC4
- VISUAL_OFF: SNta 유지, LC10a/LPLC1/LPLC2/LC4 제거
- trial: ${meta.seconds} simulated seconds
- pairs: ${meta.pairs}
- base seed: ${meta.baseSeed}
- MaleCNS: ${meta.brainCommit}

## 평균

| 지표 | FULL | VISUAL_OFF |
| --- | ---: | ---: |
| target 방향 이동 | ${percent(full.towardMovementRatio)} | ${percent(off.towardMovementRatio)} |
| target 최소거리 | ${full.minTargetDistancePx.toFixed(1)} px | ${off.minTargetDistancePx.toFixed(1)} px |
| 공격 | ${full.attacks.toFixed(1)} | ${off.attacks.toFixed(1)} |
| HIT | ${full.hits.toFixed(1)} | ${off.hits.toFixed(1)} |
| 적중률 | ${percent(full.hitRate)} | ${percent(off.hitRate)} |
| KILL | ${full.kills.toFixed(2)} | ${off.kills.toFixed(2)} |

## paired 평균 차이 — FULL minus VISUAL_OFF

- target 방향 이동: ${percent(delta.towardMovementRatio)}
- 적중률: ${percent(delta.hitRate)}
- KILL: ${delta.kills.toFixed(2)}
- 최소거리: ${delta.minTargetDistancePx.toFixed(1)} px

> 자동 산출물입니다. 해석은 history/result_v3.md에 별도로 기록합니다.
`;
}

async function main() {
  const options = parseArgs(
    process.argv.slice(2),
  );

  const outDir = resolve(options.out);
  const cacheDir = resolve(options.cache);

  await mkdir(outDir, {
    recursive: true,
  });

  console.log(
    `MapleFly visual control v3 · ${options.seconds}s × ${options.pairs} pairs`,
  );
  console.log(
    `connectome: ${SOURCE.repository}@${SOURCE.commit}`,
  );

  const connectome =
    await loadConnectome({
      cacheDir,
      onProgress(message) {
        console.log(
          `[connectome] ${message}`,
        );
      },
    });

  const schedule =
    buildVisualControlSchedule(
      options.pairs,
      options.seed,
    );

  const results = [];
  const startedAt =
    new Date().toISOString();

  for (
    let index = 0;
    index < schedule.length;
    index += 1
  ) {
    const spec = schedule[index];

    console.log(
      `\n[trial ${index + 1}/${schedule.length}] pair=${spec.pair} seed=${spec.seed} condition=${spec.condition}`,
    );

    const result =
      await runVisualControlTrial({
        connectome,
        seed: spec.seed,
        condition: spec.condition,
        seconds: options.seconds,
        onProgress(progress) {
          console.log(
            `  ${progress.step}/${progress.totalSteps} steps · ${progress.simulatedSeconds.toFixed(1)} sim-s`,
          );
        },
      });

    results.push({
      pair: spec.pair,
      ...result,
    });

    console.log(
      `  done · toward=${percent(result.towardMovementRatio)} · hit=${result.hits}/${result.attack} · kills=${result.kills} · wall=${(result.wallDurationMs / 1000).toFixed(1)}s`,
    );
  }

  const finishedAt =
    new Date().toISOString();

  const meta = {
    schema:
      "maplefly.experiment-v3.visual-control.1",
    startedAt,
    finishedAt,
    seconds: options.seconds,
    pairs: options.pairs,
    baseSeed: options.seed,
    brainRepository:
      SOURCE.repository,
    brainCommit: SOURCE.commit,
    nodeVersion: process.version,
    conditions: {
      FULL:
        "SNta + LC10a + LPLC1 + LPLC2 + LC4",
      VISUAL_OFF:
        "SNta only; target visual channels removed",
    },
    schedule:
      "paired-seed, alternating-order, deterministic-full-width-spawn-sequence",
  };

  const summary = buildSummary(results);
  const payload = {
    meta,
    summary,
    results,
  };

  await writeFile(
    resolve(outDir, "experiment_v3.json"),
    JSON.stringify(payload, null, 2),
  );

  await writeFile(
    resolve(outDir, "experiment_v3.csv"),
    toCsv(results),
  );

  await writeFile(
    resolve(outDir, "summary.md"),
    toMarkdown(meta, summary),
  );

  console.log("\n=== summary ===");
  console.log(
    `FULL       · toward ${percent(summary.full.towardMovementRatio)} · hitRate ${percent(summary.full.hitRate)} · kills ${summary.full.kills.toFixed(2)}`,
  );
  console.log(
    `VISUAL_OFF · toward ${percent(summary.visualOff.towardMovementRatio)} · hitRate ${percent(summary.visualOff.hitRate)} · kills ${summary.visualOff.kills.toFixed(2)}`,
  );
  console.log(
    `saved: ${outDir}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
