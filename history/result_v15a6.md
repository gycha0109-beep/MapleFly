# result_v15a6 — temporal-integration POTION economic-boundary screen

## Verdict

**V15A6-TEMPORAL-INTEGRATION-SCREEN = FAIL**

v15B remains **BLOCKED**.

This is a scientific gate failure, not an implementation/CI infrastructure failure.
Checkout, Node setup, syntax check, pinned MaleCNS cache/load, the preregistered screen,
and evidence upload all executed. The experiment process returned exit code 1 because
the frozen scientific gate failed.

## Provenance

```text
preregistration
  history/prereg_v15a6.md
  06e1cdcf09f0475f69491fb7243c254f917e1473

implementation
  3779bbc7fa84964ee95f57d07d68f3f980d5ae56
  experiment(v15a6): add temporal-integration screen

workflow wiring / authoritative head
  fb59e70d1010bb9be961cb8126671cc186c426b3
  experiment(v15a6): wire temporal-integration CI

workflow
  Screen MapleFly v15A6 Temporal Integration
  run 35878025169
  conclusion failure

artifact
  10760325252
  maplefly-v15a6-temporal-integration-35878025169
  sha256:c3dbdf547bce825dd4f8573dc77f31ef06ee3c9a6e7c9f2bdcbb90099eceb4ab

POOL48 representation SHA-256
  ff8a3c82240a618922118a5ec10cec57f03637a9608898434ff928ad9791e880
```

The artifact is the authoritative machine-readable evidence and contains the selected
256 DN slots, TRAIN-only variances, means/scales, task confusion matrices, controls,
and the complete frozen result object.

## Frozen experiment

The preregistered biological/sensory contract was unchanged:

```text
MaleCNS commit
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
```

The new hypothesis replaced CONCAT48 temporal slots with POOL48:

```text
POOL48[d] = mean(frame_feature[d, 0..47])
```

Then TRAIN-only, label-blind variance selected the top 256 DN identities. All tasks
used the same selected identities and TRAIN-only normalization.

Fresh seeds were used:

```text
TRAIN 2830000 2830100 2830200 2830300
EVAL  2835000 2835100 2835200
6 replicates x 4 states
TRAIN rows 96
EVAL rows 72
```

## Required results

| Task | FULL balanced accuracy | Recall 0 / 1 | DN_SHUFFLED | Margin | LABEL_SHUFFLED | Gate |
|---|---:|---:|---:|---:|---:|---|
| A — 0/1 vs 2/3 | 52.8% | 41.7% / 63.9% | 48.6% | +4.2pp | 50.0% | FAIL |
| B — 1 vs 2 | 47.2% | 33.3% / 61.1% | 44.4% | +2.8pp | 50.0% | FAIL |

Frozen required gate per task:

```text
balanced accuracy >= 70%
both recalls      >= 60%
DN margin         >= 20pp
```

Task A failed balanced accuracy, minimum recall, and DN margin.
Task B failed balanced accuracy, minimum recall, and DN margin.

Therefore:

```text
A FAIL
B FAIL
V15A6 FAIL
v15B BLOCKED
```

## Diagnostic results

| Task | FULL balanced accuracy | Recall 0 / 1 | DN_SHUFFLED | Margin | LABEL_SHUFFLED | Diagnostic |
|---|---:|---:|---:|---:|---:|---|
| C — 0 vs 3 | 52.8% | 38.9% / 66.7% | 52.8% | +0.0pp | 47.2% | FAIL |
| D — 0 vs 1 | 50.0% | 44.4% / 55.6% | 52.8% | -2.8pp | 52.8% | FAIL |
| E — 2 vs 3 | 50.0% | 38.9% / 61.1% | 50.0% | +0.0pp | 47.2% | FAIL |

Even the wide 0-vs-3 anchor was near chance and had no DN-identity margin under POOL48.

## Interpretation

The preregistered hypothesis was not supported.

Under this fresh-seed screen, collapsing the entire 4.8 s DN history to one mean value
per DN did **not** preserve the coarse potion-economic signal previously observed with
CONCAT48. Both required tasks and all three diagnostics were near chance, and the
DN_SHUFFLED controls were similarly near chance.

The safe conclusion is:

> POOL48 temporal-mean DN features are insufficient for the preregistered potion
> economic-state and nearest-boundary screens.

The result is consistent with informative injury burden being carried by temporal
structure that POOL48 discards, but v15A5 and v15A6 also use different fresh seed
cohorts and different representation-selection procedures. Therefore this experiment
alone does not prove that temporal averaging is the sole causal reason for the loss.

It also does not erase the earlier v15A5 evidence that CONCAT48 carried a coarse
0/1-vs-2/3 signal. The two results together establish a narrower constraint:

```text
CONCAT48: coarse burden signal observed; nearest 1-vs-2 boundary insufficient
POOL48:   coarse and local burden screens both insufficient
```

## Frozen outcome handling

No v15B implementation is permitted from this result.

Do not post-hoc:

- lower the 70% balanced-accuracy gate,
- lower the 60% recall gate,
- lower the +20pp DN-margin gate,
- increase top-256,
- extend the 4.8 s history,
- increase impact drive or pulse,
- change the v15A6 seeds and rerun the same hypothesis,
- remove Task B,
- use the diagnostic probe as a runtime POTION policy.

Any next experiment must be a separately motivated hypothesis with a new preregistration
committed before implementation.

Existing deployed MOVE v7, ATTACK v10F, JUMP v11H2, and v14C remain unchanged.
