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


---

## Phase B 실제 결과 — 이동은 통과, ATTACK Q-policy는 아직 불안정

GitHub Actions:

~~~text
run      35448647479
commit   bd092fa9c4041b1887761f689ea8981b9c8860d9
artifact 10585602299

digest
sha256:d5a2c355a9c4932c94cf6cb36f7f7cce7a443130b94c514a554b8a12fae58bf8
~~~

Phase B는 다음을 실제로 적용했다.

~~~text
4-stage distance curriculum
linear Q-learning
backward replay
100 ms ATTACK decision window
movement reach diagnostic
FULL / NEURAL_OFF / TEMPORAL_OFF
~~~

### Run 1

~~~text
movement reach   95.8%

FULL hit         45.8%
NEURAL_OFF hit    0.0%
TEMPORAL_OFF     66.7%
~~~

FULL에서는 실제 neural input이 없을 때보다 공격 성공이 크게 높았다.

하지만 temporal feature를 제거한 TEMPORAL_OFF가
오히려 FULL보다 높았다.

즉 현재의 fast/slow temporal channel은
도움을 주기보다 noise / optimization burden을 추가했을 가능성이 있다.

### Run 2

~~~text
movement reach  100.0%

FULL hit          0.0%
NEURAL_OFF        0.0%
TEMPORAL_OFF      0.0%
~~~

이 run은 greedy evaluation에서 다시 WAIT 쪽으로 붕괴했다.

따라서 같은 architecture가 seed가 달라져도 안정적으로 학습된다고 볼 수 없다.

### 평균

~~~text
movement reach        97.9%

FULL hit              22.9%
NEURAL_OFF hit         0.0%
FULL - NEURAL_OFF    +22.9%p

TEMPORAL_OFF hit      33.3%
FULL - TEMPORAL_OFF  -10.4%p

FULL whiff            27.1%
FULL timeout          50.0%

V10-GATE
FAIL
~~~

### 해석

가장 중요한 분리는 성공했다.

~~~text
Skill 01 movement reach
97.9%
~~~

즉 이번 실패의 주원인은
"버섯까지 못 가서 공격을 못 했다"가 아니다.

현재 병목은 ATTACK policy다.

또한:

~~~text
NEURAL_OFF 0%
TEMPORAL_OFF > FULL
~~~

이므로 다음 단계에서 temporal feature를 무조건 늘리는 방향은 중단한다.

현재 evidence는 오히려 다음을 지지한다.

> **full temporal stack보다 현재 DN response 하나를 안정적으로 읽는 쪽을 먼저 해결해야 한다.**

### 다음 수정 원칙

다음 iteration에서는 gate를 낮추지 않는다.

먼저:

~~~text
1. current DN channel만 사용
2. feature dimension / scale 안정화
3. WAIT collapse 방지
4. independent seed consistency 확인
5. 그 뒤 temporal trace를 하나씩 다시 추가
~~~

순서로 간다.

ATTACK distance / hit 가능 여부 / 정답 timing은 계속 policy input에 넣지 않는다.

Fly #001 Skill 02는 여전히 승격하지 않는다.
