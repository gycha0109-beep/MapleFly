# prereg_v15i — reward-only long self-action memory POTION policy

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / TRAINING / OUTCOME**

v15G-D2 closed with:

```text
V15G_D2_ACTION_MEMORY_SUFFICIENT

M0
  current v15E2 neural margin
  + previous 4 POTION actions
  exact conflict-state fraction 25.73%
  economy-capable NO

M1
  current v15E2 neural margin
  + previous 9 POTION actions
  exact conflict-state fraction 0.00%
  LINEAR diagnostic probe economy-capable YES
```

The D2 supervised probe is diagnostic only and is forbidden from deployment or v15I initialization.

Scientific question:

> Can a policy trained only from episode survival reward and its own potion-use cost learn to exploit the
> D2-authorized long self-action memory, while still requiring the frozen MaleCNS-derived v15E2 neural
> signal?

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
```

Connectome synapses and v15E2 neural weights remain frozen.

No D2 supervised model parameters may be loaded, copied, or used for initialization.

---

## 2. allowed runtime state

At each 4.8-second POTION opportunity:

```text
m_t
  frozen v15E2 neural margin
  Q_DRINK - Q_WAIT

a_(t-1)..a_(t-9)
  agent's own previous POTION actions
  DRINK=1
  WAIT=0
```

At episode start all nine action-memory slots are zero.

Memory is shifted only after the policy chooses its own action.

Memory is never reset on target respawn.

---

## 3. forbidden runtime inputs

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
oracle action / Q*
correct action
seed
decision index
absolute clock time
```

Trainer/evaluator may use HP only for environment death/survival mechanics and post-training metrics.

---

## 4. policy architecture

Train exactly eleven scalars:

```text
neuralGain
bias
actionWeight1
...
actionWeight9
```

At decision t:

```text
score_t =
  neuralGain * m_t
  + bias
  + sum(k=1..9) actionWeightK * a_(t-k)

DRINK iff score_t > 0
tie -> WAIT
```

This is the minimal reward-only policy class corresponding to D2 M1.

No recurrent hidden state, HP estimator, clock, contact counter, or supervised target is added.

---

## 5. fresh cohorts

Do not train or evaluate on v16B, v15F, v15G, v15G-D1, v15G-D2, or invalid v15H seeds.

TRAIN:

```text
3391000
3401000
3411000
```

EVAL:

```text
3421000
3431000
3441000
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

Use the exact 48-second continuous ecology and exact v15E2 neural tape collection.

Freeze the deterministic lower-skill interruption RNG for tape generation:

```text
3457000
```

The same RNG stream is consumed in TRAIN then EVAL collection order.

Each complete tape must contain exactly ten POTION opportunities.

---

## 6. reward-only optimizer

Use deterministic Cross-Entropy Method.

The optimizer receives only:

```text
episode survived
number of POTION uses
```

It never receives oracle action labels, oracle minimum-use values, HP magnitude, contact counts, or
future damage.

Initial mean:

```text
neuralGain
  1

bias
  0

actionWeight1..9
  all 0
```

Initial standard deviation:

```text
all eleven parameters
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
  3458000
```

No sweep, no early stopping, and no EVAL-based selection.

The final candidate is the final smoothed mean after generation 100.

---

## 7. TRAIN fitness

For the fixed 24-tape TRAIN batch:

```text
fitness =
  10000 * survivalRate
  - meanPotionUses
```

One additional survivor changes the first term by about 416.67, which dominates the complete
0..10 mean-use range.

Therefore optimization is lexicographically equivalent on this batch to:

1. maximize survivor count;
2. among equal survivor counts, minimize potion use.

No oracle efficiency value enters training.

---

## 8. evaluator-only oracle efficiency

After training is complete, exhaustively enumerate all:

```text
2^10 = 1024
```

POTION action sequences for each EVAL tape.

Compute:

```text
oracleMinUses
  minimum potion uses among sequences that survive the full 48 s
```

For FULL survivors:

```text
excessUses =
  policyUses - oracleMinUses
```

Oracle values are metrics only.

---

## 9. primary EVAL gates

All must pass:

```text
survival rate                    >= 75%
minimum base-seed survival       >= 62.5%
mean excess uses among survivors <= 1.5
wasted healing / DRINK           <= 10
```

Lower-skill fresh-tape validity must pass unchanged:

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

Freeze the final eleven parameters. Never retrain controls.

### ACTION_MEMORY_OFF

Force:

```text
a_(t-1)..a_(t-9) = 0
```

Current v15E2 neural margin remains intact.

### NEURAL_OFF

Force:

```text
m_t = 0
```

The policy retains its own complete nine-action history.

For each control compute the same survival/economy metrics.

A component contributes if, relative to FULL, at least one occurs:

```text
survival drop >= 12.5 percentage points
OR
mean excess uses among survivors increases >= 1.0
OR
the control has zero survivors while FULL has survivors
```

Required causal gates:

```text
ACTION_MEMORY_OFF contributes
NEURAL_OFF contributes
```

This prevents a PASS from being explained by an effectively memoryless policy or an effectively
neural-free fixed drinking schedule.

---

## 11. outcome

If tape validity, all primary gates, and both causal gates pass:

```text
V15I_REWARD_ONLY_LONG_ACTION_MEMORY_PASS
```

Then authorize a fresh **interactive online** 48-second validation of this frozen candidate.

Deployment remains blocked.

If scientific gates fail:

```text
V15I_REWARD_ONLY_LONG_ACTION_MEMORY_FAIL
```

If provenance, tape, runtime input, or optimizer contract is invalid:

```text
V15I_IMPLEMENTATION_INVALID
```

---

## 12. stop rule

After outcome do not change:

- eleven-parameter architecture;
- fresh seed cohorts;
- CEM settings;
- TRAIN fitness;
- primary gates;
- causal controls.

Do not initialize from D2 supervised weights.
Do not add HP/contact count/time.
Do not tune a threshold after EVAL.
Do not deploy directly from this screen.
