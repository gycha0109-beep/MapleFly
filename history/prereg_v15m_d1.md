# prereg_v15m_d1 — cross-cohort causal-trace PCA stability audit

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / HOLDOUT COLLECTION / OUTCOME**

Frozen prerequisite:

```text
v15M receipt closure
  ac0c5c995ec48bfc1ef9c2ef0bd8580f03acf958

v15M outcome
  V15M_PERSISTENT_NEURAL_ACTION_BELIEF_FAIL
```

Design:

```text
history/design_v15m_d1_trace_pca_stability.md
commit c20d1e2c5dd890f98e740ab4d3523de7d86c2721
```

No replacement policy is trained.

---

## 1. cohorts

Reconstruct the exact frozen v15M cohorts:

TRAIN:

```text
3871000
3881000
3891000
```

EVAL:

```text
3901000
3911000
3921000
```

Use the exact v15M interruption RNG stream:

```text
3937000
```

Collect TRAIN first and EVAL second with the same deterministic RNG object, matching v15M.

Fresh HOLDOUT:

```text
3961000
3971000
3981000
```

HOLDOUT interruption RNG:

```text
3997000
```

Expected:

```text
24 TRAIN tapes
24 EVAL tapes
24 HOLDOUT tapes
240 decision snapshots / cohort
```

---

## 2. frozen trace

Use the exact v15M causal trace:

```text
100 ms DN frames
1316 DNs
episode-baseline relative
divide by 50
clamp [-1,+1]

trace half-life
  2.0 s

lambda
  0.9659363289248456
```

No contact/damage/HP value may enter the trace update.

---

## 3. frozen label

At each decision step d:

```text
RECENT_IMPACT_2S = 1
  iff exists damage event e such that

  d - 2.0 seconds <= e.step < d

RECENT_IMPACT_2S = 0
  otherwise
```

A contact exactly at the decision step is excluded because it has not yet causally preceded that decision
observation.

The window is exactly 2.0 seconds.

Do not sweep it.

---

## 4. TRAIN-only preprocessing

Per-DN standardization from TRAIN trace snapshots only:

```text
mean
std
scale floor 1e-6
```

RAW_TRACE_1316 is this standardized vector.

PCA32 is fit on the same standardized TRAIN rows:

```text
components
  32

power iterations
  80

seed base
  3948000
```

This must reproduce the v15M preprocessing recipe.

No labels enter PCA.

---

## 5. fixed centroid probe

For RAW_TRACE_1316 and PCA32 independently:

Using TRAIN only:

```text
mu_pos
  mean vector of RECENT_IMPACT_2S positives

mu_neg
  mean vector of RECENT_IMPACT_2S negatives

direction
  mu_pos - mu_neg

threshold
  0.5 * (
    dot(mu_pos, direction)
    + dot(mu_neg, direction)
  )
```

Prediction:

```text
positive iff dot(x, direction) >= threshold
```

No logistic regression, no hyperparameter search, no label-selected feature subset.

Apply the frozen TRAIN probe unchanged to TRAIN, EVAL, and HOLDOUT.

---

## 6. metrics

For each representation/cohort report:

```text
positive support
negative support
balanced accuracy
positive recall
negative recall
```

Also report:

```text
TRAIN -> EVAL BA drop
TRAIN -> HOLDOUT BA drop
```

---

## 7. episode-shift control

For EVAL and HOLDOUT:

Circularly shift complete ten-vector neural sequences by one episode.

Target labels remain attached to the original episode.

Use the same frozen TRAIN probe.

Report:

```text
shifted BA
aligned BA - shifted BA
```

No retraining.

---

## 8. lower-skill ecology validity

EVAL and HOLDOUT must each satisfy:

```text
episodes with >=3 kills          >= 75%
obstacle clear                   >= 85%
target kill                      >= 70%
LEFT target kill                 >= 65%
RIGHT target kill                >= 65%
attack precision                 >= 45%
airborne attack                  <= 22%
post-clear jump encounter        <= 25%
pre-clear attack encounter       <= 30%
```

If either cohort fails:

```text
V15M_D1_IMPLEMENTATION_OR_ECOLOGY_INVALID
```

---

## 9. preregistered outcome matrix

Define RAW stable on HOLDOUT as both:

```text
RAW HOLDOUT BA >= 65%
RAW HOLDOUT aligned-minus-shifted BA >= 10 pp
```

Define PCA stable on HOLDOUT as both:

```text
PCA HOLDOUT BA >= 65%
PCA HOLDOUT aligned-minus-shifted BA >= 10 pp
```

Define strong PCA degradation as either:

```text
PCA HOLDOUT BA < 60%
OR
TRAIN -> HOLDOUT PCA BA drop >= 15 pp
```

### Outcome A

If RAW is stable and strong PCA degradation is true:

```text
V15M_D1_PCA_BOTTLENECK_SUPPORTED
```

### Outcome B

If RAW is stable and PCA is stable:

```text
V15M_D1_TRACE_AND_PCA_SIGNAL_STABLE
```

### Outcome C

If RAW is not stable:

```text
V15M_D1_DECISION_TRACE_SIGNAL_UNSTABLE
```

### Otherwise

```text
V15M_D1_INCONCLUSIVE
```

No threshold is changed after seeing results.

---

## 10. support guard

Each cohort must contain at least:

```text
30 positive snapshots
30 negative snapshots
```

If support is insufficient:

```text
V15M_D1_INSUFFICIENT_LABEL_SUPPORT
```

No scientific mechanism conclusion is drawn.

---

## 11. stop rule

Do not in v15M-D1:

- train or tune a POTION policy;
- change the recent-impact window;
- change trace half-life;
- change PCA width;
- select PCs using labels;
- tune the probe;
- alter outcome thresholds;
- add HP or potion-use labels to the probe;
- modify deployed v15D.

```text
POTION v15D
  deployed

v15M
  blocked

v16C
  blocked
```
