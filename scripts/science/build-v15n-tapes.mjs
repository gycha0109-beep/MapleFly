#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import {
  collectV15nCachedCohort,
  createV15nSimulationContext,
} from "../diagnose-v15n-d6-d2-d3-d3-d4-d2-d1-d1-d1-d1-d1-d1-d1-d1-d1-d1-d1-d1-d1-d1-neural-only-predictive-surprise32.mjs";

const cohortPath = process.argv[2];
if (!cohortPath) {
  throw new Error("cohort set path required");
}

const set = JSON.parse(await readFile(cohortPath, "utf8"));
const entries = Object.entries(set.cohorts ?? {});
if (!entries.length) throw new Error("empty cohort set");

let contextPromise = null;
const getContext = () => {
  if (!contextPromise) contextPromise = createV15nSimulationContext();
  return contextPromise;
};

for (const [name, cohort] of entries) {
  const tapes = await collectV15nCachedCohort({
    getContext,
    baseSeeds: cohort.base_seeds,
    interruptionSeed: cohort.interruption_seed,
    cohortName: cohort.cache_name,
    label: "tape-builder-" + name,
  });
  console.log(
    "[tape-builder] cohort=" + name +
    " tapes=" + tapes.length +
    " cacheName=" + cohort.cache_name,
  );
}
