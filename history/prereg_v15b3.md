# prereg_v15b3 — norm-stable reward-only DRINK/WAIT value learning

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / OUTCOME**

v15B and v15B2 are frozen scientific failures.

v15B2 successfully removed the original action-sampling imbalance with policy-owned
50:50 exploration, but the learned WAIT head diverged numerically:

```text
WAIT bias            3.34e10
WAIT weight L2       ~5.02e11
max |WAIT weight|    ~1.10e11

DRINK bias           0
DRINK weights        0
```

The frozen reward structure explains the zero DRINK head:

```text
normalized reward R=(G-25)/15

             WAIT       DRINK
state 0      +1          0
state 1      +1/3        0
state 2      -1/3        0
state 3      -1          0
```

v15B3 tests one new hypothesis:

> the frozen v15A12 DN representation contains learnable reward information, but the
> raw per-sample SGD update used by v15B/v15B2 is unstable at the observed
> 256-dimensional feature-vector scale; a norm-stable linear update can recover
> reward-only DRINK/WAIT learning.

Only the optimizer step normalization and fresh cohort change.

## Frozen biological / sensory contract

Unchanged from v15B2:

```text
connectome
  alextitonis/fly.ai
  95a3dbcb05241b0a5c07028ca8ad945b23fbbe6e

corrected LgLG
  LEFT 331
  RIGHT 338

impact
  drive 0.7
  pulse 6 brain steps = 120 ms

ground
  SNta_L/R = 0.05

decision/taste offer
  LB3 + claw_tpGRN bilateral
  drive 0.8
  final 100 ms
  HP-independent and identical for every hidden state

history
  48 x 100 ms = 4.8 s
```

The old HP-gated v5 `canDrink()/potionDrive()` path remains forbidden.

## Frozen representation

Use the exact v15A12 representation without feature reselection or normalization refit.

```text
v15A12 artifact
  10768761312
  sha256:8aa759b04643d618e69aaa647d7251eb237816ee3b84bcc97a0f451d20cbba78

workflow head
  353bbdc91bbe125434c1263d8c8d1be308e1844d

representation
  FULL48_REWARD_ADVANTAGE
  sha256:33fc31f636e1cde215841dd33b0a93b24d4571cdabd32e9a1edc8fa2e696c847

input
  256 standardized temporal DN features
```

No supervised v15A12 classifier weights/logits are reused.

## Reward environment

Frozen exactly from v15A12/v15B/v15B2:

```text
max HP           100
contact damage    10
potion heal       30
future contacts    6
potion cost        15

G = terminalHP - 15*potionUsed
R = (G-25)/15
```

Both WAIT and DRINK are always available.

The learner receives only the realized scalar reward for its sampled action. The
unchosen action return is not supplied to training.

## Fresh cohort

TRAIN:

```text
2920000
2920100
2920200
2920300
```

EVAL:

```text
2925000
2925100
2925200
```

Each base seed:

```text
6 replicates x hidden states 0/1/2/3
```

Totals:

```text
TRAIN 96 unique contexts
EVAL  72 unique contexts
```

Brain seed:

```text
baseSeed + replicate*7 + 1
```

Impact schedule RNG:

```text
brainSeed + 500000
```

## Policy-owned exploration

Frozen from v15B2:

```text
UNIFORM_POLICY_EXPLORATION

P(WAIT)  = 0.5
P(DRINK) = 0.5
```

Policy RNG:

```text
2928000
```

The learner samples its own action independently of Q values and hidden state.

The trainer does not alternate, balance, or choose actions.

## Learned policy

Same two linear heads:

```text
Q_WAIT(x)  = w_wait  dot x + b_wait
Q_DRINK(x) = w_drink dot x + b_drink
```

Initialization:

```text
all weights = 0
all biases  = 0
```

## Training schedule

Frozen except optimizer normalization:

```text
epochs         80
L2             0.001
mu             0.5
```

Order seed per epoch:

```text
2926000 + epoch
```

## v15B3 optimizer — normalized linear update

For the chosen action only:

```text
prediction = Q_chosen(x)
error      = prediction - R
denom      = 1 + sum_f x[f]^2
step       = 0.5 / denom

bias_chosen -= step * error

weight_chosen[f] -= step * (
  error*x[f] + 0.001*weight_chosen[f]
)
```

