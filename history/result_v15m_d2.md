# result_v15m_d2 — scalar recurrent action-state upper-bound audit

## Status

```text
V15M_D2_SCALAR_ACTION_STATE_BOTTLENECK
```

This is a valid preregistered diagnostic result.

Authoritative run:

```text
run
  36088009381

head
  89d1926570b12747ad772e0d12cc76eedff964bc

artifact
  10844514633

artifact name
  maplefly-v15m-d2-scalar-action-state-36088009381

artifact digest
  sha256:10b58bf495b90e23c23bdda5d2c673a6d3f01b6c00f40c6a02128d0ce96aa464

v15m_d2.json sha256
  1802ccc5cb35a5a6fd436334ad89e264e9cfc754f05f88ecd8f6c3025194f1aa
```

Preregistration:

```text
59ca34a3edd103489bb98f09b325ef3915d43b59
```

Implementation/workflow:

```text
88b5b399fa65846a18587bd7e52139d598fcb931
89d1926570b12747ad772e0d12cc76eedff964bc
```

No replacement POTION policy was trained.

---

## 1. fresh cohort validity

Fresh base seeds:

```text
4001000
4011000
4021000
```

All frozen lower-skill ecology gates passed.

Key ecology:

```text
episodes with >=3 kills
  100%

obstacle clear
  97.03%

target kill
  90.25%

LEFT target kill
  89.83%

RIGHT target kill
  90.68%

attack precision
  63.58%

airborne attack
  13.29%

post-clear jump
  0.42%

pre-clear attack
  6.78%
```

---

## 2. exact counterfactual support

```text
reachable states
  5363

FORCED_WAIT
  2182

FORCED_DRINK
  1886

EITHER
  1058

UNSURVIVABLE
  237

forced states used by primary audit
  4068

mixed tape/decision groups
  54
```

All preregistered support guards passed.

---

## 3. optimistic scalar upper bound

The best frozen decay/orientation was:

```text
decay
  0.90

orientation
  NEGATIVE
  lower scalar u favors DRINK
```

This is directionally sensible: more/recent own DRINK actions increase u and therefore push the optimal
decision toward WAIT.

The optimistic upper bound was high:

```text
balanced accuracy
  98.964%

ordinary accuracy
  98.943%
```

However this audit grants each tape/decision group its own independently optimal threshold. It is strictly
more powerful than the real v15M shared neural threshold.

Despite that advantage:

```text
mixed groups
  54

mixed groups not perfectly scalar-threshold separable
  15

non-separable fraction
  27.78%
```

The preregistered scalar-bottleneck threshold was >=10%.

Therefore:

```text
V15M_D2_SCALAR_ACTION_STATE_BOTTLENECK
```

---

## 4. localization

All 43 unavoidable forced-state classification errors under the selected optimistic scalar bound occurred
at:

```text
decision index
  8
```

No selected-bound errors occurred at decisions 0–7 or 9.

This is a late-episode state-compression defect, not a broad failure of the scalar trace at every decision.

The decay neighborhood was robust:

```text
decay 0.90
  BA 98.964%
  non-separable 15/54

decay 0.95
  BA 98.964%
  non-separable 15/54

decay 0.99
  BA 98.964%
  non-separable 15/54
```

So the preregistered result is not explained by selecting one narrow decay value.

---

## 5. exact witnesses

Example at fresh seed 4001011, decision 8, selected decay 0.90:

```text
history A
  [1,1,1,0,1,1,1,0]
  scalar u = 4.0392279
  hidden HP = 40
  oracle = FORCED_WAIT

history B
  [1,1,1,1,0,1,0,1]
  scalar u = 4.0663279
  hidden HP = 20
  oracle = FORCED_DRINK
```

Under the selected NEGATIVE orientation, lower u must favor DRINK and higher u must favor WAIT.

This pair requires the opposite ordering:

```text
lower u
  WAIT

higher u
  DRINK
```

No scalar threshold can classify both correctly, even though the diagnostic grants this exact tape/decision
its own free threshold.

Equivalent witnesses occur across 15/54 mixed groups.

Hidden HP above is evaluator evidence only and is not a proposed runtime input.

---

## 6. interpretation

v15M-D2 sharpens the diagnosis.

The scalar recurrent action state is **almost** sufficient in aggregate but is not structurally sufficient
for all reachable minimum-use decisions.

The failure mechanism is exactly the one suggested by v15L-D1:

```text
different timing of older own DRINK actions
  -> different healing/saturation consequences
  -> one exponentially compressed scalar loses ordering information
  -> late decision can require opposite immediate actions
```

This explains why simply replacing previous-four actions with one persistent scalar was not a complete
repair.

It also explains why a cumulative potion count would not solve the problem: the relevant information is
temporal pattern, not merely total use.

Combined evidence now supports:

```text
MaleCNS impact signal
  present and cross-cohort stable

PCA32
  not the demonstrated bottleneck

previous-four actions
  provably aliased

one scalar recurrent own-action state
  still structurally aliased at late decisions
```

The next remediation should therefore increase **own-action state dimensionality minimally**, without
adding HP/contact/time or restoring a nine-lag schedule vector.

A two-timescale causal own-action state is the next smallest defensible candidate.

---

## 7. deployment state

No deployment change.

```text
POTION v15D
  DEPLOYED

v15M
  CLOSED / BLOCKED

v16C
  BLOCKED
```
