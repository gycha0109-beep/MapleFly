# result_v15n_d6_d2_d3_d2 — conditional re-impact innovation observability

## Status

```text
V15N_D6_D2_D3_D2_INSUFFICIENT_CONDITIONAL_SUPPORT
```

Authoritative evidence:

```text
run
  36269933164

head
  57c6bda8a8d52025c00e8d0ab5d2bd7fa42b8226

artifact
  10915626754

artifact digest
  sha256:edf821f959746bda8a757e895779d18ac1953fc33457a9635a5d1113facaae5c

v15n_d6_d2_d3_d2.json sha256
  e0d51061e0d32f2bdf373da213e71c4758258c9df236cf9238b604c91c598347
```

Preregistration:

```text
c62c85ac624e5d13e66b7be2b015ce4c9fbb4d81
```

Implementation/workflow:

```text
0dd74c0766910a997db06ae90695d9fcc73cadd1
57c6bda8a8d52025c00e8d0ab5d2bd7fa42b8226
```

## Support

```text
EVAL
  POSITIVE_REIMPACT      501
  NEGATIVE_LINGER        795
  NEGATIVE_BACKGROUND    237  FAIL (<500)

fresh HOLDOUT
  POSITIVE_REIMPACT      495
  NEGATIVE_LINGER        801
  NEGATIVE_BACKGROUND    231  FAIL (<500)
```

Therefore the preregistered support gate failed before observability outcome evaluation.

## Descriptive metrics only

These metrics are reported but are not an authoritative observability PASS/FAIL because support failed.

```text
DERIVATIVE3 EVAL
  BA                   0.712186
  positive recall      0.798403
  negative recall      0.625969
  LINGER recall        0.796226
  BACKGROUND recall    0.054852

DERIVATIVE3 HOLDOUT
  BA                   0.720974
  positive recall      0.787879
  negative recall      0.654070
  LINGER recall        0.832709
  BACKGROUND recall    0.034632

SCALAR4 EVAL
  BA                   0.711635
  positive recall      0.760479
  negative recall      0.662791
  BACKGROUND recall    0.206751

SCALAR4 HOLDOUT
  BA                   0.704319
  positive recall      0.731313
  negative recall      0.677326
  BACKGROUND recall    0.155844
```

DERIVATIVE3 post-hit multiplicity remained high: about 1.65 predicted-positive frames per qualifying hit, median 2, with ~69.9% of qualifying hits producing multiple positive frames.

## Interpretation

The experiment is formally inconclusive because the previous-positive BACKGROUND state is uncommon and did not reach the preregistered 500-example support floor.

The next valid step is a support-only prospective replication: freeze the exact D6 detector, old scalar model, DERIVATIVE3/SCALAR4 readouts, thresholds, labels, and gates, and evaluate them on substantially larger entirely fresh cohorts. No model or threshold may be changed.

## Deployment

```text
POTION v15D
  DEPLOYED

v15N
  CLOSED / BLOCKED

v15N-D6-D2-D3-D2
  DIAGNOSTIC INCONCLUSIVE — SUPPORT

v16C
  BLOCKED
```
