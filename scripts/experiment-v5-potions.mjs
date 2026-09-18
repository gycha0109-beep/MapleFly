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
  POTION,
  buildPotionSchedule,
  extendPotionInterfaces,
  runPotionTrial,
} from "../src/headless/experiment-v5-core.mjs";

function parseArgs(argv) {
  const values = {
    seconds: 180,
    pairs: 3,
    seed: 64,
    out: "results/experiment-v5",
    cache: ".cache/maplefly-connectome",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (arg === "--seconds") {
      values.seconds = Number(next);
      i += 1;
    } else if (arg === "--pairs") {
      values.pairs = Number(next);
      i += 1;
    } else if (arg === "--seed") {
      values.seed = Number(next);
      i += 1;
    } else if (arg === "--out") {
      values.out = next;
      i += 1;
    } else if (arg === "--cache") {
      values.cache = next;
      i += 1;
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }

  if (!Number.isFinite(values.seconds) || values.seconds <= 0) {
    throw new Error("--seconds must be > 0");
  }

  if (!Number.isInteger(values.pairs) || values.pairs <= 0) {
    throw new Error("--pairs must be a positive integer");
  }

  return values;
}

function average(rows, key) {
  if (!rows.length) {
    return 0;
  }

  return (
    rows.reduce(
      (sum, row) => sum + Number(row[key] ?? 0),
      0,
    ) / rows.length
  );
}

function summarize(rows) {
  return {
    trials: rows.length,
    contacts: average(rows, "contacts"),
    potionUses: average(rows, "potionUses"),
    quickPotionUses:
      average(rows, "quickPotionUses"),
    quickUsePerContact:
      average(rows, "quickUsePerContact"),
    totalHealed:
      average(rows, "totalHealed"),
    wastedHealing:
      average(rows, "wastedHealing"),
    averageHpAtUse:
      average(
        rows.filter((row) =>
          Number.isFinite(row.averageHpAtUse),
        ),
        "averageHpAtUse",
      ),
    potionsRemaining:
      average(rows, "potionsRemaining"),
    finalPlayerHp:
      average(rows, "finalPlayerHp"),
    survivalSeconds:
      average(rows, "survivalSeconds"),
    kills: average(rows, "kills"),
    avgHeadMotorHz:
      average(rows, "avgHeadMotorHz"),
  };
}

function buildSummary(results) {
  const on = results.filter(
    (row) =>
      row.condition ===
      CONDITIONS.POTION_CUE_ON,
  );
  const off = results.filter(
    (row) =>
      row.condition ===
      CONDITIONS.POTION_CUE_OFF,
  );

  return {
    cueOn: summarize(on),
    cueOff: summarize(off),
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
    "contacts",
    "damageTaken",
    "potionUses",
    "quickPotionUses",
    "quickUsePerContact",
    "totalHealed",
    "wastedHealing",
    "averageHpAtUse",
    "potionsRemaining",
    "finalPlayerHp",
    "playerDead",
    "deathAtMs",
    "survivalSeconds",
    "kills",
    "hits",
    "attack",
    "hitRate",
    "avgHeadMotorHz",
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
  const on = summary.cueOn;
  const off = summary.cueOff;

  return `# MapleFly Experiment v5 — Red potion

- HP: 100
- contact damage: 10
- potions: ${POTION.maxCount}
- heal: ${POTION.heal}
- taste drive: ${POTION.tasteDrive}
- drink threshold: ${POTION.drinkHz} Hz
- trial: ${meta.seconds} simulated seconds
- pairs: ${meta.pairs}

| 지표 | POTION_CUE_ON | POTION_CUE_OFF |
| --- | ---: | ---: |
| contacts | ${on.contacts.toFixed(2)} | ${off.contacts.toFixed(2)} |
| potion uses | ${on.potionUses.toFixed(2)} | ${off.potionUses.toFixed(2)} |
| 피격 1초 이내 사용 | ${on.quickPotionUses.toFixed(2)} | ${off.quickPotionUses.toFixed(2)} |
| quick/contact | ${percent(on.quickUsePerContact)} | ${percent(off.quickUsePerContact)} |
| 평균 사용 HP | ${on.averageHpAtUse.toFixed(1)} | ${off.averageHpAtUse.toFixed(1)} |
| 실제 회복 | ${on.totalHealed.toFixed(1)} | ${off.totalHealed.toFixed(1)} |
| overheal 낭비 | ${on.wastedHealing.toFixed(1)} | ${off.wastedHealing.toFixed(1)} |
| 남은 포션 | ${on.potionsRemaining.toFixed(1)} | ${off.potionsRemaining.toFixed(1)} |
| final HP | ${on.finalPlayerHp.toFixed(1)} | ${off.finalPlayerHp.toFixed(1)} |
| survival | ${on.survivalSeconds.toFixed(1)}s | ${off.survivalSeconds.toFixed(1)}s |
| KILL | ${on.kills.toFixed(2)} | ${off.kills.toFixed(2)} |
| head motor | ${on.avgHeadMotorHz.toFixed(2)} Hz | ${off.avgHeadMotorHz.toFixed(2)} Hz |

> POTION은 실제 생물학적 행동이 아니라 pinned taste probe의 cb_motor neck/head 반응을 게임 action으로 연결한 proxy다.
`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const outDir = resolve(options.out);
  const cacheDir = resolve(options.cache);

  await mkdir(outDir, { recursive: true });

  console.log(
    `MapleFly potion v5 · ${options.seconds}s × ${options.pairs} pairs`,
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

  const interfaces =
    extendPotionInterfaces(connectome);

  console.log(
    `[interface] taste L/R=${interfaces.counts.tasteL}/${interfaces.counts.tasteR} · head L/R=${interfaces.counts.headL}/${interfaces.counts.headR}`,
  );

  const schedule = buildPotionSchedule(
    options.pairs,
    options.seed,
  );

  const results = [];
  const startedAt = new Date().toISOString();

  for (
    let index = 0;
    index < schedule.length;
    index += 1
  ) {
    const spec = schedule[index];

    console.log(
      `\n[trial ${index + 1}/${schedule.length}] pair=${spec.pair} seed=${spec.seed} condition=${spec.condition}`,
    );

    const result = await runPotionTrial({
      connectome,
      interfaces,
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
      `  done · contacts=${result.contacts} · potions=${result.potionUses} · quick=${result.quickPotionUses} · waste=${result.wastedHealing} · HP=${result.finalPlayerHp}`,
    );
  }

  const meta = {
    schema:
      "maplefly.experiment-v5.red-potion.1",
    startedAt,
    finishedAt: new Date().toISOString(),
    seconds: options.seconds,
    pairs: options.pairs,
    baseSeed: options.seed,
    brainRepository: SOURCE.repository,
    brainCommit: SOURCE.commit,
    potion: POTION,
    interfaceCounts: interfaces.counts,
    conditions: {
      POTION_CUE_ON:
        "FULL visual+SNta+LgLG; injured -> LB3/claw_tpGRN taste cue; cb_motor head proxy can drink",
      POTION_CUE_OFF:
        "same game and decoder, but no taste cue",
    },
  };

  const summary = buildSummary(results);

  await writeFile(
    resolve(outDir, "experiment_v5.json"),
    JSON.stringify(
      { meta, summary, results },
      null,
      2,
    ),
  );

  await writeFile(
    resolve(outDir, "experiment_v5.csv"),
    toCsv(results),
  );

  await writeFile(
    resolve(outDir, "summary.md"),
    toMarkdown(meta, summary),
  );

  console.log("\n=== summary ===");
  console.log(
    `CUE_ON  contacts=${summary.cueOn.contacts.toFixed(2)} potions=${summary.cueOn.potionUses.toFixed(2)} quick/contact=${percent(summary.cueOn.quickUsePerContact)} avgHP=${summary.cueOn.averageHpAtUse.toFixed(1)} waste=${summary.cueOn.wastedHealing.toFixed(1)} survival=${summary.cueOn.survivalSeconds.toFixed(1)}s`,
  );
  console.log(
    `CUE_OFF contacts=${summary.cueOff.contacts.toFixed(2)} potions=${summary.cueOff.potionUses.toFixed(2)} quick/contact=${percent(summary.cueOff.quickUsePerContact)} avgHP=${summary.cueOff.averageHpAtUse.toFixed(1)} waste=${summary.cueOff.wastedHealing.toFixed(1)} survival=${summary.cueOff.survivalSeconds.toFixed(1)}s`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
