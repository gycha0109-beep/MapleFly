import assert from 'node:assert/strict';
import {
  relabelComplementMissAttribution,
  crossRepresentationContext,
  complementAttributionAxis,
} from '../lib/neural-only-pca-complement-attribution.mjs';

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
const relabeled=relabelComplementMissAttribution(generic);
assert.equal(relabeled.counts.PRE_HIT_COMPLEMENT_CROSSING,3);
assert.equal(relabeled.counts.LATE_POST_HIT_COMPLEMENT_CROSSING,4);
assert.equal(relabeled.counts.NO_LOCAL_COMPLEMENT_THRESHOLD_CROSSING,85);
assert.equal(relabeled.fractions.NO_LOCAL_COMPLEMENT_THRESHOLD_CROSSING,.85);

const cross=crossRepresentationContext([
  {basePresent:false,maxPresent:false,complementPresent:false},
  {basePresent:false,maxPresent:false,complementPresent:true},
  {basePresent:true,maxPresent:true,complementPresent:true},
]);
assert.equal(cross.total,3);
assert.equal(cross.counts['BASE_ABSENT|MAX_ABSENT|COMPLEMENT_ABSENT'],1);
assert.equal(cross.counts['BASE_ABSENT|MAX_ABSENT|COMPLEMENT_PRESENT'],1);

function cohort(miss,background=.9,ratio=1.3){
  return {
    complementMissAttribution:{fractions:{
      MATCH_CONFLICT:0,
      REFRACTORY_SUPPRESSED_IN_WINDOW:0,
      PRE_HIT_COMPLEMENT_CROSSING:0,
      LATE_POST_HIT_COMPLEMENT_CROSSING:0,
      ABOVE_COMPLEMENT_THRESHOLD_NO_CROSSING_IN_WINDOW:0,
      NO_LOCAL_COMPLEMENT_THRESHOLD_CROSSING:0,
      ...miss,
    }},
    falseEventTiming:{fractions:{BACKGROUND:background}},
    backgroundSeparation:{impactLocalQ95OverBackgroundQ95:ratio},
  };
}
const early=cohort({PRE_HIT_COMPLEMENT_CROSSING:.51});
assert.equal(complementAttributionAxis(early,early),'EARLY_COMPLEMENT_SHIFT_DOMINANT');

const absent=cohort({NO_LOCAL_COMPLEMENT_THRESHOLD_CROSSING:.51},.99,1.01);
assert.equal(complementAttributionAxis(absent,absent),'COMPLEMENT_SIGNAL_ABSENT_DOMINANT');

const noise=cohort({NO_LOCAL_COMPLEMENT_THRESHOLD_CROSSING:.49},.81,1.19);
assert.equal(complementAttributionAxis(noise,noise),'BACKGROUND_COMPLEMENT_NOISE_DOMINANT');

const half=cohort({NO_LOCAL_COMPLEMENT_THRESHOLD_CROSSING:.5},.8,1.2);
assert.equal(complementAttributionAxis(half,half),'MIXED_PCA_COMPLEMENT_TEMPORAL_MISALIGNMENT');

console.log(JSON.stringify({status:'PASS',strictDominance:true,crossRepresentation:true}));
