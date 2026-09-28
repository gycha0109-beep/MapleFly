# prereg_v15n_d6_d2_d3_d3_d3_d1_d1 — gate component and score separability

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / OUTCOME**

Frozen prerequisite:

```text
v15N-D6-D2-D3-D3-D3-D1
  V15N_D6_D2_D3_D3_D3_D1_EVENT_STREAM_FAILURE_ATTRIBUTED

result
  56861f30b31de087146244c04d9d414e1bf6eac8

receipt
  bb2394a133761efb68f3025317a7d4558bda7236

falseEventAxis
  BACKGROUND_DOMINANT

missAxis
  NO_CANDIDATE_DOMINANT
```

Design:

```text
history/design_v15n_d6_d2_d3_d3_d3_d1_d1_gate_component_and_score_separability.md
commit 9aed4424517988876b55846244b9bedcb8443c87
```

---

## 1. exact prerequisite

Require:

```text
D3-D3-D3-D1 artifact
  10949191838

artifact digest
  sha256:f6219beffaa53c85a09358af683a47ab5099e7b7f1785e7a6db8ac4d0dafc6fb

D3-D3-D3-D1 JSON sha256
  394775a56818a37c29d3136fe2e15bef9730b33006fd1f6e6db3358df5267ba9

D3-D3-D3-D1 outcome
  V15N_D6_D2_D3_D3_D3_D1_EVENT_STREAM_FAILURE_ATTRIBUTED

D6 weights
  5dc677cf4c14e398465af72cbcff784e40163cdf702064359e7f4648319c9eb5

old scalar model
  ee36661675a1f6717d53d2f2af63797704d89194bf78d980f5d4415e3ee4f066

innovation PCA
  b187f3de9229e14260b8d1464e20fa3b8d26158a715a5372e4696c1bf3b7fb33

D3-D3 DN model
  a341d9747a19bf4a3a0cb625eca5a4ff6a3dd071e1f641a4d8005cd18d21f496

DN threshold
  0.5

refractory
  10 steps
```

Any provenance/reproduction failure:

```text
V15N_D6_D2_D3_D3_D3_D1_D1_IMPLEMENTATION_OR_PROVENANCE_INVALID
```

---

## 2. cohorts

Use exact D3-D3-D3 cohorts:

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

Exactly 64 tapes per cohort.

---

## 3. exact reproduction

Reproduce D3-D3-D3 event stream, one-to-one matching, and D3-D3-D3-D1 failure categories exactly.

Require aggregate D3-D3-D3 metrics to reproduce to absolute tolerance 1e-12 and D3-D3-D3-D1 category counts to reproduce exactly before D1-D1 attribution.

---

## 4. NO_CANDIDATE decomposition

For each D3-D3-D3-D1 NO_CANDIDATE_WINDOW hit inspect eligible frames in the exact post-hit 10-step window.

Primary categories:

```text
CONTEXT_ABSENT
DN_SUBTHRESHOLD_UNDER_CONTEXT
```

Definitions are frozen exactly as in the design.

Secondary context-absent labels:

```text
DN_POSITIVE_WITHOUT_CONTEXT
DN_SILENT_WITHOUT_CONTEXT
```

Also report DN-positive-only-outside-context for DN_SUBTHRESHOLD_UNDER_CONTEXT.

---

## 5. emitted-event score separability

Compare exact:

```text
MATCHED_EVENT
BACKGROUND_FALSE_EVENT
```

using only:

```text
currentDnScore
previousOldScalarScore
```

No model fitting and no threshold search.

Compute deterministic rank ROC AUC with ties receiving average rank.

Separability labels:

```text
DN_SCORE_SEPARABLE
  DN AUC >= 0.70 in both cohorts

OLD_SCALAR_SCORE_SEPARABLE
  old-scalar AUC >= 0.70 in both cohorts

NO_SINGLE_SCORE_SEPARABILITY
  neither
```

If both satisfy >=0.70, report both labels.

---

## 6. support

For each cohort require:

```text
NO_CANDIDATE hits >= 300
MATCHED events >= 1000
BACKGROUND false events >= 500
```

Otherwise:

```text
V15N_D6_D2_D3_D3_D3_D1_D1_INSUFFICIENT_COMPONENT_SUPPORT
```

---

## 7. miss-component dominance

```text
CONTEXT_ABSENT_DOMINANT
  CONTEXT_ABSENT fraction >= 0.60 in both cohorts

DN_SUBTHRESHOLD_DOMINANT
  DN_SUBTHRESHOLD_UNDER_CONTEXT fraction >= 0.60 in both cohorts

MIXED_GATE_COMPONENT
  otherwise
```

---

## 8. preregistered outcomes

Precedence:

### Invalid

```text
V15N_D6_D2_D3_D3_D3_D1_D1_IMPLEMENTATION_OR_PROVENANCE_INVALID
```

### Insufficient support

```text
V15N_D6_D2_D3_D3_D3_D1_D1_INSUFFICIENT_COMPONENT_SUPPORT
```

### Valid attribution

```text
V15N_D6_D2_D3_D3_D3_D1_D1_COMPONENT_AND_SCORE_ATTRIBUTED
```

The frozen miss-component and score-separability labels determine the next experiment.

---

## 9. stop rule

After the first authoritative result do not change:

- cohorts/seeds;
- model identities;
- threshold/refractory;
- evaluator matching;
- D3-D3-D3-D1 categories;
- component categories;
- AUC definition;
- support floors;
- 0.60 component dominance;
- 0.70 score-separability criterion.

No threshold tuning, replacement eventizer, cumulative injury model, POTION policy, or deployment is evaluated.

```text
POTION v15D
  DEPLOYED

v15N
  CLOSED / BLOCKED

v16C
  BLOCKED
```
