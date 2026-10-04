#!/usr/bin/env node
import {createHash} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {loadOrBuildV15nTapePack} from './lib/v15n-tape-cache.mjs';
import * as frozen from './lib/neural-only-predictive-surprise32-frozen.mjs';
import {
  MULTILAG_RISE_LAGS,
  MULTILAG_RISE_Q,
  MULTILAG_RISE_REFRACTORY,
  multilagRiseScores,
  multilagRiseFiniteScores,
  multilagRiseSerializableContract,
} from './lib/neural-only-predictive-surprise32-multilag-rise.mjs';

const PHASE = 'v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1';
const PREFIX = PHASE.toUpperCase() + '_';
const OUTPUT_DIR = 'results/neural-only-predictive-surprise32-multilag-rise';
const BASE_MODEL_SHA = 'de8cc3c24cbb91a3a9a806aa2afe37ecd0294c0d2c4b5ce2d4a93c25d77a1cde';
const BASE_THRESHOLD = 1.574078960908224;
const ATTRIBUTION_EVIDENCE_SHA = '5952740e8403843872e370a94cc8d4d45699b2f5df77e54f14665b6b36c8a4f3';
const ATTRIBUTION_AXIS = 'NO_LOCAL_THRESHOLD_DOMINANT';
const COHORT_PATH = 'science/cohorts/neural-only-predictive-surprise32-multilag-rise-v4.json';
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

async function writeEvidence(output) {
  await mkdir(OUTPUT_DIR, {recursive:true});
  const path = resolve(OUTPUT_DIR, PHASE + '.json');
  await writeFile(path, JSON.stringify(output, null, 2) + '\n');
  console.log('[multilag-rise] outcome=' + output.outcome);
  console.log('[multilag-rise] evidence=' + path);
}

function metricGates(metrics) {
  return {
    precision:{value:metrics.precision, threshold:0.75, pass:metrics.precision >= 0.75},
    recall:{value:metrics.recall, threshold:0.75, pass:metrics.recall >= 0.75},
    f1:{value:metrics.f1, threshold:0.75, pass:metrics.f1 >= 0.75},
    eventCountRatio:{value:metrics.eventCountRatio, min:0.80, max:1.20,
      pass:metrics.eventCountRatio >= 0.80 && metrics.eventCountRatio <= 1.20},
    meanAbsolutePerTapeCountError:{value:metrics.meanAbsolutePerTapeCountError, max:5.0,
      pass:metrics.meanAbsolutePerTapeCountError <= 5.0},
  };
}

