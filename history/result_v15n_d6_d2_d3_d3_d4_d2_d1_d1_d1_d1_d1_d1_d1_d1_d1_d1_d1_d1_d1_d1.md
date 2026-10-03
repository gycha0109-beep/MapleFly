# result_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1 — neural-only predictive surprise32

## Status

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_NEURAL_ONLY_PREDICTIVE_SURPRISE32_EVENT_STREAM_NOT_DEMONSTRATED
```

Authoritative evidence:

```text
run            37081864923
job            111083917653
head           c36f5d71be49336369adef19c892565d2b3e94cf
artifact       11261347073
artifact sha   sha256:9a1b598b06faa99568f902794ddaf9042d7d2ca5dcf5224a4b17792e4659c3cc
JSON sha256    78549dfb7514c4d3732ca9e4f6239ad6b1bc88162cf10312b661494b1bbc9546
```

Frozen chain:

```text
design          dc4b7c7f9625e38557c91628ba0b6f2395d88477
prereg          f11e04bb7dad3bcbc5324b66322e6d6e5d99aad6
implementation  23e36c3dbc9c8a70104b174310d9b2d6d7466baf
workflow        c36f5d71be49336369adef19c892565d2b3e94cf
```

## Frozen neural-only model

```text
model SHA
de8cc3c24cbb91a3a9a806aa2afe37ecd0294c0d2c4b5ce2d4a93c25d77a1cde

PCA components       32
phase count          48
innovation history    5
predictor lags        1 / 3 / 5
predictor width       96
ridge                 0.001
threshold quantile    0.95
threshold             1.574078960908224
refractory           10
```

No model refit, quantile change, threshold search, supervised teacher import, feature search, lag search, or refractory tuning occurred after prospective evaluation.

## Support and provenance

```text
TRAIN tapes              64
TRAIN predictive rows 30080
CAL tapes                64
CAL finite scores     30080

strippedNeuralViews            true
preFreezeTruthAccess           false
thresholdSelectionUsesTruth    false
teacherUsed                    false
supervisedReadoutUsed          false
physicalTruthEvaluatorOnly     true

MODEL_FROZEN before prospective truth evaluation      true
THRESHOLD_FROZEN before prospective truth evaluation  true
```

The neural-only provenance contract passed.

## PROSPECTIVE_A

```text
tapes             64
physical impacts 1747
neural events    1435
matched           192
false events     1243
missed impacts   1555

precision       0.1337979094  FAIL
recall          0.1099026903  FAIL
F1              0.1206788184  FAIL
event/hit       0.8214081282  PASS
count MAE       5.8750000000  FAIL
median latency  0.10 s
p90 latency     0.16 s
```

## PROSPECTIVE_B

```text
tapes             64
physical impacts 1704
neural events    1376
matched           172
false events     1204
missed impacts   1532

precision       0.1250000000  FAIL
recall          0.1009389671  FAIL
F1              0.1116883117  FAIL
event/hit       0.8075117371  PASS
count MAE       5.4687500000  FAIL
median latency  0.10 s
p90 latency     0.16 s
```

Both cohorts satisfy prospective support floors, but both independently fail the frozen event-stream gates.

## Interpretation

The failure is not an event-count collapse. Event/hit remains inside the preregistered 0.80–1.20 interval on both cohorts.

The dominant observed problem is alignment: the predictive-surprise event stream emits roughly the right order of event count, but only a small fraction of events match physical impacts within the frozen evaluator window.

Therefore the neural-only predictive-surprise32 bridge is not demonstrated and is not deployable.

This result does not authorize changing the frozen neural-tail quantile:

```text
q = 0.95
```

Do not lower or retune the threshold from these prospective outcomes.

Per preregistration, the next scientific phase is neural-only failure attribution. Attribution may use physical truth only for post-freeze diagnosis and must not reuse attribution cohorts to make a generalization claim or directly tune the next model.

Minimum attribution targets:

```text
impact-adjacent pre-hit surprise
impact-adjacent post-hit surprise
background surprise
rising-edge timing
peak rank around impacts
nearest neural-event / impact distance
false-event PRE_HIT / POST_HIT / BACKGROUND composition
maximum surprise around missed impacts
```

## Scientific status

```text
deployabilityCandidate      false
diagnosticStackDeployable   false
deployment                  BLOCKED
```

## Deployment

```text
POTION v15D  DEPLOYED
v15N         CLOSED / BLOCKED
v16C         BLOCKED
```
