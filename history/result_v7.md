# result_v7 — 초파리 유치원 1교시 / LEFT-RIGHT motor readout

## 결론

v7에서 처음으로 **훈련 전보다 나아지는 게임 행동**이 나왔다.

단, 학습 위치를 정확히 구분해야 한다.

~~~text
full MaleCNS connectome
  frozen

1,316 descending-neuron activity
  ↓

trainable motor readout
  learned
~~~

즉 초파리 connectome 내부 synapse가 바뀐 것은 아니다.

대신 full MaleCNS가 만든 neural state를
LEFT / RIGHT 버튼으로 읽는 readout이 실제 reward 결과를 통해 학습했다.

## 실제 실행

~~~text
GitHub Actions run
35409704972

head commit
5634cc28c4b871ad9e93eee0f5e91504c3ee48cc

artifact
10574106003

artifact digest
sha256:152ad5c6a9ebf619dc370dbea60c99247d9bd285a8e3767999039dc1e3f21618
~~~

push smoke 기본값:

~~~text
independent runs       2
training episodes    120 / run
evaluation episodes   60 / condition / run
descending features 1,316
~~~

## 결과

| run | train first 40 | train last 40 | eval VISUAL_ON | eval VISUAL_OFF | ON-OFF |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 57.5% | 72.5% | 100.0% | 50.0% | +50.0%p |
| 2 | 52.5% | 82.5% | 100.0% | 50.0% | +50.0%p |

평균:

~~~text
training first window   55.0%
training last window    77.5%

VISUAL_ON              100.0%
VISUAL_OFF              50.0%
difference             +50.0%p
~~~

사전 gate:

~~~text
mean VISUAL_ON >= 70%
mean ON-OFF      >= 15%p
every run ON     >= 65%
~~~

판정:

~~~text
PASS
~~~

## 왜 VISUAL_OFF가 중요했는가

policy에는 처음부터 다음 값을 주지 않았다.

~~~text
targetSide
targetX
playerX
distance
정답 LEFT/RIGHT label
~~~

policy input은 full MaleCNS의 descending-neuron activity뿐이다.

그리고 평가 시 같은 seed와 같은 L/R schedule에서
target visual cue만 제거했다.

그 결과:

~~~text
visual cue 있음 -> 100%
visual cue 없음 ->  50%
~~~

으로 떨어졌다.

따라서 현재 실험 범위에서는
readout이 episode 순서나 seed만 외운 것이 아니라
**connectome이 target visual input에 반응해 만든 neural state**를 사용했다는 근거가 된다.

## 학습 방식

초기 정책:

~~~text
P(LEFT)  = 0.5
P(RIGHT) = 0.5
~~~

각 episode에서 readout은 action을 하나 고른다.

환경은 그 action이 reward object에 도달했는지만 반환한다.

~~~text
도달 -> reward 1
실패 -> reward 0
~~~

readout은 이 결과로 softmax policy weight를 갱신한다.

게임 정답을 직접 넣은 조건문은 없다.

## 이 결과가 의미하지 않는 것

다음 주장은 하지 않는다.

~~~text
"초파리가 메이플을 이해했다"
"초파리 뇌의 생물학적 학습이 재현됐다"
"KC -> MBON memory가 성공했다"
"이제 사냥 전체를 학습했다"
~~~

정확한 표현은:

> **frozen full MaleCNS가 만든 descending-neuron state에서,
> reward-only motor readout이 LEFT/RIGHT 버튼 매핑을 학습했다.**

## 다음 단계

v7 PASS policy를 **Fly #001 skill state**로 고정한다.

브라우저 실게임 경로:

~~~text
현재 target visual input
        ↓
full MaleCNS
        ↓
1,316 DN activity
        ↓
Fly #001 v7 skill weights
        ↓
LEFT / RIGHT
~~~

skill state는 브라우저 localStorage에 저장 가능한 버전 계약을 둔다.

v7에서 학습하지 않은:

~~~text
JUMP
ATTACK
POTION
UP / DOWN
~~~

은 기존 decoder를 그대로 사용한다.

즉 다음 단계는
**학습한 좌우이동만 실제 맵에 배치하고 나머지 행동은 아직 기존 연결을 유지하는 혼합 controller**다.
