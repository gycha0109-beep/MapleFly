# result_v15a8 — endpoint-aligned temporal localization

## Verdict

**V15A8 outcome: DISTRIBUTED_MULTIWINDOW_SIGNAL**

Fresh-cohort FULL48 coarse injury-burden decoding replicated, but no preregistered
600 ms window passed the localization gate.

```text
FULL48 Task A gate   PASS
localized windows   none
persistent pairs    none
W7 localization     FAIL
v15B                 BLOCKED
```

Under the frozen 600 ms / top-256 procedure, the coarse signal is therefore supported
only when information is available across the wider 4.8 s history. v15A8 does not
identify a single sufficient 600 ms carrier window.

## Provenance

```text
preregistration
  history/prereg_v15a8.md
  14640bce0d43f61ffdac010a4241da597056d1ec

implementation
  61452d191f6465917d8cbbf08055e7f6e66ddcce
  experiment(v15a8): add temporal localization screen

workflow head
  15543928d390335df723c24a4c1107c0d05deeaa
  experiment(v15a8): wire temporal localization CI

workflow
  Screen MapleFly v15A8 Temporal Localization
  run 35885839874
  conclusion success

artifact
  10763071635
  maplefly-v15a8-temporal-localization-35885839874
  sha256:e41b4bf5b31f5ad674d0d2fa5961c63fa622a078e292421b1ee4b5d38482022e
```

The workflow succeeded because the preregistered FULL48 baseline replication gate
passed. Scientific window failures were preserved as evidence.

## Frozen experiment

Biological/sensory contract remained unchanged:

```text
MaleCNS
  95a3dbcb05241b0a5c07028ca8ad945b23fbbe6e

corrected LgLG
  LEFT 331
  RIGHT 338

impact
  drive 0.7
  pulse 120 ms

ground
  SNta_L/R 0.05

taste
  LB3 + claw_tpGRN bilateral
  drive 0.8
  final 100 ms

history
  48 x 100 ms = 4.8 s

windows
  W0..W7
  6 frames = 600 ms each
```

Fresh cohort:

```text
TRAIN 2850000 2850100 2850200 2850300
EVAL  2855000 2855100 2855200
6 replicates x 4 states
TRAIN 96 rows
EVAL  72 rows
```

## Representation hashes

```text
FULL48  8f3627eeebe609ed8798be196d44f33ae8247b9c620d69472c609563219f3987
W0      37b126462b97b5cbe0466e03c24017421a3ffab652637489a1dc5fe23491c6d9
W1      0afafe3d75f44f13f57356a3903bd725d9878fd89a546c78a27a9279cde2b230
W2      7be4f24e73c524abcd935a74d371a24c579e328f85731fb08fa16e59862832ce
W3      9e73ede08a7a19539761f44ab965d12eb3a898456136793fcc65311991736c3f
W4      5803ed15ed73ff14f5c87bc537ce4a901be46b209125c5f55eae6690dfcb0a36
W5      c2d19a1ce55c0572b355348f389b10be74293da44cef83ef6db4cec381eb2698
W6      00c04a580f49c9ed2a9cf8f2c9b65294d3d50f6134e3b4c882d0a9eae473bb4c
W7      3d87ad003cf84fbc641663a13990c9da38e06fbc54069d9713cba1eba8f77451
```

## FULL48 baseline

Task A — 0/1 vs 2/3:

```text
FULL balanced accuracy  83.3%
recall LOW/HIGH         88.9% / 77.8%
DN_SHUFFLED             50.0%
DN identity margin      +33.3pp
LABEL_SHUFFLED          51.4%
gate                    PASS
```

The coarse CONCAT48 signal therefore replicated again on the fresh 285xxxx cohort.

Task B — 1 vs 2 diagnostic:

```text
FULL balanced accuracy  69.4%
recall                  72.2% / 66.7%
DN_SHUFFLED             50.0%
margin                  +19.4pp
gate                    FAIL
```

The nearest economic boundary remains below the frozen 70% / +20pp gate.

## 600 ms localization

Task A:

