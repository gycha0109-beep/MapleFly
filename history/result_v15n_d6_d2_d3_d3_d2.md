# result_v15n_d6_d2_d3_d3_d2 — causal 200ms delayed-max observability

## Status

```text
V15N_D6_D2_D3_D3_D2_INSUFFICIENT_DELAYED_MAX_SUPPORT
```

The preregistered delayed-max audit completed successfully, but the frozen support gate failed because hit-free BACKGROUND windows were structurally rare.

Authoritative evidence:

```text
run
  36342783894

head
  464f6979baf3348e9da0ed3c767fc5559627c220

artifact
  10939579823

artifact digest
  sha256:102a5308585a923f0134fb26cc202038fa6c553072969a4e08a393561bafd1d3

v15n_d6_d2_d3_d3_d2.json sha256
  5273efaf28c24415ae3372f9a9380f2821ba0de017bc57bf8e9baf0daa5fd1da
```

Preregistration:

```text
e2817b8b20b40d38cb08e891b75fcdcdc979624e
```

Implementation/workflow:

```text
35aa6cfbf20b873c6716e537bcfb56ca3d0f0176
464f6979baf3348e9da0ed3c767fc5559627c220
```

## 1. support

```text
PROSPECTIVE_A
  tapes                      64
  positive windows         1334
  LINGER negative windows  1573
  BACKGROUND negative windows  3
  support                    FAIL

PROSPECTIVE_B
  tapes                      64
  positive windows         1328
  LINGER negative windows  1407
  BACKGROUND negative windows 15
  support                    FAIL
```

The preregistered floors were:

```text
positive >= 1000
LINGER >= 1500
BACKGROUND >= 500
```

A satisfies positive/LINGER but fails BACKGROUND.
B satisfies positive but fails both LINGER and BACKGROUND.

## 2. descriptive delayed-max metrics

These metrics are descriptive only because support precedence blocks the observability conclusion.

```text
PROSPECTIVE_A
  balanced accuracy          0.829113
  positive recall            0.832084
  negative recall            0.826142
  LINGER negative recall     0.825811
  BACKGROUND negative recall 1.000000  (n=3)
  first-frame recall         0.366567
  delayed-max recall gain    0.465517

PROSPECTIVE_B
  balanced accuracy          0.844054
  positive recall            0.845633
  negative recall            0.842475
  LINGER negative recall     0.842217
  BACKGROUND negative recall 0.866667  (n=15)
  first-frame recall         0.390060
  delayed-max recall gain    0.455572
```

The fixed delayed max therefore appears promising descriptively, but no pass may be claimed.

## 3. structural support problem

D3-D3 previously produced hundreds of BACKGROUND anchor rows per 64-tape cohort.

D3-D3-D2 converts an anchor into a negative delayed-max window only if no physical hit occurs during the following fixed 200 ms window.

After that causal-window eligibility rule, only 3 and 15 BACKGROUND windows remained.

This means blindly scaling the same replication design would require an impractically large number of tapes to reach 500 hit-free BACKGROUND windows.

The next diagnostic should therefore attribute BACKGROUND anchor fate:

- remains hit-free for 200 ms;
- transitions to a physical hit within 0-100 ms;
- transitions to a physical hit within 100-200 ms.

It should also report whether the frozen DN delayed-max score becomes positive before or only after that future hit.

This is necessary to determine whether the apparent BACKGROUND scarcity is:
- a sampling issue;
- a pre-impact neural precursor state;
- or an artifact of the old-scalar context definition.

No support floor, threshold, frozen model, or deployment state is changed by this result.

## 4. deployment

```text
POTION v15D
  DEPLOYED

v15N
  CLOSED / BLOCKED

D3-D3-D2
  INCONCLUSIVE — SUPPORT INSUFFICIENT

v16C
  BLOCKED
```
