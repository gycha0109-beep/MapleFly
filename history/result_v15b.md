# result_v15b — reward-only DRINK/WAIT action-value learning

## Verdict

**V15B_REWARD_ONLY_LEARNING = FAIL**

The implementation and evidence pipeline completed normally. The workflow failure is a
scientific gate failure, not an implementation failure.

```text
FULL balanced accuracy   54.2%
WAIT recall              30.6%
DRINK recall             77.8%
mean G                   25.764
mean regret               4.236

DN_SHUFFLED BA           41.7%
FULL-DN margin          +12.5pp

NEURAL_OFF BA            50.0%
FULL-OFF margin          +4.2pp

v15C                     BLOCKED
browser POTION           BLOCKED
```

All preregistered v15B gates failed.

## Provenance

```text
preregistration
  history/prereg_v15b.md
  7d48968b71304cf3190e8c808414455af08b0895

implementation
  376916a13f6069192d41798e78a710e1bb90693a
  experiment(v15b): add reward-only potion learner

workflow head
  551f461b7c96541a6df3fda8f6cf8db6060c753c
  experiment(v15b): wire reward-only potion CI

workflow
  Train MapleFly v15B Reward Only Potion
  run 35900146037
  conclusion failure

artifact
  10769675269
  maplefly-v15b-reward-only-potion-35900146037
  sha256:e30da6d744588784beebeed4b9fa9d8bcd4dde75d97bc7d4110c080f4bffef39
```

## Frozen inputs verified

The runner verified the exact v15A12 representation:

```text
33fc31f636e1cde215841dd33b0a93b24d4571cdabd32e9a1edc8fa2e696c847
```

No supervised v15A12 classifier weights were reused.

The reward-only learned Q model was frozen as:

```text
sha256
42d5967dbb5851f5bfd16211d9dacafdf8e1b3c60a5a8834090d2751cb748299
```

## Training behavior

Across:

```text
80 epochs x 96 contexts = 7,680 reward interactions
```

the policy chose:

```text
WAIT   1,939   25.2%
DRINK  5,741   74.8%

epsilon-exploration events  1,600
```

Training did not improve into a stable high-return policy.

```text
epoch 0
  mean G       25.469
  audit-only action accuracy 55.2%

epoch 79
  mean G       25.104
  audit-only action accuracy 50.0%
```

The audit-only accuracy was logged for scientific inspection and was not supplied to
the learner.

## Held-out behavior by hidden state

```text
state 0  DRINK rate 55.6%   mean G 31.667
state 1  DRINK rate 83.3%   mean G 25.833
state 2  DRINK rate 77.8%   mean G 23.889
state 3  DRINK rate 77.8%   mean G 21.667
```

The learned policy strongly over-selected DRINK, including the two WAIT-optimal states.

## Interpretation

v15A12 showed that the frozen DN representation contains reward-relevant information.
v15B shows that the preregistered **epsilon=0.20 online greedy two-head learner did not
successfully extract that information from realized reward alone**.

The failure therefore does not invalidate v15A12 representation sufficiency. It rejects
this specific reward-learning procedure under the frozen hyperparameters and cohort.

A notable preregistered-process observation is the training action imbalance:
approximately three quarters of interactions became DRINK. Because reward feedback is
bandit feedback, this reduces WAIT-value coverage precisely where the hidden-state
dependence resides.

This observation may motivate a new exploration hypothesis, but it does not permit
post-hoc modification of v15B.

## Frozen consequence

- v15B remains FAIL.
- v15C holdout is not authorized from this run.
- browser POTION deployment remains blocked.
- do not lower gates or retune this run.
- do not replace the learner with the supervised v15A12 probe.

A new reward-learning algorithm/exploration hypothesis requires a new preregistration
and fresh seeds.

Existing MOVE v7, ATTACK v10F, JUMP v11H2, and v14C remain unchanged.
