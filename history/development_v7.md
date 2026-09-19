# development_v7 — 초파리 유치원 1교시 / 학습 가능한 motor readout

## 왜 v7이 필요한가

v6에서 full MaleCNS 내부 mushroom-body plasticity readiness를 검사했다.

결과:

~~~text
원본 KC 100% active
PAM 50 Hz
정적 KC bias는 -0.30 한 점만 PASS
APL outgoing gain 1~16 전부 readiness FAIL
~~~

MapleFly의 목적은 APL 모델 자체를 연구하는 것이 아니라
**초파리 connectome을 게임에서 훈련시키는 것**이다.

따라서 internal synapse plasticity는 잠시 보류하고,
full connectome 전체는 frozen neural reservoir로 유지한다.

대신 brain이 내보내는 1,316 descending-neuron signal을
게임 버튼으로 해석하는 작은 readout만 경험으로 학습시킨다.

이 방식은 upstream SSH Fighter에서도
full connectome을 고정하고 descending-neuron readout을 학습하는
reservoir-computing 경로로 사용된 적이 있다.

## 이번 수업

처음부터 사냥/점프/포션을 동시에 가르치지 않는다.

~~~text
reward object LEFT  또는 RIGHT
          ↓
MapleFly visual encoder
          ↓
full MaleCNS 166,700 neurons
          ↓
1,316 descending neurons
          ↓
trainable readout
          ↓
LEFT / RIGHT
~~~

가능한 action은 LEFT / RIGHT 둘뿐이다.

## policy가 받는 정보

policy input:

~~~text
target cue 동안 DN firing rate
-
바로 직전 baseline DN firing rate
~~~

1,316개 delta를 L2 normalize한 뒤 bias 1개를 붙인다.

policy에는 다음을 절대 넣지 않는다.

~~~text
targetSide
targetX
playerX
distance
"정답 action"
~~~

즉 target이 오른쪽이라는 game variable을 보고 RIGHT를 고르는 조건식은 없다.

## 감각

기존 MapleFly target visual encoder와 같은 종류의 channel을 사용한다.

~~~text
LC10a
LPLC1
LPLC2
LC4
SNta
~~~

고정 거리 150 px의 reward object를 왼쪽 또는 오른쪽에 둔다.

각 episode:

~~~text
0.5 s settle
0.5 s baseline
0.5 s target cue
action 1회
environment outcome
~~~

## reward

readout이 action을 고른 뒤에만 결과를 알려준다.

~~~text
reward object에 도달 -> 1
놓침                  -> 0
~~~

LEFT/RIGHT label 자체는 학습기에 전달하지 않는다.

이것은 `if targetRight -> RIGHT`가 아니다.

환경에서 행동을 해본 뒤
**그 행동 결과만** 학습 신호로 받는 contextual-bandit 형태다.

## 학습기

2-action softmax policy-gradient readout.

초기 weight는 전부 0이므로:

~~~text
P(LEFT)  = 0.5
P(RIGHT) = 0.5
~~~

학습 중 action은 확률적으로 뽑는다.

reward를 받은 행동과 당시 DN pattern의 연결은 강해지고,
실패한 행동은 reward baseline 대비 불리하게 갱신된다.

full MaleCNS 내부 weight는 바꾸지 않는다.

## 누수 방지

training/evaluation 모두 L/R episode 수를 정확히 50:50으로 만든다.

같은 brain noise seed를 L/R 한 쌍에 재사용하고 순서를 번갈아 배치한다.

evaluation:

~~~text
VISUAL_ON
  target cue를 brain에 넣음

VISUAL_OFF
  같은 seed / 같은 L-R schedule
  SNta만 유지하고 target visual cue 제거
~~~

OFF에서 성능이 50% 근처로 떨어져야
readout이 episode 순서나 seed가 아니라 connectome의 visual response를 사용했다고 볼 수 있다.

## 사전 gate

push run 기본:

~~~text
2 independent runs
120 training episodes / run
60 evaluation episodes / condition / run
~~~

PASS:

~~~text
mean VISUAL_ON >= 70%
mean (VISUAL_ON - VISUAL_OFF) >= 15 percentage points
각 independent run VISUAL_ON >= 65%
~~~

PASS하면 다음에는 이 readout state를 실제 game loop에 저장 가능한
**Fly #001 skill state**로 연결한다.

FAIL이면 target-side 정보를 직접 feature로 넣지 않고
DN trace window / learning rule / sensory duration부터 수정한다.
