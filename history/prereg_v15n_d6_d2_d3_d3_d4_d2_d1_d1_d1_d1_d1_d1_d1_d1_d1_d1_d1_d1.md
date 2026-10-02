# prereg_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1 — anchored-delta3 quadratic256

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / OUTCOME**

Design:

```text
history/design_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_anchored_delta3_quadratic256.md
commit 79ccffa291a6dc707fc3c4b667adcebff21fe94f
```

Frozen prerequisite:

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

## Frozen base representation

```text
base128_t = [
  z_t,
  z_t-z_(t-1),
  z_t-z_(t-3),
  z_t-z_(t-5)
]
```

with exact frozen D6 residualization, innovation PCA32 basis, DN order, and 1/3/5-frame horizons.

## QUADRATIC256 construction

From QUADRATIC_TRAIN only:

1. compute unweighted mean/std for each base128 feature;
2. standardize base128 to u;
3. construct q=[u, u^2], dimension 256;
4. compute unweighted TRAIN mean/std for q;
5. standardize q for ridge fitting and all later inference.

No cross-products, kernels, hidden layers, recurrence, or degree search.

## QUADRATIC_TRAIN

```text
6981000 6991000 7001000 7011000
7021000 7031000 7041000 7051000
interruption 7067000
```

Exactly 64 tapes.

## Labels / weighting

Strata precedence:

```text
REALIZED_IMPACT
PRE_HIT
TRUE_BACKGROUND
```

Target:

```text
REALIZED_IMPACT -> 1
others          -> 0
```

Total sample weights:

```text
REALIZED_IMPACT  1/3
PRE_HIT          1/3
TRUE_BACKGROUND  1/3
```

Ridge:

```text
lambda = 1e-3
intercept unregularized
```

## CALIBRATION

```text
7071000 7081000 7091000 7101000
7111000 7121000 7131000 7141000
interruption 7157000
```

Exactly 64 tapes.

Threshold candidates:

```text
0
plus every distinct finite positive quadraticScore on CALIBRATION
```

## Eventizer / matching

```text
positive_t = quadraticScore_t >= tau
crossing_t = positive_t && !positive_(t-1)
refractory = 10 steps

matching =
  earliest unmatched event in [hit, hit+10)
```

No alternate eventizer.

## TRAIN support

```text
64 tapes
REALIZED_IMPACT >= 1000
PRE_HIT >= 500
TRUE_BACKGROUND >= 5000
```

## CALIBRATION support

```text
64 tapes
physical impacts >= 1000
threshold candidates >= 100
```

## Calibration gates

All:

```text
precision >= 0.75
recall >= 0.75
F1 >= 0.75
0.80 <= eventCountRatio <= 1.20
meanAbsolutePerTapeCountError <= 5.0
```

If none feasible:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_ANCHORED_DELTA3_QUADRATIC256_CALIBRATION_NO_FEASIBLE_THRESHOLD
```

## Selection order

Among feasible candidates:

```text
1 MAX_F1
2 MIN_ABS_EVENT_COUNT_RATIO_MINUS_1
3 MIN_COUNT_MAE
4 MAX_PRECISION
5 MAX_RECALL
6 MAX_THRESHOLD
```

Freeze before prospective evaluation.

## Fresh prospective cohorts

A:

```text
7161000 7171000 7181000 7191000
7201000 7211000 7221000 7231000
interruption 7247000
```

B:

```text
7251000 7261000 7271000 7281000
7291000 7301000 7311000 7321000
interruption 7337000
```

Exactly 64 tapes each.

## Frozen comparator

On the same fresh cohorts evaluate descriptively:

```text
linear anchored-delta3 model SHA
  6f2e4c0ec8c7ae438934a1b13db8f062387df3354383b6fab19eac5d8f354105

tau
  0.5918989570787438
```

Comparator cannot affect quadratic model/threshold selection.

## Prospective support

Per cohort:

```text
64 tapes
physical impacts >= 1000
quadratic events >= 500
```

## Prospective gates

Both fresh cohorts independently pass all:

```text
precision >= 0.75
recall >= 0.75
F1 >= 0.75
0.80 <= eventCountRatio <= 1.20
meanAbsolutePerTapeCountError <= 5.0
```

No pooling.

## Authoritative outcomes

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_ANCHORED_DELTA3_QUADRATIC256_EVENT_STREAM_DEMONSTRATED

V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_ANCHORED_DELTA3_QUADRATIC256_EVENT_STREAM_NOT_DEMONSTRATED

V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_ANCHORED_DELTA3_QUADRATIC256_CALIBRATION_NO_FEASIBLE_THRESHOLD

V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_INSUFFICIENT_SUPPORT
```

## Stop rule

No post-run changes to feature degree, width, horizons, cohorts, labels, weights, lambda, threshold candidates, selection order, refractory, matching, or gates.

No prospective retuning.

```text
diagnosticStackDeployable = false
POTION v15D  DEPLOYED
v15N         CLOSED / BLOCKED
v16C         BLOCKED
```
