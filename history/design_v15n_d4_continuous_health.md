# design_v15n_d4 — continuous current-HP observability audit

## Purpose

v15N-D3 used two fixed health bands. CRITICAL had ample support, but FULL_HEAL_AVAILABLE had too few
HP>70 counterfactual states and the preregistered diagnostic stopped at insufficient support.

v15N-D4 removes the class-threshold problem entirely.

Primary question:

> Can the exact frozen v15N observation reconstruct continuous current HP on unseen episodes?

This is a diagnostic-only supervised regression. HP is an evaluator-only target and is never a runtime
input.

---

## 1. frozen representation

At every exhaustive surviving counterfactual state use:

```text
FULL34
  frozen causal-trace PCA32 + frozen v15N recurrent h2

NEURAL32
  PCA32 only

ACTION_STATE2
  h2 only
```

No HP, missing HP, contact/damage count, time, decision index, seed, future damage, oracle action, or potion
count enters any feature vector.

---

## 2. target

```text
target
  evaluator current HP immediately before the current POTION decision
```

The target remains in HP points [1,100].

No health threshold is fitted or selected.

---

## 3. state population

Use the same exhaustive construction as v15N-D2/D3:

- enumerate every prior binary POTION history at each decision;
- discard histories dead before the decision;
- reconstruct h2 only from the agent's own prior actions;
- attach the tape's frozen PCA32 neural vector;
- compute current HP only in the evaluator.

---

## 4. diagnostic regression

For each feature set independently:

1. fit TRAIN-only feature means/scales;
2. standardize features using TRAIN statistics;
3. append an intercept;
4. fit deterministic ridge least squares to current HP.

Frozen ridge:

```text
lambda
  1e-3

intercept
  not regularized
```

No hyperparameter search.

---

## 5. evaluation

Unchanged weights are evaluated on:

```text
exact v15N EVAL
fresh v15N-D4 HOLDOUT
```

Report:

```text
R^2
MAE in HP points
RMSE in HP points
Pearson correlation
```

Also report per-tape R^2/MAE and per-decision MAE.

---

## 6. attribution

The key comparison is:

```text
FULL34 versus ACTION_STATE2
```

If adding PCA32 consistently improves unseen current-HP reconstruction, the causal neural trace contributes
injury-state information beyond the agent's own potion-action memory.

If it does not, then v15M-D1's stable recent-impact signal is not being retained by this representation as a
useful long-horizon current-health estimate.

---

## 7. deployment boundary

All fitted regression weights are diagnostic-only.

No probe weight may be copied into a runtime POTION policy.

```text
POTION v15D
  DEPLOYED

v15N
  CLOSED / BLOCKED

v16C
  BLOCKED
```
