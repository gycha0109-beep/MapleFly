# design_v15n_d6_d2_d3_d3_d4_d2_d1_event_stream_failure_attribution

## Question

D4-D2 established:

```text
V15N_D6_D2_D3_D3_D4_D2_CAUSAL_DELAYED_EVENT_STREAM_NOT_DEMONSTRATED
```

with adequate support on both prospective cohorts.

The failure has two visible components:

- over-emission: precision about 0.57 and event/impact ratio about 1.30;
- residual misses: recall about 0.74–0.75.

No rising edge was suppressed by the frozen 200 ms refractory.

D4-D2-D1 asks:

> Are false neural events mainly anticipatory, lingering post-impact, or true background events; and are missed impacts mainly caused by no TEMPORAL3 positive evidence, by pre-impact positive carryover that removes the post-impact rising edge, or by evaluator matching conflict?

This is failure attribution only. It makes no new generalization claim.

---

## 1. exact frozen prerequisite

Require authoritative D4-D2:

```text
result
  12c516bd48278804917ac14b77d171587face5a3

receipt
  0a77e7593e17189650823d7e6a7831fe22312de4

run
  36514263944

artifact
  11011816687

JSON sha256
  53dce522441c32080a83339b91cff5a02c4eea24585662c2f9766d8320da9ab4

outcome
  V15N_D6_D2_D3_D3_D4_D2_CAUSAL_DELAYED_EVENT_STREAM_NOT_DEMONSTRATED
```

Reconstruct the exact frozen D4-D2 stack:

```text
PCA32_TEMPORAL3
threshold 0.5
temporal depth 3
rising-edge eventizer
200 ms refractory
no old-scalar gate
no oracle runtime window
```

The exact D4-D2 aggregate metrics must reproduce before attribution.

---

## 2. cohorts

Reuse the exact D4-D2 prospective cohorts because this is attribution of that frozen failure:

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

No new performance/generalization claim may be made from these cohorts.

---

## 3. false-event attribution

For every unmatched emitted neural event, classify by evaluator-only physical-impact timing.

Precedence:

### PRE_HIT_200MS

```text
a future physical impact exists with
0 < hitStep - eventStep < 10
```

### RECENT_POST_HIT_200MS

Only if not PRE_HIT:

```text
a previous physical impact exists with
0 <= eventStep - hitStep < 10
```

### BACKGROUND_200MS

Neither condition holds.

Per cohort report counts and fractions.

Frozen false-event axis:

```text
PRE_HIT_DOMINANT
  PRE_HIT fraction > 0.50 on both cohorts

RECENT_POST_HIT_DOMINANT
  RECENT_POST_HIT fraction > 0.50 on both cohorts

BACKGROUND_DOMINANT
  BACKGROUND fraction > 0.50 on both cohorts

otherwise
  MIXED_FALSE_EVENT_FAILURE
```

---

## 4. missed-impact attribution

For every physical impact left unmatched by the exact D4-D2 one-to-one evaluator, inspect the frozen TEMPORAL3 score/event state in:

```text
[hitStep, hitStep + 10)
```

### MATCH_CONFLICT

An emitted neural event exists in the window but was already consumed by an earlier physical impact.

### PRE_HIT_CARRYOVER_NO_RISE

If not MATCH_CONFLICT:

- at least one TEMPORAL3-positive frame exists in the post-hit window;
- no emitted post-hit rising edge exists in that window;
- the first eligible frame at/after the hit is positive and the immediately previous eligible TEMPORAL3 frame is also positive.

This means the neural score was already above threshold before the physical impact, so the impact produced no new 0→1 transition.

### POSITIVE_NO_RISE_OTHER

If not above:

- positive evidence exists in the post-hit window;
- but there is no emitted event in the window.

This is a residual implementation/temporal-state category and must be reported explicitly.

### NO_POSITIVE_WINDOW

No TEMPORAL3 frame reaches score >= 0.5 in the post-hit 200 ms window.

Per cohort report counts/fractions.

Also report descriptively, for NO_POSITIVE_WINDOW misses only:

- whether TEMPORAL3 becomes positive during [hit+10, hit+20), i.e. 200–<400 ms;
- first positive latency when present.

This extended window is attribution only and cannot change the frozen 200 ms matching contract.

Frozen miss axis:

```text
NO_POSITIVE_DOMINANT
  NO_POSITIVE_WINDOW fraction > 0.50 on both cohorts

PRE_HIT_CARRYOVER_DOMINANT
  PRE_HIT_CARRYOVER_NO_RISE fraction > 0.50 on both cohorts

MATCH_CONFLICT_DOMINANT
  MATCH_CONFLICT fraction > 0.50 on both cohorts

otherwise
  MIXED_MISS_FAILURE
```

---

## 5. support

Each cohort requires:

```text
64 tapes
unmatched neural events >= 500
missed physical impacts >= 200
```

Otherwise attribution support is insufficient.

---

## 6. interpretation rules

This experiment does not tune anything.

Possible implications:

- BACKGROUND_DOMINANT false events: representation specificity remains the main precision blocker.
- PRE_HIT_DOMINANT false events: anticipatory threshold crossings need causal discrimination before eventization.
- PRE_HIT_CARRYOVER_DOMINANT misses: rising-edge semantics are incompatible with a score that often rises before impact and remains high.
- NO_POSITIVE_DOMINANT misses: threshold crossing is absent inside the frozen 200 ms window; representation sensitivity remains unresolved.
- MATCH_CONFLICT_DOMINANT: evaluator/event multiplicity rather than representation is the immediate blocker.
- mixed axes require a separate targeted design rather than a combined ad-hoc repair.

No threshold, refractory, temporal depth, or runtime POTION policy is changed here.

POTION v15D remains deployed. v15N and v16C remain blocked.
