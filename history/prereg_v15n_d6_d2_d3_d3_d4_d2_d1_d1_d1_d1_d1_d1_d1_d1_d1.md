# prereg_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_d1_d1_d1_d1 — PCA32 anchored delta3

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / OUTCOME**

Design:

```text
history/design_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_d1_d1_d1_d1_pca32_anchored_delta3.md
commit 2939916f88952eef1e71edd647ed98287f9125fc
```

Frozen prerequisite:

```text
result
  1585c4308e5eccd269c3d04bc2c99481f31f5981

receipt
  18ced2d46249b0edf7bcbf55d34ae07b614dff6e

run
  36787883448

artifact
  11132717991

artifact digest
  sha256:a00cd69befebcb81cc9d837f979f24820a152faf50fe5297a4e07f6cf5944cdb

JSON sha256
  956605344594e575ee0bb4bb3c51a4c333e928f2a7f0071666d021d05a891302

historyUtilityAxis
  HISTORY_NEGLIGIBLE
```

## Frozen upstream representation

Use the exact frozen D6 phase-residualized DN frame and frozen innovation PCA32 basis.

```text
innovation_t =
  residual_t
  - mean(residual_(t-1) ... residual_(t-5))

z_t = frozen PCA32(innovation_t)
dimension = 32
```

## PCA32_ANCHORED_DELTA3 feature

For every eligible t:

```text
shortDelta = z_t - z_(t-1)
midDelta   = z_t - z_(t-3)
longDelta  = z_t - z_(t-5)

x_t = [
  z_t,
  shortDelta,
  midDelta,
  longDelta
]
```

Dimension exactly:

```text
128
```

Fixed horizons:

```text
1 frame = 20 ms
3 frames = 60 ms
5 frames = 100 ms
```

No future frame or game-state feature.

## TRAJECTORY_TRAIN cohort

Exactly:

```text
6441000 6451000 6461000 6471000
6481000 6491000 6501000 6511000
interruption 6527000
```

Exactly 64 tapes.

## TRAIN strata

Precedence:

```text
REALIZED_IMPACT
  latest hit with 0 <= frameStep-hitStep < 10

PRE_HIT
  not REALIZED_IMPACT and
  next hit with 0 < nextHitStep-frameStep < 10

TRUE_BACKGROUND
  otherwise
```

Binary target:

```text
REALIZED_IMPACT -> 1
PRE_HIT         -> 0
TRUE_BACKGROUND -> 0
```

## TRAIN standardization / weighting / ridge

```text
unweighted TRAIN mean/std per feature
REALIZED total sample weight = 1/3
PRE_HIT total sample weight = 1/3
TRUE_BACKGROUND total sample weight = 1/3
lambda = 1e-3
intercept unregularized
```

No sigmoid.

## CALIBRATION cohort

Exactly:

```text
6531000 6541000 6551000 6561000
6571000 6581000 6591000 6601000
interruption 6617000
```

Exactly 64 tapes.

## Threshold candidates

Exactly:

```text
0
plus every distinct finite positive trajectoryScore on CALIBRATION frames
```

Exact Number deduplication and ascending sort.

No TRAIN, attribution, or prospective score enters threshold candidate construction.

## Eventizer

```text
positive_t = trajectoryScore_t >= tau
crossing_t = positive_t && !positive_(t-1)
refractory = 10 simulation steps
```

No persistence, hysteresis, derivative threshold, peak detector, re-arm timer, or second threshold.

## Matching

```text
earliest unmatched emitted event
eventStep >= hitStep
eventStep-hitStep < 10
```

## TRAIN/CALIBRATION support

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
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_INSUFFICIENT_SUPPORT
```

## Calibration gates

All must pass:

```text
precision >= 0.75
recall >= 0.75
F1 >= 0.75
0.80 <= eventCountRatio <= 1.20
meanAbsolutePerTapeCountError <= 5.0
```

If no threshold is feasible:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_PCA32_ANCHORED_DELTA3_CALIBRATION_NO_FEASIBLE_THRESHOLD
```

No prospective evaluation.

## Deterministic threshold selection

Among feasible candidates choose lexicographically:

```text
1 maximum F1
2 minimum abs(eventCountRatio - 1)
3 minimum meanAbsolutePerTapeCountError
4 maximum precision
5 maximum recall
6 maximum threshold
```

Freeze before prospective evaluation.

## Fresh prospective cohorts

A:

```text
6621000 6631000 6641000 6651000
6661000 6671000 6681000 6691000
interruption 6707000
```

B:

```text
6711000 6721000 6731000 6741000
6751000 6761000 6771000 6781000
interruption 6797000
```

Exactly 64 tapes each.

## Frozen comparator

On the same fresh prospective tapes evaluate descriptively:

```text
frozen three-class scalar margin
tau = 0.2378919189622094
same crossing
same refractory
same matching
```

Comparator cannot affect model/threshold selection.

## Prospective support

Per cohort:

```text
64 tapes
physical impacts >= 1000
trajectory events >= 500
```

## Prospective gates

Both cohorts must pass all:

```text
precision >= 0.75
recall >= 0.75
F1 >= 0.75
0.80 <= eventCountRatio <= 1.20
meanAbsolutePerTapeCountError <= 5.0
```

## Authoritative outcomes

Precedence:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_IMPLEMENTATION_OR_PROVENANCE_INVALID

V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_INSUFFICIENT_SUPPORT

V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_PCA32_ANCHORED_DELTA3_CALIBRATION_NO_FEASIBLE_THRESHOLD

V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_PCA32_ANCHORED_DELTA3_EVENT_STREAM_DEMONSTRATED

V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_PCA32_ANCHORED_DELTA3_EVENT_STREAM_NOT_DEMONSTRATED
```

## Stop rule

After the first authoritative run do not change:

- 1/3/5-frame horizons;
- 128D feature definition;
- TRAIN/CALIBRATION/prospective cohorts;
- label precedence;
- stratum weights;
- ridge lambda;
- threshold candidate construction;
- selection ordering;
- refractory;
- matching;
- support floors;
- gates.

No prospective retuning or temporal-depth search.

```text
diagnosticStackDeployable = false
POTION v15D  DEPLOYED
v15N         CLOSED / BLOCKED
v16C         BLOCKED
```
