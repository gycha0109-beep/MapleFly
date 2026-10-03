# prereg_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1 — neural-only predictive-surprise32 failure attribution

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / OUTCOME**

Design:

```text
history/design_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_neural_only_predictive_surprise32_failure_attribution.md
commit 063a1f6be925ee7145961306503543e28b133131
```

## Frozen prerequisite

```text
result
  7b2af77b2a4b3bdcd39723b53c4bce2feb3c63d8

receipt
  b0223bc3be4452773ab9fad5b83ef4d7712b4660

run
  37081864923

job
  111083917653

artifact
  11261347073

artifact digest
  sha256:9a1b598b06faa99568f902794ddaf9042d7d2ca5dcf5224a4b17792e4659c3cc

JSON sha256
  78549dfb7514c4d3732ca9e4f6239ad6b1bc88162cf10312b661494b1bbc9546

model SHA
  de8cc3c24cbb91a3a9a806aa2afe37ecd0294c0d2c4b5ce2d4a93c25d77a1cde

q
  0.95

threshold
  1.574078960908224
```

## Attribution cohorts

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

These are attribution-only cohorts. They cannot support a new generalization claim or tune a repair.

## Exact reproduction gate

Before attribution, reproduce exactly:

```text
model SHA
threshold
A/B physical impacts
A/B neural events
A/B matched
A/B false events
A/B missed impacts
A/B precision
A/B recall
A/B F1
A/B eventCountRatio
A/B count MAE
```

Any mismatch:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_NEURAL_ONLY_PREDICTIVE_SURPRISE32_ATTRIBUTION_IMPLEMENTATION_OR_PROVENANCE_INVALID
```

## Frozen runtime

Exactly preserve:

```text
phase count          48
innovation history    5
PCA components       32
PCA fit rows         240
predictor lags        1/3/5
predictor width       96
ridge                 0.001
q                     0.95
tau                   1.574078960908224
refractory            10
```

Score, rising-edge eventizer, and evaluator matching remain identical to the authoritative run.

No physical truth may alter runtime state.

## False-event timing

For unmatched emitted events use precedence:

```text
PRE_HIT_200MS
RECENT_POST_HIT_200MS
BACKGROUND
```

with the exact design definitions.

Also report nearest physical-impact signed offset within +/-20 steps.

No event timing shift is permitted.

## Miss attribution

For every unmatched physical impact, use precedence:

```text
MATCH_CONFLICT
REFRACTORY_SUPPRESSED_IN_WINDOW
PRE_HIT_CROSSING
LATE_POST_HIT_CROSSING
ABOVE_THRESHOLD_NO_CROSSING_IN_WINDOW
NO_LOCAL_THRESHOLD_CROSSING
```

using the exact design definitions over [hit-10, hit+20).

No threshold, refractory, eventizer, or matching-window modification.

## Local peak timing

For each impact, in [hit-10, hit+20):

```text
peakScore
peakOffsetSteps
thresholdGap = tau-peakScore
```

Peak buckets:

```text
PRE_HIT_PEAK
IN_WINDOW_PEAK
LATE_POST_HIT_PEAK
```

Report peakOffsetSteps q10/q25/median/q75/q90.

For missed impacts report thresholdGap q10/q25/median/q75/q90.

No threshold selection.

## Nearest event distance for misses

Within +/-20 steps report:

```text
PRE_200MS
IN_WINDOW
LATE_200MS
NONE
```

using signed eventStep-hitStep.

## Background reference

Background frame:

```text
distance to every physical impact >= 20 steps
```

Report surprise q50/q75/q90/q95/q99 for:

```text
BACKGROUND
PRE_HIT [-10,0)
IN_WINDOW [0,10)
LATE_POST_HIT [10,20)
```

Descriptive only.

## Frozen attribution axis

Strict precedence:

```text
EARLY_PHASE_SHIFT_DOMINANT
  PRE_HIT_CROSSING > 0.50 of misses on both A and B

LATE_PHASE_SHIFT_DOMINANT
  LATE_POST_HIT_CROSSING > 0.50 of misses on both A and B

EVENTIZER_BLOCK_DOMINANT
  MATCH_CONFLICT
  + REFRACTORY_SUPPRESSED_IN_WINDOW
  + ABOVE_THRESHOLD_NO_CROSSING_IN_WINDOW
  > 0.50 of misses on both A and B

NO_LOCAL_THRESHOLD_DOMINANT
  NO_LOCAL_THRESHOLD_CROSSING > 0.50 of misses on both A and B

otherwise
  MIXED_NEURAL_ONLY_TEMPORAL_MISALIGNMENT
```

Dominance is strict > 0.50.

## A/B consistency

Report A-B differences for:

```text
all miss-category fractions
all false-event timing fractions
median peakOffsetSteps
median nearestEventOffsetSteps among non-NONE misses
median missed-impact thresholdGap
```

No repair-selection rule is allowed.

## Support

Per cohort require:

```text
64 tapes
physical impacts >= 1000
neural events >= 500
false events >= 1000
missed impacts >= 1000
finite local peak for >= 99% of impacts
```

Support failure:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_NEURAL_ONLY_PREDICTIVE_SURPRISE32_INSUFFICIENT_ATTRIBUTION_SUPPORT
```

## Valid outcome

After exact reproduction and support:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_NEURAL_ONLY_PREDICTIVE_SURPRISE32_FAILURE_ATTRIBUTED
```

Must report:

```text
attributionAxis
false-event timing composition
miss-category composition
peak timing
nearest event distance
miss threshold-gap distribution
background/pre/in-window/late surprise distributions
A/B consistency
```

## Stop rule

No refit, PCA change, predictor/lag search, score search, q change, threshold search, threshold lowering, refractory tuning, eventizer modification, matching-window modification, attribution-cohort repair tuning, or deployment change.

```text
diagnosticStackDeployable = false
deployabilityCandidate    = false
POTION v15D  DEPLOYED
v15N         CLOSED / BLOCKED
v16C         BLOCKED
```
