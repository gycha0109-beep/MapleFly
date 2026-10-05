export const COMPLEMENT_MISS_CATEGORIES = [
  'MATCH_CONFLICT',
  'REFRACTORY_SUPPRESSED_IN_WINDOW',
  'PRE_HIT_COMPLEMENT_CROSSING',
  'LATE_POST_HIT_COMPLEMENT_CROSSING',
  'ABOVE_COMPLEMENT_THRESHOLD_NO_CROSSING_IN_WINDOW',
  'NO_LOCAL_COMPLEMENT_THRESHOLD_CROSSING',
];

const GENERIC_TO_COMPLEMENT = {
  MATCH_CONFLICT:'MATCH_CONFLICT',
  REFRACTORY_SUPPRESSED_IN_WINDOW:'REFRACTORY_SUPPRESSED_IN_WINDOW',
  PRE_HIT_CROSSING:'PRE_HIT_COMPLEMENT_CROSSING',
  LATE_POST_HIT_CROSSING:'LATE_POST_HIT_COMPLEMENT_CROSSING',
  ABOVE_THRESHOLD_NO_CROSSING_IN_WINDOW:'ABOVE_COMPLEMENT_THRESHOLD_NO_CROSSING_IN_WINDOW',
  NO_LOCAL_THRESHOLD_CROSSING:'NO_LOCAL_COMPLEMENT_THRESHOLD_CROSSING',
};

export function relabelComplementMissAttribution(generic) {
  const counts=Object.fromEntries(COMPLEMENT_MISS_CATEGORIES.map(key=>[key,0]));
  for(const [key,value] of Object.entries(generic.counts??{})){
    const mapped=GENERIC_TO_COMPLEMENT[key];
    if(mapped) counts[mapped]=value;
  }
  const total=generic.total??Object.values(counts).reduce((a,b)=>a+b,0);
  return {
    total,
    counts,
    fractions:Object.fromEntries(COMPLEMENT_MISS_CATEGORIES.map(key=>[
      key,total?counts[key]/total:0,
    ])),
  };
}

function key(present) {
  return present ? 'PRESENT' : 'ABSENT';
}

export function crossRepresentationContext(rows) {
  const counts={};
  for(const row of rows){
    const label=
      'BASE_'+key(row.basePresent)+'|' +
      'MAX_'+key(row.maxPresent)+'|' +
      'COMPLEMENT_'+key(row.complementPresent);
    counts[label]=(counts[label]??0)+1;
  }
  const total=rows.length;
  const fractions=Object.fromEntries(Object.entries(counts).map(([k,v])=>[k,total?v/total:0]));
  return {total,counts,fractions};
}

export function complementAttributionAxis(G,H) {
  const g=G.complementMissAttribution.fractions;
  const h=H.complementMissAttribution.fractions;
  if(g.PRE_HIT_COMPLEMENT_CROSSING>.50 && h.PRE_HIT_COMPLEMENT_CROSSING>.50) {
    return 'EARLY_COMPLEMENT_SHIFT_DOMINANT';
  }
  if(g.LATE_POST_HIT_COMPLEMENT_CROSSING>.50 && h.LATE_POST_HIT_COMPLEMENT_CROSSING>.50) {
    return 'LATE_COMPLEMENT_SHIFT_DOMINANT';
  }
  const blocked=x =>
    x.MATCH_CONFLICT +
    x.REFRACTORY_SUPPRESSED_IN_WINDOW +
    x.ABOVE_COMPLEMENT_THRESHOLD_NO_CROSSING_IN_WINDOW;
  if(blocked(g)>.50 && blocked(h)>.50) {
    return 'COMPLEMENT_EVENTIZER_BLOCK_DOMINANT';
  }
  if(g.NO_LOCAL_COMPLEMENT_THRESHOLD_CROSSING>.50 &&
     h.NO_LOCAL_COMPLEMENT_THRESHOLD_CROSSING>.50) {
    return 'COMPLEMENT_SIGNAL_ABSENT_DOMINANT';
  }
  if(G.falseEventTiming.fractions.BACKGROUND>.80 &&
     H.falseEventTiming.fractions.BACKGROUND>.80 &&
     G.backgroundSeparation.impactLocalQ95OverBackgroundQ95<1.20 &&
     H.backgroundSeparation.impactLocalQ95OverBackgroundQ95<1.20) {
    return 'BACKGROUND_COMPLEMENT_NOISE_DOMINANT';
  }
  return 'MIXED_PCA_COMPLEMENT_TEMPORAL_MISALIGNMENT';
}
