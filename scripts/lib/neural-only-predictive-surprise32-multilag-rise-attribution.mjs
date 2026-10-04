export const RISE_MISS_CATEGORIES = [
  'MATCH_CONFLICT',
  'REFRACTORY_SUPPRESSED_IN_WINDOW',
  'PRE_HIT_RISE_CROSSING',
  'LATE_POST_HIT_RISE_CROSSING',
  'ABOVE_RISE_THRESHOLD_NO_CROSSING_IN_WINDOW',
  'NO_LOCAL_RISE_THRESHOLD_CROSSING',
];

const GENERIC_TO_RISE = {
  MATCH_CONFLICT:'MATCH_CONFLICT',
  REFRACTORY_SUPPRESSED_IN_WINDOW:'REFRACTORY_SUPPRESSED_IN_WINDOW',
  PRE_HIT_CROSSING:'PRE_HIT_RISE_CROSSING',
  LATE_POST_HIT_CROSSING:'LATE_POST_HIT_RISE_CROSSING',
  ABOVE_THRESHOLD_NO_CROSSING_IN_WINDOW:'ABOVE_RISE_THRESHOLD_NO_CROSSING_IN_WINDOW',
  NO_LOCAL_THRESHOLD_CROSSING:'NO_LOCAL_RISE_THRESHOLD_CROSSING',
};

export function relabelRiseMissAttribution(generic) {
  const counts = Object.fromEntries(RISE_MISS_CATEGORIES.map(key => [key,0]));
  for (const [key,value] of Object.entries(generic.counts ?? {})) {
    const mapped = GENERIC_TO_RISE[key];
    if (mapped) counts[mapped] = value;
  }
  const total = generic.total ?? Object.values(counts).reduce((a,b)=>a+b,0);
  const fractions = Object.fromEntries(RISE_MISS_CATEGORIES.map(key => [
    key, total ? counts[key] / total : 0,
  ]));
  return {total,counts,fractions};
}

export function rawLocalContext(rawPeak, baseThreshold) {
  if (rawPeak === null) return 'RAW_LOCAL_SUBTHRESHOLD';
  return rawPeak.peakScore >= baseThreshold
    ? 'RAW_LOCAL_SUPRATHRESHOLD_PRESENT'
    : 'RAW_LOCAL_SUBTHRESHOLD';
}

export function contextComposition(rows) {
  const counts = {
    RAW_LOCAL_SUPRATHRESHOLD_PRESENT:0,
    RAW_LOCAL_SUBTHRESHOLD:0,
  };
  for (const row of rows) counts[row.rawContext] += 1;
  const total = rows.length;
  return {
    total,
    counts,
    fractions:{
      RAW_LOCAL_SUPRATHRESHOLD_PRESENT: total ? counts.RAW_LOCAL_SUPRATHRESHOLD_PRESENT / total : 0,
      RAW_LOCAL_SUBTHRESHOLD: total ? counts.RAW_LOCAL_SUBTHRESHOLD / total : 0,
    },
  };
}

export function multilagRiseAttributionAxis(C,D) {
  const c=C.riseMissAttribution.fractions;
  const d=D.riseMissAttribution.fractions;
  if (c.PRE_HIT_RISE_CROSSING > .50 && d.PRE_HIT_RISE_CROSSING > .50) {
    return 'EARLY_RISE_SHIFT_DOMINANT';
  }
  if (c.LATE_POST_HIT_RISE_CROSSING > .50 && d.LATE_POST_HIT_RISE_CROSSING > .50) {
    return 'LATE_RISE_SHIFT_DOMINANT';
  }
  const blocked = f =>
    f.MATCH_CONFLICT +
    f.REFRACTORY_SUPPRESSED_IN_WINDOW +
    f.ABOVE_RISE_THRESHOLD_NO_CROSSING_IN_WINDOW;
  if (blocked(c) > .50 && blocked(d) > .50) {
    return 'RISE_EVENTIZER_BLOCK_DOMINANT';
  }
  const noRise =
    c.NO_LOCAL_RISE_THRESHOLD_CROSSING > .50 &&
    d.NO_LOCAL_RISE_THRESHOLD_CROSSING > .50;
  if (noRise &&
      C.rawContextAllMisses.fractions.RAW_LOCAL_SUBTHRESHOLD > .50 &&
      D.rawContextAllMisses.fractions.RAW_LOCAL_SUBTHRESHOLD > .50) {
    return 'BASE_SIGNAL_ABSENT_DOMINANT';
  }
  if (noRise &&
      C.rawContextAllMisses.fractions.RAW_LOCAL_SUPRATHRESHOLD_PRESENT > .50 &&
      D.rawContextAllMisses.fractions.RAW_LOCAL_SUPRATHRESHOLD_PRESENT > .50) {
    return 'RISE_TRANSFORM_SUPPRESSION_DOMINANT';
  }
  return 'MIXED_MULTILAG_RISE_TEMPORAL_MISALIGNMENT';
}
