# prereg_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1 — neural-only predictive surprise32

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / OUTCOME**

Design:

```text
history/design_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_neural_only_predictive_surprise32.md
commit dc4b7c7f9625e38557c91628ba0b6f2395d88477
```

## Frozen prerequisite

```text
result
  0981e2c95ec86689967a15d4ea961900b50ccfc6

receipt
  17db382856e5a556ed25b08d6fc42c48ac6f4f27

run
  37006306772

artifact
  11232625088

artifact digest
  sha256:7a4a5ec9d794746852dfb6649c0360814ee1a867e35879a676526d179332d176

JSON sha256
  ffb4d8cbd0fecfa64ac84fc9cb90f079d3ab03a9d9e08df7b7ebff4139e398aa

outcome
  QUADRATIC256_CONFIRMATORY_REPLICATION_PASS
```

The supervised Quadratic256 model is evidence only and is not used as a teacher or feature.

## Truth embargo

Before model and threshold freeze, model/calibration functions may receive only stripped neural views containing:

```text
seed
frameIndex
step
DN values
```

Forbidden pre-freeze:

```text
damageEvents
contact/hit
HP
damage
collision state
future hit times
evaluator labels
supervised teacher scores
```

## Neural preprocessing

From NEURAL_TRAIN only:

```text
phase = frameIndex mod 48
phaseMean[phase][dn] = mean DN activity
residual_t = DN_t - phaseMean[phase]
innovation_t = residual_t - mean(residual_(t-1)..residual_(t-5))
```

## Neural-only PCA32

```text
fit rows       240 evenly spaced TRAIN innovations
components     32
power seed     3948000 + component
iterations     80
```

No impact detector.

## Self-predictive model

For eligible PCA frames:

```text
X_t = [z_(t-1), z_(t-3), z_(t-5)]  # width 96
Y_t = z_t                             # width 32
```

Compute unweighted TRAIN-only PCA-coordinate means/stds and use those shared coordinate statistics for current and lagged z values.

Fit multivariate ridge:

```text
lambda = 1e-3
intercept unregularized
all rows unweighted
```

No event labels.

## Predictive surprise

```text
e_t = standardized(z_t) - predicted standardized(z_t)
```

Compute TRAIN-only residual mean/std per 32 PCA dimensions.

Runtime:

```text
r_j = (e_j-residualMean_j)/residualScale_j
surprise_t = mean_j(r_j^2)
```

## NEURAL_TRAIN

```text
7521000 7531000 7541000 7551000
7561000 7571000 7581000 7591000
interruption 7607000
```

Exactly 64 tapes.

Support:

```text
64 tapes
>= 20000 predictive rows
all 32 residual scales > 1e-9
```

## NEURAL_CALIBRATION

```text
7611000 7621000 7631000 7641000
7651000 7661000 7671000 7681000
interruption 7697000
```

Exactly 64 tapes.

Threshold selection sees only neural surprise scores.

Exact rule:

```text
q = 0.95
sort finite scores ascending
index = ceil(q*N)-1
tau = sorted[index]
```

No candidate search and no evaluator metrics.

Support:

```text
64 tapes
>= 20000 finite surprise scores
tau finite
tau > 0
```

## Runtime eventizer

```text
positive_t = surprise_t >= tau
crossing_t = positive_t && !positive_(t-1)
refractory = 10 simulation steps
```

No hit/contact/HP/damage input.

## Freeze boundary

Before physical-truth evaluation:

```text
MODEL_FROZEN = true
THRESHOLD_FROZEN = true
```

Hash all learned preprocessing/model parameters plus tau/eventizer contract as:

```text
neuralOnlyModelSha256
```

## Fresh prospective cohorts

A:

```text
7701000 7711000 7721000 7731000
7741000 7751000 7761000 7771000
interruption 7787000
```

B:

```text
7791000 7801000 7811000 7821000
7831000 7841000 7851000 7861000
interruption 7877000
```

Exactly 64 tapes each.

Only after freeze may evaluator functions access physical impacts.

## Matching

```text
earliest unmatched neural event
with eventStep >= hitStep
and eventStep-hitStep < 10
```

## Support per prospective cohort

```text
64 tapes
physical impacts >= 1000
neural events >= 500
```

## Gates per cohort

```text
precision >= 0.75
recall >= 0.75
F1 >= 0.75
0.80 <= eventCountRatio <= 1.20
meanAbsolutePerTapeCountError <= 5.0
```

No pooling.

## Outcomes

Success:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_NEURAL_ONLY_PREDICTIVE_SURPRISE32_EVENT_STREAM_DEMONSTRATED
```

Failure:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_NEURAL_ONLY_PREDICTIVE_SURPRISE32_EVENT_STREAM_NOT_DEMONSTRATED
```

Support failure:

```text
...D1_INSUFFICIENT_SUPPORT
```

Provenance violation:

```text
...D1_IMPLEMENTATION_OR_PROVENANCE_INVALID
```

## Stop rule

No post-run change to phase count, innovation depth, PCA contract, predictor lags, lambda, residual score, q=0.95, refractory, matching, gates, or cohorts.

No prospective tuning.

```text
diagnosticStackDeployable = false
deployabilityCandidate = false until both fresh cohorts pass
POTION v15D = DEPLOYED
v15N = CLOSED / BLOCKED
v16C = BLOCKED
```
