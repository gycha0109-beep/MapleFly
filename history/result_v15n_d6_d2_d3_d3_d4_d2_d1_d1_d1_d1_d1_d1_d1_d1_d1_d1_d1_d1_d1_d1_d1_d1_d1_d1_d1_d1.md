# result_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1 — neural-only PCA-complement innovation repair

## Status

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_NEURAL_ONLY_PCA_COMPLEMENT_INNOVATION_EVENT_STREAM_NOT_DEMONSTRATED
```

Authoritative evidence:

```text
run            37202530369
simulate job   111436974949
analyze job    111444826496
head           57c5257cff919bf6dd3b87f5c120ad880c8be4a0
artifact       11304103673
artifact sha   sha256:bd801b07b3b0bdbf63003314ad13350f354717524fd4784d3af9a41d28f76319
JSON sha256    cf2182a46b6d7ee9e233f01734a8f919df3914b0bd69835dc73062b4a7b1c2d5
```

Frozen chain:

```text
failure attribution  29a72558389f321ca62f32848af90c41c1dc5477
repair design        05a3ed41bbd1b85757d2bb74ce5180fdb50afab4
repair prereg        ef26f05bae876b1713f53c76bff9215638bbf428
implementation       b3b2aa7c938f7102585364f3946f907053acc472
workflow             57c5257cff919bf6dd3b87f5c120ad880c8be4a0
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
max(0,||u||^2-b^T(CC^T)^-1b)/(1316-32)

DN count
1316

PCA components
32

complement dimension
1284

q
0.95

tau_complement
1.6592220236705837

refractory
10

repair model SHA
1b4489bf4e1720ebb16b8a14f16814999398c68bcbf46afc8e3c1b76e0416c7e
```

Calibration support and numerical projection checks passed.

```text
finite calibration scores 30400
min raw complement       597.4003922106467
max Gram off-diagonal      0.011004842181501752
max Gram diagonal error    3.3306690738754696e-15
```

## PROSPECTIVE_G

```text
tapes             64
physical impacts 1715
neural events    1435
matched           194
false events     1241
missed impacts   1521

precision        0.13519163763066203  FAIL
recall           0.1131195335276968   FAIL
F1               0.12317460317460317  FAIL
event/hit        0.8367346938775511   PASS
count MAE        5.1875               FAIL

median latency   0.06 s
p90 latency      0.14 s
rising edges     1435
refractory suppressed 0
```

Prospective support passed.

## PROSPECTIVE_H

```text
tapes             64
physical impacts 1703
neural events    1333
matched           195
false events     1138
missed impacts   1508

precision        0.14628657164291073  FAIL
recall           0.11450381679389313  FAIL
F1               0.1284584980237154   FAIL
event/hit        0.7827363476218439   FAIL
count MAE        7.125                FAIL

median latency   0.08 s
p90 latency      0.16 s
rising edges     1333
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
dnSelection                             false
componentSelection                      false
complementBasisRefit                    false
scoreFusion                             false
thresholdCandidateSearch                false
thresholdQuantileChanged                false
analysis tapeBuildAllowed               false
analysis simulationContextInitialized   false
```

All four analysis packs were cache hits.

## Interpretation

The PCA32 orthogonal-complement innovation representation did not demonstrate an impact-aligned neural-only event stream.

It performs somewhat better than the immediately preceding max-component repair on F1, but the absolute correspondence remains weak:

- G precision 13.5%, recall 11.3%, F1 12.3%;
- H precision 14.6%, recall 11.5%, F1 12.8%;
- roughly 87–89% of physical impacts remain unmatched;
- refractory suppression remains zero.

Thus the failure is not resolved merely by moving from the PCA32 projected/predicted residual representation to the full-DN PCA-complement innovation energy.

This result does not authorize changing q, threshold, PCA dimension, DN subset, score fusion, smoothing, or timing using G/H outcomes.

## Scientific status

```text
baseReproductionPass       true
calibrationPass            true
supportPass                true
prospective G              FAIL
prospective H              FAIL

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

Any next repair requires failure attribution or a separately preregistered experiment with fresh prospective cohorts.
