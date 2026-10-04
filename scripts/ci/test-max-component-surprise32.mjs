import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
  MAX_COMPONENT_Q,
  MAX_COMPONENT_COUNT,
  MAX_COMPONENT_REFRACTORY,
  maxComponentResidualScore,
  maxComponentSerializableContract,
} from '../lib/neural-only-max-component-surprise32.mjs';

assert.equal(MAX_COMPONENT_Q,0.95);
assert.equal(MAX_COMPONENT_COUNT,32);
assert.equal(MAX_COMPONENT_REFRACTORY,10);

const target = Array(32).fill(0);
const pred = Array(32).fill(0);
const means = Array(32).fill(0);
const scales = Array(32).fill(1);
target[3] = 2;
target[7] = -3;
assert.equal(maxComponentResidualScore(target,pred,{means,scales}),9);

const contract = maxComponentSerializableContract('base-sha',12.5);
assert.equal(contract.score,'max_j(r_j^2)');
assert.equal(contract.componentCount,32);
assert.equal(contract.thresholdQuantile,0.95);
assert.equal(contract.threshold,12.5);
assert.equal(contract.refractory,10);

const current = JSON.parse(await readFile('science/cohorts/neural-only-max-component-surprise32-v4.json','utf8'));
const old = JSON.parse(await readFile('science/cohorts/neural-only-predictive-surprise32-v4.json','utf8'));
const rise = JSON.parse(await readFile('science/cohorts/neural-only-predictive-surprise32-multilag-rise-v4.json','utf8'));
const validation = JSON.parse(await readFile('science/cohorts/tape-cache-validation-64.json','utf8'));

function seeds(cohort) {
  return [...cohort.base_seeds,cohort.interruption_seed];
}
const frozen = new Set([
  ...Object.values(old.cohorts).flatMap(seeds),
  ...Object.values(rise.cohorts).flatMap(seeds),
  ...Object.values(validation.cohorts).flatMap(seeds),
]);
for (const name of ['prospective_e','prospective_f']) {
  for (const seed of seeds(current.cohorts[name])) {
    assert.ok(!frozen.has(seed),'fresh prospective seed collision: ' + seed);
  }
}
const e = new Set(seeds(current.cohorts.prospective_e));
for (const seed of seeds(current.cohorts.prospective_f)) {
  assert.ok(!e.has(seed),'E/F seed collision: ' + seed);
}

const manifest = JSON.parse(await readFile('science/manifests/neural-only-max-component-surprise32.json','utf8'));
assert.equal(manifest.analysis_needs_malecns,false);
assert.equal(manifest.simulation_contract,'science/simulations/v15n-deterministic-v4.json');
assert.equal(
  manifest.dependencies[0].registry_key,
  'neural_only_predictive_surprise32_multilag_rise_failure_attribution',
);

const registry = JSON.parse(await readFile('science/artifacts/frozen.json','utf8'));
assert.equal(
  registry.artifacts.neural_only_predictive_surprise32_multilag_rise_failure_attribution.evidence_sha256,
  '4d34942cc294798c8363fab817a472469cea135cd8e5dc11a9587ff2ddeeca71',
);

console.log(JSON.stringify({
  status:'PASS',
  score:'max_j(r_j^2)',
  componentCount:32,
  freshProspective:['E','F'],
}));
