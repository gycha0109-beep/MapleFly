# design_v15n_d5_multiscale_injury_memory — causal cumulative-injury observability

## Why this diagnostic exists

v15K-D2 and v15M-D1 established that a real impact leaves stable episode-specific MaleCNS DN evidence for
roughly 0-2 seconds.

v15N-D4 asked a harder question from one frozen 2-second causal-trace snapshot: can that snapshot plus the
v15N own-action state reconstruct accumulated current HP? It did not demonstrate stable reconstruction on
unseen cohorts.

The unresolved distinction is now explicit:

```text
recent impact observable
versus
cumulative injury remembered across the episode
```

v15N-D5 tests that distinction directly, without POTION actions and without using HP/damage as runtime
features.

---

## 1. causal neural memory

At every 100 ms POTION neural frame, compute the same normalized all-1316-D MaleCNS frame:

```text
x_t[d] =
  clamp((DN_rate_t[d] - episode_baseline_rate[d]) / 50, -1, +1)
```

Maintain four causal exponential traces in parallel:

```text
half-life
  0.5 s
  2.0 s
  8.0 s
  32.0 s

lambda(H)
  2^(-0.1 / H)

trace_H,t
  lambda(H) * trace_H,t-1
  + (1-lambda(H)) * x_t
```

All traces start at zero and update continuously every 100 ms.

No damage/contact/HP/time-since-hit value enters a trace.

---

## 2. label-free representation

At each of the ten POTION decision boundaries concatenate:

```text
MULTISCALE_RAW
  trace_0.5
  trace_2
  trace_8
  trace_32
  = 5264 dimensions
```

Fit on TRAIN only:

- per-column mean/scale;
- label-free PCA32.

Comparator:

```text
SINGLE2_RAW
  existing 2.0 s trace
  = 1316 dimensions

SINGLE2_PCA32
  exact frozen v15N TRAIN-only PCA32
```

The 2.0 s component of MULTISCALE_RAW must reproduce the existing v15N trace snapshot numerically.

---

## 3. evaluator-only target

The runtime never receives damage count.

For each decision, the evaluator computes:

```text
cumulativeDamageBeforeDecision
  = 10 * number of real contact-damage events strictly before the decision
```

To remove the repeatable decision-position damage profile, fit TRAIN-only decision means:

```text
meanDamage[d]
```

Primary target:

```text
damageResidual
  = cumulativeDamageBeforeDecision - meanDamage[decisionIndex]
```

Thus a probe cannot succeed merely by learning "later decision => more damage".

No target-derived value enters the representation.

---

## 4. diagnostic probes

Fit deterministic TRAIN-only ridge regression from:

```text
MULTISCALE_PCA32 -> damageResidual
SINGLE2_PCA32    -> damageResidual
```

Frozen ridge:

```text
lambda = 1e-3
intercept not regularized
```

No hyperparameter search.

Diagnostic weights are not deployable.

---

## 5. episode-specific control

For EVAL and HOLDOUT, shift each episode's neural feature sequence to the next episode while preserving
decision index and the recipient episode's target.

Report the R2 drop:

```text
unshifted R2 - episode-shift R2
```

A useful cumulative injury memory must depend on the episode's own neural history, not a cohort-average
temporal profile.

---

## 6. scientific meaning

If MULTISCALE_PCA32 generalizes and materially beats SINGLE2_PCA32 with an episode-shift drop, then the
bottleneck is the single-timescale memory used by v15N, not absence of cumulative injury information from
MaleCNS.

If both remain weak, the tested label-free exponential memories do not turn the known short impact signal
into a stable cumulative-injury state.

This diagnostic does not train or deploy a POTION policy.

---

## 7. deployment

```text
POTION v15D
  DEPLOYED

v15N
  CLOSED / BLOCKED

v16C
  BLOCKED
```
