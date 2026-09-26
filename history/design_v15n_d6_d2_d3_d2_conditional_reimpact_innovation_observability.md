# design_v15n_d6_d2_d3_d2_conditional_reimpact_innovation_observability

## Question

v15N-D6-D2-D3-D1 froze:

```text
V15N_D6_D2_D3_D1_RISING_EDGE_SUPPRESSION_DOMINANT
false-event axis: LINGER_DOMINANT
```

In the frozen D3-D1 EVAL/HOLDOUT attribution, essentially every missed physical hit occurred while the D2-D2 scalar classifier was already positive before the new hit. Therefore a binary 0->1 edge cannot represent re-impact.

D3-D2 asks:

> Conditional on already being in the old scalar classifier's positive state, does a new physical impact cause a separable causal scalar innovation signal?

This is an observability diagnostic only. It does not evaluate a replacement eventizer.

---

## 1. frozen prerequisite

Exact D3-D1 evidence:

```text
run
  36213174880

artifact
  10896464244

artifact digest
  sha256:2b2a84623b5312175d59b4472658979341ae29d771024f49819a8b8668553c60

v15n_d6_d2_d3_d1.json sha256
  4ee2b5acf8feb8ad04f72018afcad953dc7b2584102ee0d335eb3867cb711e16

outcome
  V15N_D6_D2_D3_D1_RISING_EDGE_SUPPRESSION_DOMINANT
```

Require exact reproduction of:

- frozen D6 detector;
- frozen D2-D2 scalar model;
- D2-D3 eventizer;
- D3-D1 attribution outcome.

---

## 2. cohorts

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

The D2-D3/D3-D1 HOLDOUT is not reused for final D3-D2 gating.

---

## 3. causal context condition

For every eligible 100 ms neural frame, reproduce the frozen D2-D2 scalar classifier.

A frame is eligible for D3-D2 only when the immediately preceding eligible frame has:

```text
oldScalarPositive = true
```

This is causal internal state derived from previous neural evidence only.

No HP, damage count, contact flag, contact age, decision index, or oracle variable enters the feature vector.

---

## 4. evaluator-only labels

Labels are diagnostic truth only.

### POSITIVE_REIMPACT

For each physical hit:

1. choose the first eligible neural frame at/after the hit and <100 ms after it;
2. require that the immediately preceding eligible frame is old-scalar-positive;
3. include at most one positive frame per hit.

### NEGATIVE_LINGER

Eligible frames satisfying:

```text
previous old-scalar-positive = true
0.5 s <= age since most recent hit < 2.0 s
no physical hit in preceding 100 ms
```

### NEGATIVE_BACKGROUND

Eligible frames satisfying:

```text
previous old-scalar-positive = true
AND
(no previous physical hit OR age >= 2.0 s)
AND
no physical hit in preceding 100 ms
```

Frames 0.1-0.5 s after a hit are excluded from negative labels.

---

## 5. frozen feature families

### DERIVATIVE3 — primary

Use only the already-defined D2-D2 causal temporal innovation terms:

```text
delta1
delta5mean
peakRise5
```

The raw margin is intentionally excluded.

### SCALAR4 — comparator

```text
margin
delta1
delta5mean
peakRise5
```

This comparator asks whether absolute margin amplitude adds information inside the already-positive context.

No new neural features are introduced.

---

## 6. diagnostic readout

For each feature family independently:

```text
TRAIN-only standardization
class-balanced deterministic ridge least squares
lambda = 1e-3
threshold = 0.5
```

No threshold search.
No hyperparameter search.

Report:

- balanced accuracy;
- positive re-impact recall;
- negative recall;
- LINGER negative recall;
- BACKGROUND negative recall.

Additionally, apply each readout to every eligible frame in the 200 ms window after each conditional positive hit and report the number of positive predicted frames per hit descriptively. This multiplicity is not a gate.

---

## 7. scientific role

A DERIVATIVE3 positive result would show that a new hit produces a causal innovation signal even when the previous scalar state is already positive.

A SCALAR4-only positive result would show conditional separability, but would not establish that pure temporal innovation is sufficient.

Neither result is deployable because the D6 detector and diagnostic readouts are trained with evaluator-only impact labels.
