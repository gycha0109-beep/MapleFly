# design_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_pca32_anchored_delta3_confirmatory_replication

## Question

The authoritative PCA32_ANCHORED_DELTA3 experiment demonstrated the preregistered event-stream gates on both fresh prospective cohorts.

The weakest passing gate was:

```text
PROSPECTIVE_B recall = 0.753239
gate                 = 0.750000
margin               = +0.003239
```

Before changing the representation or attempting any deployability bridge, this experiment asks:

> Does the exact frozen PCA32_ANCHORED_DELTA3 model and exact frozen threshold replicate on a second pair of entirely new prospective cohorts?

This is a pure confirmatory replication.

No fitting, calibration, threshold search, temporal-depth search, or eventizer change is permitted.

---

## 1. frozen prerequisite

Require authoritative demonstration:

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

outcome
  ...PCA32_ANCHORED_DELTA3_EVENT_STREAM_DEMONSTRATED

trajectory model SHA
  6f2e4c0ec8c7ae438934a1b13db8f062387df3354383b6fab19eac5d8f354105

frozen threshold
  0.5918989570787438
```

---

## 2. exact frozen model reconstruction

Reconstruct the model only to verify determinism/provenance, using the exact frozen upstream stack and exact original TRAJECTORY_TRAIN cohort:

```text
6441000 6451000 6461000 6471000
6481000 6491000 6501000 6511000
interruption 6527000
```

The reconstructed model SHA must equal exactly:

```text
6f2e4c0ec8c7ae438934a1b13db8f062387df3354383b6fab19eac5d8f354105
```

No alternate fit, weighting, lambda, feature definition, or training cohort is allowed.

The original calibration cohort is not rerun for threshold selection. The threshold is read as a frozen prerequisite constant.

---

## 3. exact frozen representation

```text
PCA32_ANCHORED_DELTA3

x_t = [
  z_t,
  z_t-z_(t-1),
  z_t-z_(t-3),
  z_t-z_(t-5)
]

dimension = 128
horizons  = 1 / 3 / 5 frames
          = 20 / 60 / 100 ms
```

Upstream:

```text
frozen D6 phase residual
frozen five-frame innovation
frozen PCA32 basis
frozen 1316-DN order
```

No scalar three-class margin is used by the replication eventizer.

---

## 4. frozen score and threshold

Runtime score:

```text
trajectoryScore_t =
  intercept + beta dot standardized(x_t)
```

Frozen threshold:

```text
tau = 0.5918989570787438
```

No threshold candidate set is constructed.

---

## 5. frozen eventizer

```text
positive_t = trajectoryScore_t >= tau
crossing_t = positive_t && !positive_(t-1)
refractory = 10 simulation steps
```

No persistence, hysteresis, peak detector, re-arm timer, second threshold, or alternate crossing semantics.

---

## 6. frozen evaluator matching

```text
for each physical hit:
  earliest unmatched event
  with eventStep >= hitStep
  and eventStep-hitStep < 10
```

---

## 7. completely new confirmation cohorts

CONFIRM_A:

```text
6801000 6811000 6821000 6831000
6841000 6851000 6861000 6871000

interruption
6887000
```

CONFIRM_B:

```text
6891000 6901000 6911000 6921000
6931000 6941000 6951000 6961000

interruption
6977000
```

Exactly 64 tapes each.

These seeds have not been used in prior TRAIN, calibration, prospective, audit, or attribution cohorts.

---

## 8. support

Require per cohort:

```text
64 tapes
physical impacts >= 1000
trajectory events >= 500
```

Globally require:

```text
authoritative evidence SHA matches
reconstructed model SHA matches
frozen threshold matches
```

Any provenance/model mismatch:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_IMPLEMENTATION_OR_PROVENANCE_INVALID
```

Support failure:

```text
...D1_INSUFFICIENT_CONFIRMATORY_SUPPORT
```

---

## 9. confirmatory gates

Both CONFIRM_A and CONFIRM_B must independently pass all:

```text
precision >= 0.75
recall >= 0.75
F1 >= 0.75
0.80 <= eventCountRatio <= 1.20
meanAbsolutePerTapeCountError <= 5.0
```

No tolerance relaxation.

---

## 10. descriptive original comparison

Report the frozen original prospective metrics from authoritative evidence beside the confirmation metrics.

Do not pool original and confirmatory cohorts to rescue a failed cohort.

Do not average across cohorts for gate decisions.

---

## 11. authoritative outcomes

### CONFIRMATORY_REPLICATION_PASS

Both new confirmation cohorts pass every frozen gate.

This strengthens the claim that PCA32_ANCHORED_DELTA3 captures reproducible causal impact information.

### CONFIRMATORY_REPLICATION_FAIL

One or both new confirmation cohorts fail at least one frozen gate.

No parameter may be changed from this outcome. Attribute the failure before further repair.

---

## 12. scientific role

Even a successful confirmation remains nondeployable:

```text
diagnosticStackDeployable = false
```

because the frozen model was originally trained/calibrated using evaluator physical-hit truth.

A successful confirmatory replication authorizes the next research phase:

```text
DEPLOYABILITY_BRIDGE_DESIGN
```

which must replace oracle-trained decision calibration with runtime-observable neural-only supervision or a separately justified non-oracle mechanism.

It does not itself authorize POTION deployment.

---

## 13. stop rule / deployment

No:

- model refit;
- calibration;
- threshold search;
- feature search;
- temporal-depth search;
- refractory change;
- eventizer change;
- pooling to pass gates.

```text
POTION v15D  DEPLOYED
v15N         CLOSED / BLOCKED
v16C         BLOCKED
```
