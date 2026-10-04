// Frozen numerical functions copied verbatim from the v4 source anchor.
// The attribution verifier compares each function and constant to that anchor.
const STEP_SECONDS = 0.02;
const DN_COUNT = 1316;
const V15N_PCA_SEED = 3948000;
const V15N_PCA_ITERATIONS = 80;
const V15N_PCA_COMPONENTS = 32;
const V15N_D6_D2_D2_PCA_FIT_ROWS = 240;

function mean(values) {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;
}

function mulberry32(seed) {
  let value = seed >>> 0;
  return function random() {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function vectorDot(a, b) {
  let value = 0;
  for (let i = 0; i < a.length; i += 1) value += a[i] * b[i];
  return value;
}

function normalizeVector(vector) {
  let norm2 = 0;
  for (let i = 0; i < vector.length; i += 1) {
    norm2 += vector[i] * vector[i];
  }
  const norm = Math.sqrt(norm2);
  if (!(norm > 1e-12)) {
    throw new Error("v15N PCA vector collapsed");
  }
  for (let i = 0; i < vector.length; i += 1) vector[i] /= norm;
  return vector;
}

function orthogonalize(vector, basis) {
  for (const prior of basis) {
    const projection = vectorDot(vector, prior);
    for (let i = 0; i < vector.length; i += 1) {
      vector[i] -= projection * prior[i];
    }
  }
  return vector;
}

function d2d2EvenlySpacedRows(rows, count) {
  if (rows.length < count) {
    throw new Error("v15N-D6-D2-D2 insufficient PCA fit rows");
  }
  if (count === 1) return [rows[0]];
  return Array.from({ length: count }, (_, index) => {
    const sourceIndex = Math.round(
      (index * (rows.length - 1)) / (count - 1),
    );
    return rows[sourceIndex];
  });
}

function d2d2FitPca(rawRows) {
  const raw = d2d2EvenlySpacedRows(
    rawRows,
    V15N_D6_D2_D2_PCA_FIT_ROWS,
  );
  const means = new Float64Array(DN_COUNT);
  for (const row of raw) {
    for (let d = 0; d < DN_COUNT; d += 1) means[d] += row[d];
  }
  for (let d = 0; d < DN_COUNT; d += 1) means[d] /= raw.length;

  const scales = new Float64Array(DN_COUNT);
  for (const row of raw) {
    for (let d = 0; d < DN_COUNT; d += 1) {
      const delta = row[d] - means[d];
      scales[d] += delta * delta;
    }
  }
  for (let d = 0; d < DN_COUNT; d += 1) {
    scales[d] = Math.max(Math.sqrt(scales[d] / raw.length), 1e-6);
  }

  const standardized = raw.map((row) => {
    const out = new Float64Array(DN_COUNT);
    for (let d = 0; d < DN_COUNT; d += 1) {
      out[d] = (row[d] - means[d]) / scales[d];
    }
    return out;
  });

  const n = standardized.length;
  const gram = new Float64Array(n * n);
  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j <= i; j += 1) {
      const value = vectorDot(standardized[i], standardized[j]) / n;
      gram[i * n + j] = value;
      gram[j * n + i] = value;
    }
  }

  const sampleEigenvectors = [];
  const components = [];
  const eigenvalues = [];
  for (
    let component = 0;
    component < V15N_PCA_COMPONENTS;
    component += 1
  ) {
    const random = mulberry32(V15N_PCA_SEED + component);
    let u = Float64Array.from(
      { length: n },
      () => random() * 2 - 1,
    );
    orthogonalize(u, sampleEigenvectors);
    normalizeVector(u);

    for (
      let iteration = 0;
      iteration < V15N_PCA_ITERATIONS;
      iteration += 1
    ) {
      const next = new Float64Array(n);
      for (let i = 0; i < n; i += 1) {
        let value = 0;
        const offset = i * n;
        for (let j = 0; j < n; j += 1) {
          value += gram[offset + j] * u[j];
        }
        next[i] = value;
      }
      orthogonalize(next, sampleEigenvectors);
      normalizeVector(next);
      u = next;
    }

    const gu = new Float64Array(n);
    for (let i = 0; i < n; i += 1) {
      let value = 0;
      const offset = i * n;
      for (let j = 0; j < n; j += 1) {
        value += gram[offset + j] * u[j];
      }
      gu[i] = value;
    }
    const eigenvalue = vectorDot(u, gu);

    const loading = new Float64Array(DN_COUNT);
    for (let i = 0; i < n; i += 1) {
      const scale = u[i];
      const row = standardized[i];
      for (let d = 0; d < DN_COUNT; d += 1) {
        loading[d] += scale * row[d];
      }
    }
    normalizeVector(loading);
    let maxIndex = 0;
    for (let d = 1; d < DN_COUNT; d += 1) {
      if (Math.abs(loading[d]) > Math.abs(loading[maxIndex])) {
        maxIndex = d;
      }
    }
    if (loading[maxIndex] < 0) {
      for (let d = 0; d < DN_COUNT; d += 1) loading[d] *= -1;
      for (let i = 0; i < n; i += 1) u[i] *= -1;
    }
    sampleEigenvectors.push(u);
    components.push(loading);
    eigenvalues.push(eigenvalue);
  }
  return { means, scales, components, eigenvalues };
}

