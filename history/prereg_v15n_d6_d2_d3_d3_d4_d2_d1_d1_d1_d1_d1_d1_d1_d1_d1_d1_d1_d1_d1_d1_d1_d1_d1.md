# prereg_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1 — multilag-rise failure attribution

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / OUTCOME**

Design:

```text
history/design_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_neural_only_multilag_rise_failure_attribution.md
commit 40d439f188c2fdc55984f484b7a20404da36920f
```

## Frozen prerequisite

```text
result
  b57448ba2ed20ddd08b5ff3853bc117324c0b178

receipt
  d114d417f41d5582a7d768c33748dfd014363af4

run
  37173877851

analyze job
  111359167247

artifact
  11293292628

artifact digest
  sha256:82c80090244e5f8f0a025e92062b31d83bad4e19ea65490f465a24814db63217

JSON sha256
  e6220d2e027e5dd8dfa34bd862be1af731a03a76d967de91534977618919b98e
```

Frozen model contract:

```text
base model SHA
de8cc3c24cbb91a3a9a806aa2afe37ecd0294c0d2c4b5ce2d4a93c25d77a1cde

base tau
1.574078960908224

repair model SHA
8556002505564c754f972abd62afc20ff8b89f0e7bca52b7e365a6f5120b275a

tau_rise
1.0756203121500945

lags
1 / 3 / 5

q
0.95

refractory
10
```

## Attribution cohorts

Reuse only the failed prospective cohorts for attribution.

C:

```text
7971000 7981000 7991000 8001000
8011000 8021000 8031000 8041000
interruption 8057000
```

D:

```text
8061000 8071000 8081000 8091000
8101000 8111000 8121000 8131000
interruption 8147000
```

Exactly 64 tapes each.

C/D cannot support a new generalization claim or choose a repair parameter.

## Exact reproduction gate

Before attribution, reproduce exactly:

- base model SHA
- base tau
- repair model SHA
- tau_rise
- C/D physical impacts
- C/D neural events
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
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_MULTILAG_RISE_ATTRIBUTION_IMPLEMENTATION_OR_PROVENANCE_INVALID
```

## Rise miss attribution

For every missed impact use `[hit-10, hit+20)` and precedence:

```text
MATCH_CONFLICT
REFRACTORY_SUPPRESSED_IN_WINDOW
PRE_HIT_RISE_CROSSING
LATE_POST_HIT_RISE_CROSSING
ABOVE_RISE_THRESHOLD_NO_CROSSING_IN_WINDOW
NO_LOCAL_RISE_THRESHOLD_CROSSING
```

No eventizer modification.

## False-event timing

For unmatched emitted rise events:

```text
PRE_HIT_200MS
RECENT_POST_HIT_200MS
BACKGROUND
```

Use the same frozen definitions as the prior attribution.

## Rise local peak

For each impact in `[hit-10,hit+20)`:

```text
risePeakScore
risePeakOffsetSteps
riseThresholdGap = tau_rise - risePeakScore
```

Peak bucket:

```text
PRE_HIT_PEAK
IN_WINDOW_PEAK
LATE_POST_HIT_PEAK
```

## Frozen raw context

For each missed impact in the same local window:

```text
rawPeakScore
rawPeakOffsetSteps
rawThresholdGap = baseTau - rawPeakScore
```

Classification:

```text
RAW_LOCAL_SUPRATHRESHOLD_PRESENT
  rawPeakScore >= baseTau

RAW_LOCAL_SUBTHRESHOLD
  rawPeakScore < baseTau
```

Report this for all misses and for the subset classified as `NO_LOCAL_RISE_THRESHOLD_CROSSING`.

No raw threshold selection or tuning.

## Frozen attribution axis

Strict precedence:

```text
EARLY_RISE_SHIFT_DOMINANT
  PRE_HIT_RISE_CROSSING > 0.50 on C and D

LATE_RISE_SHIFT_DOMINANT
  LATE_POST_HIT_RISE_CROSSING > 0.50 on C and D

RISE_EVENTIZER_BLOCK_DOMINANT
  MATCH_CONFLICT
  + REFRACTORY_SUPPRESSED_IN_WINDOW
  + ABOVE_RISE_THRESHOLD_NO_CROSSING_IN_WINDOW
  > 0.50 on C and D

BASE_SIGNAL_ABSENT_DOMINANT
  NO_LOCAL_RISE_THRESHOLD_CROSSING > 0.50 on C and D
  AND RAW_LOCAL_SUBTHRESHOLD > 0.50 of all misses on C and D

RISE_TRANSFORM_SUPPRESSION_DOMINANT
  NO_LOCAL_RISE_THRESHOLD_CROSSING > 0.50 on C and D
  AND RAW_LOCAL_SUPRATHRESHOLD_PRESENT > 0.50 of all misses on C and D

otherwise
  MIXED_MULTILAG_RISE_TEMPORAL_MISALIGNMENT
```

Dominance is strict `> 0.50`.

## Descriptive distributions

Report per cohort:

- all rise miss-category fractions
- false-event timing fractions
- rise peakOffsetSteps q10/q25/median/q75/q90
- missed-impact rise thresholdGap q10/q25/median/q75/q90
- raw peakOffsetSteps q10/q25/median/q75/q90
- raw thresholdGap q10/q25/median/q75/q90
- raw local context composition
- raw local context inside NO_LOCAL_RISE subset
- multilagRise q50/q75/q90/q95/q99 for:
  - BACKGROUND
  - PRE_HIT [-10,0)
  - IN_WINDOW [0,10)
  - LATE_POST_HIT [10,20)

Descriptive only.

## Support

Per cohort require:

```text
64 tapes
physical impacts >= 1000
rise neural events >= 500
false events >= 1000
missed impacts >= 1000
finite rise local peak >= 99%
finite raw local peak >= 99%
```

Support failure:

```text
...MULTILAG_RISE_INSUFFICIENT_ATTRIBUTION_SUPPORT
```

## Valid outcome

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_NEURAL_ONLY_PREDICTIVE_SURPRISE32_MULTILAG_RISE_FAILURE_ATTRIBUTED
```

## Stop rule

No:

- base model refit
- raw threshold change
- rise threshold change
- q change
- lag search
- smoothing
- timing shift
- eventizer change
- matching change
- C/D repair tuning
- deployment change

Any next repair requires a separate design, preregistration, and fresh prospective cohorts.

## Deployment

```text
diagnosticStackDeployable = false
deployabilityCandidate    = false

POTION v15D  DEPLOYED
v15N         CLOSED / BLOCKED
v16C         BLOCKED
```
