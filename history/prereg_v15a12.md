# prereg_v15a12 — DRINK vs WAIT counterfactual reward-advantage sufficiency

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / OUTCOME**

v15A11 closed the recursive temporal-localization sequence:

```text
EARLY12_A (1.2 s)  sufficient for coarse burden
EARLY6_A (600 ms)  insufficient
EARLY6_B (600 ms)  insufficient
localization        STOP
```

The next scientific question is no longer "how many impacts can be decoded?" or "which
window contains them?"

It is:

> Does frozen MaleCNS DN temporal history contain enough information to predict which
> action, DRINK or WAIT, has higher trainer-computed counterfactual return?

This is the reward-relevance gate required before any reward-only POTION policy
training is allowed.

v15A12 does **not** train or deploy a runtime POTION policy.

## Biological / sensory contract

Frozen exactly as the v15A4-v15A11 family:

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
  final 5 brain steps = 100 ms
  offered identically in every state

history
  48 x 100 ms = 4.8 s
```

Per-frame DN feature:

```text
clamp((DN_frame_Hz - baseline_DN_Hz) / 50, -1, +1)
```

The taste/decision opportunity is **HP-independent**. It is present for all original
states 0/1/2/3, including full HP.

The old v5 `canDrink() -> potionDrive()` path is not used because it leaks whether HP
is damaged.

## Trainer-only counterfactual decision state

The trainer reconstructs the hidden game-economic state after the synthetic injury
history:

```text
max HP          100
contact damage   10
potion heal      30
original state k in {0,1,2,3}
decision HP      100 - 10*k
```

The original state / HP are used **only** to initialize the trainer's counterfactual
outcome evaluator. They are never probe inputs.

At the decision opportunity, both actions are always legal in the trainer evaluator:

```text
DRINK
WAIT
```

DRINK consumes the opportunity even at full HP. Therefore a full-HP DRINK can be
wasteful; there is no hidden HP-dependent action mask.

## Frozen counterfactual return

Both actions are evaluated from the **same hidden decision state**.

### DRINK branch

1. consume one potion opportunity,
2. heal `min(30, missingHP)`,
3. apply the frozen future stress horizon,
4. compute terminal return.

### WAIT branch

1. consume no potion,
2. apply the identical frozen future stress horizon,
3. compute terminal return.

### Future stress horizon

To make the target an outcome return rather than a direct impact-count label, both
branches receive the same deterministic future stress:

```text
6 future contacts
10 HP damage each
total future damage = 60 HP
```

No further potion actions occur inside the horizon.

Six contacts are frozen because all k=0..3 WAIT/DRINK branches remain alive, avoiding a
death-cliff target and isolating potion economy.

### Return

```text
G = terminalHP - 15 * potionUsed
```

where:

```text
potionUsed = 1 for DRINK
potionUsed = 0 for WAIT
```

The 15-point potion opportunity cost is exactly 50% of the 30-HP potion value and
matches the already frozen v15A5 economic split.

Counterfactual advantage:

```text
DeltaG = G_DRINK - G_WAIT
```

The evaluator must audit to the following exact table before any probe is fitted:

| original state | decision HP | G_WAIT | G_DRINK | DeltaG | optimal action |
| ---: | ---: | ---: | ---: | ---: | --- |
| 0 | 100 | 40 | 25 | -15 | WAIT |
| 1 | 90  | 30 | 25 | -5  | WAIT |
| 2 | 80  | 20 | 25 | +5  | DRINK |
| 3 | 70  | 10 | 25 | +15 | DRINK |

The probe target is generated **only** from the sign of counterfactual DeltaG:

```text
DeltaG > 0  -> DRINK (1)
DeltaG < 0  -> WAIT  (0)
```

No zero-advantage state exists under the frozen evaluator.

Although the resulting action split is economically aligned with 0/1 versus 2/3, the
authoritative target source is the counterfactual return evaluator, not a hand-written
impact-count classifier.

## Fresh cohort

TRAIN:

```text
2890000
2890100
2890200
2890300
```

EVAL:

```text
2895000
2895100
2895200
```

Each base seed:

```text
6 replicates x original states 0/1/2/3
```

Therefore:

```text
TRAIN 96 rows
EVAL  72 rows
```

Brain seed:

```text
baseSeed + replicate * 7 + 1
```

Impact schedule RNG:

```text
brainSeed + 500000
```

The paired/nested injury schedule remains unchanged.

## Primary representation — FULL48

v15A12 returns to the full endpoint-aligned history because it is the repeatedly
replicated coarse-signal representation and is the conservative runtime candidate.

Candidate slots:

```text
48 frames x 1316 DN = 63,168
```

Feature fitting is label-blind:

1. use TRAIN rows only,
2. pool all original 0/1/2/3 states,
3. compute population variance for each temporal DN slot,
4. variance descending,
5. tie-break lower raw slot,
6. select exactly top 256,
7. compute TRAIN-only population mean/std,
8. `scale=max(std,1e-6)`,
9. standardized clamp [-5,+5].

Counterfactual returns, DeltaG, optimal action, HP, and EVAL rows are forbidden from
feature selection and normalization.

## Probe

One binary logistic probe predicts the counterfactual optimal action:

```text
WAIT  = 0
DRINK = 1

