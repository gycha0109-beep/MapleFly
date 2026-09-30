# design_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_d1_d1_d1_dynamics6_history_utility_attribution

## Question

D4-D2-D1-D1-D1-D1-D1-D1-D1 produced a valid fresh prospective failure for CAUSAL_MARGIN_DYNAMICS6.

The fitted standardized coefficients were:

```text
history t-5  +0.015055
history t-4  +0.000703
history t-3  -0.003756
history t-2  -0.004257
history t-1  +0.004905
current t    +0.277416
```

and prospective behavior remained close to the frozen absolute-margin comparator.

This experiment asks:

> Did the five historical margin terms materially and selectively change event decisions, or did the fitted DYNAMICS6 model effectively collapse to a current-margin readout?

This is attribution only. No refit, threshold search, or deployment claim is allowed.

---

## 1. frozen prerequisite

Require:

```text
result
  dc56956d3a3589660b377d7aabd091f22cec5bea

receipt
  fc6bd0d6b281085225f3e2e1747b116c1be3be31

run
  36780843521

artifact
  11129499847

artifact digest
  sha256:509b65a56127577f5195c0734225c7d62b3ea591ff72cf9c82e3231364408806

JSON sha256
  535d99f8de11943631f6a2399355a3c9d2030f2da3b253a489fb971b7fd95364

DYNAMICS6 model SHA
  c55667f336c004a2fe649a3019d77ca4cc08b2b3791b635ae977ce2bf5894e41

selected threshold
  0.7026438754417108
```

The exact fresh prospective DYNAMICS6 A/B metrics must be reproduced before attribution.

---

## 2. attribution cohorts

Reuse the exact failed fresh prospective cohorts solely for failure attribution.

A:

```text
6261000 6271000 6281000 6291000
6301000 6311000 6321000 6331000
interruption 6347000
```

B:

```text
6351000 6361000 6371000 6381000
6391000 6401000 6411000 6421000
interruption 6437000
```

Exactly 64 tapes each.

No new generalization claim is allowed from these cohorts.

---

## 3. exact frozen score decomposition

For every eligible DYNAMICS6 frame, with standardized features z_0..z_5:

```text
fullScore =
  intercept
  + historyContribution
  + currentContribution

historyContribution =
  beta_0*z_0
  + beta_1*z_1
  + beta_2*z_2
  + beta_3*z_3
  + beta_4*z_4

currentContribution =
  beta_5*z_5
```

Use the exact frozen model parameters from authoritative evidence.

No alternative standardization is permitted.

---

## 4. fixed full eventizer

Preserve exactly:

```text
tau = 0.7026438754417108
positive_t = fullScore_t >= tau
crossing_t = positive_t && !positive_(t-1)
refractory = 10 steps
matching = earliest unmatched event in [hit, hit+10)
```

Reproduce the authoritative fresh A/B event metrics exactly.

---

## 5. history-neutral counterfactual

Construct a no-refit diagnostic counterfactual by setting historical standardized features to their TRAIN mean:

```text
z_0 = z_1 = z_2 = z_3 = z_4 = 0
```

while preserving the current standardized margin:

```text
z_5 unchanged
```

Therefore:

```text
currentOnlyScore =
  intercept + beta_5*z_5
```

Use the exact same frozen threshold:

```text
tau = 0.7026438754417108
```

and the exact same crossing/refractory/matching logic.

This is an attribution ablation only. Its metrics may not be used to select a new threshold or deployment policy.

---

## 6. event-decision divergence

For each tape compare emitted event steps from the full DYNAMICS6 eventizer and the current-only counterfactual.

Report:

```text
fullEvents
currentOnlyEvents
sharedExactStepEvents
historyAddedEvents
historyRemovedEvents
symmetricDifferenceEvents
symmetricDifferenceFraction =
  symmetricDifferenceEvents /
  max(1, fullEvents + currentOnlyEvents)
```

