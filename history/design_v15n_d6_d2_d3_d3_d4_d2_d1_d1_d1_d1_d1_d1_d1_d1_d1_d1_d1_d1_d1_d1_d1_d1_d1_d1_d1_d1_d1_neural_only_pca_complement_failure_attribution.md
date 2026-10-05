# v15N-D6-D2-D3-D3-D4-D2-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1-D1 — PCA-complement innovation failure attribution 설계

## 목적

직전 preregistered repair:

```text
NEURAL_ONLY_PCA_COMPLEMENT_INNOVATION
```

은 fresh prospective G/H에서 모두 실패했다.

권위 실패:

```text
run          37202530369
artifact     11304103673
artifact sha sha256:bd801b07b3b0bdbf63003314ad13350f354717524fd4784d3af9a41d28f76319
JSON sha256  cf2182a46b6d7ee9e233f01734a8f919df3914b0bd69835dc73062b4a7b1c2d5
result       52bb0c383ce948739e334152e888a7633e1465f8
receipt      a10559be74f8dccf30b6938d7bd272bac726abd2
```

질문은 다음 하나다.

> PCA32 보완공간 innovation score의 실패가 여전히 impact-local signal absence인지, eventizer/timing 문제인지, 또는 background novelty가 impact novelty와 충분히 분리되지 않는 문제인지 구분한다.

G/H는 attribution-only로 재사용한다. 후속 repair의 threshold, dimension, DN subset, score fusion 선택에 사용하지 않는다.

## Exact reproduction gate

귀인 전에 정확히 재현:

```text
base model SHA
de8cc3c24cbb91a3a9a806aa2afe37ecd0294c0d2c4b5ce2d4a93c25d77a1cde

base raw tau
1.574078960908224

complement repair model SHA
1b4489bf4e1720ebb16b8a14f16814999398c68bcbf46afc8e3c1b76e0416c7e

tau_complement
1.6592220236705837
```

G/H 권위 metrics도 전부 exact match해야 한다.

불일치 시:

```text
...PCA_COMPLEMENT_ATTRIBUTION_IMPLEMENTATION_OR_PROVENANCE_INVALID
```

으로 종료한다.

## 사용 제한

G/H physical truth는 frozen model/score/threshold/eventizer를 재현한 뒤 evaluator와 귀인에서만 읽는다.

금지:

- q 변경
- tau_complement 변경
- PCA dimension 변경
- DN selection
- score fusion
- smoothing
- timing shift
- matching 변경
- repair parameter 선택
- G/H 재학습

## Miss attribution

각 missed impact를 `[hit-10, hit+20)`에서 조사한다.

우선순위:

```text
MATCH_CONFLICT
REFRACTORY_SUPPRESSED_IN_WINDOW
PRE_HIT_COMPLEMENT_CROSSING
LATE_POST_HIT_COMPLEMENT_CROSSING
ABOVE_COMPLEMENT_THRESHOLD_NO_CROSSING_IN_WINDOW
NO_LOCAL_COMPLEMENT_THRESHOLD_CROSSING
```

## False-event timing

각 unmatched emitted complement event:

```text
PRE_HIT_200MS
RECENT_POST_HIT_200MS
BACKGROUND
```

nearest physical-impact signed offset도 기록한다.

## Local peak

각 impact의 `[hit-10, hit+20)`:

```text
peakScore
peakOffsetSteps
thresholdGap = tau_complement - peakScore
```

bucket:

```text
PRE_HIT_PEAK
IN_WINDOW_PEAK
LATE_POST_HIT_PEAK
```

## Background separation

physical impact에서 최소 20 steps 떨어진 score frame을 background로 정의한다.

다음 구간별 complement score q50/q75/q90/q95/q99:

```text
BACKGROUND
PRE_HIT      [-10,0)
IN_WINDOW    [0,10)
LATE_POST    [10,20)
```

추가 descriptive ratio:

```text
impactLocalQ95/backgroundQ95
impactLocalQ99/backgroundQ99
```

impactLocal은 PRE_HIT+IN_WINDOW+LATE_POST 전체다.

## Frozen cross-representation context

같은 G/H miss에 대해 이미 frozen된 세 score를 descriptive-only로 계산한다.

```text
base mean-energy predictive surprise
max-component surprise
PCA-complement innovation
```

각 missed impact local window에서 frozen threshold를 넘는 score가 있는지 분류한다.

```text
BASE_LOCAL_PRESENT / ABSENT
MAX_LOCAL_PRESENT / ABSENT
COMPLEMENT_LOCAL_PRESENT / ABSENT
```

8개 조합의 composition을 보고한다.

이 비교는 어느 score를 합치거나 선택하기 위한 것이 아니다. representation failure가 공통인지 보완공간 특이적인지 설명하기 위한 것이다.

## Attribution axis

strict precedence:

```text
EARLY_COMPLEMENT_SHIFT_DOMINANT
  PRE_HIT_COMPLEMENT_CROSSING > 0.50 of misses on both G and H

LATE_COMPLEMENT_SHIFT_DOMINANT
  LATE_POST_HIT_COMPLEMENT_CROSSING > 0.50 on both

COMPLEMENT_EVENTIZER_BLOCK_DOMINANT
  MATCH_CONFLICT
  + REFRACTORY_SUPPRESSED_IN_WINDOW
  + ABOVE_COMPLEMENT_THRESHOLD_NO_CROSSING_IN_WINDOW
  > 0.50 on both

COMPLEMENT_SIGNAL_ABSENT_DOMINANT
  NO_LOCAL_COMPLEMENT_THRESHOLD_CROSSING > 0.50 on both

BACKGROUND_COMPLEMENT_NOISE_DOMINANT
  BACKGROUND false-event fraction > 0.80 on both
  AND impactLocalQ95/backgroundQ95 < 1.20 on both

otherwise
  MIXED_PCA_COMPLEMENT_TEMPORAL_MISALIGNMENT
```

precedence는 위 순서 그대로다.

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
cross-representation local context available >= 99% of misses
```

## Valid outcome

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_NEURAL_ONLY_PCA_COMPLEMENT_INNOVATION_FAILURE_ATTRIBUTED
```

## Stop rule

이 귀인으로 다음을 선택하지 않는다.

- PCA dimension
- DN subset
- base/max/complement score fusion
- threshold
- smoothing
- timing shift
- eventizer 변경

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
