# development_v10 — Fly #001 Skill 02 재설계 / Approach-to-Strike

## 목적

v9의 정지 화면 ATTACK / WAIT 분류는 최종 FAIL이었다.

v10은 같은 숫자를 더 튜닝하지 않는다.

문제를 다음처럼 다시 정의한다.

> **Fly #001이 실제로 버섯 쪽으로 접근하는 동안
> full MaleCNS의 시간적 neural trajectory만 보고
> 첫 공격을 언제 시도할지 학습한다.**

즉 ATTACK timing을 static classification이 아니라
**optimal stopping** 문제로 바꾼다.

---

## 왜 이 설계가 필요한가

현재 MapleFly visual encoder는 단순 distance만 쓰지 않는다.

target에 가까워질 때:

~~~text
closeness
approaching
~~~

이 변하고, 그 결과:

~~~text
LC10a
LPLC1
LPLC2
LC4
~~~

입력도 시간에 따라 달라진다.

v9에서는 player와 target이 고정돼 있어서
`approaching` 경로를 사실상 사용하지 못했다.

v10에서는 Skill 01 LEFT / RIGHT가 실제로 player를 움직인다.

---

## 이동은 이미 배운 Skill 01 사용

~~~text
target visual input
      ↓
full MaleCNS
      ↓
v7 Fly #001 LEFT / RIGHT readout
      ↓
player 실제 이동
~~~

ATTACK 학습을 위해 이동 방향을 oracle로 주지 않는다.

즉:

~~~text
if targetRight -> moveRight
~~~

같은 코드는 사용하지 않는다.

이동은 v7에서 이미 검증된 저장 skill 그대로다.

---

## ATTACK policy 입력

ATTACK policy는 전체 1,316 descending neuron의 시간 신호를 사용한다.

decision window:

~~~text
200 ms
~~~

세 channel:

~~~text
1. current - baseline
2. fast EMA - slow EMA
3. current - fast EMA
~~~

각 값은 50 Hz ceiling으로 scale한다.

따라서 policy input은:

~~~text
1,316 × 3
+ bias
= 3,949 features
~~~

이다.

### 금지 정보

policy에는 다음을 넣지 않는다.

~~~text
target distance
target x/y
player x/y
attack range
hittable boolean
정답 ATTACK 시점
~~~

거리와 hit 가능 여부는 evaluation / environment physics에서만 사용한다.

---

## episode

training spawn distance:

~~~text
260
340
420
500 px
~~~

evaluation은 다른 거리:

~~~text
290
370
450
530 px
~~~

각 distance는 LEFT / RIGHT를 동일하게 사용한다.

episode 시작:

~~~text
0.52 s settle
0.52 s visual-off baseline
target visual ON
Skill 01로 접근
ATTACK policy 200 ms마다 선택
~~~

가능 action:

~~~text
ATTACK
WAIT
~~~

첫 ATTACK 순간 episode를 종료한다.

---

## reward

정답 label을 주지 않는다.

실제 hitbox 결과만 사용한다.

~~~text
첫 ATTACK이 실제 hit
-> +1
-> episode success

첫 ATTACK이 whiff
-> -1
-> episode fail

시간 내 한 번도 ATTACK하지 않음
-> -1
-> timeout
~~~

WAIT 자체에 정답/오답 점수를 주지 않는다.

최종 reward를 trajectory 전체에 discounted REINFORCE 방식으로 전달한다.

초기 ATTACK / WAIT는 50:50이고,
학습 중 attack exploration floor 4%를 유지한다.

이 exploration floor는 정답 timing을 넣는 것이 아니라
WAIT policy로 너무 빨리 붕괴해 공격 자체를 다시 시도하지 못하는 문제를 막기 위한 탐색 장치다.

---

## 대조군

v10은 공격 skill 자체를 분리해서 보기 위해
movement는 세 조건 모두 정상 visual input을 사용한다.

### FULL

~~~text
movement visual ON
attack neural feature ON
temporal channels ON
~~~

### NEURAL_OFF

~~~text
movement visual ON
attack policy feature는 bias만
~~~

player는 계속 Skill 01로 접근한다.

따라서 FULL과 차이가 나면
"단순히 움직였기 때문"이 아니라
ATTACK readout이 neural state를 실제로 사용했다는 근거가 된다.

### TEMPORAL_OFF

~~~text
movement visual ON
current DN channel ON
fast/slow temporal difference OFF
~~~

이 조건은 temporal history가 얼마나 추가로 기여했는지 보는 진단용이다.

TEMPORAL_OFF보다 반드시 좋아야 PASS로 정하지는 않는다.
current neural amplitude만으로 충분할 가능성도 있기 때문이다.

---

## 사전 gate

결과를 보기 전에 다음을 고정한다.

~~~text
mean FULL hit rate          >= 70%
FULL - NEURAL_OFF           >= 25%p
FULL whiff rate             <= 30%
FULL timeout rate           <= 25%
각 independent run FULL hit >= 60%
~~~

