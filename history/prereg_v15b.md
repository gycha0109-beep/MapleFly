# prereg_v15b — reward-only DRINK/WAIT action-value learning

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / OUTCOME**

v15A12 passed the final representation-sufficiency prerequisite:

```text
counterfactual DRINK-vs-WAIT action BA  93.1%
WAIT recall                            94.4%
DRINK recall                           91.7%
DN_SHUFFLED                            50.0%
margin                                 +43.1pp
v15B preregistration                   AUTHORIZED
```

v15B now asks the question that v15A12 deliberately did not:

> Can Fly #001 learn DRINK versus WAIT from its own realized reward experience, using
> only frozen MaleCNS DN temporal features, without receiving HP, impact count,
> counterfactual DeltaG, or the correct action?

v15B is a reward-only contextual action-value learning experiment.

A v15B PASS does **not** deploy POTION to the browser. It only authorizes v15C
independent holdout/causal validation.

## Frozen biological / sensory contract

Unchanged:

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
  offered identically for every hidden state

history
  48 x 100 ms = 4.8 s
```

The old HP-gated v5 `canDrink()/potionDrive()` path is forbidden.

## Frozen v15A12 representation

v15B must use the **exact** v15A12 representation object. It may not reselect features
or refit normalization.

Authoritative source:

```text
v15A12 workflow run
  35898698946

artifact
  10768761312
  sha256:8aa759b04643d618e69aaa647d7251eb237816ee3b84bcc97a0f451d20cbba78

workflow head
  353bbdc91bbe125434c1263d8c8d1be308e1844d

representation
  FULL48_REWARD_ADVANTAGE
  sha256:33fc31f636e1cde215841dd33b0a93b24d4571cdabd32e9a1edc8fa2e696c847
```

The runner must verify the representation SHA-256 before any v15B training row is used.

Input dimensionality:

```text
256 standardized temporal DN features
```

No supervised v15A12 classifier weights are reused.

## Reward environment

The action-outcome evaluator is frozen exactly from v15A12.

Hidden decision state:

```text
max HP          100
contact damage   10
potion heal      30
decision HP      100 - 10*k
k                hidden original injury state 0/1/2/3
```

Both actions are always available:

```text
WAIT
DRINK
```

DRINK is legal even at full HP and consumes the potion opportunity.

Both branches would receive the same six-contact future stress horizon, but during
training the learner is shown **only the realized return for the action it actually
chose**.

Return:

```text
G = terminalHP - 15 * potionUsed
```

For numerical stability only, the learner receives the fixed state-independent
normalization:

```text
R = (G - 25) / 15
```

This preserves action ordering and maps all possible realized rewards into [-1,+1].

The learner is never given the unchosen action return.

## Training cohort

Fresh TRAIN contexts:

```text
2900000
2900100
2900200
2900300
```

Each base seed:

```text
6 replicates x hidden states 0/1/2/3
```

Total unique TRAIN contexts:

```text
96
```

Brain seed:

```text
baseSeed + replicate * 7 + 1
```

Impact schedule RNG:

```text
brainSeed + 500000
```

## Evaluation cohort

Fresh EVAL contexts not used for learning:

```text
2905000
2905100
2905200
```

Total:

```text
72
```

EVAL hidden state/counterfactual information may be used only after action selection to
score scientific performance.

## Learned policy

v15B uses two learned linear action-value heads:

```text
Q_WAIT(x)  = w_wait  dot x + b_wait
Q_DRINK(x) = w_drink dot x + b_drink
```

where `x` is the frozen 256-dimensional DN feature vector.

Initialization:

```text
all weights = 0
all biases  = 0
```

No supervised initialization.

## Policy-owned exploration

During TRAIN only:

```text
epsilon = 0.20
```

For every interaction:

1. compute both Q values from DN features,
2. with probability 0.20, the **policy's own RNG** chooses WAIT or DRINK uniformly,
3. otherwise choose argmax(Q_WAIT, Q_DRINK),
4. exact ties are resolved by the policy RNG,
5. execute that action,
6. trainer returns only realized normalized reward R for that chosen action,
7. update only the chosen action-value head.

Policy RNG:

```text
2908000
```

The trainer does not select actions.

## Reward-only update

Training epochs:

```text
80
```

Each epoch visits all 96 unique TRAIN contexts once in a deterministic shuffled order.

Order seed per epoch:

```text
2906000 + epoch
```

Chosen-head squared-error SGD:

```text
error = Q_chosen(x) - R

