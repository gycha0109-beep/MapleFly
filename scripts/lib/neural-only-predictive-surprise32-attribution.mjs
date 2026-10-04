// Evaluator/attribution only: these functions never feed physical truth to the detector.
import { noD1Quantile } from './neural-only-predictive-surprise32-frozen.mjs';

export const MISS_CATEGORIES = [
  'MATCH_CONFLICT', 'REFRACTORY_SUPPRESSED_IN_WINDOW', 'PRE_HIT_CROSSING',
  'LATE_POST_HIT_CROSSING', 'ABOVE_THRESHOLD_NO_CROSSING_IN_WINDOW',
  'NO_LOCAL_THRESHOLD_CROSSING',
];
export const FALSE_CATEGORIES = ['PRE_HIT_200MS', 'RECENT_POST_HIT_200MS', 'BACKGROUND'];
const PEAK_CATEGORIES = ['PRE_HIT_PEAK', 'IN_WINDOW_PEAK', 'LATE_POST_HIT_PEAK'];
const NEAREST_CATEGORIES = ['PRE_200MS', 'IN_WINDOW', 'LATE_200MS', 'NONE'];

export function summarize(values, scoreDistribution = false) {
  const finite = values.filter(Number.isFinite);
  const qs = scoreDistribution
    ? {q50: .5, q75: .75, q90: .9, q95: .95, q99: .99}
    : {q10: .1, q25: .25, median: .5, q75: .75, q90: .9};
  return {count: finite.length, ...Object.fromEntries(
    Object.entries(qs).map(([key, q]) => [key, noD1Quantile(finite, q)]),
  )};
}

function composition(rows, categories) {
  const counts = Object.fromEntries(categories.map(key => [key, 0]));
  for (const row of rows) counts[row.category] += 1;
  return {total: rows.length, counts, fractions: Object.fromEntries(
    categories.map(key => [key, rows.length ? counts[key] / rows.length : 0]),
  )};
}

// Inclusive +/-20 search; exact distance ties select the earlier step.
export function nearestStep(steps, step) {
  let nearest = null;
  for (const candidate of steps) {
    if (Math.abs(candidate - step) > 20) continue;
    if (nearest === null || Math.abs(candidate - step) < Math.abs(nearest - step) ||
        (Math.abs(candidate - step) === Math.abs(nearest - step) && candidate < nearest)) {
      nearest = candidate;
    }
  }
  return nearest;
}

export function traceEventizer(frames, threshold) {
  let previousPositive = false;
  let lastEventStep = null;
  return frames.map(frame => {
    const positive = frame.score >= threshold;
    const crossing = positive && !previousPositive;
    const refractoryClear = lastEventStep === null || frame.step - lastEventStep >= 10;
    const emitted = crossing && refractoryClear;
    if (emitted) lastEventStep = frame.step;
    previousPositive = positive;
    return {...frame, positive, crossing, emitted, refractorySuppressed: crossing && !refractoryClear};
  });
}

export function matchEvents(hitSteps, events) {
  const consumedBy = new Map();
  const matches = new Map();
  for (let h = 0; h < hitSteps.length; h += 1) {
    const e = events.findIndex((event, i) => !consumedBy.has(i) &&
      event.step >= hitSteps[h] && event.step - hitSteps[h] < 10);
    if (e >= 0) {consumedBy.set(e, h); matches.set(h, e);}
  }
  return {consumedBy, matches};
}

export function missCategory(hitStep, trace, events, consumedBy, hitSteps) {
  const inside = trace.filter(f => f.step >= hitStep && f.step < hitStep + 10);
  if (events.some((event, i) => event.step >= hitStep && event.step < hitStep + 10 &&
      consumedBy.has(i) && hitSteps[consumedBy.get(i)] < hitStep)) return 'MATCH_CONFLICT';
  if (inside.some(f => f.refractorySuppressed)) return 'REFRACTORY_SUPPRESSED_IN_WINDOW';
  const crossingInside = inside.some(f => f.crossing);
  if (!crossingInside && trace.some(f => f.step >= hitStep - 10 && f.step < hitStep && f.crossing)) {
    return 'PRE_HIT_CROSSING';
  }
  if (!crossingInside && trace.some(f => f.step >= hitStep + 10 && f.step < hitStep + 20 && f.crossing)) {
    return 'LATE_POST_HIT_CROSSING';
  }
  if (!crossingInside && inside.some(f => f.positive)) return 'ABOVE_THRESHOLD_NO_CROSSING_IN_WINDOW';
  return 'NO_LOCAL_THRESHOLD_CROSSING';
}

