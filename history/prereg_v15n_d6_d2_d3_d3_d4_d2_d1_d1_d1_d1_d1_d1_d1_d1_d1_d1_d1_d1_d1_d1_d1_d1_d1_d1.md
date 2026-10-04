# prereg_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1 — neural-only max-component surprise32 repair

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / OUTCOME**

Design:

```text
history/design_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_neural_only_max_component_surprise32_repair.md
commit c072a69ba8accd346e54e6511be40ac557bbe619
```

## Frozen prerequisite

```text
multilag-rise attribution result
  a14ee53782eafa8955144d575b89bd76ae44f564

receipt
  e8f1368a26f32f4515fb21cbe887dd8b5d0b17ea

run
  37179198946

artifact
  11295075939

artifact digest
  sha256:493ab7b5a7b8575d3a1af2f4a7a822aa35f3e3257e01e1b37185af3adb1d18b0

JSON sha256
  4d34942cc294798c8363fab817a472469cea135cd8e5dc11a9587ff2ddeeca71

axis
  BASE_SIGNAL_ABSENT_DOMINANT
```

The attribution may justify only the aggregation-family change from mean residual energy to a parameter-free max-component score. C/D cannot tune this repair.

## Frozen base model reproduction

Before calibration reproduce exactly:

```text
base model SHA
de8cc3c24cbb91a3a9a806aa2afe37ecd0294c0d2c4b5ce2d4a93c25d77a1cde

base raw tau
1.574078960908224

phase count          48
innovation history    5
PCA components       32
PCA fit rows         240
predictor lags        1 / 3 / 5
predictor width       96
ridge                 0.001
```

Any mismatch is implementation/provenance invalid.

## Frozen score

For each predictive row:

```text
e_j = standardized(z_t)_j - predicted standardized(z_t)_j
r_j = (e_j - residualMean_j) / residualScale_j

maxComponentSurprise_t = max over j=1..32 of (r_j^2)
```

Restrictions:

```text
all 32 components
no component selection
no top-k
no learned weights
no smoothing
no log
no clipping
no physical labels
```

## Calibration

Existing NEURAL_CALIBRATION only.

No physical truth.

```text
q = 0.95
sort finite maxComponentSurprise ascending
index = ceil(q*N)-1
tau_max = sorted[index]
```

Support:

```text
64 tapes
>= 20000 finite scores
tau_max finite
tau_max > 0
```

No candidate search.

## Runtime eventizer

```text
positive_t = maxComponentSurprise_t >= tau_max
crossing_t = positive_t && !positive_(t-1)
refractory = 10
```

No runtime truth input.

## Freeze boundary

Before E/F truth access:

```text
BASE_MODEL_REPRODUCED = true
MAX_SCORE_FROZEN      = true
MAX_THRESHOLD_FROZEN  = true
EVENTIZER_FROZEN      = true
```

Freeze a repair model SHA over:

- base model SHA
- exact max-component formula
- component count 32
- q=0.95
- tau_max
- refractory=10
- matching contract

## Fresh prospective cohorts

### E

```text
8151000 8161000 8171000 8181000
8191000 8201000 8211000 8221000
interruption 8237000
```

Exactly 64 tapes.

### F

```text
8241000 8251000 8261000 8271000
8281000 8291000 8301000 8311000
interruption 8327000
```

Exactly 64 tapes.

These cohorts are fresh relative to the existing repository cohort definitions and prior A/B/C/D/cache-validation cohorts.

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

Per E and F independently:

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
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_NEURAL_ONLY_MAX_COMPONENT_SURPRISE32_EVENT_STREAM_DEMONSTRATED
```

Failure:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_NEURAL_ONLY_MAX_COMPONENT_SURPRISE32_EVENT_STREAM_NOT_DEMONSTRATED
```

Support failure:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_INSUFFICIENT_SUPPORT
```

Implementation/provenance invalid:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_IMPLEMENTATION_OR_PROVENANCE_INVALID
```

## Stop rule

After prospective E/F begins do not change:

- base model
- max aggregation
- component set
- q
- tau_max
- refractory
- matching
- gates
- E/F cohorts

Do not use E/F to try nearby top-k, weights, thresholds, smoothing, or timing shifts.

Any next repair requires new design, preregistration, and fresh prospective cohorts.

## Deployment

```text
diagnosticStackDeployable = false
deployabilityCandidate    = false

POTION v15D  DEPLOYED
v15N         CLOSED / BLOCKED
v16C         BLOCKED
```
