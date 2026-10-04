# v15N-D6-D2-D3-D3-D4-D2-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1 — neural-only PCA-complement innovation repair 설계

## 목적

직전 권위 귀인은:

```text
MAX_SIGNAL_ABSENT_DOMINANT
```

으로 동결되었다.

권위 귀인:

```text
run          37201941454
artifact     11303800018
artifact sha sha256:51050dd8b26ee326130bba2c955c13f602c365a4b95bd47899fc75ec086d1585
JSON sha256  18677b316b60564893eadd586b74f8fcb09957689bb381b18ad0ccaec0625509
result       29a72558389f321ca62f32848af90c41c1dc5477
receipt      926eefc9adf87cbc57f4a9494c2b432fcfbfef4c
```

mean residual energy와 max-component residual energy 모두 impact-local signal absence가 지배적이었다. 따라서 다음 repair는 scalar aggregation이나 eventizer를 더 바꾸지 않고, **PCA32 투영에서 버려진 full-DN innovation 보완공간**에 impact-linked novelty가 존재하는지 검증한다.

## Attribution-use restriction

E/F 귀인은 repair family 선택:

```text
PCA32 projected/predicted residual space
→ PCA32 orthogonal-complement innovation energy
```

에만 사용한다.

E/F의 component index, local peak, threshold gap, score value는 새로운 parameter 선택에 사용하지 않는다.

금지:

- component subset 선택
- complement dimension 선택
- weighting
- top-k
- q 선택
- threshold 선택
- smoothing
- timing shift

## Frozen preprocessing

기존 neural-only predictive-surprise32의 TRAIN 기반 phase subtraction, 5-frame innovation, PCA preprocessing을 그대로 재구축한다.

```text
base model SHA
de8cc3c24cbb91a3a9a806aa2afe37ecd0294c0d2c4b5ce2d4a93c25d77a1cde

phase count          48
innovation history    5
DN count            1316
PCA components        32
PCA fit rows         240
```

Predictor는 base-model reproduction 검증을 위해 재구축하지만 새 score 계산에는 사용하지 않는다.

## New neural-only score

각 frame의 기존 raw innovation vector를 `x_t`라 한다.

기존 PCA preprocessing과 동일하게:

```text
u_t[d] = (x_t[d] - pcaMean[d]) / pcaScale[d]
```

로 standardized full-DN innovation을 만든다.

PCA component matrix를 `C`라 한다. 각 row가 기존 32개 PCA component다.

component들이 수치적으로 완전 직교한다고 가정하지 않고, Gram matrix:

```text
G = C C^T
```

를 TRAIN/frozen PCA에서 한 번 계산한다.

각 frame:

```text
b = C u_t
a = G^{-1} b

projectedEnergy = b^T a
totalEnergy     = u_t^T u_t
complementEnergy = max(0, totalEnergy - projectedEnergy)

pcaComplementInnovation_t =
  complementEnergy / (1316 - 32)
```

로 고정한다.

즉 기존 PCA32 subspace에 설명되지 않는 standardized innovation의 평균 제곱 에너지다.

금지:

- complement basis 재학습
- 일부 DN 선택
- component 제거
- predictor residual 결합
- mean/max score와의 weighted fusion
- physical truth 사용

## Neural-only calibration

기존 NEURAL_CALIBRATION cohort만 사용한다.

physical truth는 calibration 경로에 전달하지 않는다.

```text
q = 0.95
sort finite pcaComplementInnovation scores ascending
index = ceil(q*N)-1
tau_complement = sorted[index]
```

candidate threshold search 금지.

Support:

```text
64 tapes
>= 20000 finite scores
tau_complement finite
tau_complement > 0
Gram solve finite
projection residual >= -1e-8 tolerance
```

## Runtime eventizer

기존 eventizer를 그대로 유지한다.

```text
positive_t = pcaComplementInnovation_t >= tau_complement
crossing_t = positive_t && !positive_(t-1)
refractory = 10 simulation steps
```

## Freeze boundary

fresh prospective truth 전에:

```text
BASE_MODEL_REPRODUCED      = true
COMPLEMENT_SCORE_FROZEN    = true
COMPLEMENT_THRESHOLD_FROZEN= true
EVENTIZER_FROZEN           = true
```

repair model hash는 최소:

```text
base model SHA
score contract
DN count 1316
PCA count 32
Gram projection method
q=0.95
tau_complement
refractory=10
matching contract
```

을 포함한다.

## Fresh prospective cohorts

기존 A/B/C/D/E/F 및 cache-validation cohort를 사용하지 않는다.

### PROSPECTIVE_G

```text
8331000 8341000 8351000 8361000
8371000 8381000 8391000 8401000
interruption 8417000
```

Exactly 64 tapes.

### PROSPECTIVE_H

```text
8421000 8431000 8441000 8451000
8461000 8471000 8481000 8491000
interruption 8507000
```

Exactly 64 tapes.

현재 repository search에서 위 seed의 기존 사용은 발견되지 않았다.

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

G/H pooling 금지. 둘 다 독립적으로 PASS해야 한다.

## Outcomes

Success:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_NEURAL_ONLY_PCA_COMPLEMENT_INNOVATION_EVENT_STREAM_DEMONSTRATED
```

Failure:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_NEURAL_ONLY_PCA_COMPLEMENT_INNOVATION_EVENT_STREAM_NOT_DEMONSTRATED
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

G/H 결과 이후 다음을 변경하지 않는다.

- phase count
- innovation history
- PCA32 basis
- Gram projection
- complement formula
- q
- tau_complement
- refractory
- matching
- gates
- G/H cohorts

G/H로 component 수, DN subset, score fusion, threshold를 탐색하지 않는다.

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
