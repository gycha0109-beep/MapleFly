# prereg_v15n_d6_d2 — causal neural eventizer audit

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / FRESH HOLDOUT COLLECTION / OUTCOME**

Frozen prerequisite:

```text
v15N-D6-D1
  V15N_D6_D1_TEMPORAL_MULTICOUNT_FAILURE

v15N-D6-D1 receipt
  4a2fba1182676c8a7b25a6cb12b4089fcbeb8830
```

Design:

```text
history/design_v15n_d6_d2_causal_neural_eventizer.md
commit 1506ccca14c888ae59b7a2674563179b6b09dd53
```

No replacement POTION policy or detector is trained.

---

## 1. cohorts

TRAIN:

```text
4081000
4091000
4101000
```

EVAL:

```text
4111000
4121000
4131000
```

Original TRAIN->EVAL interruption RNG:

```text
4147000
```

Fresh D2 HOLDOUT, not used by D6-D1:

```text
4391000
4401000
4411000
```

Fresh HOLDOUT interruption RNG:

```text
4427000
```

24 tapes per cohort.

---

## 2. exact prerequisite reproduction

Require exact D6-D1 evidence:

```text
artifact
  10889583735

artifact digest
  sha256:8e145733e95d83f25e548aa05e531357b6e685df7b6e8d8e3bc92f3f5fef84c3

v15n_d6_d1.json sha256
  90fdd058e87d380140aeade0cb4e7a172bb8f4848308969b0c1f9903a100c177
```

Require exact frozen D6 detector reproduction:

```text
threshold absolute error <= 1e-12
separation absolute error <= 1e-12
weights sha256 exact
  5dc677cf4c14e398465af72cbcff784e40163cdf702064359e7f4648319c9eb5
```

Require original EVAL D6-D1 attribution reproduction to 1e-12 for:

- backgroundMassFraction;
- duplicateMassFraction;
- per-hit CV;
- median positive frames per hit.

Any failure invalidates D2.

---

## 3. eventizer

Frozen before outcome:

```text
positive
  margin > 0

initial armed
  true

emit
  first positive frame while armed

disarm
  immediately after emit

re-arm
  after 3 consecutive non-positive frames
```

No alternative re-arm windows are evaluated.

---

## 4. event-level support

Each cohort must contain:

```text
physical hits >= 500
neural events >= 300
24 tapes
```

Otherwise:

```text
V15N_D6_D2_IMPLEMENTATION_OR_SUPPORT_INVALID
```

---

## 5. event-level metrics

True-positive neural event:

```text
exists physical hit with
0 <= eventStep - hitStep < 10
```

Recalled physical hit:

```text
exists neural event with
0 <= eventStep - hitStep < 10
```

Report:

```text
precision
recall
F1
false neural events per episode
```

Define:

```text
eventDetectionStable =
  EVAL precision >= 0.75
  AND EVAL recall >= 0.75
  AND HOLDOUT precision >= 0.75
  AND HOLDOUT recall >= 0.75
```

---

## 6. cumulative direct count metrics

At every decision snapshot:

```text
prediction = cumulative neural event count
target = cumulative physical hit count
```

Report MAE / RMSE / Pearson / mean signed error.

Define:

```text
directCountStable =
  EVAL MAE <= 1.0 hit
  AND HOLDOUT MAE <= 1.0 hit
  AND abs(EVAL mean signed error) <= 0.75 hit
  AND abs(HOLDOUT mean signed error) <= 0.75 hit
```

---

## 7. decision-position residual metrics

Fit TRAIN-only decision-position means for neural event count and physical hit count.

```text
neuralResidual =
  eventCount - TRAIN meanEventCount[decision]

hitResidual =
  physicalHitCount - TRAIN meanHitCount[decision]
```

No scalar calibration is fit.

Report residual R2 / MAE / RMSE / Pearson.

Define:

```text
residualStable =
  EVAL R2 >= 0.30
  AND HOLDOUT R2 >= 0.30
  AND EVAL MAE <= 1.0 hit
  AND HOLDOUT MAE <= 1.0 hit
```

---

## 8. episode-shift control

Shift neuralResidual to the next episode at the same decision index.

Define:

```text
episodeSpecific =
  EVAL (unshifted R2 - shifted R2) >= 0.15
  AND HOLDOUT (unshifted R2 - shifted R2) >= 0.15
```

---

## 9. preregistered outcomes

Precedence top to bottom.

### Invalid

Any provenance, ecology, support, or frozen reproduction failure:

```text
V15N_D6_D2_IMPLEMENTATION_OR_SUPPORT_INVALID
```

### Causal neural event count demonstrated

If:

```text
eventDetectionStable
AND directCountStable
AND residualStable
AND episodeSpecific
```

then:

```text
V15N_D6_D2_CAUSAL_NEURAL_EVENT_COUNT_DEMONSTRATED
```

### Event detection works but cumulative count remains unstable

If:

```text
eventDetectionStable
AND NOT (
  directCountStable
  AND residualStable
  AND episodeSpecific
)
```

then:

```text
V15N_D6_D2_EVENT_DETECTION_STABLE_COUNT_NOT_DEMONSTRATED
```

### Eventizer itself unstable

If:

```text
NOT eventDetectionStable
```

then:

```text
V15N_D6_D2_EVENTIZER_NOT_STABLE
```

Otherwise:

```text
V15N_D6_D2_INCONCLUSIVE
```

---

## 10. stop rule

After the first authoritative result do not change:

- cohorts/seeds;
- D6 detector;
- positive threshold;
- three-negative-frame re-arm;
- event matching window;
- support gates;
- precision/recall gates;
- count MAE/bias gates;
- residual R2/MAE gates;
- episode-shift gate.

Do not deploy the oracle-trained D6 detector.
Do not train a replacement POTION policy.
Do not modify v15D.

```text
POTION v15D
  DEPLOYED

v15N
  CLOSED / BLOCKED

v16C
  BLOCKED
```
