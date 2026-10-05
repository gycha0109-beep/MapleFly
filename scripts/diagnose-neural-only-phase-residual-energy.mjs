#!/usr/bin/env node
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {loadOrBuildV15nTapePack} from './lib/v15n-tape-cache.mjs';
import * as frozen from './lib/neural-only-predictive-surprise32-frozen.mjs';
import {
  PHASE_RESIDUAL_PHASES,
  PHASE_RESIDUAL_DN_COUNT,
  PHASE_RESIDUAL_SCALE_FLOOR,
  PHASE_RESIDUAL_Q,
  PHASE_RESIDUAL_REFRACTORY,
  fitPhaseResidualScales,
  phaseResidualScoreFrames,
  phaseResidualFiniteScores,
  phaseResidualSerializableContract,
} from './lib/neural-only-phase-residual-energy.mjs';

const PHASE='v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1';
const PREFIX=PHASE.toUpperCase()+'_';
const OUTPUT_DIR='results/neural-only-phase-residual-energy';
const BASE_MODEL_SHA='de8cc3c24cbb91a3a9a806aa2afe37ecd0294c0d2c4b5ce2d4a93c25d77a1cde';
const BASE_THRESHOLD=1.574078960908224;
const ATTRIBUTION_EVIDENCE_SHA='3c582b8925555e3e6603fc9b638993d9808554646db9f2e350a1ec60bb43f716';
const ATTRIBUTION_AXIS='COMPLEMENT_SIGNAL_ABSENT_DOMINANT';
const COHORT_PATH='science/cohorts/neural-only-phase-residual-energy-v4.json';
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');

async function writeEvidence(output){
  await mkdir(OUTPUT_DIR,{recursive:true});
  const path=resolve(OUTPUT_DIR,PHASE+'.json');
  await writeFile(path,JSON.stringify(output,null,2)+'\n');
  console.log('[phase-residual] outcome='+output.outcome);
  console.log('[phase-residual] evidence='+path);
}

function metricGates(metrics){
  return {
    precision:{value:metrics.precision,threshold:.75,pass:metrics.precision>=.75},
    recall:{value:metrics.recall,threshold:.75,pass:metrics.recall>=.75},
    f1:{value:metrics.f1,threshold:.75,pass:metrics.f1>=.75},
    eventCountRatio:{value:metrics.eventCountRatio,min:.80,max:1.20,
      pass:metrics.eventCountRatio>=.80&&metrics.eventCountRatio<=1.20},
    meanAbsolutePerTapeCountError:{value:metrics.meanAbsolutePerTapeCountError,max:5,
      pass:metrics.meanAbsolutePerTapeCountError<=5},
  };
}

