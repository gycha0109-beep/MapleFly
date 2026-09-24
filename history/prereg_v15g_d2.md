# prereg_v15g_d2 — long-memory sufficiency matrix

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / OUTCOME**

v15G-D1 closed with:

```text
V15G_D1_OBSERVABLE_STATE_LIMITED

strict oracle-labeled EVAL states
  5,975

strict states in exact observable-conflict groups
  1,278 / 5,975 = 21.39%
```

The current POTION state:

```text
current frozen v15E2 neural margin
+ previous 4 POTION actions
```

loses information required by the sequential survival/economy decision.

D2 does **not** train a deployment policy.

Scientific question:

> How much allowed memory is sufficient to make the sequential POTION decision identifiable, and is
> the missing information primarily older self-action history, older MaleCNS-derived neural evidence,
> or their combination?

---

## 1. frozen biological / ecology stack

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

v15E2 artifact
  10793265453

v15E2 representation
  244464c8b5e9c7f5871f35cb3acc4ac1e2e0c9b61860c1dd3c267de79d4758db

v15E2 model
  18be00b46303f46d62f8f63f26ca1a280b66f50f0004be6f469c637123077c96
```

Connectome synapses and v15E2 weights remain frozen.

Use exact v16B/v15G 48-second continuous ecology and decision-before-same-step-contact ordering.

---

## 2. fresh cohorts

Do not use v16B, v15F, v15G, or v15G-D1 seeds.

TRAIN:

```text
3291000
3301000
3311000
```

EVAL:

```text
3321000
3331000
3341000
```

Each base seed:

```text
4 initial distances x 2 initial sides
= 8 episodes/base
```

Totals:

```text
24 TRAIN tapes
24 EVAL tapes
```

Each complete tape must contain exactly ten POTION opportunities:

```text
240,480,...,2400
```

---

## 3. allowed source signals

Only these may become probe features:

```text
m_t
  frozen v15E2 neural margin
  Q_DRINK - Q_WAIT at decision t

a_t
  agent's own POTION action
  DRINK=1, WAIT=0
```

Forbidden as probe/runtime features:

```text
HP / maxHP / missingHP
damageTaken
contact count
impact count
contact timestamps
target/obstacle geometry
grounded/airborne
kill count
effective/wasted healing
future contacts/damage
oracle Q*
oracle action
seed
decision index
absolute clock time
```

HP/future contacts may be used only by the evaluator to construct oracle labels and survival metrics.

---

## 4. four preregistered memory variants

All unavailable history slots are zero-padded at episode start.

### M0_CURRENT

D1-compatible baseline:

```text
features
  [m_t,
   a_(t-1),a_(t-2),a_(t-3),a_(t-4)]

dimension
  5
```

### M1_ACTION_LONG

Tests whether older self-action memory is sufficient:

```text
features
  [m_t,
   a_(t-1)..a_(t-9)]

dimension
  10
```

### M2_NEURAL_LONG

Tests whether older MaleCNS-derived evidence is sufficient while retaining only four self actions:

```text
features
  [m_t,m_(t-1)..m_(t-9),
   a_(t-1)..a_(t-4)]

dimension
  14
```

### M3_FULL_LONG

Full allowed 48-second episode memory at the ten decision boundaries:

```text
features
  [m_t,m_(t-1)..m_(t-9),
   a_(t-1)..a_(t-9)]

dimension
  19
```

Memory is reset only at episode start, never on target respawn.

No HP/contact/time feature is encoded explicitly or indirectly.

---

## 5. exhaustive reachable-state oracle

For every frozen tape enumerate all:

```text
2^10 = 1024
```

POTION action sequences.

For every live prefix immediately before a decision, evaluator-only exhaustive suffix search computes:

```text
Q*_WAIT
Q*_DRINK
```

using exact final utility:

```text
U = 165*survived - 15*potionUses
```

Strict oracle label:

```text
DRINK if Q*_DRINK > Q*_WAIT
WAIT  if Q*_WAIT  > Q*_DRINK
TIE   otherwise
```

TIE states remain in audit counts but are excluded from probe loss/classification.

Oracle labels/Q* are diagnostic only and can never become deployment weights.

---

## 6. exact observable-alias audit

For each M0..M3, group reachable states by exact feature identity within the frozen tape.

Report:

- observable groups;
- conflict groups;
- strict oracle states;
- strict states inside conflict groups;
- conflict-state fraction.

A conflict group contains the same allowed observable feature vector but both strict WAIT and strict
DRINK oracle labels.

Primary alias target:

```text
conflict-state fraction < 10%
```

This target is diagnostic, not a deployment gate.

---

## 7. supervised diagnostic probes

For every memory variant train exactly two probes on TRAIN reachable states and evaluate only on fresh
EVAL reachable states.

Probe weights are **never deployment eligible**.

### LINEAR

```text
score = w dot x + b
DRINK iff score > 0
tie -> WAIT
```

### MLP16

```text
hidden
  16 tanh units

