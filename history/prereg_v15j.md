# prereg_v15j — reward-only long neural history with short action memory

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / TRAINING / OUTCOME**

Evidence chain:

```text
v15G-D2
  M1 long action history
    supervised economy-capable

  M2 long neural history + short action history
    supervised economy-capable

v15I
  reward-only M1-style long action history
  scientific FAIL on economy

v15I-D1
  V15I_D1_SCHEDULE_DOMINATED_POLICY
  FIRST_8 mismatch 3.75%
  episode-shifted neural sequence did not hurt
  decision-mean neural sequence did not hurt
```

v15J therefore shifts persistence away from long lag-specific self-action positions and toward the
frozen MaleCNS-derived neural history.

Scientific question:

> Can reward-only learning use long frozen neural history plus only the pre-existing four-action memory
> to achieve survival/economy while requiring episode-specific neural/contact alignment?

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

v15G-D2 closure
  f48b4710f14a26dd2e22592bfca23d99a8d125b5

v15I-D1 closure
  48618357be215771252bd1dc5daee8641e32a06a
```

Connectome synapses and v15E2 weights remain frozen.

No supervised D2 model parameter and no v15I parameter may initialize v15J.

---

## 2. allowed runtime state

At decision t:

```text
m_t,m_(t-1),...,m_(t-9)
  frozen v15E2 neural margins
  Q_DRINK - Q_WAIT

a_(t-1),...,a_(t-4)
  own previous POTION actions
  DRINK=1
  WAIT=0
```

At episode start all unavailable history slots are zero.

Neural and action history are reset only at episode start, never on target respawn.

---

## 3. forbidden runtime inputs

Never provide:

```text
HP / maxHP / missingHP
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

Trainer/evaluator may use HP only for environment survival mechanics and post-training metrics.

---

## 4. policy architecture

Train exactly fifteen scalars:

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

No hidden clock, potion count, HP estimator, or recurrent latent state is added.

---

## 5. fresh cohorts

Do not use any earlier POTION remediation cohort.

TRAIN:

```text
3461000
3471000
3481000
```

EVAL:

```text
3491000
3501000
3511000
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

Use exact 48-second continuous ecology.

Freeze lower-skill interruption RNG:

```text
3527000
```

Consume the same stream in TRAIN then EVAL collection order.

Each complete tape must contain exactly ten POTION opportunities.

---

## 6. reward-only optimizer

Deterministic Cross-Entropy Method.

Training receives only:

```text
episode survived
number of POTION uses
```

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
  3528000
```

No sweep, early stopping, or EVAL selection.

Final candidate = final smoothed mean after generation 100.

---

## 7. TRAIN fitness

```text
fitness =
  10000 * survivalRate
  - meanPotionUses
```

On 24 tapes this prioritizes survivor count before potion economy.

No oracle label, HP magnitude, contact count, future damage, or D2 supervised target enters training.

---

## 8. evaluator-only oracle efficiency

After training, enumerate all 1024 POTION sequences per EVAL tape.

```text
oracleMinUses
  minimum uses among full-48s survivor sequences
```

For FULL survivors:

```text
excessUses =
  policyUses - oracleMinUses
```

Oracle is metric-only.

---

## 9. primary EVAL gates

All must pass:

```text
survival rate                    >= 75%
minimum base-seed survival       >= 62.5%
mean excess uses among survivors <= 1.5
wasted healing / DRINK           <= 10
```

Unchanged lower-skill validity gates:

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

## 10. persistence controls

Freeze final parameters.

### LONG_NEURAL_HISTORY_OFF

Keep:

```text
current m_t
previous 4 own actions
```

Force:

```text
m_(t-1)..m_(t-9) = 0
```

Required contribution:

```text
survival drop >= 12.5pp
OR
mean excess uses increase >= 1.0
OR
zero survivors while FULL survives
```

This must pass to claim long neural history is doing useful work.

### ALL_NEURAL_OFF

Force all ten neural margins to zero.

Same contribution criterion.

This must pass.

ACTION_MEMORY_OFF is reported diagnostically but is not a primary causal gate.

---

## 11. anti-schedule neural-alignment controls

These controls are evaluated only after the final candidate is frozen.

### EPISODE_SHIFT_1

Keep each EVAL contact tape unchanged.

Replace its complete ten-margin neural sequence with the next EVAL artifact row, cyclically.

All action-history updates remain the candidate's own actions.

### DECISION_MEAN_NEURAL

At each of the ten neural-history source positions, use the cohort mean margin for that decision
position, giving every EVAL episode the same ten-margin sequence.

Decision position exists only in this evaluator control.

For each control, episode-specific neural alignment contributes only if relative to FULL:

```text
survival drop >= 12.5pp
OR
mean excess uses increase >= 0.5
OR
zero survivors while FULL survives
```

Required anti-schedule gates:

```text
EPISODE_SHIFT_1 contributes
DECISION_MEAN_NEURAL contributes
```

A candidate that survives mainly by learning another fixed cadence/profile must therefore FAIL even if
its ordinary FULL metrics pass.

---

## 12. outcome

PASS requires:

- valid lower-skill tapes;
- all four primary EVAL gates;
- LONG_NEURAL_HISTORY_OFF contribution;
- ALL_NEURAL_OFF contribution;
- EPISODE_SHIFT_1 contribution;
- DECISION_MEAN_NEURAL contribution.

If all pass:

```text
V15J_REWARD_ONLY_LONG_NEURAL_HISTORY_PASS
```

Then authorize a separately preregistered fresh interactive 48-second validation.

Deployment remains blocked.

Scientific failure:

```text
V15J_REWARD_ONLY_LONG_NEURAL_HISTORY_FAIL
```

Contract/provenance failure:

```text
V15J_IMPLEMENTATION_INVALID
```

---

## 13. stop rule

After outcome do not change:

- M2-style representation;
- 15-parameter linear architecture;
- fresh cohorts;
- optimizer;
- reward;
- gates;
- neural-alignment controls.

Do not relax the v15I economy gate.
Do not import D2 supervised weights.
Do not import v15I weights.
Do not deploy directly from this screen.
