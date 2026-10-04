#!/usr/bin/env node
import {createHash} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {loadOrBuildV15nTapePack} from './lib/v15n-tape-cache.mjs';
import * as frozen from './lib/neural-only-predictive-surprise32-frozen.mjs';
import {
  multilagRiseScores,
  multilagRiseFiniteScores,
  multilagRiseSerializableContract,
} from './lib/neural-only-predictive-surprise32-multilag-rise.mjs';
import {
  attributeCohort,
  localPeak,
  summarize,
} from './lib/neural-only-predictive-surprise32-attribution.mjs';
import {
  relabelRiseMissAttribution,
  rawLocalContext,
  contextComposition,
  multilagRiseAttributionAxis,
} from './lib/neural-only-predictive-surprise32-multilag-rise-attribution.mjs';

const PHASE = 'v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1';
const PREFIX = PHASE.toUpperCase() + '_';
const OUTPUT_DIR = 'results/neural-only-predictive-surprise32-multilag-rise-failure-attribution';
const BASE_MODEL_SHA = 'de8cc3c24cbb91a3a9a806aa2afe37ecd0294c0d2c4b5ce2d4a93c25d77a1cde';
const BASE_THRESHOLD = 1.574078960908224;
const REPAIR_MODEL_SHA = '8556002505564c754f972abd62afc20ff8b89f0e7bca52b7e365a6f5120b275a';
const RISE_THRESHOLD = 1.0756203121500945;
const FAILURE_EVIDENCE_SHA = 'e6220d2e027e5dd8dfa34bd862be1af731a03a76d967de91534977618919b98e';
const COHORT_PATH = 'science/cohorts/neural-only-predictive-surprise32-multilag-rise-v4.json';
const BOUNDARY_RULE = 'OUTSIDE_NAMED_BUCKETS_NONE';
const METRICS = ['tapes','physicalImpacts','neuralEvents','matched','falseEvents','missedImpacts',
  'precision','recall','f1','eventCountRatio','meanAbsolutePerTapeCountError',
  'medianMatchedLatencySeconds','p90MatchedLatencySeconds','risingEdges','refractorySuppressed'];
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
  console.log('[multilag-rise-attribution] outcome=' + output.outcome + ' axis=' + output.attributionAxis);
  console.log('[multilag-rise-attribution] evidence=' + path);
}

function attachRawContext(attr,rawScores,baseThreshold) {
  const rows = attr.records.missedImpacts.map(row => {
    const peak = localPeak(rawScores.get(row.seed) ?? [],row.hitStep,baseThreshold);
    return {
      seed:row.seed,
      hitIndex:row.hitIndex,
      hitStep:row.hitStep,
      riseCategory:row.category,
      rawPeak:peak,
      rawContext:rawLocalContext(peak,baseThreshold),
    };
  });
  const finite = rows.filter(row => row.rawPeak !== null);
  const noLocalRise = rows.filter(row => row.riseCategory === 'NO_LOCAL_THRESHOLD_CROSSING');
  return {
    records:rows,
    rawContextAllMisses:contextComposition(rows),
    rawContextNoLocalRise:contextComposition(noLocalRise),
    rawPeakTiming:{
      finitePeakFraction:rows.length ? finite.length / rows.length : 0,
      peakOffsetSteps:summarize(finite.map(row => row.rawPeak.peakOffsetSteps)),
    },
    rawThresholdGap:summarize(finite.map(row => row.rawPeak.thresholdGap)),
  };
}

function cohortOutput(attr,rawContext) {
  return {
    riseMissAttribution:relabelRiseMissAttribution(attr.missAttribution),
    falseEventTiming:attr.falseEventTiming,
    riseLocalPeakTiming:attr.localPeakTiming,
    riseMissedImpactThresholdGap:attr.missedImpactThresholdGap,
    riseDistribution:attr.surpriseDistribution,
    rawContextAllMisses:rawContext.rawContextAllMisses,
    rawContextNoLocalRise:rawContext.rawContextNoLocalRise,
    rawPeakTiming:rawContext.rawPeakTiming,
    rawThresholdGap:rawContext.rawThresholdGap,
  };
}

