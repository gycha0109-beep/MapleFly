# prereg_v15n_d4 — continuous current-HP observability audit

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / FRESH HOLDOUT COLLECTION / OUTCOME**

Frozen prerequisite:

```text
v15N-D3
  V15N_D3_INSUFFICIENT_HEALTH_STATE_SUPPORT

v15N-D3 receipt
  bb4f0ab31a0c727070ccd7ea499264f1cfef43bc
```

Design:

```text
history/design_v15n_d4_continuous_health.md
commit 3d9f5d5f13d8539b332708e8e874dcb68953e5c9
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

Exact v15N EVAL:

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
4251000
4261000
4271000
```

Fresh HOLDOUT interruption RNG:

```text
4287000
```

24 tapes per cohort.

---

## 2. frozen provenance

Require exact:

```text
v15N artifact
  10846125740

v15N evidence JSON sha256
  103e3ebc84e7d062394ec22608b533cfc135c89eedc766f7f7c682a6dcdcd1a4

v15N params sha256
  c3a2a2516296fb907834c3f6556afca1ea2f127a09e1b64d5ad46e4b00cbc5e5

v15N preprocessing sha256
  977aa76306c4aa387585c7cdea9a96de26296764ef98962565bd49935d6ccc83
```

Exact v15N EVAL FULL aggregate must reproduce to tolerance 1e-12.

EVAL and HOLDOUT lower-skill ecology must pass frozen v15N gates.

---

## 3. state construction

Enumerate every surviving prior POTION history at each decision exactly as in D2/D3.

Target:

```text
current HP before current decision
```

Feature sets:

```text
FULL34
  PCA32 + h2

NEURAL32
  PCA32

ACTION_STATE2
  h2
```

No evaluator-only value enters features.

---

## 4. regression

For each feature set:

- TRAIN-only feature means and population standard deviations;
- zero scale -> 1;
- intercept appended;
- ridge least squares;
- lambda = 1e-3;
- intercept unregularized;
- deterministic partial-pivot Gaussian elimination.

Every reachable TRAIN state has equal regression weight.

No hyperparameter search.

---

## 5. support / validity guard

Require:

```text
TRAIN states   >=3000
EVAL states    >=3000
HOLDOUT states >=3000

HP standard deviation in every cohort >=15 HP
24 tapes in every cohort
```

Failure:

```text
V15N_D4_INSUFFICIENT_CONTINUOUS_HEALTH_SUPPORT
```

---

## 6. metrics

For TRAIN, EVAL, HOLDOUT and each feature set report:

```text
R^2
MAE
RMSE
Pearson r
```

Also report per-tape R^2/MAE and per-decision MAE.

Primary representation is FULL34.

Define:

```text
fullStable =
  EVAL FULL34 R^2 >=0.40
  AND HOLDOUT FULL34 R^2 >=0.40
  AND EVAL FULL34 MAE <=15
  AND HOLDOUT FULL34 MAE <=15

neuralAddsHealth =
  EVAL (FULL34 R^2 - ACTION_STATE2 R^2) >=0.10
  AND HOLDOUT (FULL34 R^2 - ACTION_STATE2 R^2) >=0.10

fullClearlyWeak =
  EVAL FULL34 R^2 <=0.15
  AND HOLDOUT FULL34 R^2 <=0.15
  AND EVAL FULL34 MAE >=20
  AND HOLDOUT FULL34 MAE >=20
```

---

## 7. preregistered outcomes

Precedence top to bottom.

### Invalid

If provenance or ecology fails:

```text
V15N_D4_IMPLEMENTATION_OR_PROVENANCE_INVALID
```

### Insufficient continuous support

If support/variance guard fails:

```text
V15N_D4_INSUFFICIENT_CONTINUOUS_HEALTH_SUPPORT
```

### Stable current-health reconstruction with neural contribution

If:

```text
fullStable
AND
neuralAddsHealth
```

then:

```text
V15N_D4_CURRENT_HEALTH_RECOVERABLE_WITH_NEURAL_CONTRIBUTION
```

### Stable reconstruction without demonstrated neural contribution

If:

```text
fullStable
AND NOT neuralAddsHealth
```

then:

```text
V15N_D4_CURRENT_HEALTH_RECOVERABLE_ACTION_STATE_DOMINANT
```

### Clearly weak

If:

```text
fullClearlyWeak
```

then:

```text
V15N_D4_CURRENT_HEALTH_NOT_LINEarly_RECOVERABLE
```

Canonical spelling in evidence must be:

```text
V15N_D4_CURRENT_HEALTH_NOT_LINEARLY_RECOVERABLE
```

### Otherwise

```text
V15N_D4_INCONCLUSIVE
```

---

## 8. stop rule

After the authoritative outcome do not change:

- ridge lambda;
- seeds;
- support/variance gates;
- R^2 or MAE thresholds;
- feature sets;
- PCA;
- recurrence;
- reward/CEM;
- diagnostic weights.

Do not deploy diagnostic regression weights.
Do not modify v15D deployment.

```text
POTION v15D
  DEPLOYED

v15N
  CLOSED / BLOCKED

v16C
  BLOCKED
```
