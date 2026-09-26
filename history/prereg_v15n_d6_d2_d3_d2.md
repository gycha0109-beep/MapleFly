# prereg_v15n_d6_d2_d3_d2 — conditional re-impact innovation observability

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / OUTCOME**

Frozen prerequisite:

```text
v15N-D6-D2-D3-D1
  V15N_D6_D2_D3_D1_RISING_EDGE_SUPPRESSION_DOMINANT

result
  b03a7f2d9b6dbc53c873aee2b2896e1a075d9ab0

receipt
  93ef2491648362b1e233fab6615d056bb3d9efbd
```

Design:

```text
history/design_v15n_d6_d2_d3_d2_conditional_reimpact_innovation_observability.md
commit 1f25a75cebc4386851b225724bece9a25bc93d83
```

---

## 1. cohorts

```text
TRAIN
  4081000 4091000 4101000

EVAL
  4111000 4121000 4131000

fresh HOLDOUT
  4511000 4521000 4531000

TRAIN->EVAL interruption RNG
  4147000

fresh HOLDOUT interruption RNG
  4547000
```

24 tapes per cohort.

---

## 2. exact prerequisite

Require:

```text
D3-D1 artifact
  10896464244

artifact digest
  sha256:2b2a84623b5312175d59b4472658979341ae29d771024f49819a8b8668553c60

v15n_d6_d2_d3_d1.json sha256
  4ee2b5acf8feb8ad04f72018afcad953dc7b2584102ee0d335eb3867cb711e16

D3-D1 outcome
  V15N_D6_D2_D3_D1_RISING_EDGE_SUPPRESSION_DOMINANT

D2-D2 scalar model sha256
  ee36661675a1f6717d53d2f2af63797704d89194bf78d980f5d4415e3ee4f066

D6 weights sha256
  5dc677cf4c14e398465af72cbcff784e40163cdf702064359e7f4648319c9eb5
```

Any provenance/reproduction failure:

```text
V15N_D6_D2_D3_D2_IMPLEMENTATION_OR_PROVENANCE_INVALID
```

---

## 3. context / labels

Only frames whose immediately preceding eligible frame is old-scalar-positive enter D3-D2.

One POSITIVE_REIMPACT frame per qualifying physical hit: first eligible frame at/after the hit and <100 ms after it.

NEGATIVE_LINGER:

```text
previous old-scalar-positive
0.5 s <= latest hit age < 2.0 s
no physical hit in preceding 100 ms
```

NEGATIVE_BACKGROUND:

```text
previous old-scalar-positive
(no prior hit OR latest hit age >= 2.0 s)
no physical hit in preceding 100 ms
```

Frames 0.1-0.5 s after a hit are excluded from negatives.

---

## 4. frozen feature families

Primary:

```text
DERIVATIVE3
  delta1
  delta5mean
  peakRise5
```

Comparator:

```text
SCALAR4
  margin
  delta1
  delta5mean
  peakRise5
```

No additional feature family may be added after outcome.

---

## 5. diagnostic readout

For both families:

```text
TRAIN-only standardization
class-balanced deterministic ridge least squares
lambda = 1e-3
threshold = 0.5
```

No search.

---

## 6. support gates

For EVAL and fresh HOLDOUT separately require:

```text
24 tapes
POSITIVE_REIMPACT >= 400
NEGATIVE_LINGER >= 500
NEGATIVE_BACKGROUND >= 500
```

Otherwise:

```text
V15N_D6_D2_D3_D2_INSUFFICIENT_CONDITIONAL_SUPPORT
```

---

## 7. observability gates

A family passes only if all are true on both EVAL and fresh HOLDOUT:

```text
balanced accuracy >= 0.75
positive re-impact recall >= 0.75
negative recall >= 0.75
```

LINGER/BACKGROUND recalls and post-hit predicted-positive multiplicity are descriptive only.

---

## 8. preregistered outcomes

Precedence:

### Invalid

```text
V15N_D6_D2_D3_D2_IMPLEMENTATION_OR_PROVENANCE_INVALID
```

### Insufficient support

```text
V15N_D6_D2_D3_D2_INSUFFICIENT_CONDITIONAL_SUPPORT
```

### DERIVATIVE3 passes

```text
V15N_D6_D2_D3_D2_CONDITIONAL_REIMPACT_INNOVATION_OBSERVABLE
```

### DERIVATIVE3 fails, SCALAR4 passes

```text
V15N_D6_D2_D3_D2_CONDITIONAL_REIMPACT_SCALAR_OBSERVABLE_ONLY
```

### Neither passes

```text
V15N_D6_D2_D3_D2_CONDITIONAL_REIMPACT_NOT_DEMONSTRATED
```

---

## 9. stop rule

After the first authoritative result do not change:

- cohorts/seeds;
- context condition;
- label windows;
- feature families;
- ridge lambda;
- threshold;
- support gates;
- observability gates;
- outcome precedence.

No replacement eventizer is evaluated in D3-D2.

```text
POTION v15D
  DEPLOYED

v15N
  CLOSED / BLOCKED

v16C
  BLOCKED
```
