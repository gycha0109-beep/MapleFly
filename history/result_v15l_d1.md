# result_v15l_d1 — decision-relevant observation aliasing audit

## Status

```text
V15L_D1_DECISION_RELEVANT_ALIASING_PRESENT
```

Authoritative run:

```text
run
  36082658620

head
  bd4d767ea3d111f2d20006ea9426dfa611e93752

artifact
  10842861523

artifact name
  maplefly-v15l-d1-observation-aliasing-36082658620

artifact digest
  sha256:47630f006cbbb46fb40b4922d090f9a2ba908aea2b7e775fbee412e1063ababd

v15l_d1.json sha256
  02fc36d8569183b1a1159b994871a0bab29b95973a0d3fcbc683768569924c34
```

Preregistration:

```text
a2e58587672ece9bef8a62d70eac401d455cebef
```

Implementation:

```text
6997e6627b1b00ca8a19d0296a11449beb5a6136
```

Workflow:

```text
bd4d767ea3d111f2d20006ea9426dfa611e93752
```

No replacement POTION policy was trained and no deployed policy changed.

---

## 1. action-independence contract

The diagnostic verified that the v15L tape-side neural observation is not altered by the offline
counterfactual POTION action sequence.

```text
action-independence check
  PASS

forbidden action-feedback hits
  none

decisionBoundary source sha256
  493a48193eafe0ef08a9c2d1a0fdec9d4aaa1ef71a58c92e61b99f2f317e3c7b
```

Therefore, inside one fixed tape and decision index:

```text
same previous four own actions
  -> same explicit action-memory input

same tape neural vector
  -> same neural input

therefore
  -> exactly the same v15L runtime observation
```

Older POTION actions are invisible after they leave the four-action memory.

---

## 2. fresh HOLDOUT ecology validity

Fresh base seeds:

```text
3811000
3821000
3831000
```

All ecology gates passed:

```text
episodes with >=3 kills
  100.0%

obstacle clear
  97.5%

target kill
  92.0%

LEFT target kill
  92.5%

RIGHT target kill
  91.5%

attack precision
  66.7%

airborne attack
  12.0%

post-clear jump encounter
  0.8%

pre-clear attack encounter
  1.7%
```

The aliasing result is therefore not an invalid-ecology artifact.

---

## 3. exact hidden-state enumeration

Across 24 fresh HOLDOUT tapes:

```text
reachable hidden states
  5350

exact observation groups
  1783

decision-relevant conflict groups
  106

episodes containing >=1 conflict
  23 / 24
  95.8%
```

Earliest conflict:

```text
decision index
  6
```

Conflicts by decision index:

```text
0  0
1  0
2  0
3  0
4  0
5  0
6  1
7  20
8  84
9  1
```

The concentration after decision 6 is consistent with the mechanism: once sufficiently old own actions
have fallen outside the four-action memory, different healing histories can collapse onto the same current
observation.

---

## 4. decision relevance

Inside the 106 exact conflict groups, hidden-state classifications included:

```text
FORCED_WAIT
  362

FORCED_DRINK
  388

EITHER
  48

UNSURVIVABLE
  0
```

Conflict-group HP ranges:

```text
minimum
  10 HP

maximum
  60 HP

mean
  33.6 HP
```

The result is not merely that hidden HP differs. The **correct immediate action differs** while the policy
observation is exactly identical.

Example from fresh seed 3811000 at decision 7:

```text
same visible last-four action memory
  1110

hidden state A
  HP 60
  unique minimum-use action = WAIT

hidden state B
  HP 20
  unique minimum-use action = DRINK
```

The two states have the same v15L runtime observation but require opposite immediate actions.

---

## 5. conclusion

The preregistered outcome is:

```text
V15L_D1_DECISION_RELEVANT_ALIASING_PRESENT
```

This establishes an exact representation defect in the v15L POTION contract.

The four-action memory is not merely "a bit short". On fresh reachable states it discards information that
can change the uniquely optimal current POTION action.

In plain terms:

```text
the fly can have exactly the same neural input
and exactly the same remembered last four potion actions,
while one hidden history means "do not drink"
and another means "drink now or the minimum-use survival plan changes"
```

A deterministic policy cannot solve both states from that observation.

This gives a concrete mechanism for the v15L failure and sharply reduces the need to blame the CEM seed
alone.

The frozen v15L TRAIN/EVAL collapse remains relevant:

```text
TRAIN survival
  83.3%

EVAL survival
  12.5%

drop
  70.8 pp
```

but D1 now shows that even a perfectly optimized deterministic policy over the same observation contract
cannot be globally optimal across all reachable states.

---

## 6. remediation boundary

The result does **not** authorize:

```text
raw HP input
missing-HP input
damage counter
contact counter
time-since-hit
previous-nine-action clock history
supervised D2 probe deployment
```

The next representation must preserve the agent's own healing-relevant action history causally without
turning decision index into the dominant shortcut.

A permitted direction is a compact persistent own-action state derived only from the agent's own POTION
actions, combined with MaleCNS-derived neural evidence.

That representation must be separately designed and preregistered before training.

---

## 7. deployment state

```text
POTION v15D
  remains deployed

v15L
  closed / blocked

v16C
  remains blocked
```