bias_chosen -= 0.01 * error

weight_chosen[f] -= 0.01 * (
  error * x[f] + 0.001 * weight_chosen[f]
)
```

Frozen hyperparameters:

```text
epochs         80
learning rate  0.01
L2             0.001
epsilon        0.20
```

No replay prioritization, target labels, counterfactual update, imitation loss, or
hyperparameter search.

## What the learner is allowed to observe

Policy/training input:

- exact frozen v15A12 256-D DN feature vector,
- its own Q values,
- its own sampled action,
- realized scalar reward for the chosen action.

Not included in v15B:

- previous POTION motor history.

That optional input is deliberately omitted so the first reward-only test has a single
decision and the smallest possible policy state.

## Forbidden learner inputs

Never provide:

```text
HP
maxHP
missingHP
damageTaken
impact count / original state
economic class
potion count
effective healing
wasted healing / overheal
heal utilization
future contacts
future damage
terminal HP before reward calculation
G_WAIT and G_DRINK together
unchosen action reward
DeltaG
optimal action / correct action
shouldDrink
survival probability
seed
impact side
impact schedule/timestamps
supervised v15A12 logits/weights/labels
```

The trainer may inspect hidden state only to execute the chosen action, calculate its
realized outcome/reward, and score the held-out experiment.

## Evaluation policy

EVAL uses no exploration.

```text
action = argmax(Q_WAIT, Q_DRINK)
tie -> WAIT
```

The frozen evaluator computes the optimal action only **after** the learned action is
selected, for scientific scoring.

Report:

- balanced action accuracy,
- WAIT recall,
- DRINK recall,
- confusion matrix,
- mean realized G,
- mean oracle G,
- mean regret,
- P/choice DRINK by hidden state,
- training action counts and realized reward trajectory.

## Causal controls

### DN_SHUFFLED

At EVAL only, apply the established fixed DN-identity permutation inside every temporal
frame:

```text
seed = baseSeed + 900000
```

The learned Q heads are unchanged.

### NEURAL_OFF

Set all 256 standardized DN features to zero at EVAL.

The learned Q heads are unchanged.

Neither control retrains the policy.

## Frozen baselines

For the balanced hidden-state distribution:

```text
ALWAYS_WAIT mean G   = 25
ALWAYS_DRINK mean G  = 25
ORACLE mean G        = 30
```

These are evaluator baselines only and never training inputs.

## v15B gate

v15B PASS requires all:

```text
FULL balanced accuracy      >= 70%
WAIT recall                 >= 60%
DRINK recall                >= 60%
FULL - DN_SHUFFLED BA       >= 20pp
FULL - NEURAL_OFF BA        >= 20pp
FULL mean realized G        >= 27.5
FULL mean regret            <= 2.5
```

The return/regret conditions are equivalent views of achieving at least half of the
available +5 mean-return improvement over the two trivial constant-action baselines.

If all pass:

```text
V15B_REWARD_ONLY_LEARNING = PASS
v15C holdout preregistration = AUTHORIZED
browser POTION deployment = BLOCKED
```

If any fail:

```text
V15B_REWARD_ONLY_LEARNING = FAIL
v15C = BLOCKED
browser POTION deployment = BLOCKED
```

## Scientific interpretation limits

A PASS means:

> a reward-only learned readout over frozen MaleCNS DN history acquired a DRINK/WAIT
> policy that generalizes to the preregistered fresh EVAL cohort.

It does not mean:

- connectome synapses learned,
- the whole fly brain learned MapleStory,
- the policy is browser-deployment ready,
- HP was inferred perfectly,
- the reward model is the only valid potion economy.

## v15C / deployment

Even after v15B PASS:

1. freeze the learned v15B Q heads,
2. preregister v15C on entirely new seeds,
3. evaluate FULL, DN_SHUFFLED, NEURAL_OFF and action/reward stability without further
   learning,
4. only a v15C PASS may authorize v15D browser integration/closure.

## Forbidden post-hoc changes

Do not change after outcome:

- v15A12 representation,
- 290xxxx cohorts,
- 80 epochs,
- learning rate,
- L2,
- epsilon,
- policy RNG,
- epoch-order seeds,
- reward normalization,
- reward evaluator,
- gate thresholds,
- tie behavior,
- control definitions,
- samples.

Do not substitute the supervised v15A12 classifier if reward-only learning fails.

Existing MOVE v7, ATTACK v10F, JUMP v11H2, and v14C remain unchanged.
