# prereg_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_d1_d1_d1 — dynamics6 history utility attribution

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / OUTCOME**

Design:

```text
history/design_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_d1_d1_d1_dynamics6_history_utility_attribution.md
commit 55d522309e7b8126e46c626c4b0ce0f576b1735c
```

Frozen prerequisite:

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

## Attribution cohorts

Reuse only for attribution:

```text
A
6261000 6271000 6281000 6291000
6301000 6311000 6321000 6331000
interruption 6347000

B
6351000 6361000 6371000 6381000
6391000 6401000 6411000 6421000
interruption 6437000
```

Exactly 64 tapes each.

No new generalization claim.

## Exact reproduction

Reconstruct the frozen upstream three-class model and the frozen DYNAMICS6 model.

Require exact reproduction of authoritative fresh A/B DYNAMICS6 metrics.

Any model SHA, threshold, provenance, or metric mismatch:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_IMPLEMENTATION_OR_PROVENANCE_INVALID
```

## Score decomposition

For standardized DYNAMICS6 features z_0..z_5:

```text
historyContribution =
  beta_0*z_0
  + beta_1*z_1
  + beta_2*z_2
  + beta_3*z_3
  + beta_4*z_4

currentContribution =
  beta_5*z_5

fullScore =
  intercept
  + historyContribution
  + currentContribution
```

Use exact frozen model parameters.

## Full eventizer

Exactly:

```text
tau = 0.7026438754417108
positive = fullScore >= tau
crossing = positive && !previousPositive
refractory = 10 steps
matching = earliest unmatched event in [hit, hit+10)
```

## History-neutral counterfactual

No refit.

Set:

```text
z_0 = z_1 = z_2 = z_3 = z_4 = 0
z_5 unchanged
```

Therefore:

```text
currentOnlyScore =
  intercept + beta_5*z_5
```

Use the same frozen tau, crossing rule, refractory, and matching.

No counterfactual threshold search.

## Event-decision divergence

Per cohort report:

```text
fullEvents
currentOnlyEvents
sharedExactStepEvents
historyAddedEvents
historyRemovedEvents
symmetricDifferenceEvents
symmetricDifferenceFraction
```

Exact simulation-step equality only.

## History-added event quality

Under the full eventizer matching state classify each historyAddedEvent as MATCHED or FALSE.

Report:

```text
historyAddedMatched
historyAddedFalse
historyAddedPrecision
```

No gate is applied to this value except the frozen history-utility axis below.

## Contribution geometry

At every full emitted event report separately for MATCHED_EVENT and FALSE_EVENT:

```text
historyContribution
currentContribution
absHistoryToCurrentRatio
```

For each scalar:

```text
n
mean
q25
median
q75
q90
```

Also compute evaluator-only AUC of historyContribution:

```text
matched = positive
false = negative
```

No threshold selection from contribution values or AUC.

## Metric deltas

Report:

```text
full precision - currentOnly precision
full recall - currentOnly recall
full F1 - currentOnly F1
full event/hit - currentOnly event/hit
full count MAE - currentOnly count MAE
```

## Frozen history-utility axis

Precedence:

### HISTORY_NEGLIGIBLE

Both cohorts:

```text
abs(fullRecall-currentOnlyRecall) < 0.01
abs(fullPrecision-currentOnlyPrecision) < 0.01
symmetricDifferenceFraction < 0.10
```

### HISTORY_SELECTIVELY_HELPFUL

Both cohorts:

```text
fullRecall-currentOnlyRecall >= 0.01
historyAddedPrecision >= 0.75
```

### HISTORY_ACTIVE_NONSELECTIVE

Both cohorts:

```text
symmetricDifferenceFraction >= 0.10
historyAddedPrecision < 0.75
```

Otherwise:

```text
MIXED_HISTORY_UTILITY
```

## Support

Per cohort require:

```text
64 tapes
physical impacts >= 1000
full matched events >= 1000
full emitted events >= 1000
```

Count support failure:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_INSUFFICIENT_ATTRIBUTION_SUPPORT
```

## Valid outcome

After exact reproduction and support:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_DYNAMICS6_HISTORY_UTILITY_ATTRIBUTED
```

## Stop rule

No:

- model refit;
- threshold search;
- temporal-depth search;
- refractory change;
- alternate eventizer;
- deployment change.

```text
diagnosticStackDeployable = false
POTION v15D  DEPLOYED
v15N         CLOSED / BLOCKED
v16C         BLOCKED
```
