# prereg_v15f — frozen pooled-DN remediation benchmark in the failed v16B ecology

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / OUTCOME**

v15E2 passed on fresh independently generated phase-randomized injury histories:

```text
representation
  1,316 all-DN mean-pooled features over 4.8 s

FULL BA
  87.5%

WAIT / DRINK recall
  90.0% / 85.0%

phase DRINK recall
  EARLY 93.8%
  MID   79.3%
  LATE  86.7%

DN_SHUFFLED margin
  +40.0pp

NEURAL_OFF margin
  +37.5pp
```

v15F now asks the remediation question that matters before any fresh-seed deployment test:

> If the frozen v15E2 representation/readout replaces only the POTION decision module inside the
> exact already-failed v16B continuous ecology, does the five-skill system recover under the original
> v16B scientific gates?

This is a **known-failure remediation benchmark**, not a deployment validation.

No v16B seed, geometry, horizon, lower-level skill, sensory gain, action cadence, or gate is changed.

---

## 1. frozen provenance

### MaleCNS

```text
repository
  alextitonis/fly.ai

commit
  95a3dbcb05241b0a5c07028ca8ad945b23fbbe6e
```

Connectome synaptic weights remain frozen.

### v15E2 candidate

```text
run
  35961707942

artifact
  10793265453

artifact digest
  sha256:a119bc0e425d08c5ce2381e6054c6ee358bf9402d5c442a57c00c916fd3b9405

representation sha256
  244464c8b5e9c7f5871f35cb3acc4ac1e2e0c9b61860c1dd3c267de79d4758db

model sha256
  18be00b46303f46d62f8f63f26ca1a280b66f50f0004be6f469c637123077c96
```

The workflow must download this exact artifact and verify provenance before running.

### deployed baseline retained

```text
v15D
  remains DEPLOYED

representation
  33fc31f636e1cde215841dd33b0a93b24d4571cdabd32e9a1edc8fa2e696c847

policy
  47088bcb15ed2cd96f64d67a20169934bd7a866dcd56bacffea70b1f42537a59
```

v15F must not edit the deployed browser POTION module.

---

## 2. exact v16B ecology

Reuse the authoritative v16B protocol without scientific changes.

```text
base seeds
  3101000
  3111000
  3121000

initial distances
  155,195,235,275

initial sides
  L,R

episodes
  24

brain step
  20 ms

live horizon
  2400 steps = 48 s

settle
  26 steps

baseline
  26 steps, once per episode

respawn gap
  35 steps = 0.7 s

target respawn
  sequential one-target ecology

contact damage
  10 HP

LgLG
  0.7 for 6 brain steps after real contact

potion
  heal 30
  cost 15

POTION decision cadence
  every 240 steps = 4.8 s
  exactly 10 decisions for a full survivor

target HP
  30

attack damage
  10

attack range
  76
```

Persistent across encounter respawns:

- MaleCNS state;
- MOVE/ATTACK/JUMP/v14C histories;
- POTION candidate history;
- baseline;
- player position/HP/cooldowns/facing.

No synthetic injury schedule is added.

---

## 3. frozen lower skill stack

Unchanged from v16B:

```text
MOVE
  v7 deployed

ATTACK
  v10F deployed

JUMP
  v11H2 deployed

cross-skill interruption
  v14C deployed
```

No learning occurs in v15F.

The v14C frozen deployed attack/jump interruption policies are used deterministically exactly as in
the authoritative v16B evaluation.

---

## 4. v15E2 runtime representation

The v15E2 artifact freezes:

```text
DN features
  all 1316 descending neurons

frame
  5 brain steps = 100 ms

history
  48 frames = 4.8 s
```

For each 100 ms frame:

```text
z[f,d] = clamp(
  (rate[f,d] - episodeBaselineRate[d]) / 50,
  -1,
  +1
)
```

At the 48th frame:

```text
p[d] = mean_f z[f,d]

x[d] = clamp(
  (p[d] - TRAIN_mean[d]) / TRAIN_scale[d],
  -5,
  +5
)
```

The means/scales are loaded from the exact v15E2 artifact.

No baseline or standardization refit occurs in v15F.

---

## 5. frozen candidate action rule

Load the exact v15E2 two-head model:

```text
Q_WAIT(x)
Q_DRINK(x)

DRINK iff Q_DRINK > Q_WAIT
tie -> WAIT
```

No exploration.

No HP threshold.

