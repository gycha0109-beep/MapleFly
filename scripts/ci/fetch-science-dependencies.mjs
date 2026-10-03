import { appendFile, readFile } from "node:fs/promises";
import { fetchFrozenArtifact } from "./frozen-artifacts.mjs";

const manifestPath = process.argv[2];
const mode = process.argv[3] ?? "analysis";
if (!manifestPath) throw new Error("manifest path required");
if (!["simulation", "analysis"].includes(mode)) {
  throw new Error("dependency mode must be simulation or analysis");
}

const githubEnv = process.env.GITHUB_ENV;
if (!githubEnv) throw new Error("GITHUB_ENV is required");

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const deps =
  mode === "simulation"
    ? (manifest.simulation_dependencies ?? manifest.dependencies ?? [])
    : (manifest.dependencies ?? []);

const envLines = [];
for (const dep of deps) {
  const { target } = await fetchFrozenArtifact({
    key: dep.registry_key,
    fileKey: dep.file_key ?? "default",
  });
  envLines.push(`${dep.env}=${target}`);
}

for (const [key, rawValue] of Object.entries(manifest.env ?? {})) {
  const value = String(rawValue);
  if (value.includes("\n") || value.includes("\r")) {
    throw new Error("multiline manifest env is forbidden: " + key);
  }
  envLines.push(`${key}=${value}`);
}

if (envLines.length) {
  await appendFile(githubEnv, envLines.join("\n") + "\n");
}

console.log(JSON.stringify({
  mode,
  dependencyCount: deps.length,
  exportedEnvironmentCount: envLines.length,
}));
