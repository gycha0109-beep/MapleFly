import {
  mkdir,
  readFile,
  stat,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";

export const SOURCE = Object.freeze({
  repository: "alextitonis/fly.ai",
  commit: "95a3dbcb05241b0a5c07028ca8ad945b23fbbe6e",
  assetBase:
    "https://raw.githubusercontent.com/alextitonis/fly.ai/95a3dbcb05241b0a5c07028ca8ad945b23fbbe6e/world/public/connectome/",
  neurons: 166700,
  synapses: 25088107,
  weightsMb: 57.6,
});

export const RATE_TAU = 0.18;

const textDecoder = new TextDecoder();

function mulberry32(seed) {
  let state = Math.trunc(Number(seed) || 0) >>> 0;

  return function random() {
    let t = (state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function exactArrayBuffer(buffer) {
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  );
}

function maybeGunzip(buffer) {
  if (
    buffer.length >= 2 &&
    buffer[0] === 0x1f &&
    buffer[1] === 0x8b
  ) {
    return gunzipSync(buffer);
  }

  return buffer;
}

function assertMagic(view, expected) {
  const got = String.fromCharCode(
    view.getUint8(0),
    view.getUint8(1),
    view.getUint8(2),
    view.getUint8(3),
  );

  if (got !== expected) {
    throw new Error(
      `잘못된 connectome 파일: expected=${expected}, got=${got}`,
    );
  }
}

export function parseMeta(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  assertMagic(view, "FLYM");

  const n = view.getUint32(8, true);
  const headerLength = view.getUint32(12, true);
  const header = JSON.parse(
    textDecoder.decode(
      new Uint8Array(arrayBuffer, 16, headerLength),
    ),
  );

  let offset = 16 + headerLength;
  const typeIdx = new Uint16Array(
    arrayBuffer.slice(offset, offset + 2 * n),
  );
  offset += 2 * n;

  const classIdx = new Uint8Array(arrayBuffer, offset, n);
  offset += n;

  const side = new Uint8Array(arrayBuffer, offset, n);

  return {
    n,
    types: header.types,
    superclasses: header.superclasses,
    params: header.params,
    sensoryInput: header.sensory_input,
    typeIdx,
    classIdx,
    side,
  };
}

export function parseWeights(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  assertMagic(view, "FLYW");

  const n = view.getUint32(8, true);
  const nnz = view.getUint32(12, true);
  const lnMin = view.getFloat32(16, true);
  const bytes = new Uint8Array(arrayBuffer);
  let offset = 20;

  const readVarint = () => {
    let value = 0;
    let shift = 0;
    let byte = 0;

    do {
      byte = bytes[offset++];
      value += (byte & 0x7f) * 2 ** shift;
      shift += 7;
    } while (byte & 0x80);

    return value;
  };

  const colPtr = new Uint32Array(n + 1);

  for (let neuron = 0; neuron < n; neuron += 1) {
    colPtr[neuron + 1] = colPtr[neuron] + readVarint();
  }

  const rowIdx = new Uint32Array(nnz);

  for (let neuron = 0; neuron < n; neuron += 1) {
    let row = 0;

    for (
      let edge = colPtr[neuron], first = true;
      edge < colPtr[neuron + 1];
      edge += 1, first = false
    ) {
      row = first ? readVarint() : row + readVarint();
      rowIdx[edge] = row;
    }
  }

  const code = bytes.slice(offset, offset + nnz);
  const lut = new Float32Array(256);

  for (let quantized = 0; quantized < 128; quantized += 1) {
    const magnitude = Math.exp(
      lnMin * (1 - quantized / 127),
    );
    lut[quantized] = magnitude;
    lut[quantized | 0x80] = -magnitude;
  }

  return {
    n,
    nnz,
    colPtr,
    rowIdx,
    code,
    lut,
  };
}

export function cells(meta, names, requestedSide) {
  const wanted = new Set(names);
  const typeHit = meta.types.map((name) => wanted.has(name));
  const classHit = meta.superclasses.map((name) =>
    wanted.has(name),
  );
  const sideCode =
    requestedSide === "L"
      ? 1
      : requestedSide === "R"
        ? 2
        : 0;

  const result = [];

  for (let index = 0; index < meta.n; index += 1) {
    if (
      !(
        typeHit[meta.typeIdx[index]] ||
        classHit[meta.classIdx[index]]
      )
    ) {
      continue;
    }

    if (sideCode && meta.side[index] !== sideCode) {
      continue;
    }

    result.push(index);
  }

  return Int32Array.from(result);
}

export function cellsWithPrefix(meta, prefix, requestedSide) {
  const typeHit = meta.types.map((name) =>
    name.startsWith(prefix),
  );
  const sideCode =
    requestedSide === "L"
      ? 1
      : requestedSide === "R"
        ? 2
        : 0;

  const result = [];

  for (let index = 0; index < meta.n; index += 1) {
    if (!typeHit[meta.typeIdx[index]]) {
      continue;
    }

    if (sideCode && meta.side[index] !== sideCode) {
      continue;
    }

    result.push(index);
  }

  return Int32Array.from(result);
}

const WING_POWER = [
  "DLMn a, b",
  "DLMn c-f",
  "DVMn 1a-c",
  "DVMn 2a, b",
  "DVMn 3a, b",
];

const LEG_EXTEND = [
  "Ti extensor MN",
  "Tr extensor MN",
  "Sternotrochanter MN",
];

const LEG_FLEX = [
  "Ti flexor MN",
  "Acc. ti flexor MN",
  "Tr flexor MN",
  "Acc. tr flexor MN",
];

export function buildInputGroups(meta) {
  const groups = new Map();

  for (const side of ["L", "R"]) {
    for (const type of [
      "LPLC2",
      "LC4",
      "LPLC1",
      "LC10a",
    ]) {
      groups.set(
        `${type}_${side}`,
        cells(meta, [type], side),
      );
    }

    groups.set(
      `SNta_${side}`,
      cellsWithPrefix(meta, "SNta", side),
    );

    groups.set(
      `LgLG_${side}`,
      cells(meta, ["LgLG"], side),
    );
  }

  return groups;
}

export function buildOutputGroups(meta) {
  const output = [];

  for (const side of ["L", "R"]) {
    for (const type of [
      "DNg100",
      "DNa02",
      "DNp01",
      "MDN",
    ]) {
      output.push([
        `${type} ${side}`,
        cells(meta, [type], side),
      ]);
    }

    output.push([
      `wing power ${side}`,
      cells(meta, WING_POWER, side),
    ]);
    output.push([
      `leg extend ${side}`,
      cells(meta, LEG_EXTEND, side),
    ]);
    output.push([
      `leg flex ${side}`,
      cells(meta, LEG_FLEX, side),
    ]);
    output.push([
      `arm pull ${side}`,
      cells(
        meta,
        ["DNp02", "DNp03", "DNp04", "DNp11", "DNg40"],
        side,
      ),
    ]);
    output.push([
      `leg kick ${side}`,
      cells(
        meta,
        ["DNge104", "DNge122", "DNg20", "DNge102"],
        side,
      ),
    ]);
    output.push([
      `head tug ${side}`,
      cells(
        meta,
        ["DNa05", "DNa07", "DNg111", "DNae002"],
        side,
      ),
    ]);
  }

  return output;
}

export class ConnectomeBrain {
  constructor(weights, params, seed = 64) {
    this.weights = weights;
    this.params = params;
    this.n = weights.n;
    this.v = new Float32Array(weights.n);
    this.drive = new Float32Array(weights.n);
    this.current = new Float32Array(weights.n);
    this.fired = new Int32Array(weights.n);
    this.postGain = new Float32Array(weights.n).fill(1);
    this.tonicExtra = new Float32Array(weights.n);
    // Per-presynaptic-neuron output multiplier. Default 1 keeps every
    // existing experiment bit-for-bit on the original connectome path.
    // v6 Phase B uses this only for the two APL neurons as a diagnostic
    // feedback-inhibition proxy.
    this.outGain = new Float32Array(weights.n).fill(1);
    this.reset(seed);
  }

  reset(seed = 64) {
    this.v.fill(0);
    this.drive.fill(0);
    this.current.fill(0);
    this.firedCount = 0;
    this.steps = 0;
    this.random = mulberry32(seed);
  }

  stimulate(indices, amount) {
    if (!amount) {
      return;
    }

    for (
      let index = 0;
      index < indices.length;
      index += 1
    ) {
      this.drive[indices[index]] += amount;
    }
  }

  step() {
    const { colPtr, rowIdx, code, lut } = this.weights;
    this.current.fill(0);

    for (
      let firedIndex = 0;
      firedIndex < this.firedCount;
      firedIndex += 1
    ) {
      const presynaptic = this.fired[firedIndex];
      const end = colPtr[presynaptic + 1];
      const outputGain = this.outGain[presynaptic];

      for (
        let edge = colPtr[presynaptic];
        edge < end;
        edge += 1
      ) {
        this.current[rowIdx[edge]] +=
          outputGain * lut[code[edge]];
      }
    }

    const params = this.params;
    const decay = Math.exp(-params.dt / params.tau);
    const noiseChance = params.noise_hz * params.dt;
    let nextFiredCount = 0;

    for (let index = 0; index < this.n; index += 1) {
      let voltage =
        decay * this.v[index] +
        params.gain *
          this.postGain[index] *
          this.current[index] +
        params.tonic +
        this.tonicExtra[index] +
        this.drive[index];

      if (this.random() < noiseChance) {
        voltage += params.noise_amp;
      }

      if (voltage >= 1) {
        this.fired[nextFiredCount++] = index;
        voltage = 0;
      }

      this.v[index] = voltage;
      this.drive[index] = 0;
    }

    this.firedCount = nextFiredCount;
    this.steps += 1;
  }
}

export class RateTracker {
  constructor(meta, outputGroups) {
    this.meta = meta;
    this.outputGroups = outputGroups;
    this.groupOf = new Int16Array(meta.n).fill(-1);
    this.hz = new Float64Array(outputGroups.length);
    this.count = new Float64Array(outputGroups.length);
    this.nameToIndex = new Map();

    outputGroups.forEach(([name, indices], group) => {
      this.nameToIndex.set(name, group);

      for (const index of indices) {
        this.groupOf[index] = group;
      }
    });
  }

  reset() {
    this.hz.fill(0);
    this.count.fill(0);
  }

  update(brain) {
    this.count.fill(0);

    for (
      let index = 0;
      index < brain.firedCount;
      index += 1
    ) {
      const group = this.groupOf[brain.fired[index]];
      if (group >= 0) {
        this.count[group] += 1;
      }
    }

    const decay = Math.exp(
      -this.meta.params.dt / RATE_TAU,
    );

    for (
      let group = 0;
      group < this.outputGroups.length;
      group += 1
    ) {
      const size = Math.max(
        1,
        this.outputGroups[group][1].length,
      );

      this.hz[group] =
        decay * this.hz[group] +
        (1 - decay) *
          this.count[group] /
          (size * this.meta.params.dt);
    }
  }

  rate(name) {
    const index = this.nameToIndex.get(name);
    return index === undefined ? 0 : this.hz[index];
  }
}

async function existsWithBytes(filePath) {
  try {
    const info = await stat(filePath);
    return info.isFile() && info.size > 0;
  } catch {
    return false;
  }
}

async function fetchToCache(url, filePath, onProgress) {
  if (await existsWithBytes(filePath)) {
    onProgress?.(`cache hit: ${filePath}`);
    return;
  }

  onProgress?.(`download: ${url}`);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `${url}: HTTP ${response.status}`,
    );
  }

  const bytes = Buffer.from(
    await response.arrayBuffer(),
  );
  await writeFile(filePath, bytes);
  onProgress?.(
    `saved: ${filePath} (${(bytes.length / 1e6).toFixed(1)} MB)`,
  );
}

async function loadJoined(paths) {
  const buffers = [];

  for (const filePath of paths) {
    buffers.push(await readFile(filePath));
  }

  return exactArrayBuffer(
    maybeGunzip(Buffer.concat(buffers)),
  );
}

export async function loadConnectome({
  cacheDir,
  onProgress = () => {},
} = {}) {
  if (!cacheDir) {
    throw new Error("cacheDir is required");
  }

  await mkdir(cacheDir, { recursive: true });

  const manifestPath = join(cacheDir, "brain.json");
  await fetchToCache(
    SOURCE.assetBase + "brain.json",
    manifestPath,
    onProgress,
  );

  const manifest = JSON.parse(
    await readFile(manifestPath, "utf8"),
  );

  const metaPath = join(cacheDir, "meta.bin");
  await fetchToCache(
    SOURCE.assetBase + "meta.bin",
    metaPath,
    onProgress,
  );

  const partPaths = [];

  for (const part of manifest.parts) {
    const filePath = join(cacheDir, part);
    await fetchToCache(
      SOURCE.assetBase + part,
      filePath,
      onProgress,
    );
    partPaths.push(filePath);
  }

  onProgress("parse meta");
  const meta = parseMeta(
    await loadJoined([metaPath]),
  );

  onProgress("parse 25M+ connections");
  const weights = parseWeights(
    await loadJoined(partPaths),
  );

  if (
    weights.n !== SOURCE.neurons ||
    weights.nnz !== SOURCE.synapses
  ) {
    throw new Error(
      `connectome mismatch: neurons=${weights.n}, synapses=${weights.nnz}`,
    );
  }

  const inputGroups = buildInputGroups(meta);
  const outputGroups = buildOutputGroups(meta);

  return {
    manifest,
    meta,
    weights,
    inputGroups,
    outputGroups,
  };
}
