# prereg_v15m — persistent neural-action belief POTION remediation

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / TRAINING / OUTCOME**

Evidence prerequisites:

```text
v15K-D2
  V15K_D2_PERSISTENT_IMPACT_SIGNAL_PRESENT

v15L
  V15L_CAUSAL_NEURAL_TRACE_REMEDIATION_FAIL

v15L-D1
  V15L_D1_DECISION_RELEVANT_ALIASING_PRESENT
```

Frozen v15L-D1 receipt:

```text
d5b6023f0e5d068893519025e052a2a2d77fdbb8
```

Design:

```text
history/design_v15m_persistent_neural_action_belief.md
commit ae87c92521735a2a1f4a7f716eca988bcc92523b
```

Scientific question:

> Can a compact recurrent state, updated only from current MaleCNS-derived causal neural evidence and the
> agent's own previous POTION action, remove the four-action aliasing defect while preserving
> episode-specific biological dependence and meeting the frozen survival/economy gates?

---

## 1. frozen biological stack

```text
MaleCNS source
  alextitonis/fly.ai

MaleCNS commit
  95a3dbcb05241b0a5c07028ca8ad945b23fbbe6e

MOVE
  v7 deployed

ATTACK
  v10F deployed

JUMP
  v11H2 deployed

interruption
  v14C deployed

v15E2 neural core artifact
  10793265453

v15E2 artifact digest
  sha256:a119bc0e425d08c5ce2381e6054c6ee358bf9402d5c442a57c00c916fd3b9405

v15E2 representation sha256
  244464c8b5e9c7f5871f35cb3acc4ac1e2e0c9b61860c1dd3c267de79d4758db

v15E2 model sha256
  18be00b46303f46d62f8f63f26ca1a280b66f50f0004be6f469c637123077c96
```

MaleCNS synapses remain frozen.

D2 supervised diagnostic weights are forbidden.

---

## 2. fresh cohorts

TRAIN base seeds:

```text
3871000
3881000
3891000
```

EVAL base seeds:

```text
3901000
3911000
3921000
```

Each base seed:

```text
4 initial distances x 2 sides
= 8 episodes
```

Totals:

```text
24 TRAIN tapes
24 EVAL tapes
```

Lower-skill interruption RNG:

```text
3937000
```

Do not use v15L TRAIN/EVAL or v15L-D1 HOLDOUT tapes for the primary v15M result.

---

## 3. frozen causal neural representation

Every 100 ms:

```text
frame[d] =
  clamp(
    (DN_rate[d] - episode_baseline[d]) / 50,
    -1,
    +1
  )
```

All 1316 descending neurons are retained before compression.

Causal exponential trace:

```text
half-life
  2.0 s

lambda
  0.9659363289248456

trace_t[d] =
  lambda * trace_(t-1)[d]
  + (1-lambda) * frame_t[d]
```

The trace is updated continuously from neural frames only.

Never update it from:

- contact timestamps;
- contact flags;
- damage;
- HP;
- potion need;
- oracle labels;
- decision number.

At each 4.8-second POTION opportunity, snapshot the current trace.

---

## 4. frozen TRAIN-only preprocessing

Fit on the 240 TRAIN decision snapshots only.

Per DN:

```text
zscore =
  (trace - TRAIN_mean) / max(TRAIN_std, 1e-6)
```

Then deterministic label-free PCA:

```text
components
  32

power iterations / component
  80

PCA RNG seed base
  3948000
```

EVAL is projection-only.

No contact/damage/HP/action label enters preprocessing or PCA.

---

## 5. persistent neural-action belief policy

Trainable parameters:

```text
rawDecay
32 neural weights
actionFeedback
bias

total
  35
```

Transform:

```text
decay = sigmoid(rawDecay)
```

Episode start:

```text
belief = 0
previousAction = 0
```

At decision t:

```text
belief_t =
  decay * belief_(t-1)
  + sum_j(neuralWeight_j * PCA32_t[j])
  + actionFeedback * previousAction

score_t =
  belief_t + bias

DRINK iff score_t > 0
tie -> WAIT
```

Then:

```text
previousAction = chosenAction
```

No explicit lag vector is exposed.

No constant is added inside the recurrent update.

---

## 6. forbidden runtime inputs

Never provide:

```text
HP / maxHP / missingHP
damage amount
damage count
contact flag
contact count
contact timestamps
time since hit
potion count
cumulative potion count
decision index
absolute time
future damage/contact
effective healing
wasted healing
oracle minimum uses
oracle action
oracle injury state
seed
target/obstacle geometry
```

