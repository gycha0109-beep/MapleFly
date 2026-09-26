# prereg_v15n_d6_d2_d3 — causal scalar-onset eventizer

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / OUTCOME**

Frozen prerequisite:

```text
v15N-D6-D2-D2
  V15N_D6_D2_D2_REIMPACT_ONSET_OBSERVABLE_SCALAR

result
  8b5430c8d4f160c7b03192c993935cb0d1a184b7

receipt
  60a31d2a9debfbf971e045f11a86c7e6fbbfe5c6
```

Design:

```text
history/design_v15n_d6_d2_d3_causal_scalar_onset_eventizer.md
commit ccf48f972d6a3a698ec9bf8bd53f0aa7c82dfc08
```

---

## 1. exact evidence prerequisite

Require:

```text
D2-D2 artifact
  10893084661

artifact digest
  sha256:9873b523751ac109596b70d96d2bbde264ae0a92d2df8abebcce99d9e983b8fe

v15n_d6_d2_d2.json sha256
  51bcb6fbc61e568b6f515660325c45127a9a4f51cf9fe19086abc78b3b3c496d

D6 weights sha256
  5dc677cf4c14e398465af72cbcff784e40163cdf702064359e7f4648319c9eb5

D6 threshold
  0.1367936045430042

D6 separation
  0.7830625725367281

v15N preprocessing sha256
  977aa76306c4aa387585c7cdea9a96de26296764ef98962565bd49935d6ccc83
```

Any reproduction/provenance failure:

```text
V15N_D6_D2_D3_IMPLEMENTATION_OR_PROVENANCE_INVALID
```

---

## 2. cohorts

```text
TRAIN
  4081000 4091000 4101000

EVAL
  4111000 4121000 4131000

fresh HOLDOUT
  4471000 4481000 4491000

TRAIN->EVAL interruption RNG
  4147000

fresh HOLDOUT interruption RNG
  4507000
```

24 tapes per cohort.

---

## 3. frozen scalar-onset readout

Reproduce D2-D2 exactly:

```text
features
  margin
  delta1
  delta5mean
  peakRise5

causal history
  previous 5 frames

TRAIN-only standardization

class-balanced deterministic ridge least squares
  lambda = 1e-3

positive threshold
  score >= 0.5
```

Require D2-D2 scalar TRAIN and EVAL metrics to reproduce to 1e-12 before evaluating the D2-D3 eventizer.

---

## 4. frozen eventizer

```text
previousPositive = false

for each eligible frame:
  positive = scalarScore >= 0.5

  if positive && !previousPositive:
    emit event

  previousPositive = positive
```

No refractory duration and no additional state.

---

## 5. one-to-one matching

Use the exact chronological greedy one-to-one matching defined in the design.

Match window:

```text
0 <= neuralEventStep - physicalHitStep < 10 steps
```

10 simulation steps = 200 ms.

---

## 6. support gates

For EVAL and fresh HOLDOUT separately require:

```text
24 tapes
physical hits >= 500
emitted neural events >= 100
```

Otherwise:

```text
V15N_D6_D2_D3_INSUFFICIENT_EVENT_SUPPORT
```

---

## 7. eventization gates

The causal scalar-onset eventizer passes only if **all** are true on both EVAL and fresh HOLDOUT:

```text
precision >= 0.75
recall    >= 0.75
F1        >= 0.75

0.80 <= event-count ratio <= 1.20

mean absolute per-episode event-count error <= 5.0
```

No gate may be changed after outcome.

---

## 8. preregistered outcomes

Precedence:

### Invalid

```text
V15N_D6_D2_D3_IMPLEMENTATION_OR_PROVENANCE_INVALID
```

### Insufficient support

```text
V15N_D6_D2_D3_INSUFFICIENT_EVENT_SUPPORT
```

### Eventizer passes

```text
V15N_D6_D2_D3_CAUSAL_EVENTIZATION_DEMONSTRATED
```

### Eventizer fails

```text
V15N_D6_D2_D3_CAUSAL_EVENTIZATION_NOT_DEMONSTRATED
```

---

## 9. stop rule

After the first authoritative result do not change:

- cohorts/seeds;
- scalar feature definition;
- five-frame history;
- D6 detector;
- ridge lambda;
- score threshold;
- rising-edge state machine;
- 200 ms matching window;
- support gates;
- eventization gates;
- outcome precedence.

If D2-D3 passes, the next scientific question is whether the event stream supports stable cumulative injury memory on another fresh HOLDOUT.

If D2-D3 fails, attribute the failure before changing the eventizer.

Even a PASS remains nondeployable because the D6 detector and D2-D2 scalar readout use evaluator-only labels during training.

```text
POTION v15D
  DEPLOYED

v15N
  CLOSED / BLOCKED

v16C
  BLOCKED
```
