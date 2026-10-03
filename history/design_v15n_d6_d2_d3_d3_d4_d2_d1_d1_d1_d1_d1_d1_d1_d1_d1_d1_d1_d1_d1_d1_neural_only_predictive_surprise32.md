# design_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_neural_only_predictive_surprise32

## Question

Quadratic256 has now:

1. passed preregistered fresh prospective A/B;
2. passed an independent frozen confirmatory A/B replication.

Its remaining blocker is not representation robustness. It is deployability provenance: the successful Quadratic256 ridge target and threshold were selected using evaluator physical-hit truth.

This experiment asks:

> Can a causal event stream be obtained from descending-neuron activity alone, with both representation fitting and threshold selection performed without physical hit/contact/HP/damage truth?

This is the first deployability-bridge experiment.

A success creates a **deployability candidate**, not an immediate deployed policy. Independent confirmation remains required before deployment.

---

## 1. frozen prerequisite

Require the authoritative Quadratic256 confirmation:

```text
result
  0981e2c95ec86689967a15d4ea961900b50ccfc6

receipt
  17db382856e5a556ed25b08d6fc42c48ac6f4f27

run
  37006306772

artifact
  11232625088

artifact digest
  sha256:7a4a5ec9d794746852dfb6649c0360814ee1a867e35879a676526d179332d176

JSON sha256
  ffb4d8cbd0fecfa64ac84fc9cb90f079d3ab03a9d9e08df7b7ebff4139e398aa

outcome
  ...QUADRATIC256_CONFIRMATORY_REPLICATION_PASS
```

This prerequisite is evidence only. The supervised Quadratic256 weights/labels/threshold are not used by the neural-only model.

---

## 2. truth-access embargo

Before the neural-only model and threshold are frozen, fitting/calibration code may access only:

```text
seed
frameIndex
step
DN activity vector
```

It may not access:

```text
damageEvents
physical hit/contact
HP
damage amount
collision state
enemy state
future hit times
evaluator labels
Quadratic256 teacher scores
any oracle-derived target
```

Implementation must construct a stripped neural-only view before fitting.

Model fitting functions and threshold-selection functions accept only stripped views.

Physical truth becomes accessible only after:

```text
MODEL_FROZEN = true
THRESHOLD_FROZEN = true
```

for prospective evaluation.

---

## 3. causal neural preprocessing

Use the runtime descending-neuron activity stream only.

DN order remains the frozen runtime DN order.

For NEURAL_TRAIN, compute per-frame-phase means:

```text
phase = frameIndex mod 48

phaseMean[phase][dn] =
  mean TRAIN neural activity at that phase
```

For each frame:

```text
residual_t =
  DN_t - phaseMean[frameIndex mod 48]
```

For t with at least five previous frames:

```text
innovation_t =
  residual_t
  - mean(residual_(t-1)..residual_(t-5))
```

No hit labels or impact detector are used.

---

## 4. neural-only PCA32

Fit PCA32 only on NEURAL_TRAIN innovation vectors.

Deterministic contract:

```text
PCA fit rows      240 evenly spaced TRAIN innovation rows
components        32
power seed         3948000 + component index
power iterations  80
```

Use the existing deterministic PCA algorithm, but feed it neural-only innovation vectors directly.

Projection:

```text
z_t = PCA32(innovation_t)
```

No D6 impact direction, margin, damage label, or supervised readout participates in PCA fitting.

---

## 5. self-predictive model

For each eligible z_t with lags available, define:

```text
predictor_t = [
  z_(t-1),
  z_(t-3),
  z_(t-5)
]
```

Width:

```text
96
```

Target:

```text
z_t
```

Both predictor dimensions and target PCA dimensions are standardized using NEURAL_TRAIN-only unweighted mean/std.

Fit 32 independent target dimensions through one shared 96D ridge design:

```text
lambda = 1e-3
intercept unregularized
all eligible TRAIN rows unweighted
```

This is self-supervised next-state prediction. No event label exists.

---

## 6. predictive surprise score

For TRAIN, compute standardized prediction residual:

```text
e_t =
  standardized(z_t)
  - predicted standardized(z_t)
```

Compute TRAIN-only unweighted residual mean/std per PCA dimension.

Runtime normalized residual:

```text
r_j =
  (e_j - residualMean_j)
  / residualScale_j
```

Runtime score:

```text
surprise_t =
  mean_j(r_j^2), j=1..32
```

This is scalar neural prediction-error energy.

No supervised weights.

No Quadratic256 teacher score.

No physical truth.

---

## 7. NEURAL_TRAIN cohort

Exactly:

```text
7521000 7531000 7541000 7551000
7561000 7571000 7581000 7591000

interruption
7607000
```

Exactly 64 tapes.

