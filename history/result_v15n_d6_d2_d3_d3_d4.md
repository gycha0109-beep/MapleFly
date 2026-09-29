# result_v15n_d6_d2_d3_d3_d4 — causal PCA32 temporal-shape observability

## Status

```text
V15N_D6_D2_D3_D3_D4_REALIZED_IMPACT_NOT_DEMONSTRATED
```

The preregistered D4 audit completed successfully with strong support on both fresh prospective cohorts. Neither feature family passed all frozen observability gates.

Authoritative evidence:

```text
run
  36498259584

head
  7922bb3bf9612e7e2649882400b9a6d0cddf7b14

artifact
  11005414896

artifact digest
  sha256:8b181324ed47f0253d31b3c582121b6fd3dc314df0ddfa9c94597910f930dff4

v15n_d6_d2_d3_d3_d4.json sha256
  154974f62c014a59a2f0fa2202081a17a9c39665e0c0db8fb879c75b4d232138
```

Preregistration:

```text
3186c1c107be4dfca25a59db0a4d70a2016f31b9
```

Implementation/workflow:

```text
a1bdb73031893ddbae5f77f18137aa6fba65a4a2
7922bb3bf9612e7e2649882400b9a6d0cddf7b14
```

## 1. support

```text
PROSPECTIVE_A
  tapes             64
  REALIZED_IMPACT 3343
  PRE_HIT         2727
  TRUE_BACKGROUND 24202
  support           PASS

PROSPECTIVE_B
  tapes             64
  REALIZED_IMPACT 3375
  PRE_HIT         2756
  TRUE_BACKGROUND 24141
  support           PASS
```

## 2. CURRENT_PCA32

```text
PROSPECTIVE_A
  balanced accuracy          0.732294
  REALIZED_IMPACT recall     0.518397
  overall negative recall    0.946192
  PRE_HIT negative recall    0.902824
  TRUE_BACKGROUND recall     0.951078

PROSPECTIVE_B
  balanced accuracy          0.731150
  REALIZED_IMPACT recall     0.519407
  overall negative recall    0.942893
  PRE_HIT negative recall    0.902758
  TRUE_BACKGROUND recall     0.947475
```

Model SHA:

```text
63d7272e8c3fa25f114bb78f82ef840c882b86b8fbfdcc140750efe007afa784
```

## 3. PCA32_TEMPORAL3

```text
PROSPECTIVE_A
  balanced accuracy          0.790028
  REALIZED_IMPACT recall     0.644930
  overall negative recall    0.935126
  PRE_HIT negative recall    0.887422
  TRUE_BACKGROUND recall     0.940501

PROSPECTIVE_B
  balanced accuracy          0.789536
  REALIZED_IMPACT recall     0.647704
  overall negative recall    0.931368
  PRE_HIT negative recall    0.888970
  TRUE_BACKGROUND recall     0.936208
```

Model SHA:

```text
4cb231aaf0c0f19b89dbc26f202aa2e50890e56452f1971627389cf63a5791a1
```

## 4. interpretation

Temporal shape is genuinely useful descriptively:

```text
REALIZED_IMPACT recall gain
  A  +0.126533
  B  +0.128296

balanced-accuracy gain
  A  +0.057733
  B  +0.058385
```

The gain replicates closely across both fresh cohorts, while PRE_HIT and TRUE_BACKGROUND rejection remain high.

However the decisive REALIZED_IMPACT recall remains only about 64–65%, below the frozen 0.75 gate. Therefore D4 does not establish observability.

The next diagnostic should not select a deeper temporal representation from these same prospective results. It should first attribute TEMPORAL3 realized-impact misses by post-hit age:

- EARLY_REALIZED: hit age 0–<100 ms;
- LATE_REALIZED: hit age 100–<200 ms.

It should reproduce D4 exactly, then report CURRENT_PCA32 and TEMPORAL3 recall/score distributions in each age stratum. This will determine whether the temporal gain is specifically a delayed-response effect or whether both halves of the realized-impact window remain unresolved.

No D4 threshold, temporal depth, labels, or model may be tuned on these cohorts.

## 5. deployment

```text
POTION v15D
  DEPLOYED

v15N
  CLOSED / BLOCKED

D4 PCA32 temporal3 observability
  NOT DEMONSTRATED

v16C
  BLOCKED
```
