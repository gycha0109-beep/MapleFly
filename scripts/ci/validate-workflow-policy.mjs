import { readdir, readFile } from "node:fs/promises";

const workflows = ".github/workflows";
const archive = JSON.parse(
  await readFile("science/legacy-workflows.json", "utf8"),
);
const forbiddenLegacyNames = new Set(archive.archived_files ?? []);
const prefixes = archive.prefixes;
const infrastructure = new Set([
  "pages.yml",
  "science.yml",
  "_science-runner.yml",
  "ci-workflow-policy.yml",
  "deployment-verify.yml",
]);

const files = (await readdir(workflows))
  .filter((name) => name.endsWith(".yml") || name.endsWith(".yaml"))
  .sort();

const violations = [];
for (const name of files) {
  if (infrastructure.has(name)) continue;
  if (forbiddenLegacyNames.has(name)) {
    violations.push("archived workflow reactivated: " + name);
    continue;
  }
  if (prefixes.some((prefix) => name.startsWith(prefix))) {
    violations.push(
      "experiment-specific workflow is forbidden: " + name,
    );
    continue;
  }
  violations.push("unclassified workflow requires architecture review: " + name);
}

for (const expected of infrastructure) {
  if (!files.includes(expected)) {
    violations.push("required infrastructure workflow missing: " + expected);
  }
}

if (violations.length) {
  console.error(violations.join("\n"));
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      status: "PASS",
      registeredWorkflows: files.length,
      infrastructureWorkflows: [...infrastructure].sort(),
      archivedLegacyWorkflows: forbiddenLegacyNames.size,
      rule: "science experiments use science/active.json + reusable runner",
    },
    null,
    2,
  ),
);
