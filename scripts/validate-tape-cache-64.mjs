#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  loadTapePack,
  tapePackKey,
} from "./lib/tape-pack-cache.mjs";

const cohortPath =
  process.env.MAPLEFLY_COHORT_SET ??
  "science/cohorts/tape-cache-validation-64.json";
const simulationPath =
  process.env.MAPLEFLY_SIMULATION_CONTRACT ??
  "science/simulations/v15n-deterministic-v3.json";

const cohortSet=JSON.parse(await readFile(cohortPath,"utf8"));
const simulation=JSON.parse(await readFile(simulationPath,"utf8"));
const [name,cohort]=Object.entries(cohortSet.cohorts)[0];

const identity={
  simulationContract:simulation.id,
  connectomeCommit:simulation.connectome.commit,
  cohortName:cohort.cache_name,
  baseSeeds:cohort.base_seeds,
  interruptionSeed:cohort.interruption_seed,
};

const cacheDir=process.env.MAPLEFLY_TAPE_CACHE_DIR ?? ".cache/maplefly-tapes";
const started=Date.now();
const loaded=await loadTapePack({cacheDir,identity});
const loadMs=Date.now()-started;

if(!loaded) throw new Error("테이프 캐시가 없습니다");
if(loaded.tapes.length!==64) {
  throw new Error("테이프 수 불일치 "+loaded.tapes.length);
}
for(const tape of loaded.tapes){
  if(tape.liveSteps!==2400 || tape.potionEvents?.length!==10){
    throw new Error("테이프 계약 불일치 seed="+tape.seed);
  }
}

const result={
  schema:"maplefly.tape-cache-validation.v1",
  cohort:name,
  cacheKey:tapePackKey(identity),
  tapeCount:loaded.tapes.length,
  cacheLoadMilliseconds:loadMs,
  pass:true,
};

const out=resolve("results/tape-cache-validation");
await mkdir(out,{recursive:true});
await writeFile(resolve(out,"result.json"),JSON.stringify(result,null,2)+"\n");
console.log(JSON.stringify(result));
