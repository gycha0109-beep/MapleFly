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
  buildSchedule,
  runTrial,
} from "../src/headless/experiment-v2-core.mjs";

function parseArgs(argv) {
  const values = {
    seconds: 180,
    pairs: 3,
    seed: 64,
    out: "results/experiment-v2",
    cache: ".cache/maplefly-connectome",
  };

  for (let index = 0; index < argv.length; index += 1) {
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
MapleFly Experiment v2 headless runner

Usage:
  node scripts/experiment-v2-headless.mjs [options]

Options:
  --seconds N   simulated seconds per trial (default: 180)
  --pairs N     paired ON/OFF repetitions (default: 3)
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
    throw new Error("--pairs must be a positive integer");
  }

  if (
    !Number.isInteger(values.seed)
  ) {
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
  const on = results.filter(
    (row) => row.sensory === "ON",
  );
  const off = results.filter(
    (row) => row.sensory === "OFF",
  );

  const byPair = new Map();

  for (const row of results) {
    const pair =
      byPair.get(row.pair) ?? {};
    pair[row.sensory] = row;
    byPair.set(row.pair, pair);
  }

  const paired = [];

  for (const [pair, rows] of byPair) {
    if (!rows.ON || !rows.OFF) {
      continue;
    }

    paired.push({
      pair,
      towardDelta:
        rows.ON.towardMovementRatio -
        rows.OFF.towardMovementRatio,
      hitRateDelta:
        rows.ON.hitRate -
        rows.OFF.hitRate,
      killsDelta:
        rows.ON.kills -
        rows.OFF.kills,
      minDistanceDelta:
        rows.ON.minTargetDistancePx -
        rows.OFF.minTargetDistancePx,
    });
  }

  return {
    sensoryOn: {
      trials: on.length,
      towardMovementRatio:
        average(
          on,
          "towardMovementRatio",
        ),
      minTargetDistancePx:
        average(
          on,
          "minTargetDistancePx",
        ),
      attacks: average(on, "attack"),
      hits: average(on, "hits"),
      hitRate: average(on, "hitRate"),
      kills: average(on, "kills"),
      avgBrainStepMs:
        average(on, "avgBrainStepMs"),
    },
    sensoryOff: {
      trials: off.length,
      towardMovementRatio:
        average(
          off,
          "towardMovementRatio",
        ),
      minTargetDistancePx:
        average(
          off,
          "minTargetDistancePx",
        ),
      attacks: average(off, "attack"),
      hits: average(off, "hits"),
      hitRate: average(off, "hitRate"),
      kills: average(off, "kills"),
      avgBrainStepMs:
        average(off, "avgBrainStepMs"),
    },
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
    "sensory",
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
  const on = summary.sensoryOn;
  const off = summary.sensoryOff;
  const delta = summary.pairedMeanDelta;

  return `# MapleFly Experiment v2 — Headless 결과

## 실행 조건

- 실행 시각: ${meta.startedAt}
- trial 길이: ${meta.seconds} simulated seconds
- pair 수: ${meta.pairs}
- base seed: ${meta.baseSeed}
- MaleCNS commit: ${meta.brainCommit}
- 실행 방식: Node.js headless fixed-step runner
- 브라우저 화면 / requestAnimationFrame 의존성: 없음

## 평균

| 지표 | SENSORY ON | SENSORY OFF |
| --- | ---: | ---: |
| target 방향 이동 비율 | ${percent(on.towardMovementRatio)} | ${percent(off.towardMovementRatio)} |
| target 최소거리 | ${on.minTargetDistancePx.toFixed(1)} px | ${off.minTargetDistancePx.toFixed(1)} px |
| 공격 횟수 | ${on.attacks.toFixed(1)} | ${off.attacks.toFixed(1)} |
| HIT | ${on.hits.toFixed(1)} | ${off.hits.toFixed(1)} |
| 적중률 | ${percent(on.hitRate)} | ${percent(off.hitRate)} |
| KILL | ${on.kills.toFixed(2)} | ${off.kills.toFixed(2)} |
| brain step | ${on.avgBrainStepMs.toFixed(2)} ms | ${off.avgBrainStepMs.toFixed(2)} ms |

## paired 평균 차이 — ON minus OFF

- target 방향 이동 비율: ${percent(delta.towardMovementRatio)}
- 적중률: ${percent(delta.hitRate)}
- KILL: ${delta.kills.toFixed(2)}
- 최소거리: ${delta.minTargetDistancePx.toFixed(1)} px

> 이 파일은 자동 산출물이다. 결과 해석은 별도 \`history/result_v2.md\`에서 작성한다.
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
    `MapleFly headless v2 · ${options.seconds}s × ${options.pairs} pairs`,
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

  const schedule = buildSchedule(
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
      `\n[trial ${index + 1}/${schedule.length}] pair=${spec.pair} seed=${spec.seed} sensory=${spec.condition}`,
    );

    const result = await runTrial({
      connectome,
      seed: spec.seed,
      sensory: spec.sensory,
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
      "maplefly.experiment-v2.headless.1",
    startedAt,
    finishedAt,
    seconds: options.seconds,
    pairs: options.pairs,
    baseSeed: options.seed,
    brainRepository:
      SOURCE.repository,
    brainCommit: SOURCE.commit,
    nodeVersion: process.version,
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
    resolve(outDir, "experiment_v2.json"),
    JSON.stringify(payload, null, 2),
  );

  await writeFile(
    resolve(outDir, "experiment_v2.csv"),
    toCsv(results),
  );

  await writeFile(
    resolve(outDir, "summary.md"),
    toMarkdown(meta, summary),
  );

  console.log("\n=== summary ===");
  console.log(
    `SENSORY ON  · toward ${percent(summary.sensoryOn.towardMovementRatio)} · hitRate ${percent(summary.sensoryOn.hitRate)} · kills ${summary.sensoryOn.kills.toFixed(2)}`,
  );
  console.log(
    `SENSORY OFF · toward ${percent(summary.sensoryOff.towardMovementRatio)} · hitRate ${percent(summary.sensoryOff.hitRate)} · kills ${summary.sensoryOff.kills.toFixed(2)}`,
  );
  console.log(
    `saved: ${outDir}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
