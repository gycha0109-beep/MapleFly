# design_v15n_d6_d2_d3_d3_d4_d1_realized_impact_age_attribution

## Question

v15N-D6-D2-D3-D3-D4 froze:

```text
V15N_D6_D2_D3_D3_D4_REALIZED_IMPACT_NOT_DEMONSTRATED
```

PCA32_TEMPORAL3 improved REALIZED_IMPACT recall by about 12.7 percentage points over CURRENT_PCA32 on both fresh cohorts, but remained below the 0.75 gate.

D4-D1 is failure attribution only.

It asks:

> Is the remaining TEMPORAL3 miss concentrated in the first 100 ms after a physical impact, or does the representation remain insufficient throughout the full 200 ms realized-impact window?

No model, temporal depth, threshold, feature, label, cohort, or weighting is changed.

---

## 1. frozen prerequisite

Require exact D4 evidence:

```text
run
  36498259584

artifact
  11005414896

artifact digest
  sha256:8b181324ed47f0253d31b3c582121b6fd3dc314df0ddfa9c94597910f930dff4

D4 JSON sha256
  154974f62c014a59a2f0fa2202081a17a9c39665e0c0db8fb879c75b4d232138

outcome
  V15N_D6_D2_D3_D3_D4_REALIZED_IMPACT_NOT_DEMONSTRATED

CURRENT_PCA32 model
  63d7272e8c3fa25f114bb78f82ef840c882b86b8fbfdcc140750efe007afa784

PCA32_TEMPORAL3 model
  4cb231aaf0c0f19b89dbc26f202aa2e50890e56452f1971627389cf63a5791a1
```

---

## 2. cohorts

Use the exact D4 cohorts.

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

This is attribution of the already-frozen D4 failure, not a new generalization claim.

---

## 3. exact reproduction

Reconstruct the exact frozen D6/PCA32 preprocessing and both D4 readouts.

Require:

- CURRENT_PCA32 model SHA exact match;
- PCA32_TEMPORAL3 model SHA exact match;
- D4 aggregate prospective metrics reproduce to absolute tolerance 1e-12.

Any mismatch invalidates D4-D1.

---

## 4. realized-impact age strata

For every D4 row with:

```text
stratum = REALIZED_IMPACT
```

compute evaluator-only latest physical-hit age.

Assign exactly one:

```text
EARLY_REALIZED
  0 <= hitAgeSteps < 5

LATE_REALIZED
  5 <= hitAgeSteps < 10
```

Equivalent wall-clock intervals:

```text
EARLY_REALIZED  0–<100 ms
LATE_REALIZED   100–<200 ms
```

---

## 5. diagnostics

For CURRENT_PCA32 and PCA32_TEMPORAL3 separately, per cohort and age stratum report:

- row count;
- positive recall at frozen threshold 0.5;
- median score;
- q25/q75 score;
- mean score.

Also report:

```text
temporal3RecallGain = temporal3 recall - current recall
```

for EARLY_REALIZED and LATE_REALIZED separately.

No threshold search.

---

## 6. support

For each cohort require:

```text
64 tapes
EARLY_REALIZED rows >= 500
LATE_REALIZED rows >= 500
```

Otherwise attribution is support-inconclusive.

---

## 7. diagnostic age axis

Primary axis uses frozen PCA32_TEMPORAL3 recall at threshold 0.5.

```text
EARLY_ONLY_UNRESOLVED
  EARLY recall < 0.75 in both cohorts
  and LATE recall >= 0.75 in both cohorts

LATE_ONLY_UNRESOLVED
  EARLY recall >= 0.75 in both cohorts
  and LATE recall < 0.75 in both cohorts

BOTH_AGE_BINS_UNRESOLVED
  EARLY recall < 0.75 in both cohorts
  and LATE recall < 0.75 in both cohorts

MIXED_AGE_FAILURE
  otherwise
```

---

## 8. scientific role

If EARLY_ONLY_UNRESOLVED, the main representation problem is causal response latency; a later eventizer can explicitly tolerate delayed evidence without treating pre-hit activity as realized impact.

If BOTH_AGE_BINS_UNRESOLVED, temporal depth 3 is not merely early-alignment limited and a deeper causal temporal representation is justified on fresh cohorts.

If LATE_ONLY_UNRESOLVED, lingering temporal discrimination is the blocker.

No parameter tuning, replacement eventizer, cumulative injury model, POTION policy, or deployment is evaluated.