function d2d2ProjectPca(row, preprocessing) {
  const z = new Float64Array(DN_COUNT);
  for (let d = 0; d < DN_COUNT; d += 1) {
    z[d] = (row[d] - preprocessing.means[d]) /
      preprocessing.scales[d];
  }
  return preprocessing.components.map(
    (component) => vectorDot(z, component),
  );
}

function d2d2SolveLinear(matrix, vector) {
  const n = vector.length;
  const a = Array.from({ length: n }, (_, row) => {
    const out = Array.from(
      { length: n + 1 },
      (_, col) => col < n ? matrix[row][col] : vector[row],
    );
    return out;
  });
  for (let col = 0; col < n; col += 1) {
    let pivot = col;
    for (let row = col + 1; row < n; row += 1) {
      if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) {
        pivot = row;
      }
    }
    if (Math.abs(a[pivot][col]) < 1e-12) {
      throw new Error("v15N-D6-D2-D2 singular ridge system");
    }
    [a[col], a[pivot]] = [a[pivot], a[col]];
    const scale = a[col][col];
    for (let j = col; j <= n; j += 1) a[col][j] /= scale;
    for (let row = 0; row < n; row += 1) {
      if (row === col) continue;
      const factor = a[row][col];
      if (factor === 0) continue;
      for (let j = col; j <= n; j += 1) {
        a[row][j] -= factor * a[col][j];
      }
    }
  }
  return a.map((row) => row[n]);
}

const NO_D1_PREREG =
  "f11e04bb7dad3bcbc5324b66322e6d6e5d99aad6";
const NO_D1_CONFIRM_SHA =
  "ffb4d8cbd0fecfa64ac84fc9cb90f079d3ab03a9d9e08df7b7ebff4139e398aa";
const NO_D1_PHASES = 48;
const NO_D1_HISTORY = 5;
const NO_D1_PCA_ROWS = 240;
const NO_D1_PCA_COMPONENTS = 32;
const NO_D1_PREDICTOR_LAGS = [1,3,5];
const NO_D1_RIDGE = 1e-3;
const NO_D1_Q = 0.95;
const NO_D1_REFRACTORY = 10;
const NO_D1_TRAIN_BASE_SEEDS = [
  7521000,7531000,7541000,7551000,
  7561000,7571000,7581000,7591000,
];
const NO_D1_TRAIN_INT = 7607000;
const NO_D1_CAL_BASE_SEEDS = [
  7611000,7621000,7631000,7641000,
  7651000,7661000,7671000,7681000,
];
const NO_D1_CAL_INT = 7697000;
const NO_D1_A_BASE_SEEDS = [
  7701000,7711000,7721000,7731000,
  7741000,7751000,7761000,7771000,
];
const NO_D1_A_INT = 7787000;
const NO_D1_B_BASE_SEEDS = [
  7791000,7801000,7811000,7821000,
  7831000,7841000,7851000,7861000,
];
const NO_D1_B_INT = 7877000;
let NO_D1_TRUTH_ACCESS_ALLOWED = false;

