import assert from 'node:assert/strict';
import {
  relabelRiseMissAttribution,
  rawLocalContext,
  contextComposition,
  multilagRiseAttributionAxis,
} from '../lib/neural-only-predictive-surprise32-multilag-rise-attribution.mjs';

const generic = {
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
const relabeled = relabelRiseMissAttribution(generic);
assert.equal(relabeled.counts.PRE_HIT_RISE_CROSSING,3);
assert.equal(relabeled.counts.LATE_POST_HIT_RISE_CROSSING,4);
assert.equal(relabeled.counts.NO_LOCAL_RISE_THRESHOLD_CROSSING,85);
assert.equal(relabeled.fractions.NO_LOCAL_RISE_THRESHOLD_CROSSING,.85);

assert.equal(rawLocalContext({peakScore:2},1.5),'RAW_LOCAL_SUPRATHRESHOLD_PRESENT');
assert.equal(rawLocalContext({peakScore:1},1.5),'RAW_LOCAL_SUBTHRESHOLD');
assert.equal(rawLocalContext(null,1.5),'RAW_LOCAL_SUBTHRESHOLD');

const comp = contextComposition([
  {rawContext:'RAW_LOCAL_SUBTHRESHOLD'},
  {rawContext:'RAW_LOCAL_SUBTHRESHOLD'},
  {rawContext:'RAW_LOCAL_SUPRATHRESHOLD_PRESENT'},
]);
assert.equal(comp.fractions.RAW_LOCAL_SUBTHRESHOLD,2/3);

function cohort(miss,rawSub,rawSup=1-rawSub) {
  return {
    riseMissAttribution:{fractions:{
      MATCH_CONFLICT:0,
      REFRACTORY_SUPPRESSED_IN_WINDOW:0,
      PRE_HIT_RISE_CROSSING:0,
      LATE_POST_HIT_RISE_CROSSING:0,
      ABOVE_RISE_THRESHOLD_NO_CROSSING_IN_WINDOW:0,
      NO_LOCAL_RISE_THRESHOLD_CROSSING:0,
      ...miss,
    }},
    rawContextAllMisses:{fractions:{
      RAW_LOCAL_SUBTHRESHOLD:rawSub,
      RAW_LOCAL_SUPRATHRESHOLD_PRESENT:rawSup,
    }},
  };
}

const baseAbsent = cohort({NO_LOCAL_RISE_THRESHOLD_CROSSING:.8},.7);
assert.equal(multilagRiseAttributionAxis(baseAbsent,baseAbsent),'BASE_SIGNAL_ABSENT_DOMINANT');

const transform = cohort({NO_LOCAL_RISE_THRESHOLD_CROSSING:.8},.3,.7);
assert.equal(multilagRiseAttributionAxis(transform,transform),'RISE_TRANSFORM_SUPPRESSION_DOMINANT');

const early = cohort({PRE_HIT_RISE_CROSSING:.51},.8);
assert.equal(multilagRiseAttributionAxis(early,early),'EARLY_RISE_SHIFT_DOMINANT');

const half = cohort({NO_LOCAL_RISE_THRESHOLD_CROSSING:.5},.8);
assert.equal(multilagRiseAttributionAxis(half,half),'MIXED_MULTILAG_RISE_TEMPORAL_MISALIGNMENT');

console.log(JSON.stringify({status:'PASS',strictDominance:true,rawContext:true}));
