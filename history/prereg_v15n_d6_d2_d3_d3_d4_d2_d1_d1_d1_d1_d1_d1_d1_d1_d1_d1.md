# prereg_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1 — PCA32 anchored-delta3 confirmatory replication

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / OUTCOME**

Design:

```text
history/design_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_pca32_anchored_delta3_confirmatory_replication.md
commit 7da8d69fefc7d30dcc7735f4ee335615052b10a5
```

Frozen prerequisite:

```text
result
  53408c48d444c6fca11cf4016b9545bef160e664

receipt
  069c875e6d8769af493376f799f955aa392b1409

run
  36805174578

artifact
  11140971672

artifact digest
  sha256:8d3033e52a588c3a1fd99b6bc0f47b85aa097c87f291a94242e2be55be7fe29a

JSON sha256
  175b4c4171949442e7dcdcda04ebe18df2642c34097680c8a2776fdc5eda92e4

trajectory model SHA
  6f2e4c0ec8c7ae438934a1b13db8f062387df3354383b6fab19eac5d8f354105

threshold
  0.5918989570787438
```

## Exact frozen reconstruction

Reconstruct only for provenance verification using exact original TRAJECTORY_TRAIN:

```text
6441000 6451000 6461000 6471000
6481000 6491000 6501000 6511000
interruption 6527000
```

Require reconstructed model SHA exactly:

```text
6f2e4c0ec8c7ae438934a1b13db8f062387df3354383b6fab19eac5d8f354105
```

No alternate fit, weighting, lambda, cohort, or feature definition.

## Frozen feature

```text
x_t = [
  z_t,
  z_t-z_(t-1),
  z_t-z_(t-3),
  z_t-z_(t-5)
]
dimension = 128
horizons = 1 / 3 / 5 frames
```

No future frame or scalar-margin runtime feature.

## Frozen threshold

```text
tau = 0.5918989570787438
```

No threshold candidate construction and no calibration rerun.

## Frozen eventizer

```text
positive_t = trajectoryScore_t >= tau
crossing_t = positive_t && !positive_(t-1)
refractory = 10 steps
```

No alternate event rule.

## Frozen matching

```text
earliest unmatched event
eventStep >= hitStep
eventStep-hitStep < 10
```

## New confirmation cohorts

CONFIRM_A:

```text
6801000 6811000 6821000 6831000
6841000 6851000 6861000 6871000
interruption 6887000
```

CONFIRM_B:

```text
6891000 6901000 6911000 6921000
6931000 6941000 6951000 6961000
interruption 6977000
```

Exactly 64 tapes each.

## Support

Per cohort:

```text
64 tapes
physical impacts >= 1000
trajectory events >= 500
```

Provenance/model mismatch:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_IMPLEMENTATION_OR_PROVENANCE_INVALID
```

Support failure:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_INSUFFICIENT_CONFIRMATORY_SUPPORT
```

## Confirmatory gates

Both cohorts must independently pass:

```text
precision >= 0.75
recall >= 0.75
F1 >= 0.75
0.80 <= eventCountRatio <= 1.20
meanAbsolutePerTapeCountError <= 5.0
```

No pooling and no tolerance relaxation.

## Authoritative outcomes

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_PCA32_ANCHORED_DELTA3_CONFIRMATORY_REPLICATION_PASS

V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_PCA32_ANCHORED_DELTA3_CONFIRMATORY_REPLICATION_FAIL
```

## Stop rule

No:

- model refit beyond exact deterministic reconstruction;
- calibration;
- threshold search;
- feature search;
- temporal-depth search;
- refractory change;
- eventizer change;
- pooling.

A PASS authorizes only design of a separate deployability bridge.

```text
diagnosticStackDeployable = false
POTION v15D  DEPLOYED
v15N         CLOSED / BLOCKED
v16C         BLOCKED
```
