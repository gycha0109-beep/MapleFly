# design_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_neural_only_predictive_surprise32_failure_attribution

## Question

The neural-only predictive-surprise32 bridge satisfied its support and provenance contracts but failed prospective A/B event-stream gates severely.

Frozen prerequisite observations:

```text
A precision  0.1337979094
A recall     0.1099026903
A F1         0.1206788184
A event/hit  0.8214081282

B precision  0.1250000000
B recall     0.1009389671
B F1         0.1116883117
B event/hit  0.8075117371
```

Event count is in the intended order of magnitude, but temporal matching is poor.

This attribution asks:

> Under the exact frozen neural-only model, threshold, and eventizer, where in time does predictive surprise occur relative to physical impacts, and what mechanism explains the large false-event and missed-impact counts?

This is attribution only.

No model refit, PCA change, threshold/quantile search, lag search, score transformation, eventizer change, refractory change, matching change, or deployment change is permitted.

---

## 1. frozen prerequisite

Require the authoritative neural-only failure:

```text
result
  7b2af77b2a4b3bdcd39723b53c4bce2feb3c63d8

receipt
  b0223bc3be4452773ab9fad5b83ef4d7712b4660

run
  37081864923

job
  111083917653

head
  c36f5d71be49336369adef19c892565d2b3e94cf

artifact
  11261347073

artifact digest
  sha256:9a1b598b06faa99568f902794ddaf9042d7d2ca5dcf5224a4b17792e4659c3cc

JSON sha256
  78549dfb7514c4d3732ca9e4f6239ad6b1bc88162cf10312b661494b1bbc9546

model SHA
  de8cc3c24cbb91a3a9a806aa2afe37ecd0294c0d2c4b5ce2d4a93c25d77a1cde

q
  0.95

threshold
  1.574078960908224
```

Exact prerequisite A/B metrics must be reproduced before attribution.

---

## 2. attribution cohorts

Reuse exactly the failed prospective cohorts only for failure attribution.

A:

```text
7701000 7711000 7721000 7731000
7741000 7751000 7761000 7771000
interruption 7787000
```

B:

```text
7791000 7801000 7811000 7821000
7831000 7841000 7851000 7861000
interruption 7877000
```

Exactly 64 tapes each.

These cohorts are now attribution/audit cohorts.

No new generalization claim, fitting, threshold selection, feature selection, or repair selection may use them.

---

## 3. exact frozen diagnostic stack

Reconstruct exactly:

```text
phase count          48
innovation history    5
PCA components       32
PCA fit rows         240
predictor lags        1 / 3 / 5
predictor width       96
ridge                 0.001
q                     0.95
tau                   1.574078960908224
refractory            10
```

Runtime score:

```text
surprise_t = mean_j(normalized_prediction_residual_j^2)
```

Eventizer:

```text
positive_t = surprise_t >= tau
crossing_t = positive_t && !positive_(t-1)
emit only when refractory is clear
```

Evaluator matching remains:

```text
earliest unmatched neural event
with eventStep >= hitStep
and eventStep-hitStep < 10
```

Physical truth remains evaluator/attribution only. It must not alter model state or event generation.

---

## 4. exact reproduction gate

Before any attribution output is accepted, require exact reproduction of:

```text
model SHA
threshold
A/B physicalImpacts
A/B neuralEvents
A/B matched
A/B falseEvents
A/B missedImpacts
A/B precision
A/B recall
A/B F1
A/B eventCountRatio
A/B count MAE
```

Any mismatch produces:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_NEURAL_ONLY_PREDICTIVE_SURPRISE32_ATTRIBUTION_IMPLEMENTATION_OR_PROVENANCE_INVALID
```

No attribution conclusion is allowed after a reproduction failure.

---

## 5. false-event timing attribution

For every unmatched emitted neural event, use frozen precedence:

```text
PRE_HIT_200MS
  a future physical impact exists with
  0 < hitStep-eventStep < 10

RECENT_POST_HIT_200MS
  otherwise a prior physical impact exists with
  0 <= eventStep-hitStep < 10

BACKGROUND
  otherwise
```

Report counts and fractions separately for A and B.

Also report signed distance to the nearest physical impact within +/-20 steps:

```text
nearestImpactOffsetSteps = eventStep - nearestHitStep
```

Negative means the neural event precedes the impact.

No timing offset may be applied to the event stream from this analysis.

---

## 6. missed-impact eventizer attribution

For every unmatched physical impact inspect raw score/eventizer state in:

```text
[hitStep-10, hitStep+20)
```

Classify in frozen precedence:

```text
MATCH_CONFLICT
  an emitted event exists in [hitStep, hitStep+10)
  but was consumed by an earlier impact

REFRACTORY_SUPPRESSED_IN_WINDOW
  a raw rising crossing exists in [hitStep, hitStep+10)
  but emission is blocked only by refractory

PRE_HIT_CROSSING
  otherwise a raw rising crossing exists in [hitStep-10, hitStep)
  and none exists in [hitStep, hitStep+10)

LATE_POST_HIT_CROSSING
  otherwise a raw rising crossing exists in [hitStep+10, hitStep+20)
  and none exists in [hitStep, hitStep+10)

ABOVE_THRESHOLD_NO_CROSSING_IN_WINDOW
  otherwise at least one score in [hitStep, hitStep+10) is >= tau
  but no raw rising crossing occurs there

