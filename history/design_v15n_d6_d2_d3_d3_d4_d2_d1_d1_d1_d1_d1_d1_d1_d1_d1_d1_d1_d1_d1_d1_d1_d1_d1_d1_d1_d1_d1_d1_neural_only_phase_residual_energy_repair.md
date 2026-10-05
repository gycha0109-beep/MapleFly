# v15N-D6-D2-D3-D3-D4-D2-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1 — neural-only phase-residual energy repair 설계

## 목적

직전 귀인은 다음으로 동결되었다.

```text
COMPLEMENT_SIGNAL_ABSENT_DOMINANT
```

권위 귀인:

```text
run          37260564427
artifact     11324835401
artifact sha sha256:1021d1ded1ff600f3fc72503d7173d9aa3cf7be0dcef222889dccf184b797486
JSON sha256  3c582b8925555e3e6603fc9b638993d9808554646db9f2e350a1ec60bb43f716
result       7fb143b60c53c2a656508b3c35e9f23cbee12f7a
receipt      bd4477c1e5603e5e2edc9e2dd24873b02f162ff6
```

G/H missed impacts의 과반은 mean predictive-surprise, max-component surprise, PCA-complement innovation 세 표현 모두에서 local suprathreshold signal이 없었다.

세 표현의 공통 상류에는 **phase subtraction 뒤 5-history innovation 변환**이 존재한다.

이 repair는 그 innovation 변환을 제거하고, phase-locked baseline에서 벗어난 full-DN residual energy 자체가 impact-local neural signal을 제공하는지 검증한다.

## Attribution-use restriction

G/H 귀인은 repair family 선택:

```text
5-history innovation-derived representation
→ direct phase-residual representation
```

에만 사용한다.

G/H의 score, timing, DN별 residual, local peak는 아래 항목을 선택하는 데 사용하지 않는다.

- DN subset
- DN weighting
- phase grouping
- scale floor
- q
- threshold
- smoothing
- timing shift

## Frozen phase baseline

기존 neural-only base model의 phase contract를 유지한다.

```text
phase count = 48
DN count    = 1316
```

TRAIN cohort에서 기존 `noD1PhaseMeans`와 동일한 phase mean을 재구축한다.

base model SHA와 기존 raw tau도 exact reproduction gate로 확인한다.

```text
base model SHA
de8cc3c24cbb91a3a9a806aa2afe37ecd0294c0d2c4b5ce2d4a93c25d77a1cde

base raw tau
1.574078960908224
```

## New neural-only representation

TRAIN에서 phase `p`, DN `d`마다:

```text
residual_t[d] =
  frame.values[d] - phaseMean[p][d]

phaseScale[p][d] =
  sqrt(mean_train(residual_t[d]^2))
```

Numerical floor:

```text
phaseScale[p][d] = max(phaseScale[p][d], 1e-6)
```

`1e-6`은 기존 PCA preprocessing의 scale floor를 그대로 상속하며 outcome을 보고 고른 값이 아니다.

각 runtime frame의 score:

```text
z_t[d] = residual_t[d] / phaseScale[p][d]

phaseResidualEnergy_t =
  mean over all 1316 DN of z_t[d]^2
```

중요:

- 5-history innovation 없음
- PCA 없음
- predictor 없음
- component selection 없음
- DN selection 없음
- weighting 없음
- temporal smoothing 없음
- physical truth 없음

## Neural-only calibration

기존 NEURAL_CALIBRATION cohort를 사용한다.

physical truth는 calibration에 전달하지 않는다.

```text
q = 0.95
sort finite phaseResidualEnergy scores ascending
index = ceil(q*N)-1
tau_phase_residual = sorted[index]
```

candidate threshold search 금지.

Calibration support:

```text
64 tapes
>= 30000 finite scores
tau_phase_residual finite
tau_phase_residual > 0
all 48 phases supported
all phaseScale finite and >= 1e-6
```

## Runtime eventizer

기존 eventizer contract를 유지한다.

```text
positive_t = phaseResidualEnergy_t >= tau_phase_residual
crossing_t = positive_t && !positive_(t-1)
refractory = 10 simulation steps
```

physical hit/contact/HP/damage는 runtime 입력에 포함하지 않는다.

## Freeze boundary

fresh prospective truth 전에:

```text
BASE_MODEL_REPRODUCED       = true
PHASE_STATS_FROZEN          = true
PHASE_RESIDUAL_SCORE_FROZEN = true
PHASE_RESIDUAL_TAU_FROZEN   = true
EVENTIZER_FROZEN            = true
```

repair model SHA에는 최소:

```text
base model SHA
phase count 48
DN count 1316
phaseScale formula
scale floor 1e-6
score formula mean(z^2)
q=0.95
tau_phase_residual
refractory=10
matching contract
```

을 포함한다.

## Fresh prospective cohorts

기존 A/B/C/D/E/F/G/H 및 cache-validation cohort를 사용하지 않는다.

### PROSPECTIVE_I

```text
8511000 8521000 8531000 8541000
8551000 8561000 8571000 8581000
interruption 8597000
```

Exactly 64 tapes.

### PROSPECTIVE_J

```text
8601000 8611000 8621000 8631000
8641000 8651000 8661000 8671000
interruption 8687000
```

Exactly 64 tapes.

repository search에서 위 seed의 기존 사용은 발견되지 않았다.

## Matching

기존 neural-only evaluator와 동일:

```text
earliest unmatched neural event
eventStep >= hitStep
eventStep-hitStep < 10
```

## Support per prospective cohort

```text
64 tapes
physical impacts >= 1000
neural events >= 500
```

## Gates per cohort

기존 demonstration gate를 유지한다.

```text
precision >= 0.75
recall >= 0.75
F1 >= 0.75
0.80 <= eventCountRatio <= 1.20
meanAbsolutePerTapeCountError <= 5.0
```

I/J pooling 금지. 둘 다 독립적으로 PASS해야 한다.

## Outcomes

Success:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_NEURAL_ONLY_PHASE_RESIDUAL_ENERGY_EVENT_STREAM_DEMONSTRATED
```

Failure:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_NEURAL_ONLY_PHASE_RESIDUAL_ENERGY_EVENT_STREAM_NOT_DEMONSTRATED
```

Support failure:

```text
...D1_INSUFFICIENT_SUPPORT
```

Implementation/provenance invalid:

```text
...D1_IMPLEMENTATION_OR_PROVENANCE_INVALID
```

## Stop rule

I/J 결과 이후 다음을 변경하지 않는다.

- phase count
- phase mean
- phase scale formula
- scale floor
- all-DN mean-energy aggregation
- q
- tau_phase_residual
- refractory
- matching
- gates
- I/J cohorts

I/J로 DN subset, weighting, smoothing, threshold, phase grouping을 탐색하지 않는다.

후속 repair는 별도 설계·사전등록·fresh prospective cohort가 필요하다.

## Deployment

변경 없음.

```text
diagnosticStackDeployable = false
deployabilityCandidate    = false

POTION v15D  DEPLOYED
v15N         CLOSED / BLOCKED
v16C         BLOCKED
```
