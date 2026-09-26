# result_v15n_d6_d2_d2 — re-impact onset observability

## Status

```text
V15N_D6_D2_D2_REIMPACT_ONSET_OBSERVABLE_SCALAR
```

The preregistered v15N-D6-D2-D2 diagnostic completed successfully.

Authoritative evidence:

```text
run
  36204734622

head
  24d8a9a175a63cb04962fde3e16058895f15644c

artifact
  10893084661

artifact name
  maplefly-v15n-d6-d2-d2-reimpact-onset-36204734622

artifact digest
  sha256:9873b523751ac109596b70d96d2bbde264ae0a92d2df8abebcce99d9e983b8fe

v15n_d6_d2_d2.json sha256
  51bcb6fbc61e568b6f515660325c45127a9a4f51cf9fe19086abc78b3b3c496d
```

Preregistration:

```text
d76595c6fa857020e384028cab6628654e117fb4
```

Implementation/workflow:

```text
462e9de42e740e40744e8ff7f44812ed049b96d0
24d8a9a175a63cb04962fde3e16058895f15644c
```

---

## 1. support

All preregistered support gates passed.

```text
EVAL
  positive onset frames       606
  LINGER negatives           5410
  BACKGROUND negatives       2972
  suppressed re-impacts       539

fresh HOLDOUT
  positive onset frames       631
  LINGER negatives           5541
  BACKGROUND negatives       2716
  suppressed re-impacts       549
```

---

## 2. SCALAR_ONSET

Features:

```text
margin
delta1
delta5mean
peakRise5
```

Metrics:

```text
TRAIN
  balanced accuracy              0.881226
  positive recall                0.922840
  negative recall                0.839613
  suppressed re-impact recall    0.946789

EVAL
  balanced accuracy              0.877083
  positive recall                0.917492
  negative recall                0.836674
  suppressed re-impact recall    0.935065

fresh HOLDOUT
  balanced accuracy              0.878071
  positive recall                0.916006
  negative recall                0.840136
  suppressed re-impact recall    0.943534
```

LINGER/BACKGROUND negative recall:

```text
EVAL
  LINGER       0.833641
  BACKGROUND   0.842194

HOLDOUT
  LINGER       0.847140
  BACKGROUND   0.825847
```

All preregistered SCALAR_ONSET gates passed on both EVAL and fresh HOLDOUT.

---

## 3. DN_INNOVATION_PCA32 comparator

```text
EVAL
  balanced accuracy              0.752510
  positive recall                0.754125
  negative recall                0.750895
  suppressed re-impact recall    0.760668

fresh HOLDOUT
  balanced accuracy              0.748288
  positive recall                0.744849
  negative recall                0.751726
  suppressed re-impact recall    0.748634
```

The preregistered DN_INNOVATION_PCA32 gate did not pass because fresh-HOLDOUT balanced accuracy, positive recall, and suppressed-re-impact recall were below 0.75.

---

## 4. interpretation

The current blocker is not absence of a causal re-impact onset signature under the diagnostic D6 representation.

A four-dimensional temporal representation derived from the frozen D6 scalar margin distinguishes new impact onset from LINGER/BACKGROUND activity and recovers more than 93% of the re-impacts suppressed by the old D2 armed/disarmed eventizer on both EVAL and fresh HOLDOUT.

The full 1316-D innovation comparator is not required by this diagnostic result.

This does **not** establish a deployable impact detector. The underlying D6 detector direction was trained using evaluator-only impact labels, and the D2-D2 scalar diagnostic readout also uses evaluator-only onset labels during training.

The next experiment may therefore test a separately preregistered causal scalar-onset eventizer as a diagnostic upper bound on fresh HOLDOUT data. It must not be described as deployable.

---

## 5. deployment

```text
POTION v15D
  DEPLOYED

v15N
  CLOSED / BLOCKED

v15N-D6-D2-D2
  DIAGNOSTIC COMPLETE

v16C
  BLOCKED
```