No candidate retraining.

After each decision the 48-frame candidate accumulation resets, while MaleCNS state remains persistent.

---

## 6. taste semantics

Preserve the same sensory offer semantics used by v15D/v15E2:

```text
LB3 + claw_tpGRN bilateral
drive 0.8
only during the final 100 ms frame before each POTION decision
HP-independent
action-independent
```

Taste is an offer/context signal, not a reward or correct-action label.

---

## 7. forbidden POTION inputs

The candidate policy must not receive:

```text
HP / maxHP / missingHP
damageTaken
contact count
damage-event list
impact count
target/obstacle geometry
grounded/airborne flag
kill count
potion count
effective healing
wasted healing
future damage
POTION_OFF death time
correct/optimal action
seed
```

These may be used only by evaluator physics/reward/metrics where already allowed by v16B.

---

## 8. exact original v16B stress counterfactual

Retain the original paired POTION_OFF evaluation rule:

- use the exact FULL contact-damage timeline;
- remove healing;
- OFF death occurs at the 10th recorded contact;
- kills after OFF death are excluded.

This remains evaluator-only and is not a policy input.

Stress sufficiency remains:

```text
POTION_OFF death rate >= 25%
```

If not met:

```text
V15F_ECOLOGY_STRESS_INSUFFICIENT
```

---

## 9. exact original v16B scientific gates

No gate is relaxed.

```text
survival rate                         >= 75%
minimum base-seed survival            >= 62.5%
episodes with >=3 kills               >= 75%

encounter obstacle clear              >= 85%
encounter target kill                 >= 70%
LEFT encounter target kill            >= 65%
RIGHT encounter target kill           >= 65%

attack hit precision                  >= 45%
airborne attack action fraction       <= 22%
post-clear jump encounter             <= 25%
pre-clear attack encounter            <= 30%

full-survivor POTION decisions        exactly 10

FULL - POTION_OFF survival            >= +15pp
FULL - POTION_OFF mean kills          >= +0.5
FULL - POTION_OFF cost-adjusted value >= +5

wasted healing / DRINK                <= 10
```

The original v16B result remains the historical comparator:

```text
survival
  0%

mean kills
  3.4167

POTION uses
  4 total / 84 decisions

POTION_OFF death
  100%
```

No gate is defined relative to the historical numbers beyond the original v16B gates above.

---

## 10. required diagnostics

Record the same v16B episode/encounter/time-bin metrics plus:

- v15E2 representation/model hashes;
- candidate Q_WAIT/Q_DRINK per decision;
- candidate action;
- HP before/after for evaluator audit only;
- contacts in preceding 4.8 s for descriptive audit only;
- mean candidate DRINK rate by decision index 1..10;
- mean Q margin by decision index;
- candidate potion uses and wasted healing;
- exact lower-skill metrics.

HP/contact diagnostics are never candidate inputs.

---

## 11. outcome

If stress is sufficient and every original v16B gate passes:

```text
V15F_KNOWN_ECOLOGY_REMEDIATION_PASS
```

Then:

```text
fresh-seed 48-second remediation validation
  AUTHORIZED

deployment
  BLOCKED

v16C 180-second endurance/browser-parity phase
  still BLOCKED until fresh-seed 48-second validation passes
```

If stress is sufficient but any scientific gate fails:

```text
V15F_KNOWN_ECOLOGY_REMEDIATION_FAIL
```

Then fresh-seed validation and deployment remain blocked.

If artifact/runtime provenance or implementation contract is invalid:

```text
V15F_IMPLEMENTATION_INVALID
```

---

## 12. interpretation limits

A PASS means only:

> the frozen v15E2 pooled-DN reward policy repairs the already-known v16B failure ecology under the
> exact original gates, despite simultaneous movement/target/obstacle/injury sensory context.

It is not an unseen-seed claim because the v16B seeds/results are already known.

Therefore a PASS cannot deploy the policy.

A new preregistered fresh-seed 48-second ecology is mandatory before any deployment decision.

---

## 13. stop rule

After v15F outcome do not change:

- candidate artifact/model/representation;
- 3101xxx/3111xxx/3121xxx v16B seeds;
- 48-second horizon;
- decision cadence;
- ecology geometry/respawn;
- lower skills;
- sensory gains;
- POTION_OFF rule;
- original v16B gates.

Do not patch v15D.
Do not add HP as policy input.
Do not alter thresholds after seeing v15F.
