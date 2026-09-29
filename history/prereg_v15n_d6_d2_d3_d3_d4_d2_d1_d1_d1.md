# prereg_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1 — THREE_CLASS_TEMPORAL3

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / OUTCOME**

Design:

```text
history/design_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_three_class_temporal3.md
commit c343748d952064741a46203bee7c22a6e4453fe0
```

Frozen prerequisite:

```text
D4-D2-D1-D1 outcome
  V15N_D6_D2_D3_D3_D4_D2_D1_D1_TEMPORAL3_SCALAR_SEPARABILITY_AUDITED

result
  e894cb6d4c58b739bc8e789d6aedeec1d1a1651f

receipt
  c9e39c85bfd541db383305b43ec487d3372dccee

run
  36530978516

artifact
  11018846070

artifact digest
  sha256:98dcd5d0d2a8e86c9fc46ed318a07405ecc91cacdbc03f72226ba39f63d732aa

JSON sha256
  8e100496082be0c38bf66f24b1b0fdfe5e0115486831e7c38fa094a12a404fc9

scalarAxis
  PRECISION_RECALL_TRADEOFF
```

---

## 1. frozen feature/provenance

Require exact frozen D4/D4-D2 preprocessing:

```text
innovation PCA32
TEMPORAL3 dimension 96
temporal depth 3
D6 detector
DN identity/order
TRAIN seeds 4081000 4091000 4101000
TRAIN interruption 4147000
ridge lambda 1e-3
```

Any reconstruction/provenance mismatch:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_IMPLEMENTATION_OR_PROVENANCE_INVALID
```

---

## 2. frozen TRAIN strata

Use exactly:

```text
REALIZED_IMPACT
  latest physical hit age >= 0 and < 10

PRE_HIT
  not REALIZED_IMPACT
  next physical hit age > 0 and < 10

TRUE_BACKGROUND
  otherwise
```

Precedence:

```text
REALIZED_IMPACT > PRE_HIT > TRUE_BACKGROUND
```

No label or window modification.

---

## 3. three-class readout

Standardize all 96 feature columns using all eligible TRAIN rows only, unweighted.

Fit exactly three deterministic ridge least-squares heads:

```text
REALIZED_IMPACT
PRE_HIT
TRUE_BACKGROUND
```

Each head uses target 1 for its class and 0 otherwise.

Per-row sample weight:

```text
1 / (3 * N_stratum)
```

so each stratum contributes total weight 1/3 to every head.

For all heads:

```text
ridge lambda 1e-3
intercept unregularized
same feature standardization
same TRAIN rows
```

Prediction:

```text
argmax raw head score
```

Tie order:

```text
REALIZED_IMPACT
PRE_HIT
TRUE_BACKGROUND
```

No softmax, no probability calibration, no class-score threshold.

---

## 4. causal eventizer

```text
positive = predictedClass == REALIZED_IMPACT
event = 0->1 rising edge
refractory = 10 simulation steps
```

Initialize previousPositive=false and lastEmittedEventStep=null.

No persistence/hysteresis/re-arm/threshold search.

---

## 5. evaluator matching

Frozen exactly:

```text
for each physical hit:
  earliest unmatched event
  eventStep >= hitStep
  eventStep-hitStep < 10
```

Pre-hit events are never matched forward.

---

## 6. fresh cohorts

PROSPECTIVE_A:

```text
5631000 5641000 5651000 5661000
5671000 5681000 5691000 5701000
interruption 5717000
```

PROSPECTIVE_B:

```text
5721000 5731000 5741000 5751000
5761000 5771000 5781000 5791000
interruption 5807000
```

Exactly 64 tapes each.

No prior prospective/audit cohort may enter fitting or gate selection.

---

## 7. frozen binary baseline

On the same fresh cohorts also evaluate exact D4-D2:

```text
binary TEMPORAL3 model SHA
  4cb231aaf0c0f19b89dbc26f202aa2e50890e56452f1971627389cf63a5791a1

threshold
  0.5

same rising edge
same refractory
same evaluator matching
```

Baseline is descriptive only.

---

## 8. support

Require per cohort:

```text
64 tapes
physical impacts >= 1000
THREE_CLASS emitted events >= 500
REALIZED_IMPACT rows >= 1000
PRE_HIT rows >= 500
TRUE_BACKGROUND rows >= 500
```

Otherwise:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_INSUFFICIENT_SUPPORT
```

---

## 9. event-stream metrics/gates

Report for both baseline and THREE_CLASS:

```text
physicalImpacts
neuralEvents
matched
falseEvents
missedImpacts
precision
recall
F1
eventCountRatio
meanAbsolutePerTapeCountError
medianMatchedLatencySeconds
p90MatchedLatencySeconds
risingEdges
refractorySuppressed
```

THREE_CLASS passes a cohort only if all:

```text
precision >= 0.75
recall >= 0.75
F1 >= 0.75
0.80 <= eventCountRatio <= 1.20
meanAbsolutePerTapeCountError <= 5.0
```

Both cohorts must pass.

Frame-level 3-class confusion/per-class recall/macro recall are descriptive only.

---

## 10. authoritative outcomes

Precedence:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_IMPLEMENTATION_OR_PROVENANCE_INVALID

V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_INSUFFICIENT_SUPPORT

V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_THREE_CLASS_EVENT_STREAM_DEMONSTRATED

V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_THREE_CLASS_EVENT_STREAM_NOT_DEMONSTRATED
```

---

## 11. stop rule

After the first authoritative result, do not change:

- TRAIN or prospective seeds;
- PCA/preprocessing;
- temporal depth;
- strata/windows/precedence;
- sample weighting;
- ridge lambda;
- three-head target definition;
- argmax/tie order;
- eventizer;
- refractory;
- evaluator matching;
- support gates;
- event gates;
- outcome precedence.

If demonstrated, the next experiment may separately preregister cumulative injury memory over the frozen three-class event stream. The diagnostic readout still cannot deploy.

If not demonstrated, perform failure attribution before any further representation change.

```text
POTION v15D  DEPLOYED
v15N         CLOSED / BLOCKED
v16C         BLOCKED
```
