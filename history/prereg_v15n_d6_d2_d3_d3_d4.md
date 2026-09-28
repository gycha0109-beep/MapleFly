# prereg_v15n_d6_d2_d3_d3_d4 — causal PCA32 temporal-shape observability

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / OUTCOME**

Frozen prerequisite:

```text
v15N-D6-D2-D3-D3-D3-D1-D1
  V15N_D6_D2_D3_D3_D3_D1_D1_COMPONENT_AND_SCORE_ATTRIBUTED

result
  1cbae6b7e073dd09d67a8f4fb42fcc1d3ef49780

receipt
  29679daa16dbb716d958020ea841a9f14a66e0c5

missComponentAxis
  DN_SUBTHRESHOLD_DOMINANT

scoreSeparabilityLabels
  NO_SINGLE_SCORE_SEPARABILITY
```

Design:

```text
history/design_v15n_d6_d2_d3_d3_d4_causal_pca32_temporal_shape_observability.md
commit ad41b05b2c3a702accfbb547cb6fc00ac085f600
```

---

## 1. exact frozen preprocessing

Require:

```text
D1-D1 artifact
  10993630636

artifact digest
  sha256:d5e74ac8f50cd44087dbd947ab72f5309706546a25d3906c0b4212e841108f08

D1-D1 JSON sha256
  778ef1d800af2a6f8e14e3f86ded08ad91ee571b6ba60257da714f914daef3f0

D1-D1 outcome
  V15N_D6_D2_D3_D3_D3_D1_D1_COMPONENT_AND_SCORE_ATTRIBUTED

D6 weights
  5dc677cf4c14e398465af72cbcff784e40163cdf702064359e7f4648319c9eb5

innovation PCA32
  b187f3de9229e14260b8d1464e20fa3b8d26158a715a5372e4696c1bf3b7fb33

PCA components
  32

five-frame innovation history
  frozen
```

Any provenance/reconstruction failure:

```text
V15N_D6_D2_D3_D3_D4_IMPLEMENTATION_OR_PROVENANCE_INVALID
```

---

## 2. feature families

Frozen exactly:

```text
CURRENT_PCA32
  [z_t]
  dimension 32

PCA32_TEMPORAL3
  [z_(t-2), z_(t-1), z_t]
  dimension 96
```

where z is the exact frozen PCA32 projection of the existing five-frame DN innovation.

No old-scalar gate or old-scalar score enters either feature.

---

## 3. frame labels

For each eligible temporal3 frame assign exactly one evaluator-only stratum:

```text
REALIZED_IMPACT
  latest physical hit age >= 0 and < 10 simulation steps

PRE_HIT
  not REALIZED_IMPACT
  and next physical hit age > 0 and < 10 simulation steps

TRUE_BACKGROUND
  otherwise
```

Label precedence:

```text
REALIZED_IMPACT > PRE_HIT > TRUE_BACKGROUND
```

---

## 4. readout fitting

For each feature family independently:

```text
TRAIN-only unweighted mean/std standardization
ridge lambda = 1e-3
intercept unregularized
threshold = 0.5
```

TRAIN total sample weights exactly:

```text
REALIZED_IMPACT  1/3
PRE_HIT          1/3
TRUE_BACKGROUND  1/3
```

No feature selection, threshold search, regularization search, cohort tuning, or post-hoc label modification.

---

## 5. cohorts

TRAIN only:

```text
4081000 4091000 4101000
interruption 4147000
```

PROSPECTIVE_A:

```text
5271000 5281000 5291000 5301000
5311000 5321000 5331000 5341000
interruption 5357000
```

PROSPECTIVE_B:

```text
5361000 5371000 5381000 5391000
5401000 5411000 5421000 5431000
interruption 5447000
```

Exactly 64 tapes per prospective cohort.

---

## 6. support gates

For each prospective cohort require:

```text
64 tapes
REALIZED_IMPACT >= 1000
PRE_HIT >= 500
TRUE_BACKGROUND >= 500
```

Otherwise:

```text
V15N_D6_D2_D3_D3_D4_INSUFFICIENT_TEMPORAL_SHAPE_SUPPORT
```

---

## 7. observability gates

A feature family passes only if all five metrics are >= 0.75 on both prospective cohorts:

```text
balanced accuracy
REALIZED_IMPACT recall
overall negative recall
PRE_HIT negative recall
TRUE_BACKGROUND negative recall
```

---

## 8. preregistered outcomes

Precedence after validity/support:

### Temporal3 passes, current fails

```text
V15N_D6_D2_D3_D3_D4_TEMPORAL_SHAPE_OBSERVABLE
```

### Both pass

```text
V15N_D6_D2_D3_D3_D4_REALIZED_IMPACT_TARGET_SUFFICIENT_FOR_CURRENT_AND_TEMPORAL
```

### Current passes, temporal3 fails

```text
V15N_D6_D2_D3_D3_D4_CURRENT_PCA32_OBSERVABLE_ONLY
```

### Neither passes

```text
V15N_D6_D2_D3_D3_D4_REALIZED_IMPACT_NOT_DEMONSTRATED
```

---

## 9. stop rule

After the first authoritative result do not change:

- cohorts/seeds;
- frozen D6/PCA32 preprocessing;
- temporal depth 3;
- feature ordering;
- label definitions/precedence;
- stratum weighting;
- ridge lambda;
- threshold;
- support floors;
- observability gates;
- outcome precedence.

If temporal3 passes, a later experiment may test a causal pulse eventizer on fresh cohorts.

If neither passes, do not tune this PCA32 representation on D4 cohorts.

No cumulative injury model, POTION policy, or deployment is evaluated.

```text
POTION v15D
  DEPLOYED

v15N
  CLOSED / BLOCKED

v16C
  BLOCKED
```
