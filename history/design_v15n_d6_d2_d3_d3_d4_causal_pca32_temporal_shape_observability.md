# design_v15n_d6_d2_d3_d3_d4_causal_pca32_temporal_shape_observability

## Question

v15N-D6-D2-D3-D3-D3-D1-D1 established:

```text
missComponentAxis       = DN_SUBTHRESHOLD_DOMINANT
scoreSeparabilityLabels = NO_SINGLE_SCORE_SEPARABILITY
```

The failed eventizer cannot be repaired by simple DN/old-scalar threshold tuning.

D4 therefore changes the diagnostic representation family rather than tuning the failed eventizer.

It asks:

> Does causal temporal shape across consecutive frozen PCA32 DN-innovation frames contain realized-impact information that a single current PCA32 frame does not?

The old-scalar gate is not used as a runtime feature or filter in D4.

---

## 1. frozen neural preprocessing

Use the exact frozen D6 phase-residualized DN frame and exact frozen label-free innovation PCA32:

```text
D6 detector weights
  5dc677cf4c14e398465af72cbcff784e40163cdf702064359e7f4648319c9eb5

innovation PCA32
  b187f3de9229e14260b8d1464e20fa3b8d26158a715a5372e4696c1bf3b7fb33

PCA dimension
  32

DN order
  frozen 1316 descending neurons
```

For each eligible frame t:

```text
z_t = PCA32(innovation_t)
```

where innovation_t is exactly the existing five-frame causal innovation:

```text
innovation_t = residual_t - mean(residual_(t-1) ... residual_(t-5))
```

---

## 2. feature families

### CURRENT_PCA32

```text
[ z_t ]
dimension = 32
```

### PCA32_TEMPORAL3

```text
[ z_(t-2), z_(t-1), z_t ]
dimension = 96
```

Only current and past neural frames are used.

No future neural frame, physical hit state, contact state, HP, time-since-hit, or oracle label enters either feature.

The comparison isolates whether preserving recent temporal shape adds information beyond the current innovation frame.

---

## 3. evaluator-only frame labels

Labels use physical hits only for TRAIN fitting and evaluation.

For every frame with enough history for PCA32_TEMPORAL3, compute evaluator-only nearest previous and future physical-hit ages.

Assign exactly one stratum:

### REALIZED_IMPACT

```text
a physical hit exists at or before frame t
and 0 <= frameStep - latestHitStep < 10 simulation steps
```

### PRE_HIT

```text
not REALIZED_IMPACT
and a future physical hit exists
and 0 < nextHitStep - frameStep < 10 simulation steps
```

### TRUE_BACKGROUND

```text
neither REALIZED_IMPACT nor PRE_HIT
```

Thus PRE_HIT is explicitly negative: predicting an upcoming impact is not the same as detecting an already realized impact.

---

## 4. diagnostic readout

For CURRENT_PCA32 and PCA32_TEMPORAL3 independently:

- standardize feature columns using all eligible TRAIN rows only, unweighted;
- deterministic ridge least-squares, lambda = 1e-3;
- intercept unregularized;
- threshold = 0.5;
- total TRAIN sample weight exactly 1/3 REALIZED_IMPACT, 1/3 PRE_HIT, 1/3 TRUE_BACKGROUND;
- no hyperparameter search.

Per-row weights:

```text
REALIZED_IMPACT  1 / (3 * N_realized)
PRE_HIT          1 / (3 * N_prehit)
TRUE_BACKGROUND  1 / (3 * N_background)
```

Both feature families use identical rows, labels, weighting, lambda, and threshold.

---

## 5. cohorts

TRAIN only:

```text
4081000 4091000 4101000
interruption 4147000
```

Fresh PROSPECTIVE_A:

```text
5271000 5281000 5291000 5301000
5311000 5321000 5331000 5341000
interruption 5357000
```

Fresh PROSPECTIVE_B:

```text
5361000 5371000 5381000 5391000
5401000 5411000 5421000 5431000
interruption 5447000
```

Exactly 64 tapes per prospective cohort.

None of the D3-D3 / R1 / D3-D3-D1 / D2 / D2-D1 / D3-D3-D3 / D1 / D1-D1 prospective cohorts may enter fitting or gate selection.

---

## 6. metrics

For each feature family and each prospective cohort report:

- REALIZED_IMPACT rows;
- PRE_HIT rows;
- TRUE_BACKGROUND rows;
- positive REALIZED_IMPACT recall;
- overall negative recall;
- PRE_HIT negative recall;
- TRUE_BACKGROUND negative recall;
- balanced accuracy;
- model SHA256.

---

## 7. support

For each prospective cohort require:

```text
64 tapes
REALIZED_IMPACT rows >= 1000
PRE_HIT rows >= 500
TRUE_BACKGROUND rows >= 500
```

Otherwise the experiment is support-inconclusive.

---

## 8. observability gates

A feature family passes only if all are >= 0.75 on both prospective cohorts:

```text
balanced accuracy
REALIZED_IMPACT recall
overall negative recall
PRE_HIT negative recall
TRUE_BACKGROUND negative recall
```

---

## 9. scientific role

If PCA32_TEMPORAL3 passes while CURRENT_PCA32 fails, causal temporal shape adds information unavailable from a single innovation frame and justifies a separately preregistered pulse eventizer using the frozen temporal readout.

If both pass, the new realized-impact/pre-hit/background training target itself is sufficient and the simpler current-frame representation is preferred.

If CURRENT_PCA32 passes while PCA32_TEMPORAL3 fails, temporal concatenation loses useful information.

If neither passes, the current frozen PCA32 innovation basis is insufficient even when temporal shape and explicit hard-negative labels are used.

All D4 readouts are diagnostic/nondeployable because labels use evaluator physical hits during TRAIN fitting.

No cumulative injury model or POTION policy is evaluated.
