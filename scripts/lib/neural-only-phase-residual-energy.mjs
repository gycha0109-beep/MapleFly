export const PHASE_RESIDUAL_PHASES = 48;
export const PHASE_RESIDUAL_DN_COUNT = 1316;
export const PHASE_RESIDUAL_SCALE_FLOOR = 1e-6;
export const PHASE_RESIDUAL_Q = 0.95;
export const PHASE_RESIDUAL_REFRACTORY = 10;
export const PHASE_RESIDUAL_CONTRACT = 'NEURAL_ONLY_PHASE_RESIDUAL_ENERGY';

export function fitPhaseResidualScales(views, phaseMeans) {
  const sums=Array.from({length:PHASE_RESIDUAL_PHASES},()=>new Float64Array(PHASE_RESIDUAL_DN_COUNT));
  const counts=new Int32Array(PHASE_RESIDUAL_PHASES);
  for(const tape of views){
    for(const frame of tape.frames){
      const phase=frame.frameIndex%PHASE_RESIDUAL_PHASES;
      counts[phase]+=1;
      const mean=phaseMeans[phase];
      for(let d=0;d<PHASE_RESIDUAL_DN_COUNT;d+=1){
        const residual=frame.values[d]-mean[d];
        sums[phase][d]+=residual*residual;
      }
    }
  }
  const scales=Array.from({length:PHASE_RESIDUAL_PHASES},()=>new Float64Array(PHASE_RESIDUAL_DN_COUNT));
  let minScale=Infinity,maxScale=0;
  for(let p=0;p<PHASE_RESIDUAL_PHASES;p+=1){
    if(!(counts[p]>0)) throw new Error('phase-residual phase support collapsed');
    for(let d=0;d<PHASE_RESIDUAL_DN_COUNT;d+=1){
      const scale=Math.max(Math.sqrt(sums[p][d]/counts[p]),PHASE_RESIDUAL_SCALE_FLOOR);
      if(!Number.isFinite(scale)) throw new Error('phase-residual scale non-finite');
      scales[p][d]=scale;
      if(scale<minScale) minScale=scale;
      if(scale>maxScale) maxScale=scale;
    }
  }
  return {scales,counts:Array.from(counts),minScale,maxScale};
}

export function phaseResidualScoreFrames(views, phaseMeans, phaseScales) {
  const bySeed=new Map();
  let finiteScores=0;
  for(const tape of views){
    const rows=[];
    for(const frame of tape.frames){
      const phase=frame.frameIndex%PHASE_RESIDUAL_PHASES;
      const mean=phaseMeans[phase];
      const scales=phaseScales[phase];
      let sum=0;
      for(let d=0;d<PHASE_RESIDUAL_DN_COUNT;d+=1){
        const z=(frame.values[d]-mean[d])/scales[d];
        sum+=z*z;
      }
      const score=sum/PHASE_RESIDUAL_DN_COUNT;
      if(!Number.isFinite(score)) throw new Error('phase-residual score non-finite');
      rows.push({step:frame.step,frameIndex:frame.frameIndex,score});
      finiteScores+=1;
    }
    bySeed.set(tape.seed,rows);
  }
  return {scoresBySeed:bySeed,finiteScores};
}

export function phaseResidualFiniteScores(scoreFramesBySeed) {
  const values=[];
  for(const frames of scoreFramesBySeed.values()){
    for(const frame of frames) if(Number.isFinite(frame.score)) values.push(frame.score);
  }
  return values;
}

export function phaseResidualSerializableContract(baseModelSha,threshold) {
  return {
    contract:PHASE_RESIDUAL_CONTRACT,
    baseModelSha,
    phaseCount:PHASE_RESIDUAL_PHASES,
    dnCount:PHASE_RESIDUAL_DN_COUNT,
    phaseScale:'max(sqrt(mean_train((x-phaseMean)^2)),1e-6)',
    scaleFloor:PHASE_RESIDUAL_SCALE_FLOOR,
    score:'mean_d(((x_d-phaseMean[p][d])/phaseScale[p][d])^2)',
    thresholdQuantile:PHASE_RESIDUAL_Q,
    threshold,
    refractory:PHASE_RESIDUAL_REFRACTORY,
    matching:'earliest-unmatched-event:eventStep>=hitStep && eventStep-hitStep<10',
  };
}
