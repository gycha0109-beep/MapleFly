#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const SOURCE_RUN = 35980309878;
const SOURCE_HEAD = "8915f99273f260f030701e2be15c3060f3509174";
const SOURCE_ARTIFACT = 10800930547;
const SOURCE_DIGEST =
  "sha256:8aaf38c7d46c6db3a4ae4aeb2eeaf8e81d48d329d8071a66d73f4e87f3ec26a9";
const SOURCE_POLICY_SHA =
  "2cd005ebe7587aac363938dbb9bce9f7dbfc5ba8400a363470478859b6ca8d1e";
const PREREG_COMMIT =
  "7cded543afba1160173044ebdbfb9c2f509232a9";
const MAX_HP = 100;
const DAMAGE = 10;
const HEAL = 30;
const BASE_SEEDS = [3421000, 3431000, 3441000];

function mean(values) {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;
}

function assertIntegerCount(value, label) {
  const rounded = Math.round(value);
  if (
    !Number.isFinite(value) ||
    rounded < 0 ||
    Math.abs(value - rounded) > 1e-9
  ) {
    throw new Error(label + " invalid contact count " + value);
  }
  return rounded;
}

function policyActions(margins, params) {
  const history = Array(9).fill(0);
  const actions = [];
  for (const margin of margins) {
    let score = params.neuralGain * margin + params.bias;
    for (let lag = 0; lag < 9; lag += 1) {
      score += params.actionWeights[lag] * history[lag];
    }
    const action = score > 0 ? 1 : 0;
    actions.push(action);
    history.unshift(action);
    history.length = 9;
  }
  if (actions.length !== 10) {
    throw new Error("policy action length mismatch");
  }
  return actions;
}

function reconstructTape(row) {
  if (!row.survived || row.trajectory.length !== 10) {
    throw new Error(
      "ACTION_MEMORY_OFF source must survive all decisions " + row.seed,
    );
  }
  const margins = row.trajectory.map((event) => event.baseMargin);
  const contactsBeforeFirst = assertIntegerCount(
    (MAX_HP - row.trajectory[0].hpBefore) / DAMAGE,
    "seed " + row.seed + " pre",
  );
  const contactsAfter = [];
  for (let i = 0; i < 10; i += 1) {
    const current = row.trajectory[i];
    const nextHp =
      i < 9 ? row.trajectory[i + 1].hpBefore : row.finalHp;
    contactsAfter.push(
      assertIntegerCount(
        (current.hpAfterPotion - nextHp) / DAMAGE,
        "seed " + row.seed + " interval " + i,
      ),
    );
  }
  return {
    seed: row.seed,
    baseSeed: row.baseSeed,
    margins,
    contactsBeforeFirst,
    contactsAfter,
  };
}

function simulate(tape, actions) {
  let hp = MAX_HP - DAMAGE * tape.contactsBeforeFirst;
  let uses = 0;
  let wasted = 0;
  const trajectory = [];
  for (let i = 0; i < 10; i += 1) {
    if (hp <= 0) break;
    const action = actions[i];
    const hpBefore = hp;
    let thisWasted = 0;
    if (action === 1) {
      const healed = Math.min(HEAL, MAX_HP - hp);
      thisWasted = HEAL - healed;
      hp += healed;
      uses += 1;
      wasted += thisWasted;
    }
    const hpAfterPotion = hp;
    trajectory.push({
      decisionIndex: i,
      action,
      hpBefore,
      hpAfterPotion,
      wasted: thisWasted,
    });
    hp = Math.max(0, hp - DAMAGE * tape.contactsAfter[i]);
  }
  return {
    seed: tape.seed,
    baseSeed: tape.baseSeed,
    survived: hp > 0,
    finalHp: hp,
    uses,
    wasted,
    trajectory,
  };
}

function metrics(rows, oracle) {
  const survivors = rows.filter((row) => row.survived);
  const totalUses = rows.reduce((sum, row) => sum + row.uses, 0);
  const totalWasted = rows.reduce((sum, row) => sum + row.wasted, 0);
  const perSeed = BASE_SEEDS.map((baseSeed) => {
    const subset = rows.filter((row) => row.baseSeed === baseSeed);
    return {
      baseSeed,
      survivalRate: mean(
        subset.map((row) => Number(row.survived)),
      ),
      meanUses: mean(subset.map((row) => row.uses)),
    };
  });
  return {
    survivalRate: mean(rows.map((row) => Number(row.survived))),
    minSeedSurvivalRate: Math.min(
      ...perSeed.map((row) => row.survivalRate),
    ),
    meanUses: mean(rows.map((row) => row.uses)),
    meanExcessUses: survivors.length
      ? mean(
          survivors.map(
            (row) =>
              row.uses -
              oracle[String(row.seed)].minimumUses,
          ),
        )
      : null,
    wastedHealingPerDrink:
      totalUses ? totalWasted / totalUses : 0,
    perSeed,
  };
}

