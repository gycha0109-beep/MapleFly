# result_v15n_d6_d1 — neural eventization failure attribution

## Status

```text
V15N_D6_D1_TEMPORAL_MULTICOUNT_FAILURE
```

The preregistered v15N-D6-D1 attribution audit completed successfully. It exactly reproduced the frozen D6 detector and accumulator before attributing the frame-wise evidence.

Authoritative evidence:

```text
run
  36195755217

head
  f1a5412aed24d1b9f35d3d2c3e901799c46b1786

artifact
  10889583735

artifact name
  maplefly-v15n-d6-d1-eventization-attribution-36195755217

artifact digest
  sha256:8e145733e95d83f25e548aa05e531357b6e685df7b6e8d8e3bc92f3f5fef84c3

v15n_d6_d1.json sha256
  90fdd058e87d380140aeade0cb4e7a172bb8f4848308969b0c1f9903a100c177
```

Preregistration:

```text
20edf4db027b1e91ced7038eff895969a08b2d60
```

Implementation/workflow:

```text
d3e891016d244fd6e601d4aef3790d597082d4c7
f1a5412aed24d1b9f35d3d2c3e901799c46b1786
```

No replacement policy or detector was trained.

---

## 1. exact D6 reproduction

Frozen detector:

```text
threshold
  0.1367936045430042

separation
  0.7830625725367281

weights sha256
  5dc677cf4c14e398465af72cbcff784e40163cdf702064359e7f4648319c9eb5
```

Detector and accumulator metrics reproduced to the preregistered 1e-12 tolerance.

---

## 2. attribution

### TRAIN

```text
background evidence mass fraction    0.0532
background positive-frame rate       0.1243
duplicate evidence mass fraction     0.7955
median positive frames per hit       6
per-hit evidence CV                  0.3977
```

### EVAL

```text
background evidence mass fraction    0.0579
background positive-frame rate       0.1135
duplicate evidence mass fraction     0.7985
median positive frames per hit       6
per-hit evidence CV                  0.4104
```

### fresh HOLDOUT

```text
background evidence mass fraction    0.0563
background positive-frame rate       0.1197
duplicate evidence mass fraction     0.7987
median positive frames per hit       6
per-hit evidence CV                  0.4328
```

HOLDOUT / EVAL mean per-hit evidence ratio:

```text
0.9396
```

---

## 3. frozen mechanism flags

```text
backgroundLeakageHigh
  false

multiCountHigh
  true

amplitudeUnstable
  false

amplitudeShift
  false
```

Therefore, by preregistered precedence:

```text
V15N_D6_D1_TEMPORAL_MULTICOUNT_FAILURE
```

---

## 4. interpretation

The dominant measured failure is not background leakage or cross-cohort amplitude drift.

One physical hit produces a median of six supra-threshold neural frames, and about 80% of hit-attributed evidence mass occurs after the first supra-threshold frame. Naively summing every positive frame therefore counts a temporally extended neural response repeatedly.

Background evidence contributes only about 5-6% of total evidence mass, below the frozen 25% failure gate. Per-hit amplitude CV remains about 0.40-0.43 and the HOLDOUT/EVAL mean ratio is 0.94, so the preregistered amplitude-instability gates also remain false.

The next diagnostic should preserve the exact frozen D6 detector and test a causal neural eventizer that converts a sustained detector response into one event before accumulation. This remains an upper-bound diagnostic because the D6 detector itself was trained with evaluator-only impact labels.

---

## 5. deployment

```text
POTION v15D
  DEPLOYED

v15N
  CLOSED / BLOCKED

v15N-D6-D1
  DIAGNOSTIC COMPLETE

v16C
  BLOCKED
```