The only non-neural external value entering recurrence is the agent's own immediately previous POTION
action.

Trainer/evaluator may use HP for environment mechanics, reward, death, and post-hoc metrics.

---

## 7. reward-only optimizer

Deterministic Cross-Entropy Method.

```text
generations
  100

population
  256

elite count
  32

distribution smoothing
  0.20 old + 0.80 elite estimate

minimum std
  0.05

parameter clamp
  [-8,+8]

sampling RNG
  3958000
```

Initial distribution:

```text
all 35 parameter means
  0

all 35 parameter std
  1
```

No EVAL-based model selection.

Final candidate:

```text
final smoothed distribution mean after generation 100
```

---

## 8. TRAIN fitness

Keep the v15L reward unchanged:

```text
fitness =
  10000 * survivalRate
  + meanTerminalHP
  - 15 * meanPotionUses
```

This is an outcome reward only.

No oracle action, oracle minimum-use sequence, HP input, contact count, or future-damage value is provided
to the runtime policy.

---

## 9. evaluator-only oracle economy

After training only, enumerate all 1024 ten-decision POTION sequences for each EVAL tape.

```text
oracleMinUses
  minimum potion uses among sequences that survive
```

For FULL survivors:

```text
excessUses =
  policyUses - oracleMinUses
```

Oracle values are metrics only.

---

## 10. primary EVAL gates

All must pass:

```text
survival rate                    >= 75%
minimum base-seed survival       >= 62.5%
mean excess uses among survivors <= 1.5
wasted healing / DRINK           <= 10
```

Lower-skill ecology gates remain:

```text
episodes with >=3 kills          >= 75%
obstacle clear                   >= 85%
target kill                      >= 70%
LEFT target kill                 >= 65%
RIGHT target kill                >= 65%
attack precision                 >= 45%
airborne attack                  <= 22%
post-clear jump encounter        <= 25%
pre-clear attack encounter       <= 30%
```

---

## 11. frozen causal controls

Freeze the final candidate. Never retrain controls.

### MEMORY_OFF

At each decision:

```text
previous belief supplied to the update = 0
```

Current neural vector and previous own action remain.

Required contribution:

```text
survival drop >=12.5 pp
OR
mean excess uses increase >=1.0
```

### ACTION_FEEDBACK_OFF

Force:

```text
actionFeedback contribution = 0
```

Required contribution:

```text
survival drop >=12.5 pp
OR
mean excess uses increase >=1.0
```

### NEURAL_OFF

Force:

```text
neural contribution = 0
```

Recurrence and own previous action remain.

Required contribution:

```text
survival drop >=12.5 pp
OR
mean excess uses increase >=1.0
```

### EPISODE_SHIFT_1

Use the next EVAL episode's complete ten-vector neural sequence.

Game/contact tape and own-action recurrence remain the target episode's.

Required episode-specific alignment contribution:

```text
survival drop >=12.5 pp
OR
mean excess uses increase >=0.5
```

### DECISION_MEAN_NEURAL

At every decision position, replace episode-specific neural PCA32 with the TRAIN-only mean PCA32 for that
position.

Required episode-specific alignment contribution:

```text
survival drop >=12.5 pp
OR
mean excess uses increase >=0.5
```

Both alignment controls are mandatory.

---

## 12. outcome

If ecology is valid, all four primary EVAL gates pass, and all five mandatory causal/alignment controls
contribute:

```text
V15M_PERSISTENT_NEURAL_ACTION_BELIEF_PASS
```

A PASS authorizes only:

```text
evidence freeze
then a separate online/deployment validation preregistration
```

It does not deploy automatically.

If ecology is valid but any scientific gate fails:

```text
V15M_PERSISTENT_NEURAL_ACTION_BELIEF_FAIL
```

If provenance/runtime/ecology is invalid:

```text
V15M_IMPLEMENTATION_OR_ECOLOGY_INVALID
```

---

## 13. stop rule

After the first authoritative outcome do not change inside v15M:

- recurrent architecture;
- action-state dimensionality;
- neural trace half-life;
- PCA width;
- PCA iterations/seed;
- TRAIN/EVAL seeds;
- interruption RNG;
- reward weights;
- CEM settings;
- contribution thresholds;
- primary gates.

Do not restore previous-nine-action lag memory.
Do not add cumulative potion count.
Do not add HP/contact/damage/time inputs.
Do not deploy D2 supervised weights.
Do not modify deployed v15D.

```text
POTION v15D
  deployed

v15M
  experimental

v16C
  blocked
```
