# prereg_v15n_d6_d2_d3_d2_r1 — frozen-readout support replication

## Status

**PREREGISTERED BEFORE REPLICATION OUTCOME**

Frozen prerequisite:

```text
v15N-D6-D2-D3-D2
  V15N_D6_D2_D3_D2_INSUFFICIENT_CONDITIONAL_SUPPORT

result
  fef27b6f3ef2ec379c163a6abde504b75f9c62bc

receipt
  de391e1eff99cb0c5f586c25fb436f6741c69f09
```

Design:

```text
history/design_v15n_d6_d2_d3_d2_r1_frozen_readout_support_replication.md
commit e45254fd39d6920afa2274e69092f192627ecf74
```

---

## 1. exact prerequisite

Require:

```text
D3-D2 artifact
  10915626754

artifact digest
  sha256:edf821f959746bda8a757e895779d18ac1953fc33457a9635a5d1113facaae5c

v15n_d6_d2_d3_d2.json sha256
  e0d51061e0d32f2bdf373da213e71c4758258c9df236cf9238b604c91c598347

D3-D2 outcome
  V15N_D6_D2_D3_D2_INSUFFICIENT_CONDITIONAL_SUPPORT
```

Frozen readouts:

```text
DERIVATIVE3
  13f38c51f80d3392e8649a6438154410ba250e78836e02134e2521f24ffd1f82

SCALAR4
  fb4e5f955a6362e471ff72604c608ad9e44022eef93d7ec6414cbac8b95610a4

old scalar
  ee36661675a1f6717d53d2f2af63797704d89194bf78d980f5d4415e3ee4f066

D6 weights
  5dc677cf4c14e398465af72cbcff784e40163cdf702064359e7f4648319c9eb5
```

Any mismatch:

```text
V15N_D6_D2_D3_D2_R1_IMPLEMENTATION_OR_PROVENANCE_INVALID
```

---

## 2. cohorts

Original TRAIN, solely for deterministic reconstruction of the frozen readouts:

```text
4081000 4091000 4101000
```

REPLICATION_A:

```text
4551000 4561000 4571000 4581000
4591000 4601000 4611000 4621000

interruption 4637000
```

REPLICATION_B:

```text
4641000 4651000 4661000 4671000
4681000 4691000 4701000 4711000

interruption 4727000
```

Each replication cohort must contain exactly 64 tapes.

---

## 3. frozen method

Reproduce D3-D2 without changes:

```text
context
  previous old-scalar-positive required

DERIVATIVE3
  delta1, delta5mean, peakRise5

SCALAR4
  margin, delta1, delta5mean, peakRise5

TRAIN-only standardization
class-balanced deterministic ridge least squares
lambda = 1e-3
threshold = 0.5
```

No replication data may enter fitting, normalization, threshold selection, or feature construction beyond direct application of the frozen causal transforms.

---

## 4. support gates

REPLICATION_A and REPLICATION_B separately:

```text
64 tapes
POSITIVE_REIMPACT >= 400
NEGATIVE_LINGER >= 500
NEGATIVE_BACKGROUND >= 500
```

If either fails:

```text
V15N_D6_D2_D3_D2_R1_INSUFFICIENT_REPLICATION_SUPPORT
```

---

## 5. observability gates

For each family independently, all must pass on both replication cohorts:

```text
balanced accuracy >= 0.75
positive re-impact recall >= 0.75
negative recall >= 0.75
```

---

## 6. preregistered outcomes

Precedence:

### Invalid

```text
V15N_D6_D2_D3_D2_R1_IMPLEMENTATION_OR_PROVENANCE_INVALID
```

### Insufficient replication support

```text
V15N_D6_D2_D3_D2_R1_INSUFFICIENT_REPLICATION_SUPPORT
```

### DERIVATIVE3 passes

```text
V15N_D6_D2_D3_D2_R1_CONDITIONAL_INNOVATION_REPLICATED
```

### DERIVATIVE3 fails, SCALAR4 passes

```text
V15N_D6_D2_D3_D2_R1_CONDITIONAL_SCALAR_ONLY_REPLICATED
```

### Neither passes

```text
V15N_D6_D2_D3_D2_R1_CONDITIONAL_REIMPACT_NOT_REPLICATED
```

---

## 7. stop rule

After the first authoritative result do not change:

- original TRAIN;
- replication cohorts;
- interruption seeds;
- context condition;
- labels;
- features;
- model reconstruction;
- lambda;
- threshold;
- support gates;
- observability gates;
- outcome precedence.

No eventizer or POTION policy is evaluated in R1.

```text
POTION v15D
  DEPLOYED

v15N
  CLOSED / BLOCKED

v16C
  BLOCKED
```
