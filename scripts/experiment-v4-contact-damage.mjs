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
  DAMAGE,
  buildImpactSchedule,
  runImpactTrial,
} from "../src/headless/experiment-v4-core.mjs";

function parseArgs(argv) {
  const values = {
    seconds: 180,
    pairs: 3,
    seed: 64,
    out: "results/experiment-v4",
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

  return values;
}

function average(rows, key) {
  if (!rows.length) {
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

function summarize(rows) {
  return {
    trials: rows.length,
    contacts: average(rows, "contacts"),
    damageTaken:
      average(rows, "damageTaken"),
    finalPlayerHp:
      average(rows, "finalPlayerHp"),
    survivalSeconds:
      average(rows, "survivalSeconds"),
    postContactAwayRatio:
      average(rows, "postContactAwayRatio"),
    jumps: average(rows, "jump"),
    hits: average(rows, "hits"),
    hitRate: average(rows, "hitRate"),
    kills: average(rows, "kills"),
  };
}

function buildSummary(results) {
  const on = results.filter(
    (row) =>
      row.condition === CONDITIONS.IMPACT_ON,
  );
  const off = results.filter(
    (row) =>
      row.condition === CONDITIONS.IMPACT_OFF,
  );

  return {
    impactOn: summarize(on),
    impactOff: summarize(off),
  };
}

function percent(value) {
  return `${(value * 100).toFixed(1)}%`;
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
    "simulatedSeconds",
    "brainSteps",
    "contacts",
    "damageTaken",
    "firstContactMs",
    "finalPlayerHp",
    "playerDead",
    "deathAtMs",
    "survivalSeconds",
    "postContactAwayPx",
    "postContactTowardPx",
    "postContactAwayRatio",
    "postContactJumps",
    "postContactAttacks",
    "towardMovementRatio",
    "jump",
    "attack",
    "hits",
    "hitRate",
    "kills",
    "spawnPositions",
    "avgFiredPerStep",
    "avgBrainStepMs",
    "wallDurationMs",
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

function toMarkdown(meta, summary) {
  const on = summary.impactOn;
  const off = summary.impactOff;

  return `# MapleFly Experiment v4 — Contact damage

- HP: ${DAMAGE.maxHp}
- contact damage: ${DAMAGE.contactDamage}
- LgLG pulse: ${DAMAGE.impactDrive} / ${DAMAGE.impactPulseMs} ms
- trial: ${meta.seconds} simulated seconds
- pairs: ${meta.pairs}

| 지표 | IMPACT_ON | IMPACT_OFF |
| --- | ---: | ---: |
| contacts | ${on.contacts.toFixed(2)} | ${off.contacts.toFixed(2)} |
| damage | ${on.damageTaken.toFixed(1)} | ${off.damageTaken.toFixed(1)} |
| final HP | ${on.finalPlayerHp.toFixed(1)} | ${off.finalPlayerHp.toFixed(1)} |
| survival | ${on.survivalSeconds.toFixed(1)}s | ${off.survivalSeconds.toFixed(1)}s |
| contact 후 away 비율 | ${percent(on.postContactAwayRatio)} | ${percent(off.postContactAwayRatio)} |
| HIT rate | ${percent(on.hitRate)} | ${percent(off.hitRate)} |
| KILL | ${on.kills.toFixed(2)} | ${off.kills.toFixed(2)} |

> IMPACT는 pain이 아니라 pinned fly.ai의 LgLG load/knock mechanosensory proxy다.
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
    `MapleFly contact damage v4 · ${options.seconds}s × ${options.pairs} pairs`,
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

  const schedule = buildImpactSchedule(
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

    const result = await runImpactTrial({
      connectome,
      seed: spec.seed,
      condition: spec.condition,
      seconds: options.seconds,
      onProgress(progress) {
        console.log(
          `  ${progress.step}/${progress.totalSteps} · ${progress.simulatedSeconds.toFixed(1)} sim-s`,
        );
      },
    });

    results.push({
      pair: spec.pair,
      ...result,
    });

    console.log(
      `  done · contacts=${result.contacts} · HP=${result.finalPlayerHp} · away=${percent(result.postContactAwayRatio)} · kills=${result.kills}`,
    );
  }

  const meta = {
    schema:
      "maplefly.experiment-v4.contact-damage.1",
    startedAt,
    finishedAt: new Date().toISOString(),
    seconds: options.seconds,
    pairs: options.pairs,
    baseSeed: options.seed,
    brainRepository: SOURCE.repository,
    brainCommit: SOURCE.commit,
    conditions: {
      IMPACT_ON:
        "FULL visual+SNta; contact HP loss; LgLG knock pulse",
      IMPACT_OFF:
        "FULL visual+SNta; same contact HP loss; no LgLG pulse",
    },
  };

  const summary = buildSummary(results);

  await writeFile(
    resolve(outDir, "experiment_v4.json"),
    JSON.stringify(
      { meta, summary, results },
      null,
      2,
    ),
  );

  await writeFile(
    resolve(outDir, "experiment_v4.csv"),
    toCsv(results),
  );

  await writeFile(
    resolve(outDir, "summary.md"),
    toMarkdown(meta, summary),
  );

  console.log("\n=== summary ===");
  console.log(
    `IMPACT_ON  contacts=${summary.impactOn.contacts.toFixed(2)} HP=${summary.impactOn.finalPlayerHp.toFixed(1)} away=${percent(summary.impactOn.postContactAwayRatio)}`,
  );
  console.log(
    `IMPACT_OFF contacts=${summary.impactOff.contacts.toFixed(2)} HP=${summary.impactOff.finalPlayerHp.toFixed(1)} away=${percent(summary.impactOff.postContactAwayRatio)}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
