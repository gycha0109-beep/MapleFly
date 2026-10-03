import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { tapePackKey } from "../lib/tape-pack-cache.mjs";

const manifestPath = process.argv[2];
if (!manifestPath) throw new Error("manifest path required");

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
if (!manifest.simulation_contract || !manifest.cohort_set) {
  throw new Error("simulation_contract and cohort_set are required");
}

const simulation = JSON.parse(
  await readFile(manifest.simulation_contract, "utf8"),
);
const cohortSet = JSON.parse(
  await readFile(manifest.cohort_set, "utf8"),
);

if (cohortSet.simulation_contract !== simulation.id) {
  throw new Error("cohort/simulation contract mismatch");
}

const verifyBlob = (source) => {
  const actual = execFileSync("git", ["hash-object", source.path], {
    encoding: "utf8",
  }).trim();
  if (actual !== source.blob_sha) {
    throw new Error(
      `simulation source drift ${source.path}: ${actual} != ${source.blob_sha}`,
    );
  }
};

verifyBlob(simulation.source_anchor);
for (const source of simulation.runtime_sources ?? []) verifyBlob(source);

const keys = {};
for (const [name, cohort] of Object.entries(cohortSet.cohorts ?? {})) {
  const cacheName = cohort.cache_name;
  if (!cacheName) throw new Error("cohort cache_name missing: " + name);
  const identity = {
    simulationContract: simulation.id,
    connectomeCommit: simulation.connectome.commit,
    cohortName: cacheName,
    baseSeeds: cohort.base_seeds,
    interruptionSeed: cohort.interruption_seed,
  };
  keys[name] = tapePackKey(identity);
}

console.log(JSON.stringify({
  status: "PASS",
  simulationContract: simulation.id,
  cohortSet: cohortSet.id,
  tapeKeys: keys,
}, null, 2));
