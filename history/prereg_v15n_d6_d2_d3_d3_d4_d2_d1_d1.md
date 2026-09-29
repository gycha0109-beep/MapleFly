# prereg_v15n_d6_d2_d3_d3_d4_d2_d1_d1 — TEMPORAL3 scalar separability audit

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / OUTCOME**

Design:

```text
history/design_v15n_d6_d2_d3_d3_d4_d2_d1_d1_temporal3_scalar_separability_audit.md
commit 0c720cd536689c92120688b12f8473ca4543f470
```

Frozen prerequisite:

```text
D4-D2-D1 outcome
  V15N_D6_D2_D3_D3_D4_D2_D1_EVENT_STREAM_FAILURE_ATTRIBUTED

result
  cd20896db3ca8bd6c47ef56e112b9efff3aa49a7

receipt
  539a503f1725fc06fe288f68263026662f847cd6

run
  36521866553

artifact
  11014769432

artifact digest
  sha256:c9651707653c44b50eb30b68da569f02c185d3456ce15711673d873436844b37

JSON sha256
  0636c0c4801062d0f2e11f9a30d5a4072d6de474da61f4572d2cf8b24c055862

falseEventAxis
  BACKGROUND_DOMINANT

missAxis
  NO_POSITIVE_DOMINANT
```

---

## 1. reconstruction contract

Before audit, reconstruct the exact frozen D4-D2 stack and reproduce threshold-0.5 D4-D2 metrics exactly.

Frozen stack:

```text
PCA32_TEMPORAL3
runtime threshold 0.5
temporal depth 3
rising-edge eventizer
refractory 10 steps / 200 ms
old-scalar gate false
oracle runtime window false
one-to-one matching [hit, hit+10)
```

Any provenance or reproduction mismatch:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_IMPLEMENTATION_OR_PROVENANCE_INVALID
```

---

## 2. audit cohorts

Reuse exactly:

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

These cohorts are attribution-only and cannot support a new prospective performance claim.

---

## 3. fixed counterfactual grid

Evaluate exactly:

```text
0.10 0.15 0.20 0.25 0.30 0.35 0.40 0.45 0.50
0.55 0.60 0.65 0.70 0.75 0.80 0.85 0.90
```

No extra thresholds may be inserted after seeing results.

At every threshold:

- same TEMPORAL3 score;
- positive iff score >= threshold;
- same rising-edge rule;
- same 10-step refractory;
- same evaluator-only physical-hit matching.

The runtime threshold remains 0.5. This grid is diagnostic only.

---

## 4. metrics

For each cohort × threshold report:

```text
physicalImpacts
neuralEvents
matched
falseEvents
missedImpacts
precision
recall
F1
eventCountRatio
meanAbsolutePerTapeCountError
medianMatchedLatencySeconds
p90MatchedLatencySeconds
refractorySuppressed
```

Frozen event-stream gates:

```text
precision >= 0.75
recall >= 0.75
F1 >= 0.75
0.80 <= eventCountRatio <= 1.20
meanAbsolutePerTapeCountError <= 5.0
```

For a threshold:

```text
cohortPass_A = all gates pass on A
cohortPass_B = all gates pass on B
commonPass   = cohortPass_A && cohortPass_B
```

---

## 5. support

Require per cohort:

```text
64 tapes
physical impacts >= 1000
```

Otherwise:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_INSUFFICIENT_AUDIT_SUPPORT
```

---

## 6. frozen scalar axis

Evaluate in this order.

### SINGLE_THRESHOLD_FEASIBLE_ON_AUDIT

At least one preregistered threshold has `commonPass=true`.

### PRECISION_RECALL_TRADEOFF

No threshold has commonPass.

For each cohort calculate:

```text
bestRecallAtPrecisionGate =
  max recall among grid thresholds with precision >= 0.75

bestPrecisionAtRecallGate =
  max precision among grid thresholds with recall >= 0.75
```

Classify PRECISION_RECALL_TRADEOFF when, on both cohorts, either:

```text
bestRecallAtPrecisionGate < 0.75
```

or:

```text
bestPrecisionAtRecallGate < 0.75
```

with unavailable maxima treated as failing the corresponding condition.

### COUNT_STRUCTURE_FAILURE

No commonPass and not PRECISION_RECALL_TRADEOFF, and there exists at least one common grid threshold where both cohorts satisfy:

```text
precision >= 0.75
recall >= 0.75
F1 >= 0.75
```

but one or both cohorts fail only eventCountRatio and/or meanAbsolutePerTapeCountError.

### MIXED_SCALAR_FAILURE

Any other valid pattern.

---

## 7. authoritative outcomes

Precedence:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_IMPLEMENTATION_OR_PROVENANCE_INVALID

V15N_D6_D2_D3_D3_D4_D2_D1_D1_INSUFFICIENT_AUDIT_SUPPORT

V15N_D6_D2_D3_D3_D4_D2_D1_D1_TEMPORAL3_SCALAR_SEPARABILITY_AUDITED
```

A valid audit must also report:

```text
scalarAxis
commonPassingThresholds
bestRecallAtPrecisionGate A/B
bestPrecisionAtRecallGate A/B
```

---

## 8. stop rule

After the first authoritative result, do not change:

- audit cohorts;
- threshold grid;
- representation;
- temporal depth;
- eventizer;
- refractory;
- matching;
- event-stream gates;
- scalar-axis definitions;
- support gates.

If `SINGLE_THRESHOLD_FEASIBLE_ON_AUDIT`, no audited threshold is deployable. A later experiment must choose/calibrate a threshold without these audit cohorts and validate on fresh prospective cohorts.

If any non-feasible scalar axis occurs, threshold search stops and the next experiment must be representation-level.

POTION v15D remains deployed. v15N and v16C remain blocked.
