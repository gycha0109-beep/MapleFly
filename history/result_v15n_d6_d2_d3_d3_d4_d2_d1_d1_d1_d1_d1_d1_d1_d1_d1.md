# result_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_d1_d1_d1_d1 — PCA32 anchored delta3

## Status

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_PCA32_ANCHORED_DELTA3_EVENT_STREAM_DEMONSTRATED
```

Authoritative evidence:

```text
run            36805174578
head           17e9b338843d24f31c6c5e13347d2d5ba244de41
artifact       11140971672
artifact sha   sha256:8d3033e52a588c3a1fd99b6bc0f47b85aa097c87f291a94242e2be55be7fe29a
JSON sha256    175b4c4171949442e7dcdcda04ebe18df2642c34097680c8a2776fdc5eda92e4
```

Frozen chain:

```text
design          2939916f88952eef1e71edd647ed98287f9125fc
prereg          cac68edb4a2fe669968d7403e574063b2af0336d
implementation  30c9f3003c009cb041d5e57490a7234ebab364a8
workflow        17e9b338843d24f31c6c5e13347d2d5ba244de41
```

Prerequisite:

```text
historyUtilityAxis = HISTORY_NEGLIGIBLE
history evidence SHA =
  956605344594e575ee0bb4bb3c51a4c333e928f2a7f0071666d021d05a891302
```

Frozen three-class model SHA:

```text
cf9d38bbb697c1c2b98aa34f51c6ee39626c68763acbfb1c34e145eb738c7144
```

## Representation

```text
PCA32_ANCHORED_DELTA3

x_t = [
  z_t,
  z_t - z_(t-1),
  z_t - z_(t-3),
  z_t - z_(t-5)
]

dimension = 128
horizons  = 20 / 60 / 100 ms
```

The runtime feature is causal and uses only the frozen PCA32 neural trajectory.

## TRAIN support

```text
64 tapes
REALIZED_IMPACT  3405
PRE_HIT          2804
TRUE_BACKGROUND 23871
PASS
```

Trajectory model SHA:

```text
6f2e4c0ec8c7ae438934a1b13db8f062387df3354383b6fab19eac5d8f354105
```

## Calibration

```text
64 tapes
1709 physical impacts
25233 threshold candidates
303 feasible thresholds
PASS
```

Selected threshold:

```text
0.5918989570787438
```

Selected calibration metrics:

```text
neural events   1659
matched         1296
false events     363
missed impacts   413
precision      0.781193
recall         0.758338
F1             0.769596
event/hit      0.970743
count MAE      2.375000
median latency   0.10 s
p90 latency      0.14 s
refractory suppressed 0
```

All frozen calibration gates pass.

## Fresh prospective result

### PROSPECTIVE_A

```text
physical impacts 1710
neural events    1638
matched          1295
false events      343
missed impacts    415
precision       0.790598  PASS
recall          0.757310  PASS
F1              0.773596  PASS
event/hit       0.957895  PASS
count MAE       2.875000  PASS
median latency     0.10 s
p90 latency        0.14 s
refractory suppressed 0
```

### PROSPECTIVE_B

```text
physical impacts 1698
neural events    1658
matched          1279
false events      379
missed impacts    419
precision       0.771411  PASS
recall          0.753239  PASS
F1              0.762217  PASS
event/hit       0.976443  PASS
count MAE       1.937500  PASS
median latency     0.10 s
p90 latency        0.14 s
refractory suppressed 0
```

Both completely fresh prospective cohorts pass every preregistered event-stream gate.

## Frozen scalar-margin comparator

On the same fresh cohorts:

A:

```text
precision 0.734463
recall    0.760234
F1        0.747126
```

B:

```text
precision 0.736659
recall    0.747939
F1        0.742256
```

Relative to the frozen scalar-margin comparator, PCA32_ANCHORED_DELTA3 materially improves precision while preserving recall near the target operating region.

## Interpretation

The previous failure was not caused by an absence of usable impact information in the frozen PCA32 neural basis.

Instead, the useful information was lost during scalar three-class margin compression.

Explicit causal PCA32 trajectory displacement at fixed 20/60/100 ms horizons recovers a prospective event stream that satisfies all frozen precision, recall, F1, event-count-ratio, and per-tape count-error gates on both fresh cohorts.

This is the first demonstrated event-stream representation in the current diagnostic chain.

The result does not authorize deployment. Physical-hit truth was used for offline TRAIN labels and calibration selection, so the readout remains diagnostic/nondeployable.

Because the weakest fresh gate margin is small:

```text
PROSPECTIVE_B recall
  observed = 0.753239
  gate     = 0.750000
  margin   = +0.003239
```

the next experiment should be a fully frozen confirmatory replication on entirely new cohorts before any further representation or eventizer modification.

## Deployment

```text
diagnosticStackDeployable = false

POTION v15D  DEPLOYED
v15N         CLOSED / BLOCKED
v16C         BLOCKED
```
