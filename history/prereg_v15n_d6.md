# prereg_v15n_d6 — mechanistic recent-impact evidence accumulator

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / FRESH HOLDOUT COLLECTION / OUTCOME**

Frozen prerequisite:

```text
v15N-D5
  V15N_D5_CUMULATIVE_INJURY_MEMORY_NOT_DEMONSTRATED

v15N-D5 receipt
  8d4c95cc524f037fac23517280720f4f84414595
```

Design:

```text
history/design_v15n_d6_mechanistic_impact_accumulator.md
commit c8ac0a6f5cc99bcaf856a226d324c73f9864d141
```

This is a diagnostic upper bound. No replacement POTION policy is trained.

---

## 1. cohorts

TRAIN:

```text
4081000
4091000
4101000
```

EVAL:

```text
4111000
4121000
4131000
```

Original TRAIN->EVAL interruption RNG:

```text
4147000
```

Fresh HOLDOUT:

```text
4351000
4361000
4371000
```

Fresh HOLDOUT interruption RNG:

```text
4387000
```

24 tapes per cohort.

---

## 2. frozen provenance

Require exact:

```text
v15N artifact
  10846125740

v15N evidence JSON sha256
  103e3ebc84e7d062394ec22608b533cfc135c89eedc766f7f7c682a6dcdcd1a4

v15N preprocessing sha256
  977aa76306c4aa387585c7cdea9a96de26296764ef98962565bd49935d6ccc83
```

Exact frozen v15N EVAL FULL aggregate must reproduce to tolerance 1e-12.

EVAL and fresh HOLDOUT lower-skill ecology must pass frozen v15N gates.

---

## 3. 100 ms neural frames

Record every normalized all-1316-D POTION frame before any evaluator label is attached.

Expected support:

```text
480 frames per tape
11520 frames per cohort
```

The neural frame is:

```text
x_t[d] =
  clamp((DN_rate_t[d] - episode_baseline_rate[d]) / 50, -1, +1)
```

---

## 4. TRAIN-only phase residualization

Frame phase:

```text
phase = frameIndex mod 48
```

Fit TRAIN-only phase means over all TRAIN tapes and all ten cycles.

Require exactly:

```text
240 TRAIN frames per phase
```

Residual:

```text
r_t = x_t - phaseMean[phase]
```

---

## 5. evaluator-only impact labels

Most recent real contact-damage event at or before the neural frame:

```text
ageSteps = frame.step - latestDamageEvent.step
```

Positive:

```text
0 <= ageSteps < 10
```

because 10 brain steps = 200 ms.

Negative:

```text
no prior damage event
OR ageSteps >= 100
```

because 100 brain steps = 2.0 s.

Frames with:

```text
10 <= ageSteps < 100
```

are excluded from detector fitting/evaluation.

Support guard in each cohort:

```text
positive frames >= 500
negative frames >= 2000
at least 20 tapes contain positive support
```

Otherwise:

```text
V15N_D6_IMPLEMENTATION_OR_SUPPORT_INVALID
```

---

## 6. frozen TRAIN-only impact direction

```text
positiveMean = mean(TRAIN positive residuals)
negativeMean = mean(TRAIN negative residuals)

w = normalize(positiveMean - negativeMean)

positiveProjectedMean = mean(dot(w, positive residual))
negativeProjectedMean = mean(dot(w, negative residual))

threshold =
  (positiveProjectedMean + negativeProjectedMean) / 2

separation =
  positiveProjectedMean - negativeProjectedMean
```

Require:

```text
separation > 0
```

No classifier optimization or threshold search.

---

## 7. detector metrics

For TRAIN / EVAL / HOLDOUT report:

```text
balanced accuracy
positive recall
negative recall
positive support
negative support
```

Define:

```text
detectorStable =
  EVAL BA >=0.75
  AND HOLDOUT BA >=0.75
  AND EVAL positive recall >=0.65
  AND HOLDOUT positive recall >=0.65
  AND EVAL negative recall >=0.65
  AND HOLDOUT negative recall >=0.65
```

---

## 8. causal evidence accumulator

For every neural frame, regardless of evaluator label:

```text
margin_t = dot(w, r_t) - threshold

e_t =
  max(0, margin_t) / separation

A_0 = 0
A_t = A_t-1 + e_t
```

No oracle reset. No contact counter. No HP. No damage count.

At each decision snapshot store the current scalar A.

---

## 9. residual target and evidence

TRAIN-only decision-position means:

```text
meanEvidence[d]
meanDamage[d]
```

At each decision:

```text
evidenceResidual =
  A - meanEvidence[d]

damageResidual =
  cumulativeDamageBeforeDecision - meanDamage[d]
```

Require damageResidual SD >=5 HP in TRAIN, EVAL, HOLDOUT.

---

## 10. one-dimensional calibration

Fit on TRAIN only:

```text
damageResidual =
  beta * evidenceResidual + intercept
```

Ridge:

```text
lambda = 1e-3
intercept unregularized
```

No hyperparameter search.

Report TRAIN / EVAL / HOLDOUT:

```text
R2
MAE
RMSE
Pearson r
beta
intercept
```

Define:

```text
accumulatorStable =
  EVAL R2 >=0.30
  AND HOLDOUT R2 >=0.30
  AND EVAL MAE <=10
  AND HOLDOUT MAE <=10
```

---

## 11. episode-shift control

For EVAL and HOLDOUT, replace each recipient episode's evidenceResidual sequence with the next episode's
sequence at the same decision index. Keep recipient damageResidual unchanged.

Define:

```text
episodeSpecific =
  EVAL (unshifted R2 - shifted R2) >=0.15
  AND HOLDOUT (unshifted R2 - shifted R2) >=0.15
```

---

## 12. preregistered outcomes

Precedence top to bottom.

### Invalid

Any provenance, ecology, support, phase-count, or separation failure:

```text
V15N_D6_IMPLEMENTATION_OR_SUPPORT_INVALID
```

### Mechanistic cumulative injury state present

If:

```text
detectorStable
AND accumulatorStable
AND episodeSpecific
```

then:

```text
V15N_D6_MECHANISTIC_CUMULATIVE_INJURY_STATE_PRESENT
```

### Decoding is not episode-specific

If:

```text
detectorStable
AND accumulatorStable
AND NOT episodeSpecific
```

then:

```text
V15N_D6_NON_EPISODE_SPECIFIC_ACCUMULATION
```

### Recent impact stable, accumulation not demonstrated

If:

```text
detectorStable
AND NOT accumulatorStable
```

then:

```text
V15N_D6_IMPACT_DETECTABLE_BUT_ACCUMULATOR_NOT_DEMONSTRATED
```

### Impact detector does not transfer

If:

```text
NOT detectorStable
```

then:

```text
V15N_D6_IMPACT_DETECTOR_NOT_STABLE_ON_V15N_COHORTS
```

Otherwise:

```text
V15N_D6_INCONCLUSIVE
```

---

## 13. stop rule

After first authoritative result do not change:

- cohorts/seeds;
- positive/negative age bands;
- phase residualization;
- mean-difference direction;
- threshold;
- evidence rectification/normalization;
- accumulator;
- ridge lambda;
- support thresholds;
- scientific gates.

Do not deploy the oracle-trained impact direction.
Do not train a replacement POTION policy.
Do not modify v15D.

```text
POTION v15D
  DEPLOYED

v15N
  CLOSED / BLOCKED

v16C
  BLOCKED
```
