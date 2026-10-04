#!/usr/bin/env node
import {createHash} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {loadOrBuildV15nTapePack} from './lib/v15n-tape-cache.mjs';
import * as frozen from './lib/neural-only-predictive-surprise32-frozen.mjs';
import {attributeCohort, attributionAxis, consistency} from './lib/neural-only-predictive-surprise32-attribution.mjs';

const PHASE = 'v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1';
const PREFIX = PHASE.toUpperCase() + '_NEURAL_ONLY_PREDICTIVE_SURPRISE32_';
const OUTPUT_DIR = 'results/neural-only-predictive-surprise32-failure-attribution';
const MODEL_SHA = 'de8cc3c24cbb91a3a9a806aa2afe37ecd0294c0d2c4b5ce2d4a93c25d77a1cde';
const THRESHOLD = 1.574078960908224;
const EVIDENCE_SHA = '78549dfb7514c4d3732ca9e4f6239ad6b1bc88162cf10312b661494b1bbc9546';
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const METRICS = ['tapes', 'physicalImpacts', 'neuralEvents', 'matched', 'falseEvents',
  'missedImpacts', 'precision', 'recall', 'f1', 'eventCountRatio', 'meanAbsolutePerTapeCountError'];

export function exactMetricReproduction(actual, expected) {
  return Object.fromEntries(METRICS.map(key => [key, {
    expected: expected[key], observed: actual[key], pass: actual[key] === expected[key],
  }]));
}

async function writeEvidence(output) {
  await mkdir(OUTPUT_DIR, {recursive:true});
  const path = resolve(OUTPUT_DIR, PHASE + '.json');
  await writeFile(path, JSON.stringify(output, null, 2) + '\n');
  console.log('[attribution] outcome=' + output.outcome + ' axis=' + output.attributionAxis);
  console.log('[attribution] evidence=' + path);
}

