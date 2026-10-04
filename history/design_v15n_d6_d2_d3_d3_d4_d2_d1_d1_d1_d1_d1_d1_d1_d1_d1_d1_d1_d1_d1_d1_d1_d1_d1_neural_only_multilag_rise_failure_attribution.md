# v15N-D6-D2-D3-D3-D4-D2-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1 — multilag-rise failure attribution 설계

## 목적

직전 preregistered repair:

```text
NEURAL_ONLY_PREDICTIVE_SURPRISE32_MULTILAG_RISE
```

은 fresh prospective C/D에서 모두 실패했다.

권위 실패:

```text
run          37173877851
artifact     11293292628
artifact sha sha256:82c80090244e5f8f0a025e92062b31d83bad4e19ea65490f465a24814db63217
JSON sha256  e6220d2e027e5dd8dfa34bd862be1af731a03a76d967de91534977618919b98e
result       b57448ba2ed20ddd08b5ff3853bc117324c0b178
receipt      d114d417f41d5582a7d768c33748dfd014363af4
```

이 분석의 질문은 다음 하나다.

> multilag-rise가 실패한 이유가 rise 변환/eventization 때문인지, 아니면 frozen base predictive-surprise 자체에 impact-local signal이 부족하기 때문인지 구분한다.

C/D는 귀인 전용으로만 재사용한다. 새 repair 튜닝이나 일반화 주장을 하지 않는다.

## Exact reproduction gate

귀인 전에 직전 권위 실행을 정확 재현한다.

필수:

```text
base model SHA
de8cc3c24cbb91a3a9a806aa2afe37ecd0294c0d2c4b5ce2d4a93c25d77a1cde

base raw tau
1.574078960908224

repair model SHA
8556002505564c754f972abd62afc20ff8b89f0e7bca52b7e365a6f5120b275a

tau_rise
1.0756203121500945
```

C/D 모든 권위 metric도 정확히 재현한다.

불일치 시:

```text
...MULTILAG_RISE_ATTRIBUTION_IMPLEMENTATION_OR_PROVENANCE_INVALID
```

으로 종료한다.

## C/D 사용 제한

C/D physical truth는 base model, score formula, tau, tau_rise, lag, eventizer를 모두 재현·freeze한 뒤 evaluator/귀인에서만 읽는다.

금지:

- q 변경
- raw tau 변경
- tau_rise 변경
- lag 탐색
- smoothing 탐색
- score transform 탐색
- timing shift 탐색
- repair selection
- C/D 재학습

## Rise miss attribution

각 missed impact를 `[hit-10, hit+20)`에서 조사한다.

우선순위:

```text
MATCH_CONFLICT
REFRACTORY_SUPPRESSED_IN_WINDOW
PRE_HIT_RISE_CROSSING
LATE_POST_HIT_RISE_CROSSING
ABOVE_RISE_THRESHOLD_NO_CROSSING_IN_WINDOW
NO_LOCAL_RISE_THRESHOLD_CROSSING
```

정의는 이전 failure attribution과 동일하되 score가 `multilagRise`, threshold가 `tau_rise`다.

## Rise false-event timing

unmatched rise event를:

```text
PRE_HIT_200MS
RECENT_POST_HIT_200MS
BACKGROUND
```

으로 동일 규칙에 따라 분류한다.

nearest physical-impact signed offset도 보존한다.

## Local rise peak

각 impact의 `[hit-10, hit+20)`에서:

```text
risePeakScore
risePeakOffsetSteps
riseThresholdGap = tau_rise - risePeakScore
```

을 기록한다.

bucket:

```text
PRE_HIT_PEAK
IN_WINDOW_PEAK
LATE_POST_HIT_PEAK
```

## Base-signal context

각 missed impact에 대해 동일 local window `[hit-10, hit+20)`의 frozen raw predictive-surprise 최대값을 구한다.

```text
rawPeakScore
rawPeakOffsetSteps
rawThresholdGap = baseTau - rawPeakScore
```

다음 두 context로만 나눈다.

```text
RAW_LOCAL_SUPRATHRESHOLD_PRESENT
  rawPeakScore >= baseTau

RAW_LOCAL_SUBTHRESHOLD
  rawPeakScore < baseTau
```

이것은 threshold 선택이 아니라 이미 frozen `baseTau`에 대한 사후 설명이다.

또 `NO_LOCAL_RISE_THRESHOLD_CROSSING` miss 안에서 위 raw context 조성을 별도로 보고한다.

## Attribution axis

strict precedence:

```text
EARLY_RISE_SHIFT_DOMINANT
  PRE_HIT_RISE_CROSSING > 0.50 of misses on both C and D

LATE_RISE_SHIFT_DOMINANT
  LATE_POST_HIT_RISE_CROSSING > 0.50 on both

RISE_EVENTIZER_BLOCK_DOMINANT
  MATCH_CONFLICT
  + REFRACTORY_SUPPRESSED_IN_WINDOW
  + ABOVE_RISE_THRESHOLD_NO_CROSSING_IN_WINDOW
  > 0.50 on both

BASE_SIGNAL_ABSENT_DOMINANT
  NO_LOCAL_RISE_THRESHOLD_CROSSING > 0.50 on both
  AND RAW_LOCAL_SUBTHRESHOLD > 0.50 of all misses on both

RISE_TRANSFORM_SUPPRESSION_DOMINANT
  NO_LOCAL_RISE_THRESHOLD_CROSSING > 0.50 on both
  AND RAW_LOCAL_SUPRATHRESHOLD_PRESENT > 0.50 of all misses on both

otherwise
  MIXED_MULTILAG_RISE_TEMPORAL_MISALIGNMENT
```

strict `> 0.50`다.

## Descriptive distributions

C/D 각각 보고:

```text
rise miss-category composition
rise false-event timing composition
rise peak offset q10/q25/median/q75/q90
rise threshold-gap q10/q25/median/q75/q90

raw missed-impact peak offset q10/q25/median/q75/q90
raw threshold-gap q10/q25/median/q75/q90
raw local context composition
```

또 background / pre-hit / in-window / late-post-hit 구간에 대해 `multilagRise`의:

```text
q50 q75 q90 q95 q99
```

를 보고한다.

descriptive only.

## Support

per cohort:

```text
64 tapes
physical impacts >= 1000
rise neural events >= 500
false events >= 1000
missed impacts >= 1000
finite rise local peak >= 99%
finite raw local peak >= 99%
```

## Valid outcome

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_NEURAL_ONLY_PREDICTIVE_SURPRISE32_MULTILAG_RISE_FAILURE_ATTRIBUTED
```

## Stop rule

이 귀인으로 repair parameter를 선택하지 않는다.

결과가 어떤 axis든 다음 변경은 별도 설계·사전등록·fresh prospective cohort가 필요하다.

## Deployment

변경 없음.

```text
diagnosticStackDeployable = false
deployabilityCandidate    = false

POTION v15D  DEPLOYED
v15N         CLOSED / BLOCKED
v16C         BLOCKED
```
