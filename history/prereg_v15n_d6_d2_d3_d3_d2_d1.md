# prereg_v15n_d6_d2_d3_d3_d2_d1 — background window fate attribution

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / OUTCOME**

Frozen prerequisite:

```text
v15N-D6-D2-D3-D3-D2
  V15N_D6_D2_D3_D3_D2_INSUFFICIENT_DELAYED_MAX_SUPPORT

result
  5c21b996c1773f628ce1a4ef0917a511bc8ade6e

receipt
  500ec66a5ff4db7c0690d6f5a0e435867df1bbb8
```

Design:

```text
history/design_v15n_d6_d2_d3_d3_d2_d1_background_window_fate_attribution.md
commit 96b0ad64f710f702752ecbf07738b46a65263bdd
```

---

## 1. exact prerequisite

Require:

```text
D2 artifact
  10939579823

artifact digest
  sha256:102a5308585a923f0134fb26cc202038fa6c553072969a4e08a393561bafd1d3

D2 JSON sha256
  5273efaf28c24415ae3372f9a9380f2821ba0de017bc57bf8e9baf0daa5fd1da

D2 outcome
  V15N_D6_D2_D3_D3_D2_INSUFFICIENT_DELAYED_MAX_SUPPORT

D3-D3 DN model
  a341d9747a19bf4a3a0cb625eca5a4ff6a3dd071e1f641a4d8005cd18d21f496

old scalar model
  ee36661675a1f6717d53d2f2af63797704d89194bf78d980f5d4415e3ee4f066

innovation PCA
  b187f3de9229e14260b8d1464e20fa3b8d26158a715a5372e4696c1bf3b7fb33

threshold
  0.5
```

Any provenance or deterministic reconstruction failure:

```text
V15N_D6_D2_D3_D3_D2_D1_IMPLEMENTATION_OR_PROVENANCE_INVALID
```

---

## 2. cohorts

Use exact D2 cohorts:

```text
TRAIN
  4081000 4091000 4101000
  interruption 4147000

ATTRIBUTION_A
  4911000 4921000 4931000 4941000
  4951000 4961000 4971000 4981000
  interruption 4997000

ATTRIBUTION_B
  5001000 5011000 5021000 5031000
  5041000 5051000 5061000 5071000
  interruption 5087000
```

Exactly 64 tapes per attribution cohort.

---

## 3. raw BACKGROUND anchors

Generate exact D3-D3 negative rows and select:

```text
y = 0
negativeKind = BACKGROUND
```

No future-hit exclusion at anchor selection.

---

## 4. fate categories

Inspect first physical hit in:

```text
[anchorStep, anchorStep + 10 simulation steps)
```

Assign exactly one:

```text
HIT_FREE_200MS
HIT_WITHIN_0_100MS
HIT_WITHIN_100_200MS
```

Boundary:

```text
age < 5 steps      => HIT_WITHIN_0_100MS
5 <= age < 10     => HIT_WITHIN_100_200MS
no hit < 10 steps => HIT_FREE_200MS
```

---

## 5. frozen DN timing

Use exact frozen D3-D3 DN score and D2 conditional-frame rule.

For future-hit anchors classify:

```text
PRE_HIT_POSITIVE
POST_HIT_OR_SAME_STEP_POSITIVE
NO_DN_POSITIVE_200MS
```

PRE_HIT_POSITIVE takes precedence if any DN-positive frame occurs strictly before the first future physical hit.

No threshold search or score calibration.

---

## 6. support

For each attribution cohort:

```text
64 tapes
raw BACKGROUND anchors >= 500
```

Otherwise:

```text
V15N_D6_D2_D3_D3_D2_D1_INSUFFICIENT_BACKGROUND_ANCHOR_SUPPORT
```

---

## 7. primary fate outcomes

Compute:

```text
futureHitWithin200msFraction
hitFree200msFraction
```

Outcome precedence after validity/support:

### FUTURE_HIT_DOMINANT

```text
futureHitWithin200msFraction >= 0.90
in both cohorts
```

Outcome:

```text
V15N_D6_D2_D3_D3_D2_D1_BACKGROUND_IS_NEAR_FUTURE_HIT_DOMINANT
```

### HIT_FREE_DOMINANT

```text
hitFree200msFraction >= 0.60
in both cohorts
```

Outcome:

```text
V15N_D6_D2_D3_D3_D2_D1_BACKGROUND_IS_HIT_FREE_DOMINANT
```

### Otherwise

```text
V15N_D6_D2_D3_D3_D2_D1_BACKGROUND_FATE_MIXED
```

---

## 8. secondary timing attribution

Among future-hit anchors only, report:

```text
PRE_HIT_POSITIVE fraction
POST_HIT_OR_SAME_STEP_POSITIVE fraction
NO_DN_POSITIVE_200MS fraction
```

Descriptive timing labels:

```text
PRE_HIT_DN_DOMINANT if PRE_HIT_POSITIVE >= 0.60 in both cohorts
POST_HIT_DN_DOMINANT if POST_HIT_OR_SAME_STEP_POSITIVE >= 0.60 in both cohorts
MIXED_OR_SILENT otherwise
```

Secondary timing does not change the primary outcome.

---

## 9. stop rule

After the first authoritative result do not change:

- cohorts/seeds;
- raw BACKGROUND anchor definition;
- 200 ms fate window;
- 0-100 / 100-200 boundary;
- frozen DN model/threshold;
- support floor;
- 0.90 / 0.60 dominance thresholds;
- outcome precedence.

No replacement eventizer, cumulative injury model, POTION policy, or deployment is evaluated.

```text
POTION v15D
  DEPLOYED

v15N
  CLOSED / BLOCKED

v16C
  BLOCKED
```
