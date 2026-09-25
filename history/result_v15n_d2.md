# result_v15n_d2 — exhaustive counterfactual frozen-score audit

## Status

```text
V15N_D2_INCONCLUSIVE
```

The preregistered diagnostic completed successfully. Provenance, support, and ecology all passed, but none
of the preregistered causal interpretations reached its frozen threshold.

Authoritative evidence:

```text
run
  36093619022

head
  80786c0cfbdf52beb81d94a48d3d4ef46657b4b2

artifact
  10846579620

artifact name
  maplefly-v15n-d2-exhaustive-score-audit-36093619022

artifact digest
  sha256:b16e382ae59534ed038398b7b0af89cf98a9e0b76f8c39c74b926aea076f4c29

v15n_d2.json sha256
  147518a4bc007f43a0bb2e9419a7d5ac374de4bb94187464dc99e78244308126
```

Preregistration:

```text
32ed074bbd49128fdb0af2932da704750b2c92c0
```

Implementation/workflow:

```text
056e5db27df41c2651b75891808dc5f59b6564cb
80786c0cfbdf52beb81d94a48d3d4ef46657b4b2
```

No replacement policy was trained.

---

## 1. provenance and support

The exact v15N candidate and TRAIN-only preprocessing reproduced.

The exhaustive counterfactual construction removed the v15N-D1 support bottleneck:

```text
EVAL
  FORCED_WAIT   3355
  FORCED_DRINK  2277

fresh HOLDOUT
  FORCED_WAIT   2446
  FORCED_DRINK  2005

required per class/cohort
  >=500

mixed-class tapes
  24 / 24 in EVAL
  24 / 24 in HOLDOUT
```

Support gate: PASS.

---

## 2. frozen-score results

### EVAL

```text
episode-specific residual AUC
  0.5111

FULL
  WAIT recall   27.21%
  DRINK recall  69.78%
  BA            48.50%

DECISION_MEAN_NEURAL
  WAIT recall    0.24%
  DRINK recall  99.96%
  BA            50.10%

NEURAL_OFF
  WAIT recall    0.00%
  DRINK recall 100.00%
  BA            50.00%

ACTION_STATE_OFF
  WAIT recall   27.24%
  DRINK recall  69.78%
  BA            48.51%
```

Gains over FULL:

```text
MEAN
  +1.60 pp

NEURAL_OFF
  +1.50 pp

ACTION_STATE_OFF
  +0.01 pp
```

### fresh HOLDOUT

```text
episode-specific residual AUC
  0.5105

FULL
  WAIT recall   31.36%
  DRINK recall  76.01%
  BA            53.68%

DECISION_MEAN_NEURAL
  WAIT recall    0.29%
  DRINK recall  99.95%
  BA            50.12%

NEURAL_OFF
  WAIT recall    0.00%
  DRINK recall 100.00%
  BA            50.00%

ACTION_STATE_OFF
  WAIT recall   38.06%
  DRINK recall  73.27%
  BA            55.66%
```

Gains over FULL:

```text
MEAN
  -3.57 pp

NEURAL_OFF
  -3.68 pp

ACTION_STATE_OFF
  +1.98 pp
```

---

## 3. ecology

All frozen lower-skill gates passed in both analyzed cohorts.

```text
EVAL
  3-kill episode       100.0%
  obstacle clear        99.58%
  target kill           90.25%
  LEFT target kill      89.66%
  RIGHT target kill     90.83%
  attack precision      61.63%
  airborne attack       15.29%
  post-clear jump        0.42%
  pre-clear attack       6.78%

HOLDOUT
  3-kill episode       100.0%
  obstacle clear        96.61%
  target kill           90.68%
  LEFT target kill      91.60%
  RIGHT target kill     89.74%
  attack precision      61.80%
  airborne attack       13.95%
  post-clear jump        1.27%
  pre-clear attack       5.08%
```

---

## 4. interpretation

The exhaustive audit rules out the v15N-D1 sample-size explanation.

The frozen v15N final score is close to chance for the exact minimum-use forced-action boundary:

```text
EVAL FULL BA
  48.5%

fresh HOLDOUT FULL BA
  53.7%
```

However, the preregistered ablations do not identify one simple harmful term:

```text
MEAN neural replacement
  helps EVAL slightly
  hurts fresh HOLDOUT

NEURAL_OFF
  helps EVAL slightly
  hurts fresh HOLDOUT

ACTION_STATE_OFF
  essentially neutral on EVAL
  helps fresh HOLDOUT only 2 pp
```

The episode-specific residual AUC is also approximately chance in both cohorts.

Therefore v15N-D2 does not support:

```text
episode-specific neural term alone is harmful
entire neural term alone is harmful
action-state readout alone is harmful
frozen v15N score is broadly aligned
```

The remaining unresolved question is representational versus optimization/readout sufficiency:

> Given the exact frozen v15N PCA32 + 2-D recurrent state, does any simple linear readout in the same final
> score family generalize to unseen forced-action states when fitted only as a diagnostic?

That question must be answered with evaluator-only supervised weights that are never reused for runtime or
deployment.

---

## 5. deployment

```text
POTION v15D
  DEPLOYED

v15N
  CLOSED / BLOCKED

v15N-D2
  DIAGNOSTIC COMPLETE / INCONCLUSIVE

v16C
  BLOCKED
```
