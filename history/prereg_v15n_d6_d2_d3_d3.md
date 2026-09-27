# prereg_v15n_d6_d2_d3_d3 — context-balanced DN innovation observability

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / OUTCOME**

Frozen prerequisite:

```text
v15N-D6-D2-D3-D2-R1
  V15N_D6_D2_D3_D2_R1_CONDITIONAL_REIMPACT_NOT_REPLICATED

result
  e13230ac727fd43955e19727de32492dce151050

receipt
  d0bb6bce3a1c75222d8407e90d60513f6fe1ccf6
```

Design:

```text
history/design_v15n_d6_d2_d3_d3_context_balanced_dn_innovation.md
commit 59cb57620cf5bc03112c4c4cca271b32847bdaff
```

---

## 1. exact prerequisites

Require exact frozen identities:

```text
R1 authoritative JSON
  ff70bf5055712b48cc08b1dca3ee0c50ba8836ed2c501342fa5d49713e4f8a42

old D2-D2 scalar model
  ee36661675a1f6717d53d2f2af63797704d89194bf78d980f5d4415e3ee4f066

D6 weights
  5dc677cf4c14e398465af72cbcff784e40163cdf702064359e7f4648319c9eb5

D2-D2 innovation PCA preprocessing
  b187f3de9229e14260b8d1464e20fa3b8d26158a715a5372e4696c1bf3b7fb33

v15N preprocessing
  977aa76306c4aa387585c7cdea9a96de26296764ef98962565bd49935d6ccc83
```

Any provenance or deterministic-reproduction failure:

```text
V15N_D6_D2_D3_D3_IMPLEMENTATION_OR_PROVENANCE_INVALID
```

---

## 2. cohorts

TRAIN only:

```text
4081000 4091000 4101000
interruption 4147000
```

PROSPECTIVE_A:

```text
4731000 4741000 4751000 4761000
4771000 4781000 4791000 4801000
interruption 4817000
```

PROSPECTIVE_B:

```text
4821000 4831000 4841000 4851000
4861000 4871000 4881000 4891000
interruption 4907000
```

Each prospective cohort must contain exactly 64 tapes.

---

## 3. frozen context / labels

Rows are eligible only when the immediately preceding eligible frame is positive under the frozen old scalar model.

Exactly one POSITIVE_REIMPACT row per qualifying physical hit:

```text
first eligible frame at/after hit and <100 ms
previous old-scalar-positive required
```

NEGATIVE_LINGER:

```text
previous old-scalar-positive
0.5 s <= latest hit age < 2.0 s
no hit in preceding 100 ms
```

NEGATIVE_BACKGROUND:

```text
previous old-scalar-positive
no prior hit OR latest hit age >= 2.0 s
no hit in preceding 100 ms
```

Frames 0.1-0.5 s after hit are excluded from negatives.

---

## 4. frozen feature families

### DN_INNOVATION_PCA32

```text
innovation_t =
  current D6 phase-residualized 1316-D frame
  - mean(previous 5 phase-residualized frames)
```

Project using the exact D2-D2 label-free PCA32:

```text
240 evenly spaced TRAIN innovation rows
TRAIN-only standardization
32 components
80 iterations
seed 3948000
required preprocessing sha256
  b187f3de9229e14260b8d1464e20fa3b8d26158a715a5372e4696c1bf3b7fb33
```

### DERIVATIVE3

```text
delta1
delta5mean
peakRise5
```

No feature family may be added after outcome.

---

## 5. context-balanced diagnostic ridge

For each family independently:

```text
TRAIN-only feature standardization
deterministic ridge least squares
lambda = 1e-3
threshold = 0.5
```

Frozen TRAIN row weights:

```text
each POSITIVE row:
  1 / (3 * N_positive)

each LINGER row:
  1 / (3 * N_linger)

each BACKGROUND row:
  1 / (3 * N_background)
```

Require all three TRAIN strata to be non-empty.

No threshold, regularization, PCA, feature, or weight search.

---

## 6. support gates

For PROSPECTIVE_A and PROSPECTIVE_B separately:

```text
64 tapes
POSITIVE_REIMPACT >= 400
NEGATIVE_LINGER >= 500
NEGATIVE_BACKGROUND >= 500
```

Otherwise:

```text
V15N_D6_D2_D3_D3_INSUFFICIENT_PROSPECTIVE_SUPPORT
```

---

## 7. observability gates

A family passes only if every metric below is >= 0.75 on both prospective cohorts:

```text
balanced accuracy
positive re-impact recall
overall negative recall
LINGER negative recall
BACKGROUND negative recall
```

---

## 8. preregistered outcomes

Precedence:

### Invalid

```text
V15N_D6_D2_D3_D3_IMPLEMENTATION_OR_PROVENANCE_INVALID
```

### Insufficient support

```text
V15N_D6_D2_D3_D3_INSUFFICIENT_PROSPECTIVE_SUPPORT
```

### DN passes, DERIVATIVE3 fails

```text
V15N_D6_D2_D3_D3_CONDITIONAL_DN_INNOVATION_OBSERVABLE
```

### Both pass

```text
V15N_D6_D2_D3_D3_CONTEXT_BALANCING_SUFFICIENT_FOR_SCALAR_AND_DN
```

### DERIVATIVE3 passes, DN fails

```text
V15N_D6_D2_D3_D3_CONTEXT_BALANCED_SCALAR_OBSERVABLE_ONLY
```

### Neither passes

```text
V15N_D6_D2_D3_D3_CONDITIONAL_REIMPACT_NOT_DEMONSTRATED
```

---

## 9. stop rule

After the first authoritative result do not change:

- cohorts/seeds;
- old scalar context condition;
- label windows;
- five-frame innovation definition;
- PCA fit rows/dimension/iterations/seed;
- feature families;
- three-stratum weights;
- lambda;
- threshold;
- support gates;
- observability gates;
- outcome precedence.

No eventizer, cumulative-injury model, or POTION policy is evaluated in D3-D3.

```text
POTION v15D
  DEPLOYED

v15N
  CLOSED / BLOCKED

v16C
  BLOCKED
```
