# prereg_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1 — neural-only predictive-surprise32 multilag-rise repair

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / OUTCOME**

Design:

```text
history/design_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_neural_only_predictive_surprise32_multilag_rise_repair.md
commit e579dc9e232938e45ed455df39f279ece5817bfe
```

## Frozen prerequisite

Failure attribution:

```text
result
  de832935668da237570c7eb00cb66de7527c90bd

receipt
  2b7fd465e3917f8e97e4aba6517325c301c63c74

run
  37168311777

analyze job
  111349797407

artifact
  11291943099

artifact digest
  sha256:e3b3d06404ee4c6f5d8170979ae4c1b4746d07a2ad32d75247631fd8bf7f54ca

JSON sha256
  5952740e8403843872e370a94cc8d4d45699b2f5df77e54f14665b6b36c8a4f3

attribution axis
  NO_LOCAL_THRESHOLD_DOMINANT
```

Frozen artifact registry key:

```text
neural_only_predictive_surprise32_failure_attribution
```

## Attribution-use restriction

Attribution A/B may justify only the repair family:

```text
absolute surprise
→ local rise contrast
```

Forbidden:

- lag tuning on A/B
- threshold tuning on A/B
- q tuning on A/B
- timing-shift tuning on A/B
- feature/model selection on A/B
- repair success claim on A/B

A/B are not prospective evidence for this repair.

## Frozen base model reproduction

Before constructing the repair score, reconstruct exactly:

```text
base model SHA
de8cc3c24cbb91a3a9a806aa2afe37ecd0294c0d2c4b5ce2d4a93c25d77a1cde

phase count          48
innovation history    5
PCA components       32
PCA fit rows         240
predictor lags        1 / 3 / 5
predictor width       96
ridge                 0.001
```

Any base model mismatch is implementation/provenance invalid.

## Frozen multilag-rise score

Let the existing frozen predictive-surprise score at score-frame index t be `s_t`.

For all frames with 5 prior score frames:

```text
d1_t = s_t - s_(t-1)
d3_t = s_t - s_(t-3)
d5_t = s_t - s_(t-5)

multilagRise_t = max(0, d1_t, d3_t, d5_t)
```

Exact restrictions:

```text
lags       [1,3,5] score frames
weights    none
smoothing  none
log        none
clipping   only max with 0
teacher    none
truth      none
```

The first five raw-score frames per tape are excluded from multilagRise support.

Lag set [1,3,5] is inherited from the frozen predictor contract and is not selected using attribution metrics.

## Calibration

Use the existing frozen NEURAL_CALIBRATION cohort only.

Physical truth is inaccessible to calibration.

```text
q = 0.95
sort finite multilagRise ascending
index = ceil(q*N)-1
tau_rise = sorted[index]
```

Support:

```text
64 tapes
>= 20000 finite multilagRise scores
tau_rise finite
tau_rise > 0
```

No threshold candidate search.

The old raw-surprise threshold:

```text
1.574078960908224
```

is not lowered or retuned. `tau_rise` belongs to a different preregistered score.

## Runtime eventizer

```text
positive_t = multilagRise_t >= tau_rise
crossing_t = positive_t && !positive_(t-1)
refractory = 10 simulation steps
```

No physical truth may alter runtime state.

## Freeze boundary

Before any C/D physical truth is read:

```text
BASE_MODEL_REPRODUCED  = true
RISE_SCORE_FROZEN      = true
RISE_THRESHOLD_FROZEN  = true
EVENTIZER_FROZEN       = true
```

Hash the complete repair contract, including:

```text
base model SHA
formula
lag set
q
tau_rise
refractory
matching contract
```

as the new repair model SHA.

## Fresh prospective cohorts

### C

```text
7971000 7981000 7991000 8001000
8011000 8021000 8031000 8041000
interruption 8057000
```

Exactly 64 tapes.

### D

```text
8061000 8071000 8081000 8091000
8101000 8111000 8121000 8131000
interruption 8147000
```

Exactly 64 tapes.

These seeds were not present in repository cohort/code search at preregistration.

No A/B reuse.

## Matching

Exactly:

```text
earliest unmatched neural event
eventStep >= hitStep
eventStep-hitStep < 10
```

## Support per prospective cohort

```text
64 tapes
physical impacts >= 1000
neural events >= 500
```

## Frozen gates per cohort

```text
precision >= 0.75
recall >= 0.75
F1 >= 0.75
0.80 <= eventCountRatio <= 1.20
meanAbsolutePerTapeCountError <= 5.0
```

No pooling.

Both C and D must independently pass.

## Outcomes

Success:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_NEURAL_ONLY_PREDICTIVE_SURPRISE32_MULTILAG_RISE_EVENT_STREAM_DEMONSTRATED
```

Failure:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_NEURAL_ONLY_PREDICTIVE_SURPRISE32_MULTILAG_RISE_EVENT_STREAM_NOT_DEMONSTRATED
```

Support failure:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_INSUFFICIENT_SUPPORT
```

Implementation/provenance invalid:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_IMPLEMENTATION_OR_PROVENANCE_INVALID
```

## Stop rule

After prospective C/D begins, do not change:

- frozen base model
- score formula
- lag set
- q=0.95
- tau_rise
- refractory
- matching
- gates
- cohorts

Do not inspect C/D outcome and then retry a nearby lag, threshold, smoothing, transform, or timing shift under the same preregistration.

Any subsequent repair requires a new design and preregistration with fresh prospective cohorts.

## Deployment

This preregistration does not alter deployment.

```text
diagnosticStackDeployable = false
deployabilityCandidate    = false

POTION v15D  DEPLOYED
v15N         CLOSED / BLOCKED
v16C         BLOCKED
```
