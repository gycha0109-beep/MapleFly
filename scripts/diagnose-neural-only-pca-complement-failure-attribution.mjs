#!/usr/bin/env node
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {loadOrBuildV15nTapePack} from './lib/v15n-tape-cache.mjs';
import * as frozen from './lib/neural-only-predictive-surprise32-frozen.mjs';
import {maxComponentScoreFrames} from './lib/neural-only-max-component-surprise32.mjs';
import {
  pcaComplementScoreFrames,
  pcaComplementFiniteScores,
  pcaComplementSerializableContract,
} from './lib/neural-only-pca-complement-innovation.mjs';
import {
  attributeCohort,
  summarize,
} from './lib/neural-only-predictive-surprise32-attribution.mjs';
import {
  relabelComplementMissAttribution,
  crossRepresentationContext,
  complementAttributionAxis,
} from './lib/neural-only-pca-complement-attribution.mjs';

const PHASE='v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1';
const PREFIX=PHASE.toUpperCase()+'_';
const OUTPUT_DIR='results/neural-only-pca-complement-failure-attribution';
const BASE_MODEL_SHA='de8cc3c24cbb91a3a9a806aa2afe37ecd0294c0d2c4b5ce2d4a93c25d77a1cde';
const BASE_THRESHOLD=1.574078960908224;
const MAX_THRESHOLD=12.389163171560895;
const REPAIR_MODEL_SHA='1b4489bf4e1720ebb16b8a14f16814999398c68bcbf46afc8e3c1b76e0416c7e';
const COMPLEMENT_THRESHOLD=1.6592220236705837;
const FAILURE_EVIDENCE_SHA='cf2182a46b6d7ee9e233f01734a8f919df3914b0bd69835dc73062b4a7b1c2d5';
const COHORT_PATH='science/cohorts/neural-only-pca-complement-innovation-v4.json';
const BOUNDARY_RULE='OUTSIDE_NAMED_BUCKETS_NONE';
const METRICS=[
  'tapes','physicalImpacts','neuralEvents','matched','falseEvents','missedImpacts',
  'precision','recall','f1','eventCountRatio','meanAbsolutePerTapeCountError',
  'medianMatchedLatencySeconds','p90MatchedLatencySeconds','risingEdges','refractorySuppressed',
];
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');

function exactMetrics(actual,expected){
  return Object.fromEntries(METRICS.map(key=>[key,{
    expected:expected[key],observed:actual[key],pass:actual[key]===expected[key],
  }]));
}
function allChecksPass(checks){return Object.values(checks).every(check=>check.pass);}
function localPresent(frames,hitStep,threshold){
  let available=false;
  for(const frame of frames??[]){
    if(frame.step<hitStep-10||frame.step>=hitStep+20||!Number.isFinite(frame.score)) continue;
    available=true;
    if(frame.score>=threshold) return {available:true,present:true};
  }
  return {available,present:false};
}
function scoreQuantiles(values){return summarize(values,true);}
function backgroundSeparation(tapes,scoresBySeed){
  const background=[],impactLocal=[];
  for(const tape of tapes){
    const hits=tape.damageEvents.map(e=>e.step);
    for(const frame of scoresBySeed.get(tape.seed)??[]){
      if(!Number.isFinite(frame.score)) continue;
      if(hits.every(hit=>Math.abs(frame.step-hit)>=20)) background.push(frame.score);
      if(hits.some(hit=>frame.step-hit>=-10&&frame.step-hit<20)) impactLocal.push(frame.score);
    }
  }
  const b=scoreQuantiles(background),i=scoreQuantiles(impactLocal);
  return {
    background:b,
    impactLocal:i,
    impactLocalQ95OverBackgroundQ95:b.q95?i.q95/b.q95:null,
    impactLocalQ99OverBackgroundQ99:b.q99?i.q99/b.q99:null,
  };
}
function attachCrossContext(generic,baseScores,maxScores,complementScores){
  const rows=[];
  let available=0;
  for(const miss of generic.records.missedImpacts){
    const base=localPresent(baseScores.get(miss.seed),miss.hitStep,BASE_THRESHOLD);
    const max=localPresent(maxScores.get(miss.seed),miss.hitStep,MAX_THRESHOLD);
    const complement=localPresent(complementScores.get(miss.seed),miss.hitStep,COMPLEMENT_THRESHOLD);
    if(base.available&&max.available&&complement.available) available+=1;
    rows.push({
      seed:miss.seed,hitIndex:miss.hitIndex,hitStep:miss.hitStep,
      basePresent:base.present,maxPresent:max.present,complementPresent:complement.present,
      contextAvailable:base.available&&max.available&&complement.available,
    });
  }
  return {
    composition:crossRepresentationContext(rows),
    availableFraction:rows.length?available/rows.length:0,
  };
}
function cohortOutput(tapes,generic,complementScores,baseScores,maxScores){
  const cross=attachCrossContext(generic,baseScores,maxScores,complementScores);
  return {
    complementMissAttribution:relabelComplementMissAttribution(generic.missAttribution),
    falseEventTiming:generic.falseEventTiming,
    localPeakTiming:generic.localPeakTiming,
    missedImpactThresholdGap:generic.missedImpactThresholdGap,
    complementScoreDistribution:generic.surpriseDistribution,
    backgroundSeparation:backgroundSeparation(tapes,complementScores),
    crossRepresentation:cross,
  };
}
async function writeEvidence(output){
  await mkdir(OUTPUT_DIR,{recursive:true});
  const path=resolve(OUTPUT_DIR,PHASE+'.json');
  await writeFile(path,JSON.stringify(output,null,2)+'\n');
  console.log('[pca-complement-attribution] outcome='+output.outcome+' axis='+output.attributionAxis);
  console.log('[pca-complement-attribution] evidence='+path);
}