function alignmentContribution(full, control) {
  const survivalDrop =
    full.survivalRate - control.survivalRate;
  const excessIncrease =
    control.meanExcessUses === null
      ? Infinity
      : control.meanExcessUses - full.meanExcessUses;
  return {
    survivalDrop,
    excessIncrease,
    contributes:
      survivalDrop >= 0.125 ||
      excessIncrease >= 0.5,
  };
}

async function main() {
  const path = resolve(
    process.env.V15I_ARTIFACT_FILE ??
      ".cache/v15i-artifact/v15i_training.json",
  );
  const raw = await readFile(path, "utf8");
  const source = JSON.parse(raw);

  if (
    source.schema !==
      "maplefly.v15i.reward-only-long-action-memory.1" ||
    source.outcome !==
      "V15I_REWARD_ONLY_LONG_ACTION_MEMORY_FAIL" ||
    source.pass !== false ||
    source.policy?.paramsSha256 !== SOURCE_POLICY_SHA ||
    source.preregistration?.commit !==
      "32d600cace1ece3447e9ce50433a44e06d7714d5"
  ) {
    throw new Error("v15I source provenance mismatch");
  }

  const params = source.policy.parameters;
  if (
    !Number.isFinite(params.neuralGain) ||
    !Number.isFinite(params.bias) ||
    params.actionWeights?.length !== 9
  ) {
    throw new Error("v15I policy parameter contract mismatch");
  }

  const sourceRows = source.evaluation.actionMemoryOff.rows;
  const storedFull = source.evaluation.full.rows;
  if (
    sourceRows.length !== 24 ||
    storedFull.length !== 24
  ) {
    throw new Error("v15I source row count mismatch");
  }

  const tapes = sourceRows.map(reconstructTape);
  const storedBySeed = new Map(
    storedFull.map((row) => [row.seed, row]),
  );

  let replayMismatches = 0;
  const fullRows = [];
  const fullActionSequences = [];
  for (const tape of tapes) {
    const actions = policyActions(tape.margins, params);
    fullActionSequences.push(actions);
    const replay = simulate(tape, actions);
    fullRows.push(replay);
    const stored = storedBySeed.get(tape.seed);
    if (!stored) throw new Error("stored FULL row missing " + tape.seed);
    if (
      replay.survived !== stored.survived ||
      replay.uses !== stored.uses ||
      replay.finalHp !== stored.finalHp ||
      replay.wasted !== stored.wasted ||
      replay.trajectory.length !== stored.trajectory.length
    ) {
      replayMismatches += 1;
      continue;
    }
    for (let i = 0; i < replay.trajectory.length; i += 1) {
      if (
        replay.trajectory[i].action !==
          stored.trajectory[i].action
      ) {
        replayMismatches += 1;
        break;
      }
    }
  }
  const reconstructionValid = replayMismatches === 0;

  const fixed = {};
  for (const drinkCount of [7, 8, 9]) {
    const actions = Array.from(
      { length: 10 },
      (_, index) => Number(index < drinkCount),
    );
    const rows = tapes.map((tape) => simulate(tape, actions));
    fixed["first" + drinkCount + "Drink"] = {
      actions,
      metrics: metrics(rows, source.evaluation.oracle),
    };
  }

  const shiftedMargins = tapes.map(
    (_, index) => tapes[(index + 1) % tapes.length].margins,
  );
  const shiftedRows = tapes.map((tape, index) =>
    simulate(
      tape,
      policyActions(shiftedMargins[index], params),
    ),
  );
  const shiftedMetrics = metrics(
    shiftedRows,
    source.evaluation.oracle,
  );

  const meanMargins = Array.from(
    { length: 10 },
    (_, decision) =>
      mean(tapes.map((tape) => tape.margins[decision])),
  );
  const meanRows = tapes.map((tape) =>
    simulate(tape, policyActions(meanMargins, params)),
  );
  const meanMetrics = metrics(
    meanRows,
    source.evaluation.oracle,
  );

  const fullMetrics = metrics(
    fullRows,
    source.evaluation.oracle,
  );
  const first8 = fixed.first8Drink.actions;
  let first8MismatchCount = 0;
  for (const actions of fullActionSequences) {
    for (let i = 0; i < 10; i += 1) {
      first8MismatchCount += Number(actions[i] !== first8[i]);
    }
  }
  const first8MismatchFraction =
    first8MismatchCount / (24 * 10);

  const shiftContribution = alignmentContribution(
    fullMetrics,
    shiftedMetrics,
  );
  const meanContribution = alignmentContribution(
    fullMetrics,
    meanMetrics,
  );

  let outcome;
  if (!reconstructionValid) {
    outcome = "V15I_D1_RECONSTRUCTION_INVALID";
  } else if (
    first8MismatchFraction <= 0.10 &&
    !shiftContribution.contributes &&
    !meanContribution.contributes
  ) {
    outcome = "V15I_D1_SCHEDULE_DOMINATED_POLICY";
  } else if (
    shiftContribution.contributes ||
    meanContribution.contributes
  ) {
    outcome =
      "V15I_D1_EPISODE_SPECIFIC_NEURAL_ALIGNMENT_PRESENT";
  } else {
    outcome = "V15I_D1_NONTRIVIAL_NONALIGNED_POLICY";
  }

  console.log(
    "[v15I-D1] replayMismatch=" +
      replayMismatches +
      " first8Mismatch=" +
      first8MismatchCount +
      "/240 (" +
      (first8MismatchFraction * 100).toFixed(2) +
      "%)",
  );
  console.log(
    "[v15I-D1] FULL survival=" +
      (fullMetrics.survivalRate * 100).toFixed(1) +
      "% excess=" +
      fullMetrics.meanExcessUses.toFixed(3) +
      " FIRST8 survival=" +
      (fixed.first8Drink.metrics.survivalRate * 100).toFixed(1) +
      "% excess=" +
      fixed.first8Drink.metrics.meanExcessUses.toFixed(3),
  );
  console.log(
    "[v15I-D1] SHIFT1 survival=" +
      (shiftedMetrics.survivalRate * 100).toFixed(1) +
      "% excess=" +
      shiftedMetrics.meanExcessUses.toFixed(3) +
      " contribution=" +
      shiftContribution.contributes +
      " MEAN survival=" +
      (meanMetrics.survivalRate * 100).toFixed(1) +
      "% excess=" +
      meanMetrics.meanExcessUses.toFixed(3) +
      " contribution=" +
      meanContribution.contributes,
  );
  console.log("[v15I-D1] outcome=" + outcome);

  const output = {
    schema:
      "maplefly.v15i-d1.schedule-vs-neural-alignment.1",
    preregistration: {
      path: "history/prereg_v15i_d1.md",
      commit: PREREG_COMMIT,
    },
    source: {
      runId: SOURCE_RUN,
      headSha: SOURCE_HEAD,
      artifactId: SOURCE_ARTIFACT,
      artifactDigest: SOURCE_DIGEST,
      policySha256: SOURCE_POLICY_SHA,
      sourceJsonSha256: createHash("sha256")
        .update(raw)
        .digest("hex"),
    },
    reconstruction: {
      rows: tapes.length,
      replayMismatches,
      valid: reconstructionValid,
    },
    full: {
      metrics: fullMetrics,
      actionSequences: fullActionSequences,
    },
    fixedSchedules: fixed,
    first8Comparison: {
      mismatchCount: first8MismatchCount,
      totalActions: 240,
      mismatchFraction: first8MismatchFraction,
      scheduleCriterionPass:
        first8MismatchFraction <= 0.10,
    },
    neuralControls: {
      episodeShift1: {
        metrics: shiftedMetrics,
        contribution: shiftContribution,
      },
      decisionMeanNeural: {
        meanMargins,
        metrics: meanMetrics,
        contribution: meanContribution,
      },
    },
    outcome,
    deployment: "BLOCKED",
    next:
      outcome === "V15I_D1_SCHEDULE_DOMINATED_POLICY"
        ? "PREREGISTER_NON_SCHEDULE_REMEDIATION_QUESTION"
        : outcome === "V15I_D1_RECONSTRUCTION_INVALID"
          ? "STOP_AND_REPAIR_DIAGNOSTIC"
          : "FREEZE_AND_LOCALIZE_NEURAL_ALIGNMENT",
  };

  const outDir = resolve(
    "results/v15i-d1-schedule-vs-neural-alignment",
  );
  await mkdir(outDir, { recursive: true });
  await writeFile(
    resolve(outDir, "v15i_d1.json"),
    JSON.stringify(output, null, 2) + "\n",
  );

  if (!reconstructionValid) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
