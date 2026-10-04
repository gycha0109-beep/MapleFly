export const PCA_COMPLEMENT_DN_COUNT = 1316;
export const PCA_COMPLEMENT_COMPONENTS = 32;
export const PCA_COMPLEMENT_HISTORY = 5;
export const PCA_COMPLEMENT_Q = 0.95;
export const PCA_COMPLEMENT_REFRACTORY = 10;
export const PCA_COMPLEMENT_CONTRACT = 'NEURAL_ONLY_PCA_COMPLEMENT_INNOVATION';
export const PCA_COMPLEMENT_DIMENSION = PCA_COMPLEMENT_DN_COUNT - PCA_COMPLEMENT_COMPONENTS;
export const PCA_COMPLEMENT_NEGATIVE_TOLERANCE = -1e-8;

function invertMatrix(matrix) {
  const n=matrix.length;
  const a=Array.from({length:n},(_,i)=>{
    const row=Array(2*n).fill(0);
    for(let j=0;j<n;j+=1) row[j]=matrix[i][j];
    row[n+i]=1;
    return row;
  });
  for(let col=0;col<n;col+=1){
    let pivot=col;
    for(let row=col+1;row<n;row+=1){
      if(Math.abs(a[row][col])>Math.abs(a[pivot][col])) pivot=row;
    }
    if(!(Math.abs(a[pivot][col])>1e-12)) throw new Error('PCA complement Gram matrix is singular');
    [a[col],a[pivot]]=[a[pivot],a[col]];
    const scale=a[col][col];
    for(let j=0;j<2*n;j+=1) a[col][j]/=scale;
    for(let row=0;row<n;row+=1){
      if(row===col) continue;
      const factor=a[row][col];
      if(factor===0) continue;
      for(let j=0;j<2*n;j+=1) a[row][j]-=factor*a[col][j];
    }
  }
  return a.map(row=>row.slice(n));
}

function gramAndInverse(components) {
  if(components.length!==PCA_COMPLEMENT_COMPONENTS) {
    throw new Error('PCA complement component count mismatch');
  }
  const gram=Array.from({length:PCA_COMPLEMENT_COMPONENTS},()=>Array(PCA_COMPLEMENT_COMPONENTS).fill(0));
  for(let i=0;i<PCA_COMPLEMENT_COMPONENTS;i+=1){
    if(components[i].length!==PCA_COMPLEMENT_DN_COUNT) throw new Error('PCA complement DN count mismatch');
    for(let j=0;j<=i;j+=1){
      let dot=0;
      for(let d=0;d<PCA_COMPLEMENT_DN_COUNT;d+=1) dot+=components[i][d]*components[j][d];
      gram[i][j]=dot;
      gram[j][i]=dot;
    }
  }
  return {gram,inverse:invertMatrix(gram)};
}

function projectionEnergy(b,inverse) {
  const a=Array(PCA_COMPLEMENT_COMPONENTS).fill(0);
  for(let i=0;i<PCA_COMPLEMENT_COMPONENTS;i+=1){
    let value=0;
    for(let j=0;j<PCA_COMPLEMENT_COMPONENTS;j+=1) value+=inverse[i][j]*b[j];
    a[i]=value;
  }
  let value=0;
  for(let i=0;i<PCA_COMPLEMENT_COMPONENTS;i+=1) value+=b[i]*a[i];
  return value;
}

export function pcaComplementScoreFrames(views, model) {
  const {gram,inverse}=gramAndInverse(model.pca.components);
  const bySeed=new Map();
  let minRawComplement=Infinity;
  let finiteScores=0;

  for(const tape of views){
    const prior=[];
    const rows=[];
    for(const frame of tape.frames){
      const phaseMean=model.phase.means[frame.frameIndex%model.phase.means.length];
      const residual=new Float64Array(PCA_COMPLEMENT_DN_COUNT);
      for(let d=0;d<PCA_COMPLEMENT_DN_COUNT;d+=1) residual[d]=frame.values[d]-phaseMean[d];

      if(prior.length===PCA_COMPLEMENT_HISTORY){
        const u=new Float64Array(PCA_COMPLEMENT_DN_COUNT);
        let totalEnergy=0;
        for(let d=0;d<PCA_COMPLEMENT_DN_COUNT;d+=1){
          let baseline=0;
          for(const p of prior) baseline+=p[d];
          const innovation=residual[d]-baseline/PCA_COMPLEMENT_HISTORY;
          const standardized=(innovation-model.pca.means[d])/model.pca.scales[d];
          u[d]=standardized;
          totalEnergy+=standardized*standardized;
        }

        const b=Array(PCA_COMPLEMENT_COMPONENTS).fill(0);
        for(let j=0;j<PCA_COMPLEMENT_COMPONENTS;j+=1){
          const component=model.pca.components[j];
          let dot=0;
          for(let d=0;d<PCA_COMPLEMENT_DN_COUNT;d+=1) dot+=component[d]*u[d];
          b[j]=dot;
        }
        const projectedEnergy=projectionEnergy(b,inverse);
        const rawComplement=totalEnergy-projectedEnergy;
        if(rawComplement<minRawComplement) minRawComplement=rawComplement;
        if(rawComplement<PCA_COMPLEMENT_NEGATIVE_TOLERANCE){
          throw new Error('PCA complement projection residual violated tolerance: '+rawComplement);
        }
        const score=Math.max(0,rawComplement)/PCA_COMPLEMENT_DIMENSION;
        if(!Number.isFinite(score)) throw new Error('PCA complement score non-finite');
        rows.push({step:frame.step,frameIndex:frame.frameIndex,score});
        finiteScores+=1;
      }

      prior.push(residual);
      if(prior.length>PCA_COMPLEMENT_HISTORY) prior.shift();
    }
    bySeed.set(tape.seed,rows);
  }

  let maxGramOffDiagonal=0;
  let maxGramDiagonalError=0;
  for(let i=0;i<PCA_COMPLEMENT_COMPONENTS;i+=1){
    maxGramDiagonalError=Math.max(maxGramDiagonalError,Math.abs(gram[i][i]-1));
    for(let j=0;j<PCA_COMPLEMENT_COMPONENTS;j+=1){
      if(i===j) continue;
      maxGramOffDiagonal=Math.max(maxGramOffDiagonal,Math.abs(gram[i][j]));
    }
  }

  return {
    scoresBySeed:bySeed,
    diagnostics:{finiteScores,minRawComplement,maxGramOffDiagonal,maxGramDiagonalError},
  };
}

export function pcaComplementFiniteScores(scoreFramesBySeed) {
  const values=[];
  for(const frames of scoreFramesBySeed.values()) {
    for(const frame of frames) if(Number.isFinite(frame.score)) values.push(frame.score);
  }
  return values;
}

export function pcaComplementSerializableContract(baseModelSha,threshold) {
  return {
    contract:PCA_COMPLEMENT_CONTRACT,
    baseModelSha,
    score:'max(0,||u||^2-b^T(CC^T)^-1b)/(1316-32)',
    dnCount:PCA_COMPLEMENT_DN_COUNT,
    componentCount:PCA_COMPLEMENT_COMPONENTS,
    complementDimension:PCA_COMPLEMENT_DIMENSION,
    innovationHistory:PCA_COMPLEMENT_HISTORY,
    projection:'Gram-exact frozen PCA32 orthogonal complement',
    thresholdQuantile:PCA_COMPLEMENT_Q,
    threshold,
    refractory:PCA_COMPLEMENT_REFRACTORY,
    matching:'earliest-unmatched-event:eventStep>=hitStep && eventStep-hitStep<10',
  };
}