NO_LOCAL_THRESHOLD_CROSSING
  otherwise
```

This classification is descriptive. No refractory, threshold, matching window, or temporal offset is changed.

---

## 7. local surprise peak timing

For every physical impact compute the maximum finite surprise score in:

```text
[hitStep-10, hitStep+20)
```

Record:

```text
peakScore
peakOffsetSteps = peakStep-hitStep
thresholdGap = tau-peakScore
```

Use earliest step on exact peak ties.

Bucket peak location:

```text
PRE_HIT_PEAK       -10 <= offset < 0
IN_WINDOW_PEAK       0 <= offset < 10
LATE_POST_HIT_PEAK  10 <= offset < 20
```

Report bucket fractions and peakOffsetSteps quantiles:

```text
q10
q25
median
q75
q90
```

Report thresholdGap quantiles for missed impacts only.

No new threshold is selected from thresholdGap.

---

## 8. nearest emitted-event distance for misses

For each missed impact, find the nearest emitted neural event within +/-20 steps.

Record signed:

```text
nearestEventOffsetSteps = eventStep-hitStep
```

If no event exists in that interval, record NONE.

Report:

```text
PRE_200MS      -10 <= offset < 0
IN_WINDOW        0 <= offset < 10
LATE_200MS      10 <= offset < 20
NONE
```

This explicitly tests whether misses are mostly early, late, or unrelated.

---

## 9. background surprise reference

Using the same frozen attribution tapes, define background frames only for descriptive comparison:

```text
distance to every physical impact >= 20 steps
```

Report surprise distribution:

```text
q50
q75
q90
q95
q99
```

Also report the same quantiles for:

```text
PRE_HIT frames       [-10,0)
IN_WINDOW frames     [0,10)
LATE_POST_HIT frames [10,20)
```

No quantile is used for threshold selection.

---

## 10. frozen attribution axis

After exact reproduction and support, assign one axis using strict precedence:

```text
EARLY_PHASE_SHIFT_DOMINANT
  PRE_HIT_CROSSING > 0.50 of misses on both A and B

LATE_PHASE_SHIFT_DOMINANT
  LATE_POST_HIT_CROSSING > 0.50 of misses on both A and B

EVENTIZER_BLOCK_DOMINANT
  (MATCH_CONFLICT + REFRACTORY_SUPPRESSED_IN_WINDOW
   + ABOVE_THRESHOLD_NO_CROSSING_IN_WINDOW) > 0.50
  on both A and B

NO_LOCAL_THRESHOLD_DOMINANT
  NO_LOCAL_THRESHOLD_CROSSING > 0.50 of misses on both A and B

otherwise
  MIXED_NEURAL_ONLY_TEMPORAL_MISALIGNMENT
```

Dominance is strict > 0.50.

The axis is diagnostic only and does not authorize a repair.

---

## 11. A/B consistency

Report A minus B for:

```text
all miss-category fractions
all false-event timing fractions
median peakOffsetSteps
median nearestEventOffsetSteps among non-NONE misses
median missed-impact thresholdGap
```

No significance test or repair-selection threshold is introduced.

---

## 12. support

Require per cohort:

```text
64 tapes
physical impacts >= 1000
neural events >= 500
false events >= 1000
missed impacts >= 1000
finite local peak for >= 99% of impacts
```

Support failure:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_NEURAL_ONLY_PREDICTIVE_SURPRISE32_INSUFFICIENT_ATTRIBUTION_SUPPORT
```

---

## 13. valid outcome

After exact reproduction and support:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_NEURAL_ONLY_PREDICTIVE_SURPRISE32_FAILURE_ATTRIBUTED
```

Must report:

```text
attributionAxis
false-event PRE/POST/BACKGROUND composition
miss-category composition
local peak timing
nearest emitted-event distance
missed-impact threshold-gap distribution
background/pre/in-window/late surprise distributions
A/B consistency
```

---

## 14. next-step interpretation

No repair is implemented here.

If EARLY_PHASE_SHIFT_DOMINANT:
- a separately preregistered causal timing/eventization bridge may test a neural-only early-warning interpretation;
- this attribution cohort may not choose the shift magnitude.

If LATE_PHASE_SHIFT_DOMINANT:
- a separately preregistered delayed neural-response bridge may be considered;
- the evaluator window is not changed from this attribution result.

If EVENTIZER_BLOCK_DOMINANT:
- a separate eventizer audit is required;
- refractory or crossing semantics are not tuned here.

If NO_LOCAL_THRESHOLD_DOMINANT:
- the current self-predictive surprise score lacks local impact sensitivity;
- do not lower q=0.95 from these data;
- a new neural-only representation/score bridge requires fresh train/calibration/prospective cohorts.

If mixed:
- perform a narrower preregistered audit before any repair.

---

## 15. stop rule / deployment

No:

- model refit;
- PCA refit/change;
- predictor lag search;
- score transformation search;
- q change;
- threshold search;
- threshold lowering;
- refractory tuning;
- eventizer modification;
- matching-window modification;
- cohort reuse for generalization;
- deployment change.

```text
diagnosticStackDeployable = false
deployabilityCandidate    = false

POTION v15D  DEPLOYED
v15N         CLOSED / BLOCKED
v16C         BLOCKED
```
