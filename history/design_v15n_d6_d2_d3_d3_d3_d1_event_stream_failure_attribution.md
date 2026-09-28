# design_v15n_d6_d2_d3_d3_d3_d1_event_stream_failure_attribution

## Question

v15N-D6-D2-D3-D3-D3 froze:

```text
V15N_D6_D2_D3_D3_D3_CAUSAL_DN_EVENT_STREAM_NOT_DEMONSTRATED
```

The frozen causal eventizer had adequate support and approximately 0.75 recall, but precision was about 0.59 and event count was about 1.265x physical-hit count.

D3-D3-D3-D1 is failure attribution only.

It asks two independent questions:

1. Where do unmatched neural events occur relative to physical hits?
2. Why are unmatched physical hits missed by the frozen eventizer?

No threshold, refractory interval, readout, representation, matching rule, or cohort is changed.

---

## 1. frozen prerequisite

Authoritative D3-D3-D3 evidence:

```text
run
  36360419550

artifact
  10947295144

artifact digest
  sha256:c139ef3b61721c2a3704fddca8a0c644bfe8c0d8fee3e4d54b406681b0ac80df

v15n_d6_d2_d3_d3_d3.json sha256
  5d18c3bd453024f8281e20bc5c33921528b40c5f43f1cab8db6c7565e2db1247

outcome
  V15N_D6_D2_D3_D3_D3_CAUSAL_DN_EVENT_STREAM_NOT_DEMONSTRATED
```

Frozen eventizer:

```text
contextEligible = previous eligible frame oldScalarPositive
candidate = contextEligible && frozenDnScore >= 0.5
refractory = 10 simulation steps = 200 ms
```

Frozen evaluator matching:

```text
for physical hits in chronological order:
  earliest unmatched event with
  eventStep >= hitStep
  eventStep - hitStep < 10 steps
```

---

## 2. cohorts

Use exact D3-D3-D3 cohorts.

```text
TRAIN
  4081000 4091000 4101000
  interruption 4147000

ATTRIBUTION_A
  5091000 5101000 5111000 5121000
  5131000 5141000 5151000 5161000
  interruption 5177000

ATTRIBUTION_B
  5181000 5191000 5201000 5211000
  5221000 5231000 5241000 5251000
  interruption 5267000
```

This is attribution of an already-frozen failure, not a new generalization claim.

---

## 3. unmatched neural-event attribution

First reproduce the exact emitted event stream and one-to-one matching.

For every unmatched emitted neural event, compute evaluator-only nearest previous and future physical-hit ages.

Assign exactly one category with this precedence:

```text
PRE_HIT_200MS
  a future physical hit exists with
  0 < futureHitStep - eventStep < 10 steps

RECENT_POST_HIT_200MS
  not PRE_HIT_200MS, and a previous physical hit exists with
  0 <= eventStep - previousHitStep < 10 steps

BACKGROUND_200MS
  neither condition above
```

If an unmatched event lies within 200 ms after a previous hit and within 200 ms before a future hit, PRE_HIT_200MS takes precedence.

Also report the count/fraction of such overlap cases separately.

For each category report:

- count and fraction of unmatched events;
- median nearest-hit latency;
- median frozen DN score;
- median time since previous emitted neural event.

---

## 4. unmatched physical-hit attribution

For every unmatched physical hit, inspect the exact frozen causal candidates in:

```text
[hitStep, hitStep + 10 simulation steps)
```

Candidate means exactly:

```text
previous oldScalarPositive && frozenDnScore >= 0.5
```

Assign exactly one category with this precedence:

### MATCH_CONFLICT

At least one emitted neural event exists in the post-hit 200 ms window, but every such emitted event was already matched to an earlier physical hit by the frozen one-to-one evaluator.

### REFRACTORY_SUPPRESSION

No emitted event remains available in the window, at least one frozen candidate exists in the window, and every candidate that could have produced an event was suppressed by the frozen 200 ms refractory rule.

### NO_CANDIDATE_WINDOW

No frozen candidate exists in the post-hit 200 ms window.

### OTHER_UNMATCHED

Residual category if none of the above applies.

Also report for REFRACTORY_SUPPRESSION:

- whether the suppressing prior emitted event was matched or unmatched;
- suppressor-to-hit signed latency;
- candidate count in the hit window.

---

## 5. support

For each attribution cohort require:

```text
64 tapes
unmatched neural events >= 500
unmatched physical hits >= 300
```

---

## 6. descriptive dominance axes

These are diagnostic labels, not performance gates.

False-event axis:

```text
PRE_HIT_DOMINANT
  PRE_HIT_200MS fraction >= 0.50 in both cohorts

POST_HIT_DOMINANT
  RECENT_POST_HIT_200MS fraction >= 0.50 in both cohorts

BACKGROUND_DOMINANT
  BACKGROUND_200MS fraction >= 0.50 in both cohorts

MIXED_FALSE_EVENT
  otherwise
```

Miss axis:

```text
NO_CANDIDATE_DOMINANT
  NO_CANDIDATE_WINDOW fraction >= 0.60 in both cohorts

REFRACTORY_DOMINANT
  REFRACTORY_SUPPRESSION fraction >= 0.60 in both cohorts

MATCH_CONFLICT_DOMINANT
  MATCH_CONFLICT fraction >= 0.60 in both cohorts

MIXED_MISS
  otherwise
```

---

## 7. scientific role

If false events are PRE_HIT_DOMINANT, the frozen DN score is behaving partly as a pre-impact precursor and a causal eventizer needs a way to distinguish prediction from realized impact without future labels.

If POST_HIT_DOMINANT, residual/linger deduplication is the next structural problem.

If BACKGROUND_DOMINANT, frozen representation specificity is the main blocker.

If misses are NO_CANDIDATE_DOMINANT, recall loss is representational.

If REFRACTORY_DOMINANT, eventization state is suppressing valid evidence.

If MATCH_CONFLICT_DOMINANT, evaluator/event timing multiplicity is the blocker.

No parameter tuning or deployment is authorized by D1.
