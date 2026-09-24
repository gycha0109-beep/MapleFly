# result_v16b_d3 — authoritative real-contact history replay

## Verdict

```text
V16B_D3_REAL_CONTACT_SCHEDULE_INTERFERENCE
```

The preregistered canonical control passed. Replaying the authoritative v16B contact
timing/side history with visual input disabled was sufficient to reproduce the strong
POTION WAIT bias. Keeping MaleCNS state persistent across cycles did not add a measurable
drop beyond the real contact schedule effect.

No learning, deployed v15D change, threshold change, sensory-gain change, or gate change occurred.

---

## Authoritative evidence

```text
initial preregistration
  3264ed46d2143c08a14b85dfe17eda0d3bd081c0

boundary-corrected preregistration
  c11afb6055678fbc6136f4a819c8071fe3b9cf59

implementation
  fba4a00a3e21b21d653df9448f552b3babd9322a

workflow head
  8d08dbafd967b72bc270e18202f090c9391ff26b

run
  35950443954

conclusion
  SUCCESS

artifact
  10789315281

digest
  sha256:80503579c0e72ce60d682cd8592d9ddf84094a0f0a84338e69afe1fd88a60025

authoritative v16B source JSON hash
  062f5d8e222ba188f173bec96fc2a8210910938b074fb45f4708fa0f45611528
```

---

## Source/support audit

```text
source windows
  84

causal contact count distribution
  1:  8
  2: 41
  3: 26
  4:  8
  5:  1

primary support
  contact count 2..3
  67 windows
```

Decision-step contacts were excluded from the current decision's causal count, and
cross-boundary LgLG pulse tails were replayed according to the corrected preregistration.

---

## Primary result

Primary support = authoritative windows with 2 or 3 causal contacts.

```text
source FULL
  DRINK  6.0%

CANONICAL_RESET
  DRINK 85.1%

REAL_RESET
  DRINK  4.5%

REAL_PERSISTENT
  DRINK  4.5%
```

Preregistered deltas:

```text
scheduleDrop
  85.1% - 4.5%
  = 80.6 percentage points

persistenceDrop
  4.5% - 4.5%
  = 0.0 percentage points
```

Gates:

```text
canonical validity
  required >= 60%
  observed  85.1%
  PASS

real-contact schedule interference
  required drop >= 20pp
  observed drop 80.6pp
  TRUE

persistence interaction
  required drop >= 20pp
  observed drop 0.0pp
  FALSE
```

---

## Interpretation

Supported:

> The timing/side structure of the actual v16B contact history is sufficient, even with visual
> sensory input removed and each decision window reset to a fresh MaleCNS state, to collapse the
> frozen v15D POTION policy from 85.1% DRINK on count-matched canonical schedules to 4.5% DRINK.

Also supported:

> Generic repeated-state/baseline persistence is not required for this failure under D3:
> REAL_RESET and REAL_PERSISTENT both produced 4.5% DRINK.

This substantially narrows the v16B failure from a broad five-skill sensory-interference hypothesis
to a **temporal injury-history distribution shift** inside the frozen 4.8-second POTION representation.

Not yet supported:

- which property of the real schedule is causal: absolute phase, recency, spacing, side sequence,
  or pulse overlap;
- that visual input is harmless in every schedule;
- that v15D should be retuned;
- that v16B FAIL should be changed.

D1's static target+obstacle interference remains a valid separate finding, but D3 shows that visual
interference is not necessary to reproduce the dominant v16B POTION failure.

---

## Next

```text
V16B_D4_CONTACT_TIMING_DECOMPOSITION_AUTHORIZED
```

D3 is CLOSED.
