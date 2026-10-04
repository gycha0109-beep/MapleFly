import {
  noD1AssertViews,
  noD1ZTapes,
  noD1PredictiveRows,
  noD1Predict,
} from './neural-only-predictive-surprise32-frozen.mjs';

export const MAX_COMPONENT_Q = 0.95;
export const MAX_COMPONENT_COUNT = 32;
export const MAX_COMPONENT_REFRACTORY = 10;
export const MAX_COMPONENT_CONTRACT = 'NEURAL_ONLY_MAX_COMPONENT_SURPRISE32';

export function maxComponentScoreFrames(views, model) {
  noD1AssertViews(views);
  const zTapes = noD1ZTapes(views, model.phase.means, model.pca);
  const rows = noD1PredictiveRows(zTapes, model.zStats);
  const bySeed = new Map();
  for (const row of rows) {
    const pred = noD1Predict(row, model.predictor);
    let maxScore = -Infinity;
    for (let k = 0; k < MAX_COMPONENT_COUNT; k += 1) {
      const e = row.target[k] - pred[k];
      const r = (e - model.residualStats.means[k]) / model.residualStats.scales[k];
      const score = r * r;
      if (score > maxScore) maxScore = score;
    }
    if (!bySeed.has(row.seed)) bySeed.set(row.seed, []);
    bySeed.get(row.seed).push({
      step:row.step,
      frameIndex:row.frameIndex,
      score:maxScore,
    });
  }
  return bySeed;
}

export function maxComponentFiniteScores(scoreFramesBySeed) {
  const values = [];
  for (const frames of scoreFramesBySeed.values()) {
    for (const frame of frames) {
      if (Number.isFinite(frame.score)) values.push(frame.score);
    }
  }
  return values;
}

export function maxComponentSerializableContract(baseModelSha, threshold) {
  return {
    contract:MAX_COMPONENT_CONTRACT,
    baseModelSha,
    score:'max_j(r_j^2)',
    componentCount:MAX_COMPONENT_COUNT,
    thresholdQuantile:MAX_COMPONENT_Q,
    threshold,
    refractory:MAX_COMPONENT_REFRACTORY,
    matching:'earliest-unmatched-event:eventStep>=hitStep && eventStep-hitStep<10',
  };
}
