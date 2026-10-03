import { appendFile } from "node:fs/promises";
import { fetchFrozenArtifact } from "./frozen-artifacts.mjs";

const spec = process.argv[2];
const githubEnv = process.env.GITHUB_ENV;
if (!spec) throw new Error("mapping spec required");
if (!githubEnv) throw new Error("GITHUB_ENV is required");

const lines = [];
for (const raw of spec.split(",").map((x) => x.trim()).filter(Boolean)) {
  const [lhs, env] = raw.split("=");
  if (!lhs || !env || !/^[A-Z][A-Z0-9_]*$/.test(env)) {
    throw new Error("invalid mapping " + raw);
  }
  const [key, fileKey = "default"] = lhs.split(":");
  const { target } = await fetchFrozenArtifact({ key, fileKey });
  lines.push(`${env}=${target}`);
}
await appendFile(githubEnv, lines.join("\n") + "\n");
