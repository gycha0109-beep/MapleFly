# design_v15m_d2 — recurrent decision-state oracle upper-bound audit

## Purpose

The frozen chain now isolates the unresolved failure more tightly:

```text
v15K-D2
  frozen MaleCNS contains persistent impact information

v15L-D1
  causal neural observation + previous four actions is decision-relevantly aliased

v15M
  one-dimensional persistent neural-action belief fails reward-only EVAL
  and does not show mandatory memory/action-feedback contribution

v15M-D1
  the exact v15M causal trace and PCA32 retain a stable cross-cohort RECENT_IMPACT_2S signal
```

The next question is therefore not whether the biological signal exists.

It is:

> Can the frozen v15M one-dimensional recurrent decision-state architecture represent the oracle-required
> WAIT/DRINK boundary at all, if optimization is given diagnostic oracle supervision?

This is an upper-bound diagnostic only. No resulting weights are deployable.

---

## 1. exact counterfactual state set

For each tape and each decision index t:

1. enumerate every binary prior own-action history of length t;
2. replay the frozen potion economics exactly;
3. discard histories that are already dead before decision t;
4. retain the current hidden HP only inside the evaluator;
5. classify the current decision using an exact remaining-horizon minimum-use oracle.

The runtime feature vector never receives HP.

This exposes the architecture to the same counterfactual distinction that produced v15L-D1 aliasing rather
than only one policy trajectory per tape.

---

## 2. exact oracle class

For a reachable state, compute the minimum additional potion uses needed to survive if the current action
is forced to WAIT and if it is forced to DRINK.

```text
WAIT cost
  minimum remaining uses among surviving sequences beginning WAIT

DRINK cost
  1 + minimum remaining uses among surviving sequences beginning DRINK
```

Class:

```text
FORCED_WAIT
  WAIT cost < DRINK cost

FORCED_DRINK
  DRINK cost < WAIT cost

EITHER
  equal finite minimum cost

UNSURVIVABLE
  neither action permits survival
```

Primary supervised fitting and balanced accuracy use only FORCED_WAIT and FORCED_DRINK states.

EITHER and UNSURVIVABLE counts are reported but not used as labels.

---

## 3. exact v15M recurrent family

For a fixed recurrent decay r:

```text
belief_t =
  r * belief_(t-1)
  + neuralWeights dot PCA32_t
  + actionFeedback * previousOwnAction

score_t =
  belief_t + bias
```

For any fixed r, this can be rewritten exactly as a linear classifier over:

```text
discountedNeural32_t(r)
discountedOwnAction_t(r)
bias
```

where:

```text
discountedNeural_t =
  r * discountedNeural_(t-1) + PCA32_t

discountedOwnAction_t =
  r * discountedOwnAction_(t-1) + previousOwnAction
```

Therefore the fixed-r supervised problem is convex logistic classification.

This lets the diagnostic test the recurrent architecture without relying on reward-only CEM.

---

## 4. decay grid

The learned v15M decay is not reused as a privileged value.

Use the frozen grid:

```text
0.00
0.05
0.10
...
0.95
0.99
```

21 candidates total.

For each candidate:

- construct the exact recurrent features;
- fit the same deterministic weighted logistic probe on TRAIN only;
- choose the decay with the lowest TRAIN weighted logistic loss;
- freeze it before EVAL/HOLDOUT scoring.

The grid is an oracle diagnostic search and is not a deployable hyperparameter search.

---

## 5. supervised diagnostic probe

For each fixed decay:

```text
features
  32 discounted neural dimensions
  1 discounted own-action dimension
  1 bias

labels
  FORCED_WAIT=0
  FORCED_DRINK=1
```

Use inverse-class-frequency weights so TRAIN FORCED_WAIT and FORCED_DRINK contribute equal total weight.

Use deterministic full-batch logistic regression with fixed L2 regularization.

No HP/contact/damage/time/decision index enters the feature vector.

---

## 6. cohorts

Fit only on the frozen v15M TRAIN cohort.

Evaluate unchanged on:

```text
v15M EVAL
fresh v15M-D1 HOLDOUT
```

Use the exact v15M-D1 frozen preprocessing/PCA recipe.

---

## 7. biological-alignment controls

For the selected frozen diagnostic classifier:

### NEURAL_OFF

Zero the 32 discounted neural features while retaining discounted own-action state.

This measures how much of the oracle boundary can be solved by action history alone.

### EPISODE_SHIFT_1

For each target tape, use the next episode's complete PCA32 neural sequence while retaining:

- target tape oracle labels;
- target prior action history.

This breaks episode-specific neural alignment without changing the action-history state.

No retraining.

---

## 8. interpretation

The audit is not a deployment test.

A high oracle-supervised upper bound would mean:

```text
the v15M recurrent family can represent the required decision boundary;
the reward-only v15M failure is primarily an optimization/objective-discovery problem
```

A low upper bound despite stable v15M-D1 neural information would mean:

```text
one scalar recurrent state is itself too restrictive for the counterfactual potion economy
```

If action-only performance is already near FULL, the diagnostic instead indicates a schedule/action-history
shortcut and does not establish useful MaleCNS dependence.

---

## 9. deployment boundary

No classifier or decay selected here may be deployed.

```text
POTION v15D
  remains deployed

v15M
  blocked

v16C
  blocked
```
