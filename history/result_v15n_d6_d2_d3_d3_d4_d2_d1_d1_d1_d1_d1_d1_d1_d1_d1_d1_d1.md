# result_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1 — anchored-delta3 confirmatory failure attribution

## Status

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_ANCHORED_DELTA3_CONFIRMATORY_FAILURE_ATTRIBUTED
```

Frozen axis:

```text
missAxis = NO_THRESHOLD_DOMINANT
```

Authoritative evidence:

```text
run            36946779676
head           8e28d38c6b1a777c96894773c99ae8f49ac1e7cf
artifact       11205110870
artifact sha   sha256:4cc65f58cdfad2306c6e95f3dd71559f66982db9051d6ec705740d6a26078671
JSON sha256    e17825f01a6f1b61ea8035c7c1779c8499a5f08b85aed1da0e7ddbd236ff9764
```

Frozen chain:

```text
design          28a902b71e3aed80cccae20d8b5faa0941dacc12
prereg          436a8a40019240bbcdaadadb5dfd45858a0452ef
implementation  c207a2c46f222cdd4b942edfbfaec9c87e709a2b
workflow        8e28d38c6b1a777c96894773c99ae8f49ac1e7cf
```

Prerequisite reproduction passed exactly.

Frozen trajectory model:

```text
6f2e4c0ec8c7ae438934a1b13db8f062387df3354383b6fab19eac5d8f354105
```

Frozen threshold:

```text
0.5918989570787438
```

## Support

```text
A: 64 tapes, 1700 impacts, 1270 matched, 430 missed — PASS
B: 64 tapes, 1709 impacts, 1288 matched, 421 missed — PASS
```

## Miss attribution

### A

```text
MATCH_CONFLICT                         0 / 430 = 0
REFRACTORY_SUPPRESSED_CROSSING         0 / 430 = 0
PRE_HIT_ABOVE_THRESHOLD_CARRYOVER     32 / 430 = 0.074419
ABOVE_THRESHOLD_NO_EVENT_OTHER         0 / 430 = 0
NO_THRESHOLD_WINDOW                  398 / 430 = 0.925581
```

### B

```text
MATCH_CONFLICT                         0 / 421 = 0
REFRACTORY_SUPPRESSED_CROSSING         0 / 421 = 0
PRE_HIT_ABOVE_THRESHOLD_CARRYOVER     33 / 421 = 0.078385
ABOVE_THRESHOLD_NO_EVENT_OTHER         0 / 421 = 0
NO_THRESHOLD_WINDOW                  388 / 421 = 0.921615
```

Both cohorts exceed the frozen strict > 0.50 dominance criterion for NO_THRESHOLD_WINDOW.

Therefore:

```text
missAxis = NO_THRESHOLD_DOMINANT
```

## NO_THRESHOLD geometry

A threshold-gap distribution:

```text
rows    398
mean    0.096806
q10     0.015708
q25     0.032500
median  0.073544
q75     0.137315
q90     0.218879
```

B:

```text
rows    388
mean    0.097507
q10     0.013526
q25     0.036540
median  0.078053
q75     0.130316
q90     0.205268
```

The missed-impact score deficit is not concentrated at an infinitesimal epsilon below the frozen threshold. The median miss remains roughly 0.07–0.08 below tau.

Late threshold recovery in [200,400) ms:

```text
A 57 / 398 = 0.143216
B 62 / 388 = 0.159794
```

Median first late crossing latency is 0.20 s in both cohorts.

This is too small a fraction to make delayed eventization the primary explanation.

## Carryover geometry

Carryover is secondary:

```text
A 32 misses = 7.44%
B 33 misses = 7.84%
```

Median post-hit gain:

```text
A 0.176993
B 0.215701
```

These cases contain substantial post-impact score increase, but they are too few to define the dominant failure mode.

## False-event timing

A unmatched emitted events:

```text
PRE_HIT_200MS          93 / 371 = 0.250674
RECENT_POST_HIT_200MS   0 / 371 = 0
BACKGROUND_200MS       278 / 371 = 0.749326
```

B:

```text
PRE_HIT_200MS          88 / 389 = 0.226221
RECENT_POST_HIT_200MS   0 / 389 = 0
BACKGROUND_200MS       301 / 389 = 0.773779
```

Precision already passed in both confirmation cohorts. These counts are descriptive and do not authorize threshold adjustment.

## Cohort asymmetry

A minus B:

```text
NO_THRESHOLD_WINDOW fraction                 +0.003966
PRE_HIT_ABOVE_THRESHOLD_CARRYOVER fraction   -0.003966
median threshold gap                         -0.004509
median post-hit gain                         -0.038708
```

The failing A cohort is not explained by a qualitatively different miss mechanism. A and B have nearly identical failure composition.

## Original versus confirmation recall

```text
original A   0.757310
confirm A    0.747059
delta       -0.010251

original B   0.753239
confirm B    0.753657
delta       +0.000418
```

The independent A failure is therefore a robustness failure near the operating boundary, not a new eventizer failure mode.

## Interpretation

The frozen eventizer is not the current blocker.

There were:

```text
0 refractory-suppressed misses
0 matching-conflict misses
0 above-threshold/no-event-other misses
```

on both confirmation cohorts.

More than 92% of missed impacts simply never reached the frozen anchored-delta3 threshold inside the 200 ms matching window.

The remaining blocker is therefore the sensitivity/separability of the frozen anchored-delta3 linear score.

The confirmation cohorts must not be used to lower tau or refit the existing model.

The next repair must use completely new TRAIN/CALIBRATION/prospective cohorts and improve the neural score/readout itself while preserving the frozen PCA32 anchored-delta3 representation unless separately preregistered otherwise.

## Deployment

```text
modelRefit                  false
calibrationRerun            false
thresholdSearched           false
featureSearched             false
horizonSearched             false
refractoryTuned             false
diagnosticStackDeployable   false

POTION v15D  DEPLOYED
v15N         CLOSED / BLOCKED
v16C         BLOCKED
```
