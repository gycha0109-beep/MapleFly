# prereg_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1 — max-component surprise32 failure attribution

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / OUTCOME**

Design:

```text
history/design_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_neural_only_max_component_surprise32_failure_attribution.md
commit 6c725f2f8b58d24ce2aa105846a267684b397420
```

## Frozen prerequisite

```text
result
  41e95ba575210da4fe02061301c137977262bd46

receipt
  e05ae722ee93dabe1ffe5b8081c85e13e4d1424c

run
  37179603274

analyze job
  111374145746

artifact
  11294069478

artifact digest
  sha256:3c23c8d3a6a1a44ada98641f6ca86e8a653b66d43321c6c8c7807074523a4f3e

JSON sha256
  2838b9c29fd358a63348e0cc386b46bde7e36a0290f9ffdaf4e4526bb79d922c
```

Frozen contracts:

```text
base model SHA
de8cc3c24cbb91a3a9a806aa2afe37ecd0294c0d2c4b5ce2d4a93c25d77a1cde

base raw tau
1.574078960908224

max repair model SHA
17c5b3e45a1748b940a903b02684c3683838825a6b77d4eeee04af963f9af6fb

tau_max
12.389163171560895

q
0.95

refractory
10
```

## Attribution cohorts

Reuse only failed prospective cohorts for attribution.

E:

```text
8151000 8161000 8171000 8181000
8191000 8201000 8211000 8221000
interruption 8237000
```

F:

```text
8241000 8251000 8261000 8271000
8281000 8291000 8301000 8311000
interruption 8327000
```

Exactly 64 tapes each.

E/F cannot tune or validate a new repair.

## Exact reproduction gate

Before attribution reproduce exactly:

- base model SHA
- base raw tau
- max repair model SHA
- tau_max
- E/F physical impacts
- E/F neural events
- matched
- false events
- missed impacts
- precision
- recall
- F1
- eventCountRatio
- meanAbsolutePerTapeCountError

Any mismatch:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_MAX_COMPONENT_ATTRIBUTION_IMPLEMENTATION_OR_PROVENANCE_INVALID
```

## Miss attribution

For each missed impact use `[hit-10,hit+20)` with precedence:

```text
MATCH_CONFLICT
REFRACTORY_SUPPRESSED_IN_WINDOW
PRE_HIT_MAX_CROSSING
LATE_POST_HIT_MAX_CROSSING
ABOVE_MAX_THRESHOLD_NO_CROSSING_IN_WINDOW
NO_LOCAL_MAX_THRESHOLD_CROSSING
```

## False-event timing

For unmatched max events:

```text
PRE_HIT_200MS
RECENT_POST_HIT_200MS
BACKGROUND
```

Use the same frozen definitions as prior attribution work.

## Local max peak

Per physical impact in `[hit-10,hit+20)`:

```text
maxPeakScore
maxPeakOffsetSteps
maxThresholdGap = tau_max-maxPeakScore
```

Buckets:

```text
PRE_HIT_PEAK
IN_WINDOW_PEAK
LATE_POST_HIT_PEAK
```

## Background separation

Background frame:

```text
distance from every physical impact >= 20 steps
```

Report max-component score q50/q75/q90/q95/q99 for:

```text
BACKGROUND
PRE_HIT [-10,0)
IN_WINDOW [0,10)
LATE_POST [10,20)
```

Also report descriptive:

```text
impactLocalQ95/backgroundQ95
impactLocalQ99/backgroundQ99
```

No threshold selection.

## Argmax component diagnostic

At each max-score frame record the winning component index.

Report frequency distributions for:

```text
BACKGROUND
IMPACT_LOCAL
FALSE_EVENT
MATCHED_EVENT
```

For each distribution report:

```text
top1 share
top3 share
normalized entropy
```

Component IDs are descriptive only.

Forbidden:

- component selection
- component removal
- top-k selection
- weighting
- component-specific thresholds

## Frozen attribution axis

Strict precedence:

```text
EARLY_MAX_SHIFT_DOMINANT
  PRE_HIT_MAX_CROSSING > 0.50 on E and F

LATE_MAX_SHIFT_DOMINANT
  LATE_POST_HIT_MAX_CROSSING > 0.50 on E and F

MAX_EVENTIZER_BLOCK_DOMINANT
  MATCH_CONFLICT
  + REFRACTORY_SUPPRESSED_IN_WINDOW
  + ABOVE_MAX_THRESHOLD_NO_CROSSING_IN_WINDOW
  > 0.50 on E and F

MAX_SIGNAL_ABSENT_DOMINANT
  NO_LOCAL_MAX_THRESHOLD_CROSSING > 0.50 on E and F

BACKGROUND_MAX_NOISE_DOMINANT
  BACKGROUND false-event fraction > 0.80 on E and F
  AND false-event argmax top3 share > 0.50 on E and F

otherwise
  MIXED_MAX_COMPONENT_TEMPORAL_MISALIGNMENT
```

Dominance comparisons are strict `> 0.50`.

## Support

Per cohort require:

```text
64 tapes
physical impacts >= 1000
neural events >= 500
false events >= 1000
missed impacts >= 1000
finite local peak >= 99%
finite background frames >= 10000
argmax available >= 99% of scored frames
```

Support failure:

```text
...MAX_COMPONENT_INSUFFICIENT_ATTRIBUTION_SUPPORT
```

## Valid outcome

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_NEURAL_ONLY_MAX_COMPONENT_SURPRISE32_FAILURE_ATTRIBUTED
```

## Stop rule

No:

- model refit
- tau change
- q change
- component selection
- top-k
- weighting
- smoothing
- timing shift
- eventizer change
- E/F repair tuning
- deployment change

Any next repair requires a new design, preregistration, and fresh prospective cohorts.

## Deployment

```text
diagnosticStackDeployable = false
deployabilityCandidate    = false

POTION v15D  DEPLOYED
v15N         CLOSED / BLOCKED
v16C         BLOCKED
```