gate를 결과에 맞춰 낮추지 않는다.

---

## PASS 후

PASS하면 best run에서
세 temporal channel을 합쳐 DN별 weight energy를 계산한다.

상위 96개 DN만 남긴 sparse deployment candidate를 만든다.

그 다음 별도 pruning / continuous browser-style gate를 통과해야만:

~~~text
Fly #001

Skill 01
LEFT / RIGHT
DEPLOYED

Skill 02
ATTACK timing
DEPLOY
~~~

으로 승격한다.

v10 training PASS만으로 browser에 바로 넣지 않는다.


---

## Phase A 실제 결과 — policy-gradient가 WAIT로 붕괴

첫 Approach-to-Strike push:

~~~text
run      35448210630
commit   49d1c6a81a7aa932cb9a284d7ccd217057c27205
artifact 10586526904

digest
sha256:f033ac5a8fdadee7cc22bb3fd503aecc8bed94f260d8ef372e557b1a139c7feb
~~~

training 중 가끔 hit가 발생했다.

예:

~~~text
run 1 일부 8-episode window
hit 37.5%

run 2 마지막 8-episode window
hit 25.0%
~~~

하지만 greedy evaluation은 두 run 모두:

~~~text
FULL
hit      0%
whiff    0%
timeout 100%

NEURAL_OFF
hit      0%
timeout 100%

TEMPORAL_OFF
hit      0%
timeout 100%
~~~

로 완전히 WAIT에 붕괴했다.

최종 ATTACK bias도 큰 음수로 내려갔다.

~~~text
attackBias = -1.4196
~~~

### 원인 해석

이 결과를 "temporal DN 정보가 없다"로 해석하지 않는다.

Phase A learner는 terminal reward 하나를
trajectory 전체에 REINFORCE 방식으로 전달했다.

초기에는 50% ATTACK 때문에 먼 거리 whiff가 매우 많이 발생한다.

그 whiff의 -1이
그 전에 했던 WAIT까지 함께 불리하게 업데이트하면서
credit assignment가 거칠어졌다.

반대로 실제 hit 경험은 너무 희소해서
"먼 곳에서는 WAIT -> 가까워지면 ATTACK"의
두 단계 value structure를 안정적으로 만들지 못했다.

결과적으로 greedy policy는
가장 안전해 보이는 WAIT 쪽으로 잠겼다.

---

## Phase B — curriculum + Q-learning optimal stopping

정답 timing label은 여전히 주지 않는다.

학습 문제를 ATTACK/WAIT의 **Q-value** 문제로 바꾼다.

~~~text
Q(neural state, ATTACK)
Q(neural state, WAIT)
~~~

ATTACK:

~~~text
실제 hit   -> +1 terminal
실제 whiff -> -1 terminal
~~~

WAIT:

~~~text
즉시 reward 0
다음 neural state의 최선 Q로 bootstrap
~~~

timeout:

~~~text
-1 terminal
~~~

### backward replay

episode가 끝난 뒤 시간 역순으로 transition을 다시 본다.

whiff가 났을 때:

- 마지막 ATTACK state는 -1로 직접 학습
- 그 앞의 WAIT는 "다음 state에서 ATTACK 말고 더 WAIT할 수도 있었다"는 max-Q를 사용

즉 early whiff 때문에
그 전의 모든 WAIT까지 일괄 -1로 찍지 않는다.

반대로 hit가 나면
near-state ATTACK의 +1이
앞선 WAIT value로 점차 전파된다.

### curriculum

처음부터 500px 접근을 배우지 않는다.

~~~text
Stage 1 near
140 / 180 px

Stage 2 near-mid
220 / 280 px

Stage 3 mid
320 / 380 px

Stage 4 far
420 / 480 px
~~~

각 stage에서 LEFT / RIGHT를 같은 수로 경험한다.

정책은 stage 이름이나 start distance를 feature로 받지 않는다.

이것은 답을 알려주는 것이 아니라
**게임 튜토리얼처럼 성공 경험을 먼저 발견할 수 있는 쉬운 환경부터 주는 것**이다.

evaluation은 held-out:

~~~text
160 / 250 / 350 / 450 px
~~~

로 고정한다.

### 더 촘촘한 timing

ATTACK decision window를:

~~~text
200 ms -> 100 ms
~~~

로 줄인다.

280 px/s 이동에서 200 ms는 약 56 px 이동이라
사거리 경계를 너무 거칠게 건너뛸 수 있었다.

100 ms는 약 28 px이다.

### 추가 diagnostic

이번부터 movement 자체가 실패한 것과
ATTACK policy가 실패한 것을 분리하기 위해:

~~~text
closest distance
movement reach rate
~~~

를 별도 기록한다.

사전 gate에:

~~~text
movement reach rate >= 85%
~~~

도 추가한다.

이 값이 FAIL이면 ATTACK learner를 탓하기 전에
Skill 01 접근 경로부터 다시 본다.
