import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
  PHASE_RESIDUAL_PHASES,
  PHASE_RESIDUAL_DN_COUNT,
  PHASE_RESIDUAL_SCALE_FLOOR,
  PHASE_RESIDUAL_Q,
  PHASE_RESIDUAL_REFRACTORY,
  fitPhaseResidualScales,
  phaseResidualScoreFrames,
  phaseResidualSerializableContract,
} from '../lib/neural-only-phase-residual-energy.mjs';

assert.equal(PHASE_RESIDUAL_PHASES,48);
assert.equal(PHASE_RESIDUAL_DN_COUNT,1316);
assert.equal(PHASE_RESIDUAL_SCALE_FLOOR,1e-6);
assert.equal(PHASE_RESIDUAL_Q,.95);
assert.equal(PHASE_RESIDUAL_REFRACTORY,10);

const zeros=()=>new Float64Array(PHASE_RESIDUAL_DN_COUNT);
const means=Array.from({length:48},zeros);
const frames=[];
for(let p=0;p<48;p+=1){
  const values=zeros();
  values[0]=1;
  frames.push({frameIndex:p,step:p*5,values});
}
const scales=fitPhaseResidualScales([{seed:1,frames}],means);
assert.equal(scales.counts.length,48);
assert.ok(scales.counts.every(x=>x===1));
assert.equal(scales.scales[0][0],1);
assert.equal(scales.scales[0][1],1e-6);

const score=phaseResidualScoreFrames([{seed:1,frames}],means,scales.scales);
assert.equal(score.finiteScores,48);
assert.ok(Number.isFinite(score.scoresBySeed.get(1)[0].score));

const contract=phaseResidualSerializableContract('base-sha',2.5);
assert.equal(contract.phaseCount,48);
assert.equal(contract.dnCount,1316);
assert.equal(contract.scaleFloor,1e-6);
assert.equal(contract.thresholdQuantile,.95);
assert.equal(contract.threshold,2.5);
assert.equal(contract.refractory,10);

const current=JSON.parse(await readFile('science/cohorts/neural-only-phase-residual-energy-v4.json','utf8'));
const oldFiles=[
  'science/cohorts/neural-only-predictive-surprise32-v4.json',
  'science/cohorts/neural-only-predictive-surprise32-multilag-rise-v4.json',
  'science/cohorts/neural-only-max-component-surprise32-v4.json',
  'science/cohorts/neural-only-pca-complement-innovation-v4.json',
  'science/cohorts/tape-cache-validation-64.json',
];
const oldSets=[];
for(const path of oldFiles) oldSets.push(JSON.parse(await readFile(path,'utf8')));
const seeds=cohort=>[...cohort.base_seeds,cohort.interruption_seed];
const frozen=new Set(oldSets.flatMap(set=>Object.values(set.cohorts).flatMap(seeds)));
for(const name of ['prospective_i','prospective_j']){
  for(const seed of seeds(current.cohorts[name])) assert.ok(!frozen.has(seed),'fresh seed collision: '+seed);
}
const i=new Set(seeds(current.cohorts.prospective_i));
for(const seed of seeds(current.cohorts.prospective_j)) assert.ok(!i.has(seed),'I/J collision: '+seed);

const manifest=JSON.parse(await readFile('science/manifests/neural-only-phase-residual-energy.json','utf8'));
assert.equal(manifest.analysis_needs_malecns,false);
assert.equal(manifest.simulation_contract,'science/simulations/v15n-deterministic-v4.json');
assert.equal(manifest.dependencies[0].registry_key,'neural_only_pca_complement_failure_attribution');

console.log(JSON.stringify({
  status:'PASS',
  score:'full-DN standardized phase-residual mean energy',
  innovationUsed:false,
  freshProspective:['I','J'],
}));
