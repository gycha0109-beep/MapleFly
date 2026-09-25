# prereg_v15n_d6_d1 — neural eventization failure attribution

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / OUTCOME**

Frozen prerequisite:

```text
v15N-D6
  V15N_D6_IMPACT_DETECTABLE_BUT_ACCUMULATOR_NOT_DEMONSTRATED

v15N-D6 receipt
  07eaa3c9af9d1104031faf500486381f57eec3f7
```

Design:

```text
history/design_v15n_d6_d1_neural_eventization_failure_attribution.md
commit ece6eee47a5ba7b236bb75a5a0cd6f4afc8317fc
```

No replacement policy or detector is trained.

---

## 1. cohorts

Reuse the exact D6 cohorts:

```text
TRAIN
  4081000 4091000 4101000

EVAL
  4111000 4121000 4131000

HOLDOUT
  4351000 4361000 4371000

TRAIN->EVAL interruption RNG
  4147000

HOLDOUT interruption RNG
  4387000
```

24 tapes and 11520 neural frames per cohort.

No fresh holdout is needed because this is attribution of the already-frozen D6 failure, not selection of a replacement model.

---

## 2. exact D6 detector reproduction

Require exact authoritative D6 artifact:

```text
artifact
  10888904036

artifact digest
  sha256:9b71847f20da22751db3a8a6b21df9d06ff3cda82095dd5fcc6a863504a6f6d6

v15n_d6.json sha256
  4d83e773948a98f234b2e14e7145914007c3584277064f4440153b0489b94285
```

Reproduce detector and require:

```text
threshold absolute error <= 1e-12
separation absolute error <= 1e-12
weights sha256 exact
  5dc677cf4c14e398465af72cbcff784e40163cdf702064359e7f4648319c9eb5
```

Also reproduce D6 detector metrics and accumulator metrics to 1e-12.

Any failure invalidates D1.

---

## 3. attribution categories

Using evaluator-only latest real damage age:

```text
RECENT
  0 <= ageSteps < 10

LINGER
  10 <= ageSteps < 100

BACKGROUND
  no prior damage
  OR ageSteps >= 100
```

Frame evidence is frozen D6:

```text
e = max(0, margin) / separation
```

---

## 4. per-hit assignment

Every positive-evidence frame with ageSteps <100 is assigned to the most recent real damage event.

For each real damage event:

```text
positiveFrameCount
totalEvidenceMass
firstPositiveLatencySteps
duplicateEvidenceMass
```

where duplicate evidence is all assigned evidence after the first supra-threshold frame for that physical hit.

---

## 5. frozen mechanism flags

For EVAL and HOLDOUT separately:

```text
backgroundLeakageHigh
  backgroundMassFraction >= 0.25

multiCountHigh
  duplicateMassFraction >= 0.50
  AND median positiveFrameCountPerHit >= 2

amplitudeUnstable
  perHitEvidenceCV >= 0.75
```

Cross-cohort amplitude shift:

```text
amplitudeShift
  HOLDOUT meanHitEvidence / EVAL meanHitEvidence < 0.80
  OR > 1.25
```

Global flags require the condition in both EVAL and HOLDOUT, except amplitudeShift which is inherently cross-cohort.

---

## 6. preregistered outcomes

Precedence:

### Invalid

```text
V15N_D6_D1_IMPLEMENTATION_OR_PROVENANCE_INVALID
```

### Background + temporal multicount

If global backgroundLeakageHigh and global multiCountHigh:

```text
V15N_D6_D1_BACKGROUND_AND_MULTICOUNT_FAILURE
```

### Background leakage

If global backgroundLeakageHigh only:

```text
V15N_D6_D1_BACKGROUND_LEAKAGE_FAILURE
```

### Temporal multicount

If global multiCountHigh only:

```text
V15N_D6_D1_TEMPORAL_MULTICOUNT_FAILURE
```

### Amplitude instability

If neither above and either global amplitudeUnstable or amplitudeShift:

```text
V15N_D6_D1_HIT_AMPLITUDE_INSTABILITY
```

### Otherwise

```text
V15N_D6_D1_NO_SINGLE_EVENTIZATION_FAILURE_DOMINATES
```

The outcome is diagnostic attribution, not a deployment decision.

---

## 7. stop rule

After the first authoritative result do not change:

- D6 detector;
- cohorts;
- age bands;
- attribution categories;
- 0.25 background threshold;
- 0.50 duplicate-mass threshold;
- median frame-count threshold;
- 0.75 CV threshold;
- 0.80/1.25 cross-cohort amplitude-ratio thresholds.

Do not deploy D6 detector weights.
Do not modify v15D.

```text
POTION v15D
  DEPLOYED

v15N
  CLOSED / BLOCKED

v16C
  BLOCKED
```
