# result_v15c — frozen reward-policy independent holdout and causal controls

## Verdict

**V15C_FROZEN_POLICY_HOLDOUT = PASS**

The exact frozen v15B3 reward-only policy generalized to a completely new 293xxxx
holdout cohort and passed every preregistered causal-control gate without learning or
calibration.

```text
FULL balanced accuracy       93.8%
WAIT recall                  97.9%
DRINK recall                 89.6%
mean G                       29.688
mean regret                   0.313

DN_SHUFFLED BA               51.0%
FULL-DN margin              +42.7pp

NEURAL_OFF BA                50.0%
FULL-OFF margin             +43.8pp

INJURY_SENSORY_OFF BA        50.0%
FULL-INJURY_OFF margin      +43.8pp

v15D preregistration         AUTHORIZED
browser POTION               BLOCKED pending v15D
```

## Provenance

```text
preregistration
  history/prereg_v15c.md
  1a8f92f3e139074fb97b01b6ac9b421b6ae48908

implementation
  bff29410657dd0b8d47fd6c2f1c4255a54012699
  experiment(v15c): add frozen potion holdout

workflow head
  47518e6adfe95e111d0615cd8c9083e1d89f3bd1
  experiment(v15c): wire frozen potion holdout CI

workflow
  Validate MapleFly v15C Frozen Potion
  run 35905965237
  conclusion success

artifact
  10771129156
  maplefly-v15c-frozen-potion-35905965237
  sha256:f60e484dc08203f092d084bf096e29f885ced58624b7717ff815787e8907c343
```

## Frozen objects verified

```text
v15A12 representation
  33fc31f636e1cde215841dd33b0a93b24d4571cdabd32e9a1edc8fa2e696c847

v15B3 reward-only Q model
  47088bcb15ed2cd96f64d67a20169934bd7a866dcd56bacffea70b1f42537a59
```

v15C performed no learning, threshold fitting, normalization refit, or policy
calibration.

## Independent holdout

```text
base seeds
  2935000
  2935100
  2935200
  2935300

6 replicates x 4 hidden states
96 total contexts
```

FULL confusion:

```text
              predicted WAIT  predicted DRINK
true WAIT          47               1
true DRINK          5              43
```

Hidden-state diagnostic:

```text
state 0  DRINK rate   0.0%   mean G 40.000
state 1  DRINK rate   4.2%   mean G 29.792
state 2  DRINK rate  79.2%   mean G 23.958
state 3  DRINK rate 100.0%   mean G 25.000
```

## Causal controls

### DN_SHUFFLED

```text
BA        51.0%
WAIT     100.0%
DRINK      2.1%
mean G    25.156
regret     4.844
```

Destroying DN identity collapsed the frozen policy close to chance/trivial return.

### NEURAL_OFF

```text
BA        50.0%
WAIT       0.0%
DRINK    100.0%
mean G    25.000
regret     5.000
```

Removing the representation entirely collapsed performance to the trivial baseline.

### INJURY_SENSORY_OFF

The exact same brain seeds, event schedules, hidden reward states, ground input, and
taste offer were retained while only corrected LgLG injury drive was set to zero.

```text
BA        50.0%
WAIT     100.0%
DRINK      0.0%
mean G    25.000
regret     5.000
```

All 96 control contexts became WAIT under the frozen policy.

This directly supports dependence on the injury sensory pathway rather than seed,
background, or the identical taste offer alone.

## Interpretation

The result supports:

> The reward-only v15B3 readout over frozen MaleCNS DN temporal history generalizes to
> an independent holdout cohort, and its DRINK/WAIT advantage depends on intact injury
> sensory input and DN population identity.

Learning remains entirely in the external readout/policy. MaleCNS connectome synaptic
weights remain frozen.

## Consequence

v15D browser integration/closure is authorized.

v15D must remove the old HP-gated POTION decision path and integrate the exact frozen
representation/model without exposing HP, missing HP, impact count, or answer-state
shortcuts to the runtime policy.

Existing MOVE v7, ATTACK v10F, JUMP v11H2, and v14C remain unchanged.
