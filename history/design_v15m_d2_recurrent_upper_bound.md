# design_v15m_d2 — scalar recurrent action-state upper-bound audit

## Purpose

The frozen chain now isolates the unresolved failure:

```text
v15K-D2
  frozen MaleCNS contains persistent impact information

v15L-D1
  causal neural observation + previous four actions is decision-relevantly aliased

v15M
  one-dimensional persistent neural-action belief fails reward-only EVAL
  and does not show mandatory memory/action-feedback contribution

v15M-D1
  the exact v15M causal trace and PCA32 retain a stable cross-cohort RECENT_IMPACT_2S signal
```

The next question is:

> Is one exponentially persistent scalar of the agent's own POTION history even capable of separating
> the oracle-required WAIT/DRINK decisions created by different reachable action histories?

This diagnostic deliberately gives the scalar architecture an advantage: for every tape/decision pair it
allows an independently optimal threshold. The real v15M policy does not have that freedom; its threshold
must be generated from the shared neural weights and bias.

Therefore this is an **optimistic representational upper bound**.

If even this upper bound is poor, the scalar recurrent action state is structurally insufficient and no
reward optimizer can repair it without changing the state family.

---

## 1. fresh counterfactual cohort

Collect 24 new tapes.

For each tape and each decision index t:

1. enumerate all binary prior own-POTION histories of length t;
2. replay frozen potion economics exactly;
3. discard histories dead before t;
4. compute the exact minimum-use immediate oracle class.

No replacement policy is trained.

---

## 2. oracle classes

For every reachable state:

```text
FORCED_WAIT
FORCED_DRINK
EITHER
UNSURVIVABLE
```

Use the same exact remaining-horizon minimum-use definition as v15L-D1.

The primary separability audit uses only FORCED_WAIT and FORCED_DRINK.

---

## 3. scalar recurrent action state

For each fixed decay r:

```text
u_0 = 0

u_t =
  r * u_(t-1)
  + previousOwnAction
```

This is exactly the own-action component available to the v15M one-dimensional recurrent belief for a
fixed recurrent decay, up to multiplication by the shared actionFeedback parameter.

No HP, contact, damage, potion count, decision index, or time is included.

---

## 4. frozen decay grid

Audit:

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

This includes the neighborhood of the v15M learned decay 0.6947 but does not privilege it.

No decay is added after seeing results.

---

## 5. optimistic per-group threshold upper bound

Within each exact:

```text
(tape seed, decision index)
```

group, neural evidence is identical across counterfactual action histories.

For a scalar recurrent action state, the action-history contribution to the score is monotonic in u_t:

```text
score =
  group-specific neural offset
  + actionFeedback * u_t
```

The real model has one shared actionFeedback sign.

For each decay, evaluate both possible global signs:

```text
positive sign
  larger u favors DRINK

negative sign
  smaller u favors DRINK
```

For each sign and each tape/decision group, allow the threshold to be chosen independently to maximize
correct FORCED_WAIT/FORCED_DRINK classifications.

This arbitrary group-specific threshold is more powerful than the real shared neural model and therefore
forms an optimistic upper bound.

Report:

- forced-state balanced accuracy;
- forced-state ordinary accuracy;
- number of groups containing both forced classes;
- number of mixed groups that cannot be perfectly threshold-separated;
- errors by decision index.

Select the decay/sign with maximum global balanced accuracy. Ties resolve by lower decay, then negative
sign before positive sign.

---

## 6. exact impossibility witness

For every mixed group that is not perfectly threshold-separable under the selected decay/sign, preserve at
least one minimal ordered witness:

```text
state A
  scalar u
  prior actions
  oracle class
  hidden HP (evaluator only)

state B
  scalar u
  prior actions
  oracle class

state C if required
  scalar u
  prior actions
  oracle class
```

The witness demonstrates a non-monotonic oracle boundary that a single scalar action contribution cannot
represent even with a free neural threshold for that exact tape/decision.

Hidden HP is evidence only and is never a runtime feature.

---

## 7. interpretation

Because the threshold is independently optimized for every tape/decision, this audit cannot prove the real
v15M architecture is sufficient.

It can prove a necessary-condition failure.

### Strong scalar bottleneck

If the best optimistic upper bound has either:

```text
balanced accuracy < 90%
OR
>=10% of mixed groups are not perfectly threshold-separable
```

then:

```text
V15M_D2_SCALAR_ACTION_STATE_BOTTLENECK
```

### Necessary condition passes

If:

```text
balanced accuracy >= 95%
AND
<2% of mixed groups are non-separable
```

then:

```text
V15M_D2_SCALAR_ACTION_STATE_NOT_RULED_OUT
```

This does not claim sufficiency. It authorizes a later global neural-threshold supervised audit.

Otherwise:

```text
V15M_D2_SCALAR_ACTION_STATE_INCONCLUSIVE
```

---

## 8. deployment boundary

No diagnostic state or threshold is deployable.

```text
POTION v15D
  remains deployed

v15M
  blocked

v16C
  blocked
```
