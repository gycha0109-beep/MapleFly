# design_v15n_d2 — exhaustive counterfactual frozen-score audit

## Purpose

v15N-D1 was valid but its primary interpretation was blocked by insufficient FORCED_DRINK support on the
frozen candidate's own trajectories:

```text
TRAIN forced DRINK
  8

EVAL forced DRINK
  15

required
  >=30 per cohort
```

The support problem is caused by conditioning the diagnostic on the same closed-loop policy trajectory that
is being diagnosed.

v15N-D2 removes that conditioning without changing the runtime policy.

---

## 1. frozen biological and policy channels

Keep frozen:

```text
v15N 41-parameter candidate
v15N TRAIN-only causal-trace PCA32
2-D nonlinear own-action recurrence
reward/CEM outcome
POTION v15D deployment
```

No replacement policy is trained.

---

## 2. exhaustive reachable own-action histories

For every tape and POTION decision d:

1. enumerate every binary prior POTION history of length d;
2. replay only those prior own actions through the frozen environment healing/damage accounting;
3. discard histories that are dead before decision d;
4. replay the same history through the frozen v15N recurrence to obtain h_d;
5. use the tape's unchanged PCA32 neural snapshot at decision d;
6. evaluate the frozen v15N score;
7. compute an evaluator-only exact minimum-use forced-action oracle from the reached hidden HP.

The neural tape does not depend on these counterfactual POTION actions, so no synthetic neural feedback is
invented.

---

## 3. score variants on the identical state

For every reachable forced state evaluate four frozen scores:

```text
FULL
  bias + episode neural term + action-state term

DECISION_MEAN_NEURAL
  bias + TRAIN decision-position mean neural term + same action-state term

NEURAL_OFF
  bias + same action-state term

ACTION_STATE_OFF
  bias + episode neural term
```

These are one-step diagnostics on the identical counterfactual state.

No variant is retrained.

---

## 4. cohorts

Use:

```text
exact v15N EVAL
  4111000
  4121000
  4131000

fresh HOLDOUT
  4171000
  4181000
  4191000
```

Reconstruct exact v15N TRAIN only to reproduce the frozen preprocessing and decision-position neural means.

Fresh HOLDOUT interruption RNG is independent and frozen before collection.

---

## 5. metrics

Primary metric for each score variant:

```text
balanced accuracy on FORCED_WAIT vs FORCED_DRINK
```

Also report:

- ordinary accuracy;
- class recalls;
- results by decision index;
- macro tape balanced accuracy where both classes exist;
- episode-specific neural residual AUC;
- score-term magnitudes;
- exact witnesses where FULL and DECISION_MEAN_NEURAL disagree.

Evaluator HP/oracle labels are diagnostic only.

---

## 6. scientific question

The diagnostic distinguishes:

```text
stable biological representation exists
  versus
frozen v15N reward-trained score uses that representation usefully
```

If replacing only episode-specific neural variation with the TRAIN decision mean improves oracle agreement
on both old EVAL and fresh HOLDOUT, then the v15N neural readout is using episode variation harmfully for
the minimum-use decision boundary.

That conclusion does not authorize decision-index means as a runtime feature.

---

## 7. deployment boundary

No deployment change is permitted from this diagnostic.

```text
POTION v15D
  DEPLOYED

v15N
  CLOSED / BLOCKED

v16C
  BLOCKED
```
