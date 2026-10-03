import { readFile } from "node:fs/promises";
import { posix } from "node:path";

const path = process.argv[2];
if (!path) throw new Error("manifest path required");

const manifest = JSON.parse(await readFile(path, "utf8"));
const registry = JSON.parse(
  await readFile("science/artifacts/frozen.json", "utf8"),
);

const fail = (message) => {
  throw new Error("invalid science manifest: " + message);
};
const safeRepoPath = (value) =>
  typeof value === "string" &&
  value.length > 0 &&
  !value.startsWith("/") &&
  !value.includes("..") &&
  posix.normalize(value) === value;

const allowed = new Set([
  "schema","id","script","output_dir","artifact_name","needs_malecns",
  "analysis_needs_malecns","dependencies","simulation_dependencies",
  "env","simulation_contract","cohort_set","historical_run_id",
  "migration_note","tape_builder","request_id",
]);
for (const key of Object.keys(manifest)) {
  if (!allowed.has(key)) fail("unknown field " + key);
}

if (manifest.schema !== "maplefly.science-experiment.v1") fail("schema");
if (
  manifest.request_id !== undefined &&
  (
    typeof manifest.request_id !== "string" ||
    !manifest.request_id.length ||
    manifest.request_id.length > 128
  )
) fail("request_id");
if (!/^[a-z0-9][a-z0-9-]*$/.test(manifest.id ?? "")) fail("id");
if (
  !safeRepoPath(manifest.script) ||
  !manifest.script.startsWith("scripts/") ||
  !manifest.script.endsWith(".mjs")
) fail("script");
if (
  !safeRepoPath(manifest.output_dir) ||
  !manifest.output_dir.startsWith("results/")
) fail("output_dir");
if (
  typeof manifest.artifact_name !== "string" ||
  !manifest.artifact_name
) fail("artifact_name");
if (!Array.isArray(manifest.dependencies)) fail("dependencies");
if (
  manifest.analysis_needs_malecns !== undefined &&
  typeof manifest.analysis_needs_malecns !== "boolean"
) fail("analysis_needs_malecns");

if (manifest.simulation_contract !== undefined) {
  if (
    !safeRepoPath(manifest.simulation_contract) ||
    !manifest.simulation_contract.startsWith("science/simulations/") ||
    !manifest.simulation_contract.endsWith(".json")
  ) fail("simulation_contract");
  await readFile(manifest.simulation_contract);
}
if (manifest.tape_builder !== undefined) {
  if (
    !safeRepoPath(manifest.tape_builder) ||
    !manifest.tape_builder.startsWith("scripts/") ||
    !manifest.tape_builder.endsWith(".mjs")
  ) fail("tape_builder");
  await readFile(manifest.tape_builder);
}
if (manifest.cohort_set !== undefined) {
  if (
    !safeRepoPath(manifest.cohort_set) ||
    !manifest.cohort_set.startsWith("science/cohorts/") ||
    !manifest.cohort_set.endsWith(".json")
  ) fail("cohort_set");
  await readFile(manifest.cohort_set);
}

function validateDependencyList(list, label) {
  if (!Array.isArray(list)) fail(label);
  const envs = new Set();
  for (const dep of list) {
    if (!registry.artifacts?.[dep.registry_key]) {
      fail("unknown registry key " + dep.registry_key);
    }
    if (!/^[A-Z][A-Z0-9_]*$/.test(dep.env ?? "")) {
      fail("invalid dependency env " + dep.env);
    }
    if (envs.has(dep.env)) {
      fail("duplicate dependency env " + dep.env + " in " + label);
    }
    envs.add(dep.env);
    const fileKey = dep.file_key ?? "default";
    if (!registry.artifacts[dep.registry_key].files?.[fileKey]) {
      fail("unknown file_key " + dep.registry_key + ":" + fileKey);
    }
  }
}

validateDependencyList(manifest.dependencies, "dependencies");
if (manifest.simulation_dependencies !== undefined) {
  validateDependencyList(
    manifest.simulation_dependencies,
    "simulation_dependencies",
  );
}

for (const [key, value] of Object.entries(manifest.env ?? {})) {
  if (!/^[A-Z][A-Z0-9_]*$/.test(key)) fail("invalid env key " + key);
  if (!["string", "number", "boolean"].includes(typeof value)) {
    fail("invalid env value " + key);
  }
}

console.log(JSON.stringify({ status: "PASS", id: manifest.id }, null, 2));
