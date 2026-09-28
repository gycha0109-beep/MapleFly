# result_v15n_d6_d2_d3_d3_d3_d1 — event-stream failure attribution

## Status

```text
V15N_D6_D2_D3_D3_D3_D1_EVENT_STREAM_FAILURE_ATTRIBUTED
```

Frozen diagnostic axes:

```text
falseEventAxis = BACKGROUND_DOMINANT
missAxis       = NO_CANDIDATE_DOMINANT
```

Authoritative evidence:

```text
run
  36367096063

head
  94895409ecddc98766de403ef5b34df8952bb0d3

artifact
  10949191838

artifact digest
  sha256:f6219beffaa53c85a09358af683a47ab5099e7b7f1785e7a6db8ac4d0dafc6fb

v15n_d6_d2_d3_d3_d3_d1.json sha256
  394775a56818a37c29d3136fe2e15bef9730b33006fd1f6e6db3358df5267ba9
```

Preregistration:

```text
cf88b0e88499deaff8903f172bb4ec9872b6fa35
```

Implementation/workflow:

```text
a03f9cb791f7d18d3493ecdc753e5de3f0b0ac65
94895409ecddc98766de403ef5b34df8952bb0d3
```

## 1. support

```text
ATTRIBUTION_A
  tapes             64
  unmatched events 869
  unmatched hits   420
  support           PASS

ATTRIBUTION_B
  tapes             64
  unmatched events 889
  unmatched hits   434
  support           PASS
```

## 2. unmatched neural events

```text
ATTRIBUTION_A
  PRE_HIT_200MS          140  (16.11%)
  RECENT_POST_HIT_200MS    0  ( 0.00%)
  BACKGROUND_200MS       729  (83.89%)

ATTRIBUTION_B
  PRE_HIT_200MS          164  (18.45%)
  RECENT_POST_HIT_200MS    0  ( 0.00%)
  BACKGROUND_200MS       725  (81.55%)
```

Therefore:

```text
falseEventAxis = BACKGROUND_DOMINANT
```

The dominant precision failure is not lingering post-hit activity and is not primarily anticipatory activity. It is frozen candidate activity occurring more than 200 ms away from any physical hit.

Descriptive frozen DN scores:

```text
A BACKGROUND false-event median DN score  0.595145
B BACKGROUND false-event median DN score  0.594288

A PRE_HIT false-event median DN score      0.559354
B PRE_HIT false-event median DN score      0.560809
```

## 3. unmatched physical hits

```text
ATTRIBUTION_A
  NO_CANDIDATE_WINDOW       394  (93.81%)
  REFRACTORY_SUPPRESSION     26  ( 6.19%)
  MATCH_CONFLICT              0  ( 0.00%)
  OTHER_UNMATCHED             0  ( 0.00%)

ATTRIBUTION_B
  NO_CANDIDATE_WINDOW       416  (95.85%)
  REFRACTORY_SUPPRESSION     18  ( 4.15%)
  MATCH_CONFLICT              0  ( 0.00%)
  OTHER_UNMATCHED             0  ( 0.00%)
```

Therefore:

```text
missAxis = NO_CANDIDATE_DOMINANT
```

The recall failure is overwhelmingly upstream of refractory and matching: the exact frozen causal candidate does not appear in the 200 ms post-hit evaluator window.

## 4. refractory attribution

All refractory-suppressed misses were caused by an earlier **unmatched** emitted event.

```text
ATTRIBUTION_A
  refractory misses               26
  suppressor matched               0
  suppressor unmatched            26
  median candidate count           1
  median suppressor-hit latency  -20 ms

ATTRIBUTION_B
  refractory misses               18
  suppressor matched               0
  suppressor unmatched            18
  median candidate count           1
  median suppressor-hit latency  -40 ms
```

Thus the refractory interval is not the primary recall blocker. The small refractory loss is a secondary consequence of false pre-hit pulses.

## 5. interpretation

The current causal conjunction:

```text
previous oldScalarPositive
AND
frozen DN score >= 0.5
```

has two simultaneous problems:

1. **specificity** — it emits many true BACKGROUND events;
2. **sensitivity** — for most missed physical hits, no conjunction candidate exists at all.

The next diagnostic should decompose NO_CANDIDATE_WINDOW into:

- no old-scalar context available;
- old-scalar context available but DN score remains subthreshold;
- DN-positive evidence exists only outside the old-scalar context.

It should also compare frozen DN score and previous old-scalar score distributions between matched events and BACKGROUND false events, without tuning any threshold, to determine whether scalar score magnitude can plausibly separate true events from background false pulses.

No threshold or refractory tuning is justified before that decomposition.

## 6. deployment

```text
POTION v15D
  DEPLOYED

v15N
  CLOSED / BLOCKED

D3-D3-D3 causal DN event stream
  FAILED

v16C
  BLOCKED
```
