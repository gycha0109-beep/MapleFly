# design_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_three_class_temporal3

## Question

The frozen evidence chain now establishes:

```text
D4-D2-D1
  falseEventAxis = BACKGROUND_DOMINANT
  missAxis       = NO_POSITIVE_DOMINANT

D4-D2-D1-D1
  scalarAxis     = PRECISION_RECALL_TRADEOFF
```

The exact PCA32_TEMPORAL3 feature therefore contains useful impact information, but compressing the three evaluator strata into one binary ridge scalar cannot simultaneously preserve impact sensitivity and reject background.

D4-D2-D1-D1-D1 asks:

> If the same frozen causal 96-D TEMPORAL3 feature is decoded with separate TRAIN-only linear readouts for REALIZED_IMPACT, PRE_HIT, and TRUE_BACKGROUND, can a threshold-free three-class decision produce a robust causal physical-impact event stream on fresh cohorts?

This changes the **readout geometry only**.

It does not deepen temporal history, change PCA, tune thresholds, change refractory timing, or use any runtime oracle state.

---

## 1. frozen prerequisite

Require authoritative D4-D2-D1-D1:

```text
result
  e894cb6d4c58b739bc8e789d6aedeec1d1a1651f

receipt
  c9e39c85bfd541db383305b43ec487d3372dccee

run
  36530978516

artifact
  11018846070

JSON sha256
  8e100496082be0c38bf66f24b1b0fdfe5e0115486831e7c38fa094a12a404fc9

scalarAxis
  PRECISION_RECALL_TRADEOFF
```

Also require the exact frozen D4-D2 model/preprocessing provenance.

---

## 2. frozen feature representation

Exactly preserve:

```text
D6 phase-residualized DN representation
innovation PCA32
TEMPORAL3 = [z_(t-2), z_(t-1), z_t]
dimension = 96
temporal depth = 3
1316-D DN identity/order
```

No future neural frames.

No runtime physical hit, contact, HP, damage, seed, future state, or oracle label.

---

## 3. TRAIN labels

Use exactly the existing D4 evaluator-only frame strata and precedence:

```text
REALIZED_IMPACT
  latest physical hit age >= 0 and < 10 simulation steps

PRE_HIT
  not REALIZED_IMPACT
  next physical hit age > 0 and < 10 simulation steps

TRUE_BACKGROUND
  otherwise
```

```text
REALIZED_IMPACT > PRE_HIT > TRUE_BACKGROUND
```

These labels are TRAIN/evaluation-only. The resulting readout remains diagnostic and nondeployable.

---

## 4. three-class ridge readout

Use the exact D4 TRAIN-only unweighted feature mean/std standardization.

Fit three deterministic ridge least-squares heads over the same standardized 96-D feature:

```text
head REALIZED_IMPACT:
  target 1 for REALIZED_IMPACT, else 0

head PRE_HIT:
  target 1 for PRE_HIT, else 0

head TRUE_BACKGROUND:
  target 1 for TRUE_BACKGROUND, else 0
```

For every head use:

```text
ridge lambda = 1e-3
intercept unregularized
same TRAIN rows
same sample weights
```

Per-row sample weight remains exactly:

```text
REALIZED_IMPACT  1 / (3 * N_realized)
PRE_HIT          1 / (3 * N_prehit)
TRUE_BACKGROUND  1 / (3 * N_background)
```

Prediction:

```text
predictedClass = argmax(
  score_REALIZED_IMPACT,
  score_PRE_HIT,
  score_TRUE_BACKGROUND
)
```

Tie-breaking order is frozen:

```text
REALIZED_IMPACT
PRE_HIT
TRUE_BACKGROUND
```

No probability transform and no score threshold.

---

## 5. causal eventizer

For each tape:

```text
positive_t = predictedClass_t == REALIZED_IMPACT
risingEdge_t = positive_t && !positive_(t-1)
```

Initialize:

```text
previousPositive = false
lastEmittedEventStep = null
```

