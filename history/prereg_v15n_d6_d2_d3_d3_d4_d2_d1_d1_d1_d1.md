# prereg_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1 — three-class failure attribution

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / OUTCOME**

Design:

```text
history/design_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_three_class_failure_attribution.md
commit 582e51951c46a201f1dd0e272936acf4a7b46a17
```

Frozen prerequisite:

```text
result
  2021175bdaa7fce87aa59753a77ebd48ae8688c6

receipt
  7b2450f61c0aa1c1f4a21310f0aca3c16c1947d7

run
  36576316325

artifact
  11040692357

artifact digest
  sha256:316acd1aeb8fb08dadd2427182976661c6ef2f48f312cfd5b2ebce147188d28b

JSON sha256
  cc1c5fb57b7363fe8e936d5a67854bb4ee754c2472e30071f89888643e9678b7

outcome
  V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_THREE_CLASS_EVENT_STREAM_NOT_DEMONSTRATED

three-class model SHA
  cf9d38bbb697c1c2b98aa34f51c6ee39626c68763acbfb1c34e145eb738c7144
```

---

## 1. exact reproduction

Before attribution, reconstruct the exact frozen three-class model and eventizer and reproduce the authoritative event metrics on A/B exactly.

Any provenance/model/reproduction mismatch:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_IMPLEMENTATION_OR_PROVENANCE_INVALID
```

---

## 2. attribution cohorts

Reuse exactly:

```text
A
5631000 5641000 5651000 5661000
5671000 5681000 5691000 5701000
interruption 5717000

B
5721000 5731000 5741000 5751000
5761000 5771000 5781000 5791000
interruption 5807000
```

Exactly 64 tapes each.

These cohorts support only attribution of the frozen failure.

---

## 3. frozen runtime diagnostic

No change to:

```text
PCA32_TEMPORAL3
temporal depth 3
three ridge heads
raw-score argmax
tie order REALIZED_IMPACT > PRE_HIT > TRUE_BACKGROUND
positive iff predictedClass == REALIZED_IMPACT
0->1 rising edge
refractory 10 steps
matching [hit, hit+10)
```

No threshold or margin rule.

---

## 4. false-event timing

For each unmatched emitted event apply precedence:

```text
PRE_HIT_200MS
RECENT_POST_HIT_200MS
BACKGROUND_200MS
```

with the exact timing definitions in the design.

Report counts/fractions.

---

## 5. background-false entry source

For each BACKGROUND_200MS unmatched event classify immediately previous eligible predicted class:

```text
FROM_TRUE_BACKGROUND
FROM_PRE_HIT
FROM_INITIAL
```

Frozen axis:

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

## 6. realized-margin audit

At every emitted event:

```text
realizedMargin =
  score_REALIZED_IMPACT
  - max(score_PRE_HIT, score_TRUE_BACKGROUND)
```

Group emitted events as:

```text
MATCHED_EVENT
BACKGROUND_FALSE_EVENT
PRE_HIT_FALSE_EVENT
```

Report rows, mean, q25, median, q75, q90.

Compute AUC for:

```text
MATCHED_EVENT positive
BACKGROUND_FALSE_EVENT negative
```

No margin threshold may be selected.

Frozen margin axis:

```text
MARGIN_SEPARABLE
  AUC >= 0.75 on both cohorts

MARGIN_NOT_SEPARABLE
  AUC < 0.75 on both cohorts

MIXED_MARGIN_SEPARABILITY
  otherwise
```

---

## 7. missed-impact attribution

For each unmatched physical impact inspect [hit, hit+10) with precedence:

```text
MATCH_CONFLICT

PRE_HIT_REALIZED_CARRYOVER

REALIZED_NO_EVENT_OTHER

NO_REALIZED_WINDOW
```

using the exact definitions in the design.

For NO_REALIZED_WINDOW only, inspect [hit+10, hit+20) descriptively for late REALIZED_IMPACT appearance and first latency.

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

Per cohort require:

```text
64 tapes
unmatched events >= 1000
BACKGROUND_200MS false events >= 800
missed physical impacts >= 250
matched events >= 1000
```

Otherwise:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_INSUFFICIENT_ATTRIBUTION_SUPPORT
```

---

## 9. valid outcome

After provenance and support:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_THREE_CLASS_FAILURE_ATTRIBUTED
```

A valid result must report:

```text
entrySourceAxis
marginAxis
missAxis
```

---

## 10. stop rule

After the first authoritative result, do not change:

- cohorts;
- model;
- class order;
- eventizer;
- refractory;
- matching;
- timing windows;
- attribution category precedence;
- AUC definition;
- 0.75 margin-separability criterion;
- >0.50 dominance criteria;
- support floors.

Choose the next repair only from the frozen axes.

No deployment change:

```text
POTION v15D  DEPLOYED
v15N         CLOSED / BLOCKED
v16C         BLOCKED
```
