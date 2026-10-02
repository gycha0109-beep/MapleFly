# result_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1 — anchored-delta3 quadratic256

## Status

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_ANCHORED_DELTA3_QUADRATIC256_EVENT_STREAM_DEMONSTRATED
```

Authoritative evidence:

```text
run            36974010880
head           795381f0324b01321f80d3fbd5b8a5133fbebe86
artifact       11217152053
artifact sha   sha256:99feb39b45a6cdaf722a9cdc618e7037126b2fbb9f67c7a7594bf98973c650e4
JSON sha256    d7e1633ca5e9df1b0c96641919a887af86ea55a16dd7eb4fb49ae43644d2beac
```

Frozen chain:

```text
design          79ccffa291a6dc707fc3c4b667adcebff21fe94f
prereg          a14c87c44df31f0d5a349ae1ccc023c6485f1b86
implementation  ee07c07a43aee7fb948dea4b40e7cb9d3a9e7851
workflow        795381f0324b01321f80d3fbd5b8a5133fbebe86
```

Prerequisite failure-attribution axis:

```text
NO_THRESHOLD_DOMINANT
```

## Model

```text
feature family
  PCA32_ANCHORED_DELTA3_QUADRATIC256

base width
  128

quadratic width
  256

horizons
  1 / 3 / 5 frames

cross-products
  none

model SHA
  6f72c6c5070b0a8bd9e3d64627614790fdb8c1c97b21b1f408ed1852ec5aaff7
```

TRAIN support:

```text
tapes             64
REALIZED_IMPACT   3367
PRE_HIT           2764
TRUE_BACKGROUND  23949

PASS
```

## Calibration

```text
tapes                 64
physical impacts     1699
threshold candidates 24154
feasible thresholds    711

selected threshold
0.6097593618468664
```

Selected calibration metrics:

```text
precision       0.820418
recall          0.785168
F1              0.802406
event/hit       0.957034
count MAE       2.203125
median latency  0.10 s
p90 latency     0.14 s

PASS
```

## Fresh PROSPECTIVE_A

```text
physical impacts 1720
neural events    1654
matched          1336
false events      318
missed impacts    384

precision       0.807739  PASS
recall          0.776744  PASS
F1              0.791938  PASS
event/hit       0.961628  PASS
count MAE       2.125000  PASS
median latency  0.10 s
p90 latency     0.14 s
```

## Fresh PROSPECTIVE_B

```text
physical impacts 1744
neural events    1697
matched          1361
false events      336
missed impacts    383

precision       0.802004  PASS
recall          0.780390  PASS
F1              0.791049  PASS
event/hit       0.973050  PASS
count MAE       2.609375  PASS
median latency  0.10 s
p90 latency     0.14 s
```

Both fresh cohorts independently pass every frozen gate.

## Frozen linear comparator on the same fresh cohorts

A:

```text
precision  0.777575
recall     0.741860  FAIL
F1         0.759298
```

B:

```text
precision  0.809699
recall     0.756307
F1         0.782093
```

Quadratic256 versus frozen linear:

```text
A recall  +0.034884
A precision +0.030164
A F1      +0.032641

B recall  +0.024083
B precision -0.007696
B F1      +0.008956
```

The fresh A cohort is particularly diagnostic: the exact frozen linear anchored-delta3 readout fails recall, while the preregistered quadratic readout passes all gates on the same neural tapes.

## Interpretation

The anchored-delta3 PCA32 neural trajectory contains sufficient information for a prospective event stream.

The prior confirmatory failure was not caused by refractory behavior, matching semantics, or the 1/3/5-frame causal horizons. It was primarily a limitation of the linear score geometry.

Adding only elementwise squared energy terms, while keeping:

- the same PCA32 basis;
- the same 20/60/100 ms horizons;
- the same eventizer;
- the same refractory;
- the same matching rule;

recovers a robust fresh A/B demonstration.

No cross-feature interactions, hidden layers, recurrence, or prospective retuning were used.

This is stronger evidence that impact information is encoded nonlinearly in the frozen anchored-delta3 neural trajectory.

## Scientific status

This is still evaluator-supervised:

```text
diagnosticStackDeployable = false
```

Therefore this result does not authorize deployment.

Before any deployability bridge, the quadratic result should undergo an independent frozen confirmatory replication because the earlier linear demonstration failed its own confirmation.

## Deployment

```text
POTION v15D  DEPLOYED
v15N         CLOSED / BLOCKED
v16C         BLOCKED
```
