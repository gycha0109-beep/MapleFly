# prereg_v15n_d1 — frozen neural-readout alignment audit

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / DIAGNOSTIC OUTCOME**

Frozen prerequisite:

```text
v15N outcome
  V15N_NONLINEAR_ACTION_RECURRENCE_FAIL

v15N receipt
  737bd55905d5d6fdffd8f15c82d9b45f6d32e372

v15N artifact
  10846125740

v15n_training.json sha256
  103e3ebc84e7d062394ec22608b533cfc135c89eedc766f7f7c682a6dcdcd1a4
```

Design:

```text
history/design_v15n_d1_policy_mapping.md
commit 9b50dbfaa1d2e1eb00734cd6f7e88d9443e41ea1
```

No replacement policy is trained.

---

## 1. exact frozen candidate

Require:

```text
policy parameter count
  41

policy params sha256
  c3a2a2516296fb907834c3f6556afca1ea2f127a09e1b64d5ad46e4b00cbc5e5

recurrent bias
  [0,0]
```

Load parameters from the authoritative v15N evidence artifact.

Do not copy, refit, or optimize them from diagnostic labels.

---

## 2. exact cohort reproduction

```text
TRAIN base seeds
  4081000
  4091000
  4101000

EVAL base seeds
  4111000
  4121000
  4131000

interruption RNG
  4147000
```

TRAIN collection precedes EVAL collection using the same deterministic interruption RNG object.

Require exact preprocessing SHA256:

```text
977aa76306c4aa387585c7cdea9a96de26296764ef98962565bd49935d6ccc83
```

Reproduce the v15N FULL and endogenous DECISION_MEAN_NEURAL aggregate metrics to floating tolerance
`1e-12`. A mismatch invalidates the diagnostic.

---

## 3. evaluator-only forced-action oracle

At each state actually reached by the FULL frozen candidate:

1. preserve the candidate's prior own-action history and resulting hidden HP;
2. enumerate all remaining binary action sequences from the current decision onward;
3. among surviving sequences, find minimum remaining potion uses;
4. classify the first action among all minimum-use surviving sequences.

Classes:

```text
FORCED_WAIT
FORCED_DRINK
EITHER
UNSURVIVABLE
```

Only FORCED_WAIT and FORCED_DRINK enter the primary alignment metrics.

Oracle state is never provided to the policy.

---

## 4. frozen score decomposition

For each FULL-reachable decision:

```text
bias
neuralTerm
actionStateTerm
totalScore
action
decisionIndex
oracleClass
```

TRAIN decision-position neural means are computed from the frozen neural readout:

```text
meanNeuralScore[d]
```

Episode-specific residual:

```text
residual =
  neuralTerm - meanNeuralScore[d]
```

No label enters this calculation.

---

## 5. residual AUC

For each cohort independently:

```text
AUC =
  P(residual(FORCED_DRINK) > residual(FORCED_WAIT))
  + 0.5 * ties
```

Also report AUC by decision index where both forced classes have at least 5 examples.

No threshold is fitted.

Support guard for the cohort-level primary AUC:

```text
FORCED_WAIT  >=30
FORCED_DRINK >=30
```

---

## 6. paired one-step decision-mean counterfactual

At each FULL-reachable forced state:

- keep evaluator hidden state unchanged;
- keep recurrent h unchanged;
- keep bias unchanged;
- replace only current `neuralTerm` with `meanNeuralScore[d]`;
- recompute the immediate action.

Report:

```text
FULL forced-state agreement
MEAN one-step forced-state agreement
agreement delta

WAIT -> DRINK flips
DRINK -> WAIT flips
correcting flips
harmful flips
neutral forced-class flips
```

No future rollout is used for this paired metric.

Separately reproduce the original endogenous DECISION_MEAN_NEURAL rollout only as a provenance check.

---

## 7. action-state magnitude

For TRAIN and EVAL report:

```text
mean abs neuralTerm
mean abs actionStateTerm
mean abs residual
actionState/neural magnitude ratio
```

Also report these by decision index.

Round hidden states to 6 decimal places only for descriptive unique-state counts; no rounded value enters a
scientific gate.

---

## 8. ecology and provenance invalidation

The diagnostic is invalid if:

- v15N artifact/hash/parameter hash mismatches;
- v15N preprocessing hash does not reproduce;
- v15N aggregate FULL or DECISION_MEAN_NEURAL metrics do not reproduce;
- EVAL lower-skill ecology fails the frozen v15N gates.

Outcome:

```text
V15N_D1_IMPLEMENTATION_OR_PROVENANCE_INVALID
```

---

## 9. preregistered interpretation matrix

Let:

```text
trainAUC
evalAUC
meanAgreementGain =
  pairedMeanAgreement - fullAgreement
```

### Outcome A — cross-cohort learned-readout reversal

If:

```text
trainAUC >= 0.60
AND
evalAUC <= 0.40
```

then:

```text
V15N_D1_NEURAL_READOUT_CROSS_COHORT_REVERSAL
```

### Outcome B — harmful EVAL episode-specific residual

Otherwise, if:

```text
evalAUC <= 0.40
AND
meanAgreementGain >= 0.10
```

then:

```text
V15N_D1_EVAL_NEURAL_RESIDUAL_HARMFUL
```

### Outcome C — learned residual largely uninformative

Otherwise, if:

```text
0.45 <= evalAUC <= 0.55
AND
meanAgreementGain >= 0.10
```

then:

```text
V15N_D1_EPISODE_SPECIFIC_READOUT_UNINFORMATIVE
```

### Outcome D — residual ordering is useful but final mapping is not

Otherwise, if:

```text
evalAUC >= 0.60
AND
meanAgreementGain >= 0.10
```

then:

```text
V15N_D1_DOWNSTREAM_SCORE_INTERACTION
```

### Otherwise

```text
V15N_D1_INCONCLUSIVE
```

If either cohort lacks the primary AUC support guard:

```text
V15N_D1_INSUFFICIENT_FORCED_STATE_SUPPORT
```

This support outcome takes precedence over A-D but not over provenance invalidation.

---

## 10. stop rule

Do not in v15N-D1:

- train a replacement policy;
- fit oracle labels;
- change the v15N candidate;
- change neural PCA preprocessing;
- change recurrence;
- change reward/CEM;
- change AUC or outcome thresholds after seeing results;
- modify deployed v15D.

```text
POTION v15D
  DEPLOYED

v15N
  CLOSED / BLOCKED

v16C
  BLOCKED
```
