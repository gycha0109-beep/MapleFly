# prereg_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1 — neural-only PCA-complement innovation repair

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / OUTCOME**

Design:

```text
history/design_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_neural_only_pca_complement_innovation_repair.md
commit 05a3ed41bbd1b85757d2bb74ce5180fdb50afab4
```

## Frozen prerequisite

```text
max-component attribution result
  29a72558389f321ca62f32848af90c41c1dc5477

receipt
  926eefc9adf87cbc57f4a9494c2b432fcfbfef4c

run
  37201941454

artifact
  11303800018

artifact digest
  sha256:51050dd8b26ee326130bba2c955c13f602c365a4b95bd47899fc75ec086d1585

JSON sha256
  18677b316b60564893eadd586b74f8fcb09957689bb381b18ad0ccaec0625509

axis
  MAX_SIGNAL_ABSENT_DOMINANT
```

The attribution may justify only moving upstream from projected/predicted PCA32 scalar scores to the frozen PCA-complement innovation representation. E/F cannot tune this repair.

## Frozen base reproduction

Before calibration reproduce exactly:

```text
base model SHA
de8cc3c24cbb91a3a9a806aa2afe37ecd0294c0d2c4b5ce2d4a93c25d77a1cde

base raw tau
1.574078960908224

phase count          48
innovation history    5
DN count            1316
PCA components        32
PCA fit rows         240
```

Any mismatch is implementation/provenance invalid.

## Frozen score

For each eligible frame:

```text
x_t = existing 5-history innovation vector

u_t[d] = (x_t[d]-pcaMean[d])/pcaScale[d]

C = 32 frozen PCA component rows
G = C C^T
b = C u_t
a = G^{-1} b

projectedEnergy = b^T a
totalEnergy = u_t^T u_t
complementEnergy = max(0,totalEnergy-projectedEnergy)

pcaComplementInnovation_t =
  complementEnergy / 1284
```

where:

```text
1284 = 1316 - 32
```

Restrictions:

- no DN selection
- no component selection/removal
- no complement basis refit
- no predictor-residual fusion
- no weighting
- no smoothing
- no physical labels

Gram matrix and its solver are determined entirely by frozen PCA components.

Numerical tolerance:

```text
totalEnergy-projectedEnergy >= -1e-8
```

Values inside `[-1e-8,0)` may be clamped to zero. More negative values invalidate implementation/provenance.

## Calibration

Existing NEURAL_CALIBRATION only.

No physical truth.

```text
q = 0.95
sort finite complement scores ascending
index = ceil(q*N)-1
tau_complement = sorted[index]
```

Support:

```text
64 tapes
>= 20000 finite scores
tau_complement finite
tau_complement > 0
Gram solve finite
```

No candidate search.

## Runtime eventizer

```text
positive_t = pcaComplementInnovation_t >= tau_complement
crossing_t = positive_t && !positive_(t-1)
refractory = 10
```

No runtime physical truth.

## Freeze boundary

Before G/H truth access:

```text
BASE_MODEL_REPRODUCED       = true
COMPLEMENT_SCORE_FROZEN     = true
COMPLEMENT_THRESHOLD_FROZEN = true
EVENTIZER_FROZEN            = true
```

Freeze repair SHA over:

- base model SHA
- exact complement score formula
- DN count 1316
- PCA count 32
- Gram projection method
- q=0.95
- tau_complement
- refractory=10
- matching contract

## Fresh prospective cohorts

### G

```text
8331000 8341000 8351000 8361000
8371000 8381000 8391000 8401000
interruption 8417000
```

Exactly 64 tapes.

### H

```text
8421000 8431000 8441000 8451000
8461000 8471000 8481000 8491000
interruption 8507000
```

Exactly 64 tapes.

No A/B/C/D/E/F reuse.

## Matching

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

## Frozen gates

Per G and H independently:

```text
precision >= 0.75
recall >= 0.75
F1 >= 0.75
0.80 <= eventCountRatio <= 1.20
meanAbsolutePerTapeCountError <= 5.0
```

No pooling.

Both must pass.

## Outcomes

Success:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_NEURAL_ONLY_PCA_COMPLEMENT_INNOVATION_EVENT_STREAM_DEMONSTRATED
```

Failure:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_NEURAL_ONLY_PCA_COMPLEMENT_INNOVATION_EVENT_STREAM_NOT_DEMONSTRATED
```

Support failure:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_INSUFFICIENT_SUPPORT
```

Implementation/provenance invalid:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_IMPLEMENTATION_OR_PROVENANCE_INVALID
```

## Stop rule

After prospective G/H begins do not change:

- phase preprocessing
- innovation history
- PCA basis
- Gram projection
- complement formula
- q
- tau_complement
- refractory
- matching
- gates
- G/H cohorts

Do not use G/H to try alternate PCA dimensions, DN subsets, score fusion, thresholds, smoothing, or timing shifts.

Any next repair requires new design, preregistration, and fresh prospective cohorts.

## Deployment

```text
diagnosticStackDeployable = false
deployabilityCandidate    = false

POTION v15D  DEPLOYED
v15N         CLOSED / BLOCKED
v16C         BLOCKED
```
