# design_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_anchored_delta3_quadratic256

## Question

The frozen PCA32_ANCHORED_DELTA3 confirmatory failure attribution established:

```text
missAxis = NO_THRESHOLD_DOMINANT
```

with more than 92% of misses on both confirmation cohorts failing to reach the frozen threshold inside the 200 ms matching window.

At the same time:

- refractory-suppressed misses = 0;
- matching-conflict misses = 0;
- carryover is only about 7–8%;
- the base anchored-delta3 representation had already demonstrated useful prospective signal.

This experiment asks:

> Does a minimal pointwise nonlinear readout of the exact same causal anchored-delta3 neural representation improve score sensitivity and produce a robust prospective event stream without changing eventization?

The representation horizons and upstream PCA32 basis remain frozen.

The only representational extension is elementwise quadratic energy.

---

## 1. frozen prerequisite

Require authoritative failure attribution:

```text
result
  49ae3072627f41aa71534114aa89c31f6ce0d9bf

receipt
  201fa22eded2aa4606a1f29a90705a075503d574

run
  36946779676

artifact
  11205110870

artifact digest
  sha256:4cc65f58cdfad2306c6e95f3dd71559f66982db9051d6ec705740d6a26078671

JSON sha256
  e17825f01a6f1b61ea8035c7c1779c8499a5f08b85aed1da0e7ddbd236ff9764

missAxis
  NO_THRESHOLD_DOMINANT
```

Also preserve the exact frozen D6 residualization, innovation PCA32 basis, 1316-DN order, and PCA32_ANCHORED_DELTA3 base feature.

---

## 2. frozen base feature

For each eligible frame t:

```text
z_t = frozen PCA32 innovation projection

base128_t = [
  z_t,
  z_t-z_(t-1),
  z_t-z_(t-3),
  z_t-z_(t-5)
]
```

Dimension:

```text
128
```

Horizons remain exactly:

```text
1 / 3 / 5 frames
20 / 60 / 100 ms
```

No future frames.

---

## 3. QUADRATIC256 feature

First compute TRAIN-only unweighted mean/std of the 128 base features:

```text
u_j = (base_j - mean_j) / scale_j
```

Then construct:

```text
q_t = [
  u_1 ... u_128,
  u_1^2 ... u_128^2
]
```

Dimension:

```text
256
```

Then compute a second TRAIN-only unweighted mean/std for q_t and standardize all 256 components before ridge fitting and inference.

This gives equal regularization scale to signed and energy channels.

No cross-products:

```text
u_i * u_j, i != j
```

are allowed.

No interaction search, polynomial-degree search, learned basis expansion, kernel, hidden layer, recurrence, or temporal-depth change.

---

## 4. dedicated QUADRATIC_TRAIN cohort

Exactly:

```text
6981000 6991000 7001000 7011000
7021000 7031000 7041000 7051000

interruption
7067000
```

Exactly 64 tapes.

No prior prospective, confirmation, audit, or attribution cohort enters fitting.

---

## 5. TRAIN strata and labels

Use the same frozen precedence:

### REALIZED_IMPACT

```text
latest physical hit exists
and
0 <= frameStep-latestHitStep < 10
```

### PRE_HIT

```text
not REALIZED_IMPACT
and
next physical hit exists
and
0 < nextHitStep-frameStep < 10
```

### TRUE_BACKGROUND

otherwise.

Binary target:

```text
REALIZED_IMPACT -> 1
PRE_HIT         -> 0
TRUE_BACKGROUND -> 0
```

Runtime receives no evaluator label.

---

## 6. sample weighting and ridge

Frozen total stratum weights:

```text
REALIZED_IMPACT  1/3
PRE_HIT          1/3
TRUE_BACKGROUND  1/3
```

Per-row weight = total stratum weight / stratum row count.

Ridge:

```text
lambda = 1e-3
intercept unregularized
```

No sigmoid.

Runtime score:

```text
quadraticScore_t =
  intercept + beta dot standardized(q_t)
```

---

## 7. dedicated CALIBRATION cohort

Exactly:

```text
7071000 7081000 7091000 7101000
7111000 7121000 7131000 7141000

interruption
7157000
```

Exactly 64 tapes.

Threshold selection occurs only here.

---

## 8. threshold candidates

Exactly:

```text
0
plus every distinct finite positive quadraticScore on CALIBRATION frames
```

