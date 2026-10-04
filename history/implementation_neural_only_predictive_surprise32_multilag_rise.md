# neural-only predictive-surprise32 multilag-rise repair 구현

상태: IMPLEMENTED / PR 검증 전

## 기준

설계:

```text
e579dc9e232938e45ed455df39f279ece5817bfe
```

사전등록:

```text
48ab3eabdf94c85f14f12c6f58122a96d7ee9643
```

직전 귀인:

```text
NO_LOCAL_THRESHOLD_DOMINANT
run 37168311777
artifact 11291943099
JSON sha256 5952740e8403843872e370a94cc8d4d45699b2f5df77e54f14665b6b36c8a4f3
```

## 구현 범위

기존 v4 simulator source와 frozen predictive-surprise32 source를 수정하지 않았다.

추가 파일:

```text
science/cohorts/neural-only-predictive-surprise32-multilag-rise-v4.json
science/manifests/neural-only-predictive-surprise32-multilag-rise.json
scripts/lib/neural-only-predictive-surprise32-multilag-rise.mjs
scripts/diagnose-neural-only-predictive-surprise32-multilag-rise.mjs
scripts/ci/test-surprise32-multilag-rise.mjs
```

## Score

Frozen raw predictive surprise `s_t`에서 score-frame lag를 사용한다.

```text
d1 = s_t - s_(t-1)
d3 = s_t - s_(t-3)
d5 = s_t - s_(t-5)

multilagRise = max(0,d1,d3,d5)
```

lag `1/3/5`는 기존 predictor contract에서 상속한다.

추가 smoothing, weighting, log transform, physical teacher는 없다.

## Calibration

기존 neural-only calibration tape를 재사용한다.

```text
q = 0.95
nearest-rank
```

기존 raw threshold를 낮추지 않는다. 새 score의 별도 `tau_rise`를 truth 없이 freeze한다.

## Prospective

Fresh C:

```text
7971000..8041000
interruption 8057000
```

Fresh D:

```text
8061000..8131000
interruption 8147000
```

기존 A/B와 cache validation seed와 충돌하지 않는다.

## Tape 책임

분석 script는:

```text
MAPLEFLY_TAPE_BUILD_ALLOWED=false
```

를 요구한다.

분석에서 simulator, 정책, MaleCNS context를 만들지 않는다.

새 C/D는 simulate 단계에서만 생성 가능하다.

TRAIN/CAL은 기존 v4 pack cache name을 그대로 사용해 기존 cache를 재사용한다.

## Freeze gate

prospective truth 전에:

```text
base model SHA exact reproduction
raw tau exact reproduction
multilag-rise calibration support
tau_rise freeze
repair model SHA freeze
C/D neural event stream 생성
```

을 완료한다.

그 뒤에만 기존 evaluator truth access gate를 연다.

## 배포

변경 없음.

```text
POTION v15D  DEPLOYED
v15N         CLOSED / BLOCKED
v16C         BLOCKED
```
