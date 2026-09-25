# prereg_v15l_d1 — decision-relevant observation aliasing audit

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / FRESH HOLDOUT COLLECTION / OUTCOME**

Frozen prerequisite:

```text
v15L evidence receipt closure
  dee412f6660743c36673415e5f3cd10513b59c63

v15L outcome
  V15L_CAUSAL_NEURAL_TRACE_REMEDIATION_FAIL
```

Design:

```text
history/design_v15l_d1_observation_aliasing.md
commit 894affbee4f9d2cf4ba095060de30f917ed8af9d
```

Question:

> Does the frozen v15L observation contract map two reachable hidden HP states that require different
> optimal immediate POTION actions to exactly the same policy observation because own-action memory ends
> after four decisions?

No replacement policy is trained in v15L-D1.

---

## 1. frozen game economics

```text
MAX_HP
  100

CONTACT_DAMAGE
  10

POTION_HEAL
  30

POTION_COST
  15

POTION decisions
  10
```

The lower-skill stack and MaleCNS provenance remain the same as v15L.

Deployed POTION v15D is not modified.

---

## 2. fresh holdout cohort

Base seeds:

```text
3811000
3821000
3831000
```

Expected tapes:

```text
24
```

Each valid tape must have:

```text
48 seconds live
10 ordinary POTION decision boundaries
```

Lower-skill interruption RNG:

```text
3867000
```

No v15L TRAIN or EVAL tape may satisfy the primary outcome. They may be reported only as frozen context.

---

## 3. frozen observation contract

v15L runtime observation:

```text
32-D current causal neural trace PCA
+ previous 4 own POTION actions
```

For this audit, the exact neural values do not need a similarity metric.

Within one fixed tape and one fixed decision index, the offline POTION action sequence does not alter the
collected neural tape. Therefore two counterfactual histories with the same previous four actions have
exactly the same v15L policy observation.

The audit must verify in source/runtime that no counterfactual POTION action is fed back into the neural
tape generator.

If that verification fails:

```text
V15L_D1_IMPLEMENTATION_INVALID
```

---

## 4. reachable hidden-state enumeration

For each fresh tape and decision index i:

Enumerate every binary prior POTION action sequence of length i.

Simulate from HP=100 using the tape's frozen contact schedule.

At every prior DRINK:

```text
hp = min(100, hp + 30)
```

At every contact:

```text
hp = max(0, hp - 10)
```

Discard histories that died before decision i.

For every surviving history record:

```text
decision index
hp before current POTION decision
previous four own actions, newest first, zero padded
older action prefix
```

Group by:

```text
tape seed
decision index
previous four own actions
```

No HP or contact value is part of the grouping key.

---

## 5. exact remaining-horizon oracle

For each reachable hidden HP state at decision i, enumerate every remaining action sequence from i through
decision 9.

A candidate sequence is feasible only if it survives through the end of the tape.

Among feasible sequences, find the minimum number of additional DRINK actions.

Classify the current immediate action:

```text
FORCED_WAIT
  every minimum-use surviving sequence begins WAIT

FORCED_DRINK
  every minimum-use surviving sequence begins DRINK

EITHER
  at least one minimum-use surviving sequence begins WAIT
  and at least one begins DRINK

UNSURVIVABLE
  no remaining action sequence can survive
```

UNSURVIVABLE states do not create a WAIT/DRINK conflict.

---

## 6. primary aliasing definition

A decision-relevant aliasing conflict exists only when one exact observation group contains both:

```text
>=1 FORCED_WAIT hidden state
AND
>=1 FORCED_DRINK hidden state
```

This uses no learned classifier, no distance tolerance, and no post-outcome numeric threshold.

---

## 7. lower-skill ecology validity

Fresh HOLDOUT ecology must satisfy the same frozen gates:

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

If ecology fails:

```text
V15L_D1_IMPLEMENTATION_OR_ECOLOGY_INVALID
```

No scientific conclusion is drawn.

---

## 8. preregistered scientific outcomes

If ecology is valid and at least one exact observation group contains both FORCED_WAIT and FORCED_DRINK:

```text
V15L_D1_DECISION_RELEVANT_ALIASING_PRESENT
```

Supported conclusion:

```text
the four-action v15L observation contract is provably insufficient for globally optimal deterministic
POTION decisions in at least one actually reachable fresh-holdout state
```

This is an existence claim. Prevalence is reported separately and is not inflated into the primary claim.

If ecology is valid and no such group exists:

```text
V15L_D1_NO_DECISION_RELEVANT_ALIASING
```

Then the four-action truncation is not supported as the cause of the v15L failure, and the next diagnosis
must target neural-domain shift / optimizer generalization.

---

## 9. mandatory report

Always report:

```text
valid tapes
total reachable hidden states
total exact observation groups
conflict groups
episodes with conflict
conflict fraction by episode
earliest conflict decision
conflicts by decision index
HP ranges of conflict groups
FORCED_WAIT / FORCED_DRINK / EITHER / UNSURVIVABLE counts
ecology metrics
```

Also retain the frozen v15L context:

```text
TRAIN survival 83.3%
EVAL survival 12.5%
generalization drop 70.8 pp
```

These frozen numbers do not affect the D1 outcome.

---

## 10. stop rule

Do not in v15L-D1:

- train a replacement POTION policy;
- extend own-action memory;
- add cumulative potion count;
- add HP or damage inputs;
- alter the neural trace;
- change the 2-second half-life;
- change PCA width;
- change v15L reward or CEM;
- lower ecology gates;
- convert prevalence into a new threshold after seeing the result.

Freeze the diagnostic result first.

```text
POTION v15D
  deployed

v15L
  blocked

v16C
  blocked
```
