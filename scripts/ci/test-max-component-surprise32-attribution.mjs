import assert from 'node:assert/strict';
import {
  relabelMaxMissAttribution,
  componentDistribution,
  scoreQuantiles,
  maxAttributionAxis,
} from '../lib/neural-only-max-component-surprise32-attribution.mjs';

const generic={
  total:100,
  counts:{
    MATCH_CONFLICT:1,
    REFRACTORY_SUPPRESSED_IN_WINDOW:2,
    PRE_HIT_CROSSING:3,
    LATE_POST_HIT_CROSSING:4,
    ABOVE_THRESHOLD_NO_CROSSING_IN_WINDOW:5,
    NO_LOCAL_THRESHOLD_CROSSING:85,
  },
};
const relabeled=relabelMaxMissAttribution(generic);
assert.equal(relabeled.counts.PRE_HIT_MAX_CROSSING,3);
assert.equal(relabeled.counts.LATE_POST_HIT_MAX_CROSSING,4);
assert.equal(relabeled.counts.NO_LOCAL_MAX_THRESHOLD_CROSSING,85);
assert.equal(relabeled.fractions.NO_LOCAL_MAX_THRESHOLD_CROSSING,.85);

const dist=componentDistribution([0,0,0,1,1,2,3,4]);
assert.equal(dist.total,8);
assert.equal(dist.top1.index,0);
assert.equal(dist.top1Share,3/8);
assert.equal(dist.top3Share,6/8);
assert.ok(dist.normalizedEntropy>0 && dist.normalizedEntropy<=1);

const q=scoreQuantiles([1,2,3,4,5]);
assert.equal(q.count,5);
assert.equal(q.q50,3);
assert.equal(q.q95,4.8);

function cohort(missFractions,background=.9,top3=.4){
  return {
    maxMissAttribution:{fractions:{
      MATCH_CONFLICT:0,
      REFRACTORY_SUPPRESSED_IN_WINDOW:0,
      PRE_HIT_MAX_CROSSING:0,
      LATE_POST_HIT_MAX_CROSSING:0,
      ABOVE_MAX_THRESHOLD_NO_CROSSING_IN_WINDOW:0,
      NO_LOCAL_MAX_THRESHOLD_CROSSING:0,
      ...missFractions,
    }},
    falseEventTiming:{fractions:{BACKGROUND:background}},
    argmax:{FALSE_EVENT:{top3Share:top3}},
  };
}

const early=cohort({PRE_HIT_MAX_CROSSING:.51});
assert.equal(maxAttributionAxis(early,early),'EARLY_MAX_SHIFT_DOMINANT');

const absent=cohort({NO_LOCAL_MAX_THRESHOLD_CROSSING:.51},.99,.99);
assert.equal(maxAttributionAxis(absent,absent),'MAX_SIGNAL_ABSENT_DOMINANT');

const noise=cohort({NO_LOCAL_MAX_THRESHOLD_CROSSING:.49},.81,.51);
assert.equal(maxAttributionAxis(noise,noise),'BACKGROUND_MAX_NOISE_DOMINANT');

const half=cohort({NO_LOCAL_MAX_THRESHOLD_CROSSING:.5},.8,.5);
assert.equal(maxAttributionAxis(half,half),'MIXED_MAX_COMPONENT_TEMPORAL_MISALIGNMENT');

console.log(JSON.stringify({status:'PASS',strictDominance:true,argmaxDiagnostic:true}));
