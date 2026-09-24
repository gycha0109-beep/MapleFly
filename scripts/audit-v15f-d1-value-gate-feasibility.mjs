#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const SOURCE_SHA256 =
  null;
const PREREG_COMMIT =
  "3553056c308a03d0ab55fe768a68cbca630ec7e6";
const DECISION_STEPS = Array.from({ length: 10 }, (_, i) => (i + 1) * 240);
const MAX_HP = 100;
const CONTACT_DAMAGE = 10;
const POTION_HEAL = 30;
const POTION_COST = 15;
const MIN_SURVIVORS = 18;
const VALUE_GATE = 5;

function better(current, candidate) {
  return current === null || candidate.value > current.value
    ? candidate
    : current;
}

function bits(mask) {
  return Array.from({ length: 10 }, (_, i) => (mask >> i) & 1);
}

function simulate(row, actions) {
  const contacts = new Map();
  for (const event of row.damageEvents) {
    contacts.set(event.step, (contacts.get(event.step) ?? 0) + 1);
  }
  const decisionIndex = new Map(
    DECISION_STEPS.map((step, index) => [step, index]),
  );
  const eventSteps = [...new Set([
    ...contacts.keys(),
    ...DECISION_STEPS,
  ])].sort((a, b) => a - b);

  let hp = MAX_HP;
  let uses = 0;
  let alive = true;

  for (const step of eventSteps) {
    if (!alive) break;

    const index = decisionIndex.get(step);
    if (index !== undefined && actions[index] === 1) {
      hp = Math.min(MAX_HP, hp + POTION_HEAL);
      uses += 1;
    }

    const count = contacts.get(step) ?? 0;
    for (let i = 0; i < count; i += 1) {
      hp = Math.max(0, hp - CONTACT_DAMAGE);
      if (hp === 0) {
        alive = false;
        break;
      }
    }
  }

  return {
    survived: alive,
    finalHp: hp,
    uses,
    value: hp - POTION_COST * uses,
  };
}

function episodeOracle(row) {
  let bestSurviving = null;
  let bestDying = null;
  let bestUnconstrained = null;

  for (let mask = 0; mask < 1024; mask += 1) {
    const actions = bits(mask);
    const outcome = simulate(row, actions);
    const candidate = {
      ...outcome,
      mask,
      actions: actions.map((x) => (x ? "DRINK" : "WAIT")),
    };
    bestUnconstrained = better(bestUnconstrained, candidate);
    if (candidate.survived) {
      bestSurviving = better(bestSurviving, candidate);
    } else {
      bestDying = better(bestDying, candidate);
    }
  }

  if (!bestSurviving) {
    throw new Error("episode has no surviving POTION sequence: " + row.seed);
  }

  return {
    seed: row.seed,
    baseSeed: row.baseSeed,
    contacts: row.damageEvents.length,
    bestSurviving,
    bestDying,
    bestUnconstrained,
  };
}

function globalUpperBound(oracles) {
  let dp = Array(oracles.length + 1)
    .fill(null)
    .map(() => Array(oracles.length + 1).fill(-Infinity));
  dp[0][0] = 0;

  for (let i = 0; i < oracles.length; i += 1) {
    const next = dp.map((row) => [...row]);
    for (let survivors = 0; survivors <= i; survivors += 1) {
      const base = dp[i][survivors];
      if (!Number.isFinite(base)) continue;

      const surviveValue = oracles[i].bestSurviving.value;
      next[i + 1][survivors + 1] = Math.max(
        next[i + 1][survivors + 1],
        base + surviveValue,
      );

      if (oracles[i].bestDying) {
        next[i + 1][survivors] = Math.max(
          next[i + 1][survivors],
          base + oracles[i].bestDying.value,
        );
      }
    }
    dp = next;
  }

  let bestTotal = -Infinity;
  let bestSurvivors = null;
  for (
    let survivors = MIN_SURVIVORS;
    survivors <= oracles.length;
    survivors += 1
  ) {
    const value = dp[oracles.length][survivors];
    if (value > bestTotal) {
      bestTotal = value;
      bestSurvivors = survivors;
    }
  }

  return {
    minSurvivors: MIN_SURVIVORS,
    bestSurvivors,
    maxTotalValue: bestTotal,
    maxMeanValue: bestTotal / oracles.length,
  };
}

