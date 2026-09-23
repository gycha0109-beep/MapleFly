# result_v15b3 — normalized reward-only DRINK/WAIT value learning

## Verdict

**V15B3_NORMALIZED_VALUE_LEARNING = PASS**

The preregistered norm-stable reward-only learner passed every frozen gate on the fresh
292xxxx cohort.

```text
FULL balanced accuracy   94.4%
WAIT recall              94.4%
DRINK recall             94.4%
mean G                   29.722
mean regret               0.278

DN_SHUFFLED BA           50.0%
FULL-DN margin          +44.4pp

NEURAL_OFF BA            50.0%
FULL-OFF margin         +44.4pp

v15C preregistration     AUTHORIZED
browser POTION           BLOCKED
```

## Provenance

```text
preregistration
  history/prereg_v15b3.md
  c75371458c35575af16045852e16d3403a0a88aa

implementation
  43bb4a6a9ebf6cf6026445b1b8e48398bf962d66
  experiment(v15b3): add normalized reward learner

workflow head
  6b82a15f2009779c945c19aa227a5d79a51a47b6
  experiment(v15b3): wire normalized reward CI

workflow
  Train MapleFly v15B3 Normalized Reward
  run 35904611372
  conclusion success

artifact
  10770299335
  maplefly-v15b3-normalized-reward-potion-35904611372
  sha256:3f715ef7f4f62e854db02c4e0f05b8662d5dab2a46d1ea0675320bffbe3bc838
```

## Frozen representation and learned model

```text
v15A12 representation
  33fc31f636e1cde215841dd33b0a93b24d4571cdabd32e9a1edc8fa2e696c847

v15B3 learned Q model
  47088bcb15ed2cd96f64d67a20169934bd7a866dcd56bacffea70b1f42537a59
```

No supervised v15A12 classifier weights were reused.

## Optimization stability

The normalized update eliminated the v15B2 numerical divergence.

```text
feature ||x||^2
  min    170.620
  mean   234.186
  max    357.345

effective step 0.5/(1+||x||^2)
  min    0.001395
  mean   0.002173
  max    0.002913

final WAIT head
  bias             -0.002914
  weight L2         0.432884
  max |weight|      0.156404

final DRINK head
  bias              0
  weight L2         0
  max |weight|      0
```

The DRINK head remaining zero is expected from the frozen reward normalization, under
which every DRINK action has normalized reward zero.

## Reward-only acquisition

```text
80 epochs x 96 contexts = 7,680 interactions

WAIT   3,778  (49.2%)
DRINK  3,902  (50.8%)
```

Actions were sampled by policy-owned uniform exploration. The trainer returned only the
chosen action's realized scalar reward.

## Held-out EVAL result

```text
confusion
              predicted WAIT  predicted DRINK
true WAIT          34               2
true DRINK          2              34
```

Hidden-state diagnostic:

```text
state 0  DRINK rate   0.0%   mean G 40.000
state 1  DRINK rate  11.1%   mean G 29.444
state 2  DRINK rate  88.9%   mean G 24.444
state 3  DRINK rate 100.0%   mean G 25.000
```

The action transition follows the preregistered reward boundary without HP, impact
count, DeltaG, or correct-action input.

## Causal controls

DN identity destruction:

```text
DN_SHUFFLED
  BA       50.0%
  mean G   25.000
```

Neural input removal:

```text
NEURAL_OFF
  BA       50.0%
  mean G   25.000
```

Both controls collapse to chance/trivial-baseline performance while the frozen learned
heads remain unchanged.

## Interpretation

The result supports the narrow claim:

> A reward-only learned linear readout over frozen MaleCNS DN temporal history acquired
> a DRINK/WAIT action-value policy on realized chosen-action rewards when the online
> update was normalized by DN feature-vector energy.

The result also resolves the v15B/v15B2 failure mechanism: those experiments did not
show absence of reward-learnable information; v15B2 directly exposed numerical
divergence, and v15B3 changed only the optimizer normalization plus fresh cohort.

This does not mean connectome synaptic weights learned. Learning remains in the
readout/policy over frozen DN activity.

## Consequence

v15C independent frozen-policy holdout is authorized.

Browser POTION deployment remains blocked until v15C passes and a separate v15D
integration/closure is completed.

Existing MOVE v7, ATTACK v10F, JUMP v11H2, and v14C remain unchanged.