export function falseCategory(eventStep, hitSteps) {
  if (hitSteps.some(hit => hit - eventStep > 0 && hit - eventStep < 10)) return 'PRE_HIT_200MS';
  if (hitSteps.some(hit => eventStep - hit >= 0 && eventStep - hit < 10)) return 'RECENT_POST_HIT_200MS';
  return 'BACKGROUND';
}

export function localPeak(trace, hitStep, threshold) {
  let peak = null;
  for (const frame of trace) {
    if (frame.step < hitStep - 10 || frame.step >= hitStep + 20 || !Number.isFinite(frame.score)) continue;
    if (peak === null || frame.score > peak.score ||
        (frame.score === peak.score && frame.step < peak.step)) peak = frame;
  }
  if (peak === null) return null;
  const offset = peak.step - hitStep;
  return {peakScore: peak.score, peakOffsetSteps: offset, thresholdGap: threshold - peak.score,
    category: offset < 0 ? 'PRE_HIT_PEAK' : offset < 10 ? 'IN_WINDOW_PEAK' : 'LATE_POST_HIT_PEAK'};
}

export function nearestEventCategory(offset, boundaryRule) {
  if (offset === null) return 'NONE';
  if (offset >= -10 && offset < 0) return 'PRE_200MS';
  if (offset >= 0 && offset < 10) return 'IN_WINDOW';
  if (offset >= 10 && offset < 20) return 'LATE_200MS';
  if (boundaryRule !== 'OUTSIDE_NAMED_BUCKETS_NONE') {
    throw new Error('preregistered nearest-event boundary interpretation unresolved');
  }
  return 'NONE';
}

export function attributeCohort(tapes, scoresBySeed, eventMap, threshold, boundaryRule) {
  const falseRows = [], missRows = [], impactRows = [];
  const distribution = {BACKGROUND: [], PRE_HIT: [], IN_WINDOW: [], LATE_POST_HIT: []};
  for (const tape of tapes) {
    const hits = tape.damageEvents.map(e => e.step);
    const frames = scoresBySeed.get(tape.seed) ?? [];
    const trace = traceEventizer(frames, threshold);
    const events = eventMap.get(tape.seed)?.events ?? [];
    if (JSON.stringify(trace.filter(f => f.emitted).map(f => ({step:f.step, score:f.score}))) !== JSON.stringify(events)) {
      throw new Error('attribution trace differs from frozen eventizer');
    }
    const {consumedBy, matches} = matchEvents(hits, events);
    for (let e = 0; e < events.length; e += 1) {
      if (consumedBy.has(e)) continue;
      const nearest = nearestStep(hits, events[e].step);
      falseRows.push({seed: tape.seed, eventStep: events[e].step, score: events[e].score,
        category: falseCategory(events[e].step, hits),
        nearestImpactOffsetSteps: nearest === null ? null : events[e].step - nearest});
    }
    for (let h = 0; h < hits.length; h += 1) {
      const hitStep = hits[h];
      const peak = localPeak(trace, hitStep, threshold);
      const missed = !matches.has(h);
      impactRows.push({seed: tape.seed, hitIndex: h, hitStep, missed, peak});
      if (missed) {
        const nearest = nearestStep(events.map(e => e.step), hitStep);
        const offset = nearest === null ? null : nearest - hitStep;
        missRows.push({seed: tape.seed, hitIndex: h, hitStep,
          category: missCategory(hitStep, trace, events, consumedBy, hits), peak,
          nearestEventOffsetSteps: offset, nearestEventCategory: nearestEventCategory(offset, boundaryRule),
          outsideNamedBuckets: offset !== null && (offset < -10 || offset >= 20)});
      }
    }
    // Each finite score frame appears at most once per segment, even when impact windows overlap.
    for (const frame of frames) {
      if (!Number.isFinite(frame.score)) continue;
      if (hits.every(hit => Math.abs(frame.step - hit) >= 20)) distribution.BACKGROUND.push(frame.score);
      if (hits.some(hit => frame.step - hit >= -10 && frame.step - hit < 0)) distribution.PRE_HIT.push(frame.score);
      if (hits.some(hit => frame.step - hit >= 0 && frame.step - hit < 10)) distribution.IN_WINDOW.push(frame.score);
      if (hits.some(hit => frame.step - hit >= 10 && frame.step - hit < 20)) distribution.LATE_POST_HIT.push(frame.score);
    }
  }
  const peaks = impactRows.flatMap(row => row.peak === null ? [] : [row.peak]);
  return {
    falseEventTiming: {...composition(falseRows, FALSE_CATEGORIES),
      nearestImpactOffsetSteps: summarize(falseRows.map(row => row.nearestImpactOffsetSteps))},
    missAttribution: composition(missRows, MISS_CATEGORIES),
    localPeakTiming: {...composition(peaks, PEAK_CATEGORIES), physicalImpacts: impactRows.length,
      finitePeakFraction: impactRows.length ? peaks.length / impactRows.length : 0,
      peakOffsetSteps: summarize(peaks.map(p => p.peakOffsetSteps))},
    missedImpactThresholdGap: summarize(missRows.flatMap(row => row.peak === null ? [] : [row.peak.thresholdGap])),
    nearestEventDistance: {...composition(missRows.map(row => ({category: row.nearestEventCategory})), NEAREST_CATEGORIES),
      nearestEventOffsetSteps: summarize(missRows.filter(row => row.nearestEventCategory !== 'NONE').map(row => row.nearestEventOffsetSteps)),
      rawNearestEventOffsetSteps: summarize(missRows.map(row => row.nearestEventOffsetSteps)),
      outsideNamedBuckets: missRows.filter(row => row.outsideNamedBuckets).length},
    surpriseDistribution: Object.fromEntries(Object.entries(distribution).map(([key, values]) => [key, summarize(values, true)])),
    records: {falseEvents: falseRows, missedImpacts: missRows, physicalImpacts: impactRows},
  };
}

