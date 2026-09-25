# design_v15l_d1 — decision-relevant observation aliasing audit

## Purpose

v15L closed as:

```text
V15L_CAUSAL_NEURAL_TRACE_REMEDIATION_FAIL
```

The frozen policy reached 83.3% TRAIN survival but only 12.5% EVAL survival. More importantly, the v15L
runtime observation contains:

```text
current neural trace PCA32
+ previous 4 own POTION actions
```

while the hidden HP transition depends on all prior POTION actions.

The v15L tape generator computes the neural sequence independently of the offline counterfactual POTION
action sequence. Therefore an action older than four decisions can change hidden HP while disappearing
completely from the policy observation.

v15L-D1 tests whether this creates an exact, decision-relevant partial-observability conflict in reachable
game states.

No replacement policy is trained.

---

## 1. key concept

At one fixed tape and decision index:

```text
neural observation
  fixed by the tape

explicit own-action memory
  only previous 4 actions
```

Consider two reachable action histories that have the same previous four actions but differ in an older
POTION action.

If the older action changed effective healing, then:

```text
same runtime observation
different hidden HP
```

That alone is state aliasing.

The stronger question is whether it is decision relevant.

For every hidden HP state, solve the remaining finite-horizon POTION problem exactly:

```text
objective
  survive the episode

secondary objective
  use the minimum number of additional potions
```

If one aliased hidden state forces WAIT as the unique minimum-use surviving immediate action while another
forces DRINK, then no deterministic policy using the v15L runtime observation can be optimal for both.

---

## 2. primary diagnostic

Use fresh lower-skill tapes only.

For each fresh tape:

1. collect the ordinary ten decision boundaries and contact schedule;
2. enumerate every reachable prior POTION action history;
3. compute hidden HP exactly under each history;
4. group states by:
   - tape;
   - decision index;
   - previous four own POTION actions;
5. neural observation is identical within each group by construction;
6. solve the remaining action problem exactly for every hidden HP state;
7. mark a conflict only when the same observation group contains:
   - at least one state with unique optimal immediate WAIT; and
   - at least one state with unique optimal immediate DRINK.

No distance threshold, learned probe, or similarity tolerance is used.

This is exact observation aliasing.

---

## 3. secondary diagnostics

Report without changing the primary outcome:

- number and fraction of episodes containing at least one conflict;
- conflict groups by decision index;
- HP range inside each conflict group;
- earliest conflicting decision;
- number of distinct hidden HP values per observation group;
- minimum-use requirement distribution;
- lower-skill ecology validity.

Also reproduce the already frozen v15L TRAIN/EVAL generalization signature from the authoritative evidence
receipt:

```text
TRAIN survival
  83.3%

EVAL survival
  12.5%
```

This is contextual evidence only and is not recomputed into the primary aliasing outcome.

---

## 4. interpretation

If decision-relevant aliasing is present, the correct interpretation is:

```text
the v15L observation contract is non-Markov for the POTION economy:
older own POTION actions can change the correct current action after they have disappeared from the
four-action memory, while the neural tape does not encode those counterfactual actions
```

This would diagnose a representation contract defect rather than merely a bad CEM seed.

It would not authorize simply restoring the previous-nine-action clock-like history. A later remediation
would need a causal own-action state that preserves healing-relevant information without reintroducing the
v15I schedule shortcut.

If no decision-relevant aliasing is found, the next diagnosis returns to neural-domain shift / optimizer
generalization.

POTION v15D remains deployed.
v15L remains blocked.
v16C remains blocked.