function noD1NeuralViews(tapes) {
  return tapes.map((tape) => ({
    seed: tape.seed,
    frames: tape.potionFrameEvents.map((frame) => ({
      frameIndex: frame.frameIndex,
      step: frame.step,
      values: frame.values,
    })),
  }));
}

function noD1AssertViews(views) {
  for (const tape of views) {
    const tapeKeys=Object.keys(tape).sort().join(",");
    if(tapeKeys!=="frames,seed") throw new Error("neural-only tape view contaminated");
    for(const frame of tape.frames){
      const frameKeys=Object.keys(frame).sort().join(",");
      if(frameKeys!=="frameIndex,step,values") throw new Error("neural-only frame view contaminated");
    }
  }
}

function noD1PhaseMeans(views) {
  noD1AssertViews(views);
  const means=Array.from({length:NO_D1_PHASES},()=>new Float64Array(DN_COUNT));
  const counts=new Int32Array(NO_D1_PHASES);
  for(const tape of views) for(const frame of tape.frames){
    const phase=frame.frameIndex%NO_D1_PHASES;
    counts[phase]+=1;
    for(let d=0;d<DN_COUNT;d+=1) means[phase][d]+=frame.values[d];
  }
  for(let p=0;p<NO_D1_PHASES;p+=1){
    if(!(counts[p]>0)) throw new Error("neural-only phase support collapsed");
    for(let d=0;d<DN_COUNT;d+=1) means[p][d]/=counts[p];
  }
  return {means,counts:Array.from(counts)};
}

function noD1Residual(frame, phaseMeans) {
  const meanVec=phaseMeans[frame.frameIndex%NO_D1_PHASES];
  const out=new Float64Array(DN_COUNT);
  for(let d=0;d<DN_COUNT;d+=1) out[d]=frame.values[d]-meanVec[d];
  return out;
}

function noD1InnovationRowsCount(views) {
  return views.reduce((sum,tape)=>sum+Math.max(0,tape.frames.length-NO_D1_HISTORY),0);
}

function noD1SelectedInnovationRows(views, phaseMeans) {
  noD1AssertViews(views);
  const total=noD1InnovationRowsCount(views);
  if(total<NO_D1_PCA_ROWS) throw new Error("neural-only insufficient PCA innovations");
  const targets=Array.from({length:NO_D1_PCA_ROWS},(_,i)=>
    Math.round((i*(total-1))/(NO_D1_PCA_ROWS-1))
  );
  const targetSet=new Set(targets);
  const rows=[];
  let globalIndex=0;
  for(const tape of views){
    const prior=[];
    for(const frame of tape.frames){
      const residual=noD1Residual(frame,phaseMeans);
      if(prior.length===NO_D1_HISTORY){
        if(targetSet.has(globalIndex)){
          const innovation=new Float64Array(DN_COUNT);
          for(let d=0;d<DN_COUNT;d+=1){
            let baseline=0;
            for(const p of prior) baseline+=p[d];
            innovation[d]=residual[d]-baseline/NO_D1_HISTORY;
          }
          rows.push(innovation);
        }
        globalIndex+=1;
      }
      prior.push(residual);
      if(prior.length>NO_D1_HISTORY) prior.shift();
    }
  }
  if(rows.length!==NO_D1_PCA_ROWS) throw new Error("neural-only PCA row extraction mismatch");
  return rows;
}

function noD1ZFrames(view, phaseMeans, pca) {
  const prior=[];
  const out=[];
  for(const frame of view.frames){
    const residual=noD1Residual(frame,phaseMeans);
    if(prior.length===NO_D1_HISTORY){
      const innovation=new Float64Array(DN_COUNT);
      for(let d=0;d<DN_COUNT;d+=1){
        let baseline=0;
        for(const p of prior) baseline+=p[d];
        innovation[d]=residual[d]-baseline/NO_D1_HISTORY;
      }
      out.push({
        frameIndex:frame.frameIndex,
        step:frame.step,
        z:d2d2ProjectPca(innovation,pca),
      });
    }
    prior.push(residual);
    if(prior.length>NO_D1_HISTORY) prior.shift();
  }
  return out;
}

