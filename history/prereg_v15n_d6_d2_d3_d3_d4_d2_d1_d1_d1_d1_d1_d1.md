# prereg_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_d1 — margin-crossing failure attribution

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / OUTCOME**

Design:

```text
history/design_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_d1_margin_crossing_failure_attribution.md
commit 15ab0597509f438fd1fa822c362549501d3310e3
```

Frozen prerequisite:

```text
result
  07397cace8c3877d29386f9b4b9ed064c2779ffd

receipt
  a6f092335b9530e77d4a35d1f5424069a653494a

run
  36699990275

artifact
  11091860656

artifact digest
  sha256:e0d4f25f828343ddaabb4c7e02df5dd05391cfde10daf1ebbfea369c0bc39651

JSON sha256
  f5bdc5e56984083fd7f56c41c230a6a51ecef9ea8377b6bbbcce210406e012c3

selected threshold
  0.2378919189622094

three-class model SHA
  cf9d38bbb697c1c2b98aa34f51c6ee39626c68763acbfb1c34e145eb738c7144
```

## Exact reproduction

Before attribution, reconstruct the exact frozen three-class model and exact margin-crossing eventizer and reproduce the authoritative prospective A/B metrics exactly.

Any provenance/model/threshold/reproduction mismatch:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_IMPLEMENTATION_OR_PROVENANCE_INVALID
```

## Attribution cohorts

Reuse exactly:

```text
A
5901000 5911000 5921000 5931000
5941000 5951000 5961000 5971000
interruption 5987000

B
5991000 6001000 6011000 6021000
6031000 6041000 6051000 6061000
interruption 6077000
```

Exactly 64 tapes each.

These cohorts support failure attribution only.

## Frozen runtime diagnostic

Exactly preserve:

```text
PCA32_TEMPORAL3
frozen three-class model
tau = 0.2378919189622094

margin_t =
  score_REALIZED_IMPACT(t)
  - max(score_PRE_HIT(t), score_TRUE_BACKGROUND(t))

positive_t = margin_t >= tau
crossing_t = positive_t && !positive_(t-1)

refractory = 10 steps
matching = earliest unmatched event in [hit, hit+10)
```

No alternate threshold or eventizer.

## False-event timing

For every unmatched emitted event, precedence:

```text
PRE_HIT_200MS
RECENT_POST_HIT_200MS
BACKGROUND_200MS
```

using the exact timing definitions in the design.

## Miss attribution

For each unmatched physical impact use precedence:

```text
MATCH_CONFLICT

REFRACTORY_SUPPRESSED_CROSSING

PRE_HIT_ABOVE_THRESHOLD_CARRYOVER

ABOVE_THRESHOLD_NO_EVENT_OTHER

NO_THRESHOLD_WINDOW
```

using the exact definitions in the design.

## NO_THRESHOLD_WINDOW geometry

For each such miss report:

```text
peakMargin200ms
thresholdGap = tau - peakMargin200ms
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

Also inspect [hit+10, hit+20) only for descriptive late threshold attainment and first late crossing latency.

No threshold may be selected from these values.

## PRE_HIT_ABOVE_THRESHOLD_CARRYOVER geometry

For each such miss report:

```text
preHitMargin
firstPostHitMargin
peakMargin200ms
postHitGain = peakMargin200ms - preHitMargin
```

Aggregate postHitGain with:

```text
mean
q10
q25
median
q75
q90
```

No gain threshold may be selected.

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
  MIXED_MARGIN_CROSSING_MISS
```

Dominance criterion is strict > 0.50.

## Cohort asymmetry

Report descriptively:

```text
A minus B miss fraction for each category
A minus B median thresholdGap
A minus B median postHitGain
```

No significance threshold and no repair selection from these descriptive differences.

## Support

Require per cohort:

```text
64 tapes
physical impacts >= 1000
matched events >= 1000
missed impacts >= 250
```

Otherwise:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_INSUFFICIENT_ATTRIBUTION_SUPPORT
```

## Valid outcome

After provenance, exact reproduction, and support:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_MARGIN_CROSSING_FAILURE_ATTRIBUTED
```

## Stop rule

After the first authoritative attribution result, do not change:

- threshold;
- cohorts;
- model;
- margin definition;
- eventizer;
- refractory;
- matching;
- attribution precedence;
- timing windows;
- dominance rule;
- support floors.

No threshold tuning, temporal-depth tuning, refractory tuning, or deployment change.

```text
POTION v15D  DEPLOYED
v15N         CLOSED / BLOCKED
v16C         BLOCKED
```
