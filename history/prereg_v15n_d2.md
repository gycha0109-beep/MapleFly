# prereg_v15n_d2 — exhaustive counterfactual frozen-score audit

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / HOLDOUT COLLECTION / OUTCOME**

Frozen prerequisite:

```text
v15N-D1
  V15N_D1_INSUFFICIENT_FORCED_STATE_SUPPORT

v15N-D1 receipt
  b6224de52e042c4ba71a93bc35867bd744455af3

v15N candidate artifact
  10846125740

v15N candidate params sha256
  c3a2a2516296fb907834c3f6556afca1ea2f127a09e1b64d5ad46e4b00cbc5e5
```

Design:

```text
history/design_v15n_d2_exhaustive_score_audit.md
commit ad02d7cb70919f089dd6d7d40758882460aaf537
```

No replacement policy is trained.

---

## 1. cohorts

Reconstruct v15N TRAIN for preprocessing/decision means:

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

TRAIN then EVAL use the original continuous interruption RNG:

```text
4147000
```

Fresh HOLDOUT:

```text
4171000
4181000
4191000
```

HOLDOUT interruption RNG:

```text
4207000
```

24 tapes per cohort.

---

## 2. provenance requirements

Require exact v15N evidence:

```text
artifact
  10846125740

evidence JSON sha256
  103e3ebc84e7d062394ec22608b533cfc135c89eedc766f7f7c682a6dcdcd1a4

params sha256
  c3a2a2516296fb907834c3f6556afca1ea2f127a09e1b64d5ad46e4b00cbc5e5

preprocessing sha256
  977aa76306c4aa387585c7cdea9a96de26296764ef98962565bd49935d6ccc83
```

Exact v15N EVAL FULL aggregate metrics must reproduce to tolerance 1e-12.

---

## 3. exhaustive state construction

At decision index d enumerate all 2^d prior binary POTION histories.

For each history:

- start from the tape's frozen pre-first-decision HP accounting;
- apply prior POTION actions and frozen contact damage;
- discard if dead before d;
- compute h_d from the frozen recurrence and the same prior actions;
- attach the tape's frozen PCA32 neural vector at d.

No oracle/environment state enters the frozen score.

---

## 4. evaluator-only oracle

From each reached hidden HP at d enumerate every remaining binary action sequence.

Among surviving sequences find the minimum remaining POTION use count.

Classify current action:

```text
FORCED_WAIT
FORCED_DRINK
EITHER
UNSURVIVABLE
```

Primary score analysis uses FORCED_WAIT and FORCED_DRINK only.

---

## 5. frozen score variants

At every identical forced state:

```text
FULL
  bias + neuralTerm + actionStateTerm

MEAN
  bias + trainDecisionMeanNeuralTerm[d] + actionStateTerm

NEURAL_OFF
  bias + actionStateTerm

ACTION_STATE_OFF
  bias + neuralTerm
```

Action is DRINK iff score > 0; tie WAIT.

---

## 6. primary metrics

For each cohort and variant report:

```text
balanced accuracy
ordinary accuracy
FORCED_WAIT recall
FORCED_DRINK recall
```

Primary support guard per analyzed cohort:

```text
FORCED_WAIT  >=500
FORCED_DRINK >=500
```

Also require at least 12 tapes with both forced classes for macro-tape reporting.

Report, but do not gate on:

- state-weighted neural residual AUC;
- by-decision balanced accuracy where each class has >=30 states;
- macro tape balanced accuracy;
- score-term magnitude;
- exact disagreement witnesses.

---

## 7. ecology

Exact EVAL and fresh HOLDOUT must each pass all frozen v15N lower-skill ecology gates.

Failure invalidates the diagnostic.

---

## 8. preregistered outcome matrix

Define:

```text
evalMeanGain =
  EVAL MEAN BA - EVAL FULL BA

holdoutMeanGain =
  HOLDOUT MEAN BA - HOLDOUT FULL BA

evalNeuralOffGain =
  EVAL NEURAL_OFF BA - EVAL FULL BA

holdoutNeuralOffGain =
  HOLDOUT NEURAL_OFF BA - HOLDOUT FULL BA

evalStateOffGain =
  EVAL ACTION_STATE_OFF BA - EVAL FULL BA

holdoutStateOffGain =
  HOLDOUT ACTION_STATE_OFF BA - HOLDOUT FULL BA
```

Precedence is top to bottom.

### Invalid

If provenance or either ecology check fails:

```text
V15N_D2_IMPLEMENTATION_OR_PROVENANCE_INVALID
```

### Insufficient support

If either EVAL or HOLDOUT fails the primary support guard:

```text
V15N_D2_INSUFFICIENT_COUNTERFACTUAL_SUPPORT
```

### Episode-specific neural term harmful

If all are true:

```text
EVAL residual AUC    <=0.40
HOLDOUT residual AUC <=0.40
evalMeanGain         >=0.10
holdoutMeanGain      >=0.10
```

then:

```text
V15N_D2_EPISODE_SPECIFIC_NEURAL_TERM_HARMFUL
```

### Broader neural readout harmful

Otherwise, if:

```text
evalNeuralOffGain    >=0.10
holdoutNeuralOffGain >=0.10
```

then:

```text
V15N_D2_NEURAL_READOUT_HARMFUL
```

### Action-state readout harmful

Otherwise, if:

```text
evalStateOffGain    >=0.10
holdoutStateOffGain >=0.10
```

then:

```text
V15N_D2_ACTION_STATE_READOUT_HARMFUL
```

### Frozen score broadly aligned

Otherwise, if:

```text
EVAL FULL BA    >=0.65
HOLDOUT FULL BA >=0.65
```

then:

```text
V15N_D2_FROZEN_SCORE_BROADLY_ALIGNED
```

### Otherwise

```text
V15N_D2_INCONCLUSIVE
```

---

## 9. stop rule

After the first authoritative outcome do not change:

- cohort seeds;
- support guards;
- score variants;
- oracle;
- thresholds;
- recurrence;
- PCA;
- frozen v15N candidate.

Do not train supervised oracle weights.
Do not train a replacement POTION policy.
Do not modify deployed v15D.

```text
POTION v15D
  DEPLOYED

v15N
  CLOSED / BLOCKED

v16C
  BLOCKED
```
