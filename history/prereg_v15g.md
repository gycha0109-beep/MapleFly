# prereg_v15g — sequential reward-only POTION economy with self-action memory

## Status

**PREREGISTERED BEFORE TRAINING / OUTCOME**

The chain is frozen:

```text
v15E2
  phase-invariant pooled-DN representation PASS

v15F
  known v16B ecology:
  survival 100%
  but 229/240 DRINK
  original value gate FAIL

v15F-D1
  exhaustive oracle:
  original value + survival joint gate mathematically infeasible
```

v15G does **not** rewrite v15F or v16B.

It defines a new prospective sequential objective before training.

Scientific question:

> Can the frozen v15E2 injury-sensitive neural score, augmented only with the agent's own previous
> POTION motor history, learn by episodic reward to survive a 48-second continuous ecology while
> using substantially fewer potions than the near-always-DRINK v15F candidate?

---

## 1. frozen biological stack

```text
MaleCNS
  alextitonis/fly.ai
  95a3dbcb05241b0a5c07028ca8ad945b23fbbe6e

MOVE
  v7 deployed

ATTACK
  v10F deployed

JUMP
  v11H2 deployed

interruption
  v14C deployed
```

Connectome synapses remain frozen.

No lower-skill learning occurs.

---

## 2. frozen v15E2 neural core

Load exact:

```text
artifact
  10793265453

digest
  sha256:a119bc0e425d08c5ce2381e6054c6ee358bf9402d5c442a57c00c916fd3b9405

representation
  244464c8b5e9c7f5871f35cb3acc4ac1e2e0c9b61860c1dd3c267de79d4758db

model
  18be00b46303f46d62f8f63f26ca1a280b66f50f0004be6f469c637123077c96
```

At each 4.8-second POTION decision compute the exact frozen v15E2:

```text
baseMargin =
  Q_DRINK_v15E2 - Q_WAIT_v15E2
```

The 1,316-D representation, standardization, and both neural Q heads are frozen.

v15G does not update any neural-core weight.

---

## 3. only new policy state: own POTION motor history

Runtime may additionally use only the agent's own previous four POTION actions:

```text
h1 = previous decision DRINK? 1 : 0
h2 = two decisions ago
h3 = three decisions ago
h4 = four decisions ago
```

At episode start:

```text
h1=h2=h3=h4=0
```

This is self-action memory, not hidden game state.

No time-since-damage, HP, contact count, or future information is encoded.

---

## 4. sequential policy

Train only five scalar parameters:

```text
theta0
theta1
theta2
theta3
theta4
```

Score:

```text
score =
  baseMargin
  + theta0
  + theta1*h1
  + theta2*h2
  + theta3*h3
  + theta4*h4
```

Deployment-style deterministic action:

```text
DRINK iff score > 0
tie -> WAIT
```

The coefficient on `baseMargin` is fixed at exactly 1.

Thus v15G can learn only how its own recent POTION actions modulate the frozen neural injury valuation.

---

## 5. trainer-only full-horizon neural tapes

POTION action has no action lock and does not alter MOVE/JUMP/ATTACK/v14C sensory or motor state.
Taste opportunity remains action-independent.

Therefore trainer may collect a complete 48-second neural/contact tape while preventing HP=0 from
terminating the **trainer collection harness only**.

This does not give immortality to the learned policy.

Each tape records:

- ten frozen v15E2 base margins;
- exact contact step/side events;
- lower-skill encounter metrics.

It does not record HP as a policy feature.

During reward simulation, normal HP/death mechanics are restored exactly.

---

## 6. fresh cohorts

No v16B/v15F seed is used for training or primary evaluation.

TRAIN:

```text
3231000
3241000
3251000
```

EVAL:

```text
3261000
3271000
3281000
```

Each base seed uses the frozen v16B block:

```text
4 initial distances x 2 initial sides
= 8 episodes/base
```

Totals:

```text
TRAIN 24 tapes
EVAL  24 tapes
```

Ecology RNG remains:

```text
brainSeed + 700000
```

All geometry/respawn/lower-skill semantics remain v16B.

---

## 7. prospective sequential utility

The impossible old terminal-value gate is not reused.

Define a survival-first episodic reward mechanically from the maximum possible potion spend.

There are ten opportunities and cost is 15 each:

```text
maximum potion cost
  150
```

Set survival bonus to one additional potion cost above that maximum:

```text
SURVIVAL_BONUS
  15 * (10 + 1)
  = 165
```

Episode reward:

```text
U =
  165 * survived
  - 15 * potionUses
```

Properties:

- any survivor, even with all ten potions, has U=15;
- a zero-potion death has U=0;
- therefore survival is lexicographically preferred to economy;
- among survivors, fewer potions always has higher U.

