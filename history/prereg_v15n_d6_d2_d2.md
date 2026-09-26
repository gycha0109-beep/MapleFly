# prereg_v15n_d6_d2_d2 — re-impact onset observability

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / OUTCOME**

Frozen prerequisite:

```text
v15N-D6-D2-D1
  V15N_D6_D2_D1_EVENTIZER_LOCKOUT_DOMINANT

result
  611fd1d71888e566074e9b371e225a84800eed3a

receipt
  80b9bebbaad814e7ca4d70e669b57b244253422e
```

Design:

```text
history/design_v15n_d6_d2_d2_reimpact_onset_observability.md
commit 35538cbef13b8026e0bb404a4f96cfb0e264298b
```

---

## 1. cohorts

```text
TRAIN
  4081000 4091000 4101000

EVAL
  4111000 4121000 4131000

fresh HOLDOUT
  4431000 4441000 4451000

TRAIN->EVAL interruption RNG
  4147000

fresh HOLDOUT interruption RNG
  4467000
```

24 tapes per cohort.

---

## 2. provenance

Require exact D2-D1 evidence:

```text
artifact
  10893121955

artifact digest
  sha256:42461e3bd2f2582c826840a1425f347986b1e1698c465267b085a4e9685976f7

v15n_d6_d2_d1.json sha256
  89da8a8d4bd77e798cf778f702275c7e4205cc933f7ce3a3341ea5b83a3ea63f
```

Require exact frozen D6 detector:

```text
weights sha256
  5dc677cf4c14e398465af72cbcff784e40163cdf702064359e7f4648319c9eb5

threshold
  0.1367936045430042

separation
  0.7830625725367281
```

Require exact v15N preprocessing SHA:

```text
977aa76306c4aa387585c7cdea9a96de26296764ef98962565bd49935d6ccc83
```

Any provenance/reproduction failure:

```text
V15N_D6_D2_D2_IMPLEMENTATION_OR_PROVENANCE_INVALID
```

---

## 3. frozen feature families

### SCALAR_ONSET

```text
[m_t, delta1_t, delta5_t, peakRise5_t]
```

where all deltas use only current/past exact frozen-D6 margins.

### DN_INNOVATION_PCA32

```text
innovation_t =
  current phase-residualized DN frame
  - mean(previous 5 phase-residualized DN frames)
```

TRAIN-only standardization + TRAIN-only PCA32. To keep the PCA fit deterministic and bounded, the PCA basis is fit on exactly 240 eligible TRAIN innovation frames selected by evenly spaced indices over the full eligible TRAIN innovation-frame sequence, independent of labels. PCA uses the existing deterministic power-iteration convention (32 components, 80 iterations, fixed seed 3948000).

No other feature family may be added after outcome.

---

## 4. labels

One POSITIVE frame per physical hit: first eligible neural frame at/after hit and <100 ms after it.

NEGATIVE_LINGER:

```text
0.5 s <= age since most recent hit < 2.0 s
and no hit in preceding 100 ms
```

NEGATIVE_BACKGROUND:

```text
no previous hit
or age >= 2.0 s
```

0.1-0.5 s post-hit frames are excluded from negatives.

---

## 5. diagnostic readout

For each feature family:

```text
TRAIN-only standardization
class-balanced deterministic ridge least squares
lambda = 1e-3
threshold = 0.5
```

No threshold search.
No hyperparameter search.

---

## 6. support gates

For EVAL and fresh HOLDOUT separately require:

```text
positive onset frames >= 500
negative LINGER frames >= 1000
negative BACKGROUND frames >= 1000
suppressed re-impacts >= 400
24 tapes
```

Otherwise:

```text
V15N_D6_D2_D2_INSUFFICIENT_ONSET_SUPPORT
```

---

## 7. observability gates

A feature family passes only if all are true on both EVAL and fresh HOLDOUT:

```text
balanced accuracy >= 0.75
positive/re-impact recall >= 0.75
negative recall >= 0.75
suppressed re-impact recall >= 0.75
```

LINGER and BACKGROUND negative recalls are reported but not separately gated.

---

## 8. preregistered outcomes

Precedence:

### Invalid

```text
V15N_D6_D2_D2_IMPLEMENTATION_OR_PROVENANCE_INVALID
```

### Insufficient support

```text
V15N_D6_D2_D2_INSUFFICIENT_ONSET_SUPPORT
```

### Scalar passes

If SCALAR_ONSET passes:

```text
V15N_D6_D2_D2_REIMPACT_ONSET_OBSERVABLE_SCALAR
```

### Scalar fails, DN innovation passes

```text
V15N_D6_D2_D2_REIMPACT_ONSET_OBSERVABLE_DN_INNOVATION
```

### Neither passes

```text
V15N_D6_D2_D2_REIMPACT_ONSET_NOT_DEMONSTRATED
```

---

## 9. stop rule

After the first authoritative result do not change:

- cohorts/seeds;
- D6 detector;
- label windows;
- five-frame causal history;
- PCA dimension;
- ridge lambda;
- threshold;
- support gates;
- observability gates;
- outcome precedence.

A positive result authorizes only a separately preregistered causal-eventizer experiment on another fresh HOLDOUT.

It does not authorize deployment of the oracle-trained D6 detector.

```text
POTION v15D
  DEPLOYED

v15N
  CLOSED / BLOCKED

v16C
  BLOCKED
```