Definitions:

```text
historyAddedEvents =
  full event steps absent from current-only event steps

historyRemovedEvents =
  current-only event steps absent from full event steps
```

Comparison is exact simulation step equality only.

---

## 7. history-added event quality

Using the matching state of the full DYNAMICS6 eventizer, classify every historyAddedEvent as:

```text
MATCHED
FALSE
```

Report:

```text
historyAddedMatched
historyAddedFalse
historyAddedPrecision =
  historyAddedMatched /
  historyAddedEvents
```

No threshold is applied to this descriptive precision.

---

## 8. contribution geometry at full emitted events

For every full DYNAMICS6 emitted event compute:

```text
historyContribution
currentContribution
absHistoryToCurrentRatio =
  abs(historyContribution) /
  max(1e-12, abs(currentContribution))
```

Separate events into:

```text
MATCHED_EVENT
FALSE_EVENT
```

For each group and each scalar report:

```text
n
mean
q25
median
q75
q90
```

Also report evaluator-only AUC:

```text
historyContribution:
  matched positive
  false negative
```

No contribution threshold may be selected.

---

## 9. fixed counterfactual metric deltas

For each cohort report:

```text
full precision - currentOnly precision
full recall    - currentOnly recall
full F1        - currentOnly F1
full event/hit - currentOnly event/hit
full count MAE - currentOnly count MAE
```

These are attribution deltas only.

---

## 10. frozen history-utility axis

Apply in this precedence.

### HISTORY_NEGLIGIBLE

Both cohorts satisfy all:

```text
abs(fullRecall-currentOnlyRecall) < 0.01
abs(fullPrecision-currentOnlyPrecision) < 0.01
symmetricDifferenceFraction < 0.10
```

### HISTORY_SELECTIVELY_HELPFUL

Both cohorts satisfy:

```text
fullRecall-currentOnlyRecall >= 0.01
historyAddedPrecision >= 0.75
```

### HISTORY_ACTIVE_NONSELECTIVE

Both cohorts satisfy:

```text
symmetricDifferenceFraction >= 0.10
historyAddedPrecision < 0.75
```

### otherwise

```text
MIXED_HISTORY_UTILITY
```

---

## 11. support

Require per cohort:

```text
64 tapes
physical impacts >= 1000
full matched events >= 1000
full emitted events >= 1000
```

and globally:

```text
DYNAMICS6 model SHA matches
selected threshold matches
exact prospective metric reproduction passes
```

Otherwise:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_IMPLEMENTATION_OR_PROVENANCE_INVALID
```

or, for count support only:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_INSUFFICIENT_ATTRIBUTION_SUPPORT
```

---

## 12. valid outcome

After exact reproduction and support:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_DYNAMICS6_HISTORY_UTILITY_ATTRIBUTED
```

The result must report:

```text
historyUtilityAxis
event-decision divergence
history-added event quality
matched/false contribution geometry
history-contribution AUC
current-only counterfactual metrics
full-minus-current-only metric deltas
```

---

## 13. next-step interpretation

No repair is implemented in this experiment.

If:

```text
HISTORY_NEGLIGIBLE
```

then scalar-margin temporal history is exhausted as a useful representation direction. The next repair should operate on the underlying PCA32 neural trajectory before scalar three-class compression.

If:

```text
HISTORY_SELECTIVELY_HELPFUL
```

then a separately preregistered representation may preserve the useful history component without prospective tuning.

If:

```text
HISTORY_ACTIVE_NONSELECTIVE
```

then history is active but does not discriminate true versus false events; a richer temporal representation is required.

If MIXED, perform a narrower diagnostic before repair.

---

## 14. stop rule / deployment

No refit, threshold search, temporal-depth search, refractory change, or deployment change.

```text
diagnosticStackDeployable = false
POTION v15D  DEPLOYED
v15N         CLOSED / BLOCKED
v16C         BLOCKED
```
