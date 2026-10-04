# neural-only max-component surprise32 실패 귀인 구현

상태: IMPLEMENTED / PR 검증 전

## 기준

설계:

```text
6c725f2f8b58d24ce2aa105846a267684b397420
```

사전등록:

```text
0ce7588247a29156f6a6aabb7b593d90bbbe16f4
```

권위 실패:

```text
run          37179603274
artifact     11294069478
JSON sha256  2838b9c29fd358a63348e0cc386b46bde7e36a0290f9ffdaf4e4526bb79d922c
```

## 구현

새 simulator source를 수정하지 않았다.

추가:

```text
scripts/lib/neural-only-max-component-surprise32-attribution.mjs
scripts/diagnose-neural-only-max-component-surprise32-failure-attribution.mjs
scripts/ci/test-max-component-surprise32-attribution.mjs
science/manifests/neural-only-max-component-surprise32-failure-attribution.json
```

기존 E/F cohort set을 attribution-only로 재사용한다.

## 재현 gate

분석 전에 정확히 재현:

```text
base model SHA
base raw tau
max repair model SHA
tau_max
E/F 모든 권위 metrics
```

하나라도 불일치하면 attribution을 수행하지 않는다.

## 귀인

miss precedence:

```text
MATCH_CONFLICT
REFRACTORY_SUPPRESSED_IN_WINDOW
PRE_HIT_MAX_CROSSING
LATE_POST_HIT_MAX_CROSSING
ABOVE_MAX_THRESHOLD_NO_CROSSING_IN_WINDOW
NO_LOCAL_MAX_THRESHOLD_CROSSING
```

또한 max-score frame의 argmax component를 descriptive-only로 추적해:

```text
BACKGROUND
IMPACT_LOCAL
FALSE_EVENT
MATCHED_EVENT
```

분포의 top1/top3 share와 normalized entropy를 계산한다.

component selection/removal/top-k/weighting에는 사용하지 않는다.

## Tape 책임

```text
MAPLEFLY_TAPE_BUILD_ALLOWED=false
analysis_needs_malecns=false
```

TRAIN/CAL/E/F 기존 v4 cache만 읽는다.

## 배포

변경 없음.

```text
POTION v15D  DEPLOYED
v15N         CLOSED / BLOCKED
v16C         BLOCKED
```
