# prereg_v15f_d1 — original v16B value-gate feasibility audit

## Status

**PREREGISTERED BEFORE IMPLEMENTATION OF THE EXHAUSTIVE AUDIT**

v15F is frozen as:

```text
V15F_KNOWN_ECOLOGY_REMEDIATION_FAIL
```

Observed:

```text
survival
  100%

POTION_OFF death
  100%

mean kills
  9.25

mean potion uses
  9.542

mean value improvement
  -53.958

only failed gate
  meanValueImprovement >= +5
```

D1 asks a narrower evaluator question:

> Given the exact v15F full-horizon contact schedules and the original potion mechanics/cadence,
> is it mathematically possible for any POTION action sequence to satisfy the original value gate
> while also satisfying even the relaxed overall 75% survival requirement?

This is an evaluator-feasibility audit only.

It does not retrain or evaluate a neural policy.

---

## 1. frozen source

```text
v15F run
  35967181358

head
  3b80740d11fb721ea5e9042fd995b35c4d17cc7f

artifact
  10794886720

digest
  sha256:4b0ebfc818cdc150ccea1fc86cef7f7aac5b2df587394233c233b8eacc926073

source file
  v15f_ecology.json
```

Required source contract:

```text
schema
  maplefly.v15f.known-ecology-remediation.1

outcome
  V15F_KNOWN_ECOLOGY_REMEDIATION_FAIL

episodes
  24

source survival
  24/24
```

---

## 2. why the source contact tape is usable

In v15F:

- POTION has no action lock;
- POTION action does not change MOVE/JUMP/ATTACK/v14C state;
- HP is not a lower-skill input;
- taste opportunity is action-independent;
- target/obstacle physics do not depend on HP except episode termination.

Therefore, for an alternative POTION sequence that remains alive for all 2400 steps, the lower-skill
trajectory and contact schedule are the same as the recorded v15F full-survivor contact tape.

This audit makes no claim about contact events after a counterfactual death.

---

## 3. exact action search

Each source episode has ten fixed POTION opportunities:

```text
240,480,720,960,1200,1440,1680,1920,2160,2400
```

Enumerate every binary sequence:

```text
2^10 = 1024 action sequences / episode

WAIT
DRINK
```

Total:

```text
24,576 exact episode/action simulations
```

No optimizer or approximation.

---

## 4. exact evaluator order

Initial:

```text
HP = 100
uses = 0
```

At each step:

1. if the step is a POTION decision, apply selected WAIT/DRINK;
2. DRINK heals `min(30, missingHP)`;
3. increment potion uses;
4. then apply any recorded contact at that same step;
5. each contact deals 10 HP;
6. HP reaching 0 ends that counterfactual episode.

This matches the v16B/v15F loop where POTION decision processing occurs before the physics/contact
update of the same brain step.

---

## 5. original value

For every enumerated sequence:

```text
V = terminalHP - 15 * potionUses
```

For a dead sequence:

```text
terminalHP = 0
```

This is the same FULL cost-adjusted value used by the original v16B gate.

POTION_OFF comparator is 0 terminal HP on these stress trajectories.

Therefore:

```text
valueImprovement = V - 0 = V
```

---

## 6. per-episode oracle quantities

For each episode report:

```text
contact count

bestSurvivingValue
bestSurvivingUses
bestSurvivingFinalHP
bestSurvivingActionSequence

bestDyingValue
bestDyingUses
bestDyingActionSequence

bestUnconstrainedValue
whether bestUnconstrained survives
```

The oracle may use future information because this is evaluator feasibility, not a policy.

---

## 7. global relaxed feasibility upper bound

The original v16B survival gate is:

```text
overall survival >= 75%
```

For 24 episodes this requires at least:

```text
18 survivors
```

Compute the exact maximum possible mean `V` over all 24 episodes subject only to:

```text
survivors >= 18
```

All other original gates, including minimum per-base-seed survival, are deliberately relaxed away.

This produces an **upper bound** on what any policy could achieve while satisfying the full original
gate set.

If even this relaxed upper bound is below +5, then the original joint gate set is infeasible on the
v15F contact schedules.

Also report the stricter all-24-survive oracle mean.

---

## 8. classification

### jointly infeasible

```text
max mean V with >=18 survivors < +5
```

Outcome:

```text
V15F_D1_ORIGINAL_VALUE_GATE_JOINTLY_INFEASIBLE
```

### feasible

```text
max mean V with >=18 survivors >= +5
```

Outcome:

```text
V15F_D1_ORIGINAL_VALUE_GATE_FEASIBLE
```

No tolerance.

---

## 9. interpretation

If INFEASIBLE:

- v15F remains a FAIL under its preregistration;
- the failed gate is not retroactively deleted or relaxed;
- another learner must **not** be trained to chase that impossible combined target;
- a new prospective evaluation/reward contract may be preregistered for future remediation.

If FEASIBLE:

- the original gate remains a valid target;
- the next remediation may train a sequential reward-only policy toward it.

---

## 10. stop rule

After D1 output do not change:

- source artifact;
- 10 decision steps;
- HP/heal/damage/cost mechanics;
- decision-before-contact order;
- 1024 exhaustive action sequences;
- >=18 survivor relaxed constraint;
- +5 value threshold;
- classification.

D1 cannot change the recorded v15F FAIL.
