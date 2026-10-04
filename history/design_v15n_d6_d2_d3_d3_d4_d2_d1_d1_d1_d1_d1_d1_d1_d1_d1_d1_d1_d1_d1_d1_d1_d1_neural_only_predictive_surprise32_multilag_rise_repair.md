# v15N-D6-D2-D3-D3-D4-D2-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1 — neural-only predictive-surprise32 multilag-rise repair 설계

## 목적

직전 실패 귀인은 다음 축으로 동결되었다.

```text
NO_LOCAL_THRESHOLD_DOMINANT
```

권위 귀인:

```text
run          37168311777
artifact     11291943099
artifact sha sha256:e3b3d06404ee4c6f5d8170979ae4c1b4746d07a2ad32d75247631fd8bf7f54ca
JSON sha256  5952740e8403843872e370a94cc8d4d45699b2f5df77e54f14665b6b36c8a4f3
result       de832935668da237570c7eb00cb66de7527c90bd
receipt      2b7fd465e3917f8e97e4aba6517325c301c63c74
```

A/B에서 missed impact의 약 77%가 frozen impact-local window 안에서 threshold crossing을 만들지 못했다. 반면 false event의 약 89.5%는 immediate impact-adjacent 구간 밖이었다.

이 결과는 기존 threshold를 낮출 근거가 아니다. 다음 repair는 frozen absolute surprise의 **국소 상승 변화량**을 별도의 neural-only score로 정의해, 절대 surprise가 높지 않더라도 최근 neural dynamics 대비 갑작스러운 변화가 있는지를 검증한다.

## 과학적 경계

귀인 A/B는 다음 용도로만 사용한다.

```text
repair family 선택:
absolute surprise threshold
→ local rise contrast
```

귀인 A/B의 개별 score, impact time, threshold gap, peak offset, false-event 위치는 다음 항목 선택에 사용하지 않는다.

- lag 선택
- q 선택
- threshold 선택
- refractory 선택
- matching window 선택
- gate 선택
- 새 prospective cohort 선택 후 변경

즉 repair의 수치 파라미터는 귀인 결과에 맞춰 탐색하지 않는다.

## Frozen base model

기존 neural-only predictive-surprise32 모델을 그대로 재구축하고 정확히 다음을 재현해야 한다.

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

PCA, predictor, residual normalization은 변경하지 않는다.

기존 TRAIN/NEURAL_CALIBRATION을 사용해 동일 모델을 결정론적으로 재구축할 수 있다. 이는 새 supervised fitting이 아니다.

## 새 neural-only score

기존 frozen raw predictive surprise를:

```text
s_t
```

라고 한다.

score-frame index 기준으로 충분한 history가 있는 각 frame에서:

```text
d1_t = s_t - s_(t-1)
d3_t = s_t - s_(t-3)
d5_t = s_t - s_(t-5)

multilagRise_t = max(0, d1_t, d3_t, d5_t)
```

로 고정한다.

lag `1/3/5`는 직전 귀인 A/B에서 고른 값이 아니라 이미 frozen predictor contract에 존재하는 lag set을 그대로 상속한다.

추가 smoothing, weighting, log 변환, clipping, learned weights, physical labels는 사용하지 않는다.

처음 5개 score frame은 score support에서 제외한다.

## Neural-only calibration

기존 NEURAL_CALIBRATION cohort를 그대로 사용한다.

이 cohort의 physical truth는 calibration 함수에 전달하지 않는다.

```text
q = 0.95
sort finite multilagRise scores ascending
index = ceil(q*N)-1
tau_rise = sorted[index]
```

`q=0.95`는 기존 계약에서 그대로 상속한다.

중요:

```text
tau_rise는 새 score의 calibration threshold다.
기존 tau=1.574078960908224를 낮추거나 조정하는 것이 아니다.
```

candidate threshold search 금지.

Calibration support:

```text
64 tapes
>= 20000 finite multilagRise scores
tau_rise finite
tau_rise > 0
```

## Runtime eventizer

기존 eventizer를 그대로 유지한다.

```text
positive_t = multilagRise_t >= tau_rise
crossing_t = positive_t && !positive_(t-1)
refractory = 10 simulation steps
```

physical hit/contact/HP/damage는 runtime 입력에 포함하지 않는다.

## Freeze boundary

Fresh prospective truth를 보기 전에 다음을 모두 freeze한다.

```text
BASE_MODEL_REPRODUCED = true
RISE_SCORE_FROZEN = true
RISE_THRESHOLD_FROZEN = true
EVENTIZER_FROZEN = true
```

새 deployability candidate hash에는 최소 다음을 포함한다.

```text
base model SHA
multilag-rise formula
lag set [1,3,5]
q=0.95
tau_rise
refractory=10
matching contract
```

## Fresh prospective cohorts

기존 attribution A/B 및 cache validation cohort를 재사용하지 않는다.

### PROSPECTIVE_C

```text
7971000 7981000 7991000 8001000
8011000 8021000 8031000 8041000
interruption 8057000
```

Exactly 64 tapes.

### PROSPECTIVE_D

```text
8061000 8071000 8081000 8091000
8101000 8111000 8121000 8131000
interruption 8147000
```

Exactly 64 tapes.

현재 repository의 cohort 정의 및 코드에서 위 seed 충돌은 확인되지 않았다.

## Matching

이전 neural-only prospective evaluator와 동일하게 유지한다.

```text
earliest unmatched neural event
with eventStep >= hitStep
and eventStep-hitStep < 10
```

## Support per prospective cohort

```text
64 tapes
physical impacts >= 1000
neural events >= 500
```

## Gates per cohort

기존 neural-only event-stream demonstration gate를 그대로 상속한다.

```text
precision >= 0.75
recall >= 0.75
F1 >= 0.75
0.80 <= eventCountRatio <= 1.20
meanAbsolutePerTapeCountError <= 5.0
```

C/D를 pooling하지 않는다.

둘 다 독립적으로 PASS해야 한다.

## Outcome

Success:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_NEURAL_ONLY_PREDICTIVE_SURPRISE32_MULTILAG_RISE_EVENT_STREAM_DEMONSTRATED
```

Failure:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_NEURAL_ONLY_PREDICTIVE_SURPRISE32_MULTILAG_RISE_EVENT_STREAM_NOT_DEMONSTRATED
```

Support failure:

```text
...D1_INSUFFICIENT_SUPPORT
```

Implementation/provenance mismatch:

```text
...D1_IMPLEMENTATION_OR_PROVENANCE_INVALID
```

## Stop rule

권위 C/D 결과를 본 뒤 다음을 변경하지 않는다.

- base PCA/model
- lag set
- multilag-rise formula
- q=0.95
- tau_rise
- refractory
- matching window
- gates
- C/D cohorts

C/D 결과로 threshold를 낮추거나 lag를 추가하지 않는다.

귀인 A/B를 repair tuning이나 새 일반화 주장에 재사용하지 않는다.

## Deployment boundary

이 실험은 기존 배포를 변경하지 않는다.

```text
POTION v15D  DEPLOYED
v15N         CLOSED / BLOCKED
v16C         BLOCKED
```

둘 다 prospective gate를 통과하기 전에는:

```text
diagnosticStackDeployable = false
deployabilityCandidate    = false
```

를 유지한다.
