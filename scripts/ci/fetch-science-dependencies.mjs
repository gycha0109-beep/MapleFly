import { execFileSync, spawnSync } from "node:child_process";
import { mkdir, open, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const manifestPath = process.argv[2];
if (!manifestPath) throw new Error("manifest path required");
const repo = process.env.GITHUB_REPOSITORY;
const githubEnv = process.env.GITHUB_ENV;
if (!repo || !githubEnv) {
  throw new Error("GITHUB_REPOSITORY and GITHUB_ENV are required");
}

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const registry = JSON.parse(
  await readFile("science/artifacts/frozen.json", "utf8"),
);

const sh = (args) =>
  execFileSync("gh", args, { encoding: "utf8" }).trim();

const envLines = [];
for (const dep of manifest.dependencies ?? []) {
  const meta = registry.artifacts?.[dep.registry_key];
  if (!meta) throw new Error("unknown registry key " + dep.registry_key);

  const api = `repos/${repo}/actions/artifacts/${meta.artifact_id}`;
  const digest = sh(["api", api, "--jq", ".digest"]);
  const headSha = sh(["api", api, "--jq", ".workflow_run.head_sha"]);
  if (digest !== meta.digest) {
    throw new Error(`artifact digest mismatch ${dep.registry_key}`);
  }
  if (headSha !== meta.head_sha) {
    throw new Error(`artifact head SHA mismatch ${dep.registry_key}`);
  }

  const dir = resolve(".cache/frozen", dep.registry_key);
  await mkdir(dir, { recursive: true });
  const zip = resolve("/tmp", `maplefly-${dep.registry_key}.zip`);
  const fh = await open(zip, "w");
  try {
    const child = spawnSync(
      "gh",
      ["api", `${api}/zip`],
      { stdio: ["ignore", fh.fd, "inherit"] },
    );
    if (child.status !== 0) {
      throw new Error(`artifact download failed ${dep.registry_key}`);
    }
  } finally {
    await fh.close();
  }
  execFileSync("unzip", ["-q", "-o", zip, "-d", dir], {
    stdio: "inherit",
  });

  const fileKey = dep.file_key ?? "default";
  const relative = meta.files[fileKey];
  const target = resolve(dir, relative);
  envLines.push(`${dep.env}=${target}`);
  console.log(
    `[science-dependency] ${dep.registry_key} artifact=${meta.artifact_id} file=${relative}`,
  );
}

if (envLines.length) {
  const fs = await import("node:fs/promises");
  await fs.appendFile(githubEnv, envLines.join("\n") + "\n");
}
