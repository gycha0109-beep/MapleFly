# result_v16b_d4 — contact timing / side / boundary-tail decomposition

## Verdict

```text
V16B_D4_IN_WINDOW_TIMING_DOMINANT
```

The exact in-window timing of real v16B injury pulses is the dominant cause of the D3 POTION
collapse. Side sequence and pre-window pulse tails are not large enough to explain it under the
preregistered 20pp gates.

No deployed policy or connectome parameter changed.

---

## Evidence

```text
preregistration
  a386fffc56f418aeb9dde8ccdb1f74385046f82b

implementation
  d384e5ada7c60f3a9bcb0d512a70d3359c205a19

workflow head
  635f93a67d758d5f56af7a2e937a06b8b7d7d730

run
  35955487325

conclusion
  SUCCESS

artifact
  10790362728

digest
  sha256:fe601ff6b2c80808e9a00856283e587205dc78152e80305043a23633178c606d
```

Primary support remained the frozen 67 authoritative v16B windows with 2..3 causal contacts.

---

## Five-condition result

```text
C0  CANONICAL_TIMING + CANONICAL_SIDE       DRINK 85.1%
C1  CANONICAL_TIMING + REAL_SIDE            DRINK 82.1%
R0  REAL_TIMING      + CANONICAL_SIDE       DRINK  9.0%
R1  REAL_TIMING      + REAL_SIDE            DRINK  4.5%
R1T REAL_TIMING      + REAL_SIDE + TAIL     DRINK  4.5%
```

Validity:

```text
C0 capability
  required >= 60%
  observed 85.1%
  PASS

D3 REAL_RESET replication
  target 4.5% ± 5pp
  R1T    4.5%
  PASS
```

Preregistered effects:

```text
SIDE_ON_CANONICAL
  C0 - C1
  3.0pp

TIMING_WITH_CANONICAL_SIDE
  C0 - R0
  76.1pp

TIMING_WITH_REAL_SIDE
  C1 - R1
  77.6pp

SIDE_ON_REAL_TIMING
  R0 - R1
  4.5pp

BOUNDARY_TAIL
  R1 - R1T
  0.0pp
```

Only the two timing effects cross the 20pp causal gate.

---

## Interpretation

Supported:

> Replacing canonical injury timing with the actual in-window v16B injury timing collapses DRINK
> by roughly 76–78 percentage points regardless of whether side sequence is canonical or real.

Not supported as dominant causes:

- left/right injury side sequence;
- pre-window LgLG pulse carry-in;
- persistent MaleCNS state from D2/D3;
- a need to change the frozen v15D policy before further diagnosis.

The next unresolved temporal question is whether the distribution shift is primarily:

1. absolute within-window phase / recency of injury evidence, or
2. inter-contact spacing / temporal clustering.

---

## Next

```text
V16B_D5_PHASE_VS_SPACING_DIAGNOSTIC_AUTHORIZED
```

D4 is CLOSED.
