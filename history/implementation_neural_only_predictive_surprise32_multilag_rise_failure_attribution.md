# neural-only predictive-surprise32 multilag-rise 실패 귀인 구현

상태: IMPLEMENTED / PR 검증 전

## 기준

설계:

```text
40d439f188c2fdc55984f484b7a20404da36920f
```

사전등록:

```text
d608390653b63b1e7e7a3e7431d7cf7263f77fa3
```

권위 실패:

```text
run          37173877851
artifact     11293292628
JSON sha256  e6220d2e027e5dd8dfa34bd862be1af731a03a76d967de91534977618919b98e
```

## 구현

새 simulator source를 수정하지 않았다.

추가:

```text
scripts/lib/neural-only-predictive-surprise32-multilag-rise-attribution.mjs
scripts/diagnose-neural-only-predictive-surprise32-multilag-rise-failure-attribution.mjs
scripts/ci/test-surprise32-multilag-rise-attribution.mjs
science/manifests/neural-only-predictive-surprise32-multilag-rise-failure-attribution.json
```

기존 C/D cohort set을 attribution-only로 재사용한다.

## 재현 gate

분석 전에 정확히 재현:

```text
base model SHA
base raw tau
repair model SHA
tau_rise
C/D 모든 권위 metrics
```

하나라도 불일치하면 attribution을 수행하지 않는다.

## 귀인

rise event stream은 기존 frozen score/eventizer를 그대로 재구성한다.

miss precedence:

```text
MATCH_CONFLICT
REFRACTORY_SUPPRESSED_IN_WINDOW
PRE_HIT_RISE_CROSSING
LATE_POST_HIT_RISE_CROSSING
ABOVE_RISE_THRESHOLD_NO_CROSSING_IN_WINDOW
NO_LOCAL_RISE_THRESHOLD_CROSSING
```

각 missed impact의 동일 local window에서 frozen raw predictive-surprise peak를 추가로 읽어:

```text
RAW_LOCAL_SUPRATHRESHOLD_PRESENT
RAW_LOCAL_SUBTHRESHOLD
```

로만 분류한다.

이 분류는 frozen base tau에 대한 사후 설명이며 threshold tuning이 아니다.

## Axis

사전등록 strict >0.50 precedence를 그대로 구현했다.

```text
EARLY_RISE_SHIFT_DOMINANT
LATE_RISE_SHIFT_DOMINANT
RISE_EVENTIZER_BLOCK_DOMINANT
BASE_SIGNAL_ABSENT_DOMINANT
RISE_TRANSFORM_SUPPRESSION_DOMINANT
MIXED_MULTILAG_RISE_TEMPORAL_MISALIGNMENT
```

## Tape 책임

분석:

```text
MAPLEFLY_TAPE_BUILD_ALLOWED=false
analysis_needs_malecns=false
```

C/D 및 TRAIN/CAL 기존 v4 cache만 읽는다.

## 배포

변경 없음.

```text
POTION v15D  DEPLOYED
v15N         CLOSED / BLOCKED
v16C         BLOCKED
```
