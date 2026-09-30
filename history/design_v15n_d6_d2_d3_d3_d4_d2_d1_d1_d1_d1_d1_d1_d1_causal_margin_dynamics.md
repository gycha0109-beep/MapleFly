# design_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_d1_d1_causal_margin_dynamics

## Question

D4-D2-D1-D1-D1-D1-D1-D1 established:

```text
missAxis = NO_THRESHOLD_DOMINANT
```

under the frozen absolute margin-crossing eventizer:

```text
tau = 0.2378919189622094

A NO_THRESHOLD_WINDOW = 0.862791
B NO_THRESHOLD_WINDOW = 0.874674
```

The remaining misses are therefore mostly not eventizer mechanics. The frozen absolute margin simply does not rise high enough within 200 ms.

This experiment asks:

> Does short causal history of the frozen three-class margin contain impact-evoked dynamics that are lost by an absolute-margin threshold?

The new representation is deliberately small and causal.

---

## 1. frozen prerequisite

Require authoritative D4-D2-D1-D1-D1-D1-D1-D1:

```text
result
  a6024e193e19fb11be5edc23f842c8aba7b82749

receipt
  b6475659d97dc18c24efd1ac225e79d899d49481

run
  36716008149

artifact
  11101046573

artifact digest
  sha256:b8201285760a9bbd2d19000a24b22312e974b530320ea33cc8bfc522c66f934b

JSON sha256
  21f2b96ff0f94534b88aa329ae34c11441d42123226953da3884bedf394041f7

missAxis
  NO_THRESHOLD_DOMINANT

three-class model SHA
  cf9d38bbb697c1c2b98aa34f51c6ee39626c68763acbfb1c34e145eb738c7144
```

No prior attribution cohort may be used for fitting or threshold selection.

---

## 2. frozen upstream neural stack

Preserve exactly:

```text
D6 phase-residualized DN representation
innovation PCA32
PCA32_TEMPORAL3
frozen three-class ridge model
raw scores:
  REALIZED_IMPACT
  PRE_HIT
  TRUE_BACKGROUND
```

At each eligible frame:

```text
margin_t =
  score_REALIZED_IMPACT(t)
  - max(score_PRE_HIT(t), score_TRUE_BACKGROUND(t))
```

No physical game state enters runtime inference.

---

## 3. CAUSAL_MARGIN_DYNAMICS6 representation

For every eligible frame t with six available consecutive margin frames define:

```text
x_t = [
  margin_(t-5),
  margin_(t-4),
  margin_(t-3),
  margin_(t-2),
  margin_(t-1),
  margin_t
]
```

Dimension:

```text
6
```

At 20 ms per simulation step, the oldest-to-current separation is 100 ms.

Rationale:

- the previous age audit showed materially stronger neural impact information after the earliest 100 ms;
- the latest failure attribution shows the absolute current margin is often sub-threshold;
- a linear filter over the recent causal margin history can represent rising/falling/transient structure without future samples or a recurrent state machine.

No handcrafted derivative, peak, minimum, hysteresis, or second event variable is added.

---

## 4. dedicated DYNAMICS_TRAIN cohort

Train the new readout only on a completely new cohort:

```text
base seeds
  6081000 6091000 6101000 6111000
  6121000 6131000 6141000 6151000

interruption
  6167000
```

Exactly 64 tapes.

These tapes may be used for model fitting only.

---

## 5. TRAIN labels

For every eligible dynamics frame, evaluator-only offline target:

```text
y = 1
  iff latest physical hit satisfies
  0 <= frameStep-hitStep < 10

y = 0
  otherwise
```

If multiple hits qualify, latest hit wins.

These labels are never available to runtime inference.

---

## 6. TRAIN standardization and ridge readout

On DYNAMICS_TRAIN only:

1. compute unweighted mean/std for each of six features;
2. standardize all six features;
3. add intercept;
4. fit deterministic ridge least squares binary readout.

Sample weights:

```text
positive total weight = 0.5
negative total weight = 0.5
```

Therefore each positive row receives:

```text
0.5 / N_positive
```

and each negative row:

```text
0.5 / N_negative
```

Ridge:

```text
lambda = 1e-3
intercept unregularized
```

Runtime dynamics score:

```text
dynamicsScore_t = intercept + beta dot standardized(x_t)
```

No sigmoid is required.

---

## 7. dedicated CALIBRATION cohort

Threshold selection is allowed only on:

```text
base seeds
  6171000 6181000 6191000 6201000
  6211000 6221000 6231000 6241000

interruption
  6257000
```

Exactly 64 tapes.

