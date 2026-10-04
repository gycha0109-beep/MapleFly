#!/usr/bin/env node
import {createHash} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {loadOrBuildV15nTapePack} from './lib/v15n-tape-cache.mjs';
import * as frozen from './lib/neural-only-predictive-surprise32-frozen.mjs';
import {
  maxComponentFiniteScores,
  maxComponentSerializableContract,
} from './lib/neural-only-max-component-surprise32.mjs';
import {
  attributeCohort,
  matchEvents,
} from './lib/neural-only-predictive-surprise32-attribution.mjs';
import {
  maxComponentScoreFramesWithArgmax,
  relabelMaxMissAttribution,
  componentDistribution,
  scoreQuantiles,
  maxAttributionAxis,
} from './lib/neural-only-max-component-surprise32-attribution.mjs';

const PHASE = 'v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1';
const PREFIX = PHASE.toUpperCase() + '_';
const OUTPUT_DIR = 'results/neural-only-max-component-surprise32-failure-attribution';
const BASE_MODEL_SHA = 'de8cc3c24cbb91a3a9a806aa2afe37ecd0294c0d2c4b5ce2d4a93c25d77a1cde';
const BASE_THRESHOLD = 1.574078960908224;
const REPAIR_MODEL_SHA = '17c5b3e45a1748b940a903b02684c3683838825a6b77d4eeee04af963f9af6fb';
const MAX_THRESHOLD = 12.389163171560895;
const FAILURE_EVIDENCE_SHA = '2838b9c29fd358a63348e0cc386b46bde7e36a0290f9ffdaf4e4526bb79d922c';
const COHORT_PATH = 'science/cohorts/neural-only-max-component-surprise32-v4.json';
const BOUNDARY_RULE = 'OUTSIDE_NAMED_BUCKETS_NONE';
const METRICS = [
  'tapes','physicalImpacts','neuralEvents','matched','falseEvents','missedImpacts',
  'precision','recall','f1','eventCountRatio','meanAbsolutePerTapeCountError',
  'medianMatchedLatencySeconds','p90MatchedLatencySeconds','risingEdges','refractorySuppressed',
];
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

function exactMetrics(actual,expected) {
  return Object.fromEntries(METRICS.map(key => [key,{
    expected:expected[key],observed:actual[key],pass:actual[key] === expected[key],
  }]));
}

function allChecksPass(checks) {
  return Object.values(checks).every(check => check.pass);
}

async function writeEvidence(output) {
  await mkdir(OUTPUT_DIR,{recursive:true});
  const path = resolve(OUTPUT_DIR,PHASE + '.json');
  await writeFile(path,JSON.stringify(output,null,2) + '\n');
  console.log('[max-component-attribution] outcome=' + output.outcome + ' axis=' + output.attributionAxis);
  console.log('[max-component-attribution] evidence=' + path);
}

function diagnostics(tapes,scoresBySeed,eventMap,generic) {
  const backgroundScores=[];
  const impactLocalScores=[];
  const backgroundArgmax=[];
  const impactLocalArgmax=[];
  const falseArgmax=[];
  const matchedArgmax=[];
  let scoredFrames=0, argmaxFrames=0;

  for (const tape of tapes) {
    const hits=tape.damageEvents.map(e=>e.step);
    const frames=scoresBySeed.get(tape.seed) ?? [];
    const byStep=new Map(frames.map(frame=>[frame.step,frame]));
    const events=eventMap.get(tape.seed)?.events ?? [];
    const {consumedBy}=matchEvents(hits,events);

    for (const frame of frames) {
      if (!Number.isFinite(frame.score)) continue;
      scoredFrames += 1;
      if (Number.isInteger(frame.argmaxComponent)) argmaxFrames += 1;
      const isBackground=hits.every(hit=>Math.abs(frame.step-hit)>=20);
      const isImpactLocal=hits.some(hit=>frame.step-hit>=-10 && frame.step-hit<20);
      if (isBackground) {
        backgroundScores.push(frame.score);
        backgroundArgmax.push(frame.argmaxComponent);
      }
      if (isImpactLocal) {
        impactLocalScores.push(frame.score);
        impactLocalArgmax.push(frame.argmaxComponent);
      }
    }

    for (let i=0;i<events.length;i+=1) {
      const frame=byStep.get(events[i].step);
      const index=frame?.argmaxComponent;
      if (consumedBy.has(i)) matchedArgmax.push(index);
      else falseArgmax.push(index);
    }
  }

  const background=scoreQuantiles(backgroundScores);
  const impactLocal=scoreQuantiles(impactLocalScores);
  return {
    maxMissAttribution:relabelMaxMissAttribution(generic.missAttribution),
    falseEventTiming:generic.falseEventTiming,
    localPeakTiming:generic.localPeakTiming,
    missedImpactThresholdGap:generic.missedImpactThresholdGap,
    maxScoreDistribution:generic.surpriseDistribution,
    backgroundSeparation:{
      background,
      impactLocal,
      impactLocalQ95OverBackgroundQ95:
        background.q95 ? impactLocal.q95 / background.q95 : null,
      impactLocalQ99OverBackgroundQ99:
        background.q99 ? impactLocal.q99 / background.q99 : null,
    },
    argmax:{
      BACKGROUND:componentDistribution(backgroundArgmax),
      IMPACT_LOCAL:componentDistribution(impactLocalArgmax),
      FALSE_EVENT:componentDistribution(falseArgmax),
      MATCHED_EVENT:componentDistribution(matchedArgmax),
      scoredFrames,
      argmaxFrames,
      availableFraction:scoredFrames ? argmaxFrames/scoredFrames : 0,
    },
  };
}

