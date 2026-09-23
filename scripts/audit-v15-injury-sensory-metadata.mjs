#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  SOURCE,
  loadConnectome,
} from "../src/headless/connectome-runtime.mjs";

const PATTERN =
  /(lglg|campan|hair|chord|mechan|bristle|touch|nocice|multidend|proprio|sensory|gust|taste|claw|lb3)/i;

function countType(meta, typeIndex) {
  const counts = { total: 0, none: 0, L: 0, R: 0, other: 0 };
  for (let neuron = 0; neuron < meta.n; neuron += 1) {
    if (meta.typeIdx[neuron] !== typeIndex) continue;
    counts.total += 1;
    const side = meta.side[neuron];
    if (side === 0) counts.none += 1;
    else if (side === 1) counts.L += 1;
    else if (side === 2) counts.R += 1;
    else counts.other += 1;
  }
  return counts;
}

function countSuperclass(meta, classIndex) {
  const counts = { total: 0, none: 0, L: 0, R: 0, other: 0 };
  for (let neuron = 0; neuron < meta.n; neuron += 1) {
    if (meta.classIdx[neuron] !== classIndex) continue;
    counts.total += 1;
    const side = meta.side[neuron];
    if (side === 0) counts.none += 1;
    else if (side === 1) counts.L += 1;
    else if (side === 2) counts.R += 1;
    else counts.other += 1;
  }
  return counts;
}

function recursiveMatches(value, path = "$", out = []) {
  if (typeof value === "string") {
    if (PATTERN.test(value)) out.push({ path, value });
    return out;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      recursiveMatches(item, path + "[" + index + "]", out),
    );
    return out;
  }
  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      if (PATTERN.test(key)) out.push({ path: path + "." + key, value: "<key>" });
      recursiveMatches(item, path + "." + key, out);
    }
  }
  return out;
}

async function main() {
  const outDir = resolve("results/audit-v15-injury-sensory-metadata");
  await mkdir(outDir, { recursive: true });

  const connectome = await loadConnectome({
    cacheDir: resolve(".cache/maplefly-connectome"),
    onProgress(message) {
      console.log("[connectome] " + message);
    },
  });
  const { meta } = connectome;

  const typeCandidates = meta.types
    .map((name, index) => ({ name, index }))
    .filter((row) => PATTERN.test(row.name))
    .map((row) => ({ ...row, counts: countType(meta, row.index) }))
    .filter((row) => row.counts.total > 0);

  const superclassCandidates = meta.superclasses
    .map((name, index) => ({ name, index }))
    .filter((row) => PATTERN.test(row.name))
    .map((row) => ({ ...row, counts: countSuperclass(meta, row.index) }))
    .filter((row) => row.counts.total > 0);

  const sensoryInputMatches = recursiveMatches(meta.sensoryInput);
  const exactLgLGTypes = meta.types
    .map((name, index) => ({ name, index }))
    .filter((row) => row.name.toLowerCase() === "lglg")
    .map((row) => ({ ...row, counts: countType(meta, row.index) }));
  const exactLgLGSuperclasses = meta.superclasses
    .map((name, index) => ({ name, index }))
    .filter((row) => row.name.toLowerCase() === "lglg")
    .map((row) => ({ ...row, counts: countSuperclass(meta, row.index) }));

  const output = {
    schema: "maplefly.v15.injury-sensory-metadata-audit.1",
    brainRepository: SOURCE.repository,
    brainCommit: SOURCE.commit,
    meta: {
      neurons: meta.n,
      typeNames: meta.types.length,
      superclassNames: meta.superclasses.length,
      sensoryInputType: Array.isArray(meta.sensoryInput)
        ? "array"
        : typeof meta.sensoryInput,
      sensoryInputJsonBytes: Buffer.byteLength(
        JSON.stringify(meta.sensoryInput ?? null),
      ),
    },
    exactLgLGTypes,
    exactLgLGSuperclasses,
    typeCandidates,
    superclassCandidates,
    sensoryInputMatches,
  };

  await writeFile(
    resolve(outDir, "v15_injury_sensory_metadata.json"),
    JSON.stringify(output, null, 2) + "\n",
  );

  console.log(
    "V15-INJURY-SENSORY-METADATA-AUDIT" +
      " exactType=" +
      exactLgLGTypes.length +
      " exactSuperclass=" +
      exactLgLGSuperclasses.length +
      " typeCandidates=" +
      typeCandidates.length +
      " superclassCandidates=" +
      superclassCandidates.length +
      " sensoryMatches=" +
      sensoryInputMatches.length,
  );

  for (const row of typeCandidates) {
    console.log(
      "[type] " +
        row.name +
        " total=" +
        row.counts.total +
        " L=" +
        row.counts.L +
        " R=" +
        row.counts.R +
        " none=" +
        row.counts.none,
    );
  }
  for (const row of superclassCandidates) {
    console.log(
      "[superclass] " +
        row.name +
        " total=" +
        row.counts.total +
        " L=" +
        row.counts.L +
        " R=" +
        row.counts.R +
        " none=" +
        row.counts.none,
    );
  }
  for (const row of sensoryInputMatches.slice(0, 120)) {
    console.log("[sensory_input] " + row.path + "=" + row.value);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