Exact JavaScript Number deduplication, ascending sort.

No TRAIN or prospective score enters candidate generation.

---

## 9. eventizer and matching

Frozen eventizer:

```text
positive_t = quadraticScore_t >= tau
crossing_t = positive_t && !positive_(t-1)
refractory = 10 simulation steps
```

Frozen evaluator matching:

```text
earliest unmatched event
with eventStep >= hitStep
and eventStep-hitStep < 10
```

No persistence, hysteresis, peak detector, second threshold, delayed matching, or refractory change.

---

## 10. support

TRAIN requires:

```text
64 tapes
REALIZED_IMPACT >= 1000 rows
PRE_HIT >= 500 rows
TRUE_BACKGROUND >= 5000 rows
```

CALIBRATION requires:

```text
64 tapes
physical impacts >= 1000
threshold candidates >= 100
```

Otherwise:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_INSUFFICIENT_SUPPORT
```

---

## 11. calibration gates

A candidate is feasible only if all:

```text
precision >= 0.75
recall >= 0.75
F1 >= 0.75
0.80 <= eventCountRatio <= 1.20
meanAbsolutePerTapeCountError <= 5.0
```

If no feasible candidate:

```text
...D1_ANCHORED_DELTA3_QUADRATIC256_CALIBRATION_NO_FEASIBLE_THRESHOLD
```

and no prospective evaluation.

---

## 12. deterministic threshold selection

Among feasible candidates choose lexicographically:

```text
1 maximum F1
2 minimum abs(eventCountRatio - 1)
3 minimum meanAbsolutePerTapeCountError
4 maximum precision
5 maximum recall
6 maximum threshold
```

Freeze before fresh prospective evaluation.

---

## 13. fresh prospective cohorts

PROSPECTIVE_A:

```text
7161000 7171000 7181000 7191000
7201000 7211000 7221000 7231000

interruption
7247000
```

PROSPECTIVE_B:

```text
7251000 7261000 7271000 7281000
7291000 7301000 7311000 7321000

interruption
7337000
```

Exactly 64 tapes each.

These cohorts have not been used in prior fitting, calibration, prospective, confirmation, or attribution work.

---

## 14. frozen comparator

On the same fresh prospective cohorts evaluate descriptively the frozen linear anchored-delta3 model:

```text
model SHA
  6f2e4c0ec8c7ae438934a1b13db8f062387df3354383b6fab19eac5d8f354105

tau
  0.5918989570787438

same eventizer
same matching
```

Comparator cannot influence quadratic threshold selection.

---

## 15. prospective support and gates

Per cohort require:

```text
64 tapes
physical impacts >= 1000
quadratic events >= 500
```

Both fresh cohorts must independently pass all:

```text
precision >= 0.75
recall >= 0.75
F1 >= 0.75
0.80 <= eventCountRatio <= 1.20
meanAbsolutePerTapeCountError <= 5.0
```

No pooling.

---

## 16. authoritative outcomes

### QUADRATIC256_EVENT_STREAM_DEMONSTRATED

Calibration selects a feasible frozen threshold and both fresh cohorts pass every gate.

### QUADRATIC256_EVENT_STREAM_NOT_DEMONSTRATED

Calibration selects a feasible threshold but one or both fresh cohorts fail at least one gate.

### QUADRATIC256_CALIBRATION_NO_FEASIBLE_THRESHOLD

No calibration threshold passes all gates.

### INSUFFICIENT_SUPPORT

Any support floor fails.

---

## 17. interpretation

A success would show that the anchored-delta3 neural information is sufficient but a purely linear score is too restrictive; pointwise energy terms recover robust sensitivity.

A failure would indicate that elementwise magnitude nonlinearity is insufficient and a richer neural readout or representation is needed.

This remains evaluator-supervised and nondeployable.

---

## 18. stop rule / deployment

After the first authoritative run do not change:

- base 128D definition;
- 1/3/5-frame horizons;
- quadratic construction;
- 256D width;
- two-stage TRAIN standardization;
- TRAIN/CALIBRATION/prospective cohorts;
- labels and precedence;
- stratum weights;
- ridge lambda;
- threshold candidate construction;
- selection order;
- refractory;
- matching;
- gates.

No prospective retuning.

```text
diagnosticStackDeployable = false
POTION v15D  DEPLOYED
v15N         CLOSED / BLOCKED
v16C         BLOCKED
```