This is the only algorithmic change relative to v15B2.

The denominator is calculated from the exact frozen 256-D vector presented to the
learner for that interaction.

No clipping, adaptive optimizer, momentum, replay prioritization, target network,
counterfactual update, supervised auxiliary loss, or hyperparameter sweep is allowed.

Any NaN or Infinity in features, Q values, rewards, weights, biases, denominator, or
step invalidates the run as an implementation/numerical error rather than a scientific
PASS/FAIL.

## Allowed learner information

- exact frozen 256-D DN vector,
- its own Q values,
- its own sampled action,
- realized normalized reward for the chosen action.

Not included:

- previous POTION motor history.

## Forbidden learner inputs

Never provide:

```text
HP / maxHP / missingHP
damageTaken
impact count / original state
economic class
potion count
effective healing
overheal / wasted healing
heal utilization
future contacts / future damage
terminal HP before reward calculation
unchosen action reward
G_WAIT and G_DRINK together
DeltaG
optimal action / correct action
shouldDrink
survival probability
seed
impact side / impact timestamps
supervised v15A12 logits / weights / labels
```

Hidden state may be inspected only by the trainer to execute the sampled action,
calculate its realized outcome, and score held-out scientific performance.

## EVAL policy

No exploration:

```text
action = argmax(Q_WAIT,Q_DRINK)
tie -> WAIT
```

Optimal action and oracle return are computed only after the action is selected.

## Controls

### DN_SHUFFLED

EVAL only:

```text
DN permutation seed = baseSeed + 900000
```

Learned heads remain frozen.

### NEURAL_OFF

EVAL only:

```text
all 256 standardized DN features = 0
```

Learned heads remain frozen.

Neither control retrains.

## Frozen baselines

```text
ALWAYS_WAIT mean G   = 25
ALWAYS_DRINK mean G  = 25
ORACLE mean G        = 30
```

## Required diagnostics

Artifact must report:

- WAIT/DRINK action counts during TRAIN,
- epoch-wise mean G,
- epoch-wise audit-only action accuracy,
- feature `||x||^2` min/mean/max,
- effective step `0.5/(1+||x||^2)` min/mean/max,
- final WAIT/DRINK bias,
- final WAIT/DRINK weight L2 norm,
- final WAIT/DRINK maximum absolute weight,
- EVAL Q_WAIT and Q_DRINK min/mean/max,
- held-out DRINK rate and mean G by hidden state.

These diagnostics do not change the gate.

## Gate — unchanged

v15B3 PASS requires all:

```text
FULL balanced accuracy      >= 70%
WAIT recall                 >= 60%
DRINK recall                >= 60%
FULL - DN_SHUFFLED BA       >= 20pp
FULL - NEURAL_OFF BA        >= 20pp
FULL mean realized G        >= 27.5
FULL mean regret            <= 2.5
```

If all pass:

```text
V15B3_NORMALIZED_VALUE_LEARNING = PASS
v15C holdout preregistration = AUTHORIZED
browser POTION deployment = BLOCKED
```

If any fail:

```text
V15B3_NORMALIZED_VALUE_LEARNING = FAIL
v15C = BLOCKED
browser POTION deployment = BLOCKED
```

## Interpretation

PASS supports the narrow claim:

> reward-only action-value learning from the frozen MaleCNS DN representation succeeds
> when the online linear update is normalized by input-vector energy.

It does not mean connectome synapses learned or authorize browser deployment.

If v15B3 remains numerically stable but scientifically fails, do not continue tuning
this value-regression family. The next preregistered algorithmic family should directly
learn an action policy from scalar reward rather than regress per-action Q values.

## Forbidden post-hoc changes

Do not change after outcome:

- representation,
- 292xxxx cohorts,
- reward evaluator or normalization,
- 80 epochs,
- L2,
- mu=0.5,
- denominator definition,
- 50:50 exploration,
- policy/order seeds,
- gate thresholds,
- controls,
- samples.

Do not lower gates, sweep mu, add clipping, or substitute the supervised v15A12 probe.

Existing MOVE v7, ATTACK v10F, JUMP v11H2, and v14C remain unchanged.