async function main(){
  const output={
    schema:'maplefly.neural-only-phase-residual-energy.1',
    design:{commit:'e0a508583b0ef173c77b87a4a05dc2dafff6ef2f'},
    preregistration:{
      path:'history/prereg_'+PHASE+'.md',
      commit:'c1d3dfbc8c6a83bccbfb2ea316b32fb47fde90a6',
    },
    prerequisite:{
      attributionRunId:37260564427,
      attributionArtifactId:11324835401,
      attributionArtifactDigest:'sha256:1021d1ded1ff600f3fc72503d7173d9aa3cf7be0dcef222889dccf184b797486',
      attributionEvidenceSha256:ATTRIBUTION_EVIDENCE_SHA,
      attributionAxis:ATTRIBUTION_AXIS,
    },
    baseReproduction:{pass:false},
    calibration:{pass:false},
    prospective:null,
    provenance:{
      strippedNeuralViews:true,
      preFreezeTruthAccess:false,
      thresholdSelectionUsesTruth:false,
      teacherUsed:false,
      supervisedReadoutUsed:false,
      attributionCohortsUsedForRepairFitting:false,
      attributionCohortsUsedForRepairEvaluation:false,
      innovationUsed:false,
      pcaUsedForRepairScore:false,
      predictorUsedForRepairScore:false,
      dnSelection:false,
      dnWeighting:false,
      smoothing:false,
      thresholdCandidateSearch:false,
      thresholdQuantileChanged:false,
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
      throw new Error('phase-residual analysis requires read-only Tape Packs');
    }
    if(process.env.MAPLEFLY_SIMULATION_CONTRACT_ID!=='v15n-deterministic-v4'){
      throw new Error('v4 simulation identity required');
    }

    const prerequisiteBytes=await readFile(process.env.PCA_COMPLEMENT_ATTRIBUTION_ARTIFACT_FILE);
    if(sha256(prerequisiteBytes)!==ATTRIBUTION_EVIDENCE_SHA){
      throw new Error('frozen PCA-complement attribution evidence SHA mismatch');
    }
    const prerequisite=JSON.parse(prerequisiteBytes);
    if(!prerequisite.outcome.endsWith('_NEURAL_ONLY_PCA_COMPLEMENT_INNOVATION_FAILURE_ATTRIBUTED')||
       prerequisite.attributionAxis!==ATTRIBUTION_AXIS||
       !prerequisite.reproduction?.pass||
       !prerequisite.support?.pass){
      throw new Error('frozen PCA-complement attribution contract mismatch');
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
      if(!cohort) throw new Error('missing cohort '+name);
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

    // Exact frozen base-model reproduction gate.
    const pca=frozen.d2d2FitPca(frozen.noD1SelectedInnovationRows(train,phase.means));
    const zTapes=frozen.noD1ZTapes(train,phase.means,pca);
    const zStats=frozen.noD1ZStats(zTapes);
    const rows=frozen.noD1PredictiveRows(zTapes,zStats);
    const predictor=frozen.noD1FitPredictor(rows);
    const residualStats=frozen.noD1ResidualStats(rows,predictor);
    const baseModel={phase,pca,zStats,predictor,residualStats};

    const calibrationTapes=frozen.noD1NeuralViews(await load('calibration'));
    const rawCalibration=frozen.noD1ScoreFrames(calibrationTapes,baseModel);
    const rawQuantile=frozen.noD1NearestRank95(
      [...rawCalibration.values()].flatMap(frames=>frames.map(frame=>frame.score)),
    );
    const baseModelSha=sha256(JSON.stringify(frozen.noD1SerializableModel(baseModel,rawQuantile.threshold)));

    output.baseReproduction={
      modelSha:{expected:BASE_MODEL_SHA,observed:baseModelSha,pass:baseModelSha===BASE_MODEL_SHA},
      threshold:{expected:BASE_THRESHOLD,observed:rawQuantile.threshold,pass:rawQuantile.threshold===BASE_THRESHOLD},
      train:{tapes:train.length,predictiveRows:rows.length},
      calibration:{tapes:calibrationTapes.length,rawScores:rawQuantile.count},
    };
    output.baseReproduction.pass=
      output.baseReproduction.modelSha.pass&&
      output.baseReproduction.threshold.pass&&
      train.length===64&&rows.length===30080&&
      calibrationTapes.length===64&&rawQuantile.count===30080;

    if(!output.baseReproduction.pass){
      output.outcome=PREFIX+'IMPLEMENTATION_OR_PROVENANCE_INVALID';
      await writeEvidence(output);return;
    }

    const phaseScales=fitPhaseResidualScales(train,phase.means);
    const calibrationScores=phaseResidualScoreFrames(calibrationTapes,phase.means,phaseScales.scales);
    const finiteCalibration=phaseResidualFiniteScores(calibrationScores.scoresBySeed);
    const phaseQuantile=frozen.noD1NearestRank95(finiteCalibration);
    const tauPhase=phaseQuantile.threshold;
    const phaseSupport=
      phaseScales.counts.length===PHASE_RESIDUAL_PHASES&&
      phaseScales.counts.every(count=>count>0)&&
      Number.isFinite(phaseScales.minScale)&&
      phaseScales.minScale>=PHASE_RESIDUAL_SCALE_FLOOR&&
      Number.isFinite(phaseScales.maxScale);
    const calibrationPass=
      calibrationTapes.length===64&&
      phaseQuantile.count>=30000&&
      Number.isFinite(tauPhase)&&tauPhase>0&&
      phaseSupport;

    const repairContract=phaseResidualSerializableContract(baseModelSha,tauPhase);
    const repairModelSha=sha256(JSON.stringify(repairContract));
    output.repairModel={
      sha256:repairModelSha,
      baseModelSha,
      phaseCount:PHASE_RESIDUAL_PHASES,
      dnCount:PHASE_RESIDUAL_DN_COUNT,
      scaleFloor:PHASE_RESIDUAL_SCALE_FLOOR,
      score:repairContract.score,
      thresholdQuantile:PHASE_RESIDUAL_Q,
      threshold:tauPhase,
      refractory:PHASE_RESIDUAL_REFRACTORY,
    };
    output.calibration={
      tapes:calibrationTapes.length,
      finiteScores:phaseQuantile.count,
      thresholdQuantile:PHASE_RESIDUAL_Q,
      threshold:tauPhase,
      phaseCounts:phaseScales.counts,
      minScale:phaseScales.minScale,
      maxScale:phaseScales.maxScale,
      pass:calibrationPass,
    };

    if(!calibrationPass){
      output.outcome=PREFIX+'INSUFFICIENT_SUPPORT';
      await writeEvidence(output);return;
    }

    const I=await load('prospective_i');
    const J=await load('prospective_j');
    const scoreI=phaseResidualScoreFrames(frozen.noD1NeuralViews(I),phase.means,phaseScales.scales);
    const scoreJ=phaseResidualScoreFrames(frozen.noD1NeuralViews(J),phase.means,phaseScales.scales);
    const eventI=frozen.noD1Eventize(scoreI.scoresBySeed,tauPhase);
    const eventJ=frozen.noD1Eventize(scoreJ.scoresBySeed,tauPhase);

    output.freeze={
      baseModelReproduced:true,
      phaseStatsFrozen:true,
      phaseResidualScoreFrozen:true,
      phaseResidualThresholdFrozen:true,
      eventizerFrozen:true,
      repairModelSha,
    };

    frozen.allowFrozenEvaluation(baseModelSha,rawQuantile.threshold);
    const metricsI=frozen.noD1Evaluate(I,eventI);
    const metricsJ=frozen.noD1Evaluate(J,eventJ);
    const supportI=frozen.noD1ProspectiveSupport(metricsI);
    const supportJ=frozen.noD1ProspectiveSupport(metricsJ);
    const gatesI=metricGates(metricsI);
    const gatesJ=metricGates(metricsJ);
    const passI=Object.values(gatesI).every(gate=>gate.pass);
    const passJ=Object.values(gatesJ).every(gate=>gate.pass);

    output.prospective={
      I:{metrics:metricsI,support:supportI,gates:gatesI,pass:passI},
      J:{metrics:metricsJ,support:supportJ,gates:gatesJ,pass:passJ},
    };
    output.support={I:supportI,J:supportJ,pass:supportI.pass&&supportJ.pass};

    if(!output.support.pass){
      output.outcome=PREFIX+'INSUFFICIENT_SUPPORT';
      await writeEvidence(output);return;
    }

    const demonstrated=passI&&passJ;
    output.deployabilityCandidate=demonstrated;
    output.diagnosticStackDeployable=demonstrated;
    output.deployment=demonstrated?'CANDIDATE_ONLY_NOT_DEPLOYED':'BLOCKED';
    output.outcome=PREFIX+'NEURAL_ONLY_PHASE_RESIDUAL_ENERGY_EVENT_STREAM_'+
      (demonstrated?'DEMONSTRATED':'NOT_DEMONSTRATED');
    await writeEvidence(output);
  }catch(error){
    output.outcome=PREFIX+'IMPLEMENTATION_OR_PROVENANCE_INVALID';
    output.error={message:String(error.message),classification:'IMPLEMENTATION_OR_PROVENANCE',runtime:process.version};
    await writeEvidence(output);
    throw error;
  }
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  main().catch(error=>{console.error(error);process.exitCode=1;});
}
