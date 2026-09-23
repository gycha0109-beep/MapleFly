# result_v15a4 — pairwise injury-burden separability screen

## Status

**SCIENTIFIC FAIL — v15B remains BLOCKED**

This file freezes the authoritative v15A4 result. The GitHub Actions workflow itself completed with conclusion `failure` because the preregistered scientific gate failed; this is not an implementation or syntax failure.

## Provenance

```text
workflow      Screen MapleFly v15A4 Injury Burden
run           35808078481
head          65d4a402224b495f1aa340befa897828bfc96f37
prereg        history/prereg_v15a4.md
prereg commit 0e815c65b8cc3ea269fd9d784cc41c677afb6704
artifact      10728751928
digest        sha256:a65c007102f9f56ed30edb4cc43806d0d29e9892f39ebe98fde7493bf55a464b
```

Frozen connectome:

```text
repository  alextitonis/fly.ai
commit      95a3dbcb05241b0a5c07028ca8ad945b23fbbe6e
```

Frozen representation:

```text
CONCAT48
48 x 100 ms = 4.8 s
top-256 unlabeled TRAIN-variance temporal slots
TRAIN-only mean/std
```

The authoritative artifact contains the exact 256 selected slots, means, and scales. Its `representation` JSON object has SHA-256:

```text
dca322283c5e4f6ff106e17f882350408de1953856b0f47cdfa293edb24f0a91
```

## Frozen gate

Both required tasks had to independently satisfy:

```text
FULL balanced accuracy >= 70%
both-class recall       >= 60%
FULL - DN_SHUFFLED      >= 20pp
```

Task C was diagnostic only and could not rescue A or B.

## Authoritative results

| Task | FULL balanced accuracy | Recall | DN_SHUFFLED | Margin | LABEL_SHUFFLED | Result |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| A — presence 0 vs 1 | 63.9% | 83.3% / 44.4% | 50.0% | +13.9pp | 47.2% | **FAIL** |
| B — burden 1 vs 3 | 77.8% | 66.7% / 88.9% | 50.0% | +27.8pp | 52.8% | **PASS** |
| C — wide 0 vs 3 | 100.0% | 100.0% / 100.0% | 50.0% | +50.0pp | 52.8% | **PASS (diagnostic only)** |

Task A confusion matrix:

```text
actual 0: 15 correct / 3 false positive
actual 1:  8 correct / 10 false negative
```

Task B confusion matrix:

```text
actual 1: 12 correct / 6 false positive
actual 3: 16 correct / 2 false negative
```

Task C confusion matrix:

```text
actual 0: 18 correct / 0 false positive
actual 3: 18 correct / 0 false negative
```

## Decision

```text
V15A4-INJURY-BURDEN-SCREEN = FAIL
v15B                         = BLOCKED
```

Required Task A failed all three preregistered checks:

- balanced accuracy: 63.9% < 70%
- minimum class recall: 44.4% < 60%
- DN identity margin: +13.9pp < +20pp

Required Task B passed all three checks. Diagnostic Task C also passed, but preregistration explicitly forbids Task C from rescuing Task A.

## Scientific interpretation

The result does **not** support the statement that injury information is absent.

What is supported:

- **burden escalation signal is demonstrated**: 1 vs 3 impacts reached 77.8% balanced accuracy with +27.8pp DN-identity margin.
- **wide burden separation is strong**: 0 vs 3 reached 100% balanced accuracy on unseen evaluation seeds with +50pp DN-identity margin.
- **first-injury presence is insufficient under the frozen v15A4 gate**: 0 vs 1 did not reach the preregistered accuracy, recall, or DN-shuffle-margin thresholds.

Therefore the corrected LgLG-family -> frozen MaleCNS -> CONCAT48 DN history carries a real cumulative injury-burden signal, while the weak 0 -> 1 transition is not robustly separable enough under this preregistered screen.

## Outcome boundary

No v15A4 parameter may be changed after observing this result to manufacture PASS. In particular, do not lower the gate, change top-256, extend CONCAT48, increase impact drive/pulse, replace evaluation seeds, or remove failed samples.

The next admissible step is a separately preregistered v15A5 hypothesis asking whether the frozen DN history is sufficient for the **reward-relevant potion-economic boundary**, rather than exact first-injury detection.

Until such a new gate passes, **v15B remains blocked**.
