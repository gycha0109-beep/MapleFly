# result_v16b_d2 — persistent-state POTION diagnostic

## Verdict

```text
V16B_D2_PERSISTENT_STATE_NOT_SUFFICIENT
```

D2는 preregistered RESET control을 통과했고, 24-second repeated-cycle test에서
MaleCNS state/baseline carryover만으로는 v16B의 강한 WAIT bias를 재현하지 못했다.

No learning, deployed v15D change, threshold change, sensory-gain change, or gate change occurred.

---

## Authoritative evidence

```text
preregistration
  77f359f613f0fa55c7c16d0e3c3971143fb93797

implementation
  64d77fd1a2d35b279a2e37c93ecbc378e8d11ba8

workflow head
  96365d7f4618acbc170c22f898ab4750b20f44e5

run
  35948844108

conclusion
  SUCCESS

artifact
  10788146336

digest
  sha256:d56ea54380c65f8c632b335f06bf46d26830f88f794846ab93df036f226f0ca9
```

---

## Cohort

```text
fresh base seeds
  3211000
  3211100
  3211200

injury counts
  2, 3

contexts
  CLEAN
  TARGET_OBSTACLE_STATIC
  FULL_DYNAMIC_VISUAL

modes
  RESET_EACH_CYCLE
  PERSISTENT

cycles / sequence
  5

persistent duration
  24 s
```

All injury counts remain inside the original v15 support where DRINK is reward-optimal.

---

## Reset validity

Every context satisfied the preregistered RESET_EACH_CYCLE control requirement.

```text
resetControl = PASS
```

The diagnostic is therefore valid.

---

## Carryover result

Late aggregate = cycles 2..5.

```text
CLEAN
  RESET late DRINK       100.0%
  PERSISTENT late DRINK  100.0%
  carryover drop           0.0pp
  interference             false

TARGET_OBSTACLE_STATIC
  RESET late DRINK       100.0%
  PERSISTENT late DRINK  100.0%
  carryover drop           0.0pp
  interference             false

FULL_DYNAMIC_VISUAL
  RESET late DRINK       100.0%
  PERSISTENT late DRINK  100.0%
  carryover drop           0.0pp
  interference             false
```

Preregistered interference gate:

```text
carryoverDrop >= 20pp
```

No context crossed it.

---

## Interpretation

Supported:

> Under the exact D2 repeated-cycle protocol, preserving MaleCNS state and the original baseline
> across five consecutive 4.8-second cycles is not sufficient to reproduce the strong WAIT bias
> observed in v16B continuous ecology.

This narrows the failure. D1 already showed a static target+obstacle combination can interfere,
but D2 shows that simple state/baseline persistence on the controlled injury schedule does not
amplify that effect into the v16B phenotype.

Not supported:

- that persistent state can never matter in the full ecology;
- that visual interference is absent;
- that injury timing/distribution is irrelevant;
- that v15D should be retuned;
- that v16B FAIL should be changed.

The major remaining mismatch is the **real continuous contact schedule and mixed sensory history**
seen at each 4.8-second decision boundary, rather than injury count alone or generic repeated-state
carryover.

---

## Next

```text
V16B_D3_REAL_CONTACT_HISTORY_DIAGNOSTIC_AUTHORIZED
```

D2 is CLOSED.
