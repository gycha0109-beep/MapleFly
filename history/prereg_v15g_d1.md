# prereg_v15g_d1 — observable-state / credit-assignment localization audit

## Status

**PREREGISTERED BEFORE DIAGNOSTIC IMPLEMENTATION / OUTCOME**

Frozen chain:

```text
v15E2
  pooled all-DN phase-invariant neural core PASS

v15F
  known ecology survival repaired
  near-always DRINK
  economy FAIL

v15F-D1
  old terminal-value + survival gate jointly infeasible

v15G
  fresh sequential reward learner
  survival 100%
  mean uses 9.667 / 10
  mean excess uses 3.792
  HISTORY_OFF margin 0
  NEURAL_OFF margin +5
  FAIL
```

v15G learned positive coefficients for all four recent-DRINK history bits. It therefore failed to learn
the intended self-action economy/refractory effect.

D1 asks:

> Did v15G fail mainly because reward-only REINFORCE could not discover a useful policy from the
> allowed observables, or because the allowed observables / fixed score class themselves do not
> contain enough decision information for economical survival?

This is a **diagnostic only**. Oracle labels are trainer/evaluator-only and can never become runtime
policy inputs or deployment weights.

---

## 1. frozen sources

Use exact v15G cohorts and ecology:

```text
TRAIN bases
  3231000,3241000,3251000

EVAL bases
  3261000,3271000,3281000

episodes
  24 TRAIN
  24 EVAL

horizon
  2400 x 20 ms = 48 s

POTION opportunities
  10 at steps 240,480,...,2400
```

Use exact frozen MaleCNS, lower skills, visual encoder, real-contact LgLG, taste offer, respawn, and
v15E2 baseMargin generation from v15G.

No deployed file is changed.

No v15G seed, gate, or result is rewritten.

---

## 2. runtime-observable feature contract

At each POTION decision the diagnostic probes may see only:

```text
baseMargin
  frozen v15E2 Q_DRINK - Q_WAIT

h1
  previous POTION action

h2
  two decisions ago

h3
  three decisions ago

h4
  four decisions ago
```

Forbidden probe inputs are identical to v15G runtime forbidden inputs, including HP, contact count,
decision index, clock time, geometry, kill count, future damage, and oracle values.

---

## 3. exhaustive reachable-state oracle dataset

For each frozen neural/contact tape, enumerate every reachable POTION action prefix through ten decisions.

Environment replay uses exact v15G mechanics:

```text
HP start
  100

contact
  -10

DRINK
  +30 capped at 100

death
  HP reaches 0

utility
  U = 165*survived - 15*potionUses
```

Decision-before-same-step-contact ordering is preserved.

For every live prefix state immediately before a decision:

1. record observable vector `[baseMargin,h1,h2,h3,h4]`;
2. evaluator privately records HP and prefix for audit only;
3. exhaustively enumerate all remaining suffixes;
4. compute:
   - `Q*_WAIT` = best possible final U if WAIT now;
   - `Q*_DRINK` = best possible final U if DRINK now;
5. oracle label:
   - DRINK if `Q*_DRINK > Q*_WAIT`;
   - WAIT if `Q*_WAIT > Q*_DRINK`;
   - TIE otherwise.

TIE states are excluded from probe-loss and balanced-accuracy calculations but retained in audit counts.

No oracle label or Q* value is fed to the runtime ecology evaluator.

---

## 4. exact observable alias audit

Group reachable states by exact runtime observable identity:

```text
tape seed
decision opportunity
h1,h2,h3,h4
```

Within a tape/decision, `baseMargin` is action-independent and therefore identical for the group.

An **exact conflict group** exists when two live prefixes with the same runtime observable have disjoint
strict oracle labels: at least one requires WAIT and at least one requires DRINK.

Report:

- number of observable groups;
- number and fraction of conflict groups;
- number and fraction of non-tie states belonging to conflict groups;
- first conflicting examples with hidden HP shown only as evaluator audit.

This directly tests whether four-action memory aliases materially different hidden survival states.

No threshold is tuned from this audit.

---

## 5. supervised diagnostic probes

The probes use oracle labels **only to diagnose representational/optimization capacity**.

They are never deployment candidates.

