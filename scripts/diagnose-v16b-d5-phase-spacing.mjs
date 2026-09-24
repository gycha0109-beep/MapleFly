#!/usr/bin/env node
import{createHash}from"node:crypto";import{mkdir,readFile,writeFile}from"node:fs/promises";import{resolve}from"node:path";
import{SOURCE,ConnectomeBrain,cells,cellsWithPrefix,loadConnectome}from"../src/headless/connectome-runtime.mjs";import"../src/brain/fly-skill-v15-potion.js";
const A=globalThis.MapleFlyPotionSkillV15,K=A.loadState(),SET=26,BASE=26,F=5,NF=48,DN=1316,IMP=.7,PULSE=6,TASTE=.8,START=[25,55,85,115,145,175],ANCHOR=175;
const SRC_SHA="062f5d8e222ba188f173bec96fc2a8210910938b074fb45f4708fa0f45611528",MIN_N=20,REAL_MAX=.30,CANON_MIN=.60,RESCUE=.20;
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
function validEvents(x){return x.every(e=>Number.isInteger(e.onset)&&e.onset>=0&&e.onset<=239)}
function conditionSummary(rows,key){const a=rows.map(x=>x[key]);return{n:a.length,drinkRate:mean(a.map(x=>+(x.action==="DRINK"))),qWait:stats(a.map(x=>x.qWait)),meanQDrink:mean(a.map(x=>x.qDrink)),meanQMargin:mean(a.map(x=>x.qMargin))}}
async function runArm(C,sl,map,windows,kind){const rows=[];let done=0;for(const w of windows){const real=w.real,canon=w.canon,canonical=canon.map((onset,i)=>({onset,side:real[i].side}));let transformed;
if(kind==="phase"){const delta=ANCHOR-real.at(-1).onset;transformed=real.map(e=>({onset:e.onset+delta,side:e.side}))}
else{const cLast=canon.at(-1),rLast=real.at(-1).onset;transformed=canon.map((c,i)=>({onset:rLast+(c-cLast),side:real[i].side}))}
if(!validEvents(transformed))throw Error(kind+" eligibility drift");
const realQ=await replay(C,sl,map,w.brainSeed,real),transformedQ=await replay(C,sl,map,w.brainSeed,transformed),canonicalQ=await replay(C,sl,map,w.brainSeed,canonical);
rows.push({...w,transformed,realQ,transformedQ,canonicalQ});done++;if(done%10===0)console.log("[v16B-D5] "+kind+" "+done+"/"+windows.length);await new Promise(r=>setImmediate(r))}
return rows}
async function main(){
if(K.status!=="V15D_DEPLOYED"||!K.deploymentAllowed||K.representationSha256!=="33fc31f636e1cde215841dd33b0a93b24d4571cdabd32e9a1edc8fa2e696c847"||K.policySha256!=="47088bcb15ed2cd96f64d67a20169934bd7a866dcd56bacffea70b1f42537a59")throw Error("v15D provenance mismatch");
const raw=await readFile(resolve(process.env.V16B_SOURCE_FILE??".cache/v16b-authoritative/v16b_ecology.json")),hash=createHash("sha256").update(raw).digest("hex");if(hash!==SRC_SHA)throw Error("source hash mismatch");const src=JSON.parse(raw);if(src.outcome!=="V16B_CONTINUOUS_ECOLOGY_FAIL"||src.rows?.length!==24)throw Error("source contract mismatch");
const base=baseWindows(src);if(base.length!==67)throw Error("support mismatch "+base.length);
const phase=base.filter(w=>{const d=ANCHOR-w.real.at(-1).onset;return validEvents(w.real.map(e=>({onset:e.onset+d,side:e.side})))});
const spacing=base.filter(w=>{const cl=w.canon.at(-1),rl=w.real.at(-1).onset;return validEvents(w.canon.map((c,i)=>({onset:rl+(c-cl),side:w.real[i].side})))});
const first=base.map(w=>w.real[0].onset),last=base.map(w=>w.real.at(-1).onset),span=base.map(w=>w.real.at(-1).onset-w.real[0].onset),gaps=base.flatMap(w=>w.real.slice(1).map((e,i)=>e.onset-w.real[i].onset));
console.log("[v16B-D5] base=67 phaseEligible="+phase.length+" spacingEligible="+spacing.length+" lastMean="+mean(last).toFixed(2)+" spanMean="+mean(span).toFixed(2));
const C=await loadConnectome({cacheDir:resolve(".cache/maplefly-connectome"),onProgress:m=>console.log("[connectome] "+m)});
for(const side of["L","R"]){const g=cellsWithPrefix(C.meta,"LgLG",side),ex=side==="L"?331:338;if(g.length!==ex)throw Error("LgLG mismatch");C.inputGroups.set("LgLG_"+side,g);const t=cells(C.meta,["LB3","claw_tpGRN"],side);if(!t.length)throw Error("taste missing");C.inputGroups.set("taste_"+side,t)}
const sl=slots(C.meta),map=new Map(K.runtimeDnIndices.map((d,i)=>[d,i]));
const pr=await runArm(C,sl,map,phase,"phase"),sr=await runArm(C,sl,map,spacing,"spacing");
const PS={real:conditionSummary(pr,"realQ"),phase175:conditionSummary(pr,"transformedQ"),canonical:conditionSummary(pr,"canonicalQ")},SS={real:conditionSummary(sr,"realQ"),canonicalGaps:conditionSummary(sr,"transformedQ"),canonical:conditionSummary(sr,"canonicalQ")};
const pv=phase.length>=MIN_N&&PS.real.drinkRate<=REAL_MAX&&PS.canonical.drinkRate>=CANON_MIN,sv=spacing.length>=MIN_N&&SS.real.drinkRate<=REAL_MAX&&SS.canonical.drinkRate>=CANON_MIN,valid=pv&&sv;
const phaseRescue=PS.phase175.drinkRate-PS.real.drinkRate,spacingRescue=SS.canonicalGaps.drinkRate-SS.real.drinkRate,phaseSensitive=valid&&phaseRescue>=RESCUE,spacingSensitive=valid&&spacingRescue>=RESCUE;
let outcome=!valid?"V16B_D5_CONTROL_FAILURE":phaseSensitive&&!spacingSensitive?"V16B_D5_PHASE_RECENCY_DOMINANT":!phaseSensitive&&spacingSensitive?"V16B_D5_SPACING_DOMINANT":phaseSensitive&&spacingSensitive?"V16B_D5_PHASE_AND_SPACING":"V16B_D5_HIGHER_ORDER_TIMING_STRUCTURE";
console.log("[v16B-D5] PHASE N="+phase.length+" real="+(PS.real.drinkRate*100).toFixed(1)+"% phase175="+(PS.phase175.drinkRate*100).toFixed(1)+"% canonical="+(PS.canonical.drinkRate*100).toFixed(1)+"% rescue="+(phaseRescue*100).toFixed(1)+"pp valid="+pv);
console.log("[v16B-D5] SPACING N="+spacing.length+" real="+(SS.real.drinkRate*100).toFixed(1)+"% canonicalGaps="+(SS.canonicalGaps.drinkRate*100).toFixed(1)+"% canonical="+(SS.canonical.drinkRate*100).toFixed(1)+"% rescue="+(spacingRescue*100).toFixed(1)+"pp valid="+sv);
console.log("[v16B-D5] outcome="+outcome);
const audit={firstOnset:stats(first),latestOnset:stats(last),span:stats(span),interContactGap:stats(gaps),phaseEligibleN:phase.length,spacingEligibleN:spacing.length};
const compact=r=>r.map(x=>({brainSeed:x.brainSeed,decisionIndex:x.decisionIndex,real:x.real,canonicalOnsets:x.canon,transformed:x.transformed,realQ:x.realQ,transformedQ:x.transformedQ,canonicalQ:x.canonicalQ}));
const out={schema:"maplefly.v16b-d5.phase-vs-spacing.1",brainRepository:SOURCE.repository,brainCommit:SOURCE.commit,preregistration:{path:"history/prereg_v16b_d5.md",commit:"4b02bd3b77d51f8350b339dcb8a157d42b49c691"},source:{runId:35944188466,jsonSha256:hash,supportWindows:base.length},frozenPotion:{representationSha256:K.representationSha256,policySha256:K.policySha256,learning:false},gate:{eligibleNMin:MIN_N,realDrinkRateMax:REAL_MAX,canonicalDrinkRateMin:CANON_MIN,rescueMin:RESCUE,phaseAnchor:ANCHOR},audit,phase:{valid:pv,summary:PS,rescue:phaseRescue,rows:compact(pr)},spacing:{valid:sv,summary:SS,rescue:spacingRescue,rows:compact(sr)},classification:{valid,phaseSensitive,spacingSensitive},outcome};
const dir=resolve("results/v16b-d5-phase-spacing");await mkdir(dir,{recursive:true});await writeFile(resolve(dir,"v16b_d5_phase_spacing.json"),JSON.stringify(out,null,2)+"\n")}
main().catch(e=>{console.error(e);process.exitCode=1});
