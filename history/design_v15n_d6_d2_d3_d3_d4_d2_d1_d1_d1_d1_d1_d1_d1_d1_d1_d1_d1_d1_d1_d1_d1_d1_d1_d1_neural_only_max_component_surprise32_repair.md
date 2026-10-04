# v15N-D6-D2-D3-D3-D4-D2-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1 — neural-only max-component surprise32 repair 설계

## 목적

직전 실패 귀인은 다음으로 동결되었다.

```text
BASE_SIGNAL_ABSENT_DOMINANT
```

권위 귀인:

```text
run          37179198946
artifact     11295075939
artifact sha sha256:493ab7b5a7b8575d3a1af2f4a7a822aa35f3e3257e01e1b37185af3adb1d18b0
JSON sha256  4d34942cc294798c8363fab817a472469cea135cd8e5dc11a9587ff2ddeeca71
result       a14ee53782eafa8955144d575b89bd76ae44f564
receipt      e8f1368a26f32f4515fb21cbe887dd8b5d0b17ea
```

C/D missed impacts의 약 74–76%는 frozen raw mean-energy predictive-surprise조차 local threshold를 넘지 못했다. no-local-rise subset에서는 약 95%가 raw subthreshold였다.

현재 base score는 32개 standardized residual의 제곱을 평균한다.

```text
mean_j(r_j^2)
```

이 repair는 impact-linked anomaly가 소수 PCA coordinate에 집중돼 평균 집계에서 희석되는 가설을 검증한다.

## Attribution-use restriction

C/D 귀인은 repair family 선택에만 사용한다.

```text
mean aggregation
→ max-component aggregation
```

C/D의 coordinate별 값, impact 위치, threshold gap, timing 분포를 이용해 다음을 선택하지 않는다.

- component subset
- top-k
- weight
- q
- threshold
- lag
- smoothing
- prospective cohort 이후 parameter 변경

## Frozen base model

기존 neural-only predictive-surprise32의 preprocessing 및 predictor를 정확히 재구축한다.

```text
base model SHA
de8cc3c24cbb91a3a9a806aa2afe37ecd0294c0d2c4b5ce2d4a93c25d77a1cde

phase count          48
innovation history    5
PCA components       32
PCA fit rows         240
predictor lags        1 / 3 / 5
predictor width       96
ridge                 0.001
```

TRAIN/CAL cohort도 기존 것을 그대로 쓴다.

## New neural-only score

각 predictive row에서 기존과 동일하게:

```text
e_j = target_j - prediction_j
r_j = (e_j - residualMean_j) / residualScale_j
```

를 계산한다.

새 score:

```text
maxComponentSurprise_t = max_j(r_j^2)
```

정확히 32 coordinate 전부를 사용한다.

금지:

- component selection
- top-k averaging
- learned weights
- clipping
- log transform
- smoothing
- supervised teacher
- physical truth input

이 score는 기존 base mean-energy threshold를 낮추는 것이 아니라 별도 neural-only score다.

## Neural-only calibration

기존 NEURAL_CALIBRATION cohort만 사용한다.

physical truth는 calibration에 전달하지 않는다.

```text
q = 0.95
sort finite maxComponentSurprise scores ascending
index = ceil(q*N)-1
tau_max = sorted[index]
```

q는 이전 neural-only 계약의 고정값을 상속한다.

candidate threshold search 금지.

Support:

```text
64 tapes
>= 20000 finite scores
tau_max finite
tau_max > 0
```

## Runtime eventizer

기존 eventizer를 그대로 유지한다.

```text
positive_t = maxComponentSurprise_t >= tau_max
crossing_t = positive_t && !positive_(t-1)
refractory = 10 simulation steps
```

runtime physical truth 사용 금지.

## Freeze boundary

fresh prospective truth를 보기 전에:

```text
BASE_MODEL_REPRODUCED = true
MAX_SCORE_FROZEN      = true
MAX_THRESHOLD_FROZEN  = true
EVENTIZER_FROZEN      = true
```

새 repair model hash에는 최소:

```text
base model SHA
score contract max_j(r_j^2)
component count 32
q=0.95
tau_max
refractory=10
matching contract
```

을 포함한다.

## Fresh prospective cohorts

기존 A/B/C/D 및 cache-validation cohort는 사용하지 않는다.

### PROSPECTIVE_E

```text
8151000 8161000 8171000 8181000
8191000 8201000 8211000 8221000
interruption 8237000
```

Exactly 64 tapes.

### PROSPECTIVE_F

```text
8241000 8251000 8261000 8271000
8281000 8291000 8301000 8311000
interruption 8327000
```

Exactly 64 tapes.

repository search에서 위 seed의 기존 사용은 발견되지 않았다.

## Matching

이전 neural-only prospective evaluator와 동일하다.

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

기존 demonstration gate를 그대로 유지한다.

```text
precision >= 0.75
recall >= 0.75
F1 >= 0.75
0.80 <= eventCountRatio <= 1.20
meanAbsolutePerTapeCountError <= 5.0
```

E/F pooling 금지.

둘 다 독립적으로 PASS해야 한다.

## Outcomes

Success:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_NEURAL_ONLY_MAX_COMPONENT_SURPRISE32_EVENT_STREAM_DEMONSTRATED
```

Failure:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_NEURAL_ONLY_MAX_COMPONENT_SURPRISE32_EVENT_STREAM_NOT_DEMONSTRATED
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

E/F 결과를 본 뒤 다음을 바꾸지 않는다.

- PCA/model
- component subset
- max aggregation
- q=0.95
- tau_max
- refractory
- matching
- gates
- E/F cohorts

E/F로 top-k, weighted max, threshold, smoothing을 탐색하지 않는다.

후속 repair는 별도 설계·사전등록·fresh prospective가 필요하다.

## Deployment

변경 없음.

```text
diagnosticStackDeployable = false
deployabilityCandidate    = false

POTION v15D  DEPLOYED
v15N         CLOSED / BLOCKED
v16C         BLOCKED
```
