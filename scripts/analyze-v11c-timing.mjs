#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const source = resolve(
  process.argv[2] ??
    "results/experiment-v11c/experiment_v11c.json",
);
const output = resolve(
  process.argv[3] ??
    "results/experiment-v11c-timing/timing_audit.json",
);

function mean(values) {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : null;
}

function quantile(values, q) {
  if (!values.length) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * q;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) {
    return sorted[lower];
  }
  const weight = position - lower;
  return (
    sorted[lower] * (1 - weight) +
    sorted[upper] * weight
  );
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

function summarizeRows(rows) {
  const jumped = rows.filter(
    (row) =>
      Number.isFinite(row.firstJumpStep) &&
      Number.isFinite(row.firstJumpFrontDistance),
  );
  const clear = jumped.filter((row) => row.clear);
  const failed = jumped.filter((row) => !row.clear);

  const summarize = (subset) => ({
    episodes: subset.length,
    firstJumpStep: stats(
      subset.map((row) => row.firstJumpStep),
    ),
    firstJumpFrontDistance: stats(
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
    jumped: summarize(jumped),
    clear: summarize(clear),
    failed: summarize(failed),
  };
}

const raw = JSON.parse(await readFile(source, "utf8"));

const perRun = raw.perRun.map((run) => ({
  run: run.run,
  baseSeed: run.baseSeed,
  FULL: summarizeRows(run.FULL.rows),
  VISUAL_OFF: summarizeRows(run.VISUAL_OFF.rows),
  DN_SHUFFLED: summarizeRows(run.DN_SHUFFLED.rows),
  NO_OBSTACLE: summarizeRows(run.NO_OBSTACLE.rows),
}));

const allFull = raw.perRun.flatMap((run) => run.FULL.rows);
const byStartDistance = {};

for (const run of raw.perRun) {
  for (const row of run.FULL.rows) {
    const key = String(row.startDistance ?? "unknown");
    (byStartDistance[key] ??= []).push(row);
  }
}

const result = {
  schema: "maplefly.v11c-timing-audit.1",
  source: {
    schema: raw.meta?.schema ?? null,
    finalSeeds: raw.meta?.finalSeeds ?? null,
    finalDistances: raw.meta?.finalDistances ?? null,
  },
  aggregateFULL: summarizeRows(allFull),
  byStartDistance: Object.fromEntries(
    Object.entries(byStartDistance).map(([key, rows]) => [
      key,
      summarizeRows(rows),
    ]),
  ),
  perRun,
};

await mkdir(dirname(output), { recursive: true });
await writeFile(
  output,
  JSON.stringify(result, null, 2) + "\n",
);

const a = result.aggregateFULL;
console.log(
  [
    "V11C-TIMING-AUDIT=PASS",
    "episodes=" + a.episodes,
    "jumped=" + a.jumpedEpisodes,
    "clear=" + a.clearEpisodes,
    "jumpDistanceMedian=" +
      String(a.jumped.firstJumpFrontDistance.median),
    "clearDistanceMedian=" +
      String(a.clear.firstJumpFrontDistance.median),
    "failedDistanceMedian=" +
      String(a.failed.firstJumpFrontDistance.median),
  ].join(" "),
);
