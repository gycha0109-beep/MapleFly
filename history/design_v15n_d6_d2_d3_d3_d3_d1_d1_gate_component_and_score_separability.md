# design_v15n_d6_d2_d3_d3_d3_d1_d1_gate_component_and_score_separability

## Question

v15N-D6-D2-D3-D3-D3-D1 froze:

```text
falseEventAxis = BACKGROUND_DOMINANT
missAxis       = NO_CANDIDATE_DOMINANT
```

D1-D1 is diagnostic only. It does not alter the failed eventizer.

It asks:

1. For unmatched hits with no causal candidate in the post-hit 200 ms window, which conjunct fails?
2. For emitted events, do the existing frozen score magnitudes separate matched events from true BACKGROUND false events strongly enough to justify a separately preregistered score-based eventizer experiment?

No model fitting, threshold search, refractory tuning, or replacement eventizer is performed.

---

## 1. frozen prerequisite

Require exact D3-D3-D3-D1 evidence:

```text
run
  36367096063

artifact
  10949191838

artifact digest
  sha256:f6219beffaa53c85a09358af683a47ab5099e7b7f1785e7a6db8ac4d0dafc6fb

v15n_d6_d2_d3_d3_d3_d1.json sha256
  394775a56818a37c29d3136fe2e15bef9730b33006fd1f6e6db3358df5267ba9

outcome
  V15N_D6_D2_D3_D3_D3_D1_EVENT_STREAM_FAILURE_ATTRIBUTED

falseEventAxis
  BACKGROUND_DOMINANT

missAxis
  NO_CANDIDATE_DOMINANT
```

Frozen stack remains:

```text
old-scalar context gate
DN_INNOVATION_PCA32 readout
DN threshold = 0.5
refractory = 200 ms
```

---

## 2. cohorts

Use the exact D3-D3-D3 attribution cohorts.

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

This is attribution of an already-frozen failure, not a new prospective performance claim.

---

## 3. NO_CANDIDATE component decomposition

Reproduce exact D3-D3-D3 event stream and matching.

Select only unmatched hits classified by D3-D3-D3-D1 as:

```text
NO_CANDIDATE_WINDOW
```

For each such hit inspect eligible frames in:

```text
[hitStep, hitStep + 10 simulation steps)
```

At each frame define:

```text
contextEligible = previous eligible frame oldScalarPositive
dnPositive     = frozenDnScore >= 0.5
candidate      = contextEligible && dnPositive
```

Candidate must be absent by construction.

Assign the hit to exactly one primary category:

```text
CONTEXT_ABSENT
  no contextEligible frame exists in the window

DN_SUBTHRESHOLD_UNDER_CONTEXT
  at least one contextEligible frame exists,
  but every contextEligible frame has dnPositive = false
```

For CONTEXT_ABSENT additionally report:

```text
DN_POSITIVE_WITHOUT_CONTEXT
  at least one dnPositive frame exists somewhere in the hit window

DN_SILENT_WITHOUT_CONTEXT
  no dnPositive frame exists anywhere in the hit window
```

For DN_SUBTHRESHOLD_UNDER_CONTEXT additionally report whether any dnPositive frame exists only outside context.

Also report:

- number of eligible frames;
- number of contextEligible frames;
- maximum DN score overall;
- maximum DN score under context;
- maximum old-scalar score on preceding frames.

---

## 4. emitted-event score separability

Reproduce exact emitted events and matching.

Two frozen groups:

```text
MATCHED_EVENT
  emitted event matched to a physical hit by the frozen evaluator

BACKGROUND_FALSE_EVENT
  unmatched emitted event classified as BACKGROUND_200MS by D3-D3-D3-D1
```

For every event report the already-existing scores:

```text
currentDnScore
previousOldScalarScore
```

No combined score is fitted.

For each score independently report:

- group counts;
- median and interquartile range for both groups;
- ROC AUC using higher score as more MATCHED_EVENT-like;
- common-language probability equivalent to that AUC.

Preregistered descriptive separability labels:

```text
DN_SCORE_SEPARABLE
  DN-score AUC >= 0.70 in both cohorts

OLD_SCALAR_SCORE_SEPARABLE
  old-scalar-score AUC >= 0.70 in both cohorts

NO_SINGLE_SCORE_SEPARABILITY
  neither condition holds
```

These labels do not authorize selecting a new threshold.

---

## 5. support

For each cohort require:

```text
NO_CANDIDATE hits >= 300
MATCHED events >= 1000
BACKGROUND false events >= 500
```

Otherwise attribution is insufficient.

---

## 6. diagnostic dominance

Miss-component axis:

```text
CONTEXT_ABSENT_DOMINANT
  CONTEXT_ABSENT fraction >= 0.60 in both cohorts

DN_SUBTHRESHOLD_DOMINANT
  DN_SUBTHRESHOLD_UNDER_CONTEXT fraction >= 0.60 in both cohorts

MIXED_GATE_COMPONENT
  otherwise
```

Score-separability axis is reported independently using the frozen AUC labels above.

---

## 7. scientific role

If CONTEXT_ABSENT dominates and DN-positive evidence often exists without context, the old-scalar gate is suppressing usable DN evidence.

If DN_SUBTHRESHOLD dominates, the frozen DN representation/readout is the sensitivity blocker under otherwise available context.

If a frozen score has AUC >=0.70 in both cohorts, a later prospective experiment may preregister a deterministic score transformation or threshold from TRAIN only.

If neither score separates matched from BACKGROUND false events, simple threshold tuning is not scientifically justified.

No replacement eventizer, cumulative injury model, POTION policy, or deployment is evaluated.
