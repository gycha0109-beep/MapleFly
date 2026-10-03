import { execFileSync, spawnSync } from "node:child_process";
import { mkdir, open, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const registry = JSON.parse(
  await readFile("science/artifacts/frozen.json", "utf8"),
);

function gh(args) {
  return execFileSync("gh", args, { encoding: "utf8" }).trim();
}

export async function fetchFrozenArtifact({
  key,
  fileKey = "default",
  repository = process.env.GITHUB_REPOSITORY,
}) {
  if (!repository) throw new Error("GITHUB_REPOSITORY is required");
  const meta = registry.artifacts?.[key];
  if (!meta) throw new Error("unknown frozen artifact key " + key);
  const relative = meta.files?.[fileKey];
  if (!relative) throw new Error("unknown file key " + key + ":" + fileKey);

  const api = `repos/${repository}/actions/artifacts/${meta.artifact_id}`;
  const digest = gh(["api", api, "--jq", ".digest"]);
  const headSha = gh(["api", api, "--jq", ".workflow_run.head_sha"]);
  if (digest !== meta.digest) {
    throw new Error(`artifact digest mismatch ${key}: ${digest}`);
  }
  if (headSha !== meta.head_sha) {
    throw new Error(`artifact head SHA mismatch ${key}: ${headSha}`);
  }

  const dir = resolve(".cache/frozen", key);
  await mkdir(dir, { recursive: true });
  const zip = resolve("/tmp", `maplefly-${key}.zip`);
  const fh = await open(zip, "w");
  try {
    const child = spawnSync("gh", ["api", `${api}/zip`], {
      stdio: ["ignore", fh.fd, "inherit"],
    });
    if (child.status !== 0) {
      throw new Error("artifact download failed " + key);
    }
  } finally {
    await fh.close();
  }

  execFileSync("unzip", ["-q", "-o", zip, "-d", dir], {
    stdio: "inherit",
  });

  const target = resolve(dir, relative);
  await readFile(target);

  console.log(
    `[frozen-artifact] ${key} id=${meta.artifact_id} file=${relative}`,
  );
  return { target, meta };
}