score
  linear output over hidden units

DRINK iff score > 0
tie -> WAIT
```

No recurrence exists inside either probe. Any memory comes only from the preregistered M0..M3 input
representation.

---

## 8. frozen fitting

Both probe families:

```text
loss
  class-balanced binary cross entropy on strict oracle labels

full-batch
  yes

shuffle
  none

L2
  0.001

parameter clamp
  [-10,+10]

EVAL model selection
  forbidden
```

LINEAR:

```text
epochs
  2000

learning rate
  0.05

initialization
  all zeros
```

MLP16:

```text
epochs
  300

learning rate
  0.03

hidden activation
  tanh

output
  logistic score

initialization RNG
  3388000 + memoryVariantIndex*100

weight initialization
  uniform [-0.05,+0.05]

bias initialization
  0
```

No hyperparameter sweep and no early stopping.

The MLP epoch count is frozen at 300 before implementation to keep the complete fresh MaleCNS tape
generation + eight diagnostic probe fits inside the user-requested 25-minute CI timeout. This is a
compute-budget preregistration amendment made before any D2 outcome exists.

---

## 9. downstream diagnostic replay

Freeze each trained probe and replay deterministic actions on all 24 EVAL tapes.

Report:

- survival rate;
- minimum base-seed survival;
- mean potion uses;
- mean excess uses among survivors versus exact minimum-use survivor oracle;
- wasted healing / DRINK;
- mean U.

Lower-skill tapes are frozen and probe actions do not alter the neural/motor/contact tape.

---

## 10. economy-capable definition

A probe is economy-capable only if both blocks pass.

Classification:

```text
balanced accuracy >= 70%
WAIT recall       >= 60%
DRINK recall      >= 60%
```

Downstream:

```text
survival rate                    >= 75%
minimum base-seed survival       >= 62.5%
mean excess uses among survivors <= 1.5
wasted healing / DRINK           <= 10
```

---

## 11. preregistered localization

Use the following priority after all M0..M3 × LINEAR/MLP16 results are frozen.

### ACTION_MEMORY_SUFFICIENT

If M1 has any economy-capable probe and M0 does not:

```text
V15G_D2_ACTION_MEMORY_SUFFICIENT
```

### NEURAL_MEMORY_SUFFICIENT

If M2 has any economy-capable probe and M1 does not:

```text
V15G_D2_NEURAL_MEMORY_SUFFICIENT
```

### COMBINED_MEMORY_REQUIRED

If neither M1 nor M2 is economy-capable but M3 is:

```text
V15G_D2_COMBINED_MEMORY_REQUIRED
```

### LONG_MEMORY_NOT_SUFFICIENT

If M3 has no economy-capable probe:

```text
V15G_D2_LONG_MEMORY_NOT_SUFFICIENT
```

This includes the case where scalar v15E2 margins discard information before memory can preserve it.

### REDUNDANT_BASELINE

If M0 itself is economy-capable on the fresh cohort:

```text
V15G_D2_FRESH_BASELINE_CAPABLE
```

This outcome blocks architectural conclusions from D2 because the fresh cohort no longer reproduces the
D1 insufficiency strongly enough.

---

## 12. lower-skill validity

Fresh EVAL tapes must satisfy unchanged gates:

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

If these fail:

```text
V15G_D2_IMPLEMENTATION_OR_TAPE_INVALID
```

No memory conclusion may be drawn.

---

## 13. next-phase rules

D2 never authorizes deployment.

If M1 is sufficient:
- next remediation may use longer self-action memory.

If M2 is sufficient:
- next remediation may persist older neural evidence.

If only M3 is sufficient:
- next remediation must preserve both.

If M3 is insufficient:
- do not tune memory length;
- next diagnostic must test richer MaleCNS-derived state before scalar v15E2 margin compression.

Any actual reward-only remediation requires a separate preregistration.

---

## 14. stop rule

After D2 do not change:

- 3291xxx..3341xxx cohorts;
- M0..M3 definitions;
- zero-padding;
- oracle utility;
- probe architectures;
- optimizer settings;
- gates;
- localization priority.

Do not use HP/contact count/time.
Do not deploy supervised probe weights.
Do not reinterpret v15G-D1.