function noD1ZTapes(views, phaseMeans, pca) {
  return views.map(view=>({seed:view.seed,frames:noD1ZFrames(view,phaseMeans,pca)}));
}

function noD1ZStats(zTapes) {
  const means=Array(NO_D1_PCA_COMPONENTS).fill(0);
  let n=0;
  for(const tape of zTapes) for(const frame of tape.frames){
    n+=1;
    for(let j=0;j<NO_D1_PCA_COMPONENTS;j+=1) means[j]+=frame.z[j];
  }
  if(!(n>0)) throw new Error("neural-only z support collapsed");
  for(let j=0;j<NO_D1_PCA_COMPONENTS;j+=1) means[j]/=n;
  const scales=Array(NO_D1_PCA_COMPONENTS).fill(0);
  for(const tape of zTapes) for(const frame of tape.frames){
    for(let j=0;j<NO_D1_PCA_COMPONENTS;j+=1){
      const d=frame.z[j]-means[j];
      scales[j]+=d*d;
    }
  }
  for(let j=0;j<NO_D1_PCA_COMPONENTS;j+=1){
    scales[j]=Math.sqrt(scales[j]/n);
    if(!(scales[j]>1e-9)) throw new Error("neural-only z scale collapsed");
  }
  return {means,scales,n};
}

function noD1StdZ(z,stats) {
  const out=Array(NO_D1_PCA_COMPONENTS);
  for(let j=0;j<NO_D1_PCA_COMPONENTS;j+=1) out[j]=(z[j]-stats.means[j])/stats.scales[j];
  return out;
}

function noD1PredictiveRows(zTapes,zStats) {
  const rows=[];
  for(const tape of zTapes){
    const f=tape.frames;
    for(let i=5;i<f.length;i+=1){
      const target=noD1StdZ(f[i].z,zStats);
      const x=[];
      for(const lag of NO_D1_PREDICTOR_LAGS){
        const lagz=noD1StdZ(f[i-lag].z,zStats);
        for(const v of lagz) x.push(v);
      }
      rows.push({seed:tape.seed,step:f[i].step,frameIndex:f[i].frameIndex,x,target});
    }
  }
  return rows;
}

function noD1FitPredictor(rows) {
  const width=NO_D1_PCA_COMPONENTS*NO_D1_PREDICTOR_LAGS.length;
  const dim=width+1;
  const xtx=Array.from({length:dim},()=>new Float64Array(dim));
  const xty=Array.from({length:NO_D1_PCA_COMPONENTS},()=>new Float64Array(dim));
  for(const row of rows){
    const x=new Float64Array(dim);
    x[0]=1;
    for(let j=0;j<width;j+=1) x[j+1]=row.x[j];
    for(let i=0;i<dim;i+=1){
      for(let j=i;j<dim;j+=1) xtx[i][j]+=x[i]*x[j];
      for(let k=0;k<NO_D1_PCA_COMPONENTS;k+=1) xty[k][i]+=x[i]*row.target[k];
    }
  }
  for(let i=0;i<dim;i+=1){
    for(let j=i+1;j<dim;j+=1) xtx[j][i]=xtx[i][j];
  }
  for(let j=1;j<dim;j+=1) xtx[j][j]+=NO_D1_RIDGE;
  const matrix=xtx.map(row=>Array.from(row));
  const weights=[];
  for(let k=0;k<NO_D1_PCA_COMPONENTS;k+=1){
    weights.push(d2d2SolveLinear(matrix,Array.from(xty[k])));
  }
  return {weights,width,lambda:NO_D1_RIDGE};
}

function noD1Predict(row,predictor) {
  const out=Array(NO_D1_PCA_COMPONENTS).fill(0);
  for(let k=0;k<NO_D1_PCA_COMPONENTS;k+=1){
    const w=predictor.weights[k];
    let y=w[0];
    for(let j=0;j<predictor.width;j+=1) y+=w[j+1]*row.x[j];
    out[k]=y;
  }
  return out;
}

