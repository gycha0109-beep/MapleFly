(function installMapleFlyInterruptionV14B(global) {
  "use strict";

  const FRAME_SIZE = 8;
  const HISTORY_FRAMES = 12;
  const FEATURE_COUNT = FRAME_SIZE * HISTORY_FRAMES;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function sigmoid(value) {
    if (value >= 0) {
      const z = Math.exp(-value);
      return 1 / (1 + z);
    }
    const z = Math.exp(value);
    return z / (1 + z);
  }

  function makeFrame(
    moveConfidence,
    attackProbability,
    jumpProbability,
    waitProbability,
    didJump,
    didAttack,
  ) {
    const move = clamp(Number(moveConfidence) || 0, 0, 1);
    const attack = clamp(Number(attackProbability) || 0, 0, 1);
    const jump = clamp(Number(jumpProbability) || 0, 0, 1);
    const wait = clamp(Number(waitProbability) || 0, 0, 1);

    return Float64Array.from([
      move,
      attack,
      attack - 0.5,
      jump,
      wait,
      jump - wait,
      didJump ? 1 : 0,
      didAttack ? 1 : 0,
    ]);
  }

  function createHistory() {
    return Array.from(
      { length: HISTORY_FRAMES },
      () => new Float64Array(FRAME_SIZE),
    );
  }

  function pushFrame(history, frame) {
    if (
      !Array.isArray(history) ||
      history.length !== HISTORY_FRAMES ||
      frame.length !== FRAME_SIZE
    ) {
      throw new Error("v14B interruption history contract mismatch");
    }
    history.shift();
    history.push(Float64Array.from(frame));
    return history;
  }

  function concatHistory(history) {
    if (!Array.isArray(history) || history.length !== HISTORY_FRAMES) {
      throw new Error("v14B interruption history length mismatch");
    }
    const feature = new Float64Array(FEATURE_COUNT);
    for (let window = 0; window < HISTORY_FRAMES; window += 1) {
      if (history[window].length !== FRAME_SIZE) {
        throw new Error("v14B interruption frame length mismatch");
      }
      feature.set(history[window], window * FRAME_SIZE);
    }
    return feature;
  }

  function createPolicy() {
    return {
      bias: 0,
      weights: new Float64Array(FEATURE_COUNT),
    };
  }

  function acceptProbability(policy, feature) {
    if (feature.length !== FEATURE_COUNT) {
      throw new Error("v14B interruption feature length mismatch");
    }
    let score = Number(policy.bias) || 0;
    for (let index = 0; index < FEATURE_COUNT; index += 1) {
      score += (Number(policy.weights[index]) || 0) * feature[index];
    }
    return sigmoid(score);
  }

  function choose(policy, feature, random, deterministic) {
    const probability = acceptProbability(policy, feature);
    const accept = deterministic
      ? probability >= 0.5
      : random() < probability;
    return { accept, probability };
  }

  function updatePolicy(
    policy,
    trajectory,
    {
      gamma = 0.97,
      learningRate = 0.02,
      l2 = 0.0005,
      weightClamp = 4,
    } = {},
  ) {
    if (!trajectory.length) return;

    const returns = new Float64Array(trajectory.length);
    let running = 0;
    for (let index = trajectory.length - 1; index >= 0; index -= 1) {
      running = trajectory[index].reward + gamma * running;
      returns[index] = running;
    }

    let baseline = 0;
    for (const value of returns) baseline += value;
    baseline /= returns.length;

    for (let step = 0; step < trajectory.length; step += 1) {
      const row = trajectory[step];
      const advantage = returns[step] - baseline;
      const gradient =
        (row.accept ? 1 : 0) - row.probability;
      const coefficient =
        learningRate * advantage * gradient;

      policy.bias = clamp(
        policy.bias +
          coefficient -
          learningRate * l2 * policy.bias,
        -weightClamp,
        weightClamp,
      );

      for (let feature = 0; feature < FEATURE_COUNT; feature += 1) {
        const current = policy.weights[feature];
        policy.weights[feature] = clamp(
          current +
            coefficient * row.feature[feature] -
            learningRate * l2 * current,
          -weightClamp,
          weightClamp,
        );
      }
    }
  }

  global.MapleFlyInterruptionV14B = Object.freeze({
    FRAME_SIZE,
    HISTORY_FRAMES,
    FEATURE_COUNT,
    makeFrame,
    createHistory,
    pushFrame,
    concatHistory,
    createPolicy,
    acceptProbability,
    choose,
    updatePolicy,
  });
})(globalThis);
