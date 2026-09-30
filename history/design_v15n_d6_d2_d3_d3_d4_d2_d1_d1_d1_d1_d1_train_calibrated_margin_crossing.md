# design_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_train_calibrated_margin_crossing

## Question

D4-D2-D1-D1-D1-D1 established:

```text
entrySourceAxis = TRUE_BACKGROUND_ENTRY_DOMINANT
marginAxis      = MARGIN_SEPARABLE
missAxis        = PRE_HIT_CARRYOVER_DOMINANT
```

The frozen three-class model therefore has two coupled eventizer failures:

1. many low-confidence background/pre-hit transitions enter REALIZED_IMPACT and emit false events;
2. many physical hits arrive while the discrete classifier is already REALIZED_IMPACT, so a class-state 0->1 edge cannot fire after the hit.

This experiment asks:

> Can a margin crossing on the exact frozen three-class model, with its threshold chosen only on a dedicated calibration cohort and then frozen, produce a causal physical-impact event stream on completely fresh prospective cohorts?

The runtime variable remains neural-only.

---

## 1. frozen prerequisite

Require authoritative D4-D2-D1-D1-D1-D1:

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

three-class model SHA
  cf9d38bbb697c1c2b98aa34f51c6ee39626c68763acbfb1c34e145eb738c7144

entrySourceAxis
  TRUE_BACKGROUND_ENTRY_DOMINANT

marginAxis
  MARGIN_SEPARABLE

missAxis
  PRE_HIT_CARRYOVER_DOMINANT
```

---

## 2. frozen neural representation and readout

Preserve exactly:

```text
D6 phase-residualized DN representation
innovation PCA32
PCA32_TEMPORAL3
temporal depth 3
three ridge heads
raw scores:
  REALIZED_IMPACT
  PRE_HIT
  TRUE_BACKGROUND
three-class model SHA:
  cf9d38bbb697c1c2b98aa34f51c6ee39626c68763acbfb1c34e145eb738c7144
```

No model refit and no feature change.

---

## 3. continuous runtime margin

For every eligible neural frame define:

```text
margin_t =
  score_REALIZED_IMPACT(t)
  - max(
      score_PRE_HIT(t),
      score_TRUE_BACKGROUND(t)
    )
```

This uses only the frozen neural readout scores.

No physical hit, contact, HP, damage, future state, seed, or evaluator label enters runtime inference.

---

## 4. dedicated calibration cohort

Threshold selection is permitted only on a new calibration cohort never used in prior fitting, audit, attribution, or prospective claims.

CALIBRATION:

```text
base seeds
  5811000 5821000 5831000 5841000
  5851000 5861000 5871000 5881000

interruption
  5897000
```

Exactly 64 tapes.

Calibration is not a prospective evidence cohort and carries no generalization claim.

---

## 5. threshold candidate set

Generate eligible TEMPORAL3 frames on the calibration tapes.

Candidate thresholds are exactly:

```text
0
plus every distinct finite positive margin value observed on calibration frames
```

Sort ascending and deduplicate by exact JavaScript Number equality.

No value from any attribution or prospective cohort enters the candidate set.

---

## 6. margin-crossing eventizer

For a candidate threshold tau:

```text
positive_t = margin_t >= tau
crossing_t = positive_t && !positive_(t-1)
```

Initialize:

```text
previousPositive = false
lastEmittedEventStep = null
```

Emit on a crossing only if:

```text
lastEmittedEventStep is null
OR
currentStep - lastEmittedEventStep >= 10
```

Refractory remains exactly 10 simulation steps / 200 ms.

No class-state condition is additionally required. For tau > 0, margin >= tau already implies REALIZED_IMPACT strictly exceeds both other class scores.

No hysteresis, persistence, derivative threshold, peak detector, re-arm timer, or second threshold.

---

## 7. evaluator matching

Use the exact frozen evaluator-only matching:

```text
for each physical hit:
  earliest unmatched emitted event
  eventStep >= hitStep
  eventStep - hitStep < 10
```

Pre-hit events are never matched forward.

---

## 8. calibration support

Require:

```text
64 tapes
physical impacts >= 1000
distinct threshold candidates >= 100
```

Otherwise calibration support is insufficient.

---

## 9. calibration metrics and feasibility

For every threshold candidate report:

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

A threshold is calibration-feasible only if all frozen D4-D2 gates pass:

```text
precision >= 0.75
recall >= 0.75
F1 >= 0.75
0.80 <= eventCountRatio <= 1.20
meanAbsolutePerTapeCountError <= 5.0
```

If no threshold is feasible:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_CALIBRATION_NO_FEASIBLE_MARGIN
```

and no prospective claim is made.

---

## 10. deterministic threshold selection

Among calibration-feasible thresholds select exactly one by lexicographic order:

```text
1. maximum F1
2. minimum abs(eventCountRatio - 1)
3. minimum meanAbsolutePerTapeCountError
4. maximum precision
5. maximum recall
6. maximum threshold
```

The selected threshold is frozen before prospective evaluation.

No manual override.

---

## 11. fresh prospective cohorts

Only if calibration produces a feasible threshold:

PROSPECTIVE_A:

```text
5901000 5911000 5921000 5931000
5941000 5951000 5961000 5971000

interruption
5987000
```

PROSPECTIVE_B:

```text
5991000 6001000 6011000 6021000
6031000 6041000 6051000 6061000

interruption
6077000
```

Exactly 64 tapes each.

These seeds must not enter calibration or threshold selection.

---

## 12. frozen comparator

On the same fresh prospective tapes also evaluate the exact frozen D4-D2-D1-D1-D1 class-state eventizer:

```text
positive = predictedClass == REALIZED_IMPACT
event = class-state 0->1 rising edge
refractory = 10 steps
same matching
```

Comparator is descriptive only.

---

## 13. prospective support and gates

Require per fresh cohort:

```text
64 tapes
physical impacts >= 1000
margin-crossing neural events >= 500
```

Then apply the exact same primary gates:

```text
precision >= 0.75
recall >= 0.75
F1 >= 0.75
0.80 <= eventCountRatio <= 1.20
meanAbsolutePerTapeCountError <= 5.0
```

Both fresh cohorts must pass.

---

## 14. authoritative interpretations

### MARGIN_CROSSING_EVENT_STREAM_DEMONSTRATED

Calibration is valid and one frozen calibration-selected threshold passes all five event-stream gates on both completely fresh prospective cohorts.

This establishes that continuous confidence crossing can repair the discrete class-state eventizer failure.

It does not authorize deployment because the three-class readout and calibration labels use evaluator physical-hit truth during offline fitting/calibration.

### MARGIN_CROSSING_EVENT_STREAM_NOT_DEMONSTRATED

Calibration is valid and feasible, but the frozen selected threshold fails one or more primary gates on either fresh cohort.

Do not retune the threshold on prospective results. Attribute the failure before further repair.

### CALIBRATION_NO_FEASIBLE_MARGIN

No calibration threshold passes all gates. Stop without selecting a threshold from prior attribution cohorts.

---

## 15. stop rule

After the first authoritative run, do not change:

- frozen three-class model;
- margin definition;
- calibration seeds;
- prospective seeds;
- candidate construction;
- threshold-selection ordering;
- refractory;
- evaluator matching;
- support floors;
- event gates.

No threshold from D4-D2-D1-D1-D1-D1 attribution cohorts may be used.

No deployment change:

```text
POTION v15D  DEPLOYED
v15N         CLOSED / BLOCKED
v16C         BLOCKED
```
