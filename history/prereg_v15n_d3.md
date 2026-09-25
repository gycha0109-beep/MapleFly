# prereg_v15n_d3 — current-health observability audit

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / FRESH HOLDOUT COLLECTION / OUTCOME**

Frozen prerequisite:

```text
v15N-D2 outcome
  V15N_D2_INCONCLUSIVE

v15N-D2 receipt
  e39c06ea85ee9a43d38817a41fd3956eb343571d
```

Design:

```text
history/design_v15n_d3_health_observability.md
commit 5b14c0b73aaac03d38251515a953a6414f7fb8e9
```

No replacement policy is trained.

---

## 1. cohorts

TRAIN:

```text
4081000
4091000
4101000
```

Exact v15N EVAL:

```text
4111000
4121000
4131000
```

Original TRAIN->EVAL interruption RNG:

```text
4147000
```

Fresh v15N-D3 HOLDOUT:

```text
4211000
4221000
4231000
```

Fresh HOLDOUT interruption RNG:

```text
4247000
```

24 tapes per cohort.

---

## 2. frozen provenance

Require:

```text
v15N artifact
  10846125740

v15N evidence JSON sha256
  103e3ebc84e7d062394ec22608b533cfc135c89eedc766f7f7c682a6dcdcd1a4

v15N params sha256
  c3a2a2516296fb907834c3f6556afca1ea2f127a09e1b64d5ad46e4b00cbc5e5

v15N preprocessing sha256
  977aa76306c4aa387585c7cdea9a96de26296764ef98962565bd49935d6ccc83
```

Exact v15N EVAL FULL aggregate must reproduce to tolerance 1e-12.

EVAL and HOLDOUT lower-skill ecology must pass frozen v15N gates.

---

## 3. exhaustive reachable states

At decision d enumerate all 2^d prior own POTION histories.

Discard histories dead before d.

For every surviving state derive:

```text
PCA32
  from the frozen tape/decision

h2
  from the frozen v15N recurrence and prior own actions

current HP
  evaluator-only target source
```

No future contact schedule enters either primary label.

---

## 4. frozen labels

```text
CRITICAL
  y=+1 iff HP <=30
  y=-1 iff HP >30

FULL_HEAL_AVAILABLE
  y=+1 iff HP <=70
  y=-1 iff HP >70
```

No label threshold may change after results are observed.

---

## 5. probes

Feature sets:

```text
FULL34
  PCA32 + h2

NEURAL32
  PCA32

ACTION_STATE2
  h2
```

For each feature set:

1. compute TRAIN-only column means and standard deviations;
2. replace zero standard deviation with scale 1;
3. append intercept 1;
4. fit a class-balanced ridge least-squares classifier to y in {-1,+1}.

Class weight:

```text
positive state weight
  0.5 / N_positive

negative state weight
  0.5 / N_negative
```

Ridge:

```text
lambda
  1e-3

intercept
  not regularized
```

Solve the normal equations deterministically with partial-pivot Gaussian elimination.

Prediction:

```text
positive iff score > 0
tie -> negative
```

No hyperparameter search.

---

## 6. support

For every target:

```text
TRAIN positive >=500
TRAIN negative >=500
EVAL positive >=500
EVAL negative >=500
HOLDOUT positive >=500
HOLDOUT negative >=500
```

Also require >=12 mixed-class tapes in EVAL and HOLDOUT.

Failure:

```text
V15N_D3_INSUFFICIENT_HEALTH_STATE_SUPPORT
```

---

## 7. primary metrics

For every target, feature set, and evaluation cohort report:

```text
balanced accuracy
positive recall
negative recall
ordinary accuracy
macro tape balanced accuracy
```

Primary interpretation uses FULL34 only.

Define:

```text
criticalStable =
  EVAL CRITICAL FULL34 BA >=0.70
  AND HOLDOUT CRITICAL FULL34 BA >=0.70

fullHealStable =
  EVAL FULL_HEAL_AVAILABLE FULL34 BA >=0.70
  AND HOLDOUT FULL_HEAL_AVAILABLE FULL34 BA >=0.70
```

---

## 8. preregistered outcomes

Precedence top to bottom.

### Invalid

If provenance or ecology fails:

```text
V15N_D3_IMPLEMENTATION_OR_PROVENANCE_INVALID
```

### Insufficient support

If the support gate fails:

```text
V15N_D3_INSUFFICIENT_HEALTH_STATE_SUPPORT
```

### Both health bands linearly recoverable

If:

```text
criticalStable
AND
fullHealStable
```

then:

```text
V15N_D3_CURRENT_HEALTH_LINEARLY_RECOVERABLE
```

Interpretation: the frozen PCA32+h2 representation contains linearly accessible present-health information;
the v15N reward-only candidate did not discover/use that mapping.

### Partial health observability

If exactly one of criticalStable/fullHealStable is true:

```text
V15N_D3_PARTIAL_HEALTH_OBSERVABILITY
```

### Both clearly weak

If all four FULL34 values are below 0.60:

```text
EVAL CRITICAL
HOLDOUT CRITICAL
EVAL FULL_HEAL_AVAILABLE
HOLDOUT FULL_HEAL_AVAILABLE
```

then:

```text
V15N_D3_CURRENT_HEALTH_NOT_LINEARLY_RECOVERABLE
```

### Otherwise

```text
V15N_D3_INCONCLUSIVE
```

---

## 9. stop rule

Do not after seeing results:

- alter HP thresholds;
- alter ridge lambda;
- add polynomial/nonlinear features;
- alter cohort seeds;
- alter support or BA gates;
- reuse diagnostic probe weights as runtime policy weights;
- change v15N recurrence/PCA/reward/CEM;
- deploy v15N.

```text
POTION v15D
  DEPLOYED

v15N
  CLOSED / BLOCKED

v16C
  BLOCKED
```
