# prereg_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_d1_d1 — causal margin dynamics6

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / OUTCOME**

Design:

```text
history/design_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_d1_d1_causal_margin_dynamics.md
commit 544398909e7f5430f4aa695f962b545f0e7e4eb4
```

Frozen prerequisite:

```text
result
  a6024e193e19fb11be5edc23f842c8aba7b82749

receipt
  b6475659d97dc18c24efd1ac225e79d899d49481

run
  36716008149

artifact
  11101046573

artifact digest
  sha256:b8201285760a9bbd2d19000a24b22312e974b530320ea33cc8bfc522c66f934b

JSON sha256
  21f2b96ff0f94534b88aa329ae34c11441d42123226953da3884bedf394041f7

missAxis
  NO_THRESHOLD_DOMINANT

three-class model SHA
  cf9d38bbb697c1c2b98aa34f51c6ee39626c68763acbfb1c34e145eb738c7144
```

## Frozen upstream stack

Exactly preserve the frozen three-class model and upstream neural preprocessing.

At every eligible frame:

```text
margin_t =
  score_REALIZED_IMPACT(t)
  - max(score_PRE_HIT(t), score_TRUE_BACKGROUND(t))
```

## Representation

For every frame with six available consecutive margins:

```text
x_t = [
  margin_(t-5),
  margin_(t-4),
  margin_(t-3),
  margin_(t-2),
  margin_(t-1),
  margin_t
]
```

Dimension 6.

No future frame and no physical game state enter runtime features.

## DYNAMICS_TRAIN cohort

Exactly:

```text
6081000 6091000 6101000 6111000
6121000 6131000 6141000 6151000
interruption 6167000
```

Exactly 64 tapes.

## TRAIN target

Evaluator-only offline target:

```text
y = 1
iff latest physical hit satisfies
0 <= frameStep-hitStep < 10

otherwise y = 0
```

Latest qualifying hit wins.

## Standardization and ridge

TRAIN only:

```text
unweighted mean/std per feature
ridge lambda = 1e-3
intercept unregularized
positive total sample weight = 0.5
negative total sample weight = 0.5
```

No sigmoid.

## CALIBRATION cohort

Exactly:

```text
6171000 6181000 6191000 6201000
6211000 6221000 6231000 6241000
interruption 6257000
```

Exactly 64 tapes.

## Threshold candidates

Exactly:

```text
0
plus every distinct finite positive dynamicsScore observed on CALIBRATION frames
```

Exact Number deduplication, ascending sort.

No threshold candidate may be sourced from TRAIN, prior attribution, or prospective cohorts.

## Eventizer

For candidate tau:

```text
positive_t = dynamicsScore_t >= tau
crossing_t = positive_t && !positive_(t-1)
refractory = 10 steps
```

No persistence, hysteresis, peak detector, derivative threshold, secondary threshold, or alternate event rule.

## Matching

Exactly:

```text
earliest unmatched emitted event
eventStep >= hitStep
eventStep-hitStep < 10
```

## Training/calibration support

Require:

```text
TRAIN tapes = 64
positive TRAIN rows >= 1000
negative TRAIN rows >= 5000

CALIBRATION tapes = 64
physical impacts >= 1000
threshold candidates >= 100
```

Otherwise:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_INSUFFICIENT_SUPPORT
```

## Calibration feasibility gates

All must pass:

```text
precision >= 0.75
recall >= 0.75
F1 >= 0.75
0.80 <= eventCountRatio <= 1.20
meanAbsolutePerTapeCountError <= 5.0
```

If no candidate is feasible:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_CAUSAL_MARGIN_DYNAMICS6_CALIBRATION_NO_FEASIBLE_THRESHOLD
```

No prospective evaluation.

## Deterministic threshold selection

Among feasible thresholds choose lexicographically:

```text
1 maximum F1
2 minimum abs(eventCountRatio - 1)
3 minimum meanAbsolutePerTapeCountError
4 maximum precision
5 maximum recall
6 maximum threshold
```

Freeze before prospective evaluation.

## Fresh prospective cohorts

A:

```text
6261000 6271000 6281000 6291000
6301000 6311000 6321000 6331000
interruption 6347000
```

B:

```text
6351000 6361000 6371000 6381000
6391000 6401000 6411000 6421000
interruption 6437000
```

Exactly 64 tapes each.

## Frozen comparator

Descriptively evaluate on the same fresh tapes:

```text
frozen three-class margin
tau = 0.2378919189622094
crossing eventizer
refractory 10
same matching
```

Comparator does not affect threshold/model selection.

## Prospective support

Per cohort require:

```text
64 tapes
physical impacts >= 1000
dynamics events >= 500
```

Otherwise INSUFFICIENT_SUPPORT.

## Prospective gates

Both cohorts must pass:

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
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_IMPLEMENTATION_OR_PROVENANCE_INVALID

V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_INSUFFICIENT_SUPPORT

V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_CAUSAL_MARGIN_DYNAMICS6_CALIBRATION_NO_FEASIBLE_THRESHOLD

V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_CAUSAL_MARGIN_DYNAMICS6_EVENT_STREAM_DEMONSTRATED

V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_CAUSAL_MARGIN_DYNAMICS6_EVENT_STREAM_NOT_DEMONSTRATED
```

## Stop rule

After the first authoritative run do not change:

- DYNAMICS6 feature definition;
- TRAIN/CALIBRATION/prospective cohorts;
- ridge lambda or sample weights;
- candidate construction;
- selection ordering;
- refractory;
- matching;
- support floors;
- gates.

No parameter selection from prior attribution cohorts or prospective results.

```text
diagnosticStackDeployable = false
POTION v15D  DEPLOYED
v15N         CLOSED / BLOCKED
v16C         BLOCKED
```
