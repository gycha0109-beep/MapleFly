export const MULTILAG_RISE_LAGS = Object.freeze([1, 3, 5]);
export const MULTILAG_RISE_Q = 0.95;
export const MULTILAG_RISE_REFRACTORY = 10;
export const MULTILAG_RISE_CONTRACT = 'NEURAL_ONLY_PREDICTIVE_SURPRISE32_MULTILAG_RISE';

export function multilagRiseScores(rawScoreFramesBySeed) {
  const out = new Map();
  for (const [seed, frames] of rawScoreFramesBySeed.entries()) {
    const rows = [];
    for (let i = 5; i < frames.length; i += 1) {
      const current = frames[i];
      let rise = 0;
      for (const lag of MULTILAG_RISE_LAGS) {
        const delta = current.score - frames[i - lag].score;
        if (delta > rise) rise = delta;
      }
      rows.push({
        step: current.step,
        frameIndex: current.frameIndex,
        score: rise,
        rawScore: current.score,
      });
    }
    out.set(seed, rows);
  }
  return out;
}

export function multilagRiseFiniteScores(scoreFramesBySeed) {
  const values = [];
  for (const frames of scoreFramesBySeed.values()) {
    for (const frame of frames) {
      if (Number.isFinite(frame.score)) values.push(frame.score);
    }
  }
  return values;
}

export function multilagRiseSerializableContract(baseModelSha, threshold) {
  return {
    contract: MULTILAG_RISE_CONTRACT,
    baseModelSha,
    formula: 'max(0,s_t-s_(t-1),s_t-s_(t-3),s_t-s_(t-5))',
    lags: [...MULTILAG_RISE_LAGS],
    thresholdQuantile: MULTILAG_RISE_Q,
    threshold,
    refractory: MULTILAG_RISE_REFRACTORY,
    matching: 'earliest-unmatched-event:eventStep>=hitStep && eventStep-hitStep<10',
  };
}