Only stripped neural views enter preprocessing/PCA/predictor fitting.

Support:

```text
64 tapes
>= 20000 eligible predictive rows
all 32 residual scales > 1e-9
```

---

## 8. NEURAL_CALIBRATION cohort

Exactly:

```text
7611000 7621000 7631000 7641000
7651000 7661000 7671000 7681000

interruption
7697000
```

Exactly 64 tapes.

Only stripped neural views are visible during threshold freezing.

---

## 9. threshold selection without truth

No threshold search.

No candidate gates.

No physical metrics.

Compute all finite CALIBRATION surprise scores.

Sort ascending.

Frozen neural-tail quantile:

```text
q = 0.95
```

Use exact nearest-rank rule:

```text
index = ceil(q * N) - 1
tau = sortedScores[index]
```

The q value is preregistered here and cannot be changed after evaluation.

Threshold selection receives no evaluator truth.

Calibration support:

```text
64 tapes
>= 20000 finite surprise scores
tau finite
tau > 0
```

---

## 10. runtime eventizer

Exactly:

```text
positive_t = surprise_t >= tau
crossing_t = positive_t && !positive_(t-1)
refractory = 10 simulation steps
```

Emit on a rising edge only if refractory is clear.

Runtime eventizer receives only neural surprise score and its own prior state.

No hit/contact/HP/damage input.

---

## 11. freeze boundary

Before any prospective physical-truth evaluation:

```text
MODEL_FROZEN = true
THRESHOLD_FROZEN = true
```

Freeze and hash:

```text
phase means
PCA preprocessing/components
predictor standardization
predictor coefficients
prediction-residual normalization
tau
eventizer parameters
```

Produce:

```text
neuralOnlyModelSha256
```

No subsequent model or threshold modification.

---

## 12. fresh prospective cohorts

Only after freeze, collect/evaluate:

### PROSPECTIVE_A

```text
7701000 7711000 7721000 7731000
7741000 7751000 7761000 7771000

interruption
7787000
```

### PROSPECTIVE_B

```text
7791000 7801000 7811000 7821000
7831000 7841000 7851000 7861000

interruption
7877000
```

Exactly 64 tapes each.

These cohorts have not been used in prior fitting, calibration, prospective, confirmation, audit, or attribution work.

---

## 13. evaluator-only matching

Physical truth is allowed here only for metrics.

Frozen matching:

```text
earliest unmatched neural event
with eventStep >= hitStep
and eventStep-hitStep < 10
```

No evaluator truth is fed back to runtime state.

---

## 14. prospective support

Each cohort requires:

```text
64 tapes
physical impacts >= 1000
neural events >= 500
```

No pooling.

---

## 15. prospective gates

Each cohort independently must pass:

```text
precision >= 0.75
recall >= 0.75
F1 >= 0.75
0.80 <= eventCountRatio <= 1.20
meanAbsolutePerTapeCountError <= 5.0
```

No threshold/model retuning.

---

## 16. authoritative outcomes

### NEURAL_ONLY_PREDICTIVE_SURPRISE32_EVENT_STREAM_DEMONSTRATED

TRAIN/CAL support passes, neural-only provenance passes, and both fresh cohorts independently pass all event-stream gates.

### NEURAL_ONLY_PREDICTIVE_SURPRISE32_EVENT_STREAM_NOT_DEMONSTRATED

Support/provenance passes but one or both fresh cohorts fail at least one gate.

### INSUFFICIENT_SUPPORT

Any preregistered support floor fails.

### IMPLEMENTATION_OR_PROVENANCE_INVALID

Any pre-freeze truth access, prerequisite mismatch, non-neural calibration, or freeze-contract violation is detected.

---

## 17. interpretation

If demonstrated:

- physical-hit labels are no longer required for model fitting;
- physical-hit labels are no longer required for threshold selection;
- runtime score/eventization is neural-only;
- this creates a **deployability candidate**.

It does not immediately replace POTION v15D. An independent frozen confirmation is still required.

If not demonstrated:

- do not tune q=0.95 on prospective results;
- do not import Quadratic256 teacher labels;
- perform a neural-only failure attribution before a new bridge.

---

## 18. stop rule / deployment

After the authoritative run do not change:

- 48-phase residualization;
- five-frame innovation;
- PCA32 fit-row count/seed/iterations;
- predictor lags 1/3/5;
- ridge lambda;
- residual-energy score;
- q=0.95 nearest-rank threshold;
- refractory;
- matching;
- gates;
- cohorts.

```text
diagnosticStackDeployable = false
deployabilityCandidate = false until both fresh cohorts pass
POTION v15D = DEPLOYED
v15N = CLOSED / BLOCKED
v16C = BLOCKED
```
