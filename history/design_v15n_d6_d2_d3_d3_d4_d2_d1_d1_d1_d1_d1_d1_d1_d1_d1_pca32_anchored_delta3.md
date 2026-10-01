# design_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_d1_d1_d1_d1_pca32_anchored_delta3

## Question

D4-D2-D1-D1-D1-D1-D1-D1-D1-D1 established:

```text
historyUtilityAxis = HISTORY_NEGLIGIBLE
```

The scalar three-class margin and its short causal history therefore no longer provide a useful representation path.

This experiment moves upstream of scalar compression and asks:

> Does explicit causal trajectory change in the frozen PCA32 neural space provide realized-impact information that the scalar margin discarded?

No scalar three-class margin is used as a runtime feature.

---

## 1. frozen prerequisite

Require authoritative D4-D2-D1-D1-D1-D1-D1-D1-D1-D1:

```text
result
  1585c4308e5eccd269c3d04bc2c99481f31f5981

receipt
  18ced2d46249b0edf7bcbf55d34ae07b614dff6e

run
  36787883448

artifact
  11132717991

artifact digest
  sha256:a00cd69befebcb81cc9d837f979f24820a152faf50fe5297a4e07f6cf5944cdb

JSON sha256
  956605344594e575ee0bb4bb3c51a4c333e928f2a7f0071666d021d05a891302

historyUtilityAxis
  HISTORY_NEGLIGIBLE
```

Also preserve the exact frozen D6 neural preprocessing and label-free innovation PCA32 basis used by D4.

---

## 2. frozen neural preprocessing

For each eligible frame:

```text
residual_t = frozen D6 phase-residualized DN frame

innovation_t =
  residual_t
  - mean(residual_(t-1) ... residual_(t-5))

z_t = frozen PCA32(innovation_t)
```

Dimension of z_t:

```text
32
```

DN order remains the frozen 1316 descending-neuron order.

No game-state variable, physical hit state, HP, collision state, seed, or evaluator label enters runtime feature construction.

---

## 3. PCA32_ANCHORED_DELTA3 representation

For every frame t with at least five prior eligible PCA32 frames define:

```text
shortDelta_t = z_t - z_(t-1)
midDelta_t   = z_t - z_(t-3)
longDelta_t  = z_t - z_(t-5)

x_t = [
  z_t,
  shortDelta_t,
  midDelta_t,
  longDelta_t
]
```

Dimension:

```text
128
```

The three change horizons are fixed before fitting:

```text
1 frame  = 20 ms
3 frames = 60 ms
5 frames = 100 ms
```

This representation is causal and explicitly anchored to the current PCA32 state while preserving short, medium, and 100 ms trajectory displacement.

No future frames, recurrence, derivative threshold, peak operator, or learned temporal depth are used.

---

## 4. dedicated TRAJECTORY_TRAIN cohort

Train only on:

```text
6441000 6451000 6461000 6471000
6481000 6491000 6501000 6511000

interruption
6527000
```

Exactly 64 tapes.

No prior prospective/audit/attribution cohort enters fitting.

---

## 5. evaluator-only TRAIN strata

For every eligible x_t assign exactly one stratum.

### REALIZED_IMPACT

```text
latest physical hit exists
and
0 <= frameStep-latestHitStep < 10
```

### PRE_HIT

```text
not REALIZED_IMPACT
and
next physical hit exists
and
0 < nextHitStep-frameStep < 10
```

### TRUE_BACKGROUND

```text
neither REALIZED_IMPACT nor PRE_HIT
```

Runtime never receives these labels.

---

## 6. binary ridge readout

Target:

```text
REALIZED_IMPACT -> y=1
PRE_HIT         -> y=0
TRUE_BACKGROUND -> y=0
```

TRAIN standardization:

```text
unweighted mean/std over all eligible TRAIN rows
```

Frozen total sample weights:

```text
REALIZED_IMPACT  1/3
PRE_HIT          1/3
TRUE_BACKGROUND  1/3
```

Per-row weight is total stratum weight divided by stratum count.

Ridge:

```text
lambda = 1e-3
intercept unregularized
```

Runtime score:

```text
trajectoryScore_t =
  intercept + beta dot standardized(x_t)
```

No sigmoid.

---

## 7. dedicated CALIBRATION cohort

Threshold selection only on:

```text
6531000 6541000 6551000 6561000
6571000 6581000 6591000 6601000

interruption
6617000
```

Exactly 64 tapes.

Calibration has no generalization claim.

---

## 8. threshold candidates

Exactly:

```text
0
plus every distinct finite positive trajectoryScore observed on CALIBRATION frames
```

