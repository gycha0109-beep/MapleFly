# result_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1 — neural-only max-component surprise32 repair

## Status

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_NEURAL_ONLY_MAX_COMPONENT_SURPRISE32_EVENT_STREAM_NOT_DEMONSTRATED
```

Authoritative evidence:

```text
run            37179603274
simulate job   111369336290
analyze job    111374145746
head           1c7643fa337b24422090739aa093f1c21a5bb4e7
artifact       11294069478
artifact sha   sha256:3c23c8d3a6a1a44ada98641f6ca86e8a653b66d43321c6c8c7807074523a4f3e
JSON sha256    2838b9c29fd358a63348e0cc386b46bde7e36a0290f9ffdaf4e4526bb79d922c
```

Frozen chain:

```text
failure attribution  a14ee53782eafa8955144d575b89bd76ae44f564
repair design        c072a69ba8accd346e54e6511be40ac557bbe619
repair prereg        9e177539afc4ddadee87427f2d0b469d925ffb0f
implementation       48920db601988950849ea80251e2a5f5c2da069d
workflow             1c7643fa337b24422090739aa093f1c21a5bb4e7
```

## Base reproduction

Frozen predictive-surprise32 base model reproduced exactly.

```text
model SHA expected
de8cc3c24cbb91a3a9a806aa2afe37ecd0294c0d2c4b5ce2d4a93c25d77a1cde

model SHA observed
de8cc3c24cbb91a3a9a806aa2afe37ecd0294c0d2c4b5ce2d4a93c25d77a1cde

raw threshold expected
1.574078960908224

raw threshold observed
1.574078960908224

TRAIN tapes              64
TRAIN predictive rows 30080
CAL tapes                64
CAL raw scores        30080
```

## Frozen repair

```text
score
max_j(r_j^2)

components
32

q
0.95

tau_max
12.389163171560895

refractory
10

repair model SHA
17c5b3e45a1748b940a903b02684c3683838825a6b77d4eeee04af963f9af6fb
```

Calibration support passed before prospective truth evaluation.

## PROSPECTIVE_E

```text
tapes             64
physical impacts 1716
neural events    1425
matched           151
false events     1274
missed impacts   1565

precision        0.10596491228070175  FAIL
recall           0.087995337995338    FAIL
F1               0.09614772365488698  FAIL
event/hit        0.8304195804195804   PASS
count MAE        5.234375             FAIL

median latency   0.08 s
p90 latency      0.18 s
rising edges     1425
refractory suppressed 0
```

Prospective support passed.

## PROSPECTIVE_F

```text
tapes             64
physical impacts 1737
neural events    1365
matched           131
false events     1234
missed impacts   1606

precision        0.09597069597069598  FAIL
recall           0.07541738629821532  FAIL
F1               0.08446163765312703  FAIL
event/hit        0.7858376511226253   FAIL
count MAE        6.34375              FAIL

median latency   0.10 s
p90 latency      0.16 s
rising edges     1365
refractory suppressed 0
```

Prospective support passed.

## Provenance

```text
strippedNeuralViews                     true
preFreezeTruthAccess                    false
thresholdSelectionUsesTruth             false
teacherUsed                             false
supervisedReadoutUsed                   false
attributionCohortsUsedForRepairFitting  false
attributionCohortsUsedForRepairEvaluation false
componentSelection                      false
topKSearch                              false
learnedWeights                          false
thresholdCandidateSearch                false
thresholdQuantileChanged                false
analysis tapeBuildAllowed               false
analysis simulationContextInitialized   false
```

All four analysis packs were cache hits.

## Interpretation

Replacing the mean standardized residual energy with a parameter-free max-component residual energy did not recover impact alignment.

The max aggregation preserves approximately the correct event count on E and is near the lower count boundary on F, but temporal correspondence remains extremely poor:

- precision is only about 9.6–10.6%;
- recall is only about 7.5–8.8%;
- F1 is below 0.10 on both cohorts;
- refractory suppression is zero.

Therefore the prior failure cannot be explained solely by sparse component anomalies being diluted by the mean aggregation.

This result does not authorize component selection, top-k search, weighted aggregation, threshold lowering, smoothing, or timing shifts using E/F. E/F are now outcome-bearing prospective cohorts.

## Scientific status

```text
baseReproductionPass       true
calibrationPass            true
supportPass                true
prospective E              FAIL
prospective F              FAIL

diagnosticStackDeployable  false
deployabilityCandidate     false
deployment                 BLOCKED
```

## Deployment

```text
POTION v15D  DEPLOYED
v15N         CLOSED / BLOCKED
v16C         BLOCKED
```

Any next repair requires attribution or a new preregistered experiment with fresh prospective cohorts.
