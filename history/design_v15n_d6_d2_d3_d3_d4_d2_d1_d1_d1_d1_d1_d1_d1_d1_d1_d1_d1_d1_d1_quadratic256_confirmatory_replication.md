# design_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_quadratic256_confirmatory_replication

## Question

The preregistered PCA32_ANCHORED_DELTA3_QUADRATIC256 readout demonstrated an event stream on two fresh prospective cohorts.

Because the earlier linear anchored-delta3 demonstration failed its independent confirmation, this experiment asks:

> Does the exact frozen Quadratic256 model and exact frozen calibration threshold independently replicate on two entirely new confirmation cohorts?

No model refit, no calibration rerun, no threshold search, no feature change, no horizon change, no eventizer change.

---

## 1. frozen prerequisite

Require:

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

Require original prospective A/B gates = PASS.

---

## 2. exact frozen model reconstruction

Reconstruct upstream basis and Quadratic256 model solely for deterministic provenance.

Use exactly the original frozen cohorts:

### upstream basis

```text
original V15N_TRAIN seeds
interruption 4147000
```

### anchored-delta3 linear provenance TRAIN

```text
6441000..6511000
interruption 6527000
```

### Quadratic256 TRAIN

```text
6981000 6991000 7001000 7011000
7021000 7031000 7041000 7051000
interruption 7067000
```

Reconstructed model SHA must equal:

```text
6f72c6c5070b0a8bd9e3d64627614790fdb8c1c97b21b1f408ed1852ec5aaff7
```

No fitting choice may be altered.

---

## 3. frozen feature contract

Exact:

```text
base128 = [
  z_t,
  z_t-z_(t-1),
  z_t-z_(t-3),
  z_t-z_(t-5)
]

TRAIN standardize base128 -> u

quadratic256 = [
  u,
  u^2
]

TRAIN standardize quadratic256
```

No cross-products.

No polynomial-degree change.

No hidden layer.

No recurrence.

No feature selection.

---

## 4. frozen threshold

Exactly:

```text
tau = 0.6097593618468664
```

No calibration cohort rerun.

No candidate threshold generation.

No threshold search.

---

## 5. frozen eventizer and matching

Exactly:

```text
positive_t = quadraticScore_t >= tau
crossing_t = positive_t && !positive_(t-1)
refractory = 10 simulation steps
```

Matching:

```text
earliest unmatched event in [hit, hit+10)
```

No persistence, hysteresis, peak detector, refractory change, or delayed matching.

---

## 6. independent confirmation cohorts

CONFIRM_A:

```text
7341000 7351000 7361000 7371000
7381000 7391000 7401000 7411000

interruption
7427000
```

CONFIRM_B:

```text
7431000 7441000 7451000 7461000
7471000 7481000 7491000 7501000

interruption
7517000
```

Exactly 64 tapes each.

These cohorts have not been used in prior fitting, calibration, prospective, confirmation, audit, or attribution work.

---

## 7. support

Each confirmation cohort requires:

```text
64 tapes
physical impacts >= 1000
neural events >= 500
```

Global provenance requires:

```text
authoritative evidence SHA exact
original outcome exact
original model SHA exact
reconstructed model SHA exact
threshold exact
```

Any provenance mismatch:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_IMPLEMENTATION_OR_PROVENANCE_INVALID
```

Support failure:

```text
...D1_INSUFFICIENT_CONFIRMATORY_SUPPORT
```

---

## 8. confirmation gates

Each cohort independently must satisfy all:

```text
precision >= 0.75
recall >= 0.75
F1 >= 0.75
0.80 <= eventCountRatio <= 1.20
meanAbsolutePerTapeCountError <= 5.0
```

No pooling.

---

## 9. frozen linear comparator

On the same confirmation cohorts evaluate descriptively:

```text
linear anchored-delta3 model SHA
  6f2e4c0ec8c7ae438934a1b13db8f062387df3354383b6fab19eac5d8f354105

threshold
  0.5918989570787438
```

Comparator cannot influence confirmation outcome.

---

## 10. authoritative outcomes

### PASS

Both confirmation cohorts independently pass every gate:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_QUADRATIC256_CONFIRMATORY_REPLICATION_PASS
```

### FAIL

Support/provenance valid, but one or both cohorts fail at least one gate:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_QUADRATIC256_CONFIRMATORY_REPLICATION_FAIL
```

---

## 11. interpretation

PASS authorizes only the next separately preregistered deployability-bridge design.

FAIL does not authorize threshold/model/feature tuning on confirmation cohorts. It requires frozen failure attribution first.

---

## 12. stop rule / deployment

No:

- refit;
- calibration rerun;
- threshold search;
- feature change;
- degree change;
- horizon change;
- eventizer change;
- refractory tuning;
- pooling.

```text
diagnosticStackDeployable = false
POTION v15D  DEPLOYED
v15N         CLOSED / BLOCKED
v16C         BLOCKED
```
