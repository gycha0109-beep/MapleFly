import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as core from '../lib/neural-only-predictive-surprise32-frozen.mjs';
import {attributionAxis, falseCategory, localPeak, matchEvents, missCategory,
  nearestStep, nearestEventCategory, traceEventizer, attributeCohort} from '../lib/neural-only-predictive-surprise32-attribution.mjs';
import {exactMetricReproduction} from '../diagnose-neural-only-predictive-surprise32-failure-attribution.mjs';

const sourcePath = 'scripts/diagnose-v15n-d6-d2-d3-d3-d4-d2-d1-d1-d1-d1-d1-d1-d1-d1-d1-d1-d1-d1-d1-d1-neural-only-predictive-surprise32.mjs';
const source = (await readFile(sourcePath, 'utf8')).replace(/\r\n/g, '\n');
const snapshot = await readFile('scripts/lib/neural-only-predictive-surprise32-frozen.mjs', 'utf8');
for (const [name, value] of Object.entries(core)) {
  if (name === 'allowFrozenEvaluation') continue;
  const start = source.indexOf('function ' + name + '(');
  const end = source.indexOf('\n}\n', start) + 2;
  assert.ok(start >= 0, name);
  assert.equal(value.toString(), source.slice(start, end), name + ' numerical/source drift');
}
for (const name of ['STEP_SECONDS','DN_COUNT','V15N_PCA_SEED','V15N_PCA_ITERATIONS',
  'V15N_PCA_COMPONENTS','V15N_D6_D2_D2_PCA_FIT_ROWS']) {
  assert.ok(snapshot.includes(source.match(new RegExp('const '+name+' = [^;]+;'))[0]), name);
}
assert.ok(snapshot.includes(source.slice(source.indexOf('const NO_D1_PREREG ='), source.indexOf('function noD1NeuralViews('))), 'frozen constants drift');

assert.throws(() => core.noD1Evaluate([], new Map()), /before freeze/);
assert.throws(() => core.allowFrozenEvaluation('wrong', 1.574078960908224), /reproduction required/);
const truthTrap = {seed:1, potionFrameEvents:[{frameIndex:0, step:5, values:new Float64Array(1316)}]};
Object.defineProperty(truthTrap, 'damageEvents', {get() {throw new Error('truth leak');}});
core.noD1AssertViews(core.noD1NeuralViews([truthTrap]));
assert.throws(() => core.noD1AssertViews([{seed:1, frames:[], damageEvents:[]}]), /contaminated/);

const tau = 1.574078960908224;
const frames = [{step:100, score:0}, {step:105, score:tau}, {step:110, score:0},
  {step:115, score:tau}, {step:120, score:tau}, {step:125, score:0}];
const trace = traceEventizer(frames, tau);
assert.deepEqual(trace.filter(f => f.emitted).map(f => f.step), [105,115]);
const suppressed = traceEventizer([{step:100,score:tau},{step:102,score:0},{step:105,score:tau}], tau);
assert.equal(missCategory(105, suppressed, [{step:100}], new Map(), []), 'REFRACTORY_SUPPRESSED_IN_WINDOW');
const matched = matchEvents([100,103], [{step:105}]);
assert.equal(matched.matches.get(0), 0);
assert.ok(!matched.matches.has(1));
assert.equal(missCategory(103, trace, [{step:105}], matched.consumedBy, [100,103]), 'MATCH_CONFLICT');
const state = (step, crossing, positive = crossing) => ({step,crossing,positive,refractorySuppressed:false});
assert.equal(missCategory(100, [state(95,true),state(110,true)], [], new Map(), []), 'PRE_HIT_CROSSING');
assert.equal(missCategory(100, [state(110,true)], [], new Map(), []), 'LATE_POST_HIT_CROSSING');
assert.equal(missCategory(100, [state(100,false,true)], [], new Map(), []), 'ABOVE_THRESHOLD_NO_CROSSING_IN_WINDOW');
assert.equal(missCategory(100, [state(90,false),state(120,true)], [], new Map(), []), 'NO_LOCAL_THRESHOLD_CROSSING');
assert.equal(falseCategory(100,[100,105]), 'PRE_HIT_200MS');
assert.equal(falseCategory(100,[90,100]), 'RECENT_POST_HIT_200MS');
assert.equal(falseCategory(100,[90,110]), 'BACKGROUND');
assert.equal(nearestStep([120,80],100), 80);
assert.equal(nearestStep([121],100), null);
assert.throws(() => nearestEventCategory(-20,'UNRESOLVED'), /unresolved/);
const boundaryRule = 'OUTSIDE_NAMED_BUCKETS_NONE';
assert.equal(nearestEventCategory(-20,boundaryRule), 'NONE');
assert.equal(nearestEventCategory(-11,boundaryRule), 'NONE');
assert.equal(nearestEventCategory(-10,boundaryRule), 'PRE_200MS');
assert.equal(nearestEventCategory(10,boundaryRule), 'LATE_200MS');
assert.equal(nearestEventCategory(19,boundaryRule), 'LATE_200MS');
assert.equal(nearestEventCategory(20,boundaryRule), 'NONE');
assert.deepEqual(localPeak([{step:90,score:2},{step:100,score:2},{step:120,score:99}],100,tau),
  {peakScore:2,peakOffsetSteps:-10,thresholdGap:tau-2,category:'PRE_HIT_PEAK'});

function cohort(fractions) {return {missAttribution:{fractions:{MATCH_CONFLICT:0,
  REFRACTORY_SUPPRESSED_IN_WINDOW:0, PRE_HIT_CROSSING:0, LATE_POST_HIT_CROSSING:0,
  ABOVE_THRESHOLD_NO_CROSSING_IN_WINDOW:0, NO_LOCAL_THRESHOLD_CROSSING:0, ...fractions}}};}
const half = cohort({PRE_HIT_CROSSING:.50,NO_LOCAL_THRESHOLD_CROSSING:.50});
assert.equal(attributionAxis(half,half),'MIXED_NEURAL_ONLY_TEMPORAL_MISALIGNMENT');
for (const [category, axis] of [['PRE_HIT_CROSSING','EARLY_PHASE_SHIFT_DOMINANT'],
  ['LATE_POST_HIT_CROSSING','LATE_PHASE_SHIFT_DOMINANT'],['MATCH_CONFLICT','EVENTIZER_BLOCK_DOMINANT'],
  ['NO_LOCAL_THRESHOLD_CROSSING','NO_LOCAL_THRESHOLD_DOMINANT']]) {
  const dominant = cohort({[category]:.51});
  assert.equal(attributionAxis(dominant,dominant),axis);
  assert.equal(attributionAxis(dominant,half),'MIXED_NEURAL_ONLY_TEMPORAL_MISALIGNMENT');
}
assert.equal(exactMetricReproduction({matched:193},{matched:192}).matched.pass,false);
const eventMap = core.noD1Eventize(new Map([[1,frames]]),tau);
const attr = attributeCohort([{seed:1,damageEvents:[{step:100},{step:103}]}],new Map([[1,frames]]),eventMap,tau,'UNRESOLVED');
assert.equal(attr.missAttribution.counts.MATCH_CONFLICT,1);
assert.equal(attr.falseEventTiming.total,1);
assert.equal(attr.localPeakTiming.finitePeakFraction,1);
assert.equal(attr.nearestEventDistance.counts.IN_WINDOW,1);
console.log(JSON.stringify({status:'PASS', frozenFunctions:Object.keys(core).length-1,
  fixtures:'freeze boundary, truth isolation, matching, precedence, resolved nearest-event edges, peak ties, strict dominance'}));