async function main() {
  const output={
    schema:'maplefly.neural-only-max-component-surprise32-failure-attribution.1',
    design:{commit:'6c725f2f8b58d24ce2aa105846a267684b397420'},
    preregistration:{
      path:'history/prereg_' + PHASE + '.md',
      commit:'0ce7588247a29156f6a6aabb7b593d90bbbe16f4',
    },
    prerequisite:{
      runId:37179603274,
      artifactId:11294069478,
      artifactDigest:'sha256:3c23c8d3a6a1a44ada98641f6ca86e8a653b66d43321c6c8c7807074523a4f3e',
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
      componentSelection:false,
      componentRemoval:false,
      topKSearch:false,
      weightingSearch:false,
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

  try {
    if (process.env.MAPLEFLY_TAPE_BUILD_ALLOWED !== 'false') {
      throw new Error('attribution requires read-only Tape Packs');
    }
    if (process.env.MAPLEFLY_SIMULATION_CONTRACT_ID !== 'v15n-deterministic-v4') {
      throw new Error('v4 simulation identity required');
    }

    const prerequisiteBytes=await readFile(process.env.MAX_COMPONENT_FAILURE_ARTIFACT_FILE);
    if (sha256(prerequisiteBytes) !== FAILURE_EVIDENCE_SHA) {
      throw new Error('frozen max-component failure evidence SHA mismatch');
    }
    const prerequisite=JSON.parse(prerequisiteBytes);
    if (!prerequisite.outcome.endsWith('_NEURAL_ONLY_MAX_COMPONENT_SURPRISE32_EVENT_STREAM_NOT_DEMONSTRATED') ||
        !prerequisite.baseReproduction?.pass ||
        !prerequisite.calibration?.pass ||
        !prerequisite.support?.pass ||
        prerequisite.repairModel?.sha256 !== REPAIR_MODEL_SHA ||
        prerequisite.repairModel?.threshold !== MAX_THRESHOLD) {
      throw new Error('frozen max-component failure contract mismatch');
    }

    const setBytes=await readFile(COHORT_PATH);
    const set=JSON.parse(setBytes);
    output.tapeProvenance={
      cohortSet:COHORT_PATH,
      cohortSetSha256:sha256(setBytes),
      simulationContract:set.simulation_contract,
      packs:{},
    };

    async function load(name) {
      const cohort=set.cohorts[name];
      const pack=await loadOrBuildV15nTapePack({
        cohortName:cohort.cache_name,
        baseSeeds:cohort.base_seeds,
        interruptionSeed:cohort.interruption_seed,
        allowBuild:false,
        build:async()=>{throw new Error('analysis must never simulate');},
        validate:rows=>{
          if(rows.length!==64 || new Set(rows.map(row=>row.seed)).size!==64 ||
              rows.some(row=>row.liveSteps!==2400 || row.potionEvents.length!==10)) {
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
    const maxCal=maxComponentScoreFramesWithArgmax(calibration,model);
    const maxQuantile=frozen.noD1NearestRank95(maxComponentFiniteScores(maxCal));
    const repairModelSha=sha256(JSON.stringify(
      maxComponentSerializableContract(baseModelSha,maxQuantile.threshold),
    ));

    output.reproduction.baseModel={expected:BASE_MODEL_SHA,observed:baseModelSha,pass:baseModelSha===BASE_MODEL_SHA};
    output.reproduction.baseThreshold={expected:BASE_THRESHOLD,observed:baseQuantile.threshold,pass:baseQuantile.threshold===BASE_THRESHOLD};
    output.reproduction.repairModel={expected:REPAIR_MODEL_SHA,observed:repairModelSha,pass:repairModelSha===REPAIR_MODEL_SHA};
    output.reproduction.maxThreshold={expected:MAX_THRESHOLD,observed:maxQuantile.threshold,pass:maxQuantile.threshold===MAX_THRESHOLD};
    output.reproduction.training={
      trainTapes:train.length,predictiveRows:rows.length,
      calibrationTapes:calibration.length,maxCalibrationScores:maxQuantile.count,
      pass:train.length===64 && rows.length===30080 && calibration.length===64 && maxQuantile.count===30080,
    };

    if (![output.reproduction.baseModel,output.reproduction.baseThreshold,
      output.reproduction.repairModel,output.reproduction.maxThreshold,
      output.reproduction.training].every(check=>check.pass)) {
      output.outcome=PREFIX+'MAX_COMPONENT_ATTRIBUTION_IMPLEMENTATION_OR_PROVENANCE_INVALID';
      await writeEvidence(output); return;
    }

    const E=await load('prospective_e');
    const F=await load('prospective_f');
    const scoreE=maxComponentScoreFramesWithArgmax(frozen.noD1NeuralViews(E),model);
    const scoreF=maxComponentScoreFramesWithArgmax(frozen.noD1NeuralViews(F),model);
    const eventE=frozen.noD1Eventize(scoreE,maxQuantile.threshold);
    const eventF=frozen.noD1Eventize(scoreF,maxQuantile.threshold);

    frozen.allowFrozenEvaluation(baseModelSha,baseQuantile.threshold);
    const metricsE=frozen.noD1Evaluate(E,eventE);
    const metricsF=frozen.noD1Evaluate(F,eventF);
    output.reproduction.E=exactMetrics(metricsE,prerequisite.prospective.E.metrics);
    output.reproduction.F=exactMetrics(metricsF,prerequisite.prospective.F.metrics);
    output.reproduction.pass=allChecksPass(output.reproduction.E) && allChecksPass(output.reproduction.F);

    if (!output.reproduction.pass) {
      output.outcome=PREFIX+'MAX_COMPONENT_ATTRIBUTION_IMPLEMENTATION_OR_PROVENANCE_INVALID';
      await writeEvidence(output); return;
    }

    const genericE=attributeCohort(E,scoreE,eventE,maxQuantile.threshold,BOUNDARY_RULE);
    const genericF=attributeCohort(F,scoreF,eventF,maxQuantile.threshold,BOUNDARY_RULE);
    const attrE=diagnostics(E,scoreE,eventE,genericE);
    const attrF=diagnostics(F,scoreF,eventF,genericF);

    function support(metrics,generic,attr) {
      return {
        tapes:metrics.tapes,
        physicalImpacts:metrics.physicalImpacts,
        neuralEvents:metrics.neuralEvents,
        falseEvents:metrics.falseEvents,
        missedImpacts:metrics.missedImpacts,
        finiteLocalPeakFraction:generic.localPeakTiming.finitePeakFraction,
        finiteBackgroundFrames:attr.backgroundSeparation.background.count,
        argmaxAvailableFraction:attr.argmax.availableFraction,
        pass:metrics.tapes===64 &&
          metrics.physicalImpacts>=1000 &&
          metrics.neuralEvents>=500 &&
          metrics.falseEvents>=1000 &&
          metrics.missedImpacts>=1000 &&
          generic.localPeakTiming.finitePeakFraction>=.99 &&
          attr.backgroundSeparation.background.count>=10000 &&
          attr.argmax.availableFraction>=.99,
      };
    }

    output.support={
      E:support(metricsE,genericE,attrE),
      F:support(metricsF,genericF,attrF),
    };
    output.support.pass=output.support.E.pass && output.support.F.pass;
    if (!output.support.pass) {
      output.outcome=PREFIX+'MAX_COMPONENT_INSUFFICIENT_ATTRIBUTION_SUPPORT';
      await writeEvidence(output); return;
    }

    output.attribution={E:attrE,F:attrF};
    output.attributionAxis=maxAttributionAxis(attrE,attrF);
    output.outcome=PREFIX+'NEURAL_ONLY_MAX_COMPONENT_SURPRISE32_FAILURE_ATTRIBUTED';
    await writeEvidence(output);
  } catch(error) {
    output.outcome=PREFIX+'MAX_COMPONENT_ATTRIBUTION_IMPLEMENTATION_OR_PROVENANCE_INVALID';
    output.error={message:String(error.message),classification:'IMPLEMENTATION_OR_PROVENANCE',runtime:process.version};
    await writeEvidence(output);
    throw error;
  }
}

if (process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error=>{console.error(error);process.exitCode=1;});
}
