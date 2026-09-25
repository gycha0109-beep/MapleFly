# prereg_v15m_d3 — two-timescale own-action state separability audit

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / FRESH COHORT COLLECTION / OUTCOME**

Frozen prerequisite:

```text
v15M-D2 receipt
  7a39fa1ca9ec1fbb715e7101085dc13924a8eec4

v15M-D2 outcome
  V15M_D2_SCALAR_ACTION_STATE_BOTTLENECK
```

Design:

```text
history/design_v15m_d3_two_timescale_action_state.md
commit 7e91a75e1ad8efe18c204129a5cf2bfe99f38b49
```

No replacement POTION policy is trained.

---

## 1. fresh cohort

Base seeds:

```text
4041000
4051000
4061000
```

24 tapes total.

Interruption RNG:

```text
4077000
```

---

## 2. exact oracle

Use the frozen v15M-D2 economics and exact remaining-horizon minimum-use classification.

Primary geometry includes only:

```text
FORCED_WAIT
FORCED_DRINK
```

Report EITHER and UNSURVIVABLE support separately.

---

## 3. frozen two-dimensional action state

For prior own-action history:

```text
short = 0
long = 0

at decision k:
  previousOwnAction =
    0 if k=0
    priorAction[k-1] otherwise

  short = 0.50 * short + previousOwnAction
  long  = 0.90 * long  + previousOwnAction
```

The current decision action is excluded.

No other decay pair is tested.

---

## 4. exact mixed groups

Group by:

```text
(tape seed, decision index)
```

A mixed group contains both forced classes.

For each class:

1. deduplicate identical `(short,long)` points;
2. construct its 2-D convex hull using deterministic monotonic-chain ordering;
3. test whether the two closed convex hulls intersect.

Intersection includes:

- shared points;
- crossing segments;
- touching segments/vertices;
- one hull containing a point of the other.

If hulls intersect:

```text
group = NON_SEPARABLE
```

Otherwise:

```text
group = LINEARLY_SEPARABLE
```

This is an optimistic per-group necessary-condition test.

---

## 5. support guards

Require:

```text
FORCED_WAIT >=500
FORCED_DRINK >=500
mixed groups >=20
```

Otherwise:

```text
V15M_D3_INSUFFICIENT_ORACLE_SUPPORT
```

---

## 6. ecology

The new cohort must pass the same frozen lower-skill ecology gates used in v15M-D2.

Failure:

```text
V15M_D3_IMPLEMENTATION_OR_ECOLOGY_INVALID
```

---

## 7. preregistered outcomes

After validity/support:

### Two-dimensional bottleneck

If:

```text
non-separable mixed-group fraction >=10%
```

outcome:

```text
V15M_D3_TWO_TIMESCALE_STATE_BOTTLENECK
```

### Necessary condition passes

If:

```text
non-separable mixed-group fraction <2%
```

outcome:

```text
V15M_D3_TWO_TIMESCALE_STATE_NOT_RULED_OUT
```

This does not establish global-policy sufficiency.

### Otherwise

```text
V15M_D3_TWO_TIMESCALE_STATE_INCONCLUSIVE
```

---

## 8. diagnostics

Report:

```text
reachable states
class supports
mixed groups
non-separable mixed groups
fraction
counts by decision index
```

For up to 20 non-separable groups preserve:

- seed;
- decision index;
- WAIT hull vertices;
- DRINK hull vertices;
- evaluator HP/class/history for representative source states.

---

## 9. stop rule

Do not after seeing results:

- alter 0.50 or 0.90;
- add a third trace;
- alter oracle definition;
- alter geometry rule;
- alter outcome thresholds;
- train a replacement policy.

No state or diagnostic separator is deployable.

```text
POTION v15D
  DEPLOYED

v15M
  BLOCKED

v16C
  BLOCKED
```