async function main() {
  const output = {
    schema:'maplefly.neural-only-predictive-surprise32-multilag-rise.1',
    preregistration:{
      path:'history/prereg_' + PHASE + '.md',
      commit:'48ab3eabdf94c85f14f12c6f58122a96d7ee9643',
    },
    design:{commit:'e579dc9e232938e45ed455df39f279ece5817bfe'},
    prerequisite:{
      attributionRunId:37168311777,
      attributionArtifactId:11291943099,
      attributionArtifactDigest:'sha256:e3b3d06404ee4c6f5d8170979ae4c1b4746d07a2ad32d75247631fd8bf7f54ca',
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
      repairLagSearch:false,
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
      throw new Error('multilag-rise analysis requires read-only Tape Packs');
    }
    if (process.env.MAPLEFLY_SIMULATION_CONTRACT_ID !== 'v15n-deterministic-v4') {
      throw new Error('v4 simulation identity required');
    }

    const prerequisiteBytes = await readFile(process.env.SURPRISE32_ATTRIBUTION_ARTIFACT_FILE);
    if (sha256(prerequisiteBytes) !== ATTRIBUTION_EVIDENCE_SHA) {
      throw new Error('frozen attribution evidence SHA mismatch');
    }
    const prerequisite = JSON.parse(prerequisiteBytes);
    if (!prerequisite.outcome.endsWith('_NEURAL_ONLY_PREDICTIVE_SURPRISE32_FAILURE_ATTRIBUTED') ||
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
    const pca = frozen.d2d2FitPca(frozen.noD1SelectedInnovationRows(train, phase.means));
    const zTapes = frozen.noD1ZTapes(train, phase.means, pca);
    const zStats = frozen.noD1ZStats(zTapes);
    const rows = frozen.noD1PredictiveRows(zTapes, zStats);
    const predictor = frozen.noD1FitPredictor(rows);
    const residualStats = frozen.noD1ResidualStats(rows, predictor);
    const model = {phase, pca, zStats, predictor, residualStats};

    const calibrationTapes = frozen.noD1NeuralViews(await load('calibration'));
    frozen.noD1AssertViews(calibrationTapes);
    const rawCalibration = frozen.noD1ScoreFrames(calibrationTapes, model);
    const rawQuantile = frozen.noD1NearestRank95(
      [...rawCalibration.values()].flatMap(frames => frames.map(frame => frame.score)),
    );
    const baseModelSha = sha256(JSON.stringify(frozen.noD1SerializableModel(model, rawQuantile.threshold)));

    output.baseReproduction = {
      modelSha:{expected:BASE_MODEL_SHA, observed:baseModelSha, pass:baseModelSha === BASE_MODEL_SHA},
      threshold:{expected:BASE_THRESHOLD, observed:rawQuantile.threshold, pass:rawQuantile.threshold === BASE_THRESHOLD},
      train:{tapes:train.length, predictiveRows:rows.length},
      calibration:{tapes:calibrationTapes.length, rawScores:rawQuantile.count},
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

    const riseCalibration = multilagRiseScores(rawCalibration);
    const finiteRise = multilagRiseFiniteScores(riseCalibration);
    const riseQuantile = frozen.noD1NearestRank95(finiteRise);
    const tauRise = riseQuantile.threshold;
    const calibrationPass =
      calibrationTapes.length === 64 &&
      riseQuantile.count >= 20000 &&
      Number.isFinite(tauRise) &&
      tauRise > 0;

    const repairContract = multilagRiseSerializableContract(baseModelSha, tauRise);
    const repairModelSha = sha256(JSON.stringify(repairContract));
    output.repairModel = {
      sha256:repairModelSha,
      baseModelSha,
      formula:repairContract.formula,
      lags:[...MULTILAG_RISE_LAGS],
      thresholdQuantile:MULTILAG_RISE_Q,
      threshold:tauRise,
      refractory:MULTILAG_RISE_REFRACTORY,
    };
    output.calibration = {
      tapes:calibrationTapes.length,
      finiteScores:riseQuantile.count,
      thresholdQuantile:MULTILAG_RISE_Q,
      threshold:tauRise,
      pass:calibrationPass,
    };

    if (!calibrationPass) {
      output.outcome = PREFIX + 'INSUFFICIENT_SUPPORT';
      await writeEvidence(output);
      return;
    }

    const C = await load('prospective_c');
    const D = await load('prospective_d');

    const rawC = frozen.noD1ScoreFrames(frozen.noD1NeuralViews(C), model);
    const rawD = frozen.noD1ScoreFrames(frozen.noD1NeuralViews(D), model);
    const riseC = multilagRiseScores(rawC);
    const riseD = multilagRiseScores(rawD);
    const eventC = frozen.noD1Eventize(riseC, tauRise);
    const eventD = frozen.noD1Eventize(riseD, tauRise);

    output.freeze = {
      baseModelReproduced:true,
      riseScoreFrozen:true,
      riseThresholdFrozen:true,
      eventizerFrozen:true,
      repairModelSha,
    };

    frozen.allowFrozenEvaluation(baseModelSha, rawQuantile.threshold);
    const metricsC = frozen.noD1Evaluate(C, eventC);
    const metricsD = frozen.noD1Evaluate(D, eventD);
    const supportC = frozen.noD1ProspectiveSupport(metricsC);
    const supportD = frozen.noD1ProspectiveSupport(metricsD);
    const gatesC = metricGates(metricsC);
    const gatesD = metricGates(metricsD);
    const passC = Object.values(gatesC).every(gate => gate.pass);
    const passD = Object.values(gatesD).every(gate => gate.pass);

    output.prospective = {
      C:{metrics:metricsC, support:supportC, gates:gatesC, pass:passC},
      D:{metrics:metricsD, support:supportD, gates:gatesD, pass:passD},
    };
    output.support = {C:supportC, D:supportD, pass:supportC.pass && supportD.pass};

    if (!output.support.pass) {
      output.outcome = PREFIX + 'INSUFFICIENT_SUPPORT';
      await writeEvidence(output);
      return;
    }

    const demonstrated = passC && passD;
    output.deployabilityCandidate = demonstrated;
    output.diagnosticStackDeployable = demonstrated;
    output.deployment = demonstrated ? 'CANDIDATE_ONLY_NOT_DEPLOYED' : 'BLOCKED';
    output.outcome = PREFIX +
      'NEURAL_ONLY_PREDICTIVE_SURPRISE32_MULTILAG_RISE_EVENT_STREAM_' +
      (demonstrated ? 'DEMONSTRATED' : 'NOT_DEMONSTRATED');
    await writeEvidence(output);
  } catch (error) {
    output.outcome = PREFIX + 'IMPLEMENTATION_OR_PROVENANCE_INVALID';
    output.error = {
      message:String(error.message),
      classification:'IMPLEMENTATION_OR_PROVENANCE',
      runtime:process.version,
    };
    await writeEvidence(output);
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => {console.error(error); process.exitCode = 1;});
}
