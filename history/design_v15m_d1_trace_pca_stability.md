# design_v15m_d1 — cross-cohort causal-trace PCA stability audit

## Purpose

v15M closed with:

```text
TRAIN survival
  83.3%

fresh EVAL survival
  16.7%

NEURAL_OFF EVAL survival
  100%

DECISION_MEAN_NEURAL EVAL survival
  0%
```

The recurrent own-action state did not satisfy its causal contribution gates. The dominant failure signature
remained neural and cross-cohort.

v15M-D1 asks a narrower representation question before any new policy is trained:

> Does the 2-second causal DN trace contain a stable recent-impact signal at actual POTION decision
> snapshots across cohorts, and if so does TRAIN-only PCA32 preserve that signal?

This is a diagnostic only.

---

## 1. diagnostic label

At every ordinary 4.8-second POTION decision snapshot:

```text
RECENT_IMPACT_2S = 1
  iff at least one actual contact/damage event occurred
  in the preceding 2.0 seconds

RECENT_IMPACT_2S = 0
  otherwise
```

Contact timestamps are evaluator labels only.

They are never fed into the runtime representation.

The 2.0-second label window is frozen to match the causal neural trace half-life and is not selected after
seeing accuracy.

---

## 2. representations compared

### RAW_TRACE_1316

The current 1316-D causal trace snapshot after TRAIN-only per-DN standardization.

### PCA32

The exact v15M recipe:

```text
TRAIN-only standardization
label-free deterministic PCA32
80 power iterations/component
PCA seed base 3948000
```

No policy weights are involved.

---

## 3. fixed diagnostic probe

For each representation, fit on v15M TRAIN only:

```text
positive centroid
negative centroid

direction =
  positive centroid - negative centroid

threshold =
  midpoint between the two TRAIN centroid projections
```

This is the same simple mean-difference style of diagnostic used to avoid a high-capacity classifier.

The probe is frozen after TRAIN fitting and applied unchanged to:

```text
v15M TRAIN
v15M EVAL
fresh HOLDOUT
```

Metric:

```text
balanced accuracy
positive recall
negative recall
```

---

## 4. episode-alignment control

For EVAL and HOLDOUT separately:

```text
EPISODE_SHIFT_1
  replace each episode's complete ten-vector neural sequence
  with the next episode's sequence
  while retaining the target episode's RECENT_IMPACT_2S labels
```

A stable biological signal should degrade when episode alignment is broken.

---

## 5. interpretation matrix

The diagnostic distinguishes three mechanisms.

### A. raw trace stable, PCA unstable

This supports:

```text
PCA32 is discarding or rotating away a cross-cohort recent-impact direction that is still available in the
full causal DN trace
```

### B. raw trace and PCA both stable

This supports:

```text
the v15M representation still contains a cross-cohort recent-impact signal;
the dominant failure lies downstream in reward-only policy optimization / decision-state construction
```

### C. raw trace itself unstable at decision snapshots

This supports:

```text
the 2-second causal trace sampled only every 4.8 seconds does not provide a sufficiently stable
recent-impact signal across cohorts, even though v15K-D2 found strong impact-locked information in the
100 ms stream
```

That would point back to temporal sampling/retention rather than PCA or CEM.

---

## 6. boundary

This diagnostic does not establish HP decoding.

RECENT_IMPACT_2S is only a controlled proxy for recent injury-aligned biological evidence.

Do not train a replacement POTION policy inside v15M-D1.
Do not change deployed v15D.
Do not unblock v16C.