Exact JavaScript Number deduplication, ascending sort.

No TRAIN score and no prior/future prospective score enters the candidate set.

---

## 9. eventizer

For candidate threshold tau:

```text
positive_t = trajectoryScore_t >= tau
crossing_t = positive_t && !positive_(t-1)
```

Emit only if:

```text
lastEmittedEventStep is null
OR
currentStep-lastEmittedEventStep >= 10
```

Refractory remains exactly 10 simulation steps / 200 ms.

No persistence, hysteresis, re-arm timer, peak detector, or second threshold.

---

## 10. matching

Evaluator-only event matching remains:

```text
for each physical hit:
  earliest unmatched emitted event
  with eventStep >= hitStep
  and eventStep-hitStep < 10
```

Pre-hit events do not match forward.

---

## 11. training/calibration support

TRAIN requires:

```text
64 tapes
REALIZED_IMPACT rows >= 1000
PRE_HIT rows >= 500
TRUE_BACKGROUND rows >= 5000
```

CALIBRATION requires:

```text
64 tapes
physical impacts >= 1000
threshold candidates >= 100
```

Otherwise:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_INSUFFICIENT_SUPPORT
```

---

## 12. calibration gates

A candidate threshold is feasible only if all:

```text
precision >= 0.75
recall >= 0.75
F1 >= 0.75
0.80 <= eventCountRatio <= 1.20
meanAbsolutePerTapeCountError <= 5.0
```

If no candidate is feasible:

```text
...PCA32_ANCHORED_DELTA3_CALIBRATION_NO_FEASIBLE_THRESHOLD
```

and no prospective evaluation is run.

---

## 13. deterministic threshold selection

Among feasible candidates choose lexicographically:

```text
1 maximum F1
2 minimum abs(eventCountRatio - 1)
3 minimum meanAbsolutePerTapeCountError
4 maximum precision
5 maximum recall
6 maximum threshold
```

Freeze before prospective evaluation.

---

## 14. fresh prospective cohorts

Only if calibration selects a feasible threshold.

PROSPECTIVE_A:

```text
6621000 6631000 6641000 6651000
6661000 6671000 6681000 6691000

interruption
6707000
```

PROSPECTIVE_B:

```text
6711000 6721000 6731000 6741000
6751000 6761000 6771000 6781000

interruption
6797000
```

Exactly 64 tapes each.

---

## 15. descriptive frozen comparator

On the same fresh prospective tapes evaluate the previous frozen absolute-margin crossing eventizer:

```text
three-class margin
tau = 0.2378919189622094
refractory = 10
same matching
```

Comparator is descriptive only and cannot affect trajectory model or threshold selection.

---

## 16. prospective support and gates

Require per cohort:

```text
64 tapes
physical impacts >= 1000
trajectory events >= 500
```

Both fresh cohorts must pass all:

```text
precision >= 0.75
recall >= 0.75
F1 >= 0.75
0.80 <= eventCountRatio <= 1.20
meanAbsolutePerTapeCountError <= 5.0
```

---

## 17. authoritative outcomes

### PCA32_ANCHORED_DELTA3_EVENT_STREAM_DEMONSTRATED

Training/calibration provenance is valid and the frozen trajectory readout + calibration-selected threshold passes every primary gate on both fresh cohorts.

### PCA32_ANCHORED_DELTA3_EVENT_STREAM_NOT_DEMONSTRATED

A feasible calibration threshold exists but one or both fresh cohorts fail at least one primary gate.

No prospective retuning.

### PCA32_ANCHORED_DELTA3_CALIBRATION_NO_FEASIBLE_THRESHOLD

No calibration threshold passes all gates.

### INSUFFICIENT_SUPPORT

A frozen support floor fails.

---

## 18. scientific role

This is a diagnostic/nondeployable representation because physical-hit truth is used for offline TRAIN labels and calibration selection.

A success would demonstrate that neural trajectory geometry before scalar compression carries a usable causal impact signal.

A failure would indicate that the current frozen innovation PCA32 basis itself, not merely scalar compression, is the remaining representation bottleneck.

---

## 19. stop rule / deployment

After the first authoritative run do not change:

- feature horizons 1/3/5;
- feature dimension 128;
- TRAIN/CALIBRATION/prospective cohorts;
- label precedence;
- stratum weights;
- ridge lambda;
- threshold candidate construction;
- threshold selection order;
- refractory;
- matching;
- support floors;
- gates.

No temporal-depth search and no threshold selection from prospective results.

```text
diagnosticStackDeployable = false
POTION v15D  DEPLOYED
v15N         CLOSED / BLOCKED
v16C         BLOCKED
```