async function main(){
  const output={
    schema:'maplefly.neural-only-pca-complement-failure-attribution.1',
    design:{commit:'4211f7799426d555a39ad49de151bbd3f8af3b89'},
    preregistration:{
      path:'history/prereg_'+PHASE+'.md',
      commit:'f6f5be8552efcc73bf462e9e2430fc2dc3f1e56c',
    },
    prerequisite:{
      runId:37202530369,
      artifactId:11304103673,
      artifactDigest:'sha256:bd801b07b3b0bdbf63003314ad13350f354717524fd4784d3af9a41d28f76319',
      evidenceSha256:FAILURE_EVIDENCE_SHA,
    },
    reproduction:{pass:false},
    support:{pass:false},
    attributionAxis:null,
    attribution:null,
    provenance:{
      strippedNeuralViews:true,
      preFreezeTruthAccess:false,
      thresholdSelectionUsesTruth:false,
      teacherUsed:false,
      supervisedReadoutUsed:false,
      attributionCohortsUsedForFitting:false,
      attributionCohortsUsedForGeneralization:false,
      pcaDimensionSearch:false,
      dnSelection:false,
      scoreFusion:false,
      thresholdChanged:false,
      timingShiftSearch:false,
      tapeBuildAllowed:false,
      simulationContextInitialized:false,
    },
    diagnosticStackDeployable:false,
    deployabilityCandidate:false,
    deployment:'BLOCKED',
    deployedPotion:'v15D',
    v15n:'CLOSED / BLOCKED',
    v16c:'BLOCKED',
  };

  try{
    if(process.env.MAPLEFLY_TAPE_BUILD_ALLOWED!=='false'){
      throw new Error('attribution requires read-only Tape Packs');
    }
    if(process.env.MAPLEFLY_SIMULATION_CONTRACT_ID!=='v15n-deterministic-v4'){
      throw new Error('v4 simulation identity required');
    }

    const prerequisiteBytes=await readFile(process.env.PCA_COMPLEMENT_FAILURE_ARTIFACT_FILE);
    if(sha256(prerequisiteBytes)!==FAILURE_EVIDENCE_SHA){
      throw new Error('frozen PCA-complement failure evidence SHA mismatch');
    }
    const prerequisite=JSON.parse(prerequisiteBytes);
    if(!prerequisite.outcome.endsWith('_NEURAL_ONLY_PCA_COMPLEMENT_INNOVATION_EVENT_STREAM_NOT_DEMONSTRATED')||
       !prerequisite.baseReproduction?.pass||
       !prerequisite.calibration?.pass||
       !prerequisite.support?.pass||
       prerequisite.repairModel?.sha256!==REPAIR_MODEL_SHA||
       prerequisite.repairModel?.threshold!==COMPLEMENT_THRESHOLD){
      throw new Error('frozen PCA-complement failure contract mismatch');
    }

    const setBytes=await readFile(COHORT_PATH);
    const set=JSON.parse(setBytes);
    output.tapeProvenance={
      cohortSet:COHORT_PATH,
      cohortSetSha256:sha256(setBytes),
      simulationContract:set.simulation_contract,
      packs:{},
    };
    async function load(name){
      const cohort=set.cohorts[name];
      const pack=await loadOrBuildV15nTapePack({
        cohortName:cohort.cache_name,
        baseSeeds:cohort.base_seeds,
        interruptionSeed:cohort.interruption_seed,
        allowBuild:false,
        build:async()=>{throw new Error('analysis must never simulate');},
        validate:rows=>{
          if(rows.length!==64||new Set(rows.map(row=>row.seed)).size!==64||
             rows.some(row=>row.liveSteps!==2400||row.potionEvents.length!==10)){
            throw new Error('frozen tape count/shape mismatch: '+name);
          }
        },
      });
      output.tapeProvenance.packs[name]={
        key:pack.key,cacheHit:pack.cacheHit,
        compressedSha256:sha256(await readFile(pack.path)),
        tapes:pack.tapes.length,
      };
      return pack.tapes;
    }

    const train=frozen.noD1NeuralViews(await load('train'));
    frozen.noD1AssertViews(train);
    const phase=frozen.noD1PhaseMeans(train);
    const pca=frozen.d2d2FitPca(frozen.noD1SelectedInnovationRows(train,phase.means));
    const zTapes=frozen.noD1ZTapes(train,phase.means,pca);
    const zStats=frozen.noD1ZStats(zTapes);
    const rows=frozen.noD1PredictiveRows(zTapes,zStats);
    const predictor=frozen.noD1FitPredictor(rows);
    const residualStats=frozen.noD1ResidualStats(rows,predictor);
    const model={phase,pca,zStats,predictor,residualStats};

    const calibration=frozen.noD1NeuralViews(await load('calibration'));
    const rawCal=frozen.noD1ScoreFrames(calibration,model);
    const baseQuantile=frozen.noD1NearestRank95(
      [...rawCal.values()].flatMap(frames=>frames.map(frame=>frame.score)),
    );
    const baseModelSha=sha256(JSON.stringify(frozen.noD1SerializableModel(model,baseQuantile.threshold)));
    const complementCal=pcaComplementScoreFrames(calibration,model);
    const complementQuantile=frozen.noD1NearestRank95(
      pcaComplementFiniteScores(complementCal.scoresBySeed),
    );
    const repairModelSha=sha256(JSON.stringify(
      pcaComplementSerializableContract(baseModelSha,complementQuantile.threshold),
    ));

    output.reproduction.baseModel={expected:BASE_MODEL_SHA,observed:baseModelSha,pass:baseModelSha===BASE_MODEL_SHA};
    output.reproduction.baseThreshold={expected:BASE_THRESHOLD,observed:baseQuantile.threshold,pass:baseQuantile.threshold===BASE_THRESHOLD};
    output.reproduction.repairModel={expected:REPAIR_MODEL_SHA,observed:repairModelSha,pass:repairModelSha===REPAIR_MODEL_SHA};
    output.reproduction.complementThreshold={expected:COMPLEMENT_THRESHOLD,observed:complementQuantile.threshold,pass:complementQuantile.threshold===COMPLEMENT_THRESHOLD};
    output.reproduction.training={
      trainTapes:train.length,predictiveRows:rows.length,
      calibrationTapes:calibration.length,complementCalibrationScores:complementQuantile.count,
      pass:train.length===64&&rows.length===30080&&calibration.length===64&&complementQuantile.count===30400,
    };
    if(![output.reproduction.baseModel,output.reproduction.baseThreshold,
      output.reproduction.repairModel,output.reproduction.complementThreshold,
      output.reproduction.training].every(check=>check.pass)){
      output.outcome=PREFIX+'PCA_COMPLEMENT_ATTRIBUTION_IMPLEMENTATION_OR_PROVENANCE_INVALID';
      await writeEvidence(output);return;
    }

    const G=await load('prospective_g');
    const H=await load('prospective_h');
    const neuralG=frozen.noD1NeuralViews(G);
    const neuralH=frozen.noD1NeuralViews(H);
    const baseG=frozen.noD1ScoreFrames(neuralG,model);
    const baseH=frozen.noD1ScoreFrames(neuralH,model);
    const maxG=maxComponentScoreFrames(neuralG,model);
    const maxH=maxComponentScoreFrames(neuralH,model);
    const compG=pcaComplementScoreFrames(neuralG,model).scoresBySeed;
    const compH=pcaComplementScoreFrames(neuralH,model).scoresBySeed;
    const eventG=frozen.noD1Eventize(compG,complementQuantile.threshold);
    const eventH=frozen.noD1Eventize(compH,complementQuantile.threshold);

    frozen.allowFrozenEvaluation(baseModelSha,baseQuantile.threshold);
    const metricsG=frozen.noD1Evaluate(G,eventG);
    const metricsH=frozen.noD1Evaluate(H,eventH);
    output.reproduction.G=exactMetrics(metricsG,prerequisite.prospective.G.metrics);
    output.reproduction.H=exactMetrics(metricsH,prerequisite.prospective.H.metrics);
    output.reproduction.pass=allChecksPass(output.reproduction.G)&&allChecksPass(output.reproduction.H);
    if(!output.reproduction.pass){
      output.outcome=PREFIX+'PCA_COMPLEMENT_ATTRIBUTION_IMPLEMENTATION_OR_PROVENANCE_INVALID';
      await writeEvidence(output);return;
    }

    const genericG=attributeCohort(G,compG,eventG,complementQuantile.threshold,BOUNDARY_RULE);
    const genericH=attributeCohort(H,compH,eventH,complementQuantile.threshold,BOUNDARY_RULE);
    const attrG=cohortOutput(G,genericG,compG,baseG,maxG);
    const attrH=cohortOutput(H,genericH,compH,baseH,maxH);

    function support(metrics,generic,attr){
      return {
        tapes:metrics.tapes,
        physicalImpacts:metrics.physicalImpacts,
        neuralEvents:metrics.neuralEvents,
        falseEvents:metrics.falseEvents,
        missedImpacts:metrics.missedImpacts,
        finiteLocalPeakFraction:generic.localPeakTiming.finitePeakFraction,
        finiteBackgroundFrames:attr.backgroundSeparation.background.count,
        crossRepresentationContextAvailableFraction:attr.crossRepresentation.availableFraction,
        pass:metrics.tapes===64&&
          metrics.physicalImpacts>=1000&&
          metrics.neuralEvents>=500&&
          metrics.falseEvents>=1000&&
          metrics.missedImpacts>=1000&&
          generic.localPeakTiming.finitePeakFraction>=.99&&
          attr.backgroundSeparation.background.count>=10000&&
          attr.crossRepresentation.availableFraction>=.99,
      };
    }
    output.support={
      G:support(metricsG,genericG,attrG),
      H:support(metricsH,genericH,attrH),
    };
    output.support.pass=output.support.G.pass&&output.support.H.pass;
    if(!output.support.pass){
      output.outcome=PREFIX+'PCA_COMPLEMENT_INSUFFICIENT_ATTRIBUTION_SUPPORT';
      await writeEvidence(output);return;
    }

    output.attribution={G:attrG,H:attrH};
    output.attributionAxis=complementAttributionAxis(attrG,attrH);
    output.outcome=PREFIX+'NEURAL_ONLY_PCA_COMPLEMENT_INNOVATION_FAILURE_ATTRIBUTED';
    await writeEvidence(output);
  }catch(error){
    output.outcome=PREFIX+'PCA_COMPLEMENT_ATTRIBUTION_IMPLEMENTATION_OR_PROVENANCE_INVALID';
    output.error={message:String(error.message),classification:'IMPLEMENTATION_OR_PROVENANCE',runtime:process.version};
    await writeEvidence(output);
    throw error;
  }
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  main().catch(error=>{console.error(error);process.exitCode=1;});
}
