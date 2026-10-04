# result_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1 — neural-only predictive-surprise32 multilag-rise repair

## Status

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_NEURAL_ONLY_PREDICTIVE_SURPRISE32_MULTILAG_RISE_EVENT_STREAM_NOT_DEMONSTRATED
```

Authoritative evidence:

```text
run            37173877851
simulate job   111352347436
analyze job    111359167247
head           a1619b184ef9592aafaacfe239ef8ef739049bda
artifact       11293292628
artifact sha   sha256:82c80090244e5f8f0a025e92062b31d83bad4e19ea65490f465a24814db63217
JSON sha256    e6220d2e027e5dd8dfa34bd862be1af731a03a76d967de91534977618919b98e
```

Frozen chain:

```text
failure attribution  de832935668da237570c7eb00cb66de7527c90bd
repair design        e579dc9e232938e45ed455df39f279ece5817bfe
repair prereg        48ab3eabdf94c85f14f12c6f58122a96d7ee9643
implementation       3f8feaa75b07bb2a097cf9b48862b181eb735b93
workflow             a1619b184ef9592aafaacfe239ef8ef739049bda
```

## Base reproduction

The frozen predictive-surprise32 base model reproduced exactly.

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
formula
max(0,s_t-s_(t-1),s_t-s_(t-3),s_t-s_(t-5))

lags
1 / 3 / 5 score frames

q
0.95

finite calibration scores
29760

tau_rise
1.0756203121500945

refractory
10

repair model SHA
8556002505564c754f972abd62afc20ff8b89f0e7bca52b7e365a6f5120b275a
```

Calibration support passed before prospective truth evaluation.

## PROSPECTIVE_C

```text
tapes             64
physical impacts 1721
neural events    1373
matched           164
false events     1209
missed impacts   1557

precision        0.11944646758922069  FAIL
recall           0.09529343404997094  FAIL
F1               0.10601163542340013  FAIL
event/hit        0.7977919814061593   FAIL
count MAE        6.3125               FAIL

median latency   0.10 s
p90 latency      0.16 s
rising edges     1373
refractory suppressed 0
```

Prospective support passed.

## PROSPECTIVE_D

```text
tapes             64
physical impacts 1703
neural events    1319
matched           175
false events     1144
missed impacts   1528

precision        0.1326762699014405   FAIL
recall           0.10275983558426306  FAIL
F1               0.11581733951025812  FAIL
event/hit        0.7745155607751028   FAIL
count MAE        6.53125              FAIL

median latency   0.10 s
p90 latency      0.16 s
rising edges     1319
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
repairLagSearch                         false
thresholdCandidateSearch                false
thresholdQuantileChanged                false
analysis tapeBuildAllowed               false
analysis simulationContextInitialized   false
```

The analysis stage loaded all four exact Tape Packs from cache and did not simulate.

## Interpretation

The preregistered local-rise repair did not recover impact alignment.

C and D independently reproduce the same qualitative failure pattern as the prior neural-only event stream:

- event count remains of the same order as physical impacts;
- only about 9.5–10.3% of impacts are recalled;
- precision remains about 12–13%;
- there are no refractory-suppressed crossings;
- count error is worse than the frozen gate on both cohorts.

Therefore the problem is not repaired by replacing absolute predictive-surprise magnitude with the preregistered multi-lag positive rise contrast.

This result does not authorize changing `q=0.95`, adding nearby lags, smoothing the rise score, or lowering `tau_rise` using C/D outcomes. C/D are now outcome-bearing prospective cohorts and cannot be reused to tune a repair.

## Scientific status

```text
baseReproductionPass       true
calibrationPass            true
supportPass                true
prospective C              FAIL
prospective D              FAIL

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

Per preregistration, any next repair requires a new design and preregistration with fresh prospective cohorts.