function noD1ResidualStats(rows,predictor) {
  const means=Array(NO_D1_PCA_COMPONENTS).fill(0);
  for(const row of rows){
    const pred=noD1Predict(row,predictor);
    for(let k=0;k<NO_D1_PCA_COMPONENTS;k+=1) means[k]+=row.target[k]-pred[k];
  }
  for(let k=0;k<NO_D1_PCA_COMPONENTS;k+=1) means[k]/=rows.length;
  const scales=Array(NO_D1_PCA_COMPONENTS).fill(0);
  for(const row of rows){
    const pred=noD1Predict(row,predictor);
    for(let k=0;k<NO_D1_PCA_COMPONENTS;k+=1){
      const d=(row.target[k]-pred[k])-means[k];
      scales[k]+=d*d;
    }
  }
  for(let k=0;k<NO_D1_PCA_COMPONENTS;k+=1){
    scales[k]=Math.sqrt(scales[k]/rows.length);
    if(!(scales[k]>1e-9)) throw new Error("neural-only residual scale collapsed");
  }
  return {means,scales};
}

function noD1ScoreRow(row,model) {
  const pred=noD1Predict(row,model.predictor);
  let sum=0;
  for(let k=0;k<NO_D1_PCA_COMPONENTS;k+=1){
    const e=row.target[k]-pred[k];
    const r=(e-model.residualStats.means[k])/model.residualStats.scales[k];
    sum+=r*r;
  }
  return sum/NO_D1_PCA_COMPONENTS;
}

function noD1ScoreFrames(views,model) {
  noD1AssertViews(views);
  const zTapes=noD1ZTapes(views,model.phase.means,model.pca);
  const rows=noD1PredictiveRows(zTapes,model.zStats);
  const bySeed=new Map();
  for(const row of rows){
    if(!bySeed.has(row.seed)) bySeed.set(row.seed,[]);
    bySeed.get(row.seed).push({
      step:row.step,
      frameIndex:row.frameIndex,
      score:noD1ScoreRow(row,model),
    });
  }
  return bySeed;
}

function noD1NearestRank95(values) {
  const sorted=values.filter(Number.isFinite).sort((a,b)=>a-b);
  if(!sorted.length) throw new Error("neural-only calibration score support collapsed");
  const index=Math.ceil(NO_D1_Q*sorted.length)-1;
  return {threshold:sorted[index],count:sorted.length,index};
}

function noD1Eventize(scoreFramesBySeed,threshold) {
  const out=new Map();
  for(const [seed,frames] of scoreFramesBySeed.entries()){
    let previousPositive=false;
    let lastEventStep=null;
    let risingEdges=0;
    let refractorySuppressed=0;
    const events=[];
    for(const frame of frames){
      const positive=frame.score>=threshold;
      const rising=positive&&!previousPositive;
      if(rising){
        risingEdges+=1;
        const clear=lastEventStep===null || frame.step-lastEventStep>=NO_D1_REFRACTORY;
        if(clear){
          events.push({step:frame.step,score:frame.score});
          lastEventStep=frame.step;
        }else{
          refractorySuppressed+=1;
        }
      }
      previousPositive=positive;
    }
    out.set(seed,{events,risingEdges,refractorySuppressed});
  }
  return out;
}

function noD1Quantile(values,q){
  if(!values.length) return null;
  const s=[...values].sort((a,b)=>a-b);
  const pos=(s.length-1)*q;
  const lo=Math.floor(pos),hi=Math.ceil(pos);
  if(lo===hi) return s[lo];
  return s[lo]+(s[hi]-s[lo])*(pos-lo);
}

