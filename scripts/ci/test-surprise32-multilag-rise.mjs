import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
  MULTILAG_RISE_LAGS,
  MULTILAG_RISE_Q,
  MULTILAG_RISE_REFRACTORY,
  multilagRiseScores,
  multilagRiseFiniteScores,
  multilagRiseSerializableContract,
} from '../lib/neural-only-predictive-surprise32-multilag-rise.mjs';

assert.deepEqual([...MULTILAG_RISE_LAGS], [1,3,5]);
assert.equal(MULTILAG_RISE_Q, 0.95);
assert.equal(MULTILAG_RISE_REFRACTORY, 10);

const raw = new Map([[1, [
  {step:0,frameIndex:0,score:10},
  {step:5,frameIndex:1,score:9},
  {step:10,frameIndex:2,score:8},
  {step:15,frameIndex:3,score:7},
  {step:20,frameIndex:4,score:6},
  {step:25,frameIndex:5,score:5},
  {step:30,frameIndex:6,score:12},
]]]);
const rise = multilagRiseScores(raw);
assert.deepEqual(rise.get(1).map(x => ({step:x.step,score:x.score,rawScore:x.rawScore})), [
  {step:25,score:0,rawScore:5},
  {step:30,score:7,rawScore:12},
]);
assert.deepEqual(multilagRiseFiniteScores(rise), [0,7]);

const contract = multilagRiseSerializableContract('base-sha', 1.25);
assert.deepEqual(contract.lags, [1,3,5]);
assert.equal(contract.thresholdQuantile, 0.95);
assert.equal(contract.threshold, 1.25);
assert.equal(contract.refractory, 10);
assert.equal(contract.formula, 'max(0,s_t-s_(t-1),s_t-s_(t-3),s_t-s_(t-5))');

const current = JSON.parse(await readFile('science/cohorts/neural-only-predictive-surprise32-multilag-rise-v4.json','utf8'));
const old = JSON.parse(await readFile('science/cohorts/neural-only-predictive-surprise32-v4.json','utf8'));
const validation = JSON.parse(await readFile('science/cohorts/tape-cache-validation-64.json','utf8'));

function seeds(cohort) {
  return [...cohort.base_seeds, cohort.interruption_seed];
}
const frozen = new Set([
  ...Object.values(old.cohorts).flatMap(seeds),
  ...Object.values(validation.cohorts).flatMap(seeds),
]);
for (const name of ['prospective_c','prospective_d']) {
  for (const seed of seeds(current.cohorts[name])) {
    assert.ok(!frozen.has(seed), 'fresh prospective seed collision: ' + seed);
  }
}
const c = new Set(seeds(current.cohorts.prospective_c));
for (const seed of seeds(current.cohorts.prospective_d)) {
  assert.ok(!c.has(seed), 'C/D seed collision: ' + seed);
}

const manifest = JSON.parse(await readFile('science/manifests/neural-only-predictive-surprise32-multilag-rise.json','utf8'));
assert.equal(manifest.simulation_contract, 'science/simulations/v15n-deterministic-v4.json');
assert.equal(manifest.analysis_needs_malecns, false);
assert.equal(manifest.dependencies[0].registry_key, 'neural_only_predictive_surprise32_failure_attribution');

const registry = JSON.parse(await readFile('science/artifacts/frozen.json','utf8'));
assert.ok(registry.artifacts.neural_only_predictive_surprise32_failure_attribution);
assert.equal(
  registry.artifacts.neural_only_predictive_surprise32_failure_attribution.evidence_sha256,
  '5952740e8403843872e370a94cc8d4d45699b2f5df77e54f14665b6b36c8a4f3',
);

console.log(JSON.stringify({
  status:'PASS',
  formula:'multilag-rise [1,3,5]',
  freshProspective:['C','D'],
  attributionReuse:false,
}));