Train on TRAIN reachable states only. Evaluate classification on EVAL reachable states only.

### Probe A — MARGIN_ONLY

```text
score = baseMargin + theta0
```

Train `theta0`.

### Probe B — FIXED_V15G_CLASS

Exact v15G deterministic hypothesis class:

```text
score =
  baseMargin
  + theta0
  + theta1*h1
  + theta2*h2
  + theta3*h3
  + theta4*h4
```

Coefficient on baseMargin remains exactly 1.

### Probe C — FREE_MARGIN_LINEAR

```text
score =
  beta*baseMargin
  + theta0
  + theta1*h1
  + theta2*h2
  + theta3*h3
  + theta4*h4
```

This probe asks whether the fixed neural-margin scale is the limiting restriction.

It is diagnostic only.

---

## 6. frozen probe fitting

For all three probes:

```text
loss
  binary cross entropy on strict oracle labels

optimizer
  deterministic full-batch gradient descent

epochs
  2000

learning rate
  0.05

L2
  0.001

initialization
  all trainable parameters 0

parameter clamp
  [-10,+10]

class weighting
  equal total WAIT / DRINK weight

tie states
  excluded from loss

shuffle
  none
```

No hyperparameter sweep.

No early stopping.

No EVAL-based model selection.

---

## 7. downstream diagnostic replay

Freeze each trained probe and replay deterministic POTION actions on all 24 EVAL tapes:

```text
DRINK iff score > 0
tie -> WAIT
```

Normal HP/death mechanics apply.

For each probe report:

- survival rate;
- minimum base-seed survival;
- mean potion uses;
- mean excess uses among survivors vs exact minimum-use survivor oracle;
- wasted healing / DRINK;
- mean U.

The lower-skill tapes are already frozen; probe actions do not alter their neural/motor/contact tapes under
the v15G contract.

---

## 8. diagnostic reference gates

These gates are for localization only and do not authorize deployment.

A supervised probe is called **economy-capable** only if its EVAL replay satisfies:

```text
survival rate                    >= 75%
minimum base-seed survival       >= 62.5%
mean excess uses among survivors <= 1.5
wasted healing / DRINK           <= 10
```

Classification support gate:

```text
EVAL strict-label balanced accuracy >= 70%
WAIT recall                         >= 60%
DRINK recall                        >= 60%
```

A probe must pass both classification and downstream gates to count as economy-capable.

---

## 9. localization outcomes

Priority order:

### A. reward/credit-assignment limited

If `FIXED_V15G_CLASS` is economy-capable:

```text
V15G_D1_REWARD_CREDIT_ASSIGNMENT_LIMITED
```

Interpretation: the exact v15G observable/score class can express a useful policy when given diagnostic
oracle supervision, so v15G's reward-only optimization/credit assignment is the main localized failure.

### B. fixed neural-margin scale limited

If FIXED fails but `FREE_MARGIN_LINEAR` is economy-capable:

```text
V15G_D1_FIXED_MARGIN_SCALE_LIMITED
```

Interpretation: the allowed observables support a useful linear policy, but forcing the v15E2 margin
coefficient to 1 is too restrictive.

### C. observable-state limited

If both FIXED and FREE fail, and either:

```text
exact conflict-group state fraction >= 20%
```

or FREE fails the classification support gate:

```text
V15G_D1_OBSERVABLE_STATE_LIMITED
```

Interpretation: four-action memory plus the frozen pooled neural margin is not sufficient to cleanly
resolve the sequential economy decision under this diagnostic.

### D. inconclusive

Otherwise:

```text
V15G_D1_INCONCLUSIVE
```

---

## 10. scientific limits

D1 may use HP/future contacts/oracle suffix search only to construct diagnostic labels and audit aliasing.

D1 must not:

- deploy a supervised probe;
- copy oracle probe weights into browser runtime;
- change v15D;
- change v15E2;
- change v15G;
- add HP/contact count/time/decision index to runtime policy;
- tune probe hyperparameters after EVAL;
- reinterpret the v15G FAIL.

A localization result may authorize a **new preregistration**, not direct deployment.

---

## 11. stop rule

After D1, freeze the outcome and evidence before designing remediation.

No architecture change is authorized until D1 identifies which limitation is supported.