function noD1Evaluate(tapes,eventMap) {
  if(!NO_D1_TRUTH_ACCESS_ALLOWED) throw new Error("physical truth accessed before freeze");
  let physicalImpacts=0,neuralEvents=0,matched=0,falseEvents=0,missedImpacts=0;
  let risingEdges=0,refractorySuppressed=0;
  const absCountErrors=[],latencies=[];
  for(const tape of tapes){
    const hitSteps=tape.damageEvents.map(e=>e.step);
    const part=eventMap.get(tape.seed)??{events:[],risingEdges:0,refractorySuppressed:0};
    const events=part.events;
    const used=new Set();
    let tapeMatched=0;
    for(const hitStep of hitSteps){
      let found=-1;
      for(let i=0;i<events.length;i+=1){
        if(used.has(i)) continue;
        const age=events[i].step-hitStep;
        if(age>=0 && age<10){found=i;break;}
      }
      if(found>=0){
        used.add(found);tapeMatched+=1;
        latencies.push((events[found].step-hitStep)*STEP_SECONDS);
      }
    }
    physicalImpacts+=hitSteps.length;
    neuralEvents+=events.length;
    matched+=tapeMatched;
    falseEvents+=events.length-tapeMatched;
    missedImpacts+=hitSteps.length-tapeMatched;
    risingEdges+=part.risingEdges;
    refractorySuppressed+=part.refractorySuppressed;
    absCountErrors.push(Math.abs(events.length-hitSteps.length));
  }
  const precision=neuralEvents?matched/neuralEvents:0;
  const recall=physicalImpacts?matched/physicalImpacts:0;
  const f1=(precision+recall)?2*precision*recall/(precision+recall):0;
  return {
    tapes:tapes.length,physicalImpacts,neuralEvents,matched,falseEvents,missedImpacts,
    precision,recall,f1,
    eventCountRatio:physicalImpacts?neuralEvents/physicalImpacts:0,
    meanAbsolutePerTapeCountError:mean(absCountErrors),
    medianMatchedLatencySeconds:noD1Quantile(latencies,0.5),
    p90MatchedLatencySeconds:noD1Quantile(latencies,0.9),
    risingEdges,refractorySuppressed,
  };
}

function noD1Pass(m) {
  return m.precision>=0.75 && m.recall>=0.75 && m.f1>=0.75 &&
    m.eventCountRatio>=0.80 && m.eventCountRatio<=1.20 &&
    m.meanAbsolutePerTapeCountError<=5.0;
}

function noD1ProspectiveSupport(m) {
  return {
    tapes:m.tapes,physicalImpacts:m.physicalImpacts,neuralEvents:m.neuralEvents,
    pass:m.tapes===64 && m.physicalImpacts>=1000 && m.neuralEvents>=500,
  };
}

function noD1SerializableModel(model,threshold) {
  return {
    contract:"NEURAL_ONLY_PREDICTIVE_SURPRISE32",
    phaseCount:NO_D1_PHASES,
    innovationHistory:NO_D1_HISTORY,
    pcaFitRows:NO_D1_PCA_ROWS,
    pcaComponents:NO_D1_PCA_COMPONENTS,
    pcaSeed:V15N_PCA_SEED,
    pcaIterations:V15N_PCA_ITERATIONS,
    predictorLags:NO_D1_PREDICTOR_LAGS,
    ridge:NO_D1_RIDGE,
    phaseMeans:model.phase.means.map(v=>Array.from(v)),
    pca:{
      means:Array.from(model.pca.means),
      scales:Array.from(model.pca.scales),
      components:model.pca.components.map(v=>Array.from(v)),
      eigenvalues:Array.from(model.pca.eigenvalues),
    },
    zStats:model.zStats,
    predictor:model.predictor,
    residualStats:model.residualStats,
    thresholdQuantile:NO_D1_Q,
    threshold,
    refractory:NO_D1_REFRACTORY,
  };
}


export { mean, mulberry32, vectorDot, normalizeVector, orthogonalize, d2d2EvenlySpacedRows, d2d2FitPca, d2d2ProjectPca, d2d2SolveLinear, noD1NeuralViews, noD1AssertViews, noD1PhaseMeans, noD1Residual, noD1InnovationRowsCount, noD1SelectedInnovationRows, noD1ZFrames, noD1ZTapes, noD1ZStats, noD1StdZ, noD1PredictiveRows, noD1FitPredictor, noD1Predict, noD1ResidualStats, noD1ScoreRow, noD1ScoreFrames, noD1NearestRank95, noD1Eventize, noD1Quantile, noD1Evaluate, noD1Pass, noD1ProspectiveSupport, noD1SerializableModel };

export function allowFrozenEvaluation(modelSha, threshold) {
  if (modelSha !== 'de8cc3c24cbb91a3a9a806aa2afe37ecd0294c0d2c4b5ce2d4a93c25d77a1cde' || threshold !== 1.574078960908224) {
    throw new Error('frozen model/threshold reproduction required before truth access');
  }
  NO_D1_TRUTH_ACCESS_ALLOWED = true;
}
