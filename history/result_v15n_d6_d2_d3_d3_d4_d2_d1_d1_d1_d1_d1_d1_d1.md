# result_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_d1_d1 — causal margin dynamics6

## Status

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_CAUSAL_MARGIN_DYNAMICS6_EVENT_STREAM_NOT_DEMONSTRATED
```

Authoritative evidence:

```text
run            36780843521
head           96f453f66191e1506cf3b5d2951df59399949596
artifact       11129499847
artifact sha   sha256:509b65a56127577f5195c0734225c7d62b3ea591ff72cf9c82e3231364408806
JSON sha256    535d99f8de11943631f6a2399355a3c9d2030f2da3b253a489fb971b7fd95364
```

Frozen chain:

```text
design          544398909e7f5430f4aa695f962b545f0e7e4eb4
prereg          4c68906e0fb675bd607dbdf0f234f824cb512d33
implementation  d67fb28b784d5671cd1c6c448596839b8ea22577
workflow        96f453f66191e1506cf3b5d2951df59399949596
```

Prerequisite attribution SHA:

```text
21f2b96ff0f94534b88aa329ae34c11441d42123226953da3884bedf394041f7
```

Frozen three-class model SHA:

```text
cf9d38bbb697c1c2b98aa34f51c6ee39626c68763acbfb1c34e145eb738c7144
```

## DYNAMICS6 model

```text
model SHA
c55667f336c004a2fe649a3019d77ca4cc08b2b3791b635ae977ce2bf5894e41

TRAIN support
positive rows  3413
negative rows 26539
PASS
```

Standardized-feature ridge coefficients, oldest to current margin:

```text
t-5  +0.015055
t-4  +0.000703
t-3  -0.003756
t-2  -0.004257
t-1  +0.004905
t    +0.277416
```

Intercept:

```text
0.324755
```

Because all six feature scales are approximately 0.398, coefficient magnitudes are directly informative about the fitted standardized representation. The current margin dominates the fitted history terms.

## Calibration

```text
64 tapes
1680 physical impacts
27191 threshold candidates
71 feasible thresholds
PASS
```

Selected threshold:

```text
0.7026438754417108
```

Selected calibration metrics:

```text
neural events  1689
matched        1272
false events    417
missed impacts  408
precision     0.753108
recall        0.757143
F1            0.755120
event/hit     1.005357
count MAE     2.703125
median latency  0.10 s
p90 latency     0.158 s
```

All frozen gates pass on calibration.

## Fresh prospective result

### A

```text
physical impacts 1694
neural events    1780
matched          1311
false events      469
missed impacts    383
precision       0.736517  FAIL
recall          0.773908  PASS
F1              0.754750  PASS
event/hit       1.050767  PASS
count MAE       2.718750  PASS
median latency     0.10 s
p90 latency        0.14 s
```

### B

```text
physical impacts 1724
neural events    1774
matched          1294
false events      480
missed impacts    430
precision       0.729425  FAIL
recall          0.750580  PASS
F1              0.739851  FAIL
event/hit       1.029002  PASS
count MAE       2.562500  PASS
median latency     0.10 s
p90 latency        0.14 s
```

Primary requirement is both fresh cohorts passing every gate. Therefore DYNAMICS6 is not demonstrated.

## Frozen absolute-margin comparator on the same fresh cohorts

A:

```text
precision 0.736605
recall    0.770956
F1        0.753389
```

B:

```text
precision 0.727324
recall    0.744200
F1        0.735665
```

DYNAMICS6 changes only modestly relative to the frozen scalar-margin comparator:

```text
A recall +0.002952
A precision -0.000088

B recall +0.006381
B precision +0.002101
```

Thus the six-frame scalar-margin history did not materially change the event-stream operating regime.

## Interpretation

DYNAMICS6 successfully improves recall enough that both fresh cohorts exceed the 0.75 recall gate, but it does so without solving false-event discrimination. Precision remains about 0.73 on both cohorts.

The fitted coefficients strongly concentrate on the current margin rather than older history samples. This is consistent with the prospective behavior: DYNAMICS6 acts much like the frozen absolute-margin eventizer rather than extracting a distinct temporal-change signal.

This does not justify changing the threshold from the prospective cohorts or expanding the temporal window ad hoc.

The next step is an attribution audit of temporal-history utility under the exact frozen DYNAMICS6 model:

- quantify history-only contribution versus current-margin contribution at matched and false events;
- quantify how often DYNAMICS6 event decisions differ from the frozen absolute-margin comparator;
- determine whether history contributions preferentially rescue true impacts or create false events;
- make no new model fit, threshold search, or deployment claim.

If history contributes little or non-selectively, the next representation repair should operate on the underlying PCA32 neural trajectory rather than on the already-compressed scalar margin.

## Deployment

```text
diagnosticStackDeployable = false
POTION v15D  DEPLOYED
v15N         CLOSED / BLOCKED
v16C         BLOCKED
```
