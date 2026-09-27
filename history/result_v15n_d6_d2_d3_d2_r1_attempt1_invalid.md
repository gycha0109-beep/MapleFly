# v15N-D6-D2-D3-D2-R1 attempt 1 — implementation invalid

## Status

```text
V15N_D6_D2_D3_D2_R1_IMPLEMENTATION_OR_PROVENANCE_INVALID
```

The first R1 run completed computationally, but its support decision is procedurally invalid because the implementation reused the D3-D2 support helper whose tape-count contract is hard-coded to 24 tapes.

R1 preregistration requires exactly 64 tapes in each replication cohort.

Authoritative invalid attempt:

```text
run
  36282667519

head
  de397a54289f6f50d4329061e36c7d23a95e122c

artifact
  10920298073

artifact digest
  sha256:22f2c4e6d94a309631506e6605762fbb304704f105503678ba9c704a51488d70

v15n_d6_d2_d3_d2_r1.json sha256
  1dc937133135d99bb7038114630bbc2a6d04c3669560bc2308adcdfaf65489c1
```

Observed support was in fact:

```text
REPLICATION_A
  tapes                 64
  POSITIVE_REIMPACT   1300
  LINGER              2005
  BACKGROUND           636

REPLICATION_B
  tapes                 64
  POSITIVE_REIMPACT   1341
  LINGER              2172
  BACKGROUND           613
```

All numerical floors were met. The false support result came solely from the inherited check:

```text
tapes === 24
```

rather than the R1 preregistered:

```text
tapes === 64
```

No scientific metric from this attempt is used to alter seeds, features, labels, model hashes, thresholds, support floors, observability gates, or outcome precedence.

A corrected rerun is authorized only to replace the erroneous 24-tape equality with the preregistered 64-tape equality. Everything else remains frozen.
