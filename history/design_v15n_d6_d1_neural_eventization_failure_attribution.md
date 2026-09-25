# design_v15n_d6_d1_neural_eventization_failure_attribution

## Question

v15N-D6 established two facts under the frozen cohort contract:

1. a TRAIN-only phase-residualized MaleCNS recent-impact detector transfers at about 90% balanced accuracy;
2. summing its rectified frame-wise evidence does not generalize as cumulative injury.

v15N-D6-D1 does not train a new detector or policy. It asks why the already-frozen D6 detector fails when naively integrated.

---

## Frozen D6 detector

Reproduce the exact D6 detector from the exact D6 TRAIN cohort and verify against the authoritative D6 evidence:

```text
threshold
  0.1367936045430042

separation
  0.7830625725367281

weights sha256
  5dc677cf4c14e398465af72cbcff784e40163cdf702064359e7f4648319c9eb5
```

No detector threshold, labels, phase residualization, or cohort is retuned.

Frame evidence remains:

```text
margin_t = dot(w, residual_t) - threshold
e_t = max(0, margin_t) / separation
```

---

## Evaluator-only attribution

For each 100 ms frame, use the evaluator's real damage-event history only to attribute the frozen neural evidence.

Categories are based on age from the most recent real damage event:

```text
RECENT
  0 <= age < 0.2 s

LINGER
  0.2 s <= age < 2.0 s

BACKGROUND
  no prior damage
  OR age >= 2.0 s
```

These labels never enter a runtime policy.

Every frame belongs to exactly one category.

---

## Per-impact eventization audit

Assign every positive-evidence frame with age <2.0 s to the most recent real damage event.

For each physical damage event report:

- total assigned evidence mass;
- number of supra-threshold frames;
- first supra-threshold frame latency;
- evidence mass after the first supra-threshold frame.

Define:

```text
duplicateEvidenceMass
  = hit-attributed evidence after the first positive frame of each hit

duplicateMassFraction
  = duplicateEvidenceMass / total hit-attributed evidence
```

This directly tests whether one physical hit is being counted repeatedly by frame-wise accumulation.

---

## Background leakage audit

Define:

```text
backgroundMassFraction
  = BACKGROUND evidence mass / all evidence mass

backgroundPositiveFrameRate
  = positive BACKGROUND frames / all BACKGROUND frames
```

Also report background evidence mass per simulated second.

This tests whether small detector false positives accumulate even when no recent physical hit exists.

---

## Per-hit amplitude stability

For each cohort, compute evidence mass assigned to each physical hit before the next hit or 2 seconds, whichever comes first.

Report:

- mean;
- median;
- standard deviation;
- coefficient of variation;
- p10 / p90.

Also report the ratio of EVAL and HOLDOUT mean hit evidence.

This distinguishes a stable event-count-like pulse from cohort-dependent amplitude.

---

## Scientific purpose

D6-D1 is failure attribution only.

It may support a later architecture such as:

```text
neural detector
  -> rising-edge / refractory eventizer
  -> causal event count / belief state
```

but D6-D1 itself does not deploy such an eventizer.

The oracle-trained D6 detector remains diagnostic-only and non-deployable.

---

## Deployment

```text
POTION v15D
  DEPLOYED

v15N
  CLOSED / BLOCKED

v16C
  BLOCKED
```
