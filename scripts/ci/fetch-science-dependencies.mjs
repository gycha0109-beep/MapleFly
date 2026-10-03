import { appendFile, readFile } from "node:fs/promises";
import { fetchFrozenArtifact } from "./frozen-artifacts.mjs";

const manifestPath = process.argv[2];
if (!manifestPath) throw new Error("manifest path required");
const githubEnv = process.env.GITHUB_ENV;
if (!githubEnv) throw new Error("GITHUB_ENV is required");

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const envLines = [];

for (const dep of manifest.dependencies ?? []) {
  const { target } = await fetchFrozenArtifact({
    key: dep.registry_key,
    fileKey: dep.file_key ?? "default",
  });
  envLines.push(`${dep.env}=${target}`);
}

if (envLines.length) {
  await appendFile(githubEnv, envLines.join("\n") + "\n");
}
