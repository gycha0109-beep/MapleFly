# result_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1 — PCA32 anchored-delta3 confirmatory replication

## Status

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_PCA32_ANCHORED_DELTA3_CONFIRMATORY_REPLICATION_FAIL
```

Authoritative evidence:

```text
run            36822848365
head           c3dc7de779e8e73ac1deeb67d6fe33bc51993d67
artifact       11147009045
artifact sha   sha256:d9b3268afbeae381956a5ad2eba17229cecd50329628dac8695aef9bc97bfdb9
JSON sha256    1e1704f12d094e83c5e6f66e9ba8f589225e4a26a01c505275296e4de6334e99
```

Frozen prerequisite:

```text
original result
  53408c48d444c6fca11cf4016b9545bef160e664

original receipt
  069c875e6d8769af493376f799f955aa392b1409

trajectory model SHA
  6f2e4c0ec8c7ae438934a1b13db8f062387df3354383b6fab19eac5d8f354105

threshold
  0.5918989570787438
```

No model refit, calibration rerun, threshold search, temporal-depth tuning, refractory tuning, or confirmation-time tuning occurred.

## Confirmation support

```text
A: 64 tapes, 1700 impacts, 1641 events — PASS
B: 64 tapes, 1709 impacts, 1677 events — PASS
```

## CONFIRM_A

```text
physical impacts 1700
neural events    1641
matched          1270
false events      371
missed impacts    430

precision       0.773918  PASS
recall          0.747059  FAIL
F1              0.760251  PASS
event/hit       0.965294  PASS
count MAE       2.203125  PASS

median latency     0.10 s
p90 latency        0.14 s
refractory suppressed 0
```

Recall deficit relative to gate:

```text
0.750000 - 0.747059 = 0.002941
```

A would require 1275 matched impacts to reach 0.75 recall; it produced 1270, a deficit of five matches.

## CONFIRM_B

```text
physical impacts 1709
neural events    1677
matched          1288
false events      389
missed impacts    421

precision       0.768038  PASS
recall          0.753657  PASS
F1              0.760780  PASS
event/hit       0.981276  PASS
count MAE       2.312500  PASS

median latency     0.10 s
p90 latency        0.14 s
refractory suppressed 0
```

All frozen gates pass on B.

## Original prospective comparison

Original A/B both passed:

```text
original A recall 0.757310
original B recall 0.753239

confirm A recall  0.747059
confirm B recall  0.753657
```

The representation remains near the gate across all four fresh cohorts, but the independent confirmatory requirement was both confirmation cohorts passing every gate. Therefore the replication fails.

## Interpretation

The original prospective demonstration is not erased; it remains a valid first demonstration on its frozen fresh cohorts.

However, the independent replication does not confirm the event-stream claim under the preregistered both-cohort rule because CONFIRM_A recall is below 0.75 by 0.002941.

This failure does not authorize threshold adjustment, feature-horizon adjustment, model refit, or pooling the original and confirmation cohorts.

The next experiment must attribute the miss structure under the exact frozen trajectory model and threshold on CONFIRM_A/B before any further representation or eventizer repair.

## Deployment

```text
diagnosticStackDeployable = false

POTION v15D  DEPLOYED
v15N         CLOSED / BLOCKED
v16C         BLOCKED
```
