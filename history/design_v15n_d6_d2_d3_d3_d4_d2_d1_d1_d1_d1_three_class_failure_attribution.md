# design_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_three_class_failure_attribution

## Question

D4-D2-D1-D1-D1 established a valid fresh-cohort failure:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_THREE_CLASS_EVENT_STREAM_NOT_DEMONSTRATED
```

The three-class readout improved realized-impact sensitivity but caused severe over-emission:

```text
A precision 0.4316, recall 0.7856, event/hit 1.8201
B precision 0.4249, recall 0.7768, event/hit 1.8280
```

and about 76–78% of unmatched events were evaluator-defined background.

D4-D2-D1-D1-D1-D1 asks:

> What transition geometry causes background false events, are their class-score margins separable from correctly matched events, and what causes the remaining misses?

This is attribution only. It does not tune the three-class model.

---

## 1. frozen prerequisite

Require authoritative three-class evidence:

```text
result
  2021175bdaa7fce87aa59753a77ebd48ae8688c6

receipt
  7b2450f61c0aa1c1f4a21310f0aca3c16c1947d7

run
  36576316325

artifact
  11040692357

JSON sha256
  cc1c5fb57b7363fe8e936d5a67854bb4ee754c2472e30071f89888643e9678b7

outcome
  V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_THREE_CLASS_EVENT_STREAM_NOT_DEMONSTRATED

three-class model SHA
  cf9d38bbb697c1c2b98aa34f51c6ee39626c68763acbfb1c34e145eb738c7144
```

Reproduce the exact fresh-cohort event metrics before attribution.

---

## 2. cohorts

Reuse the exact D4-D2-D1-D1-D1 prospective cohorts because this is attribution of that frozen failure:

```text
ATTRIBUTION_A
5631000 5641000 5651000 5661000
5671000 5681000 5691000 5701000
interruption 5717000

ATTRIBUTION_B
5721000 5731000 5741000 5751000
5761000 5771000 5781000 5791000
interruption 5807000
```

Exactly 64 tapes each.

No new performance/generalization claim is allowed.

---

## 3. exact frozen three-class runtime diagnostic

Use exactly:

```text
PCA32_TEMPORAL3
three deterministic ridge heads
argmax raw score
tie order:
  REALIZED_IMPACT
  PRE_HIT
  TRUE_BACKGROUND

positive = predictedClass == REALIZED_IMPACT
event = 0->1 rising edge
refractory = 10 steps / 200 ms
matching window = [hit, hit+10)
```

No score threshold, margin threshold, persistence, hysteresis, re-arm, temporal-depth, or ridge search.

---

## 4. false-event timing attribution

For each unmatched emitted event, retain the frozen timing precedence:

```text
PRE_HIT_200MS
  future physical hit exists with 0 < hitStep-eventStep < 10

RECENT_POST_HIT_200MS
  otherwise, previous physical hit exists with
  0 <= eventStep-hitStep < 10

BACKGROUND_200MS
  otherwise
```

Report counts/fractions.

---

## 5. background-false entry-source attribution

For each unmatched event classified BACKGROUND_200MS, inspect the immediately previous eligible three-class frame.

Because an event is a rising edge into REALIZED_IMPACT, classify its entry source:

```text
FROM_TRUE_BACKGROUND
  previous predicted class == TRUE_BACKGROUND

FROM_PRE_HIT
  previous predicted class == PRE_HIT

FROM_INITIAL
  no previous eligible frame
```

Frozen entry-source axis:

```text
TRUE_BACKGROUND_ENTRY_DOMINANT
  FROM_TRUE_BACKGROUND fraction > 0.50 on both cohorts

PRE_HIT_ENTRY_DOMINANT
  FROM_PRE_HIT fraction > 0.50 on both cohorts

INITIAL_ENTRY_DOMINANT
  FROM_INITIAL fraction > 0.50 on both cohorts

otherwise
  MIXED_ENTRY_SOURCE
```

---

## 6. event-margin attribution

At every emitted event define:

```text
realizedMargin =
  score_REALIZED_IMPACT
  - max(score_PRE_HIT, score_TRUE_BACKGROUND)
```

By argmax construction, emitted-event margin is >= 0.

Separate emitted events into:

```text
MATCHED_EVENT
BACKGROUND_FALSE_EVENT
PRE_HIT_FALSE_EVENT
```

Report per group:

- rows;
- mean;
- q25;
- median;
- q75;
- q90.

Also compute evaluator-only AUC using `realizedMargin` to distinguish:

```text
MATCHED_EVENT (positive)
vs
BACKGROUND_FALSE_EVENT (negative)
```

No margin threshold is selected.

Frozen margin axis:

```text
MARGIN_SEPARABLE
  AUC >= 0.75 on both cohorts

MARGIN_NOT_SEPARABLE
  AUC < 0.75 on both cohorts

MIXED_MARGIN_SEPARABILITY
  otherwise
```

This AUC is diagnostic only and cannot authorize a margin gate.

---

## 7. missed-impact attribution

For every unmatched physical impact inspect exact frozen three-class state in:

```text
[hitStep, hitStep+10)
```

Precedence:

### MATCH_CONFLICT

An emitted event exists in-window but was consumed by an earlier physical impact.

### PRE_HIT_REALIZED_CARRYOVER

If not MATCH_CONFLICT:

- at least one frame in-window predicts REALIZED_IMPACT;
- no emitted event exists in-window;
- first eligible frame at/after hit predicts REALIZED_IMPACT;
- immediately previous eligible frame also predicts REALIZED_IMPACT.

### REALIZED_NO_EVENT_OTHER

If not above:

- at least one frame in-window predicts REALIZED_IMPACT;
- no emitted event exists in-window.

### NO_REALIZED_WINDOW

No frame in-window predicts REALIZED_IMPACT.

For NO_REALIZED_WINDOW only, descriptively inspect [hit+10, hit+20) and report whether REALIZED_IMPACT appears late and its first latency.

Frozen miss axis:

```text
NO_REALIZED_DOMINANT
  NO_REALIZED_WINDOW fraction > 0.50 on both cohorts

PRE_HIT_CARRYOVER_DOMINANT
  PRE_HIT_REALIZED_CARRYOVER fraction > 0.50 on both cohorts

MATCH_CONFLICT_DOMINANT
  MATCH_CONFLICT fraction > 0.50 on both cohorts

otherwise
  MIXED_MISS_FAILURE
```

---

## 8. support

Require per cohort:

```text
64 tapes
unmatched events >= 1000
BACKGROUND_200MS false events >= 800
missed physical impacts >= 250
matched events >= 1000
```

Otherwise attribution support is insufficient.

---

## 9. interpretation

The next repair may be chosen only from the frozen axes.

Examples:

```text
TRUE_BACKGROUND_ENTRY_DOMINANT + MARGIN_NOT_SEPARABLE
  direct class geometry remains insufficient;
  do not add a margin threshold.

TRUE_BACKGROUND_ENTRY_DOMINANT + MARGIN_SEPARABLE
  a TRAIN-only calibrated confidence rule becomes scientifically testable,
  but no threshold may be chosen from these attribution cohorts.

PRE_HIT_ENTRY_DOMINANT
  pre-hit/realized transition geometry is the immediate false-event blocker.

NO_REALIZED_DOMINANT
  sensitivity remains representation-limited for misses.

PRE_HIT_CARRYOVER_DOMINANT
  rising-edge semantics remain a major miss mechanism.
```

No repair is implemented in this experiment.

---

## 10. deployment

```text
POTION v15D  DEPLOYED
v15N         CLOSED / BLOCKED
v16C         BLOCKED
```
