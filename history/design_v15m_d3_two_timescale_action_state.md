# design_v15m_d3 — two-timescale own-action state separability audit

## Purpose

v15M-D2 found that one persistent own-action scalar is nearly sufficient in aggregate but structurally
fails in 15/54 mixed tape/decision groups.

All selected-bound errors occurred at decision 8.

The next smallest state increase is two causal own-action traces at different fixed timescales.

This diagnostic asks:

> Does a two-dimensional short/long own-action state remove the exact late-episode linear-separability
> defect before any reward-only policy is trained?

No neural representation, reward, optimizer, or deployment is changed here.

---

## 1. two fixed causal traces

At each POTION decision:

```text
short_t =
  0.50 * short_(t-1)
  + previousOwnAction

long_t =
  0.90 * long_(t-1)
  + previousOwnAction
```

Both start at zero.

Rationale:

```text
0.50
  one-decision half-life
  preserves recent drink timing strongly

0.90
  ~6.58-decision half-life
  preserves long-horizon action load
  and is the best scalar decay from frozen v15M-D2
```

The pair contains no HP, contact, damage, time, decision index, or cumulative potion count.

It is not a lag vector.

---

## 2. exact counterfactual oracle

Use a new fresh 24-tape cohort.

At each decision enumerate all reachable prior binary own-action histories and assign the same exact
minimum-use oracle classes:

```text
FORCED_WAIT
FORCED_DRINK
EITHER
UNSURVIVABLE
```

Primary geometry uses only the two forced classes.

---

## 3. optimistic local linear separability

Within one exact:

```text
(tape seed, decision index)
```

group, the MaleCNS neural observation is identical across counterfactual own-action histories.

The real two-trace policy would have:

```text
score =
  neuralOffset
  + wShort * short
  + wLong * long
```

For this diagnostic, each group is granted its own arbitrary linear separator in the 2-D
`(short,long)` plane.

This is strictly more permissive than a deployable shared policy.

A mixed group is structurally non-separable if the convex hull of its FORCED_WAIT points intersects the
convex hull of its FORCED_DRINK points.

That means no linear weights plus threshold can classify every forced state in that group.

---

## 4. interpretation

If many mixed groups remain non-separable even under independent per-group linear separators, two action
state dimensions are still structurally insufficient.

If essentially all mixed groups become separable, the exact scalar bottleneck has been removed at the
necessary-condition level. That does not yet prove that one shared set of weights plus MaleCNS neural
offsets generalizes.

The next step after such a pass would be a global supervised alignment audit, not immediate reward-only
deployment.

---

## 5. deployment boundary

```text
POTION v15D
  remains deployed

v15M
  blocked

v16C
  blocked
```
