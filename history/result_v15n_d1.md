# result_v15n_d1 — frozen neural-readout alignment audit

## Status

```text
V15N_D1_INSUFFICIENT_FORCED_STATE_SUPPORT
```

This is a valid preregistered diagnostic with insufficient support for the preregistered A-D interpretation matrix.

Authoritative evidence:

```text
run
  36091961197

head
  a66ce94edff02125eaf5edde85216acef5b25db8

artifact
  10846710598

artifact name
  maplefly-v15n-d1-readout-alignment-36091961197

artifact digest
  sha256:4d304e29e5c3c43d4f70f77b312c48489fd8fbd6b46ff5195cc1882f86e263c9

v15n_d1.json sha256
  b0d5cfea9d2e392ccd050dc3a7d0c0e6aadd3c45153f33443d541914def1ce04
```

Preregistration:

```text
9d85eb371bc8b8f58aedb62fbb718ff4b7b9b8c4
```

Implementation/workflow:

```text
3f71c3781906575d34cad6b98cc8addc00b2c05b
a66ce94edff02125eaf5edde85216acef5b25db8
```

No replacement policy was trained.

---

## 1. provenance and ecology

The frozen v15N candidate reproduced exactly.

```text
FULL
  survival              62.5%
  minimum seed survival 50.0%
  mean uses             5.625
  mean excess uses      3.0667
  wasted / DRINK        3.2593

DECISION_MEAN_NEURAL
  survival              95.833%
  minimum seed survival 87.5%
  mean uses             7.6667
  mean excess uses      2.2174
  wasted / DRINK        0.2174
```

Frozen hashes reproduced:

```text
candidate params
  c3a2a2516296fb907834c3f6556afca1ea2f127a09e1b64d5ad46e4b00cbc5e5

TRAIN-only preprocessing
  977aa76306c4aa387585c7cdea9a96de26296764ef98962565bd49935d6ccc83
```

All frozen lower-skill ecology gates passed.

---

## 2. preregistered support guard

Primary residual AUC required, in each cohort:

```text
FORCED_WAIT  >=30
FORCED_DRINK >=30
```

Observed on states actually reached by the frozen FULL candidate:

```text
TRAIN
  FORCED_WAIT   73
  FORCED_DRINK   8
  total forced  81

EVAL
  FORCED_WAIT   58
  FORCED_DRINK  15
  total forced  73
```

FORCED_DRINK support failed in both cohorts.

Therefore the preregistered support outcome takes precedence:

```text
V15N_D1_INSUFFICIENT_FORCED_STATE_SUPPORT
```

The A-D outcome matrix is not claimed.

---

## 3. descriptive signals only

The following values are retained as descriptive evidence and must not be promoted to the preregistered A-D conclusions.

Residual AUC:

```text
TRAIN
  0.3459

EVAL
  0.2816
```

Frozen-candidate forced-state agreement:

```text
TRAIN FULL
  14.81%

TRAIN paired decision-mean
  18.52%
  +3.70 pp

EVAL FULL
  24.66%

EVAL paired decision-mean
  30.14%
  +5.48 pp
```

EVAL paired one-step flips:

```text
total
  16

WAIT -> DRINK
  14

DRINK -> WAIT
  2

correcting
  10

harmful
  6
```

Score magnitude:

```text
TRAIN
  mean |neural term|       25.188
  mean |action-state term|  1.143
  state/neural ratio        0.0454

EVAL
  mean |neural term|        9.826
  mean |action-state term|  0.938
  state/neural ratio        0.0955
```

These descriptive values are consistent with the concern that the learned neural readout dominates the small recurrent-state term and may be poorly aligned with minimum-use decisions, but support was insufficient for the preregistered causal interpretation.

---

## 4. interpretation

The diagnostic failed because the frozen candidate's own trajectory does not visit enough uniquely forced DRINK states.

This is itself compatible with the v15N phenotype:

```text
FULL EVAL survival
  62.5%

mean uses
  5.625
```

A policy-reachable-only audit therefore conditions on the same under-drinking behavior that is being diagnosed.

The next diagnostic should keep the v15N candidate completely frozen but expand evaluator coverage by enumerating all reachable prior POTION histories on the frozen neural tapes.

For each counterfactual history:

```text
neural PCA32
  unchanged for that tape/decision

2-D recurrent state
  recomputed causally from that own-action history

hidden HP/oracle
  evaluator-only

frozen v15N score
  evaluated without training
```

This removes the candidate-trajectory support bottleneck without adding runtime information.

---

## 5. deployment

No deployment change.

```text
POTION v15D
  DEPLOYED

v15N
  CLOSED / BLOCKED

v15N-D1
  DIAGNOSTIC CLOSED / INSUFFICIENT SUPPORT

v16C
  BLOCKED
```
