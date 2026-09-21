#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const source = resolve(
  process.argv[2] ??
    "results/experiment-v11d/experiment_v11d.json",
);
const output = resolve(
  process.argv[3] ??
    "results/experiment-v11d-timing/timing_audit.json",
);

function mean(values) {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : null;
}

function quantile(values, q) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * q;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  const weight = position - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function stats(values) {
  const clean = values.filter(Number.isFinite);
  return {
    n: clean.length,
    min: clean.length ? Math.min(...clean) : null,
    q25: quantile(clean, 0.25),
    median: quantile(clean, 0.5),
    q75: quantile(clean, 0.75),
    max: clean.length ? Math.max(...clean) : null,
    mean: mean(clean),
  };
}

function summarize(rows) {
  const jumped = rows.filter(
    (row) =>
      Number.isFinite(row.firstJumpStep) &&
      Number.isFinite(row.firstJumpFrontDistance),
  );
  const clear = jumped.filter((row) => row.clear);
  const failed = jumped.filter((row) => !row.clear);

  const pack = (subset) => ({
    episodes: subset.length,
    step: stats(subset.map((row) => row.firstJumpStep)),
    frontDistance: stats(
      subset.map((row) => row.firstJumpFrontDistance),
    ),
    blockedWindows: stats(
      subset.map((row) => row.blockedWindows),
    ),
  });

  return {
    episodes: rows.length,
    jumpedEpisodes: jumped.length,
    clearEpisodes: rows.filter((row) => row.clear).length,
    timeoutEpisodes: rows.filter((row) => row.timeout).length,
    allJumps: pack(jumped),
    clearJumps: pack(clear),
    failedJumps: pack(failed),
  };
}

const raw = JSON.parse(await readFile(source, "utf8"));

const aggregate = {};
for (const condition of [
  "FULL",
  "VISUAL_OFF",
  "DN_SHUFFLED",
]) {
  const rows = raw.perRun.flatMap(
    (run) => run[condition]?.rows ?? [],
  );
  aggregate[condition] = summarize(rows);
}

const noObstacleRows = raw.perRun.flatMap(
  (run) => run.NO_OBSTACLE?.rows ?? [],
);

const perRun = raw.perRun.map((run) => ({
  run: run.run,
  baseSeed: run.baseSeed,
  FULL: summarize(run.FULL?.rows ?? []),
  VISUAL_OFF: summarize(run.VISUAL_OFF?.rows ?? []),
  DN_SHUFFLED: summarize(run.DN_SHUFFLED?.rows ?? []),
  NO_OBSTACLE: {
    episodes: run.NO_OBSTACLE?.rows?.length ?? 0,
    jumpedEpisodes:
      run.NO_OBSTACLE?.rows?.filter((row) => row.anyJump).length ??
      0,
    firstJumpStep: stats(
      (run.NO_OBSTACLE?.rows ?? []).map(
        (row) => row.firstJumpStep,
      ),
    ),
  },
}));

const result = {
  schema: "maplefly.v11d-timing-audit.1",
  source: {
    schema: raw.meta?.schema ?? null,
    finalSeeds: raw.meta?.finalSeeds ?? null,
    finalDistances: raw.meta?.finalDistances ?? null,
  },
  aggregate,
  noObstacle: {
    episodes: noObstacleRows.length,
    jumpedEpisodes: noObstacleRows.filter((row) => row.anyJump).length,
    firstJumpStep: stats(
      noObstacleRows.map((row) => row.firstJumpStep),
    ),
  },
  perRun,
};

await mkdir(dirname(output), { recursive: true });
await writeFile(output, JSON.stringify(result, null, 2) + "\n");

const full = result.aggregate.FULL;
const off = result.aggregate.VISUAL_OFF;

console.log(
  [
    "V11D-TIMING-AUDIT=PASS",
    "FULL_jumpStepMedian=" + String(full.allJumps.step.median),
    "FULL_jumpDistanceMedian=" +
      String(full.allJumps.frontDistance.median),
    "FULL_clearDistanceMedian=" +
      String(full.clearJumps.frontDistance.median),
    "OFF_jumpStepMedian=" + String(off.allJumps.step.median),
    "OFF_jumpDistanceMedian=" +
      String(off.allJumps.frontDistance.median),
    "OFF_clearDistanceMedian=" +
      String(off.clearJumps.frontDistance.median),
  ].join(" "),
);
