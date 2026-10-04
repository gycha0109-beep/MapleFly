# v15N-D6-D2-D3-D3-D4-D2-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1 — max-component surprise32 failure attribution 설계

## 목적

직전 preregistered repair:

```text
NEURAL_ONLY_MAX_COMPONENT_SURPRISE32
```

은 fresh prospective E/F에서 모두 실패했다.

권위 실패:

```text
run          37179603274
artifact     11294069478
artifact sha sha256:3c23c8d3a6a1a44ada98641f6ca86e8a653b66d43321c6c8c7807074523a4f3e
JSON sha256  2838b9c29fd358a63348e0cc386b46bde7e36a0290f9ffdaf4e4526bb79d922c
result       41e95ba575210da4fe02061301c137977262bd46
receipt      e05ae722ee93dabe1ffe5b8081c85e13e4d1424c
```

이 귀인의 질문은 다음이다.

> max-component score가 실패한 이유가 impact-local max signal 자체의 부재인지, crossing/eventizer timing 문제인지, 혹은 background에서 단일 component anomaly가 과도하게 발생해 false event가 지배하는지 구분한다.

E/F는 attribution-only로 재사용한다. 어떤 component도 선택하거나 제거하지 않는다.

## Exact reproduction gate

귀인 전에 정확히 재현:

```text
base model SHA
de8cc3c24cbb91a3a9a806aa2afe37ecd0294c0d2c4b5ce2d4a93c25d77a1cde

base raw tau
1.574078960908224

max repair model SHA
17c5b3e45a1748b940a903b02684c3683838825a6b77d4eeee04af963f9af6fb

tau_max
12.389163171560895
```

E/F 권위 metrics도 전부 exact match해야 한다.

불일치 시:

```text
...MAX_COMPONENT_ATTRIBUTION_IMPLEMENTATION_OR_PROVENANCE_INVALID
```

으로 종료한다.

## 사용 제한

E/F physical truth는 frozen score/model/eventizer 재현 후 evaluator/귀인에서만 사용한다.

금지:

- component selection
- component removal
- top-k 탐색
- weight 탐색
- q 변경
- tau_max 변경
- smoothing
- timing shift
- matching 변경
- repair 선택

## Miss attribution

각 missed impact에 대해 `[hit-10, hit+20)`을 조사한다.

우선순위:

```text
MATCH_CONFLICT
REFRACTORY_SUPPRESSED_IN_WINDOW
PRE_HIT_MAX_CROSSING
LATE_POST_HIT_MAX_CROSSING
ABOVE_MAX_THRESHOLD_NO_CROSSING_IN_WINDOW
NO_LOCAL_MAX_THRESHOLD_CROSSING
```

기존 attribution precedence와 동일하고 score/threshold만 max-component로 바뀐다.

## False-event timing

각 unmatched emitted max event:

```text
PRE_HIT_200MS
RECENT_POST_HIT_200MS
BACKGROUND
```

nearest physical-impact signed offset도 기록한다.

## Local max peak

각 physical impact의 `[hit-10, hit+20)`:

```text
maxPeakScore
maxPeakOffsetSteps
maxThresholdGap = tau_max - maxPeakScore
```

bucket:

```text
PRE_HIT_PEAK
IN_WINDOW_PEAK
LATE_POST_HIT_PEAK
```

## Background separation

physical impact에서 최소 20 steps 떨어진 frame은 background로 정의한다.

다음 구간별 max-component score q50/q75/q90/q95/q99를 보고한다.

```text
BACKGROUND
PRE_HIT      [-10,0)
IN_WINDOW    [0,10)
LATE_POST    [10,20)
```

추가로:

```text
impactLocalQ95 / backgroundQ95
impactLocalQ99 / backgroundQ99
```

를 descriptive separation ratio로 보고한다.

여기서 impactLocal은 PRE_HIT+IN_WINDOW+LATE_POST 전체다.

이 비율을 threshold 또는 component 선택에 사용하지 않는다.

## Argmax component diagnostic

각 max-score frame에서 argmax component index를 descriptive-only로 기록한다.

다음만 보고한다.

```text
BACKGROUND argmax component frequency
IMPACT_LOCAL argmax component frequency
false-event argmax component frequency
matched-event argmax component frequency
```

그리고 각 분포의:

```text
top1 share
top3 share
normalized entropy
```

를 계산한다.

중요:

- component index를 보고할 수 있으나 후속 component 선택/제거 근거로 직접 사용하지 않는다.
- E/F 기반 component filtering은 금지다.
- 이 진단은 max score가 소수 noisy coordinates에 지배되는지 설명하기 위한 것뿐이다.

## Attribution axis

strict precedence:

```text
EARLY_MAX_SHIFT_DOMINANT
  PRE_HIT_MAX_CROSSING > 0.50 of misses on both E and F

LATE_MAX_SHIFT_DOMINANT
  LATE_POST_HIT_MAX_CROSSING > 0.50 on both

MAX_EVENTIZER_BLOCK_DOMINANT
  MATCH_CONFLICT
  + REFRACTORY_SUPPRESSED_IN_WINDOW
  + ABOVE_MAX_THRESHOLD_NO_CROSSING_IN_WINDOW
  > 0.50 on both

MAX_SIGNAL_ABSENT_DOMINANT
  NO_LOCAL_MAX_THRESHOLD_CROSSING > 0.50 on both

BACKGROUND_MAX_NOISE_DOMINANT
  BACKGROUND false-event fraction > 0.80 on both
  AND false-event argmax top3 share > 0.50 on both

otherwise
  MIXED_MAX_COMPONENT_TEMPORAL_MISALIGNMENT
```

precedence는 위 순서 그대로다.

즉 local signal absence가 동시에 강하면 noise보다 먼저 `MAX_SIGNAL_ABSENT_DOMINANT`로 판정한다.

## Support

per cohort:

```text
64 tapes
physical impacts >= 1000
neural events >= 500
false events >= 1000
missed impacts >= 1000
finite local peak >= 99%
finite background frames >= 10000
argmax component available >= 99% of scored frames
```

## Valid outcome

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_NEURAL_ONLY_MAX_COMPONENT_SURPRISE32_FAILURE_ATTRIBUTED
```

## Stop rule

이 귀인 결과로 component subset, top-k, weighting, threshold를 선택하지 않는다.

다음 repair는 별도 설계·사전등록·fresh prospective cohort가 필요하다.

## Deployment

변경 없음.

```text
diagnosticStackDeployable = false
deployabilityCandidate    = false

POTION v15D  DEPLOYED
v15N         CLOSED / BLOCKED
v16C         BLOCKED
```
