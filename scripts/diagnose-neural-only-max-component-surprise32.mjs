#!/usr/bin/env node
import {createHash} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {loadOrBuildV15nTapePack} from './lib/v15n-tape-cache.mjs';
import * as frozen from './lib/neural-only-predictive-surprise32-frozen.mjs';
import {
  MAX_COMPONENT_Q,
  MAX_COMPONENT_COUNT,
  MAX_COMPONENT_REFRACTORY,
  maxComponentScoreFrames,
  maxComponentFiniteScores,
  maxComponentSerializableContract,
} from './lib/neural-only-max-component-surprise32.mjs';

const PHASE = 'v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1';
const PREFIX = PHASE.toUpperCase() + '_';
const OUTPUT_DIR = 'results/neural-only-max-component-surprise32';
const BASE_MODEL_SHA = 'de8cc3c24cbb91a3a9a806aa2afe37ecd0294c0d2c4b5ce2d4a93c25d77a1cde';
const BASE_THRESHOLD = 1.574078960908224;
const ATTRIBUTION_EVIDENCE_SHA = '4d34942cc294798c8363fab817a472469cea135cd8e5dc11a9587ff2ddeeca71';
const ATTRIBUTION_AXIS = 'BASE_SIGNAL_ABSENT_DOMINANT';
const COHORT_PATH = 'science/cohorts/neural-only-max-component-surprise32-v4.json';
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

async function writeEvidence(output) {
  await mkdir(OUTPUT_DIR,{recursive:true});
  const path = resolve(OUTPUT_DIR,PHASE + '.json');
  await writeFile(path,JSON.stringify(output,null,2) + '\n');
  console.log('[max-component] outcome=' + output.outcome);
  console.log('[max-component] evidence=' + path);
}

function metricGates(metrics) {
  return {
    precision:{value:metrics.precision,threshold:0.75,pass:metrics.precision >= 0.75},
    recall:{value:metrics.recall,threshold:0.75,pass:metrics.recall >= 0.75},
    f1:{value:metrics.f1,threshold:0.75,pass:metrics.f1 >= 0.75},
    eventCountRatio:{value:metrics.eventCountRatio,min:0.80,max:1.20,
      pass:metrics.eventCountRatio >= 0.80 && metrics.eventCountRatio <= 1.20},
    meanAbsolutePerTapeCountError:{value:metrics.meanAbsolutePerTapeCountError,max:5.0,
      pass:metrics.meanAbsolutePerTapeCountError <= 5.0},
  };
}