No generalization claim is attached to calibration.

---

## 8. calibration threshold candidates

Candidate thresholds are exactly:

```text
0
plus every distinct finite positive dynamicsScore observed on CALIBRATION frames
```

Sort ascending and deduplicate by exact JavaScript Number equality.

No score from TRAIN, prior attribution cohorts, or prospective cohorts enters the candidate set.

---

## 9. eventizer

For candidate threshold tau:

```text
positive_t = dynamicsScore_t >= tau
crossing_t = positive_t && !positive_(t-1)
```

Initialize per tape:

```text
previousPositive = false
lastEmittedEventStep = null
```

Emit a crossing only if:

```text
lastEmittedEventStep is null
OR
currentStep-lastEmittedEventStep >= 10
```

Refractory remains 10 simulation steps / 200 ms.

No persistence, hysteresis, derivative threshold, peak detector, re-arm timer, or secondary threshold.

---

## 10. evaluator matching

Exactly preserve:

```text
for each physical hit:
  earliest unmatched emitted event
  with eventStep >= hitStep
  and eventStep-hitStep < 10
```

Pre-hit events are never matched forward.

---

## 11. calibration support

Require:

```text
64 tapes
physical impacts >= 1000
positive TRAIN rows >= 1000
negative TRAIN rows >= 5000
threshold candidates >= 100
```

Otherwise calibration/training support is insufficient.

---

## 12. calibration gates

For every threshold candidate compute:

```text
precision
recall
F1
eventCountRatio
meanAbsolutePerTapeCountError
medianMatchedLatencySeconds
p90MatchedLatencySeconds
risingEdges
refractorySuppressed
```

Feasible only if all:

```text
precision >= 0.75
recall >= 0.75
F1 >= 0.75
0.80 <= eventCountRatio <= 1.20
meanAbsolutePerTapeCountError <= 5.0
```

If none is feasible:

```text
...CAUSAL_MARGIN_DYNAMICS6_CALIBRATION_NO_FEASIBLE_THRESHOLD
```

and no prospective claim is made.

---

## 13. deterministic threshold selection

Among feasible thresholds choose lexicographically:

```text
1 maximum F1
2 minimum abs(eventCountRatio - 1)
3 minimum meanAbsolutePerTapeCountError
4 maximum precision
5 maximum recall
6 maximum threshold
```

Freeze before prospective evaluation.

---

## 14. fresh prospective cohorts

Only if calibration selects a feasible threshold.

PROSPECTIVE_A:

```text
6261000 6271000 6281000 6291000
6301000 6311000 6321000 6331000

interruption
6347000
```

PROSPECTIVE_B:

```text
6351000 6361000 6371000 6381000
6391000 6401000 6411000 6421000

interruption
6437000
```

Exactly 64 tapes each.

No TRAIN or CALIBRATION parameter may be changed after these tapes are observed.

---

## 15. frozen comparator

On the same prospective tapes evaluate descriptively the previous frozen margin-crossing eventizer:

```text
three-class margin
tau = 0.2378919189622094
crossing eventizer
refractory 10
same matching
```

Comparator does not affect selection.

---

## 16. prospective support and gates

Require per cohort:

```text
64 tapes
physical impacts >= 1000
dynamics events >= 500
```

Apply exact primary gates:

```text
precision >= 0.75
recall >= 0.75
F1 >= 0.75
0.80 <= eventCountRatio <= 1.20
meanAbsolutePerTapeCountError <= 5.0
```

Both cohorts must pass.

---

## 17. authoritative outcomes

### CAUSAL_MARGIN_DYNAMICS6_EVENT_STREAM_DEMONSTRATED

Training/calibration provenance is valid and the frozen dynamics readout + calibration-selected threshold passes all primary gates on both fresh prospective cohorts.

### CAUSAL_MARGIN_DYNAMICS6_EVENT_STREAM_NOT_DEMONSTRATED

A feasible threshold was frozen on calibration but one or both fresh cohorts fail at least one primary gate.

Do not retune from prospective results.

### CAUSAL_MARGIN_DYNAMICS6_CALIBRATION_NO_FEASIBLE_THRESHOLD

No calibration threshold satisfies all gates.

### INSUFFICIENT_SUPPORT

Training/calibration/prospective support floor fails.

---

## 18. deployment

This remains a diagnostic readout because physical-hit truth is used for offline training/calibration labels.

```text
diagnosticStackDeployable = false
POTION v15D  DEPLOYED
v15N         CLOSED / BLOCKED
v16C         BLOCKED
```

No deployment change is authorized by this experiment.
