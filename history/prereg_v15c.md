# prereg_v15c — frozen reward-policy independent holdout and causal controls

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / OUTCOME**

v15B3 passed reward-only learning on fresh TRAIN/EVAL data:

```text
FULL BA        94.4%
WAIT recall    94.4%
DRINK recall   94.4%
mean G         29.722
regret          0.278
DN margin      +44.4pp
OFF margin     +44.4pp
```

v15C does not learn.

It asks:

> Does the exact frozen v15B3 reward-only policy retain action/reward performance on a
> completely new cohort, and does that performance causally depend on the injury-driven
> MaleCNS DN signal?

A PASS may authorize v15D browser integration/closure. It does not itself deploy POTION.

## Frozen representation

Exact v15A12 representation:

```text
artifact
  10768761312
  sha256:8aa759b04643d618e69aaa647d7251eb237816ee3b84bcc97a0f451d20cbba78

representation
  FULL48_REWARD_ADVANTAGE
  sha256:33fc31f636e1cde215841dd33b0a93b24d4571cdabd32e9a1edc8fa2e696c847
```

No feature selection or normalization refit is allowed.

## Frozen learned policy

Exact v15B3 learned model:

```text
artifact
  10770299335
  sha256:3f715ef7f4f62e854db02c4e0f05b8662d5dab2a46d1ea0675320bffbe3bc838

workflow head
  6b82a15f2009779c945c19aa227a5d79a51a47b6

model
  sha256:47088bcb15ed2cd96f64d67a20169934bd7a866dcd56bacffea70b1f42537a59
```

The model is loaded from the frozen artifact before holdout evaluation.

No v15C gradient update, reward update, calibration, threshold fit, or action exploration
is allowed.

## Biological / sensory contract

Frozen from v15B3:

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
  identical for every hidden state

history
  48 x 100 ms = 4.8 s
```

## Independent holdout cohort

No 293xxxx seed has been used in v15A12/v15B/v15B2/v15B3.

HOLDOUT:

```text
2935000
2935100
2935200
2935300
```

Each:

```text
6 replicates x hidden states 0/1/2/3
```

Total:

```text
96 holdout contexts
```

Brain seed:

```text
baseSeed + replicate*7 + 1
```

Impact schedule RNG:

```text
brainSeed + 500000
```

## Frozen policy action

For every holdout context:

```text
action = argmax(Q_WAIT,Q_DRINK)
tie -> WAIT
```

No exploration.

The reward evaluator computes correct action/oracle return only after the frozen policy
has selected its action.

## Reward evaluator

Unchanged:

```text
G = terminalHP - 15*potionUsed
R = (G-25)/15
```

Scientific scoring reports action accuracy and unnormalized G/regret.

## Required causal controls

All controls use the same frozen representation normalization and frozen v15B3 Q heads.

### DN_SHUFFLED

On the normal holdout histories, permute DN identity inside every temporal frame:

```text
seed = baseSeed + 900000
```

No retraining.

### NEURAL_OFF

Set all 256 standardized representation features to zero.

No retraining.

### INJURY_SENSORY_OFF

Re-run the exact same holdout brain seeds and event schedules, but set only the
corrected LgLG injury drive to zero:

```text
LgLG impact drive = 0
SNta ground        unchanged
taste offer        unchanged
brain seed         unchanged
event schedule     unchanged
hidden reward state unchanged
```

The hidden class remains only for trainer-side reward/outcome scoring. The policy does
not receive it.

This control asks whether performance depends on injury sensory input entering the
frozen MaleCNS, rather than only seed/background/taste structure.

## Required reporting

For FULL and every control:

- balanced action accuracy,
- WAIT recall,
- DRINK recall,
- confusion matrix,
- mean G,
- mean oracle G,
- mean regret,
- Q_WAIT and Q_DRINK range/mean,
- DRINK rate and mean G by hidden state.

Also report:

- FULL - DN_SHUFFLED BA margin,
- FULL - NEURAL_OFF BA margin,
- FULL - INJURY_SENSORY_OFF BA margin.

## v15C gate

All required:

```text
FULL balanced accuracy                 >= 70%
WAIT recall                            >= 60%
DRINK recall                           >= 60%
FULL - DN_SHUFFLED BA                  >= 20pp
FULL - NEURAL_OFF BA                   >= 20pp
FULL - INJURY_SENSORY_OFF BA           >= 20pp
FULL mean realized G                   >= 27.5
FULL mean regret                       <= 2.5
```

No control is required to equal exactly 50%; only the preregistered margins are gates.

If all pass:

```text
V15C_FROZEN_POLICY_HOLDOUT = PASS
v15D browser integration preregistration = AUTHORIZED
browser POTION deployment = BLOCKED pending v15D
```

If any fail:

```text
V15C_FROZEN_POLICY_HOLDOUT = FAIL
v15D = BLOCKED
browser POTION deployment = BLOCKED
```

## Forbidden v15C actions

Do not:

- update Q weights/biases,
- reuse 292xxxx data,
- refit normalization,
- change representation slots,
- change action threshold/tie behavior,
- inspect hidden state before action selection,
- tune on holdout,
- change LgLG drive except in the predefined INJURY_SENSORY_OFF control,
- alter reward economics,
- remove failed samples,
- lower gates.

The old HP-gated v5 potion path remains forbidden.

## Interpretation limits

PASS supports:

> the frozen reward-only v15B3 readout generalizes to a new cohort and its advantage
> depends on the injury-driven frozen MaleCNS DN representation.

PASS does not mean the biological connectome synapses learned. Learning remains in the
frozen external readout/policy.

PASS authorizes only a separately preregistered v15D integration/closure step.

Existing MOVE v7, ATTACK v10F, JUMP v11H2, and v14C remain unchanged.
