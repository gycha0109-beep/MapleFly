# result_v15f — frozen pooled-DN remediation in known v16B ecology

## Verdict

```text
V15F_KNOWN_ECOLOGY_REMEDIATION_FAIL
```

The v15E2 candidate repaired the catastrophic survival failure, but the exact original v16B gate set
still failed because the cost-adjusted-value gate did not pass.

This FAIL is preserved exactly as preregistered. No gate is changed after outcome.

---

## Authoritative evidence

```text
preregistration
  2d916ac4797d4175bb0f497d6c1050551fcedadf

implementation
  34b28f492b131f2d67c46e1755eba82e888e59ab

implementation-only loader fix
  3b80740d11fb721ea5e9042fd995b35c4d17cc7f

authoritative run
  35967181358

head
  3b80740d11fb721ea5e9042fd995b35c4d17cc7f

GitHub conclusion
  FAILURE
  expected because preregistered scientific FAIL exits 1

artifact
  10794886720

digest
  sha256:4b0ebfc818cdc150ccea1fc86cef7f7aac5b2df587394233c233b8eacc926073
```

Candidate provenance:

```text
v15E2 artifact
  10793265453

representation
  244464c8b5e9c7f5871f35cb3acc4ac1e2e0c9b61860c1dd3c267de79d4758db

model
  18be00b46303f46d62f8f63f26ca1a280b66f50f0004be6f469c637123077c96
```

### Invalid first attempt

Run `35967026149` stopped before any MaleCNS episode because the loader expected `dnIds` as a JSON
array, while the frozen artifact serialized the original typed array as a numeric-key object.

No scientific outcome was produced. Commit `3b80740d...` changed only artifact deserialization and
identity-order verification. Candidate weights, representation, seeds, ecology, sensory semantics,
horizon, cadence, and gates were unchanged.

---

## What changed relative to the original v16B failure

Original v16B:

```text
survival
  0%

mean kills
  3.4167

POTION
  4 DRINK / 84 decisions
```

v15F:

```text
survival
  100%

minimum base-seed survival
  100%

episodes with >=3 kills
  100%

mean kills
  9.25

POTION
  229 DRINK / 240 decisions
  95.4% DRINK
```

The remediation therefore reversed the old under-drinking failure, but overshot into near-always DRINK.

---

## Lower-skill / ecology gates

```text
encounter obstacle clear
  97.13%
  PASS

encounter target kill
  90.98%
  PASS

LEFT kill
  90.83%
  PASS

RIGHT kill
  91.13%
  PASS

attack precision
  65.46%
  PASS

airborne attack action
  11.45%
  PASS

post-clear jump encounter
  0%
  PASS

pre-clear attack encounter
  3.28%
  PASS
```

The five-skill ecology itself remained operational.

---

## POTION / survival gates

```text
POTION_OFF death
  100%
  stress sufficient

FULL survival benefit
  +100pp
  PASS

mean kill benefit
  +6.083
  PASS

full-survivor decision count
  exactly 10 in every survivor
  PASS

wasted healing / DRINK
  3.362
  PASS

mean cost-adjusted value
  -53.958

mean value improvement vs POTION_OFF
  -53.958
  FAIL (required >= +5)
```

Exactly one preregistered scientific gate failed:

```text
meanValueImprovement
```

---

## Decision behavior

All 24 episodes survived to all ten decision opportunities.

DRINK rate by decision index:

```text
1   87.5%
2   91.7%
3   95.8%
4  100.0%
5   95.8%
6   95.8%
7  100.0%
8   95.8%
9  100.0%
10  91.7%
```

Descriptive audit by contacts in the preceding 4.8-second window:

```text
1 contact
  N=12
  DRINK 58.3%

2 contacts
  N=99
  DRINK 93.9%

3 contacts
  N=106
  DRINK 100%

4+ contacts
  N=23
  DRINK 100%
```

HP/contact count was evaluator-only and never a policy input.

---

## Interpretation

Supported:

> The pooled-DN remediation solved the old temporal-phase under-drinking pathology strongly enough
> to restore 48-second survival on every known v16B episode.

Also supported:

> The isolated-window reward policy does not produce acceptable potion economy in the repeated
> continuous ecology under the original cost-adjusted-value gate; it drinks on 95.4% of opportunities.

However, v15F by itself does **not** establish that a different learned policy can satisfy the complete
original gate set. The surviving trajectories now contain many more contacts than the original dead
trajectories, so the feasibility of the original terminal-HP-minus-potion-cost comparison must be
audited before another learner is trained toward that gate.

---

## Next

```text
V15F_D1_VALUE_GATE_FEASIBILITY_AUDIT_AUTHORIZED
```

Fresh-seed validation remains BLOCKED.

Deployment remains BLOCKED.

v16C 180-second endurance/browser parity remains BLOCKED.

v15F is CLOSED as a scientific FAIL.