export function attributionAxis(A, B) {
  const a = A.missAttribution.fractions, b = B.missAttribution.fractions;
  if (a.PRE_HIT_CROSSING > .50 && b.PRE_HIT_CROSSING > .50) return 'EARLY_PHASE_SHIFT_DOMINANT';
  if (a.LATE_POST_HIT_CROSSING > .50 && b.LATE_POST_HIT_CROSSING > .50) return 'LATE_PHASE_SHIFT_DOMINANT';
  const blocked = f => f.MATCH_CONFLICT + f.REFRACTORY_SUPPRESSED_IN_WINDOW + f.ABOVE_THRESHOLD_NO_CROSSING_IN_WINDOW;
  if (blocked(a) > .50 && blocked(b) > .50) return 'EVENTIZER_BLOCK_DOMINANT';
  if (a.NO_LOCAL_THRESHOLD_CROSSING > .50 && b.NO_LOCAL_THRESHOLD_CROSSING > .50) return 'NO_LOCAL_THRESHOLD_DOMINANT';
  return 'MIXED_NEURAL_ONLY_TEMPORAL_MISALIGNMENT';
}

export function consistency(A, B) {
  const difference = (a, b) => a === null || b === null ? null : a - b;
  return {
    missFractions: Object.fromEntries(MISS_CATEGORIES.map(key => [key, A.missAttribution.fractions[key] - B.missAttribution.fractions[key]])),
    falseEventFractions: Object.fromEntries(FALSE_CATEGORIES.map(key => [key, A.falseEventTiming.fractions[key] - B.falseEventTiming.fractions[key]])),
    medianPeakOffsetSteps: difference(A.localPeakTiming.peakOffsetSteps.median, B.localPeakTiming.peakOffsetSteps.median),
    medianNearestEventOffsetSteps: difference(A.nearestEventDistance.nearestEventOffsetSteps.median, B.nearestEventDistance.nearestEventOffsetSteps.median),
    medianMissedImpactThresholdGap: difference(A.missedImpactThresholdGap.median, B.missedImpactThresholdGap.median),
  };
}
