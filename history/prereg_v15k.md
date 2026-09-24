# prereg_v15k — reward-only terminal-health shaping on long neural history

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / TRAINING / OUTCOME**

Evidence chain:

```text
v15G-D2
  M2 = current + previous 9 frozen neural margins
       + previous 4 own POTION actions
  supervised diagnostic economy-capable

v15I
  long self-action memory
  FAIL
  schedule-dominated in v15I-D1

v15J
  long neural history + short action memory
  FULL survival 62.5%
  mean excess uses 1.333
  episode-shift and decision-mean anti-schedule gates FAIL
  decision-mean neural survival 95.8%
```

v15J shows that the representation can produce economical behavior but the sparse training objective
still converges to a cohort-level temporal profile rather than robust episode-specific adaptation.

Scientific question:

> With the same allowed runtime representation, can a reward-only learner use terminal health as an
> outcome signal during training to learn an episode-adaptive POTION policy without receiving HP,
> contact count, time, oracle labels, or other answer state at runtime?

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

v15J closure
  d5367358c3332a06d8f5da837991657f02ac8e61
```

Connectome synapses and v15E2 weights remain frozen.

No v15G-D2 supervised parameter, v15I parameter, or v15J parameter may initialize v15K.

---

## 2. allowed runtime state

Exactly the v15J M2-style representation:

```text
m_t,m_(t-1),...,m_(t-9)
  frozen v15E2 neural margins

a_(t-1),...,a_(t-4)
  own previous POTION actions
  DRINK=1
  WAIT=0
```

Unavailable history is zero-filled only at episode start.

History persists through target respawns.

---

## 3. forbidden runtime inputs

Never provide:

```text
HP / maxHP / missingHP
terminalHP
damageTaken
contact / impact count
contact timestamps
potion count
target/obstacle geometry
grounded/airborne
kill count
effective/wasted healing
future contacts/damage
oracle minimum uses
oracle action / Q*
correct action
seed
decision index
absolute clock time
```

Terminal HP is permitted only as a scalar **trainer outcome after an episode has completed**.
It is never available to the policy during an episode.

---

## 4. policy architecture

Exactly fifteen trainable scalars:

```text
bias
neuralWeight0..9
actionWeight1..4
```

At decision t:

```text
score_t =
  bias
  + sum(k=0..9) neuralWeightK * m_(t-k)
  + sum(k=1..4) actionWeightK * a_(t-k)

DRINK iff score_t > 0
tie -> WAIT
```

No recurrent hidden state, HP estimator, contact counter, potion counter, or clock.

---

## 5. fresh cohorts

No prior POTION remediation seed is reused.

TRAIN:

```text
3531000
3541000
3551000
```

EVAL:

```text
3561000
3571000
3581000
```

Each base seed:

```text
4 initial distances x 2 sides
= 8 episodes/base
```

Totals:

```text
24 TRAIN
24 EVAL
```

Exact 48-second continuous ecology.

Freeze lower-skill interruption RNG:

```text
3597000
```

Consume the same stream in TRAIN then EVAL collection order.

Every complete tape must contain exactly ten POTION opportunities.

---

## 6. optimizer

Deterministic Cross-Entropy Method.

Initial mean:

```text
bias
  0

neuralWeight0
  1

neuralWeight1..9
  0

actionWeight1..4
  0
```

Initial std:

```text
all fifteen
  1
```

Frozen optimizer:

```text
generations
  100

population
  256

elite count
  32

distribution update
  0.20 old + 0.80 elite estimate

minimum std
  0.05

parameter clamp
  [-8,+8]

sampling RNG
  3598000
```

No sweep, early stopping, EVAL selection, or initialization from prior learned policy.

---

## 7. reward-only TRAIN fitness

For each policy candidate, evaluate the fixed 24 TRAIN tapes.

Per episode observe only after the episode is complete:

```text
survived
terminalHP
number of POTION uses
```

Batch fitness:

```text
fitness =
  10000 * survivalRate
  + meanTerminalHP
  - 15 * meanPotionUses
```

On 24 tapes, one additional survivor contributes about +416.67, larger than the maximum possible
batch-level terminal-HP / potion-cost tradeoff. Survival therefore remains primary.

Among equal survivor counts, the reward prefers higher terminal health while charging the frozen
15-point potion cost.

No intermediate HP, contact count, future damage, oracle label, or oracle efficiency enters training.

---

## 8. evaluator-only oracle efficiency

After training is frozen, enumerate all:

```text
2^10 = 1024
```

POTION action sequences per EVAL tape.

Compute minimum potion uses among sequences that survive the complete 48 seconds.

Oracle information is evaluation-only.

---

## 9. primary fresh EVAL gates

All must pass:

```text
survival rate                    >= 75%
minimum base-seed survival       >= 62.5%
mean excess uses among survivors <= 1.5
wasted healing / DRINK           <= 10
```

Unchanged lower-skill tape validity:

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

## 10. causal persistence controls

Freeze the final candidate.

### LONG_NEURAL_HISTORY_OFF

Keep current neural margin and previous four own actions.
Set previous nine neural margins to zero.

Contribution if relative to FULL:

```text
survival drop >= 12.5pp
OR
mean excess uses increase >= 1.0
OR
zero survivors while FULL survives
```

Required.

### ALL_NEURAL_OFF

Set all neural margins to zero.

Same contribution criterion.

Required.

ACTION_MEMORY_OFF is descriptive only.

---

## 11. anti-schedule alignment controls

Freeze the final candidate.

### EPISODE_SHIFT_1

Keep each EVAL contact tape unchanged.
Cyclically replace its complete ten-margin neural sequence with the next EVAL episode's sequence.

### DECISION_MEAN_NEURAL

At each of the ten source positions, replace every episode's neural margin with the EVAL cohort mean
for that position.

For each alignment control, contribution requires relative to FULL:

```text
survival drop >= 12.5pp
OR
mean excess uses increase >= 0.5
OR
zero survivors while FULL survives
```

Both are required.

These are evaluator controls only. Decision position is never a runtime input.

---

## 12. outcome

PASS requires:

- valid fresh tapes;
- all four primary EVAL gates;
- LONG_NEURAL_HISTORY_OFF contributes;
- ALL_NEURAL_OFF contributes;
- EPISODE_SHIFT_1 contributes;
- DECISION_MEAN_NEURAL contributes.

PASS:

```text
V15K_REWARD_ONLY_TERMINAL_HEALTH_PASS
```

Then authorize a separately preregistered fresh interactive 48-second validation.

Scientific failure:

```text
V15K_REWARD_ONLY_TERMINAL_HEALTH_FAIL
```

Contract/provenance failure:

```text
V15K_IMPLEMENTATION_INVALID
```

Deployment and v16C remain blocked until a fresh interactive validation passes.

---

## 13. CI execution policy

No explicit short GitHub Actions job timeout is preregistered.

Long MaleCNS execution is allowed to finish normally unless infrastructure shows an actual abnormal
failure.

---

## 14. stop rule

After outcome do not change:

- representation;
- fifteen-parameter architecture;
- fresh cohorts;
- optimizer;
- terminal-health reward;
- gates;
- alignment controls.

Do not add HP/contact/time to runtime state.
Do not relax a gate after EVAL.
Do not import prior learned weights.
Do not deploy directly from this training screen.
