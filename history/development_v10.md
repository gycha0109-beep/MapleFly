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
