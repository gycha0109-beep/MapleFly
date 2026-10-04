import {
  noD1AssertViews,
  noD1ZTapes,
  noD1PredictiveRows,
  noD1Predict,
  noD1Quantile,
} from './neural-only-predictive-surprise32-frozen.mjs';
import {MAX_COMPONENT_COUNT} from './neural-only-max-component-surprise32.mjs';

export const MAX_MISS_CATEGORIES = [
  'MATCH_CONFLICT',
  'REFRACTORY_SUPPRESSED_IN_WINDOW',
  'PRE_HIT_MAX_CROSSING',
  'LATE_POST_HIT_MAX_CROSSING',
  'ABOVE_MAX_THRESHOLD_NO_CROSSING_IN_WINDOW',
  'NO_LOCAL_MAX_THRESHOLD_CROSSING',
];

const GENERIC_TO_MAX = {
  MATCH_CONFLICT:'MATCH_CONFLICT',
  REFRACTORY_SUPPRESSED_IN_WINDOW:'REFRACTORY_SUPPRESSED_IN_WINDOW',
  PRE_HIT_CROSSING:'PRE_HIT_MAX_CROSSING',
  LATE_POST_HIT_CROSSING:'LATE_POST_HIT_MAX_CROSSING',
  ABOVE_THRESHOLD_NO_CROSSING_IN_WINDOW:'ABOVE_MAX_THRESHOLD_NO_CROSSING_IN_WINDOW',
  NO_LOCAL_THRESHOLD_CROSSING:'NO_LOCAL_MAX_THRESHOLD_CROSSING',
};

export function maxComponentScoreFramesWithArgmax(views, model) {
  noD1AssertViews(views);
  const zTapes = noD1ZTapes(views, model.phase.means, model.pca);
  const rows = noD1PredictiveRows(zTapes, model.zStats);
  const bySeed = new Map();
  for (const row of rows) {
    const pred = noD1Predict(row, model.predictor);
    let maxScore = -Infinity;
    let argmaxComponent = null;
    for (let k = 0; k < MAX_COMPONENT_COUNT; k += 1) {
      const e = row.target[k] - pred[k];
      const r = (e - model.residualStats.means[k]) / model.residualStats.scales[k];
      const score = r * r;
      if (score > maxScore) {
        maxScore = score;
        argmaxComponent = k;
      }
    }
    if (!bySeed.has(row.seed)) bySeed.set(row.seed, []);
    bySeed.get(row.seed).push({
      step:row.step,
      frameIndex:row.frameIndex,
      score:maxScore,
      argmaxComponent,
    });
  }
  return bySeed;
}

export function relabelMaxMissAttribution(generic) {
  const counts = Object.fromEntries(MAX_MISS_CATEGORIES.map(key => [key,0]));
  for (const [key,value] of Object.entries(generic.counts ?? {})) {
    const mapped = GENERIC_TO_MAX[key];
    if (mapped) counts[mapped] = value;
  }
  const total = generic.total ?? Object.values(counts).reduce((a,b)=>a+b,0);
  const fractions = Object.fromEntries(MAX_MISS_CATEGORIES.map(key => [
    key,total ? counts[key] / total : 0,
  ]));
  return {total,counts,fractions};
}

export function componentDistribution(indices) {
  const counts = Array(MAX_COMPONENT_COUNT).fill(0);
  let total = 0;
  for (const index of indices) {
    if (!Number.isInteger(index) || index < 0 || index >= MAX_COMPONENT_COUNT) continue;
    counts[index] += 1;
    total += 1;
  }
  const ranked = counts
    .map((count,index)=>({index,count,share:total ? count/total : 0}))
    .sort((a,b)=>b.count-a.count || a.index-b.index);
  let entropy = 0;
  if (total) {
    for (const count of counts) {
      if (!count) continue;
      const p = count / total;
      entropy -= p * Math.log(p);
    }
  }
  return {
    total,
    top1:ranked[0] ?? null,
    top3:ranked.slice(0,3),
    top1Share:ranked[0]?.share ?? 0,
    top3Share:ranked.slice(0,3).reduce((sum,row)=>sum+row.share,0),
    normalizedEntropy:total ? entropy / Math.log(MAX_COMPONENT_COUNT) : 0,
    counts,
  };
}

export function scoreQuantiles(values) {
  const finite = values.filter(Number.isFinite);
  return {
    count:finite.length,
    q50:noD1Quantile(finite,.50),
    q75:noD1Quantile(finite,.75),
    q90:noD1Quantile(finite,.90),
    q95:noD1Quantile(finite,.95),
    q99:noD1Quantile(finite,.99),
  };
}

export function maxAttributionAxis(E,F) {
  const e=E.maxMissAttribution.fractions;
  const f=F.maxMissAttribution.fractions;
  if (e.PRE_HIT_MAX_CROSSING > .50 && f.PRE_HIT_MAX_CROSSING > .50) {
    return 'EARLY_MAX_SHIFT_DOMINANT';
  }
  if (e.LATE_POST_HIT_MAX_CROSSING > .50 && f.LATE_POST_HIT_MAX_CROSSING > .50) {
    return 'LATE_MAX_SHIFT_DOMINANT';
  }
  const blocked = x =>
    x.MATCH_CONFLICT +
    x.REFRACTORY_SUPPRESSED_IN_WINDOW +
    x.ABOVE_MAX_THRESHOLD_NO_CROSSING_IN_WINDOW;
  if (blocked(e) > .50 && blocked(f) > .50) {
    return 'MAX_EVENTIZER_BLOCK_DOMINANT';
  }
  if (e.NO_LOCAL_MAX_THRESHOLD_CROSSING > .50 &&
      f.NO_LOCAL_MAX_THRESHOLD_CROSSING > .50) {
    return 'MAX_SIGNAL_ABSENT_DOMINANT';
  }
  if (E.falseEventTiming.fractions.BACKGROUND > .80 &&
      F.falseEventTiming.fractions.BACKGROUND > .80 &&
      E.argmax.FALSE_EVENT.top3Share > .50 &&
      F.argmax.FALSE_EVENT.top3Share > .50) {
    return 'BACKGROUND_MAX_NOISE_DOMINANT';
  }
  return 'MIXED_MAX_COMPONENT_TEMPORAL_MISALIGNMENT';
}
