# prereg_v15n_d5 — causal multiscale cumulative-injury observability

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / FRESH HOLDOUT COLLECTION / OUTCOME**

Frozen prerequisite:

```text
v15N-D4
  V15N_D4_INCONCLUSIVE

v15N-D4 receipt
  597d565f461e6efe6e04c4d8ed8d296331417fd5
```

Design:

```text
history/design_v15n_d5_multiscale_injury_memory.md
commit b22af2c74b548f5a8636c01bf42517a91fd47c63
```

No replacement policy is trained.

---

## 1. cohorts

TRAIN:

```text
4081000
4091000
4101000
```

EVAL:

```text
4111000
4121000
4131000
```

Original TRAIN->EVAL interruption RNG:

```text
4147000
```

Fresh HOLDOUT:

```text
4291000
4301000
4311000
```

Fresh HOLDOUT interruption RNG:

```text
4327000
```

24 tapes and 240 decision snapshots per cohort.

---

## 2. frozen provenance

Require exact:

```text
v15N artifact
  10846125740

v15N evidence JSON sha256
  103e3ebc84e7d062394ec22608b533cfc135c89eedc766f7f7c682a6dcdcd1a4

v15N preprocessing sha256
  977aa76306c4aa387585c7cdea9a96de26296764ef98962565bd49935d6ccc83
```

Exact v15N EVAL FULL aggregate must reproduce to tolerance 1e-12.

EVAL and HOLDOUT lower-skill ecology must pass frozen v15N gates.

---

## 3. frozen multiscale traces

100 ms frame interval.

Half-lives:

```text
0.5 s
2.0 s
8.0 s
32.0 s
```

For each H:

```text
lambda_H = 2^(-0.1/H)
trace_H,0 = 0
trace_H,t = lambda_H * trace_H,t-1 + (1-lambda_H) * x_t
```

The 2.0-second trace at all TRAIN/EVAL decision snapshots must match the existing v15N trace with maximum
absolute error <=1e-12.

Any mismatch invalidates the experiment.

---

## 4. representation

MULTISCALE:

```text
concatenate 4 * 1316 traces = 5264 dimensions
TRAIN-only column standardization
TRAIN-only label-free PCA32
```

PCA contract:

```text
components
  32

power iterations
  80

seed base
  4338000 + component index
```

SINGLE2 comparator:

```text
existing frozen v15N PCA32 preprocessing
```

No damage/contact/HP label enters PCA.

---

## 5. evaluator-only target

At each decision:

```text
damage =
  10 * count(damageEvent.step < decision.step)
```

Fit TRAIN-only mean damage for each decision index 0..9.

Primary target:

```text
damageResidual =
  damage - trainMeanDamage[decisionIndex]
```

The TRAIN decision means are evaluator-only target preprocessing, not runtime inputs.

---

## 6. ridge regression

For MULTISCALE_PCA32 and SINGLE2_PCA32 separately:

- TRAIN-only feature mean/scale;
- append intercept;
- equal weight per unique tape-decision snapshot;
- ridge lambda = 1e-3;
- intercept unregularized;
- deterministic partial-pivot Gaussian elimination.

No hyperparameter search.

---

## 7. support / validity

Require:

```text
240 unique snapshots per cohort
damageResidual SD >=5 HP in TRAIN
damageResidual SD >=5 HP in EVAL
damageResidual SD >=5 HP in HOLDOUT
24 tapes per cohort
ecology pass
provenance pass
2.0-second trace reproduction pass
```

Otherwise:

```text
V15N_D5_IMPLEMENTATION_OR_SUPPORT_INVALID
```

---

## 8. metrics

For each representation and cohort report:

```text
R2
MAE in HP/damage points
RMSE
Pearson r
per-decision MAE
```

Episode-shift controls use the same frozen probe weights.

Define:

```text
multiStable =
  EVAL MULTISCALE R2 >=0.30
  AND HOLDOUT MULTISCALE R2 >=0.30
  AND EVAL MULTISCALE MAE <=10
  AND HOLDOUT MULTISCALE MAE <=10

singleStable =
  EVAL SINGLE2 R2 >=0.30
  AND HOLDOUT SINGLE2 R2 >=0.30
  AND EVAL SINGLE2 MAE <=10
  AND HOLDOUT SINGLE2 MAE <=10

multiImproves =
  EVAL (MULTISCALE R2 - SINGLE2 R2) >=0.15
  AND HOLDOUT (MULTISCALE R2 - SINGLE2 R2) >=0.15

episodeSpecific =
  EVAL (MULTISCALE R2 - SHIFTED_MULTISCALE R2) >=0.15
  AND HOLDOUT (MULTISCALE R2 - SHIFTED_MULTISCALE R2) >=0.15

bothClearlyWeak =
  EVAL MULTISCALE R2 <=0.10
  AND HOLDOUT MULTISCALE R2 <=0.10
  AND EVAL SINGLE2 R2 <=0.10
  AND HOLDOUT SINGLE2 R2 <=0.10
```

---

## 9. preregistered outcomes

Precedence top to bottom.

### Invalid/support failure

```text
V15N_D5_IMPLEMENTATION_OR_SUPPORT_INVALID
```

### Multiscale cumulative injury memory demonstrated

If:

```text
multiStable
AND multiImproves
AND episodeSpecific
```

then:

```text
V15N_D5_MULTISCALE_CUMULATIVE_INJURY_MEMORY_PRESENT
```

### Single 2-second representation already sufficient

If:

```text
singleStable
AND episodeSpecific
```

then:

```text
V15N_D5_SINGLE_TIMESCALE_INJURY_MEMORY_SUFFICIENT
```

### Multiscale decodes but episode specificity not demonstrated

If:

```text
multiStable
AND NOT episodeSpecific
```

then:

```text
V15N_D5_NON_EPISODE_SPECIFIC_DECODING
```

### Both clearly weak

If:

```text
bothClearlyWeak
```

then:

```text
V15N_D5_CUMULATIVE_INJURY_MEMORY_NOT_DEMONSTRATED
```

### Otherwise

```text
V15N_D5_INCONCLUSIVE
```

---

## 10. stop rule

After results do not change:

- half-lives;
- PCA width/seed/iterations;
- damage residual definition;
- ridge lambda;
- seeds;
- gates;
- outcome thresholds.

Do not reuse supervised damage-regression weights in runtime.
Do not expose damage/contact/HP labels to a POTION policy.
Do not modify v15D deployment.

```text
POTION v15D
  DEPLOYED

v15N
  CLOSED / BLOCKED

v16C
  BLOCKED
```
