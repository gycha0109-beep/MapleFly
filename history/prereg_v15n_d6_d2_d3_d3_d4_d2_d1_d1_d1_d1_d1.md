# prereg_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1 — train-calibrated margin crossing

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / OUTCOME**

Design:

```text
history/design_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_train_calibrated_margin_crossing.md
commit dc32192353960ef10f4c57ffe366bb8c6bd2e610
```

Frozen prerequisite:

```text
result
  9bf1718d93facc1ada1055594753046da18658b9

receipt
  b00f962a86a61c8ef25d2cfc43f2df112c0159da

run
  36666864084

artifact
  11078026076

artifact digest
  sha256:6f044886d2d138c851fabb317eaa2511e79d0ec5ddd5de1bf0ad54ddad53b177

JSON sha256
  a39781bedc4cb67da602c758a09b942b5a98b622a1aa9902123b9b0fda410024

axes
  TRUE_BACKGROUND_ENTRY_DOMINANT
  MARGIN_SEPARABLE
  PRE_HIT_CARRYOVER_DOMINANT

three-class model SHA
  cf9d38bbb697c1c2b98aa34f51c6ee39626c68763acbfb1c34e145eb738c7144
```

## Frozen representation

Exactly preserve the three-class model and the neural representation:

```text
PCA32_TEMPORAL3
temporal depth 3
three ridge heads
raw three-class scores
```

No model refit or feature change.

## Runtime margin

```text
margin_t =
  score_REALIZED_IMPACT(t)
  - max(score_PRE_HIT(t), score_TRUE_BACKGROUND(t))
```

No evaluator state enters runtime inference.

## Calibration cohort

Exactly:

```text
5811000 5821000 5831000 5841000
5851000 5861000 5871000 5881000
interruption 5897000
```

Exactly 64 tapes.

## Threshold candidates

Exactly:

```text
0
plus every distinct finite positive margin observed on eligible calibration frames
```

Sorted ascending, exact Number deduplication.

No attribution/prospective margin value may enter this set.

## Margin-crossing eventizer

For threshold tau:

```text
positive_t = margin_t >= tau
crossing_t = positive_t && !positive_(t-1)
refractory = 10 simulation steps
```

Emit only when refractory is clear.

No second threshold, persistence, hysteresis, derivative rule, or peak detector.

## Matching

Exactly:

```text
earliest unmatched event with
eventStep >= hitStep
eventStep-hitStep < 10
```

## Calibration support

Require:

```text
64 tapes
physical impacts >= 1000
candidate thresholds >= 100
```

Otherwise:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_INSUFFICIENT_CALIBRATION_SUPPORT
```

## Calibration feasibility

For each threshold evaluate the exact frozen D4-D2 event metrics.

A threshold is feasible only if all:

```text
precision >= 0.75
recall >= 0.75
F1 >= 0.75
0.80 <= eventCountRatio <= 1.20
meanAbsolutePerTapeCountError <= 5.0
```

If none is feasible:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_CALIBRATION_NO_FEASIBLE_MARGIN
```

No prospective claim.

## Deterministic selection

Among feasible thresholds choose lexicographically:

```text
1 maximum F1
2 minimum abs(eventCountRatio - 1)
3 minimum meanAbsolutePerTapeCountError
4 maximum precision
5 maximum recall
6 maximum threshold
```

Freeze that threshold before prospective evaluation.

## Fresh prospective cohorts

A:

```text
5901000 5911000 5921000 5931000
5941000 5951000 5961000 5971000
interruption 5987000
```

B:

```text
5991000 6001000 6011000 6021000
6031000 6041000 6051000 6061000
interruption 6077000
```

Exactly 64 tapes each.

## Comparator

Evaluate the frozen three-class discrete class-state rising-edge eventizer on the same fresh cohorts descriptively.

## Prospective support

Require per cohort:

```text
64 tapes
physical impacts >= 1000
margin-crossing neural events >= 500
```

Otherwise:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_INSUFFICIENT_PROSPECTIVE_SUPPORT
```

## Prospective gates

Margin crossing passes only if on both fresh cohorts:

```text
precision >= 0.75
recall >= 0.75
F1 >= 0.75
0.80 <= eventCountRatio <= 1.20
meanAbsolutePerTapeCountError <= 5.0
```

## Authoritative outcomes

Precedence:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_IMPLEMENTATION_OR_PROVENANCE_INVALID

V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_INSUFFICIENT_CALIBRATION_SUPPORT

V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_CALIBRATION_NO_FEASIBLE_MARGIN

V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_INSUFFICIENT_PROSPECTIVE_SUPPORT

V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_MARGIN_CROSSING_EVENT_STREAM_DEMONSTRATED

V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_MARGIN_CROSSING_EVENT_STREAM_NOT_DEMONSTRATED
```

## Stop rule

After the first authoritative result do not change:

- frozen model/representation;
- margin definition;
- calibration cohort;
- prospective cohorts;
- candidate construction;
- selection ordering;
- refractory;
- matching;
- support floors;
- gates.

No threshold may be selected from prior attribution cohorts or prospective results.

```text
POTION v15D  DEPLOYED
v15N         CLOSED / BLOCKED
v16C         BLOCKED
```
