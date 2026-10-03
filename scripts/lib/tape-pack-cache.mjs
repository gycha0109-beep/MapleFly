import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { deserialize, serialize } from "node:v8";
import { gzip, gunzip } from "node:zlib";

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

export const TAPE_PACK_SCHEMA = "maplefly.tape-pack.v1";

function normalize(value) {
  if (Array.isArray(value)) return value.map(normalize);
  if (
    value &&
    typeof value === "object" &&
    !(value instanceof ArrayBuffer) &&
    !ArrayBuffer.isView(value)
  ) {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, normalize(value[key])]),
    );
  }
  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(normalize(value));
}

export function tapePackKey(identity) {
  return createHash("sha256")
    .update(canonicalJson({ schema: TAPE_PACK_SCHEMA, identity }))
    .digest("hex");
}

export function tapePackPath(cacheDir, identity) {
  return join(resolve(cacheDir), tapePackKey(identity) + ".v8.gz");
}

export async function saveTapePack({ cacheDir, identity, tapes }) {
  await mkdir(cacheDir, { recursive: true });
  const key = tapePackKey(identity);
  const path = join(resolve(cacheDir), key + ".v8.gz");
  const payload = {
    schema: TAPE_PACK_SCHEMA,
    key,
    identity: normalize(identity),
    tapes,
  };
  const compressed = await gzipAsync(serialize(payload), { level: 6 });
  const tmp = path + ".tmp-" + process.pid;
  await writeFile(tmp, compressed);
  await rename(tmp, path);
  return { key, path, tapes };
}

export async function loadTapePack({ cacheDir, identity }) {
  const key = tapePackKey(identity);
  const path = join(resolve(cacheDir), key + ".v8.gz");
  let compressed;
  try {
    compressed = await readFile(path);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
  const payload = deserialize(await gunzipAsync(compressed));
  if (payload.schema !== TAPE_PACK_SCHEMA) {
    throw new Error("Tape Pack schema mismatch");
  }
  if (payload.key !== key) {
    throw new Error("Tape Pack key mismatch");
  }
  if (canonicalJson(payload.identity) !== canonicalJson(normalize(identity))) {
    throw new Error("Tape Pack identity mismatch");
  }
  return { key, path, tapes: payload.tapes };
}

export async function loadOrBuildTapePack({
  cacheDir = process.env.MAPLEFLY_TAPE_CACHE_DIR ?? ".cache/maplefly-tapes",
  identity,
  build,
  validate = null,
}) {
  const cached = await loadTapePack({ cacheDir, identity });
  if (cached) {
    if (validate) await validate(cached.tapes);
    console.log("[tape-pack] HIT " + cached.key);
    return { ...cached, cacheHit: true };
  }

  console.log("[tape-pack] MISS " + tapePackKey(identity));
  const tapes = await build();
  if (validate) await validate(tapes);
  const saved = await saveTapePack({ cacheDir, identity, tapes });
  return { ...saved, cacheHit: false };
}

export function neuralOnlyTapeView(tape) {
  return {
    seed: tape.seed,
    frames: (tape.potionFrameEvents ?? []).map((frame) => ({
      frameIndex: frame.frameIndex,
      step: frame.step,
      values: frame.values,
    })),
  };
}

export function evaluatorTruthTapeView(tape) {
  return {
    seed: tape.seed,
    damageEvents: tape.damageEvents ?? [],
    contacts: tape.contacts ?? null,
    damageTaken: tape.damageTaken ?? null,
    finalHp: tape.finalHp ?? null,
    deathStep: tape.deathStep ?? null,
    survived: tape.survived ?? null,
  };
}
