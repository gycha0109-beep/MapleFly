# design_v15n_d6_d2_d3_d2_r1_frozen_readout_support_replication

## Question

v15N-D6-D2-D3-D2 froze:

```text
V15N_D6_D2_D3_D2_INSUFFICIENT_CONDITIONAL_SUPPORT
```

The only preregistered support failure was insufficient NEGATIVE_BACKGROUND examples in both EVAL and HOLDOUT.

D3-D2-R1 asks:

> With the exact frozen D3-D2 representations and readouts, do the conditional re-impact observability gates pass on two substantially larger entirely fresh cohorts with adequate BACKGROUND support?

This is a prospective support replication only.

No feature, label, classifier, threshold, gate, or eventizer is changed.

---

## 1. frozen prerequisite

Exact D3-D2 evidence:

```text
run
  36269933164

artifact
  10915626754

artifact digest
  sha256:edf821f959746bda8a757e895779d18ac1953fc33457a9635a5d1113facaae5c

v15n_d6_d2_d3_d2.json sha256
  e0d51061e0d32f2bdf373da213e71c4758258c9df236cf9238b604c91c598347

outcome
  V15N_D6_D2_D3_D2_INSUFFICIENT_CONDITIONAL_SUPPORT
```

Frozen model identities:

```text
DERIVATIVE3 model sha256
  13f38c51f80d3392e8649a6438154410ba250e78836e02134e2521f24ffd1f82

SCALAR4 model sha256
  fb4e5f955a6362e471ff72604c608ad9e44022eef93d7ec6414cbac8b95610a4

old D2-D2 scalar model sha256
  ee36661675a1f6717d53d2f2af63797704d89194bf78d980f5d4415e3ee4f066

D6 weights sha256
  5dc677cf4c14e398465af72cbcff784e40163cdf702064359e7f4648319c9eb5
```

The frozen models may be deterministically reconstructed from the original TRAIN cohort only and must match these hashes before replication evaluation.

---

## 2. cohorts

Original TRAIN is used only to reconstruct the already-frozen readouts:

```text
TRAIN
  4081000 4091000 4101000
```

Prospective replication cohorts:

```text
REPLICATION_A
  4551000 4561000 4571000 4581000
  4591000 4601000 4611000 4621000

interruption RNG
  4637000

REPLICATION_B
  4641000 4651000 4661000 4671000
  4681000 4691000 4701000 4711000

interruption RNG
  4727000
```

Each replication cohort must contain exactly 64 tapes.

No D3-D2 EVAL or D3-D2 HOLDOUT episode contributes to the replication gates.

---

## 3. frozen context and labels

Reproduce D3-D2 exactly.

Eligibility:

```text
immediately preceding eligible frame
has oldScalarPositive = true
```

Labels:

```text
POSITIVE_REIMPACT
  first eligible frame at/after a hit and <100 ms,
  with previous old-scalar-positive

NEGATIVE_LINGER
  previous old-scalar-positive
  0.5 s <= latest-hit age < 2.0 s
  no physical hit in preceding 100 ms

NEGATIVE_BACKGROUND
  previous old-scalar-positive
  no prior hit OR latest-hit age >= 2.0 s
  no physical hit in preceding 100 ms
```

---

## 4. frozen feature/readout families

### DERIVATIVE3 — primary

```text
delta1
delta5mean
peakRise5
```

### SCALAR4 — comparator

```text
margin
delta1
delta5mean
peakRise5
```

Both use the exact frozen D3-D2 TRAIN-only standardization and class-balanced ridge readout:

```text
lambda = 1e-3
threshold = 0.5
```

No retraining on replication data.

---

## 5. support

Each replication cohort independently must satisfy the original support floors:

```text
64 tapes
POSITIVE_REIMPACT >= 400
NEGATIVE_LINGER >= 500
NEGATIVE_BACKGROUND >= 500
```

---

## 6. observability

Use the original D3-D2 gates without modification.

A feature family passes only if all are true on both REPLICATION_A and REPLICATION_B:

```text
balanced accuracy >= 0.75
positive re-impact recall >= 0.75
negative recall >= 0.75
```

Report LINGER and BACKGROUND negative recall separately.

---

## 7. scientific role

A positive replication would resolve the D3-D2 support insufficiency without changing the model.

A negative replication with adequate support would close the current scalar conditional-reimpact route under the frozen diagnostic representation and require a different eventization representation rather than parameter tuning.

This remains nondeployable because the D6 detector and diagnostic readouts ultimately depend on evaluator-only labels.
