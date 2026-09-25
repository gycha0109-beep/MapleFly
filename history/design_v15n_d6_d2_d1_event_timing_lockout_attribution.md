# design_v15n_d6_d2_d1_event_timing_lockout_attribution

## Question

v15N-D6-D2 froze:

```text
V15N_D6_D2_EVENTIZER_NOT_STABLE
```

The D6 frame detector was stable under its preregistered RECENT-vs-BACKGROUND classification, but the fixed three-negative-frame eventizer had poor physical-hit precision and recall.

D6-D2-D1 asks why.

It does not tune or evaluate an alternative eventizer.

---

## 1. frozen system

Reproduce exactly:

- D6 TRAIN-only phase residualization;
- D6 mean-difference detector;
- D6 threshold and separation;
- D2 three-consecutive-non-positive-frame re-arm eventizer;
- D2 TRAIN / EVAL / HOLDOUT cohorts.

Exact D2 evidence must be reproduced before attribution.

---

## 2. emitted-event timing attribution

For every emitted D2 neural event, find the most recent physical damage event.

Classify:

```text
RECENT
  0 <= age < 0.2 s

LINGER
  0.2 s <= age < 2.0 s

BACKGROUND
  no previous hit
  OR age >= 2.0 s
```

RECENT events are the D2 true-positive event class.

For false events report:

```text
falseLingerFraction
falseBackgroundFraction
```

Also report event counts in finer evaluator-only age bins:

```text
0-0.2 s
0.2-0.5 s
0.5-1.0 s
1.0-2.0 s
>=2.0 s / no previous hit
```

---

## 3. missed-hit attribution

For each physical hit inspect the frozen D6 detector on neural frames in:

```text
0 <= frameStep - hitStep < 10 brain steps
```

A hit is:

```text
RAW_DETECTOR_MISS
  no positive D6 detector frame exists in the recent window

EVENTIZER_SUPPRESSION_MISS
  at least one positive D6 detector frame exists
  but D2 emits no neural event in the recent window

RECALLED
  D2 emits at least one neural event in the recent window
```

This separates detector absence from eventizer state suppression without feeding oracle state into the eventizer.

Report:

- raw-detectable hit fraction;
- recalled hit fraction;
- raw-detector-miss fraction;
- eventizer-suppression-miss fraction;
- eventizer-suppression fraction among all missed hits.

---

## 4. physical inter-hit timing

Evaluator-only, descriptive:

For each hit after the first hit in an episode report the physical inter-hit interval distribution:

- median;
- p10;
- p25;
- p75;
- p90;
- fraction below 0.5 s;
- fraction below 1.0 s;
- fraction below 2.0 s.

This is not used to change D2.

It exists to determine whether a later fixed refractory mechanism could plausibly collapse LINGER responses without necessarily suppressing most genuine subsequent hits.

---

## 5. scientific role

D6-D2-D1 is attribution only.

It must not:

- tune a refractory duration;
- change the D6 detector;
- change the D2 re-arm rule;
- train a replacement POTION policy;
- deploy the oracle-trained D6 detector.

---

## 6. deployment

```text
POTION v15D
  DEPLOYED

v15N
  CLOSED / BLOCKED

v16C
  BLOCKED
```
