# prereg_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1 — PCA-complement innovation failure attribution

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / OUTCOME**

Design:

```text
history/design_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_neural_only_pca_complement_failure_attribution.md
commit 4211f7799426d555a39ad49de151bbd3f8af3b89
```

## Frozen prerequisite

```text
result
  52bb0c383ce948739e334152e888a7633e1465f8

receipt
  a10559be74f8dccf30b6938d7bd272bac726abd2

run
  37202530369

analyze job
  111444826496

artifact
  11304103673

artifact digest
  sha256:bd801b07b3b0bdbf63003314ad13350f354717524fd4784d3af9a41d28f76319

JSON sha256
  cf2182a46b6d7ee9e233f01734a8f919df3914b0bd69835dc73062b4a7b1c2d5
```

Frozen contracts:

```text
base model SHA
de8cc3c24cbb91a3a9a806aa2afe37ecd0294c0d2c4b5ce2d4a93c25d77a1cde

base raw tau
1.574078960908224

complement repair model SHA
1b4489bf4e1720ebb16b8a14f16814999398c68bcbf46afc8e3c1b76e0416c7e

tau_complement
1.6592220236705837

q
0.95

refractory
10
```

## Attribution cohorts

Reuse only failed prospective cohorts for attribution.

G:

```text
8331000 8341000 8351000 8361000
8371000 8381000 8391000 8401000
interruption 8417000
```

H:

```text
8421000 8431000 8441000 8451000
8461000 8471000 8481000 8491000
interruption 8507000
```

Exactly 64 tapes each.

G/H cannot tune or validate a new repair.

## Exact reproduction gate

Before attribution reproduce exactly:

- base model SHA
- base raw tau
- complement repair model SHA
- tau_complement
- G/H all authority metrics

Any mismatch:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_PCA_COMPLEMENT_ATTRIBUTION_IMPLEMENTATION_OR_PROVENANCE_INVALID
```

## Miss attribution

For every missed impact use `[hit-10,hit+20)` with precedence:

```text
MATCH_CONFLICT
REFRACTORY_SUPPRESSED_IN_WINDOW
PRE_HIT_COMPLEMENT_CROSSING
LATE_POST_HIT_COMPLEMENT_CROSSING
ABOVE_COMPLEMENT_THRESHOLD_NO_CROSSING_IN_WINDOW
NO_LOCAL_COMPLEMENT_THRESHOLD_CROSSING
```

## False-event timing

For unmatched complement events:

```text
PRE_HIT_200MS
RECENT_POST_HIT_200MS
BACKGROUND
```

Use the same frozen definitions as prior attribution work.

## Local peak and distribution

Per physical impact in `[hit-10,hit+20)` report peak timing and threshold gap.

Report complement score q50/q75/q90/q95/q99 for:

```text
BACKGROUND
PRE_HIT
IN_WINDOW
LATE_POST_HIT
```

Also report:

```text
impactLocalQ95/backgroundQ95
impactLocalQ99/backgroundQ99
```

descriptive only.

## Frozen cross-representation context

For each G/H missed impact, compute local `[hit-10,hit+20)` threshold presence for:

```text
base mean-energy predictive surprise
  threshold 1.574078960908224

max-component surprise
  threshold 12.389163171560895

PCA-complement innovation
  threshold 1.6592220236705837
```

Classify all 8 combinations of:

```text
BASE_PRESENT|ABSENT
MAX_PRESENT|ABSENT
COMPLEMENT_PRESENT|ABSENT
```

Report counts and fractions only.

No fusion, selection, or new threshold.

## Frozen attribution axis

Strict precedence:

```text
EARLY_COMPLEMENT_SHIFT_DOMINANT
  PRE_HIT_COMPLEMENT_CROSSING > 0.50 on G and H

LATE_COMPLEMENT_SHIFT_DOMINANT
  LATE_POST_HIT_COMPLEMENT_CROSSING > 0.50 on G and H

COMPLEMENT_EVENTIZER_BLOCK_DOMINANT
  MATCH_CONFLICT
  + REFRACTORY_SUPPRESSED_IN_WINDOW
  + ABOVE_COMPLEMENT_THRESHOLD_NO_CROSSING_IN_WINDOW
  > 0.50 on G and H

COMPLEMENT_SIGNAL_ABSENT_DOMINANT
  NO_LOCAL_COMPLEMENT_THRESHOLD_CROSSING > 0.50 on G and H

BACKGROUND_COMPLEMENT_NOISE_DOMINANT
  BACKGROUND false-event fraction > 0.80 on G and H
  AND impactLocalQ95/backgroundQ95 < 1.20 on G and H

otherwise
  MIXED_PCA_COMPLEMENT_TEMPORAL_MISALIGNMENT
```

All dominance comparisons are strict.

## Support

Per cohort require:

```text
64 tapes
physical impacts >= 1000
neural events >= 500
false events >= 1000
missed impacts >= 1000
finite local peak >= 99%
finite background frames >= 10000
cross-representation context available >= 99% of misses
```

Support failure:

```text
...PCA_COMPLEMENT_INSUFFICIENT_ATTRIBUTION_SUPPORT
```

## Valid outcome

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_NEURAL_ONLY_PCA_COMPLEMENT_INNOVATION_FAILURE_ATTRIBUTED
```

## Stop rule

No:

- model refit
- q/tau change
- PCA dimension change
- DN selection
- score fusion
- smoothing
- timing shift
- eventizer change
- matching change
- G/H repair tuning
- deployment change

Any next repair requires a new design, preregistration, and fresh prospective cohorts.

## Deployment

```text
diagnosticStackDeployable = false
deployabilityCandidate    = false

POTION v15D  DEPLOYED
v15N         CLOSED / BLOCKED
v16C         BLOCKED
```