async function main() {
  const sourcePath = resolve(
    process.env.V15F_SOURCE_FILE ??
      ".cache/v15f-authoritative/v15f_ecology.json",
  );
  const raw = await readFile(sourcePath);
  const sourceSha256 = createHash("sha256").update(raw).digest("hex");
  const source = JSON.parse(raw);

  if (
    source.schema !== "maplefly.v15f.known-ecology-remediation.1" ||
    source.outcome !== "V15F_KNOWN_ECOLOGY_REMEDIATION_FAIL" ||
    source.rows?.length !== 24 ||
    source.summary?.survivalRate !== 1 ||
    source.cohort?.horizonSteps !== 2400
  ) {
    throw new Error("v15F source contract mismatch");
  }

  const oracles = source.rows.map(episodeOracle);
  const relaxed = globalUpperBound(oracles);
  const allSurviveMean =
    oracles.reduce(
      (sum, row) => sum + row.bestSurviving.value,
      0,
    ) / oracles.length;

  const unconstrainedMean =
    oracles.reduce(
      (sum, row) => sum + row.bestUnconstrained.value,
      0,
    ) / oracles.length;
  const unconstrainedSurvivors = oracles.filter(
    (row) => row.bestUnconstrained.survived,
  ).length;

  const infeasible = relaxed.maxMeanValue < VALUE_GATE;
  const outcome = infeasible
    ? "V15F_D1_ORIGINAL_VALUE_GATE_JOINTLY_INFEASIBLE"
    : "V15F_D1_ORIGINAL_VALUE_GATE_FEASIBLE";

  console.log(
    "[v15F-D1] allSurviveMean=" +
      allSurviveMean.toFixed(3) +
      " relaxed>=18 maxMean=" +
      relaxed.maxMeanValue.toFixed(3) +
      " bestSurvivors=" +
      relaxed.bestSurvivors +
      " gate=+5",
  );
  console.log(
    "[v15F-D1] unconstrainedMean=" +
      unconstrainedMean.toFixed(3) +
      " unconstrainedSurvivors=" +
      unconstrainedSurvivors +
      " outcome=" +
      outcome,
  );

  const output = {
    schema: "maplefly.v15f-d1.value-gate-feasibility.1",
    preregistration: {
      path: "history/prereg_v15f_d1.md",
      commit: PREREG_COMMIT,
    },
    source: {
      runId: 35967181358,
      artifactId: 10794886720,
      artifactDigest:
        "sha256:4b0ebfc818cdc150ccea1fc86cef7f7aac5b2df587394233c233b8eacc926073",
      jsonSha256: sourceSha256,
      expectedJsonSha256: SOURCE_SHA256,
      episodes: source.rows.length,
    },
    mechanics: {
      decisionSteps: DECISION_STEPS,
      actionSequencesPerEpisode: 1024,
      totalSimulations: source.rows.length * 1024,
      maxHp: MAX_HP,
      contactDamage: CONTACT_DAMAGE,
      potionHeal: POTION_HEAL,
      potionCost: POTION_COST,
      value: "terminalHP - 15*potionUses",
      decisionBeforeSameStepContact: true,
    },
    gateAudit: {
      originalValueImprovementMin: VALUE_GATE,
      originalSurvivalRateMin: 0.75,
      relaxedMinimumSurvivors: MIN_SURVIVORS,
      allSurviveMeanBestValue: allSurviveMean,
      relaxedUpperBound: relaxed,
      unconstrainedMeanBestValue: unconstrainedMean,
      unconstrainedSurvivors,
    },
    oracles,
    outcome,
    originalV15FOutcomeUnchanged: true,
    next: infeasible
      ? "PROSPECTIVE_ECOLOGY_VALUE_CONTRACT_PREREGISTRATION_AUTHORIZED"
      : "SEQUENTIAL_REWARD_REMEDIATION_PREREGISTRATION_AUTHORIZED",
  };

  const outDir = resolve("results/v15f-d1-value-gate-feasibility");
  await mkdir(outDir, { recursive: true });
  await writeFile(
    resolve(outDir, "v15f_d1_feasibility.json"),
    JSON.stringify(output, null, 2) + "\n",
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