async function main() {
  const output = {
    schema:'maplefly.neural-only-predictive-surprise32-failure-attribution.1',
    preregistration:{path:'history/prereg_' + PHASE + '.md', commit:'68f34facc1ee456c7b91fe649b57e893258cabea'},
    design:{commit:'063a1f6be925ee7145961306503543e28b133131'},
    prerequisite:{runId:37081864923, jobId:111083917653, headSha:'c36f5d71be49336369adef19c892565d2b3e94cf',
      artifactId:11261347073, artifactDigest:'sha256:9a1b598b06faa99568f902794ddaf9042d7d2ca5dcf5224a4b17792e4659c3cc', evidenceSha256:EVIDENCE_SHA},
    reproduction:{pass:false}, support:{pass:false}, attributionAxis:null, attribution:null,
    provenance:{strippedNeuralViews:true, preFreezeTruthAccess:false, thresholdSelectionUsesTruth:false,
      teacherUsed:false, supervisedReadoutUsed:false, physicalTruthEvaluatorOnly:true,
      attributionCohortsUsedForFitting:false, attributionCohortsUsedForGeneralization:false,
      thresholdQuantileChanged:false, thresholdSearchedAfterProspective:false,
      modelRefitAfterProspective:false, tapeBuildAllowed:false, simulationContextInitialized:false},
    diagnosticStackDeployable:false, deployabilityCandidate:false, deployment:'BLOCKED',
    deployedPotion:'v15D', v15n:'CLOSED / BLOCKED', v16c:'BLOCKED',
  };
  try {
    if (process.env.MAPLEFLY_TAPE_BUILD_ALLOWED !== 'false') throw new Error('attribution requires read-only Tape Packs');
    const cohortPath = 'science/cohorts/neural-only-predictive-surprise32-v4.json';
    if (process.env.MAPLEFLY_SIMULATION_CONTRACT_ID !== 'v15n-deterministic-v4') throw new Error('v4 simulation identity required');
    const prerequisiteBytes = await readFile(process.env.SURPRISE32_FAILURE_ARTIFACT_FILE);
    if (sha256(prerequisiteBytes) !== EVIDENCE_SHA) throw new Error('frozen prerequisite evidence SHA mismatch');
    const prerequisite = JSON.parse(prerequisiteBytes);
    if (!prerequisite.outcome.endsWith('_EVENT_STREAM_NOT_DEMONSTRATED') || !prerequisite.support.pass ||
        prerequisite.neuralOnlyModel.sha256 !== MODEL_SHA || prerequisite.neuralOnlyModel.threshold !== THRESHOLD) {
      throw new Error('frozen prerequisite contract mismatch');
    }
    const setBytes = await readFile(cohortPath);
    const set = JSON.parse(setBytes);
    output.tapeProvenance = {cohortSet:cohortPath, cohortSetSha256:sha256(setBytes),
      simulationContract:set.simulation_contract, packs:{}};
    async function load(name) {
      const cohort = set.cohorts[name];
      const pack = await loadOrBuildV15nTapePack({cohortName:cohort.cache_name,
        baseSeeds:cohort.base_seeds, interruptionSeed:cohort.interruption_seed,
        allowBuild:false, build:async () => {throw new Error('analysis must never simulate');},
        validate:rows => {
          if (rows.length !== 64 || new Set(rows.map(row => row.seed)).size !== 64 ||
              rows.some(row => row.liveSteps !== 2400 || row.potionEvents.length !== 10)) {
            throw new Error('frozen tape count/shape mismatch: ' + name);
          }
        }});
      output.tapeProvenance.packs[name] = {key:pack.key, cacheHit:pack.cacheHit,
        compressedSha256:sha256(await readFile(pack.path)), tapes:pack.tapes.length};
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
    const calibration = frozen.noD1NeuralViews(await load('calibration'));
    const calScores = frozen.noD1ScoreFrames(calibration, model);
    const quantile = frozen.noD1NearestRank95([...calScores.values()].flatMap(frames => frames.map(f => f.score)));
    const threshold = quantile.threshold;
    const modelSha = sha256(JSON.stringify(frozen.noD1SerializableModel(model, threshold)));
    output.neuralOnlyModel = {...prerequisite.neuralOnlyModel, sha256:modelSha, threshold};
    output.reproduction.model = {expected:MODEL_SHA, observed:modelSha, pass:modelSha === MODEL_SHA};
    output.reproduction.threshold = {expected:THRESHOLD, observed:threshold, pass:threshold === THRESHOLD};
    output.reproduction.training = {tapes:train.length, predictiveRows:rows.length,
      calibrationTapes:calibration.length, calibrationScores:quantile.count,
      pass:train.length === 64 && rows.length === 30080 && calibration.length === 64 && quantile.count === 30080};
    if (!output.reproduction.model.pass || !output.reproduction.threshold.pass || !output.reproduction.training.pass) {
      output.outcome = PREFIX + 'ATTRIBUTION_IMPLEMENTATION_OR_PROVENANCE_INVALID';
      await writeEvidence(output); return;
    }
    const A = await load('prospective_a'), B = await load('prospective_b');
    // Both event streams are generated using stripped neural views before evaluator truth is accessed.
    const scoreA = frozen.noD1ScoreFrames(frozen.noD1NeuralViews(A), model);
    const scoreB = frozen.noD1ScoreFrames(frozen.noD1NeuralViews(B), model);
    const eventA = frozen.noD1Eventize(scoreA, threshold), eventB = frozen.noD1Eventize(scoreB, threshold);
    frozen.allowFrozenEvaluation(modelSha, threshold);
    const metricsA = frozen.noD1Evaluate(A, eventA), metricsB = frozen.noD1Evaluate(B, eventB);
    output.reproduction.A = exactMetricReproduction(metricsA, prerequisite.prospective.A);
    output.reproduction.B = exactMetricReproduction(metricsB, prerequisite.prospective.B);
    output.reproduction.pass = [output.reproduction.A, output.reproduction.B].every(
      checks => Object.values(checks).every(check => check.pass));
    output.reproducedMetrics = {A:metricsA, B:metricsB};
    if (!output.reproduction.pass) {
      output.outcome = PREFIX + 'ATTRIBUTION_IMPLEMENTATION_OR_PROVENANCE_INVALID';
      await writeEvidence(output); return;
    }
    const boundaryRule = process.env.SURPRISE32_NEAREST_EVENT_BUCKET_RULE ?? 'UNRESOLVED';
    const attrA = attributeCohort(A, scoreA, eventA, threshold, boundaryRule);
    const attrB = attributeCohort(B, scoreB, eventB, threshold, boundaryRule);
    function support(metrics, attr) {
      return {tapes:metrics.tapes, physicalImpacts:metrics.physicalImpacts, neuralEvents:metrics.neuralEvents,
        falseEvents:metrics.falseEvents, missedImpacts:metrics.missedImpacts,
        finitePeakFraction:attr.localPeakTiming.finitePeakFraction,
        pass:metrics.tapes === 64 && metrics.physicalImpacts >= 1000 && metrics.neuralEvents >= 500 &&
          metrics.falseEvents >= 1000 && metrics.missedImpacts >= 1000 && attr.localPeakTiming.finitePeakFraction >= .99};
    }
    output.support = {A:support(metricsA, attrA), B:support(metricsB, attrB)};
    output.support.pass = output.support.A.pass && output.support.B.pass;
    output.analysisConventions = {nearestEventSearch:'inclusive +/-20 steps; earlier step on exact distance ties',
      nearestEventBucketRule:boundaryRule, peakTie:'earliest step',
      surpriseDistributionSampling:'unique finite score frames per segment per tape; no interpolation'};
    if (!output.support.pass) {
      output.outcome = PREFIX + 'INSUFFICIENT_ATTRIBUTION_SUPPORT';
      await writeEvidence(output); return;
    }
    output.attribution = {A:attrA, B:attrB};
    output.consistency = consistency(attrA, attrB);
    output.attributionAxis = attributionAxis(attrA, attrB);
    output.outcome = PREFIX + 'FAILURE_ATTRIBUTED';
    await writeEvidence(output);
  } catch (error) {
    output.attribution = null; output.attributionAxis = null;
    output.outcome = PREFIX + 'ATTRIBUTION_IMPLEMENTATION_OR_PROVENANCE_INVALID';
    output.error = {message:String(error.message), classification:'IMPLEMENTATION_OR_PROVENANCE',
      runtime:process.version, stage:'reproduction-or-attribution'};
    await writeEvidence(output);
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => {console.error(error); process.exitCode = 1;});
}