async function main() {
  const output = {
    schema:'maplefly.neural-only-max-component-surprise32.1',
    preregistration:{
      path:'history/prereg_' + PHASE + '.md',
      commit:'9e177539afc4ddadee87427f2d0b469d925ffb0f',
    },
    design:{commit:'c072a69ba8accd346e54e6511be40ac557bbe619'},
    prerequisite:{
      attributionRunId:37179198946,
      attributionArtifactId:11295075939,
      attributionArtifactDigest:'sha256:493ab7b5a7b8575d3a1af2f4a7a822aa35f3e3257e01e1b37185af3adb1d18b0',
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
      componentSelection:false,
      topKSearch:false,
      learnedWeights:false,
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

  try {
    if (process.env.MAPLEFLY_TAPE_BUILD_ALLOWED !== 'false') {
      throw new Error('max-component analysis requires read-only Tape Packs');
    }
    if (process.env.MAPLEFLY_SIMULATION_CONTRACT_ID !== 'v15n-deterministic-v4') {
      throw new Error('v4 simulation identity required');
    }

    const prerequisiteBytes = await readFile(process.env.MULTILAG_RISE_ATTRIBUTION_ARTIFACT_FILE);
    if (sha256(prerequisiteBytes) !== ATTRIBUTION_EVIDENCE_SHA) {
      throw new Error('frozen attribution evidence SHA mismatch');
    }
    const prerequisite = JSON.parse(prerequisiteBytes);
    if (!prerequisite.outcome.endsWith('_MULTILAG_RISE_FAILURE_ATTRIBUTED') ||
        prerequisite.attributionAxis !== ATTRIBUTION_AXIS ||
        !prerequisite.reproduction?.pass ||
        !prerequisite.support?.pass) {
      throw new Error('frozen attribution contract mismatch');
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
      if (!cohort) throw new Error('missing cohort ' + name);
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
        key:pack.key,
        cacheHit:pack.cacheHit,
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

    const calibrationTapes = frozen.noD1NeuralViews(await load('calibration'));
    const rawCalibration = frozen.noD1ScoreFrames(calibrationTapes,model);
    const rawQuantile = frozen.noD1NearestRank95(
      [...rawCalibration.values()].flatMap(frames => frames.map(frame => frame.score)),
    );
    const baseModelSha = sha256(JSON.stringify(frozen.noD1SerializableModel(model,rawQuantile.threshold)));

    output.baseReproduction = {
      modelSha:{expected:BASE_MODEL_SHA,observed:baseModelSha,pass:baseModelSha === BASE_MODEL_SHA},
      threshold:{expected:BASE_THRESHOLD,observed:rawQuantile.threshold,pass:rawQuantile.threshold === BASE_THRESHOLD},
      train:{tapes:train.length,predictiveRows:rows.length},
      calibration:{tapes:calibrationTapes.length,rawScores:rawQuantile.count},
    };
    output.baseReproduction.pass =
      output.baseReproduction.modelSha.pass &&
      output.baseReproduction.threshold.pass &&
      train.length === 64 && rows.length === 30080 &&
      calibrationTapes.length === 64 && rawQuantile.count === 30080;

    if (!output.baseReproduction.pass) {
      output.outcome = PREFIX + 'IMPLEMENTATION_OR_PROVENANCE_INVALID';
      await writeEvidence(output);
      return;
    }

    const maxCalibration = maxComponentScoreFrames(calibrationTapes,model);
    const finiteMax = maxComponentFiniteScores(maxCalibration);
    const maxQuantile = frozen.noD1NearestRank95(finiteMax);
    const tauMax = maxQuantile.threshold;
    const calibrationPass =
      calibrationTapes.length === 64 &&
      maxQuantile.count >= 20000 &&
      Number.isFinite(tauMax) &&
      tauMax > 0;

    const repairContract = maxComponentSerializableContract(baseModelSha,tauMax);
    const repairModelSha = sha256(JSON.stringify(repairContract));
    output.repairModel = {
      sha256:repairModelSha,
      baseModelSha,
      score:repairContract.score,
      componentCount:MAX_COMPONENT_COUNT,
      thresholdQuantile:MAX_COMPONENT_Q,
      threshold:tauMax,
      refractory:MAX_COMPONENT_REFRACTORY,
    };
    output.calibration = {
      tapes:calibrationTapes.length,
      finiteScores:maxQuantile.count,
      thresholdQuantile:MAX_COMPONENT_Q,
      threshold:tauMax,
      pass:calibrationPass,
    };

    if (!calibrationPass) {
      output.outcome = PREFIX + 'INSUFFICIENT_SUPPORT';
      await writeEvidence(output);
      return;
    }

    const E = await load('prospective_e');
    const F = await load('prospective_f');
    const scoreE = maxComponentScoreFrames(frozen.noD1NeuralViews(E),model);
    const scoreF = maxComponentScoreFrames(frozen.noD1NeuralViews(F),model);
    const eventE = frozen.noD1Eventize(scoreE,tauMax);
    const eventF = frozen.noD1Eventize(scoreF,tauMax);

    output.freeze = {
      baseModelReproduced:true,
      maxScoreFrozen:true,
      maxThresholdFrozen:true,
      eventizerFrozen:true,
      repairModelSha,
    };

    frozen.allowFrozenEvaluation(baseModelSha,rawQuantile.threshold);
    const metricsE = frozen.noD1Evaluate(E,eventE);
    const metricsF = frozen.noD1Evaluate(F,eventF);
    const supportE = frozen.noD1ProspectiveSupport(metricsE);
    const supportF = frozen.noD1ProspectiveSupport(metricsF);
    const gatesE = metricGates(metricsE);
    const gatesF = metricGates(metricsF);
    const passE = Object.values(gatesE).every(gate => gate.pass);
    const passF = Object.values(gatesF).every(gate => gate.pass);

    output.prospective = {
      E:{metrics:metricsE,support:supportE,gates:gatesE,pass:passE},
      F:{metrics:metricsF,support:supportF,gates:gatesF,pass:passF},
    };
    output.support = {E:supportE,F:supportF,pass:supportE.pass && supportF.pass};

    if (!output.support.pass) {
      output.outcome = PREFIX + 'INSUFFICIENT_SUPPORT';
      await writeEvidence(output);
      return;
    }

    const demonstrated = passE && passF;
    output.deployabilityCandidate = demonstrated;
    output.diagnosticStackDeployable = demonstrated;
    output.deployment = demonstrated ? 'CANDIDATE_ONLY_NOT_DEPLOYED' : 'BLOCKED';
    output.outcome = PREFIX +
      'NEURAL_ONLY_MAX_COMPONENT_SURPRISE32_EVENT_STREAM_' +
      (demonstrated ? 'DEMONSTRATED' : 'NOT_DEMONSTRATED');
    await writeEvidence(output);
  } catch (error) {
    output.outcome = PREFIX + 'IMPLEMENTATION_OR_PROVENANCE_INVALID';
    output.error = {message:String(error.message),classification:'IMPLEMENTATION_OR_PROVENANCE',runtime:process.version};
    await writeEvidence(output);
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => {console.error(error);process.exitCode=1;});
}