Emit a neural event on a rising edge only when:

```text
lastEmittedEventStep is null
OR
currentStep - lastEmittedEventStep >= 10
```

Thus the existing 200 ms refractory is frozen.

No persistence, hysteresis, re-arm search, class-score threshold, or temporal-depth search.

---

## 6. evaluator matching

Evaluator-only matching remains exactly D4-D2:

For each physical hit, greedily match the earliest unmatched emitted event satisfying:

```text
eventStep >= hitStep
eventStep - hitStep < 10
```

Pre-hit neural events are never matched forward.

---

## 7. TRAIN and fresh prospective cohorts

TRAIN remains exactly:

```text
base seeds
  4081000 4091000 4101000

interruption
  4147000
```

Fresh PROSPECTIVE_A:

```text
5631000 5641000 5651000 5661000
5671000 5681000 5691000 5701000

interruption
5717000
```

Fresh PROSPECTIVE_B:

```text
5721000 5731000 5741000 5751000
5761000 5771000 5781000 5791000

interruption
5807000
```

Exactly 64 tapes per prospective cohort.

None of the D4, D4-D1, D4-D2, D4-D2-D1, or D4-D2-D1-D1 prospective/audit cohorts may enter fitting or gate selection.

---

## 8. frozen binary baseline

On the same fresh A/B cohorts also evaluate the exact frozen D4-D2 binary TEMPORAL3 readout:

```text
model SHA
  4cb231aaf0c0f19b89dbc26f202aa2e50890e56452f1971627389cf63a5791a1

threshold
  0.5

same rising edge
same refractory
same matching
```

This baseline is descriptive only.

No result-dependent threshold modification is permitted.

---

## 9. frame-level descriptive metrics

For THREE_CLASS_TEMPORAL3 report per cohort:

- support rows by stratum;
- 3x3 confusion counts;
- per-class recall;
- macro recall.

These are descriptive diagnostics only.

---

## 10. primary event-stream metrics

For frozen binary baseline and THREE_CLASS_TEMPORAL3, report:

```text
physical impacts
neural events
matched
false events
missed impacts
precision
recall
F1
event / impact ratio
mean tape absolute count error
median matched latency
p90 matched latency
rising edges
refractory suppressed
```

For the three-class stream also report unmatched-event timing fractions:

```text
PRE_HIT_200MS
RECENT_POST_HIT_200MS
BACKGROUND_200MS
```

descriptively.

---

## 11. support gates

For each fresh cohort require:

```text
64 tapes
physical impacts >= 1000
emitted THREE_CLASS neural events >= 500
REALIZED_IMPACT frame rows >= 1000
PRE_HIT frame rows >= 500
TRUE_BACKGROUND frame rows >= 500
```

---

## 12. primary event-stream gates

Use the exact D4-D2 gates unchanged on THREE_CLASS_TEMPORAL3:

```text
precision >= 0.75
recall >= 0.75
F1 >= 0.75
0.80 <= event/impact ratio <= 1.20
mean tape absolute count error <= 5.0
```

All five must pass on both prospective cohorts.

No relative-improvement gate is sufficient by itself.

---

## 13. preregistered interpretation

### THREE_CLASS_EVENT_STREAM_DEMONSTRATED

The three-class stream passes all frozen event gates on both fresh cohorts.

This establishes that the failure was caused by binary scalar compression rather than the frozen TEMPORAL3 feature itself.

It still does not authorize deployment because evaluator labels were used for TRAIN fitting.

### THREE_CLASS_EVENT_STREAM_NOT_DEMONSTRATED

Adequate support, but one or more frozen event gates fail on either cohort.

Then do not tune class scores, thresholds, regularization, temporal depth, or refractory on these cohorts.

A failure-attribution step is required before another representation repair.

---

## 14. deployment

Throughout:

```text
POTION v15D  DEPLOYED
v15N         CLOSED / BLOCKED
v16C         BLOCKED
```

The diagnostic readout is nondeployable.
