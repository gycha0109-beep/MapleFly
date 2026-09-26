# prereg_v15n_d6_d2_d3_d1 — rising-edge failure attribution

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / OUTCOME**

Frozen prerequisite:

```text
v15N-D6-D2-D3
  V15N_D6_D2_D3_CAUSAL_EVENTIZATION_NOT_DEMONSTRATED

result
  32ace073eb06a64d727aeb88ec13c89fffdb3d84

receipt
  0d55c4ab868a4d47b48eec8ca6a9eb9742dad6fa
```

Design:

```text
history/design_v15n_d6_d2_d3_d1_rising_edge_failure_attribution.md
commit 6a7b2eb7cee73ee340f9083a08928a01cc6009cc
```

---

## 1. exact evidence prerequisite

Require:

```text
D2-D3 artifact
  10895732694

artifact digest
  sha256:64cefd93dbaf61f8a405488f0c45468185851ae2b8f0a9bad8b6dd451bf77066

v15n_d6_d2_d3.json sha256
  7aa72195234fd7522217484a835da276a3e2a1a6b4b7be87eb587f838804a36a

D2-D3 outcome
  V15N_D6_D2_D3_CAUSAL_EVENTIZATION_NOT_DEMONSTRATED

D2-D2 scalar model sha256
  ee36661675a1f6717d53d2f2af63797704d89194bf78d980f5d4415e3ee4f066

D6 weights sha256
  5dc677cf4c14e398465af72cbcff784e40163cdf702064359e7f4648319c9eb5
```

Any provenance/reproduction failure:

```text
V15N_D6_D2_D3_D1_IMPLEMENTATION_OR_PROVENANCE_INVALID
```

---

## 2. cohorts

Use the exact D2-D3 cohorts:

```text
TRAIN
  4081000 4091000 4101000

EVAL
  4111000 4121000 4131000

HOLDOUT
  4471000 4481000 4491000

TRAIN->EVAL interruption RNG
  4147000

HOLDOUT interruption RNG
  4507000
```

24 tapes per cohort.

---

## 3. frozen eventizer and matching

Reproduce exactly:

```text
scalar threshold
  0.5

event rule
  emit iff currentPositive && !previousPositive

matching
  chronological greedy one-to-one
  0 <= eventStep - hitStep < 10 simulation steps
```

Require D2-D3 TRAIN/EVAL/HOLDOUT event metrics to reproduce to 1e-12.

---

## 4. support gates

For EVAL and HOLDOUT separately require:

```text
missed physical hits >= 400
unmatched false emitted events >= 500
inter-hit intervals >= 500
24 tapes
```

Otherwise:

```text
V15N_D6_D2_D3_D1_INSUFFICIENT_ATTRIBUTION_SUPPORT
```

---

## 5. missed-hit dominance gates

Fractions are calculated among missed physical hits only.

```text
classifierMissDominated
  FRAME_CLASSIFIER_MISS fraction >= 0.60
  in both EVAL and HOLDOUT

edgeSuppressionDominated
  EDGE_SUPPRESSION fraction >= 0.60
  in both EVAL and HOLDOUT

matchingConflictDominated
  MATCHING_CONFLICT fraction >= 0.60
  in both EVAL and HOLDOUT
```

These gates are mutually descriptive; no threshold may be changed after outcome.

---

## 6. false-event timing dominance gates

Fractions are calculated among unmatched false emitted events only.

```text
recentFalseDominated
  RECENT_UNMATCHED fraction >= 0.60
  in both EVAL and HOLDOUT

lingerFalseDominated
  LINGER fraction >= 0.60
  in both EVAL and HOLDOUT

backgroundFalseDominated
  BACKGROUND fraction >= 0.60
  in both EVAL and HOLDOUT
```

If none crosses 0.60, false-event timing is classified as MIXED.

---

## 7. preregistered outcomes

Outcome is determined by missed-hit attribution; false-event attribution is a separately frozen axis in the evidence.

Precedence:

### Invalid

```text
V15N_D6_D2_D3_D1_IMPLEMENTATION_OR_PROVENANCE_INVALID
```

### Insufficient support

```text
V15N_D6_D2_D3_D1_INSUFFICIENT_ATTRIBUTION_SUPPORT
```

### Classifier miss dominant

```text
V15N_D6_D2_D3_D1_FRAME_CLASSIFIER_MISS_DOMINANT
```

### Edge suppression dominant

```text
V15N_D6_D2_D3_D1_RISING_EDGE_SUPPRESSION_DOMINANT
```

### Matching conflict dominant

```text
V15N_D6_D2_D3_D1_MATCHING_CONFLICT_DOMINANT
```

### Otherwise

```text
V15N_D6_D2_D3_D1_MIXED_MISSED_HIT_FAILURE
```

False-event axis is independently reported as one of:

```text
RECENT_UNMATCHED_DOMINANT
LINGER_DOMINANT
BACKGROUND_DOMINANT
MIXED
```

---

## 8. stop rule

After the first authoritative result do not change:

- D6 detector;
- scalar readout;
- scalar threshold;
- rising-edge state machine;
- matching window;
- cohorts;
- attribution categories;
- 0.60 dominance gates;
- support gates;
- outcome precedence.

No replacement eventizer may be evaluated inside D3-D1.

```text
POTION v15D
  DEPLOYED

v15N
  CLOSED / BLOCKED

v16C
  BLOCKED
```
