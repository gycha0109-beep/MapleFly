"use strict";

/**
 * MapleFly browser connectome worker.
 *
 * File format and LIF update are adapted from alexitonis/fly.ai's browser
 * connectome implementation (MIT License), pinned by MapleFly to:
 * 95a3dbcb05241b0a5c07028ca8ad945b23fbbe6e
 *
 * The connectome assets themselves are fetched directly from that pinned
 * upstream commit and are not stored in MapleFly.
 */

const RATE_TAU = 0.18;

function mulberry32(seed) {
  return function random() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const textDecoder = new TextDecoder();

function assertMagic(view, expected) {
  const got = String.fromCharCode(
    view.getUint8(0),
    view.getUint8(1),
    view.getUint8(2),
    view.getUint8(3),
  );

  if (got !== expected) {
    throw new Error(`잘못된 connectome 파일입니다. expected=${expected}, got=${got}`);
  }
}

function parseMeta(buffer) {
  const view = new DataView(buffer);
  assertMagic(view, "FLYM");

  const n = view.getUint32(8, true);
  const headerLength = view.getUint32(12, true);
  const header = JSON.parse(
    textDecoder.decode(new Uint8Array(buffer, 16, headerLength)),
  );

  let offset = 16 + headerLength;
  const typeIdx = new Uint16Array(buffer.slice(offset, offset + 2 * n));
  offset += 2 * n;
  const classIdx = new Uint8Array(buffer, offset, n);
  offset += n;
  const side = new Uint8Array(buffer, offset, n);

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

function parseWeights(buffer) {
  const view = new DataView(buffer);
  assertMagic(view, "FLYW");

  const n = view.getUint32(8, true);
  const nnz = view.getUint32(12, true);
  const lnMin = view.getFloat32(16, true);
  const bytes = new Uint8Array(buffer);
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
    const magnitude = Math.exp(lnMin * (1 - quantized / 127));
    lut[quantized] = magnitude;
    lut[quantized | 0x80] = -magnitude;
  }

  return { n, nnz, colPtr, rowIdx, code, lut };
}

function cells(meta, names, requestedSide) {
  const wanted = new Set(names);
  const typeHit = meta.types.map((name) => wanted.has(name));
  const classHit = meta.superclasses.map((name) => wanted.has(name));
  const sideCode = requestedSide === "L" ? 1 : requestedSide === "R" ? 2 : 0;
  const result = [];

  for (let index = 0; index < meta.n; index += 1) {
    if (!(typeHit[meta.typeIdx[index]] || classHit[meta.classIdx[index]])) {
      continue;
    }

    if (sideCode && meta.side[index] !== sideCode) {
      continue;
    }

    result.push(index);
  }

  return Int32Array.from(result);
}

function cellsWithPrefix(meta, prefix, requestedSide) {
  const typeHit = meta.types.map((name) => name.startsWith(prefix));
  const sideCode = requestedSide === "L" ? 1 : requestedSide === "R" ? 2 : 0;
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

class ConnectomeBrain {
  constructor(weights, params, seed = 64) {
    this.weights = weights;
    this.params = params;
    this.n = weights.n;
    this.v = new Float32Array(weights.n);
    this.drive = new Float32Array(weights.n);
    this.current = new Float32Array(weights.n);
    this.fired = new Int32Array(weights.n);
    this.firedCount = 0;
    this.postGain = new Float32Array(weights.n).fill(1);
    this.tonicExtra = new Float32Array(weights.n);
    this.steps = 0;
    this.random = mulberry32(seed);
  }

  stimulate(indices, amount) {
    if (!amount) {
      return;
    }

    for (let index = 0; index < indices.length; index += 1) {
      this.drive[indices[index]] += amount;
    }
  }

  step() {
    const { colPtr, rowIdx, code, lut } = this.weights;
    this.current.fill(0);

    for (let firedIndex = 0; firedIndex < this.firedCount; firedIndex += 1) {
      const presynaptic = this.fired[firedIndex];
      const end = colPtr[presynaptic + 1];

      for (let edge = colPtr[presynaptic]; edge < end; edge += 1) {
        this.current[rowIdx[edge]] += lut[code[edge]];
      }
    }

    const params = this.params;
    const decay = Math.exp(-params.dt / params.tau);
    const noiseChance = params.noise_hz * params.dt;
    let nextFiredCount = 0;

    for (let index = 0; index < this.n; index += 1) {
      let voltage =
        decay * this.v[index] +
        params.gain * this.postGain[index] * this.current[index] +
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

function buildInputGroups(meta) {
  const groups = new Map();

  for (const side of ["L", "R"]) {
    for (const type of [
      "LPLC2",
      "LC4",
      "LPLC1",
      "LC10a",
      "LC6",
      "LC16",
      "LC22",
      "LPLC4",
    ]) {
      groups.set(`${type}_${side}`, cells(meta, [type], side));
    }

    groups.set(`SNta_${side}`, cellsWithPrefix(meta, "SNta", side));
    groups.set(`LgLG_${side}`, cellsWithPrefix(meta, "LgLG", side));
    groups.set(`taste_${side}`, cells(meta, ["LB3", "claw_tpGRN"], side));
  }

  return groups;
}

function buildOutputGroups(meta) {
  const output = [];

  for (const side of ["L", "R"]) {
    for (const type of ["DNg100", "DNa02", "DNp01", "MDN"]) {
      output.push([`${type} ${side}`, cells(meta, [type], side)]);
    }

    output.push([`wing power ${side}`, cells(meta, WING_POWER, side)]);
    output.push([`leg extend ${side}`, cells(meta, LEG_EXTEND, side)]);
    output.push([`leg flex ${side}`, cells(meta, LEG_FLEX, side)]);

    output.push([`neck/head ${side}`, cells(meta, ["cb_motor"], side)]);

    output.push([
      `arm pull ${side}`,
      cells(meta, ["DNp02", "DNp03", "DNp04", "DNp11", "DNg40"], side),
    ]);

    output.push([
      `leg kick ${side}`,
      cells(meta, ["DNge104", "DNge122", "DNg20", "DNge102"], side),
    ]);

    output.push([
      `head tug ${side}`,
      cells(meta, ["DNa05", "DNa07", "DNg111", "DNae002"], side),
    ]);
  }

  return output;
}

async function fetchJoined(urls, label, totalMb = 0) {
  const chunks = [];
  let received = 0;
  let lastReported = 0;

  for (const url of urls) {
    const response = await fetch(url, {
      mode: "cors",
      cache: "force-cache",
    });

    if (!response.ok || !response.body) {
      throw new Error(`${url}: HTTP ${response.status}`);
    }

    const reader = response.body.getReader();

    for (;;) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      chunks.push(value);
      received += value.length;

      if (received - lastReported >= 1_000_000) {
        lastReported = received;
        self.postMessage({
          type: "progress",
          text: `${label} ${(received / 1e6).toFixed(0)}${totalMb ? ` / ${totalMb.toFixed(0)}` : ""} MB`,
        });
      }
    }
  }

  const blob = new Blob(chunks);

  if (!(chunks[0]?.[0] === 0x1f && chunks[0]?.[1] === 0x8b)) {
    return blob.arrayBuffer();
  }

  if (typeof DecompressionStream !== "function") {
    throw new Error("이 브라우저는 gzip DecompressionStream을 지원하지 않습니다.");
  }

  return new Response(
    blob.stream().pipeThrough(new DecompressionStream("gzip")),
  ).arrayBuffer();
}

let meta = null;
let weights = null;
let brain = null;
let inputGroups = new Map();
let outputGroups = [];
let groupOf = null;
let drive = {};
let hz = null;
let count = null;
let hits = null;
let skillSlot = null;
let skillHits = null;
let skillSelectedCount = 0;
let skillSamplers = [];
let rollingStepMs = 0;
let loopStarted = false;

function resetRuntime(seed = 64, requestId = null) {
  if (!meta || !weights) {
    return;
  }

  const normalizedSeed = Number.isFinite(Number(seed))
    ? Math.trunc(Number(seed))
    : 64;

  brain = new ConnectomeBrain(weights, meta.params, normalizedSeed);
  drive = {};
  hz = new Float64Array(outputGroups.length);
  count = new Float64Array(outputGroups.length);
  hits = new Float64Array(outputGroups.length);
  skillHits?.fill(0);
  for (const sampler of skillSamplers) {
    sampler.hits.fill(0);
    sampler.steps = 0;
    sampler.startStep = 0;
  }
  rollingStepMs = 0;

  self.postMessage({
    type: "reset",
    seed: normalizedSeed,
    requestId,
  });
}

function allDescendingNeurons(expectedDnCount) {
  if (!meta) {
    throw new Error("connectome metadata not ready");
  }

  const allDn = cells(
    meta,
    ["descending_neuron", "descending_neuron_tbc"],
  );

  if (
    Number.isInteger(expectedDnCount) &&
    allDn.length !== expectedDnCount
  ) {
    throw new Error(
      "Fly skill DN contract mismatch: " +
      allDn.length +
      " != " +
      expectedDnCount,
    );
  }

  return allDn;
}

function validateFeatureIndices(featureIndices, allDn) {
  if (
    !Array.isArray(featureIndices) ||
    featureIndices.length === 0
  ) {
    throw new Error("Fly skill featureIndices missing");
  }

  featureIndices.forEach((relativeIndex) => {
    if (
      !Number.isInteger(relativeIndex) ||
      relativeIndex < 0 ||
      relativeIndex >= allDn.length
    ) {
      throw new Error(
        "Fly skill feature index out of range: " +
        relativeIndex,
      );
    }
  });
}

function configureSkill(featureIndices, expectedDnCount) {
  const allDn = allDescendingNeurons(expectedDnCount);
  validateFeatureIndices(featureIndices, allDn);

  skillSlot = new Int16Array(meta.n).fill(-1);

  featureIndices.forEach((relativeIndex, slot) => {
    skillSlot[allDn[relativeIndex]] = slot;
  });

  skillSelectedCount = featureIndices.length;
  skillHits = new Uint16Array(skillSelectedCount);

  self.postMessage({
    type: "skill-ready",
    dnCount: allDn.length,
    selectedCount: skillSelectedCount,
  });
}

function configureSkills(specs, expectedDnCount) {
  const allDn = allDescendingNeurons(expectedDnCount);

  if (!Array.isArray(specs) || specs.length === 0) {
    throw new Error("Fly skill specs missing");
  }

  const ids = new Set();

  skillSamplers = specs.map((spec) => {
    const id = String(spec?.id ?? "");

    if (!id || ids.has(id)) {
      throw new Error("Fly skill sampler id invalid: " + id);
    }
    ids.add(id);

    const windowSteps = Number(spec?.windowSteps);
    if (!Number.isInteger(windowSteps) || windowSteps <= 0) {
      throw new Error(
        "Fly skill windowSteps invalid for " + id,
      );
    }

    const featureIndices = spec?.featureIndices;
    validateFeatureIndices(featureIndices, allDn);

    const slot = new Int16Array(meta.n).fill(-1);
    featureIndices.forEach((relativeIndex, featureSlot) => {
      slot[allDn[relativeIndex]] = featureSlot;
    });

    return {
      id,
      windowSteps,
      slot,
      hits: new Uint16Array(featureIndices.length),
      steps: 0,
      startStep: brain?.steps ?? 0,
      selectedCount: featureIndices.length,
    };
  });

  self.postMessage({
    type: "skills-ready",
    dnCount: allDn.length,
    skills: skillSamplers.map((sampler) => ({
      id: sampler.id,
      selectedCount: sampler.selectedCount,
      windowSteps: sampler.windowSteps,
    })),
  });
}

function resetSkillWindows(reason = null) {
  const startStep = brain?.steps ?? 0;

  for (const sampler of skillSamplers) {
    sampler.hits.fill(0);
    sampler.steps = 0;
    sampler.startStep = startStep;
  }

  self.postMessage({
    type: "skills-reset",
    startStep,
    reason,
  });
}

function startLoop() {
  if (loopStarted) {
    return;
  }

  loopStarted = true;

  const tick = () => {
    if (!brain || !meta || !groupOf || !hz || !count || !hits) {
      setTimeout(tick, 20);
      return;
    }

    const startedAt = performance.now();

    for (const [key, indices] of inputGroups) {
      const amount = drive[key] ?? 0;

      if (amount > 0) {
        brain.stimulate(indices, amount);
      }
    }

    brain.step();
    count.fill(0);

    for (let index = 0; index < brain.firedCount; index += 1) {
      const neuron = brain.fired[index];
      const group = groupOf[neuron];

      if (group >= 0) {
        count[group] += 1;
      }

      if (skillSlot && skillHits) {
        const skillIndex = skillSlot[neuron];
        if (skillIndex >= 0) {
          skillHits[skillIndex] += 1;
        }
      }

      for (const sampler of skillSamplers) {
        const samplerIndex = sampler.slot[neuron];
        if (samplerIndex >= 0) {
          sampler.hits[samplerIndex] += 1;
        }
      }
    }

    for (const sampler of skillSamplers) {
      sampler.steps += 1;

      if (sampler.steps >= sampler.windowSteps) {
        self.postMessage({
          type: "skill-window",
          skillId: sampler.id,
          windowSteps: sampler.windowSteps,
          startStep: sampler.startStep + 1,
          endStep: brain.steps,
          spikes: Array.from(sampler.hits),
        });
        sampler.hits.fill(0);
        sampler.steps = 0;
        sampler.startStep = brain.steps;
      }
    }

    const decay = Math.exp(-meta.params.dt / RATE_TAU);

    for (let group = 0; group < outputGroups.length; group += 1) {
      const size = Math.max(1, outputGroups[group][1].length);
      hz[group] =
        decay * hz[group] +
        (1 - decay) * count[group] / (size * meta.params.dt);
      hits[group] += count[group];
    }

    const took = performance.now() - startedAt;
    rollingStepMs += (took - rollingStepMs) * 0.05;

    if (brain.steps % 2 === 0) {
      self.postMessage({
        type: "rates",
        hz: Array.from(hz),
        hits: Array.from(hits),
        fired: brain.firedCount,
        ms: rollingStepMs,
        steps: brain.steps,
        skillSpikes: skillHits
          ? Array.from(skillHits)
          : null,
      });
      hits.fill(0);
      skillHits?.fill(0);
    }

    setTimeout(tick, Math.max(0, meta.params.dt * 1000 - took));
  };

  tick();
}

async function load(base, source) {
  self.postMessage({
    type: "progress",
    text: "upstream manifest 확인 중",
  });

  const manifestResponse = await fetch(`${base}brain.json`, {
    mode: "cors",
    cache: "force-cache",
  });

  if (!manifestResponse.ok) {
    throw new Error(`brain.json: HTTP ${manifestResponse.status}`);
  }

  const manifest = await manifestResponse.json();

  const metaBuffer = await fetchJoined(
    [`${base}meta.bin`],
    "labels",
    manifest.meta_mb,
  );

  meta = parseMeta(metaBuffer);

  const weightBuffer = await fetchJoined(
    manifest.parts.map((part) => base + part),
    "connectome",
    manifest.weights_mb,
  );

  self.postMessage({
    type: "progress",
    text: "25M+ 시냅스 인덱싱 중",
  });

  weights = parseWeights(weightBuffer);
  inputGroups = buildInputGroups(meta);
  outputGroups = buildOutputGroups(meta);

  groupOf = new Int16Array(meta.n).fill(-1);

  outputGroups.forEach(([, indices], group) => {
    for (const index of indices) {
      groupOf[index] = group;
    }
  });

  resetRuntime();
  startLoop();

  self.postMessage({
    type: "ready",
    n: weights.n,
    nnz: weights.nnz,
    outputs: outputGroups.map(([name]) => name),
    source,
  });
}

self.onmessage = (event) => {
  const message = event.data ?? {};

  if (message.type === "load" && !weights) {
    load(message.base, message.source).catch((error) => {
      self.postMessage({
        type: "error",
        text: error instanceof Error ? error.message : String(error),
      });
    });
    return;
  }

  if (message.type === "configure-skill") {
    try {
      configureSkill(
        message.featureIndices,
        message.expectedDnCount,
      );
    } catch (error) {
      self.postMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : String(error),
      });
    }
    return;
  }

  if (message.type === "configure-skills") {
    try {
      configureSkills(
        message.skills,
        message.expectedDnCount,
      );
    } catch (error) {
      self.postMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : String(error),
      });
    }
    return;
  }

  if (message.type === "reset-skill-windows") {
    resetSkillWindows(message.reason ?? null);
    return;
  }

  if (message.type === "input") {
    drive = message.drive ?? {};
    return;
  }

  if (message.type === "reset") {
    resetRuntime(message.seed ?? 64, message.requestId ?? null);
  }
};
