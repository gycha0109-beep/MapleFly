import { readdir, readFile } from "node:fs/promises";

const workflows = ".github/workflows";
const allow = JSON.parse(
  await readFile("science/legacy-workflows.json", "utf8"),
);
const legacy = new Set(allow.files);
const prefixes = allow.prefixes;
const infrastructure = new Set([
  "pages.yml",
  "science.yml",
  "_science-runner.yml",
  "ci-workflow-policy.yml",
]);

const files = (await readdir(workflows))
  .filter((name) => name.endsWith(".yml") || name.endsWith(".yaml"))
  .sort();

const violations = [];
for (const name of files) {
  if (infrastructure.has(name)) continue;
  if (legacy.has(name)) continue;
  if (prefixes.some((prefix) => name.startsWith(prefix))) {
    violations.push(
      `new experiment-specific workflow is forbidden: ${name}`,
    );
    continue;
  }
  violations.push(`unclassified workflow requires architecture review: ${name}`);
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
      legacyExperimentWorkflows: legacy.size,
      infrastructureWorkflows: [...infrastructure].sort(),
      rule: "new science experiments must use science/active.json + reusable runner",
    },
    null,
    2,
  ),
);