No HP magnitude or contact count enters the reward.

HP is used only by environment physics to determine survival/death.

---

## 8. reward-only learner

Stochastic training policy:

```text
p(DRINK) = sigmoid(score)
p(WAIT)  = 1-p
```

Initialize:

```text
theta0..theta4 = 0
```

Thus epoch 0 is anchored to the frozen v15E2 neural margin.

Algorithm:

```text
batch REINFORCE
epochs       400
learningRate 0.05
L2           0.001
parameter clamp [-5,+5]
```

Each epoch:

1. run all 24 TRAIN tapes with stochastic actions;
2. calculate one episodic U per tape;
3. baseline = batch mean U;
4. scale = max(batch population std U, 1);
5. advantage = (U-baseline)/scale;
6. for every action taken before death:
   `grad += advantage * (actionDrink - pDrink) * [1,h1,h2,h3,h4]`;
7. average gradient over episodes;
8. apply L2 to theta;
9. update and clamp.

Policy RNG:

```text
3298000
```

Tape order is fixed; no hyperparameter sweep.

No oracle action sequence is used for training.

---

## 9. forbidden runtime inputs

Never provide:

```text
HP / maxHP / missingHP
damageTaken
contact count
impact count
contact timestamps
target/obstacle geometry
grounded/airborne
kill count
effective healing
wasted healing
potion economics
future contacts/damage
oracle minimum uses
correct action
seed
decision index
absolute clock time
```

Allowed:

```text
frozen v15E2 neural baseMargin
own previous four POTION actions
```

---

## 10. evaluator-only oracle efficiency

For every EVAL tape, exhaustively enumerate all 1024 POTION action sequences with exact HP mechanics.

Define:

```text
oracleMinUses
  minimum potion uses among sequences that survive all 2400 steps
```

This is evaluator-only.

For each FULL survivor:

```text
excessUses =
  policyUses - oracleMinUses
```

Primary economy gate:

```text
mean excessUses among FULL survivors <= 1.5
```

This does not require the learned policy to match a labeled oracle action sequence.

---

## 11. controls

Evaluate the frozen trained theta on the same EVAL tapes.

### HISTORY_OFF

```text
h1=h2=h3=h4=0 at every decision
```

Neural baseMargin remains intact.

### NEURAL_OFF

```text
baseMargin=0 at every decision
```

Self-action history remains intact.

No retraining for controls.

Utility:

```text
mean U
```

Required causal margins:

```text
FULL mean U - HISTORY_OFF mean U >= 10

FULL mean U - NEURAL_OFF mean U >= 20
```

This requires both the neural injury signal and learned self-action memory to contribute materially.

---

## 12. primary v15G EVAL gates

Fresh EVAL must satisfy all:

```text
survival rate                         >= 75%
minimum base-seed survival            >= 62.5%

mean excess uses among survivors      <= 1.5
wasted healing / DRINK                <= 10

FULL - HISTORY_OFF mean U             >= 10
FULL - NEURAL_OFF mean U              >= 20
```

Lower-skill tape validity must also satisfy the unchanged v16B behavior gates:

```text
episodes with >=3 kills               >= 75%
encounter obstacle clear              >= 85%
encounter target kill                 >= 70%
LEFT encounter target kill            >= 65%
RIGHT encounter target kill           >= 65%
attack hit precision                  >= 45%
airborne attack action fraction       <= 22%
post-clear jump encounter             <= 25%
pre-clear attack encounter            <= 30%
```

If the lower-skill tape validity fails, outcome is implementation/environment invalid rather than
a POTION scientific failure.

---

## 13. outcome

All gates PASS:

```text
V15G_SEQUENTIAL_POTION_ECONOMY_PASS
```

Then authorize:

```text
fresh interactive 48-second ecology validation
```

Deployment remains BLOCKED.

Any scientific gate FAIL:

```text
V15G_SEQUENTIAL_POTION_ECONOMY_FAIL
```

Invalid tape/provenance/support:

```text
V15G_IMPLEMENTATION_INVALID
```

---

## 14. stop rule

After outcome do not change:

- v15E2 neural core;
- four-action memory;
- five trainable theta parameters;
- fresh 3231/3241/3251 TRAIN seeds;
- fresh 3261/3271/3281 EVAL seeds;
- 48-second tape ecology;
- U definition / survival bonus 165;
- REINFORCE hyperparameters;
- oracle excess-use definition;
- causal controls;
- gates.

Do not train on v16B/v15F known seeds.
Do not add HP.
Do not tune thresholds after seeing EVAL.

v15D remains deployed unchanged.
