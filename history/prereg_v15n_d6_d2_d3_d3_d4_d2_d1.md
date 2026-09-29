# prereg_v15n_d6_d2_d3_d3_d4_d2_d1 — event-stream failure attribution

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / OUTCOME**

Frozen prerequisite:

```text
v15N-D6-D2-D3-D3-D4-D2
  V15N_D6_D2_D3_D3_D4_D2_CAUSAL_DELAYED_EVENT_STREAM_NOT_DEMONSTRATED

result
  12c516bd48278804917ac14b77d171587face5a3

receipt
  0a77e7593e17189650823d7e6a7831fe22312de4
```

Design:

```text
history/design_v15n_d6_d2_d3_d3_d4_d2_d1_event_stream_failure_attribution.md
commit fca48afba38795d67930e91f2d6599239620e72e
```

---

## 1. authoritative prerequisite

Require:

```text
run
  36514263944

artifact
  11011816687

artifact digest
  sha256:59289ee82b5d8502074b38c58974dde25ac1d6568f5183d24d6209d87e1b1ab0

JSON sha256
  53dce522441c32080a83339b91cff5a02c4eea24585662c2f9766d8320da9ab4

outcome
  V15N_D6_D2_D3_D3_D4_D2_CAUSAL_DELAYED_EVENT_STREAM_NOT_DEMONSTRATED
```

The implementation must reproduce the exact frozen D4-D2 aggregate metrics before attribution.

Any provenance or reproduction failure:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_IMPLEMENTATION_OR_PROVENANCE_INVALID
```

---

## 2. frozen stack

No change is allowed to:

```text
PCA32_TEMPORAL3 model
threshold = 0.5
temporal depth = 3
rising-edge definition
refractory = 10 simulation steps
old-scalar gate = false
oracle runtime window = false
one-to-one matching window = [hit, hit+10)
```

No threshold, refractory, persistence, re-arm, or representation search.

---

## 3. attribution cohorts

Reuse D4-D2 exactly:

```text
ATTRIBUTION_A
5451000 5461000 5471000 5481000
5491000 5501000 5511000 5521000
interruption 5537000

ATTRIBUTION_B
5541000 5551000 5561000 5571000
5581000 5591000 5601000 5611000
interruption 5627000
```

Exactly 64 tapes each.

These cohorts support only failure attribution, not a new performance claim.

---

## 4. false-event categories

For each unmatched emitted event apply this precedence:

```text
PRE_HIT_200MS
  future hit exists with 0 < hitStep-eventStep < 10

RECENT_POST_HIT_200MS
  otherwise, previous hit exists with 0 <= eventStep-hitStep < 10

BACKGROUND_200MS
  otherwise
```

Frozen false-event axis:

```text
PRE_HIT_DOMINANT
  PRE_HIT fraction > 0.50 in both cohorts

RECENT_POST_HIT_DOMINANT
  RECENT_POST_HIT fraction > 0.50 in both cohorts

BACKGROUND_DOMINANT
  BACKGROUND fraction > 0.50 in both cohorts

otherwise
  MIXED_FALSE_EVENT_FAILURE
```

---

## 5. missed-impact categories

For each unmatched physical impact inspect frozen TEMPORAL3 state in [hit, hit+10).

Precedence:

```text
MATCH_CONFLICT
  an emitted event exists in-window but was already consumed by an earlier hit

PRE_HIT_CARRYOVER_NO_RISE
  no MATCH_CONFLICT
  at least one positive TEMPORAL3 frame exists in-window
  no emitted event exists in-window
  first eligible frame at/after hit is positive
  immediately previous eligible frame is also positive

POSITIVE_NO_RISE_OTHER
  no above category
  positive TEMPORAL3 evidence exists in-window
  no emitted event exists in-window

NO_POSITIVE_WINDOW
  no TEMPORAL3 frame reaches >=0.5 in-window
```

For NO_POSITIVE_WINDOW only, descriptively inspect [hit+10, hit+20):

- positive presence;
- first positive latency.

This cannot alter matching or PASS/FAIL.

Frozen miss axis:

```text
NO_POSITIVE_DOMINANT
  NO_POSITIVE_WINDOW fraction > 0.50 in both cohorts

PRE_HIT_CARRYOVER_DOMINANT
  PRE_HIT_CARRYOVER_NO_RISE fraction > 0.50 in both cohorts

MATCH_CONFLICT_DOMINANT
  MATCH_CONFLICT fraction > 0.50 in both cohorts

otherwise
  MIXED_MISS_FAILURE
```

---

## 6. support gates

Each cohort requires:

```text
64 tapes
unmatched neural events >= 500
missed physical impacts >= 200
```

Otherwise:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_INSUFFICIENT_ATTRIBUTION_SUPPORT
```

---

## 7. authoritative outcomes

Precedence:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_IMPLEMENTATION_OR_PROVENANCE_INVALID

V15N_D6_D2_D3_D3_D4_D2_D1_INSUFFICIENT_ATTRIBUTION_SUPPORT

V15N_D6_D2_D3_D3_D4_D2_D1_EVENT_STREAM_FAILURE_ATTRIBUTED
```

The final valid attribution result must report both frozen axes:

```text
falseEventAxis
missAxis
```

---

## 8. stop rule

After the first authoritative result, do not change:

- cohorts/seeds;
- D4-D2 representation/model/threshold;
- rising-edge eventizer;
- refractory;
- evaluator matching;
- attribution windows;
- category precedence;
- >0.50 dominance criterion;
- support floors;
- outcome precedence.

Choose the next experiment only from the frozen attribution axes.

POTION v15D remains deployed. v15N and v16C remain blocked.
