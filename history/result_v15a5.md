# result_v15a5 — reward-relevant POTION economic-state representation screen

## Status

**SCIENTIFIC FAIL — v15B remains BLOCKED**

v15A5 was preregistered before implementation and evaluated on unseen seeds.
The workflow conclusion is `failure` because a required scientific gate failed.
Syntax, frozen-representation retrieval, representation hash verification, connectome loading,
and evidence upload all completed successfully.

## Provenance

```text
workflow      Screen MapleFly v15A5 Potion Economic State
run           35811139924
head          580dec6a2f4919f1fc3e8dbd806eb6da600cd005
prereg        history/prereg_v15a5.md
prereg commit bb069dcbd51bb30a55f8e4cac18ec93f91358276
artifact      10729524422
digest        sha256:6553a4b2212386a859feb939ea99b563ea3bf7a42f2ce5af9ada19057ff4dffd
```

Frozen v15A4 representation source:

```text
run                    35808078481
artifact               10728751928
artifact digest        sha256:a65c007102f9f56ed30edb4cc43806d0d29e9892f39ebe98fde7493bf55a464b
representation SHA-256 dca322283c5e4f6ff106e17f882350408de1953856b0f47cdfa293edb24f0a91
representation         CONCAT48 / 256 frozen temporal slots
```

The exact frozen representation hash matched before any v15A5 row was used.

## Dataset

```text
TRAIN base seeds  2820000 / 2820100 / 2820200 / 2820300
EVAL base seeds   2825000 / 2825100 / 2825200
replicates        6
TRAIN rows        96
EVAL rows         72
```

No earlier v15 brain seed was reused.

## Frozen required-task gate

Each required task independently needed:

```text
FULL balanced accuracy >= 70%
both-class recall       >= 60%
FULL - DN_SHUFFLED      >= 20pp
```

Overall v15A5 PASS required both Task A and Task B to PASS.

## Authoritative results

| Task | Role | FULL balanced accuracy | Recall | DN_SHUFFLED | Margin | LABEL_SHUFFLED | Result |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| A — ECONOMIC_STATE 0/1 vs 2/3 | required | 80.6% | 80.6% / 80.6% | 50.0% | +30.6pp | 44.4% | **PASS** |
| B — ECONOMIC_BOUNDARY 1 vs 2 | required | 63.9% | 61.1% / 66.7% | 50.0% | +13.9pp | 44.4% | **FAIL** |
| C — WIDE_ANCHOR 0 vs 3 | diagnostic | 94.4% | 100.0% / 88.9% | 50.0% | +44.4pp | 38.9% | PASS |
| D — WITHIN_LOW 0 vs 1 | diagnostic | 61.1% | 61.1% / 61.1% | 44.4% | +16.7pp | 41.7% | FAIL |
| E — WITHIN_HIGH 2 vs 3 | diagnostic | 55.6% | 44.4% / 66.7% | 50.0% | +5.6pp | 55.6% | FAIL |

Task A confusion matrix:

```text
LOW  0/1: 29 correct / 7 false HIGH
HIGH 2/3: 29 correct / 7 false LOW
```

Task B confusion matrix:

```text
1 impact: 11 correct / 7 false HIGH
2 impacts: 12 correct / 6 false LOW
```

## Task A P(HIGH) by original impact state

Interpretation diagnostic only; not part of the gate:

| Original state | n | Mean P(HIGH) | Median | Min | Max |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 0 impacts | 18 | 0.199 | 0.111 | 0.028 | 0.695 |
| 1 impact | 18 | 0.395 | 0.397 | 0.054 | 0.963 |
| 2 impacts | 18 | 0.676 | 0.802 | 0.073 | 0.986 |
| 3 impacts | 18 | 0.826 | 0.954 | 0.049 | 1.000 |

The means and medians rise in the preregistered economic direction, but this diagnostic
does not override the required Task B gate.

## Decision

```text
Task A ECONOMIC_STATE     PASS
Task B ECONOMIC_BOUNDARY  FAIL
V15A5                     FAIL
v15B                      BLOCKED
```

Task B satisfied minimum class recall but failed:

```text
balanced accuracy  63.9% < 70%
DN identity margin +13.9pp < +20pp
```

## Scientific interpretation

v15A5 strengthens the evidence that the frozen CONCAT48 representation carries a
**coarse cumulative injury-burden / potion-economic-state signal**:

- pooled 0/1 vs 2/3 economic state passed at 80.6% balanced accuracy,
- both pooled recalls were 80.6%,
- DN identity destruction reduced the result to 50.0%,
- the identity-dependent margin was +30.6pp,
- 0 vs 3 remained strongly separable at 94.4%.

However, the exact nearest economic transition required by the preregistration,
1 impact vs 2 impacts, was not robust enough. It reached only 63.9% balanced
accuracy and +13.9pp DN-identity margin.

Therefore the current evidence supports a coarse graded burden signal but does
not establish sufficiently reliable local resolution at the 1-vs-2 potion-economic
boundary.

## Outcome boundary

No v15A5 gate, seed, representation, feature count, normalization, sensory drive,
pulse, task definition, or failed sample may be changed after observing this result
to manufacture PASS.

In particular, Task A PASS cannot rescue required Task B.

The next scientific step, if pursued, must be a new hypothesis with a new
preregistration. Until a legitimate preregistered representation gate passes,
**v15B remains blocked**.
