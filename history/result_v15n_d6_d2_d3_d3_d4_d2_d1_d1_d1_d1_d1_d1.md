# result_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_d1 — margin-crossing failure attribution

## Status

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_MARGIN_CROSSING_FAILURE_ATTRIBUTED
```

Authoritative evidence:

```text
run            36716008149
head           e97dbabbbabc0f2cb2de16e31bf3e5c8774eed23
artifact       11101046573
artifact sha   sha256:b8201285760a9bbd2d19000a24b22312e974b530320ea33cc8bfc522c66f934b
JSON sha256    21f2b96ff0f94534b88aa329ae34c11441d42123226953da3884bedf394041f7
```

Frozen chain:

```text
design          15ab0597509f438fd1fa822c362549501d3310e3
prereg          d5f9a34107cd90b6a7c9fa58e7bbebd67a37ac80
implementation  b4875998a2bdaefc554c73852dc7460d9713adb1
workflow        e97dbabbbabc0f2cb2de16e31bf3e5c8774eed23
```

Prerequisite reproduction passed exactly against the authoritative margin-crossing prospective result.

Frozen threshold:

```text
tau = 0.2378919189622094
```

## Support

```text
A: 64 tapes, 1711 impacts, 1281 matched, 430 missed — PASS
B: 64 tapes, 1712 impacts, 1329 matched, 383 missed — PASS
```

## False-event timing

A:

```text
PRE_HIT_200MS         100 / 413 = 0.242131
RECENT_POST_HIT_200MS   0 / 413 = 0
BACKGROUND_200MS      313 / 413 = 0.757869
```

B:

```text
PRE_HIT_200MS         100 / 439 = 0.227790
RECENT_POST_HIT_200MS   0 / 439 = 0
BACKGROUND_200MS      339 / 439 = 0.772210
```

Precision already passed in the prospective experiment; this distribution is descriptive only.

## Miss attribution

A:

```text
MATCH_CONFLICT                         0 / 430 = 0
REFRACTORY_SUPPRESSED_CROSSING         0 / 430 = 0
PRE_HIT_ABOVE_THRESHOLD_CARRYOVER     59 / 430 = 0.137209
ABOVE_THRESHOLD_NO_EVENT_OTHER         0 / 430 = 0
NO_THRESHOLD_WINDOW                  371 / 430 = 0.862791
```

B:

```text
MATCH_CONFLICT                         0 / 383 = 0
REFRACTORY_SUPPRESSED_CROSSING         0 / 383 = 0
PRE_HIT_ABOVE_THRESHOLD_CARRYOVER     48 / 383 = 0.125326
ABOVE_THRESHOLD_NO_EVENT_OTHER         0 / 383 = 0
NO_THRESHOLD_WINDOW                  335 / 383 = 0.874674
```

Frozen axis:

```text
missAxis = NO_THRESHOLD_DOMINANT
```

## NO_THRESHOLD_WINDOW geometry

Threshold gap is:

```text
tau - peakMarginWithin200ms
```

A:

```text
n       371
mean    0.157573
q10     0.020689
q25     0.060354
median  0.130024
q75     0.221159
q90     0.334973
```

B:

```text
n       335
mean    0.150006
q10     0.018963
q25     0.055594
median  0.122415
q75     0.214816
q90     0.322381
```

Only a minority cross the frozen threshold late in [200,400) ms:

```text
A  66 / 371 = 0.177898
B  70 / 335 = 0.208955
```

For those late crossings, median latency is 0.20 s and p90 is 0.26 s on both cohorts.

## PRE_HIT carryover geometry

Carryover is secondary rather than dominant.

Post-hit gain:

```text
A n=59
  mean    0.229080
  median  0.198267
  q75     0.421076
  q90     0.593405

B n=48
  mean    0.236502
  median  0.227025
  q75     0.415000
  q90     0.653603
```

The continuous margin often rises after impact in carryover cases, but these cases are only about 13% of misses.

## Cohort asymmetry

A and B have almost the same failure structure:

```text
A-B PRE_HIT carryover fraction  +0.011883
A-B NO_THRESHOLD fraction       -0.011883
A-B median threshold gap        +0.007610
A-B median post-hit gain        -0.028758
```

The prospective A-only gate failure is therefore not explained by a qualitatively different miss mechanism.

## Interpretation

The margin-crossing repair eliminated the earlier event-count explosion and reached near-gate prospective performance, but the remaining recall blocker is not eventization mechanics:

- no matching conflicts;
- no refractory-suppressed crossings;
- no above-threshold-without-event residual category;
- only about 13% pre-hit carryover;
- about 86–87% of misses never reach the frozen margin threshold within 200 ms.

The median shortfall is materially larger than the 0.001315 aggregate recall deficit that caused A to miss the gate. Therefore lowering the frozen threshold based on these attribution cohorts would be scientifically invalid and would also ignore the representation-level nature of most misses.

The next experiment should test a causal neural-change representation that can detect impact-evoked change even when the absolute three-class margin remains below tau. It must use separate training/calibration/fresh prospective cohorts and may not use these attribution cohorts for parameter or threshold selection.

## Deployment

```text
POTION v15D  DEPLOYED
v15N         CLOSED / BLOCKED
v16C         BLOCKED
```