| Window | Endpoint interval | FULL BA | Recall LOW/HIGH | DN_SHUFFLED | Margin | Gate |
|---|---|---:|---:|---:|---:|---|
| W0 | -4.8..-4.2 s | 72.2% | 97.2% / 47.2% | 52.8% | +19.4pp | FAIL |
| W1 | -4.2..-3.6 s | 62.5% | 63.9% / 61.1% | 50.0% | +12.5pp | FAIL |
| W2 | -3.6..-3.0 s | 66.7% | 75.0% / 58.3% | 54.2% | +12.5pp | FAIL |
| W3 | -3.0..-2.4 s | 66.7% | 52.8% / 80.6% | 56.9% | +9.7pp | FAIL |
| W4 | -2.4..-1.8 s | 55.6% | 55.6% / 55.6% | 50.0% | +5.6pp | FAIL |
| W5 | -1.8..-1.2 s | 52.8% | 50.0% / 55.6% | 48.6% | +4.2pp | FAIL |
| W6 | -1.2..-0.6 s | 48.6% | 44.4% / 52.8% | 50.0% | -1.4pp | FAIL |
| W7 | -0.6..0.0 s | 43.1% | 50.0% / 36.1% | 45.8% | -2.8pp | FAIL |

No window satisfies all three preregistered localization requirements.

W0 has a 72.2% point balanced accuracy but fails high-class recall and the +20pp
DN-identity margin. It is not promoted post hoc.

W7 contains no direct impact pulse under the frozen schedule and fails strongly. v15A8
therefore provides no evidence that a single final 600 ms endpoint window is sufficient
to carry the coarse burden signal.

## Cross-temporal decoding

Balanced accuracy matrix, train window by test window:

| train\\test | W0 | W1 | W2 | W3 | W4 | W5 | W6 | W7 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| W0 | 72.2 | 69.4 | 63.9 | 65.3 | 66.7 | 62.5 | 51.4 | 47.2 |
| W1 | 65.3 | 62.5 | 59.7 | 65.3 | 62.5 | 62.5 | 50.0 | 59.7 |
| W2 | 69.4 | 51.4 | 66.7 | 59.7 | 55.6 | 66.7 | 47.2 | 51.4 |
| W3 | 61.1 | 59.7 | 52.8 | 66.7 | 52.8 | 61.1 | 61.1 | 48.6 |
| W4 | 59.7 | 63.9 | 62.5 | 58.3 | 55.6 | 56.9 | 48.6 | 47.2 |
| W5 | 52.8 | 58.3 | 62.5 | 56.9 | 65.3 | 52.8 | 45.8 | 65.3 |
| W6 | 50.0 | 54.2 | 52.8 | 52.8 | 48.6 | 52.8 | 48.6 | 40.3 |
| W7 | 50.0 | 45.8 | 51.4 | 48.6 | 40.3 | 47.2 | 56.9 | 43.1 |

No adjacent pair qualifies for the preregistered bidirectional persistence rule,
because no diagonal window is LOCALIZED_PASS.

The matrix is retained as diagnostic evidence; it cannot override the failed diagonal
localization gates.

## Interpretation

The authoritative v15A8 finding is:

> Under the frozen 600 ms, label-blind top-256 procedure, no individual window is
> sufficient for the coarse 0/1-vs-2/3 injury-burden signal, while FULL48 remains
> strongly decodable.

This supports the preregistered **DISTRIBUTED_MULTIWINDOW_SIGNAL** outcome.

Combined with prior evidence:

```text
v15A6
  temporal mean destroys the signal

v15A7
  absolute endpoint alignment contributes
  cross-DN phase contributes

v15A8
  FULL48 replicates
  no single 600 ms window is sufficient
```

The evidence is consistent with a temporally distributed population code that depends
on information from more than one part of the endpoint-aligned trajectory.

It does not yet establish which windows are jointly necessary or sufficient.

## Next permitted scientific step

A separately preregistered **v15A9 multi-window necessity** experiment is permitted.

It should retain the successful FULL48 representation family and directly ablate
preregistered temporal regions to determine whether coarse decoding requires
information from multiple separated portions of the trajectory.

It must not search arbitrary window combinations or use the 1-vs-2 diagnostic to pick
regions.

## v15B status

**BLOCKED.**

No v15A8 probe may be deployed as the POTION policy.

Existing deployed MOVE v7, ATTACK v10F, JUMP v11H2, and v14C remain unchanged.