async function main() {
  const output = {
    schema:'maplefly.neural-only-predictive-surprise32-multilag-rise-failure-attribution.1',
    design:{commit:'40d439f188c2fdc55984f484b7a20404da36920f'},
    preregistration:{
      path:'history/prereg_' + PHASE + '.md',
      commit:'d608390653b63b1e7e7a3e7431d7cf7263f77fa3',
    },
    prerequisite:{
      runId:37173877851,
      artifactId:11293292628,
      artifactDigest:'sha256:82c80090244e5f8f0a025e92062b31d83bad4e19ea65490f465a24814db63217',
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
      repairSelectedFromAttribution:false,
      thresholdChanged:false,
      lagSearch:false,
      smoothingSearch:false,
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

    const prerequisiteBytes = await readFile(process.env.MULTILAG_RISE_FAILURE_ARTIFACT_FILE);
    if (sha256(prerequisiteBytes) !== FAILURE_EVIDENCE_SHA) {
      throw new Error('frozen multilag-rise failure evidence SHA mismatch');
    }
    const prerequisite = JSON.parse(prerequisiteBytes);
    if (!prerequisite.outcome.endsWith('_MULTILAG_RISE_EVENT_STREAM_NOT_DEMONSTRATED') ||
        !prerequisite.baseReproduction?.pass ||
        !prerequisite.calibration?.pass ||
        !prerequisite.support?.pass ||
        prerequisite.repairModel?.sha256 !== REPAIR_MODEL_SHA ||
        prerequisite.repairModel?.threshold !== RISE_THRESHOLD) {
      throw new Error('frozen multilag-rise failure contract mismatch');
    }

    const setBytes = await readFile(COHORT_PATH);
    const set = JSON.parse(setBytes);
    output.tapeProvenance = {
      cohortSet:COHORT_PATH,
      cohortSetSha256:sha256(setBytes),
      simulationContract:set.simulation_contract,
      packs:{},
    };

    async function load(name) {
      const cohort = set.cohorts[name];
      const pack = await loadOrBuildV15nTapePack({
        cohortName:cohort.cache_name,
        baseSeeds:cohort.base_seeds,
        interruptionSeed:cohort.interruption_seed,
        allowBuild:false,
        build:async () => {throw new Error('analysis must never simulate');},
        validate:rows => {
          if (rows.length !== 64 || new Set(rows.map(row => row.seed)).size !== 64 ||
              rows.some(row => row.liveSteps !== 2400 || row.potionEvents.length !== 10)) {
            throw new Error('frozen tape count/shape mismatch: ' + name);
          }
        },
      });
      output.tapeProvenance.packs[name] = {
        key:pack.key,cacheHit:pack.cacheHit,
        compressedSha256:sha256(await readFile(pack.path)),
        tapes:pack.tapes.length,
      };
      return pack.tapes;
    }

    const train = frozen.noD1NeuralViews(await load('train'));
    frozen.noD1AssertViews(train);
    const phase = frozen.noD1PhaseMeans(train);
    const pca = frozen.d2d2FitPca(frozen.noD1SelectedInnovationRows(train,phase.means));
    const zTapes = frozen.noD1ZTapes(train,phase.means,pca);
    const zStats = frozen.noD1ZStats(zTapes);
    const rows = frozen.noD1PredictiveRows(zTapes,zStats);
    const predictor = frozen.noD1FitPredictor(rows);
    const residualStats = frozen.noD1ResidualStats(rows,predictor);
    const model = {phase,pca,zStats,predictor,residualStats};

    const calibration = frozen.noD1NeuralViews(await load('calibration'));
    const rawCal = frozen.noD1ScoreFrames(calibration,model);
    const baseQuantile = frozen.noD1NearestRank95(
      [...rawCal.values()].flatMap(frames => frames.map(frame => frame.score)),
    );
    const baseModelSha = sha256(JSON.stringify(frozen.noD1SerializableModel(model,baseQuantile.threshold)));
    const riseCal = multilagRiseScores(rawCal);
    const riseQuantile = frozen.noD1NearestRank95(multilagRiseFiniteScores(riseCal));
    const repairContract = multilagRiseSerializableContract(baseModelSha,riseQuantile.threshold);
    const repairModelSha = sha256(JSON.stringify(repairContract));

    output.reproduction.baseModel = {expected:BASE_MODEL_SHA,observed:baseModelSha,pass:baseModelSha === BASE_MODEL_SHA};
    output.reproduction.baseThreshold = {expected:BASE_THRESHOLD,observed:baseQuantile.threshold,pass:baseQuantile.threshold === BASE_THRESHOLD};
    output.reproduction.repairModel = {expected:REPAIR_MODEL_SHA,observed:repairModelSha,pass:repairModelSha === REPAIR_MODEL_SHA};
    output.reproduction.riseThreshold = {expected:RISE_THRESHOLD,observed:riseQuantile.threshold,pass:riseQuantile.threshold === RISE_THRESHOLD};
    output.reproduction.training = {
      trainTapes:train.length,predictiveRows:rows.length,
      calibrationTapes:calibration.length,riseCalibrationScores:riseQuantile.count,
      pass:train.length === 64 && rows.length === 30080 && calibration.length === 64 && riseQuantile.count === 29760,
    };

    if (![output.reproduction.baseModel,output.reproduction.baseThreshold,
      output.reproduction.repairModel,output.reproduction.riseThreshold,
      output.reproduction.training].every(check => check.pass)) {
      output.outcome = PREFIX + 'MULTILAG_RISE_ATTRIBUTION_IMPLEMENTATION_OR_PROVENANCE_INVALID';
      await writeEvidence(output);
      return;
    }

    const C = await load('prospective_c');
    const D = await load('prospective_d');
    const rawC = frozen.noD1ScoreFrames(frozen.noD1NeuralViews(C),model);
    const rawD = frozen.noD1ScoreFrames(frozen.noD1NeuralViews(D),model);
    const riseC = multilagRiseScores(rawC);
    const riseD = multilagRiseScores(rawD);
    const eventC = frozen.noD1Eventize(riseC,riseQuantile.threshold);
    const eventD = frozen.noD1Eventize(riseD,riseQuantile.threshold);

    frozen.allowFrozenEvaluation(baseModelSha,baseQuantile.threshold);
    const metricsC = frozen.noD1Evaluate(C,eventC);
    const metricsD = frozen.noD1Evaluate(D,eventD);
    output.reproduction.C = exactMetrics(metricsC,prerequisite.prospective.C.metrics);
    output.reproduction.D = exactMetrics(metricsD,prerequisite.prospective.D.metrics);
    output.reproduction.pass = allChecksPass(output.reproduction.C) && allChecksPass(output.reproduction.D);

    if (!output.reproduction.pass) {
      output.outcome = PREFIX + 'MULTILAG_RISE_ATTRIBUTION_IMPLEMENTATION_OR_PROVENANCE_INVALID';
      await writeEvidence(output);
      return;
    }

    const genericC = attributeCohort(C,riseC,eventC,riseQuantile.threshold,BOUNDARY_RULE);
    const genericD = attributeCohort(D,riseD,eventD,riseQuantile.threshold,BOUNDARY_RULE);
    const rawContextC = attachRawContext(genericC,rawC,baseQuantile.threshold);
    const rawContextD = attachRawContext(genericD,rawD,baseQuantile.threshold);
    const attrC = cohortOutput(genericC,rawContextC);
    const attrD = cohortOutput(genericD,rawContextD);

    function support(metrics,generic,rawContext) {
      return {
        tapes:metrics.tapes,
        physicalImpacts:metrics.physicalImpacts,
        neuralEvents:metrics.neuralEvents,
        falseEvents:metrics.falseEvents,
        missedImpacts:metrics.missedImpacts,
        finiteRisePeakFraction:generic.localPeakTiming.finitePeakFraction,
        finiteRawPeakFraction:rawContext.rawPeakTiming.finitePeakFraction,
        pass:metrics.tapes === 64 &&
          metrics.physicalImpacts >= 1000 &&
          metrics.neuralEvents >= 500 &&
          metrics.falseEvents >= 1000 &&
          metrics.missedImpacts >= 1000 &&
          generic.localPeakTiming.finitePeakFraction >= .99 &&
          rawContext.rawPeakTiming.finitePeakFraction >= .99,
      };
    }

    output.support = {
      C:support(metricsC,genericC,rawContextC),
      D:support(metricsD,genericD,rawContextD),
    };
    output.support.pass = output.support.C.pass && output.support.D.pass;

    if (!output.support.pass) {
      output.outcome = PREFIX + 'MULTILAG_RISE_INSUFFICIENT_ATTRIBUTION_SUPPORT';
      await writeEvidence(output);
      return;
    }

    output.attribution = {C:attrC,D:attrD};
    output.attributionAxis = multilagRiseAttributionAxis(attrC,attrD);
    output.outcome = PREFIX + 'NEURAL_ONLY_PREDICTIVE_SURPRISE32_MULTILAG_RISE_FAILURE_ATTRIBUTED';
    await writeEvidence(output);
  } catch (error) {
    output.attribution = null;
    output.attributionAxis = null;
    output.outcome = PREFIX + 'MULTILAG_RISE_ATTRIBUTION_IMPLEMENTATION_OR_PROVENANCE_INVALID';
    output.error = {message:String(error.message),classification:'IMPLEMENTATION_OR_PROVENANCE',runtime:process.version};
    await writeEvidence(output);
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => {console.error(error);process.exitCode=1;});
}
