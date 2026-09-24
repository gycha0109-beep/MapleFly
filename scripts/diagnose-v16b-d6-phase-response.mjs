#!/usr/bin/env node
import{createHash}from"node:crypto";import{mkdir,readFile,writeFile}from"node:fs/promises";import{resolve}from"node:path";
import{SOURCE,ConnectomeBrain,cells,cellsWithPrefix,loadConnectome}from"../src/headless/connectome-runtime.mjs";import"../src/brain/fly-skill-v15-potion.js";
const A=globalThis.MapleFlyPotionSkillV15,K=A.loadState(),SET=26,BASE=26,F=5,NF=48,DN=1316,IMP=.7,PULSE=6,TASTE=.8,START=[25,55,85,115,145,175],ANCHORS=[145,175,205];
const SRC_SHA="062f5d8e222ba188f173bec96fc2a8210910938b074fb45f4708fa0f45611528",MIN_N=20,REAL_MAX=.30,CANON_MIN=.60,D5_REPL=.15,MATERIAL=.15,SWEEP=.20;
const mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:0,stats=a=>({min:Math.min(...a),mean:mean(a),max:Math.max(...a)});
function rng(seed){let s=Math.trunc(seed)>>>0;return()=>{let t=(s+=0x6d2b79f5);t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}}
function stim(b,g,d){for(const[n,v]of Object.entries(d)){if(!v)continue;const x=g.get(n);if(x?.length)b.stimulate(x,v)}}
function slots(m){const x=cells(m,["descending_neuron","descending_neuron_tbc"]);if(x.length!==DN)throw Error("DN mismatch");const o=new Int16Array(m.n).fill(-1);x.forEach((n,i)=>o[n]=i);return o}
function collect(b,sl,c,map){for(let i=0;i<b.firedCount;i++){const d=sl[b.fired[i]],r=map.get(d);if(r!==undefined)c[r]++}}
const ground=()=>({SNta_L:.05,SNta_R:.05});
async function init(C,sl,map,seed){const b=new ConnectomeBrain(C.weights,C.meta.params,seed),rt=A.createRuntime();for(let s=0;s<SET;s++){stim(b,C.inputGroups,ground());b.step()}const bc=new Float64Array(K.runtimeDnIndices.length);for(let s=0;s<BASE;s++){stim(b,C.inputGroups,ground());b.step();collect(b,sl,bc,map)}A.setBaseline(rt,Float64Array.from(bc,x=>x/(BASE*.02)));return{b,rt}}
function canonicalOnsets(seed,index,n){const r=rng(seed+index*1000+500000),o=[...START];for(let i=o.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[o[i],o[j]]=[o[j],o[i]]}return o.slice(0,n).sort((a,b)=>a-b)}
function drive(local,events){const d=ground();for(const e of events)if(local>=e.onset&&local<e.onset+PULSE)d["LgLG_"+e.side]=IMP;return d}
async function replay(C,sl,map,seed,events){const state=await init(C,sl,map,seed);for(let f=0;f<NF;f++){const cc=new Float64Array(K.runtimeDnIndices.length);for(let l=0;l<F;l++){const local=f*F+l,d=drive(local,events);if(local>=NF*F-F){d.taste_L=TASTE;d.taste_R=TASTE}stim(state.b,C.inputGroups,d);state.b.step();collect(state.b,sl,cc,map)}A.pushFrame(state.rt,A.makeFrame(state.rt,cc,F))}const q=A.choose(state.rt,K);A.finishCycle(state.rt);if(!Number.isFinite(q.qWait)||!Number.isFinite(q.qDrink))throw Error("non-finite score");return{action:q.action,qWait:q.qWait,qDrink:q.qDrink,qMargin:q.qDrink-q.qWait}}
function baseWindows(src){const out=[];for(const row of src.rows)for(let i=0;i<row.potionEvents.length;i++){const p=row.potionEvents[i],start=p.step-239,end=p.step,causal=row.damageEvents.filter(e=>e.step>=start&&e.step<end).sort((a,b)=>a.step-b.step);if(causal.length!==2&&causal.length!==3)continue;const real=causal.map(e=>({onset:e.step+1-start,side:e.side})),canon=canonicalOnsets(row.seed,i+1,causal.length);out.push({brainSeed:row.seed,baseSeed:row.baseSeed,decisionIndex:i+1,decisionStep:end,real,canon})}return out}
function shift(real,anchor){const delta=anchor-real.at(-1).onset;return real.map(e=>({onset:e.onset+delta,side:e.side}))}
function validEvents(x){return x.every(e=>Number.isInteger(e.onset)&&e.onset>=0&&e.onset<=234)}
function summary(rows,key){const q=rows.map(x=>x[key]);return{n:q.length,drinkRate:mean(q.map(x=>+(x.action==="DRINK"))),qWait:stats(q.map(x=>x.qWait)),meanQDrink:mean(q.map(x=>x.qDrink)),meanQMargin:mean(q.map(x=>x.qMargin))}}
async function main(){
if(K.status!=="V15D_DEPLOYED"||!K.deploymentAllowed||K.representationSha256!=="33fc31f636e1cde215841dd33b0a93b24d4571cdabd32e9a1edc8fa2e696c847"||K.policySha256!=="47088bcb15ed2cd96f64d67a20169934bd7a866dcd56bacffea70b1f42537a59")throw Error("v15D provenance mismatch");
const raw=await readFile(resolve(process.env.V16B_SOURCE_FILE??".cache/v16b-authoritative/v16b_ecology.json")),hash=createHash("sha256").update(raw).digest("hex");if(hash!==SRC_SHA)throw Error("source hash mismatch");const src=JSON.parse(raw);if(src.outcome!=="V16B_CONTINUOUS_ECOLOGY_FAIL"||src.rows?.length!==24)throw Error("source contract mismatch");
const base=baseWindows(src);if(base.length!==67)throw Error("support mismatch "+base.length);
const common=base.filter(w=>ANCHORS.every(a=>validEvents(shift(w.real,a))));
console.log("[v16B-D6] base="+base.length+" common="+common.length);
const C=await loadConnectome({cacheDir:resolve(".cache/maplefly-connectome"),onProgress:m=>console.log("[connectome] "+m)});
for(const side of["L","R"]){const g=cellsWithPrefix(C.meta,"LgLG",side),ex=side==="L"?331:338;if(g.length!==ex)throw Error("LgLG mismatch");C.inputGroups.set("LgLG_"+side,g);const t=cells(C.meta,["LB3","claw_tpGRN"],side);if(!t.length)throw Error("taste missing");C.inputGroups.set("taste_"+side,t)}
const sl=slots(C.meta),map=new Map(K.runtimeDnIndices.map((d,i)=>[d,i])),rows=[];let done=0;
for(const w of common){const a145=shift(w.real,145),a175=shift(w.real,175),a205=shift(w.real,205),canonical=w.canon.map((onset,i)=>({onset,side:w.real[i].side}));
const realQ=await replay(C,sl,map,w.brainSeed,w.real),q145=await replay(C,sl,map,w.brainSeed,a145),q175=await replay(C,sl,map,w.brainSeed,a175),q205=await replay(C,sl,map,w.brainSeed,a205),canonicalQ=await replay(C,sl,map,w.brainSeed,canonical);
rows.push({...w,a145,a175,a205,canonical,realQ,q145,q175,q205,canonicalQ});done++;if(done%10===0)console.log("[v16B-D6] "+done+"/"+common.length);await new Promise(r=>setImmediate(r))}
const S={real:summary(rows,"realQ"),a145:summary(rows,"q145"),a175:summary(rows,"q175"),a205:summary(rows,"q205"),canonical:summary(rows,"canonicalQ")};
const d5Replication=S.a175.drinkRate-S.real.drinkRate,valid=common.length>=MIN_N&&S.real.drinkRate<=REAL_MAX&&S.canonical.drinkRate>=CANON_MIN&&d5Replication>=D5_REPL;
const earlyToTrained=S.a175.drinkRate-S.a145.drinkRate,trainedToLate=S.a205.drinkRate-S.a175.drinkRate,fullSweep=S.a205.drinkRate-S.a145.drinkRate;
const recencyGradient=valid&&S.a145.drinkRate<=S.a175.drinkRate&&S.a175.drinkRate<=S.a205.drinkRate&&fullSweep>=SWEEP;
const trainedPhasePeak=valid&&(S.a175.drinkRate-S.a145.drinkRate)>=MATERIAL&&(S.a175.drinkRate-S.a205.drinkRate)>=MATERIAL;
const latePhasePeak=valid&&trainedToLate>=MATERIAL&&fullSweep>=SWEEP;
let outcome=!valid?"V16B_D6_CONTROL_FAILURE":trainedPhasePeak?"V16B_D6_TRAINED_PHASE_PEAK":recencyGradient?"V16B_D6_RECENCY_GRADIENT":latePhasePeak?"V16B_D6_LATE_PHASE_PEAK":"V16B_D6_PHASE_RESPONSE_COMPLEX";
console.log("[v16B-D6] N="+common.length+" REAL="+(S.real.drinkRate*100).toFixed(1)+"% A145="+(S.a145.drinkRate*100).toFixed(1)+"% A175="+(S.a175.drinkRate*100).toFixed(1)+"% A205="+(S.a205.drinkRate*100).toFixed(1)+"% CANON="+(S.canonical.drinkRate*100).toFixed(1)+"%");
console.log("[v16B-D6] d5Replication="+(d5Replication*100).toFixed(1)+"pp earlyToTrained="+(earlyToTrained*100).toFixed(1)+"pp trainedToLate="+(trainedToLate*100).toFixed(1)+"pp fullSweep="+(fullSweep*100).toFixed(1)+"pp valid="+valid+" outcome="+outcome);
const compact=rows.map(x=>({brainSeed:x.brainSeed,decisionIndex:x.decisionIndex,real:x.real,a145:x.a145,a175:x.a175,a205:x.a205,canonical:x.canonical,realQ:x.realQ,q145:x.q145,q175:x.q175,q205:x.q205,canonicalQ:x.canonicalQ}));
const out={schema:"maplefly.v16b-d6.phase-response.1",brainRepository:SOURCE.repository,brainCommit:SOURCE.commit,preregistration:{path:"history/prereg_v16b_d6.md",commit:"7224037aea1137e9ca6f51c6c9e117edb02330fd"},source:{runId:35944188466,jsonSha256:hash,baseSupportWindows:base.length,commonWindows:common.length},frozenPotion:{representationSha256:K.representationSha256,policySha256:K.policySha256,learning:false},gate:{commonNMin:MIN_N,realDrinkRateMax:REAL_MAX,canonicalDrinkRateMin:CANON_MIN,d5ReplicationMin:D5_REPL,materialStepMin:MATERIAL,fullSweepMin:SWEEP,anchors:ANCHORS},summary:S,effects:{d5Replication,earlyToTrained,trainedToLate,fullSweep,canonicalGap145:S.canonical.drinkRate-S.a145.drinkRate,canonicalGap175:S.canonical.drinkRate-S.a175.drinkRate,canonicalGap205:S.canonical.drinkRate-S.a205.drinkRate},classification:{valid,recencyGradient,trainedPhasePeak,latePhasePeak},outcome,rows:compact};
const dir=resolve("results/v16b-d6-phase-response");await mkdir(dir,{recursive:true});await writeFile(resolve(dir,"v16b_d6_phase_response.json"),JSON.stringify(out,null,2)+"\n")}
main().catch(e=>{console.error(e);process.exitCode=1});
