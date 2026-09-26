# design_v15n_d6_d2_d2_reimpact_onset_observability

## Question

v15N-D6-D2-D1 froze:

```text
V15N_D6_D2_D1_EVENTIZER_LOCKOUT_DOMINANT
```

In both EVAL and HOLDOUT, every physical hit had at least one positive frozen-D6 detector frame in the 0-200 ms recent window, yet the fixed D2 armed/disarmed eventizer suppressed most later hits.

D6-D2-D2 asks:

> While an earlier impact response is still present, does a new physical impact create a causal neural onset / innovation signature that distinguishes the new impact from ongoing post-impact or background activity?

This is an observability diagnostic only. It does not construct or deploy a replacement eventizer.

---

## 1. frozen prerequisite

Exact D2-D1 evidence:

```text
run
  36201795474

artifact
  10893121955

artifact digest
  sha256:42461e3bd2f2582c826840a1425f347986b1e1698c465267b085a4e9685976f7

v15n_d6_d2_d1.json sha256
  89da8a8d4bd77e798cf778f702275c7e4205cc933f7ce3a3341ea5b83a3ea63f

outcome
  V15N_D6_D2_D1_EVENTIZER_LOCKOUT_DOMINANT
```

Freeze the exact D6 detector and D6 TRAIN-only phase residualization.

---

## 2. cohorts

```text
TRAIN
  4081000 4091000 4101000

EVAL
  4111000 4121000 4131000

fresh HOLDOUT
  4431000 4441000 4451000

TRAIN->EVAL interruption RNG
  4147000

fresh HOLDOUT interruption RNG
  4467000
```

24 tapes per cohort.

The previous D2-D1 HOLDOUT is not used for final D2-D2 gating.

---

## 3. causal feature families

All features are functions only of current and past frozen MaleCNS DN activity.

No HP, damage/contact flag, damage count, contact age, decision index, correct action, future damage, or oracle injury state enters a feature.

### 3.1 SCALAR_ONSET

Let `m_t` be the exact frozen D6 detector margin for a 100 ms neural frame.

For each eligible frame:

```text
m_t
delta1_t = m_t - m_(t-1)
delta5_t = m_t - mean(m_(t-1) ... m_(t-5))
peakRise5_t = m_t - max(m_(t-1) ... m_(t-5))
```

Feature dimension: 4.

The first five neural frames of each episode are excluded because the causal history is incomplete.

### 3.2 DN_INNOVATION_PCA32

Let `r_t` be the 1316-D exact D6 phase-residualized neural frame.

```text
baseline_t = mean(r_(t-1) ... r_(t-5))
innovation_t = r_t - baseline_t
```

Fit standardization and PCA32 using TRAIN innovation vectors only.

Feature dimension presented to the diagnostic readout: 32.

---

## 4. evaluator-only onset labels

Labels are used only to ask whether the frozen neural representation contains onset information. They are not runtime features.

### POSITIVE

For each physical damage event, select the first eligible neural frame whose step is at or after the hit and less than 100 ms after the hit.

At most one positive frame is selected per physical hit.

### NEGATIVE_LINGER

Eligible frames satisfying:

```text
0.5 s <= age since most recent physical hit < 2.0 s
AND
no new physical hit occurred within the preceding 100 ms
```

### NEGATIVE_BACKGROUND

Eligible frames with:

```text
no previous physical hit
OR
age since most recent physical hit >= 2.0 s
```

The 0.1-0.5 s post-hit interval is excluded from negatives to avoid labeling the immediate onset response itself as a negative example.

---

## 5. diagnostic readout

For each feature family independently:

```text
TRAIN-only feature standardization
class-balanced deterministic ridge least squares
lambda = 1e-3
decision threshold = 0.5
```

No hyperparameter or threshold search.

Report:

- balanced accuracy;
- positive/re-impact recall;
- negative recall;
- LINGER negative recall;
- BACKGROUND negative recall.

---

## 6. suppressed re-impact subset

Using the exact frozen D2 eventizer only for evaluator-side attribution, mark a physical hit as a suppressed re-impact when:

- the frozen D6 detector has a positive frame in 0-200 ms after the hit; and
- the frozen D2 eventizer emits no event in that same window.

For each feature family report diagnostic onset recall on these suppressed re-impacts.

This subset directly tests the blocker found in D2-D1.

---

## 7. scientific role

A positive result means an onset-sensitive causal neural representation exists under the diagnostic oracle-labelled evaluation.

It does not make the D6 detector deployable, because the D6 detector direction itself was trained using evaluator-only impact labels.

No replacement POTION policy is trained.
No eventizer is deployed.
v15D is unchanged.
