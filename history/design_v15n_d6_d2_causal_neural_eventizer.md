# design_v15n_d6_d2_causal_neural_eventizer — collapse sustained impact responses into events

## Why this diagnostic exists

v15N-D6-D1 froze:

```text
V15N_D6_D1_TEMPORAL_MULTICOUNT_FAILURE
```

The frozen D6 detector transfers across cohorts, but one physical hit produces a median of six positive neural frames and roughly 80% of hit-attributed evidence mass arrives after the first positive frame. Background leakage and amplitude drift did not meet their frozen failure gates.

D6-D2 therefore tests one mechanistic change only:

> replace frame-wise evidence summation with a causal armed/disarmed neural eventizer.

The D6 detector itself remains exactly frozen and non-deployable.

---

## 1. frozen neural detector

Every 100 ms:

```text
margin_t = dot(w_D6, phaseResidual_t) - threshold_D6
positive_t = margin_t > 0
```

Exact frozen D6 detector:

```text
threshold
  0.1367936045430042

separation
  0.7830625725367281

weights sha256
  5dc677cf4c14e398465af72cbcff784e40163cdf702064359e7f4648319c9eb5
```

No threshold or detector refit is allowed.

---

## 2. causal eventizer

State:

```text
armed = true
negativeRun = 0
eventCount = 0
```

At each neural frame:

```text
if positive:
  negativeRun = 0

  if armed:
    emit one neural event
    eventCount += 1
    armed = false

else:
  negativeRun += 1

  if negativeRun >= 3:
    armed = true
```

Thus a sustained positive response produces one event. The detector must remain non-positive for three consecutive 100 ms frames before another event can be emitted.

The three-frame re-arm is fixed before the D2 outcome and is not tuned.

No HP, damage event, contact age, decision index, or oracle state enters the eventizer.

---

## 3. event-level evaluator audit

Evaluator-only physical damage events are used after the fact.

A neural event is a true-positive event iff it occurs:

```text
0 <= neuralEventStep - physicalHitStep < 10 brain steps
```

for at least one physical hit.

A physical hit is recalled iff at least one neural event occurs in that same 0-200 ms window.

Report per cohort:

- neural event count;
- physical hit count;
- event precision;
- hit recall;
- F1;
- false neural events per episode.

These labels are evaluator-only.

---

## 4. cumulative count audit

At every POTION decision snapshot compare:

```text
neural cumulative event count
physical cumulative hit count
```

Report direct:

- MAE in hit-count units;
- RMSE;
- Pearson r;
- mean signed count error.

To prevent a repeatable episode-time profile from passing, also fit TRAIN-only decision-position means:

```text
meanNeuralEvents[d]
meanPhysicalHits[d]
```

and define:

```text
neuralResidual =
  neuralEventCount - meanNeuralEvents[d]

hitResidual =
  physicalHitCount - meanPhysicalHits[d]
```

Use neuralResidual directly as the prediction of hitResidual. There is no fitted scalar readout.

Report residual R2 / MAE / RMSE / Pearson.

---

## 5. episode-shift control

For EVAL and fresh HOLDOUT, replace each recipient episode's neuralResidual sequence with the next episode's neuralResidual sequence at the same decision index while keeping recipient hitResidual unchanged.

This tests whether cumulative neural event count carries episode-specific injury history rather than only decision-position structure.

---

## 6. scientific role

D6-D2 is still an upper-bound diagnostic because D6 detector weights were trained from evaluator-only impact labels.

A positive D2 result would establish that the temporal-multicount failure can be corrected by a purely causal neural eventization mechanism once a stable impact direction exists.

It would **not** make the D6 detector deployable. A later experiment would still need to obtain an impact-sensitive state without oracle-labelled detector training.

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
