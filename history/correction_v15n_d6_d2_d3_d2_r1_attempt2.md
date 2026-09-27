# correction_v15n_d6_d2_d3_d2_r1_attempt2

## Purpose

Implementation-only correction after invalid R1 attempt 1.

Attempt 1 was frozen as invalid because the replication script inherited the D3-D2 support helper condition:

```text
tapes === 24
```

while the R1 preregistration explicitly requires:

```text
64 tapes per replication cohort
```

## Authorized change

Exactly one scientific-contract correction is allowed:

```text
tapes === 24
->
tapes === V15N_D6_D2_D3_D2_R1_TAPES_PER_REPLICATION
```

where:

```text
V15N_D6_D2_D3_D2_R1_TAPES_PER_REPLICATION = 64
```

## Frozen unchanged

The corrected rerun must preserve:

- preregistration commit `cc13947c32c9892a5d748eeaa4977800c1ffae2c`;
- original TRAIN cohort;
- REPLICATION_A/B seeds;
- interruption seeds;
- D6 detector;
- old scalar model;
- DERIVATIVE3 model hash;
- SCALAR4 model hash;
- context condition and labels;
- lambda 1e-3;
- threshold 0.5;
- support numeric floors;
- observability gate 0.75;
- outcome precedence.

No metric from invalid attempt 1 may be used to tune the corrected run.
