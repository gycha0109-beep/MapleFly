# design_v15n_d1 — frozen neural-readout alignment audit

## Purpose

v15N closed with a valid scientific FAIL:

```text
TRAIN survival
  87.5%

EVAL survival
  62.5%

ACTION_STATE_OFF
  no required degradation

EPISODE_SHIFT_1
  no required degradation

DECISION_MEAN_NEURAL
  survival 95.8%
  better than FULL
```

v15M-D1 already showed that the underlying causal-trace PCA32 contains stable cross-cohort,
episode-specific recent-impact information.

v15N-D1 therefore asks:

> What did the frozen reward-only v15N neural readout actually do with that information?

This is a diagnostic only. It does not train or tune a replacement policy.

---

## 1. frozen candidate

Load the exact authoritative v15N artifact and verify:

```text
artifact
  10846125740

artifact digest
  sha256:2a4492b371eaaaccaf12cbb29f5062708833e722d0af111a50e7cd0112abf6e2

v15n_training.json sha256
  103e3ebc84e7d062394ec22608b533cfc135c89eedc766f7f7c682a6dcdcd1a4

policy params sha256
  c3a2a2516296fb907834c3f6556afca1ea2f127a09e1b64d5ad46e4b00cbc5e5
```

No candidate parameter may be changed.

---

## 2. frozen cohorts

Reconstruct the exact v15N cohorts:

```text
TRAIN
  4081000
  4091000
  4101000

EVAL
  4111000
  4121000
  4131000

interruption RNG
  4147000
```

Collect TRAIN first and EVAL second from the same deterministic RNG stream.

Reproduce the exact v15N TRAIN-only preprocessing and require its SHA256 to equal:

```text
977aa76306c4aa387585c7cdea9a96de26296764ef98962565bd49935d6ccc83
```

---

## 3. score decomposition

At every policy-reachable decision snapshot record:

```text
bias term
neural term = neuralWeights dot PCA32
action-state term = stateWeights dot h
total score
chosen action
```

Also compute the frozen TRAIN decision-position neural mean:

```text
meanNeuralScore[d] =
  mean over TRAIN tapes of
  neuralWeights dot PCA32[d]
```

Define episode-specific neural residual:

```text
residual =
  neuralTerm - meanNeuralScore[decisionIndex]
```

This is diagnostic evidence only.

---

## 4. exact evaluator-only oracle

For the hidden HP state reached by the frozen candidate's own prior actions, enumerate every remaining binary
POTION sequence.

Classify the current action:

```text
FORCED_WAIT
FORCED_DRINK
EITHER
UNSURVIVABLE
```

using the minimum-use surviving sequences, exactly as in the D1/D2 diagnostic family.

HP, damage schedule, and oracle labels remain evaluator-only and are never runtime inputs.

Primary alignment analysis uses only:

```text
FORCED_WAIT
FORCED_DRINK
```

states.

---

## 5. neural residual alignment

For TRAIN and EVAL separately, measure how well the scalar episode-specific neural residual orders the two
forced classes.

Metric:

```text
AUC =
  P(residual(FORCED_DRINK) > residual(FORCED_WAIT))
  + 0.5 * ties
```

Interpretation:

```text
AUC > 0.5
  larger episode-specific neural residual favors the oracle DRINK class

AUC < 0.5
  residual is anti-aligned with the oracle class

AUC ~= 0.5
  residual carries little usable ordering under the learned readout
```

No threshold is fit.

---

## 6. decision-mean flip audit

Replay the frozen candidate twice:

```text
FULL
DECISION_MEAN_NEURAL
```

For every candidate-reachable forced state report by decision index:

```text
FULL oracle agreement
MEAN oracle agreement
WAIT -> DRINK flips
DRINK -> WAIT flips
flips correcting an oracle error
flips creating an oracle error
```

This localizes why the decision-mean control improves survival.

---

## 7. action-state usage

Report by decision index and cohort:

```text
mean |action-state term|
mean |neural term|
mean |residual|
state-term / neural-term magnitude ratio
unique rounded h states
```

This does not decide sufficiency. It only tests whether the trained readout materially uses the recurrent
state it was given.

---

## 8. interpretation boundary

v15N-D1 may diagnose the frozen readout.

It must not conclude that the MaleCNS lacks impact information; v15M-D1 already falsified that broader
claim for the tested representation.

It must not train supervised oracle weights for deployment.

It must not alter:

```text
v15N candidate
PCA32
trace half-life
reward
CEM
deployed v15D
```
