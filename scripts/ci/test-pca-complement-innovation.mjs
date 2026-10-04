import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
  PCA_COMPLEMENT_DN_COUNT,
  PCA_COMPLEMENT_COMPONENTS,
  PCA_COMPLEMENT_DIMENSION,
  PCA_COMPLEMENT_Q,
  PCA_COMPLEMENT_REFRACTORY,
  pcaComplementScoreFrames,
  pcaComplementSerializableContract,
} from '../lib/neural-only-pca-complement-innovation.mjs';

assert.equal(PCA_COMPLEMENT_DN_COUNT,1316);
assert.equal(PCA_COMPLEMENT_COMPONENTS,32);
assert.equal(PCA_COMPLEMENT_DIMENSION,1284);
assert.equal(PCA_COMPLEMENT_Q,.95);
assert.equal(PCA_COMPLEMENT_REFRACTORY,10);

const zero=()=>new Float64Array(PCA_COMPLEMENT_DN_COUNT);
const components=Array.from({length:PCA_COMPLEMENT_COMPONENTS},(_,j)=>{
  const row=zero(); row[j]=1; return row;
});
const model={
  phase:{means:Array.from({length:48},zero)},
  pca:{
    means:zero(),
    scales:Float64Array.from({length:PCA_COMPLEMENT_DN_COUNT},()=>1),
    components,
  },
};
const frames=[];
for(let i=0;i<5;i+=1) frames.push({frameIndex:i,step:i*5,values:zero()});
const outside=zero();
outside[32]=Math.sqrt(PCA_COMPLEMENT_DIMENSION);
frames.push({frameIndex:5,step:25,values:outside});
const result=pcaComplementScoreFrames([{seed:1,frames}],model);
assert.equal(result.scoresBySeed.get(1).length,1);
assert.ok(Math.abs(result.scoresBySeed.get(1)[0].score-1)<1e-12);
assert.ok(result.diagnostics.minRawComplement>=-1e-8);

const insideFrames=[];
for(let i=0;i<5;i+=1) insideFrames.push({frameIndex:i,step:i*5,values:zero()});
const inside=zero(); inside[0]=10;
insideFrames.push({frameIndex:5,step:25,values:inside});
const insideResult=pcaComplementScoreFrames([{seed:2,frames:insideFrames}],model);
assert.ok(Math.abs(insideResult.scoresBySeed.get(2)[0].score)<1e-12);

const contract=pcaComplementSerializableContract('base-sha',2.5);
assert.equal(contract.componentCount,32);
assert.equal(contract.complementDimension,1284);
assert.equal(contract.thresholdQuantile,.95);
assert.equal(contract.threshold,2.5);
assert.equal(contract.refractory,10);

const current=JSON.parse(await readFile('science/cohorts/neural-only-pca-complement-innovation-v4.json','utf8'));
const oldFiles=[
  'science/cohorts/neural-only-predictive-surprise32-v4.json',
  'science/cohorts/neural-only-predictive-surprise32-multilag-rise-v4.json',
  'science/cohorts/neural-only-max-component-surprise32-v4.json',
  'science/cohorts/tape-cache-validation-64.json',
];
const oldSets=[];
for(const path of oldFiles) oldSets.push(JSON.parse(await readFile(path,'utf8')));
const seeds=cohort=>[...cohort.base_seeds,cohort.interruption_seed];
const frozen=new Set(oldSets.flatMap(set=>Object.values(set.cohorts).flatMap(seeds)));
for(const name of ['prospective_g','prospective_h']){
  for(const seed of seeds(current.cohorts[name])) assert.ok(!frozen.has(seed),'fresh seed collision: '+seed);
}
const g=new Set(seeds(current.cohorts.prospective_g));
for(const seed of seeds(current.cohorts.prospective_h)) assert.ok(!g.has(seed),'G/H collision: '+seed);

const manifest=JSON.parse(await readFile('science/manifests/neural-only-pca-complement-innovation.json','utf8'));
assert.equal(manifest.analysis_needs_malecns,false);
assert.equal(manifest.simulation_contract,'science/simulations/v15n-deterministic-v4.json');
assert.equal(manifest.dependencies[0].registry_key,'neural_only_max_component_surprise32_failure_attribution');

console.log(JSON.stringify({
  status:'PASS',
  score:'PCA32 orthogonal-complement innovation energy',
  complementDimension:1284,
  freshProspective:['G','H'],
}));
