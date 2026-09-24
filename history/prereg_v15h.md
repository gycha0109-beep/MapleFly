# prereg_v15h — persistent neural-action belief POTION policy

## Status

**PREREGISTERED BEFORE TRAINING / OUTCOME**

v15G-D1 localized the sequential economy failure to insufficient runtime state:

```text
exact observable-conflict strict states
  21.39%

supervised exact v15G class
  41.7% survival

supervised free-margin linear class
  41.7% survival
```

The current observation forgets injury/action information older than:

```text
neural evidence
  4.8 s

self-action history
  4 POTION decisions = 19.2 s
```

v15H tests a minimal persistent state that can carry MaleCNS-derived evidence across the full episode
without adding HP, contact count, time, or decision index.

Scientific question:

> Can a compact recurrent belief state, updated only from the frozen v15E2 neural injury margin and
> the agent's own previous POTION action, learn by outcome reward to preserve survival while avoiding
> near-always DRINK behavior?

---

## 1. frozen biological stack

Unchanged:

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

v15E2 neural core artifact
  10793265453

v15E2 representation
  244464c8b5e9c7f5871f35cb3acc4ac1e2e0c9b61860c1dd3c267de79d4758db

v15E2 model
  18be00b46303f46d62f8f63f26ca1a280b66f50f0004be6f469c637123077c96
```

Connectome synapses and v15E2 neural weights remain frozen.

---

## 2. allowed runtime signals

At each 4.8-second POTION opportunity:

```text
m_t
  frozen v15E2 baseMargin
  = Q_DRINK - Q_WAIT

a_(t-1)
  previous POTION action
  DRINK=1, WAIT=0
```

Persistent internal state:

```text
b_(t-1)
  previous v15H belief scalar
```

At episode start:

```text
b_0 = 0
a_0 = 0
```

No other runtime signal is allowed.

---

## 3. recurrent policy

Four trainable scalars:

```text
rawDecay
marginGain
actionFeedback
bias
```

Transform:

```text
decay = sigmoid(rawDecay)
```

At decision t:

```text
b_t =
  decay * b_(t-1)
  + marginGain * m_t
  + actionFeedback * a_(t-1)

score_t = b_t + bias

DRINK iff score_t > 0
tie -> WAIT
```

Then the chosen action becomes `a_t` for the next update.

This is not an HP estimator with a supervised target. It is a learned recurrent policy state.

---

## 4. forbidden runtime inputs

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
future contacts/damage
oracle minimum uses
oracle action/Q*
correct action
seed
decision index
absolute clock time
```

Trainer/evaluator may use HP only for environment death/survival mechanics and metrics.

---

## 5. fresh cohorts

Do not train or evaluate on v16B, v15F, v15G, or v15G-D1 seeds.

TRAIN:

```text
3311000
3321000
3331000
```

EVAL:

```text
3341000
3351000
3361000
```

Each base seed:

```text
4 initial distances x 2 sides
= 8 episodes/base
```

Totals:

```text
24 TRAIN tapes
24 EVAL tapes
```

Use exact v16B/v15G 48-second continuous ecology and full trainer neural/contact tape collection.

---

## 6. reward-only optimizer

Use deterministic Cross-Entropy Method over the four recurrent-policy parameters.

No oracle action labels or oracle minimum-use values are used in training.

Initial sampling distribution:

```text
mean
  rawDecay      0
  marginGain    1
  actionFeedback -1
  bias          0

std
  1,1,1,1
```

Frozen optimizer:

```text
generations
  60

population
  128

elite count
  16

distribution smoothing
  0.20 old + 0.80 elite estimate

minimum std
  0.05

parameter clamp
  [-6,+6]

sampling RNG
  3378000
```

No sweep and no EVAL-based selection.

The final candidate is the final smoothed distribution mean after generation 60.

---

## 7. TRAIN fitness

The optimizer sees only episode outcomes and its own potion use.

For a 24-tape TRAIN batch:

```text
fitness =
  10000 * survivalRate
  - meanPotionUses
```

Because one additional survivor changes survival rate by `1/24` and therefore fitness by about 416.67,
while mean potion use ranges only 0..10, survival count is strictly prioritized over economy on this
fixed batch.

Among candidates with the same survivor count, fewer potions is always better.

No HP magnitude, contact count, oracle sequence, or future damage enters fitness.

---

## 8. evaluator-only oracle efficiency

After training only, exhaustively enumerate 1024 POTION action sequences for each EVAL tape.

```text
oracleMinUses
  minimum potion uses among sequences that survive the full 48 s
```

Oracle values are metrics only.

For FULL survivors:

```text
excessUses = policyUses - oracleMinUses
```

---

## 9. primary EVAL gates

All must pass:

```text
survival rate                    >= 75%
minimum base-seed survival       >= 62.5%
mean excess uses among survivors <= 1.5
wasted healing / DRINK           <= 10
```

Lower-skill tape validity must pass the unchanged v16B gates:

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

## 10. causal controls

Freeze the final four parameters. No retraining.

### MEMORY_OFF

At every decision force:

```text
b_(t-1) = 0
```

Current neural margin and previous action remain.

### ACTION_FEEDBACK_OFF

Force:

```text
actionFeedback contribution = 0
```

Persistent neural belief remains.

### NEURAL_OFF

Force:

```text
m_t = 0
```

Recurrence and own previous action remain.

For each control compute the same survival/economy metrics.

A component is considered to contribute if, relative to FULL, the control causes at least one:

```text
survival drop >= 12.5pp
OR
mean excess uses increase >= 1.0
```

Required causal gates:

```text
MEMORY_OFF contributes
NEURAL_OFF contributes
```

ACTION_FEEDBACK_OFF is reported diagnostically but is not a primary gate in this first recurrent screen.

---

## 11. outcome

If lower-skill validity, all primary gates, MEMORY_OFF contribution, and NEURAL_OFF contribution pass:

```text
V15H_PERSISTENT_NEURAL_BELIEF_PASS
```

Then authorize a fresh interactive online 48-second validation.

Deployment remains BLOCKED.

If scientific gates fail:

```text
V15H_PERSISTENT_NEURAL_BELIEF_FAIL
```

If provenance/tape/runtime contract is invalid:

```text
V15H_IMPLEMENTATION_INVALID
```

---

## 12. stop rule

After outcome do not change:

- four-parameter recurrent architecture;
- fresh seed cohorts;
- CEM population/generations/elites/smoothing/std/clamps;
- TRAIN fitness;
- primary gates;
- causal controls.

Do not use D1 oracle labels for training.
Do not add HP/contact count/time.
Do not deploy directly from this screen.
