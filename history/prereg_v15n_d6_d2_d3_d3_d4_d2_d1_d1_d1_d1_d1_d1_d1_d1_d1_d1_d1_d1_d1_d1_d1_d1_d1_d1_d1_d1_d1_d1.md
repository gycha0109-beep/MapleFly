# prereg_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1 — neural-only phase-residual energy repair

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / OUTCOME**

Design:

```text
history/design_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_neural_only_phase_residual_energy_repair.md
commit e0a508583b0ef173c77b87a4a05dc2dafff6ef2f
```

## Frozen prerequisite

```text
PCA-complement attribution result
  7fb143b60c53c2a656508b3c35e9f23cbee12f7a

receipt
  bd4477c1e5603e5e2edc9e2dd24873b02f162ff6

run
  37260564427

artifact
  11324835401

artifact digest
  sha256:1021d1ded1ff600f3fc72503d7173d9aa3cf7be0dcef222889dccf184b797486

JSON sha256
  3c582b8925555e3e6603fc9b638993d9808554646db9f2e350a1ec60bb43f716

axis
  COMPLEMENT_SIGNAL_ABSENT_DOMINANT
```

The attribution may justify only moving upstream from 5-history innovation-derived representations to direct phase-residual energy.

## Frozen base reproduction

Before calibration reproduce exactly:

```text
base model SHA
de8cc3c24cbb91a3a9a806aa2afe37ecd0294c0d2c4b5ce2d4a93c25d77a1cde

base raw tau
1.574078960908224

phase count 48
DN count 1316
```

Any mismatch is implementation/provenance invalid.

## Frozen phase residual representation

TRAIN only.

For phase p and DN d:

```text
residual = frame.values[d] - phaseMean[p][d]

phaseScale[p][d] =
  max(
    sqrt(mean_train(residual^2)),
    1e-6
  )
```

Runtime score:

```text
z[d] = residual[d] / phaseScale[p][d]

phaseResidualEnergy =
  mean over all 1316 DN of z[d]^2
```

Restrictions:

- no 5-history innovation
- no PCA
- no predictor
- no DN subset
- no weighting
- no smoothing
- no teacher
- no physical truth

## Calibration

Use existing NEURAL_CALIBRATION only.

```text
q = 0.95
nearest-rank threshold
tau_phase_residual = calibration q95
```

Support:

```text
64 tapes
>= 30000 finite scores
all 48 phases supported
all phase scales finite
all phase scales >= 1e-6
tau_phase_residual finite
tau_phase_residual > 0
```

No threshold candidate search.

## Runtime eventizer

```text
positive_t = phaseResidualEnergy_t >= tau_phase_residual
crossing_t = positive_t && !positive_(t-1)
refractory = 10
```

No runtime truth input.

## Freeze boundary

Before I/J truth access:

```text
BASE_MODEL_REPRODUCED       = true
PHASE_STATS_FROZEN          = true
PHASE_RESIDUAL_SCORE_FROZEN = true
PHASE_RESIDUAL_TAU_FROZEN   = true
EVENTIZER_FROZEN            = true
```

Freeze repair SHA over:

- base model SHA
- phase count 48
- DN count 1316
- phaseScale formula
- scale floor 1e-6
- score formula mean(z^2)
- q=0.95
- tau_phase_residual
- refractory=10
- matching contract

## Fresh prospective cohorts

### I

```text
8511000 8521000 8531000 8541000
8551000 8561000 8571000 8581000
interruption 8597000
```

Exactly 64 tapes.

### J

```text
8601000 8611000 8621000 8631000
8641000 8651000 8661000 8671000
interruption 8687000
```

Exactly 64 tapes.

No A/B/C/D/E/F/G/H reuse.

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

Per I and J independently:

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
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_NEURAL_ONLY_PHASE_RESIDUAL_ENERGY_EVENT_STREAM_DEMONSTRATED
```

Failure:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_NEURAL_ONLY_PHASE_RESIDUAL_ENERGY_EVENT_STREAM_NOT_DEMONSTRATED
```

Support failure:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_INSUFFICIENT_SUPPORT
```

Implementation/provenance invalid:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_IMPLEMENTATION_OR_PROVENANCE_INVALID
```

## Stop rule

After I/J begins do not change:

- phase count
- phase means
- phase scales
- scale floor
- score formula
- q
- tau_phase_residual
- refractory
- matching
- gates
- I/J cohorts

Do not use I/J to try DN subsets, weighting, smoothing, threshold changes, phase grouping, or temporal shifts.

## Deployment

```text
diagnosticStackDeployable = false
deployabilityCandidate    = false

POTION v15D  DEPLOYED
v15N         CLOSED / BLOCKED
v16C         BLOCKED
```
