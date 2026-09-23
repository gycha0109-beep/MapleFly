# prereg_v15b2 — reward-only learning with policy-owned uniform exploration

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / OUTCOME**

v15B failed scientifically with the frozen reward-only two-head learner:

```text
FULL BA        54.2%
WAIT recall    30.6%
DRINK recall   77.8%
mean G         25.764

training actions
  WAIT         1,939  (25.2%)
  DRINK        5,741  (74.8%)
```

The representation itself had already passed v15A12 reward-advantage sufficiency.

v15B2 tests one new algorithmic hypothesis:

> the v15B learner failed because Q-greedy feedback collapsed reward sampling toward
> DRINK; maintaining policy-owned unbiased action exploration during reward acquisition
> may let the same two-head learner estimate action value from realized rewards.

Only the exploration rule and fresh cohort change. Gates, representation, reward,
epochs, learning rate, L2, update rule, and evaluation remain frozen.

## Frozen from v15B

Unchanged:

- MaleCNS connectome and sensory interface,
- HP-independent taste/decision opportunity,
- exact v15A12 FULL48 representation,
- two linear Q heads,
- zero initialization,
- reward evaluator,
- reward normalization `R=(G-25)/15`,
- 80 epochs,
- learning rate 0.01,
- L2 0.001,
- chosen-head-only squared-error update,
- greedy no-exploration EVAL,
- DN_SHUFFLED and NEURAL_OFF controls,
- all v15B gate thresholds.

No supervised v15A12 classifier is reused.

## Frozen representation

```text
artifact
  10768761312
  sha256:8aa759b04643d618e69aaa647d7251eb237816ee3b84bcc97a0f451d20cbba78

representation
  FULL48_REWARD_ADVANTAGE
  sha256:33fc31f636e1cde215841dd33b0a93b24d4571cdabd32e9a1edc8fa2e696c847
```

## Fresh cohort

TRAIN:

```text
2910000
2910100
2910200
2910300
```

EVAL:

```text
2915000
2915100
2915200
```

6 replicates x 4 hidden states per base seed.

```text
TRAIN 96 unique contexts
EVAL  72 unique contexts
```

## Policy-owned uniform exploration

The sole learning-rule change from v15B:

During every TRAIN interaction:

```text
P(WAIT)  = 0.5
P(DRINK) = 0.5
```

The action is sampled by the learner's own RNG, independent of Q values and hidden
state.

Policy RNG:

```text
2918000
```

This is equivalent to `epsilon=1.0` acquisition, but the implementation should record
the mode explicitly as:

```text
UNIFORM_POLICY_EXPLORATION
```

The trainer does not choose or alternate actions and does not ensure per-context
pairing. It only executes the learner-sampled action and returns that action's realized
reward.

## Training

Unchanged:

```text
epochs         80
learning rate  0.01
L2             0.001
```

Order seed:

```text
2916000 + epoch
```

For chosen action only:

```text
error = Q_chosen(x) - R

bias_chosen -= 0.01 * error

weight_chosen[f] -= 0.01 * (
  error*x[f] + 0.001*weight_chosen[f]
)
```

No unchosen reward is computed for learning.

## Evaluation

No exploration:

```text
argmax(Q_WAIT,Q_DRINK)
tie -> WAIT
```

Correct action / oracle return is computed only after selection for scoring.

Controls:

```text
DN_SHUFFLED  seed = baseSeed + 900000
NEURAL_OFF   all 256 standardized features = 0
```

## Gate — unchanged from v15B

All required:

```text
FULL balanced accuracy      >= 70%
WAIT recall                 >= 60%
DRINK recall                >= 60%
FULL - DN_SHUFFLED BA       >= 20pp
FULL - NEURAL_OFF BA        >= 20pp
FULL mean realized G        >= 27.5
FULL mean regret            <= 2.5
```

If PASS:

```text
V15B2_UNIFORM_EXPLORATION = PASS
v15C holdout preregistration = AUTHORIZED
browser POTION deployment = BLOCKED
```

If FAIL:

```text
V15B2_UNIFORM_EXPLORATION = FAIL
v15C = BLOCKED
browser POTION deployment = BLOCKED
```

## Forbidden learner inputs

Same as v15B. In particular:

- HP / missing HP,
- original state / impact count,
- unchosen action reward,
- DeltaG,
- optimal action,
- shouldDrink,
- supervised v15A12 weights/logits/labels,
- seed / impact schedule.

## Interpretation rule

A PASS supports:

> reward-only action-value learning is possible from the frozen DN representation when
> the learner maintains unbiased policy-owned exploration.

It does not retroactively turn v15B into PASS. v15B remains a frozen failure of the
epsilon=0.20 Q-greedy acquisition regime.

A FAIL rejects this uniform-exploration variant under the frozen learner and gates.

## Forbidden post-hoc changes

Do not change:

- representation,
- 291xxxx cohort,
- reward evaluator/normalization,
- 80 epochs,
- learning rate,
- L2,
- 50/50 action probability,
- policy/order seeds,
- gates,
- controls,
- samples.

Do not add supervised labels or counterfactual updates after seeing the result.

Existing MOVE v7, ATTACK v10F, JUMP v11H2, and v14C remain unchanged.
