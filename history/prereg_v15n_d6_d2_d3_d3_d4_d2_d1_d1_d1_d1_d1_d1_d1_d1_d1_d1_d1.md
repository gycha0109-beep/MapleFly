# prereg_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1 — anchored-delta3 confirmatory failure attribution

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / OUTCOME**

Design:

```text
history/design_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_anchored_delta3_confirmatory_failure_attribution.md
commit 28a902b71e3aed80cccae20d8b5faa0941dacc12
```

Frozen prerequisite:

```text
result
  4440e572859b58a1c70c327172d89601e879cf08

receipt
  d5f7105d4e1984297dd11512f0e6ab62a17ee45f

run
  36822848365

artifact
  11147009045

artifact digest
  sha256:d9b3268afbeae381956a5ad2eba17229cecd50329628dac8695aef9bc97bfdb9

JSON sha256
  1e1704f12d094e83c5e6f66e9ba8f589225e4a26a01c505275296e4de6334e99

trajectory model SHA
  6f2e4c0ec8c7ae438934a1b13db8f062387df3354383b6fab19eac5d8f354105

threshold
  0.5918989570787438
```

## Attribution cohorts

CONFIRM_A:

```text
6801000 6811000 6821000 6831000
6841000 6851000 6861000 6871000
interruption 6887000
```

CONFIRM_B:

```text
6891000 6901000 6911000 6921000
6931000 6941000 6951000 6961000
interruption 6977000
```

Exactly 64 tapes each.

No new generalization claim.

## Exact reproduction

Reconstruct the exact frozen anchored-delta3 trajectory model and threshold.

Require exact reproduction of authoritative confirmatory A/B metrics.

Any evidence/model/threshold/metric mismatch:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_IMPLEMENTATION_OR_PROVENANCE_INVALID
```

## Frozen runtime diagnostic

Exactly preserve:

```text
PCA32_ANCHORED_DELTA3
width 128
horizons 1/3/5 frames

trajectoryScore_t =
  intercept + beta dot standardized(x_t)

tau = 0.5918989570787438

positive_t = trajectoryScore_t >= tau
crossing_t = positive_t && !positive_(t-1)
refractory = 10 steps

matching =
  earliest unmatched event in [hit, hit+10)
```

No alternate score or threshold.

## False-event timing

For unmatched emitted events use precedence:

```text
PRE_HIT_200MS
RECENT_POST_HIT_200MS
BACKGROUND_200MS
```

with the exact design definitions.

## Miss attribution precedence

For each unmatched physical impact:

```text
MATCH_CONFLICT
REFRACTORY_SUPPRESSED_CROSSING
PRE_HIT_ABOVE_THRESHOLD_CARRYOVER
ABOVE_THRESHOLD_NO_EVENT_OTHER
NO_THRESHOLD_WINDOW
```

using the exact design definitions.

## NO_THRESHOLD_WINDOW geometry

For each such miss:

```text
peakScore200ms
thresholdGap = tau - peakScore200ms
```

Aggregate:

```text
mean
q10
q25
median
q75
q90
```

Also inspect [hit+10,hit+20) descriptively for:

```text
lateAboveThreshold
lateRawCrossing
firstLateCrossingLatencySeconds
```

No threshold selection.

## PRE_HIT carryover geometry

For each such miss:

```text
preHitScore
firstPostHitScore
peakScore200ms
postHitGain = peakScore200ms - preHitScore
```

Aggregate postHitGain:

```text
mean
q10
q25
median
q75
q90
```

No gain threshold selection.

## Frozen miss axis

Precedence:

```text
PRE_HIT_CARRYOVER_DOMINANT
  PRE_HIT_ABOVE_THRESHOLD_CARRYOVER > 0.50 on both cohorts

NO_THRESHOLD_DOMINANT
  NO_THRESHOLD_WINDOW > 0.50 on both cohorts

REFRACTORY_DOMINANT
  REFRACTORY_SUPPRESSED_CROSSING > 0.50 on both cohorts

MATCH_CONFLICT_DOMINANT
  MATCH_CONFLICT > 0.50 on both cohorts

otherwise
  MIXED_ANCHORED_DELTA3_MISS
```

Dominance is strict > 0.50.

## Cohort asymmetry

Report:

```text
A-B miss fraction for every category
A-B median thresholdGap
A-B median postHitGain
```

Descriptive only.

## Original vs confirmation comparison

Report frozen original A/B recall and confirmation A/B recall, with original-to-confirm deltas.

Do not pool cohorts.

## Support

Per cohort require:

```text
64 tapes
physical impacts >= 1000
matched events >= 1000
missed impacts >= 250
```

Support failure:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_INSUFFICIENT_ATTRIBUTION_SUPPORT
```

## Valid outcome

After provenance, reproduction, and support:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_ANCHORED_DELTA3_CONFIRMATORY_FAILURE_ATTRIBUTED
```

## Stop rule

No refit, calibration, threshold search, feature/horizon search, refractory tuning, eventizer modification, or deployment change.

```text
diagnosticStackDeployable = false
POTION v15D  DEPLOYED
v15N         CLOSED / BLOCKED
v16C         BLOCKED
```
