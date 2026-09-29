# prereg_v15n_d6_d2_d3_d3_d4_d2 — causal delayed TEMPORAL3 eventizer

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / OUTCOME**

Frozen prerequisite:

```text
v15N-D6-D2-D3-D3-D4-D1
  V15N_D6_D2_D3_D3_D4_D1_REALIZED_IMPACT_AGE_ATTRIBUTED
  ageAxis = EARLY_ONLY_UNRESOLVED

result
  89c0cac3d7b90432333bafa0c4ce8a832be26599

receipt
  da62089803c06e8ac6c721e01b2b5c509ccace9e

authoritative run
  36507440642

authoritative artifact
  11008183466
```

All exact D4/D4-D1 evidence and model identities are inherited by reference from the frozen result/receipt above and must reproduce before this experiment is valid.

Design:

```text
history/design_v15n_d6_d2_d3_d3_d4_d2_causal_delayed_eventizer.md
commit 8cae6ffffbf261f3ebd0849eb88edf15e87537f7
```

---

## 1. causal runtime score

Reconstruct the exact frozen PCA32_TEMPORAL3 score from D4.

Freeze:

```text
threshold = 0.5
temporal depth = 3
```

At each eligible frame:

```text
positive_t = temporal3Score_t >= 0.5
```

Only current/past neural evidence is allowed.

No old-scalar context gate.
No evaluator truth, HP, damage amount, future timing, or oracle impact window may enter runtime eventization.

Any frozen-stack reconstruction or provenance mismatch:

```text
V15N_D6_D2_D3_D3_D4_D2_IMPLEMENTATION_OR_PROVENANCE_INVALID
```

---

## 2. frozen delayed rising-edge eventizer

Initialize:

```text
previousPositive = false
lastEmittedEventStep = null
```

At each eligible frame:

```text
risingEdge =
  positive_t
  &&
  !previousPositive

emit =
  risingEdge
  &&
  (
    lastEmittedEventStep == null
    ||
    frameStep_t - lastEmittedEventStep >= 10
  )
```

If emitted, record one neural event at frameStep_t.

Then:

```text
previousPositive = positive_t
```

Fixed refractory:

```text
10 simulation steps = 200 ms
```

No threshold, refractory, persistence, re-arm, or temporal-depth search.

---

## 3. evaluator-only one-to-one matching

For each physical impact in chronological order, match the earliest still-unmatched neural event satisfying:

```text
eventStep >= impactStep
eventStep - impactStep < 10
```

Each event matches at most one impact.
Pre-impact events cannot match forward.

---

## 4. cohorts

TRAIN only reconstructs the frozen representation:

```text
4081000 4091000 4101000
interruption 4147000
```

PROSPECTIVE_A:

```text
5451000 5461000 5471000 5481000
5491000 5501000 5511000 5521000
interruption 5537000
```

PROSPECTIVE_B:

```text
5541000 5551000 5561000 5571000
5581000 5591000 5601000 5611000
interruption 5627000
```

Exactly 64 tapes per prospective cohort.

D4/D4-D1 attribution cohorts are not used for this prospective event-stream claim.

---

## 5. support

Each cohort requires:

```text
64 tapes
physical impacts >= 1000
emitted neural events >= 500
```

Otherwise:

```text
V15N_D6_D2_D3_D3_D4_D2_INSUFFICIENT_EVENT_SUPPORT
```

---

## 6. metrics

Per cohort report:

- physical impacts;
- emitted neural events;
- matched events;
- false events;
- missed impacts;
- precision;
- recall;
- F1;
- event / impact count ratio;
- mean tape-level absolute event-count error;
- median matched latency;
- p90 matched latency;
- pre-impact unmatched events within 200 ms;
- impact-pair fraction below 200 ms;
- refractory-suppressed rising edges.

---

## 7. frozen gates

Reuse the prior causal event-stream gates unchanged.

Both cohorts independently require:

```text
precision >= 0.75
recall >= 0.75
F1 >= 0.75
0.80 <= neuralEventCount / physicalImpactCount <= 1.20
mean tape-level absolute event-count error <= 5.0
```

---

## 8. outcomes

Precedence:

```text
V15N_D6_D2_D3_D3_D4_D2_IMPLEMENTATION_OR_PROVENANCE_INVALID

V15N_D6_D2_D3_D3_D4_D2_INSUFFICIENT_EVENT_SUPPORT

V15N_D6_D2_D3_D3_D4_D2_CAUSAL_DELAYED_EVENT_STREAM_DEMONSTRATED

V15N_D6_D2_D3_D3_D4_D2_CAUSAL_DELAYED_EVENT_STREAM_NOT_DEMONSTRATED
```

---

## 9. stop rule

After the first authoritative result do not change:

- cohorts/seeds;
- frozen representation/readout;
- threshold 0.5;
- temporal depth 3;
- rising-edge definition;
- 200 ms refractory;
- matching window/algorithm;
- support floors;
- event-stream gates;
- outcome precedence.

If PASS, only a separate preregistered experiment may test cumulative injury memory.

If FAIL, first attribute event-stream failure before any threshold, refractory, or representation change.

POTION v15D remains deployed. v15N and v16C remain blocked.
