# design_v15n_d6_d2_d3_d3_d4_d2_d1_d1_temporal3_scalar_separability_audit

## Question

D4-D2-D1 froze two replicated failure axes:

```text
falseEventAxis = BACKGROUND_DOMINANT
missAxis       = NO_POSITIVE_DOMINANT
```

The immediate question is therefore not whether the eventizer should be re-armed differently. It is:

> Does the exact frozen PCA32_TEMPORAL3 scalar contain enough one-dimensional separation that a single score threshold could, in principle, resolve both the background false-event burden and the missing-impact burden?

This is a **counterfactual separability audit**, not threshold tuning and not a deployment experiment.

The runtime threshold remains exactly 0.5 throughout MapleFly.

---

## 1. frozen prerequisite

Require authoritative D4-D2-D1:

```text
result
  cd20896db3ca8bd6c47ef56e112b9efff3aa49a7

receipt
  539a503f1725fc06fe288f68263026662f847cd6

run
  36521866553

artifact
  11014769432

JSON sha256
  0636c0c4801062d0f2e11f9a30d5a4072d6de474da61f4572d2cf8b24c055862

falseEventAxis
  BACKGROUND_DOMINANT

missAxis
  NO_POSITIVE_DOMINANT
```

Reconstruct the exact D4-D2 representation and exact D4-D2-D1 cohorts before any audit.

---

## 2. frozen representation

No change to:

```text
preprocessing
D6 detector
innovation PCA32
PCA32_TEMPORAL3 model
temporal depth = 3
runtime threshold = 0.5
event refractory = 10 simulation steps / 200 ms
old-scalar gate = disabled
oracle runtime window = disabled
```

The diagnostic may evaluate frozen scalar scores counterfactually, but it must not modify the runtime policy.

---

## 3. cohorts

Reuse the exact D4-D2/D4-D2-D1 cohorts because this is attribution of the already-observed failure:

```text
AUDIT_A
5451000 5461000 5471000 5481000
5491000 5501000 5511000 5521000
interruption 5537000

AUDIT_B
5541000 5551000 5561000 5571000
5581000 5591000 5601000 5611000
interruption 5627000
```

Exactly 64 tapes per cohort.

No new prospective performance claim may be made from these cohorts.

---

## 4. exact D4-D2 reproduction

At threshold 0.5, reproduce the authoritative D4-D2 metrics exactly before continuing.

Any mismatch invalidates the audit.

---

## 5. counterfactual threshold grid

Evaluate exactly this preregistered grid:

```text
0.10
0.15
0.20
0.25
0.30
0.35
0.40
0.45
0.50
0.55
0.60
0.65
0.70
0.75
0.80
0.85
0.90
```

For each threshold and cohort:

1. use the exact same frozen TEMPORAL3 scalar;
2. define positive = score >= threshold;
3. emit on a 0→1 rising edge;
4. retain the exact frozen 10-step refractory;
5. retain the exact frozen greedy evaluator matching:
   earliest unmatched event with
   `eventStep >= hitStep` and `eventStep-hitStep < 10`.

Report:

- physical impacts;
- neural events;
- matched events;
- false events;
- missed impacts;
- precision;
- recall;
- F1;
- event/impact ratio;
- mean absolute per-tape count error;
- median and p90 matched latency;
- refractory-suppressed count.

This grid is diagnostic only. It cannot select a runtime threshold.

---

## 6. frozen event-stream gates

At every grid point, evaluate the original D4-D2 gates unchanged:

```text
precision >= 0.75
recall >= 0.75
F1 >= 0.75
0.80 <= event/impact ratio <= 1.20
mean tape absolute count error <= 5.0
```

Define:

```text
cohortPass(threshold)
  all gates pass for that cohort

commonPass(threshold)
  cohortPass_A(threshold) && cohortPass_B(threshold)
```

---

## 7. scalar separability axis

### SINGLE_THRESHOLD_FEASIBLE_ON_AUDIT

At least one preregistered grid threshold has `commonPass=true`.

This does **not** authorize deployment and does not make that threshold prospective. It only shows that a one-dimensional threshold repair is not ruled out.

### PRECISION_RECALL_TRADEOFF

No commonPass threshold exists, and on both cohorts:

```text
max recall among thresholds with precision >= 0.75 < 0.75
OR
max precision among thresholds with recall >= 0.75 < 0.75
```

This means the scalar cannot simultaneously recover enough impacts and reject enough false events on the frozen audit grid.

### COUNT_STRUCTURE_FAILURE

No commonPass threshold exists, but both precision and recall can individually satisfy >=0.75 at at least one common grid threshold while ratio or count-MAE prevents a common pass.

### MIXED_SCALAR_FAILURE

Any other valid pattern.

---

## 8. support

Each cohort requires:

```text
64 tapes
physical impacts >= 1000
```

The threshold grid itself does not impose minimum neural-event support at every extreme threshold, because extreme grid points are diagnostic controls.

---

## 9. interpretation

If:

```text
SINGLE_THRESHOLD_FEASIBLE_ON_AUDIT
```

then the next step is **not** to deploy the discovered threshold. The next step must define a leakage-free calibration rule using TRAIN only and test it on completely fresh prospective cohorts.

If:

```text
PRECISION_RECALL_TRADEOFF
COUNT_STRUCTURE_FAILURE
MIXED_SCALAR_FAILURE
```

then do not continue threshold tuning. The next repair must be representation-level and separately designed/preregistered.

---

## 10. deployment

Throughout this audit:

```text
POTION v15D  DEPLOYED
v15N         CLOSED / BLOCKED
v16C         BLOCKED
```

The diagnostic readout remains nondeployable.
