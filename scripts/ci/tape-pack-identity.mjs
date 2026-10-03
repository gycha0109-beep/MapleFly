import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { tapePackKey } from "../lib/tape-pack-cache.mjs";

const [simulationPath, cohortPath, cohortName] = process.argv.slice(2);
if (!simulationPath || !cohortPath || !cohortName) {
  throw new Error(
    "usage: node scripts/ci/tape-pack-identity.mjs <simulation.json> <cohorts.json> <cohort-name>",
  );
}

const simulation = JSON.parse(await readFile(simulationPath, "utf8"));
const cohortSet = JSON.parse(await readFile(cohortPath, "utf8"));
const cohort = cohortSet.cohorts?.[cohortName];
if (!cohort) throw new Error("unknown cohort " + cohortName);
if (cohortSet.simulation_contract !== simulation.id) {
  throw new Error("cohort/simulation contract mismatch");
}

for (const source of simulation.runtime_sources ?? []) {
  const actual = execFileSync("git", ["hash-object", source.path], {
    encoding: "utf8",
  }).trim();
  if (actual !== source.blob_sha) {
    throw new Error(
      `simulation source drift ${source.path}: ${actual} != ${source.blob_sha}`,
    );
  }
}

const identity = {
  simulation_contract: simulation.id,
  connectome_commit: simulation.connectome.commit,
  source_anchor_blob_sha: simulation.source_anchor.blob_sha,
  runtime_source_blobs: simulation.runtime_sources.map((row) => [
    row.path,
    row.blob_sha,
  ]),
  deployed_contract: simulation.deployed_contract,
  cohort_name: cohortName,
  base_seeds: cohort.base_seeds,
  interruption_seed: cohort.interruption_seed,
};

console.log(
  JSON.stringify(
    {
      schema: "maplefly.tape-pack-identity.v1",
      key: tapePackKey(identity),
      identity,
    },
    null,
    2,
  ),
);