epochs         240
learning rate  0.03
L2             0.001
threshold      0.5
weight init    0
bias init      0
order seed     2896000
```

No hyperparameter search.

## Primary gate

The fresh EVAL action probe must satisfy all:

```text
balanced accuracy >= 70%
WAIT recall        >= 60%
DRINK recall       >= 60%
FULL-DN_SHUFFLED   >= 20pp
```

If all pass:

```text
REWARD_ADVANTAGE_SUFFICIENCY = PASS
V15B_PREREG_AUTHORIZED
```

This authorizes only a new preregistration for reward-only DRINK/WAIT learning. It does
not authorize deployment.

If any fail:

```text
REWARD_ADVANTAGE_SUFFICIENCY = FAIL
v15B = BLOCKED
```

## DN_SHUFFLED causal control

For each EVAL base seed:

```text
seed = baseSeed + 900000
```

Apply one fixed permutation of all 1316 DN identities inside every temporal frame.

The same permutation is used for all original states/replicates belonging to that base
seed.

## LABEL_SHUFFLED diagnostic

TRAIN action targets are shuffled with:

```text
seed = 2897000
```

This is diagnostic only and not part of the primary gate.

## Reward audit outputs

For transparency, the artifact must record for each original state:

- decision HP,
- G_WAIT,
- G_DRINK,
- DeltaG,
- optimal action,
- TRAIN/EVAL row counts.

The artifact must also report EVAL mean predicted P(DRINK) by original state. This is a
diagnostic calibration view only and cannot alter the gate.

## Forbidden probe/runtime inputs

The action probe may receive only standardized frozen DN temporal features.

Forbidden:

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
terminal HP
G_WAIT
G_DRINK
DeltaG
optimal action / correct action
survival probability
shouldDrink
seed
impact side
impact schedule/timestamps
```

The trainer may use hidden state and outcomes to compute counterfactual returns and
targets. The learned probe may not.

## Hidden-oracle prohibition for future v15B

Even if v15A12 passes, a future v15B must not reuse the old v5 action opportunity:

```text
canDrink() -> hp < maxHp
potionDrive() -> only when canDrink()
```

That would reveal damaged/not-damaged state before the learned policy acts.

Future v15B decision/taste opportunities must remain HP-independent.

## Forbidden post-hoc changes

After outcome, do not:

- change the 289xxxx cohort,
- change future contact count,
- change future damage,
- change the 15-point potion cost,
- change the return formula,
- relabel DeltaG signs,
- remove full-HP WAIT/DRINK cases,
- change FULL48 to a localized window as rescue,
- change top-256,
- change normalization,
- change classifier hyperparameters,
- lower 70/60/+20pp gates,
- change DN-shuffle seed/rule,
- remove failed samples,
- increase sensory drive/pulse,
- deploy the supervised probe as POTION policy.

Any altered hypothesis requires a new preregistration.

## Relationship to v15B

v15A12 is the final representation-sufficiency gate before reward-only POTION learning.

- PASS -> v15B **preregistration may be designed**
- FAIL -> v15B remains **BLOCKED**

Existing MOVE v7, ATTACK v10F, JUMP v11H2, and v14C remain unchanged.
