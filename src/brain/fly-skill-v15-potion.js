(function attachMapleFlyPotionSkillV15(global) {
  "use strict";

  const DN_COUNT = 1316;
  const HISTORY_FRAMES = 48;
  const FRAME_STEPS = 5;
  const STEP_SECONDS = 0.02;
  const FEATURE_COUNT = 256;

  const SOURCE = Object.freeze({
    status: "V15D_DEPLOYED",
    deploymentAllowed: true,
    representationRunId: 35898698946,
    representationArtifactId: 10768761312,
    representationArtifactDigest:
      "sha256:8aa759b04643d618e69aaa647d7251eb237816ee3b84bcc97a0f451d20cbba78",
    representationSha256:
      "33fc31f636e1cde215841dd33b0a93b24d4571cdabd32e9a1edc8fa2e696c847",
    policyRunId: 35904611372,
    policyArtifactId: 10770299335,
    policyArtifactDigest:
      "sha256:3f715ef7f4f62e854db02c4e0f05b8662d5dab2a46d1ea0675320bffbe3bc838",
    policySha256:
      "47088bcb15ed2cd96f64d67a20169934bd7a866dcd56bacffea70b1f42537a59",
    validationRunId: 35905965237,
    validationArtifactId: 10771129156,
    validationArtifactDigest:
      "sha256:f60e484dc08203f092d084bf096e29f885ced58624b7717ff815787e8907c343",
  });

  const SLOTS_B64 = "a5lYXu2YfxLwcnkUZDpVD7y3XDqztk63hZh7HHdA/TvuO3s2R6ddtzK4TMrrIZ87UzsvUIQbLza8tWBeGFQfxnaYqkUFTXU4fw7Vs/+cpIzc3nQODQXFt/sNZTz/towbZ9AMwA8jEwPjPEO4mT1bDccCLKGbX1anVxejFyO4oLC/ZI0dLOmgaJGF5N7TRMZalWG8GD42KVLlIwGEqCBEddI8MMX7wATAl2mU1HTzFDCTo09feM/0Bvm4ihw0oZ0Z0de7bgjksCBcPOhyY/Q8WTRbnIyeeQN5wzxJeyUdUKYjLqpbuWZzfgDkQDXHHMDZgIcjvAtLYBbFDQse9E4c9ceYG+qAA8S1AXE7n9uXhfHjZbCEnNR4h4OphkCIPyAMi++/YEPla8afNwsxJ37guoVMF3Mt9WHsCJyFb0uDf6Y0HaMTt6z5Nq8/yPU8vRkTuNkRqN1rDHiFptP1Na13WlPprXlXMVGt27EfKz/vA48VenDPeSe7iJtF+yV7Mv8Bm1vRVcMm19UWHYvrh16JzTmJFHhPeUyOZ+Yd0Rox/7IdvuXq+CpxXFUiEFTMbQBHzXlCEgI99dzUJQ2p4UdmF3hLxG2xwQ+7GeLvkei6B2+TeoDr0EljWb9Kw9RcgpC8ODVTVdut8Nav2lSCyZ31DbTBK1rklkudWCKesahoiKM=";
  const MEANS_B64 = "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";
  const SCALES_B64 = "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";
  const WAIT_WEIGHTS_B64 = "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";

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function decodeBytes(base64) {
    const binary = global.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  function decodeU16(base64) {
    const bytes = decodeBytes(base64);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const out = new Uint16Array(bytes.byteLength / 2);
    for (let i = 0; i < out.length; i += 1) {
      out[i] = view.getUint16(i * 2, true);
    }
    return out;
  }

  function decodeF64(base64) {
    const bytes = decodeBytes(base64);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const out = new Float64Array(bytes.byteLength / 8);
    for (let i = 0; i < out.length; i += 1) {
      out[i] = view.getFloat64(i * 8, true);
    }
    return out;
  }

  const selectedSlots = decodeU16(SLOTS_B64);
  const means = decodeF64(MEANS_B64);
  const scales = decodeF64(SCALES_B64);
  const waitWeights = decodeF64(WAIT_WEIGHTS_B64);
  const waitBias = -0.0029142037748935957;
  const drinkWeights = new Float64Array(FEATURE_COUNT);
  const drinkBias = 0;

  if (
    selectedSlots.length !== FEATURE_COUNT ||
    means.length !== FEATURE_COUNT ||
    scales.length !== FEATURE_COUNT ||
    waitWeights.length !== FEATURE_COUNT
  ) {
    throw new Error("v15 POTION frozen bundle dimensionality mismatch");
  }

  const runtimeDnIndices = Object.freeze(
    [...new Set(Array.from(selectedSlots, (slot) => slot % DN_COUNT))]
      .sort((a, b) => a - b),
  );

  if (runtimeDnIndices.length !== 24) {
    throw new Error("v15 POTION runtime DN count mismatch");
  }

  const runtimeDnSlot = new Map(
    runtimeDnIndices.map((dn, index) => [dn, index]),
  );

  function loadState() {
    return {
      ...SOURCE,
      dnCount: DN_COUNT,
      historyFrames: HISTORY_FRAMES,
      frameSteps: FRAME_STEPS,
      stepSeconds: STEP_SECONDS,
      featureCount: FEATURE_COUNT,
      runtimeDnIndices: [...runtimeDnIndices],
      selectedSlots: Uint16Array.from(selectedSlots),
      means: Float64Array.from(means),
      scales: Float64Array.from(scales),
      wait: {
        bias: waitBias,
        weights: Float64Array.from(waitWeights),
      },
      drink: {
        bias: drinkBias,
        weights: Float64Array.from(drinkWeights),
      },
    };
  }

  function createRuntime() {
    return {
      baselineHz: new Float64Array(runtimeDnIndices.length),
      baselineReady: false,
      history: [],
      action: "WAIT",
      qWait: 0,
      qDrink: 0,
      decisions: 0,
    };
  }

  function resetRuntime(runtime) {
    runtime.history.length = 0;
    runtime.action = "WAIT";
    runtime.qWait = 0;
    runtime.qDrink = 0;
    runtime.decisions = 0;
  }

  function setBaseline(runtime, hz) {
    if (hz.length !== runtimeDnIndices.length) {
      throw new Error("v15 POTION baseline length mismatch");
    }
    runtime.baselineHz.set(hz);
    runtime.baselineReady = true;
  }

  function makeFrame(runtime, spikes, windowSteps = FRAME_STEPS) {
    if (!runtime.baselineReady) {
      throw new Error("v15 POTION baseline not ready");
    }
    if (
      windowSteps !== FRAME_STEPS ||
      spikes.length !== runtimeDnIndices.length
    ) {
      throw new Error("v15 POTION frame contract mismatch");
    }

    const seconds = FRAME_STEPS * STEP_SECONDS;
    const frame = new Float64Array(runtimeDnIndices.length);

    for (let index = 0; index < frame.length; index += 1) {
      const hz = (Number(spikes[index]) || 0) / seconds;
      frame[index] = clamp(
        (hz - runtime.baselineHz[index]) / 50,
        -1,
        1,
      );
    }
    return frame;
  }

  function pushFrame(runtime, frame) {
    if (frame.length !== runtimeDnIndices.length) {
      throw new Error("v15 POTION frame width mismatch");
    }
    if (runtime.history.length >= HISTORY_FRAMES) {
      throw new Error("v15 POTION history overflow");
    }
    runtime.history.push(Float64Array.from(frame));
    return runtime.history.length;
  }

  function tasteForNextFrame(runtime) {
    return runtime.history.length === HISTORY_FRAMES - 1;
  }

  function buildFeature(runtime, state) {
    if (runtime.history.length !== HISTORY_FRAMES) {
      throw new Error("v15 POTION history not ready");
    }

    const feature = new Float64Array(FEATURE_COUNT);

    for (let index = 0; index < FEATURE_COUNT; index += 1) {
      const rawSlot = state.selectedSlots[index];
      const frameIndex = Math.floor(rawSlot / DN_COUNT);
      const dnIndex = rawSlot % DN_COUNT;
      const runtimeIndex = runtimeDnSlot.get(dnIndex);
      if (runtimeIndex === undefined) {
        throw new Error("v15 POTION selected DN missing from runtime");
      }
      const raw = runtime.history[frameIndex][runtimeIndex];
      feature[index] = clamp(
        (raw - state.means[index]) / state.scales[index],
        -5,
        5,
      );
    }

    return feature;
  }

  function score(head, feature) {
    let value = Number(head.bias) || 0;
    for (let index = 0; index < FEATURE_COUNT; index += 1) {
      value += head.weights[index] * feature[index];
    }
    return value;
  }

  function choose(runtime, state) {
    const feature = buildFeature(runtime, state);
    const qWait = score(state.wait, feature);
    const qDrink = score(state.drink, feature);
    const action = qDrink > qWait ? "DRINK" : "WAIT";

    runtime.action = action;
    runtime.qWait = qWait;
    runtime.qDrink = qDrink;
    runtime.decisions += 1;

    return { action, qWait, qDrink, feature };
  }

  function finishCycle(runtime) {
    runtime.history.length = 0;
  }

  global.MapleFlyPotionSkillV15 = Object.freeze({
    SOURCE,
    DN_COUNT,
    HISTORY_FRAMES,
    FRAME_STEPS,
    STEP_SECONDS,
    FEATURE_COUNT,
    loadState,
    createRuntime,
    resetRuntime,
    setBaseline,
    makeFrame,
    pushFrame,
    tasteForNextFrame,
    buildFeature,
    choose,
    finishCycle,
  });
})(globalThis);
