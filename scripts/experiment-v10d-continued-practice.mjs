#!/usr/bin/env node
import{mkdir,writeFile}from"node:fs/promises";import{resolve}from"node:path";import{SOURCE,ConnectomeBrain,cells,loadConnectome}from"../src/headless/connectome-runtime.mjs";import"../src/brain/fly-skill-v7.js";import"../src/brain/fly-skill-v10-attack.js";
const DT=.02,MS=26,AS=5,SET=26,BASE=26,W=1000,PW=34,PH=46,PY=530-PH,TW=56,TH=62,SPD=280,RNG=76,DISTS=[170,270,360,470],CONDS=["MOVEMENT_ONLY","FULL","NEURAL_OFF","DN_SHUFFLED"];
const mApi=globalThis.MapleFlySkillV7,mSkill=mApi.BUNDLED_STATE,aApi=globalThis.MapleFlyAttackSkillV10,aSkill=aApi.BUNDLED_STATE;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:0,pct=v=>(v*100).toFixed(1)+"%";
function perm(n,seed){const a=Array.from({length:n},(_,i)=>i);let s=seed>>>0;const r=()=>{s+=0x6d2b79f5;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296};for(let i=n-1;i;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function args(a){const o={runs:3,eval:32,seed:41000,max:4.5,out:"results/experiment-v10c-deploy",cache:".cache/maplefly-connectome"};for(let i=0;i<a.length;i++){const k=a[i],v=a[i+1];if(k==="--runs"){o.runs=+v;i++;}else if(k==="--eval"){o.eval=+v;i++;}else if(k==="--seed"){o.seed=+v;i++;}else if(k==="--max-seconds"){o.max=+v;i++;}else if(k==="--out"){o.out=v;i++;}else if(k==="--cache"){o.cache=v;i++;}else throw Error("bad arg "+k)}if(!Number.isInteger(o.runs)||o.runs<1||!Number.isInteger(o.eval)||o.eval%8)throw Error("bad runs/eval");return o}
function sm(n,ids){const m=new Int32Array(n).fill(-1);ids.forEach((id,i)=>m[id]=i);return m}
function stim(b,g,d){for(const[n,v]of Object.entries(d)){const ids=g.get(n);if(v&&ids?.length)b.stimulate(ids,v)}}
function collect(b,s,o){for(let i=0;i<b.firedCount;i++){const x=s[b.fired[i]];if(x>=0)o[x]++}}
function rate(c,n){const s=n*DT;return Float64Array.from(c,v=>v/s)}
function raw(cur,base){const x=new Float64Array(cur.length);for(let i=0;i<x.length;i++)x[i]=clamp((cur[i]-base[i])/50,-1,1);return x}
class Enc{constructor(){this.last=null}enc(px,tx,on=true){const d={SNta_L:.05,SNta_R:.05};if(!on){this.last=null;return d}const dx=tx-(px+PW/2),side=dx<0?"L":"R",dist=Math.abs(dx),close=clamp(1-dist/620,0,1);let ap=0;if(Number.isFinite(this.last))ap=clamp((this.last-dist)/45,0,1);this.last=dist;d["LC10a_"+side]=clamp(.12+close*.68,0,.8);d["LPLC1_"+side]=clamp(close*.12+ap*.32,0,.55);d["LPLC2_"+side]=clamp(close*.24+ap*.38,0,.8);if(dist<175)d["LC4_"+side]=clamp(((175-dist)/175)*.72+ap*.18,0,.8);return d}}
function move(cur,base){const x=new Float64Array(mSkill.sparseFeatureCount);let n=0;for(let s=0;s<x.length;s++){const i=mSkill.featureIndices[s],v=(cur[i]-base[i])/50;x[s]=v;n+=v*v}n=Math.sqrt(n);if(n<1e-9)return"IDLE";for(let i=0;i<x.length;i++)x[i]/=n;return mApi.choose(x,mSkill).action}
function hit(px,tx,f){const ax=f>0?px+PW-2:px-RNG+2;return ax<tx+TW/2&&ax+RNG>tx-TW/2&&PY+4<530&&PY+PH-4>530-TH}
function sched(n,seed){const o=[],b=n/8;for(let k=0;k<b;k++){const bs=seed+k;DISTS.forEach((d,j)=>{for(const side of (k+j)%2?["R","L"]:["L","R"])o.push({brainSeed:bs,side,startDistance:d})})}return o}
const PRACTICE_SEEDS=[71000,81000,91000],PRACTICE_DISTANCES=[145,245,345,445],FINAL_SEEDS=[121000,131000,141000],FINAL_DISTANCES=[165,265,365,455],PRACTICE_EPISODES=64,FINAL_EPISODES=32,PROBE_RATE=.18,MAX_PROBES=8,THRESHOLD=.5,BATCH_PER_CLASS=16,LEARNING_RATE=.01,WEIGHT_ANCHOR=.10,BIAS_ANCHOR=.10,MAX_SECONDS=4.5,OUT="results/experiment-v10d",CACHE=".cache/maplefly-connectome";
function rng(seed){let s=seed>>>0;return()=>{s+=0x6d2b79f5;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}}
function schedD(n,seed,dists){const block=dists.length*2;if(n%block)throw Error("episodes must be divisible by "+block);const rows=[];for(let k=0;k<n/block;k++){const brainSeed=seed+k;dists.forEach((startDistance,j)=>{for(const side of (k+j)%2?["R","L"]:["L","R"])rows.push({brainSeed,side,startDistance})})}return rows}
function dot(a,b){let x=0;for(let i=0;i<a.length;i++)x+=a[i]*b[i];return x}
function sig(x){x=clamp(x,-30,30);return 1/(1+Math.exp(-x))}
class Clf{
  constructor(state){
    this.selected=Int32Array.from(state.selectedIndices);
    this.means=Float64Array.from(state.means);
    this.scales=Float64Array.from(state.scales);
    this.weights=Float64Array.from(state.weights);
    this.bias=state.bias;
    this.w0=Float64Array.from(state.weights);
    this.b0=state.bias;
  }
  transform(f){
    const z=new Float64Array(this.selected.length);
    for(let s=0;s<z.length;s++)z[s]=clamp((f[this.selected[s]]-this.means[s])/this.scales[s],-5,5);
    return z;
  }
  probabilityRaw(f,neural=true,p=null){
    if(!neural)return sig(this.bias);
    let score=this.bias;
    for(let s=0;s<this.weights.length;s++){
      const src=p?p[s]:s,dn=this.selected[src];
      const z=clamp((f[dn]-this.means[s])/this.scales[s],-5,5);
      score+=this.weights[s]*z;
    }
    return sig(score);
  }
  update(pos,neg,random){
    if(pos.length<BATCH_PER_CLASS||neg.length<BATCH_PER_CLASS)return false;
    const batch=[];
    for(let i=0;i<BATCH_PER_CLASS;i++)batch.push({x:pos[Math.floor(random()*pos.length)],y:1});
    for(let i=0;i<BATCH_PER_CLASS;i++)batch.push({x:neg[Math.floor(random()*neg.length)],y:0});
    const g=new Float64Array(this.weights.length);let gb=0;
    for(const s of batch){
      const p=sig(this.bias+dot(this.weights,s.x)),e=p-s.y;
      gb+=e;
      for(let j=0;j<g.length;j++)g[j]+=e*s.x[j];
    }
    const inv=1/batch.length;
    this.bias-=LEARNING_RATE*(gb*inv+BIAS_ANCHOR*(this.bias-this.b0));
    for(let j=0;j<this.weights.length;j++)this.weights[j]-=LEARNING_RATE*(g[j]*inv+WEIGHT_ANCHOR*(this.weights[j]-this.w0[j]));
    return true;
  }
  serialize(){return{selectedIndices:Array.from(this.selected),means:Array.from(this.means),scales:Array.from(this.scales),weights:Array.from(this.weights),bias:this.bias,attackThreshold:THRESHOLD}}
}
async function initEpisode(C,slots,n,e){
  const b=new ConnectomeBrain(C.weights,C.meta.params,e.brainSeed),en=new Enc,ctr=W/2;
  let px=ctr-PW/2,tx=ctr+(e.side==="L"?-e.startDistance:e.startDistance),face=e.side==="L"?-1:1;
  for(let i=0;i<SET;i++){stim(b,C.inputGroups,en.enc(px,tx,false));b.step()}
  const bc=new Float64Array(n);
  for(let i=0;i<BASE;i++){stim(b,C.inputGroups,en.enc(px,tx,false));b.step();collect(b,slots,bc)}
  en.last=null;
  return{b,en,px,tx,face,base:rate(bc,BASE),move:"IDLE"};
}
async function practiceEpisode(C,slots,n,e,random,clf){
  const s=await initEpisode(C,slots,n,e);let ac=new Float64Array(n),mc=new Float64Array(n),as=0,ms=0,probes=0,hits=0,whiffs=0,closest=Math.abs(s.tx-(s.px+PW/2));const samples=[];
  for(let step=0;step<Math.round(MAX_SECONDS/DT);step++){
    stim(s.b,C.inputGroups,s.en.enc(s.px,s.tx,true));s.b.step();collect(s.b,slots,ac);collect(s.b,slots,mc);
    const dir=s.move==="LEFT"?-1:s.move==="RIGHT"?1:0;if(dir)s.face=dir;s.px=clamp(s.px+dir*SPD*DT,0,W-PW);closest=Math.min(closest,Math.abs(s.tx-(s.px+PW/2)));as++;ms++;
    if(ms>=MS){s.move=move(rate(mc,ms),s.base);mc=new Float64Array(n);ms=0}
    if(as<AS)continue;
    const f=raw(rate(ac,as),s.base);ac=new Float64Array(n);as=0;
    if(probes<MAX_PROBES&&random()<PROBE_RATE){
      const h=hit(s.px,s.tx,s.face);samples.push({x:clf.transform(f),label:h?1:0});probes++;if(h)hits++;else whiffs++;
    }
    if(step>0&&step%1000===0)await new Promise(r=>setImmediate(r));
  }
  return{samples,probes,hits,whiffs,closestDistance:closest,movementReached:closest<=115};
}
async function traceEpisode(C,slots,n,e){
  const s=await initEpisode(C,slots,n,e);let ac=new Float64Array(n),mc=new Float64Array(n),as=0,ms=0,closest=Math.abs(s.tx-(s.px+PW/2));const decisions=[];
  for(let step=0;step<Math.round(MAX_SECONDS/DT);step++){
    stim(s.b,C.inputGroups,s.en.enc(s.px,s.tx,true));s.b.step();collect(s.b,slots,ac);collect(s.b,slots,mc);
    const dir=s.move==="LEFT"?-1:s.move==="RIGHT"?1:0;if(dir)s.face=dir;s.px=clamp(s.px+dir*SPD*DT,0,W-PW);const dist=Math.abs(s.tx-(s.px+PW/2));closest=Math.min(closest,dist);as++;ms++;
    if(ms>=MS){s.move=move(rate(mc,ms),s.base);mc=new Float64Array(n);ms=0}
    if(as<AS)continue;
    const f=raw(rate(ac,as),s.base);ac=new Float64Array(n);as=0;
    decisions.push({feature:f,playerX:s.px,targetX:s.tx,facing:s.face,time:(step+1)*DT,distance:dist,closestDistance:closest});
  }
  return{brainSeed:e.brainSeed,side:e.side,startDistance:e.startDistance,movementReached:closest<=115,decisions};
}
function scoreTrace(trace,clf,cond,p){
  if(cond==="MOVEMENT_ONLY")return{outcome:"TIMEOUT",movementReached:trace.movementReached,terminalTime:MAX_SECONDS,maxAttackProbability:0,brainSeed:trace.brainSeed,side:trace.side,startDistance:trace.startDistance};
  let maxP=0;
  for(const d of trace.decisions){
    const q=cond==="NEURAL_OFF"?clf.probabilityRaw(d.feature,false):clf.probabilityRaw(d.feature,true,cond==="DN_SHUFFLED"?p:null);
    maxP=Math.max(maxP,q);
    if(q>=THRESHOLD)return{outcome:hit(d.playerX,d.targetX,d.facing)?"HIT":"WHIFF",movementReached:d.closestDistance<=115,terminalTime:d.time,maxAttackProbability:maxP,brainSeed:trace.brainSeed,side:trace.side,startDistance:trace.startDistance};
  }
  return{outcome:"TIMEOUT",movementReached:trace.movementReached,terminalTime:MAX_SECONDS,maxAttackProbability:maxP,brainSeed:trace.brainSeed,side:trace.side,startDistance:trace.startDistance};
}
function summarize(rows){const n=rows.length,h=rows.filter(x=>x.outcome==="HIT").length,w=rows.filter(x=>x.outcome==="WHIFF").length,t=rows.filter(x=>x.outcome==="TIMEOUT").length;return{hitRate:h/n,whiffRate:w/n,timeoutRate:t/n,movementReachRate:mean(rows.map(x=>x.movementReached?1:0)),rows}}
async function evaluatePaired(C,slots,n,list,before,after,p){
  const movement=[],b={FULL:[],NEURAL_OFF:[],DN_SHUFFLED:[]},a={FULL:[],NEURAL_OFF:[],DN_SHUFFLED:[]};
  for(let i=0;i<list.length;i++){
    const trace=await traceEpisode(C,slots,n,list[i]);movement.push(scoreTrace(trace,before,"MOVEMENT_ONLY",p));
    for(const cond of ["FULL","NEURAL_OFF","DN_SHUFFLED"]){b[cond].push(scoreTrace(trace,before,cond,p));a[cond].push(scoreTrace(trace,after,cond,p))}
    if((i+1)%8===0){console.log("[paired-final] "+(i+1)+"/"+list.length+" BEFORE="+pct(summarize(b.FULL).hitRate)+" AFTER="+pct(summarize(a.FULL).hitRate));await new Promise(r=>setImmediate(r))}
  }
  return{MOVEMENT_ONLY:summarize(movement),BEFORE:{FULL:summarize(b.FULL),NEURAL_OFF:summarize(b.NEURAL_OFF),DN_SHUFFLED:summarize(b.DN_SHUFFLED)},AFTER:{FULL:summarize(a.FULL),NEURAL_OFF:summarize(a.NEURAL_OFF),DN_SHUFFLED:summarize(a.DN_SHUFFLED)}};
}
function summarizeVersion(runs,key){
  const mv=mean(runs.map(r=>r.MOVEMENT_ONLY.movementReachRate)),full=mean(runs.map(r=>r[key].FULL.hitRate)),off=mean(runs.map(r=>r[key].NEURAL_OFF.hitRate)),sh=mean(runs.map(r=>r[key].DN_SHUFFLED.hitRate)),wh=mean(runs.map(r=>r[key].FULL.whiffRate)),to=mean(runs.map(r=>r[key].FULL.timeoutRate));
  const gate=mv>=.85&&full>=.70&&full-off>=.25&&full-sh>=.20&&wh<=.30&&to<=.25&&runs.every(r=>r[key].FULL.hitRate>=.60);
  return{meanMovementReachRate:mv,meanFullHitRate:full,meanNeuralOffHitRate:off,neuralContribution:full-off,meanDnShuffledHitRate:sh,neuronIdentityContribution:full-sh,meanFullWhiffRate:wh,meanFullTimeoutRate:to,gate};
}
function weightDiagnostics(before,after){
  let sq=0,abs=0,mx=0,flips=0;const rows=[];
  for(let i=0;i<before.weights.length;i++){const d=after.weights[i]-before.weights[i],ad=Math.abs(d);sq+=d*d;abs+=ad;mx=Math.max(mx,ad);if(Math.sign(before.weights[i])!==Math.sign(after.weights[i])&&before.weights[i]!==0&&after.weights[i]!==0)flips++;rows.push({slot:i,dnIndex:before.selectedIndices[i],before:before.weights[i],after:after.weights[i],delta:d,absDelta:ad})}
  rows.sort((a,b)=>b.absDelta-a.absDelta);
  return{l2Delta:Math.sqrt(sq),biasDelta:after.bias-before.bias,signFlipCount:flips,meanAbsWeightDelta:abs/before.weights.length,maxAbsWeightDelta:mx,largestWeightChanges:rows.slice(0,12)};
}
async function main(){
  await mkdir(resolve(OUT),{recursive:true});
  const C=await loadConnectome({cacheDir:resolve(CACHE),onProgress:m=>console.log("[connectome] "+m)}),dn=cells(C.meta,["descending_neuron","descending_neuron_tbc"]);
  if(dn.length!==1316||aSkill.originalFeatureCount!==1316||aSkill.sparseFeatureCount!==128||aSkill.attackThreshold!==.5)throw Error("frozen v10C contract mismatch");
  const slots=sm(C.meta.n,dn),before=new Clf(aSkill),after=new Clf(aSkill),pos=[],neg=[],practice=[],updateRandom=rng(0xd00d2026);let updates=0;
  console.log("[v10D] frozen="+aSkill.version+" practice="+PRACTICE_SEEDS.join(",")+" final="+FINAL_SEEDS.join(","));
  for(let c=0;c<PRACTICE_SEEDS.length;c++){
    const random=rng(PRACTICE_SEEDS[c]^0xc0100c0a),list=schedD(PRACTICE_EPISODES,PRACTICE_SEEDS[c],PRACTICE_DISTANCES);let probes=0,hits=0,whiffs=0,reach=0,startUpdates=updates;
    for(let i=0;i<list.length;i++){
      const r=await practiceEpisode(C,slots,dn.length,list[i],random,after);probes+=r.probes;hits+=r.hits;whiffs+=r.whiffs;reach+=r.movementReached?1:0;
      for(const s of r.samples)(s.label?pos:neg).push(s.x);
      if(after.update(pos,neg,updateRandom))updates++;
      if((i+1)%8===0)console.log("[practice] cohort="+(c+1)+" "+(i+1)+"/"+list.length+" probes="+probes+" hit="+hits+" whiff="+whiffs+" updates="+updates);
    }
    practice.push({cohort:c+1,baseSeed:PRACTICE_SEEDS[c],distances:PRACTICE_DISTANCES,episodes:list.length,probes,hits,whiffs,movementReachRate:reach/list.length,updates:updates-startUpdates,cumulativeUpdates:updates,cumulativeHitPool:pos.length,cumulativeWhiffPool:neg.length});
  }
  const runs=[];
  for(let r=0;r<FINAL_SEEDS.length;r++){
    const list=schedD(FINAL_EPISODES,FINAL_SEEDS[r],FINAL_DISTANCES),p=perm(aSkill.sparseFeatureCount,FINAL_SEEDS[r]^0xd15ea5e),pairedEval=await evaluatePaired(C,slots,dn.length,list,before,after,p);
    runs.push({run:r+1,seed:FINAL_SEEDS[r],MOVEMENT_ONLY:pairedEval.MOVEMENT_ONLY,BEFORE:pairedEval.BEFORE,AFTER:pairedEval.AFTER});
    console.log("[final] run="+(r+1)+" BEFORE="+pct(pairedEval.BEFORE.FULL.hitRate)+" AFTER="+pct(pairedEval.AFTER.FULL.hitRate)+" OFF="+pct(pairedEval.AFTER.NEURAL_OFF.hitRate)+" SHUFFLED="+pct(pairedEval.AFTER.DN_SHUFFLED.hitRate));
  }
  const beforeSummary=summarizeVersion(runs,"BEFORE"),afterSummary=summarizeVersion(runs,"AFTER"),beforeState=before.serialize(),afterState=after.serialize(),weightChange=weightDiagnostics(beforeState,afterState);
  const comparison={fullHitDelta:afterSummary.meanFullHitRate-beforeSummary.meanFullHitRate,whiffDelta:afterSummary.meanFullWhiffRate-beforeSummary.meanFullWhiffRate,timeoutDelta:afterSummary.meanFullTimeoutRate-beforeSummary.meanFullTimeoutRate,neuronIdentityContributionDelta:afterSummary.neuronIdentityContribution-beforeSummary.neuronIdentityContribution};
  const meta={schema:"maplefly.experiment-v10d.continued-practice.1",phase:"D",brainRepository:SOURCE.repository,brainCommit:SOURCE.commit,sourceAttackSkillVersion:aSkill.version,practiceSeeds:PRACTICE_SEEDS,practiceDistances:PRACTICE_DISTANCES,practiceEpisodesPerCohort:PRACTICE_EPISODES,finalSeeds:FINAL_SEEDS,finalDistances:FINAL_DISTANCES,finalEpisodesPerConditionPerRun:FINAL_EPISODES,pairedEvaluation:"one full MaleCNS trajectory per final episode; BEFORE/AFTER/OFF/SHUFFLED scored on identical DN windows because ATTACK has no trajectory feedback in this headless gate",probeRate:PROBE_RATE,maxProbesPerEpisode:MAX_PROBES,batchPerClass:BATCH_PER_CLASS,learningRate:LEARNING_RATE,weightAnchor:WEIGHT_ANCHOR,biasAnchor:BIAS_ANCHOR,attackThreshold:THRESHOLD,leakageGuard:"learner never receives target distance, coordinates, attack range, hittable flag, cohort name or correct timing; only actual exploratory ATTACK HIT/WHIFF outcomes update the fixed v10C readout",gate:"movement>=85%; FULL>=70%; FULL-OFF>=25pp; FULL-SHUFFLED>=20pp; whiff<=30%; timeout<=25%; every FULL>=60%"};
  await writeFile(resolve(OUT,"experiment_v10d.json"),JSON.stringify({meta,practice,totalUpdates:updates,replayPool:{hits:pos.length,whiffs:neg.length},beforeCandidate:beforeState,afterCandidate:afterState,weightChange,comparison,beforeSummary,afterSummary,runs},null,2));
  console.log("V10D-BEFORE-GATE="+(beforeSummary.gate?"PASS":"FAIL")+" FULL="+pct(beforeSummary.meanFullHitRate)+" OFF="+pct(beforeSummary.meanNeuralOffHitRate)+" SHUFFLED="+pct(beforeSummary.meanDnShuffledHitRate)+" whiff="+pct(beforeSummary.meanFullWhiffRate)+" timeout="+pct(beforeSummary.meanFullTimeoutRate));
  console.log("V10D-AFTER-GATE="+(afterSummary.gate?"PASS":"FAIL")+" FULL="+pct(afterSummary.meanFullHitRate)+" OFF="+pct(afterSummary.meanNeuralOffHitRate)+" SHUFFLED="+pct(afterSummary.meanDnShuffledHitRate)+" whiff="+pct(afterSummary.meanFullWhiffRate)+" timeout="+pct(afterSummary.meanFullTimeoutRate));
  console.log("V10D-WEIGHT-DELTA="+JSON.stringify(weightChange));
  console.log("V10D-AFTER-CANDIDATE="+JSON.stringify(afterState));
}
main().catch(e=>{console.error(e);process.exitCode=1});
