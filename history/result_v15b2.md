# result_v15b2 — uniform-exploration reward-only DRINK/WAIT learning

## Verdict

**V15B2_UNIFORM_EXPLORATION = FAIL**

The implementation and evidence pipeline completed normally. The workflow failure is a
scientific gate failure, not an implementation failure.

```text
FULL balanced accuracy   51.4%
WAIT recall              47.2%
DRINK recall             55.6%
mean G                   25.347
mean regret               4.653

DN_SHUFFLED BA           43.1%
FULL-DN margin           +8.3pp

NEURAL_OFF BA            50.0%
FULL-OFF margin          +1.4pp

v15C                     BLOCKED
browser POTION           BLOCKED
```

## Provenance

```text
preregistration
  history/prereg_v15b2.md
  6d3515ec52934c7c46dcfbdac28aad4824cfba66

implementation
  272f11369198712a7cb927ee3f84c25906631af8
  experiment(v15b2): add uniform reward exploration learner

workflow head
  b4efa56b14506bdbae708791449ff4e79af6fa6c
  experiment(v15b2): wire uniform reward exploration CI

workflow
  Train MapleFly v15B2 Uniform Reward Exploration
  run 35901338447
  conclusion failure

artifact
  10769138148
  maplefly-v15b2-uniform-reward-potion-35901338447
  sha256:52a1c551f8d3a886fa0dd10bf134b1e19d8d575f16dbd906a27dad244a17e211
```

## Frozen representation

The exact v15A12 representation was verified:

```text
33fc31f636e1cde215841dd33b0a93b24d4571cdabd32e9a1edc8fa2e696c847
```

The v15B2 learned model:

```text
32f7d9acc0177443a5606f5b4197095b32b46220937872de521f7193ce0deae8
```

## Training behavior

Uniform policy-owned exploration successfully removed the v15B action-sampling
imbalance:

```text
80 epochs x 96 contexts = 7,680 interactions

WAIT   3,935  (51.2%)
DRINK  3,745  (48.8%)
```

Nevertheless reward performance stayed near the trivial baseline.

```text
epoch 0
  mean G       24.167
  audit-only action accuracy 47.9%

epoch 79
  mean G       25.052
  audit-only action accuracy 46.9%
```

## Held-out behavior

```text
state 0  DRINK rate 50.0%   mean G 32.500
state 1  DRINK rate 55.6%   mean G 27.222
state 2  DRINK rate 50.0%   mean G 22.500
state 3  DRINK rate 61.1%   mean G 19.167
```

The policy did not learn the required state-dependent action ordering.

## Optimization diagnostic

The frozen reward evaluator has an important structural property:

```text
normalized reward R = (G-25)/15

DRINK reward
  state 0  0
  state 1  0
  state 2  0
  state 3  0

WAIT reward
  state 0  +1
  state 1  +1/3
  state 2  -1/3
  state 3  -1
```

Therefore the zero-initialized DRINK head receives target zero and remains exactly zero.
The decision is effectively learned through the WAIT value head.

The artifact shows severe WAIT-head numerical growth under the preregistered raw SGD
update:

```text
WAIT bias
  33,418,121,858.22481

WAIT weight L2 norm
  approximately 5.02e11

maximum absolute WAIT weight
  approximately 1.10e11

DRINK bias
  0

DRINK weight norm
  0
```

This is direct evidence that the raw per-sample learning rate 0.01 is numerically
unstable for the 256-dimensional standardized feature vectors under this update rule.

v15B already showed the same direction at a smaller scale; v15B2's greater WAIT
coverage produced substantially larger divergence.

## Interpretation

v15B2 rejects the hypothesis that v15B failed merely because epsilon=0.20 Q-greedy
acquisition undersampled WAIT.

The result instead exposes a more specific next hypothesis:

> the reward-only signal may be learnable, but the preregistered unnormalized SGD
> update is unstable at the observed feature-vector scale.

This does not authorize post-hoc learning-rate tuning on v15B2.

A new experiment should preserve uniform policy-owned exploration and the frozen reward
problem, while changing only the optimizer to a norm-stable online linear update.

## Frozen consequence

- v15B remains FAIL.
- v15B2 remains FAIL.
- v15C remains BLOCKED.
- browser POTION deployment remains BLOCKED.
- supervised v15A12 remains scientific evidence only.

Existing MOVE v7, ATTACK v10F, JUMP v11H2, and v14C remain unchanged.
