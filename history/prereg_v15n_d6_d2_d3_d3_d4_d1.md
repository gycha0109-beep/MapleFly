# prereg_v15n_d6_d2_d3_d3_d4_d1 — realized-impact age attribution

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / OUTCOME**

Frozen prerequisite:

```text
v15N-D6-D2-D3-D3-D4
  V15N_D6_D2_D3_D3_D4_REALIZED_IMPACT_NOT_DEMONSTRATED

result
  af58a509f51c8a809db5855d80a60ab4e1b3baa6

receipt
  d25a7f6d0a5d3c0cea10592e7f58834bbd87dfb1
```

Design:

```text
history/design_v15n_d6_d2_d3_d3_d4_d1_realized_impact_age_attribution.md
commit 79914daaa58a6351e5dee18f87e082ac0a39bfb8
```

---

## 1. exact prerequisite

Require:

```text
D4 artifact
  11005414896

artifact digest
  sha256:8b181324ed47f0253d31b3c582121b6fd3dc314df0ddfa9c94597910f930dff4

D4 JSON sha256
  154974f62c014a59a2f0fa2202081a17a9c39665e0c0db8fb879c75b4d232138

D4 outcome
  V15N_D6_D2_D3_D3_D4_REALIZED_IMPACT_NOT_DEMONSTRATED

CURRENT_PCA32 model
  63d7272e8c3fa25f114bb78f82ef840c882b86b8fbfdcc140750efe007afa784

PCA32_TEMPORAL3 model
  4cb231aaf0c0f19b89dbc26f202aa2e50890e56452f1971627389cf63a5791a1
```

Any provenance/reproduction failure:

```text
V15N_D6_D2_D3_D3_D4_D1_IMPLEMENTATION_OR_PROVENANCE_INVALID
```

---

## 2. cohorts

Use exact D4 cohorts:

```text
TRAIN
  4081000 4091000 4101000
  interruption 4147000

ATTRIBUTION_A
  5271000 5281000 5291000 5301000
  5311000 5321000 5331000 5341000
  interruption 5357000

ATTRIBUTION_B
  5361000 5371000 5381000 5391000
  5401000 5411000 5421000 5431000
  interruption 5447000
```

Exactly 64 tapes per cohort.

---

## 3. exact reconstruction

Reconstruct exact D4:

- frozen D6 detector;
- frozen innovation PCA32;
- CURRENT_PCA32 readout;
- PCA32_TEMPORAL3 readout;
- threshold 0.5;
- D4 labels and prospective rows.

Require model SHA exact matches and aggregate D4 metrics to reproduce to absolute tolerance 1e-12.

---

## 4. age strata

For REALIZED_IMPACT rows only:

```text
EARLY_REALIZED
  0 <= latestHitAgeSteps < 5

LATE_REALIZED
  5 <= latestHitAgeSteps < 10
```

Label boundaries are frozen.

---

## 5. support

For each attribution cohort require:

```text
64 tapes
EARLY_REALIZED >= 500
LATE_REALIZED >= 500
```

Otherwise:

```text
V15N_D6_D2_D3_D3_D4_D1_INSUFFICIENT_AGE_SUPPORT
```

---

## 6. diagnostics

For both D4 feature families and each age stratum report:

- row count;
- frozen-threshold positive recall;
- mean score;
- q25 score;
- median score;
- q75 score.

Also report TEMPORAL3 minus CURRENT recall gain per age stratum.

No threshold search, model fitting change, or temporal-depth change.

---

## 7. frozen age-axis labels

Use PCA32_TEMPORAL3 recall at threshold 0.5.

```text
EARLY_ONLY_UNRESOLVED
  EARLY < 0.75 in both cohorts
  LATE >= 0.75 in both cohorts

LATE_ONLY_UNRESOLVED
  EARLY >= 0.75 in both cohorts
  LATE < 0.75 in both cohorts

BOTH_AGE_BINS_UNRESOLVED
  EARLY < 0.75 in both cohorts
  LATE < 0.75 in both cohorts

MIXED_AGE_FAILURE
  otherwise
```

---

## 8. preregistered outcomes

Precedence:

### Invalid

```text
V15N_D6_D2_D3_D3_D4_D1_IMPLEMENTATION_OR_PROVENANCE_INVALID
```

### Insufficient support

```text
V15N_D6_D2_D3_D3_D4_D1_INSUFFICIENT_AGE_SUPPORT
```

### Valid attribution

```text
V15N_D6_D2_D3_D3_D4_D1_REALIZED_IMPACT_AGE_ATTRIBUTED
```

The frozen age-axis label determines the next representation experiment.

---

## 9. stop rule

After the first authoritative result do not change:

- cohorts/seeds;
- D4 feature families/models;
- threshold;
- age boundaries;
- support floors;
- 0.75 age-axis criterion;
- outcome precedence.

No temporal-depth tuning, replacement eventizer, cumulative injury model, POTION policy, or deployment is evaluated.

```text
POTION v15D
  DEPLOYED

v15N
  CLOSED / BLOCKED

v16C
  BLOCKED
```
