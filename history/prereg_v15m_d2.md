# prereg_v15m_d2 — scalar recurrent action-state upper-bound audit

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / FRESH COHORT COLLECTION / OUTCOME**

Frozen prerequisites:

```text
v15M-D1 result
  V15M_D1_TRACE_AND_PCA_SIGNAL_STABLE

v15M-D1 receipt
  976766d42983b8070c78651660532a1103100f13
```

Design:

```text
history/design_v15m_d2_recurrent_upper_bound.md
commit fd1320f5d9b6653cf596e902a9490332434326c0
```

No replacement POTION policy is trained.

---

## 1. fresh cohort

Base seeds:

```text
4001000
4011000
4021000
```

Each base seed:

```text
4 initial distances x 2 sides
= 8 tapes
```

Total:

```text
24 tapes
```

Interruption RNG:

```text
4037000
```

These seeds have not been used by v15L-D1, v15M, or v15M-D1.

---

## 2. frozen economics

```text
MAX_HP
  100

CONTACT_DAMAGE
  10

POTION_HEAL
  30

POTION decisions
  10
```

For every tape/decision enumerate every prior binary own-POTION action history.

Discard histories that are dead before the current decision.

---

## 3. exact immediate oracle

For each reachable hidden state, exhaustively enumerate all remaining binary POTION sequences.

Among surviving sequences find the minimum total additional potion uses.

Classify the first action among minimum-use surviving sequences:

```text
FORCED_WAIT
  only WAIT begins a minimum-use surviving sequence

FORCED_DRINK
  only DRINK begins a minimum-use surviving sequence

EITHER
  both begin a minimum-use surviving sequence

UNSURVIVABLE
  no remaining sequence survives
```

Primary scalar separability metrics use only FORCED_WAIT and FORCED_DRINK.

---

## 4. scalar action state

For a prior action history:

```text
u = 0

for each decision k before current t:
  previousOwnAction =
    0 at k=0
    priorAction[k-1] otherwise

  u =
    decay * u
    + previousOwnAction

at current t:
  u =
    decay * u
    + previousOwnAction
```

Equivalent implementation is permitted if it produces exactly the v15M recurrence's own-action
contribution before the current decision action is selected.

The current action is never included in u.

---

## 5. frozen decay grid

Exactly:

```text
0.00
0.05
0.10
0.15
0.20
0.25
0.30
0.35
0.40
0.45
0.50
0.55
0.60
0.65
0.70
0.75
0.80
0.85
0.90
0.95
0.99
```

No interpolation or post-outcome decay is permitted.

---

## 6. exact optimistic threshold calculation

For every decay evaluate two global orientations:

```text
NEGATIVE
  lower u favors DRINK

POSITIVE
  higher u favors DRINK
```

Global forced-class weights:

```text
each FORCED_WAIT state weight
  0.5 / totalForcedWait

each FORCED_DRINK state weight
  0.5 / totalForcedDrink
```

Thus total correctly classified weight equals global balanced accuracy.

For every exact group:

```text
(tape seed, decision index)
```

choose independently the threshold/cut that maximizes correctly classified global weight for the frozen
orientation.

Threshold candidates are the cuts before, between, and after sorted distinct u values.

States with identical u cannot be split.

Group ties choose the cut predicting WAIT for more states, then the lower cut index.

Sum group-optimal correct weights to obtain the exact optimistic global balanced-accuracy upper bound for
that decay/orientation.

Also report ordinary accuracy using those same selected cuts.

---

## 7. selected upper bound

Select one decay/orientation by:

1. maximum global balanced accuracy;
2. lower decay;
3. NEGATIVE before POSITIVE.

No ecology or scientific outcome is used in selection.

---

## 8. mixed-group separability

A mixed group contains at least one FORCED_WAIT and at least one FORCED_DRINK state.

For the selected decay/orientation, a mixed group is perfectly separable only if one allowed threshold
classifies every forced state correctly.

Report:

```text
mixedGroupCount
nonSeparableMixedGroupCount
nonSeparableMixedGroupFraction
```

Also report non-separable counts by decision index.

Preserve up to 20 deterministic minimal witnesses ordered by:

```text
decision index
seed
then action history binary value
```

Each witness may include hidden HP for evaluator evidence.

---

## 9. ecology validity

The fresh cohort must pass:

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

Failure gives:

```text
V15M_D2_IMPLEMENTATION_OR_ECOLOGY_INVALID
```

---

## 10. support guard

Require at least:

```text
500 FORCED_WAIT states
500 FORCED_DRINK states
20 mixed tape/decision groups
```

Otherwise:

```text
V15M_D2_INSUFFICIENT_ORACLE_SUPPORT
```

---

## 11. preregistered outcomes

After validity/support:

### Scalar bottleneck

If either:

```text
best optimistic balanced accuracy < 90%
OR
selected non-separable mixed-group fraction >= 10%
```

outcome:

```text
V15M_D2_SCALAR_ACTION_STATE_BOTTLENECK
```

### Necessary condition not ruled out

If both:

```text
best optimistic balanced accuracy >= 95%
selected non-separable mixed-group fraction < 2%
```

outcome:

```text
V15M_D2_SCALAR_ACTION_STATE_NOT_RULED_OUT
```

This is not a sufficiency claim.

Otherwise:

```text
V15M_D2_SCALAR_ACTION_STATE_INCONCLUSIVE
```

---

## 12. stop rule

Do not after seeing results:

- add decay values;
- alter orientation;
- alter class weights;
- change oracle definition;
- change thresholds;
- change outcome gates;
- add a second action-state dimension;
- train a replacement POTION policy.

No diagnostic threshold or state is deployable.

```text
POTION v15D
  DEPLOYED

v15M
  BLOCKED

v16C
  BLOCKED
```
