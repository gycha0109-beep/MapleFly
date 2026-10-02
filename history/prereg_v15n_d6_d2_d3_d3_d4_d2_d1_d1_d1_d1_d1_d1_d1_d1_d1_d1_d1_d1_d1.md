# prereg_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1 — quadratic256 confirmatory replication

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / OUTCOME**

Design:

```text
history/design_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_quadratic256_confirmatory_replication.md
commit 3953421e3b55027b5af3d4beaff6b59ac9c9cbed
```

## Frozen prerequisite

```text
result
  6eb800192827e95fb55d50e32f166dae9356ccb2

receipt
  4d21c3c596e3286434e27799b8d54956a14218d6

run
  36974010880

artifact
  11217152053

artifact digest
  sha256:99feb39b45a6cdaf722a9cdc618e7037126b2fbb9f67c7a7594bf98973c650e4

JSON sha256
  d7e1633ca5e9df1b0c96641919a887af86ea55a16dd7eb4fb49ae43644d2beac

quadratic model SHA
  6f72c6c5070b0a8bd9e3d64627614790fdb8c1c97b21b1f408ed1852ec5aaff7

threshold
  0.6097593618468664
```

Require original outcome DEMONSTRATED and original prospective gates A=true/B=true.

## Frozen reconstruction

Reconstruct exact upstream basis and exact Quadratic256 model only for deterministic provenance.

Use:

```text
upstream V15N_TRAIN
  interruption 4147000

anchored-delta3 linear provenance TRAIN
  6441000..6511000
  interruption 6527000

Quadratic256 TRAIN
  6981000..7051000
  interruption 7067000
```

Reconstructed Quadratic256 SHA must exactly equal:

```text
6f72c6c5070b0a8bd9e3d64627614790fdb8c1c97b21b1f408ed1852ec5aaff7
```

## Frozen feature

Exactly:

```text
base128 = [z_t, z_t-z_(t-1), z_t-z_(t-3), z_t-z_(t-5)]

TRAIN standardize base128 -> u

quadratic256 = [u, u^2]

TRAIN standardize quadratic256
```

No cross-products, degree changes, hidden layers, recurrence, feature search, or horizon changes.

## Frozen threshold

```text
tau = 0.6097593618468664
```

No calibration rerun.

No candidate construction.

No threshold search.

## Frozen eventizer / matching

```text
positive_t = quadraticScore_t >= tau
crossing_t = positive_t && !positive_(t-1)
refractory = 10 steps

matching =
  earliest unmatched event in [hit, hit+10)
```

## CONFIRM_A

```text
7341000 7351000 7361000 7371000
7381000 7391000 7401000 7411000

interruption
7427000
```

## CONFIRM_B

```text
7431000 7441000 7451000 7461000
7471000 7481000 7491000 7501000

interruption
7517000
```

Exactly 64 tapes each.

These are independent, previously unused confirmation cohorts.

## Support

Each:

```text
64 tapes
physical impacts >= 1000
neural events >= 500
```

Provenance mismatch:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_IMPLEMENTATION_OR_PROVENANCE_INVALID
```

Support failure:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_INSUFFICIENT_CONFIRMATORY_SUPPORT
```

## Confirmation gates

Each independently:

```text
precision >= 0.75
recall >= 0.75
F1 >= 0.75
0.80 <= eventCountRatio <= 1.20
meanAbsolutePerTapeCountError <= 5.0
```

No pooling.

## Frozen linear comparator

Descriptive only on same confirmation cohorts:

```text
model SHA
  6f2e4c0ec8c7ae438934a1b13db8f062387df3354383b6fab19eac5d8f354105

tau
  0.5918989570787438
```

## Outcomes

PASS:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_QUADRATIC256_CONFIRMATORY_REPLICATION_PASS
```

FAIL:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_QUADRATIC256_CONFIRMATORY_REPLICATION_FAIL
```

## Stop rule

No refit, calibration, threshold search, feature/degree/horizon changes, eventizer changes, refractory tuning, or pooling.

```text
diagnosticStackDeployable = false
POTION v15D  DEPLOYED
v15N         CLOSED / BLOCKED
v16C         BLOCKED
```
