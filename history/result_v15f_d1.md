# result_v15f_d1 — original value-gate feasibility audit

## Verdict

```text
V15F_D1_ORIGINAL_VALUE_GATE_JOINTLY_INFEASIBLE
```

The exhaustive preregistered audit proves that the original v16B value gate cannot be satisfied on the
v15F full-horizon contact schedules while also satisfying even the relaxed overall 75% survival gate.

This does not change the recorded v15F FAIL. It explains why training another learner toward the same
joint target would be invalid.

---

## Evidence

```text
preregistration
  3553056c308a03d0ab55fe768a68cbca630ec7e6

implementation
  812057ae70d6c3e4bee434e07e88e7d2a1ac027d

workflow head
  7882398da6be873541058232eb13df0f76f8ee0a

run
  35968591996

conclusion
  SUCCESS

artifact
  10795430860

digest
  sha256:d7e11f36ac449fac393359a44af34c72e4355ff8c92d5fa352ddf900b9f4eaac

v15F source JSON sha256
  4887a56bf09453faaa86ebda73b7b674d40b7cf3c256d971c80bbb62d6b02c77
```

---

## Exhaustive search

For each of 24 v15F episodes:

```text
POTION decisions
  10

action sequences
  2^10 = 1024

total exact simulations
  24,576
```

The oracle used the recorded full-survivor contact tape and exact mechanics:

```text
HP
  100

contact
  -10

DRINK
  +30, capped at 100

cost
  15/use

value
  terminalHP - 15*uses
```

Decision-before-same-step-contact order matched v16B/v15F.

---

## Result

If **all 24 episodes must survive**, the best possible clairvoyant action sequence for each episode gives:

```text
mean maximum value
  -38.958
```

The audit then relaxed the original requirements and kept only:

```text
overall survival >=75%
  at least 18/24 episodes
```

It removed minimum base-seed survival and every other scientific gate, making this an optimistic upper bound.

Even then:

```text
maximum possible mean value
  -25.417

survivors at optimum
  18

required original value gate
  >= +5
```

Gap to the original gate:

```text
-30.417 points
```

With no survival constraint, the value-maximizing solution is:

```text
mean value
  0

survivors
  0/24
```

In other words, under this terminal-value formula, deliberately dying without spending a potion dominates
every surviving trajectory on these high-contact 48-second tapes.

---

## Interpretation

This is a property of the evaluator objective, not a neural-policy defect.

The v15F candidate reached:

```text
100% survival
9.25 mean kills
97.1% obstacle clear
91.0% target kill
```

but the longer-lived agent necessarily experienced far more damage opportunities. The original
`terminalHP - 15*potionUses` metric compares that 48-second survivor against a POTION_OFF agent that
dies after the tenth contact and terminates with zero HP.

The exhaustive oracle proves that no smarter DRINK/WAIT sequence can reconcile the original +5 value
gate with the required survival on these tapes.

Therefore:

- v15F remains FAIL because that was its preregistered gate;
- the original v16B gate must not be silently edited and rerun;
- another learner must not be optimized against this impossible joint target;
- a new prospective continuous-ecology utility/efficiency contract is required.

---

## Next

```text
V15G_SEQUENTIAL_POTION_ECONOMY_PREREGISTRATION_AUTHORIZED
```

The next phase must define the new reward/evaluation contract **before** training.

The candidate policy may use only:

- frozen MaleCNS DN representation;
- its own previous POTION motor history.

HP, missing HP, contact count, future damage, oracle action, and potion economics remain forbidden runtime inputs.

Fresh-seed validation and deployment remain BLOCKED.

v16C 180-second endurance/browser parity remains BLOCKED.

D1 is CLOSED.
