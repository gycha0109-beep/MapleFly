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


---

## Phase C — current DN + outcome-only motor babbling

Phase B 결과에서:

~~~text
movement reach      97.9%
FULL hit            22.9%
TEMPORAL_OFF hit    33.3%
~~~

가 나왔다.

따라서 temporal channel을 더 추가하거나 Q-learning 파라미터를 더 만지지 않는다.

Phase C는 학습 문제를 더 단순하게 분리한다.

### 핵심 아이디어

초파리에게 "언제 공격해야 하는지" label을 주지 않는다.

대신 practice 동안 임의 시점에 ATTACK을 실제로 시도하게 한다.

~~~text
현재 full MaleCNS DN state
        ↓
무작위 exploratory ATTACK
        ↓
실제 hitbox 결과

HIT
또는
WHIFF
~~~

이 경험만 모은다.

WAIT한 state에는 정답 label을 붙이지 않는다.

즉:

~~~text
"이때 WAIT가 정답"
"이 거리에서는 ATTACK"
~~~

같은 교사 정보는 없다.

공격을 실제로 해본 상태에 대해서만
그 공격이 맞았는지 빗나갔는지를 기억한다.

### 왜 이 방식으로 바꾸는가

Phase A/B는 sparse terminal reward를
ATTACK뿐 아니라 수십 개 WAIT decision에까지
credit assignment해야 했다.

Phase C는 그 문제를 제거한다.

~~~text
공격함
-> 결과가 바로 나옴
-> 그때 neural state와 outcome만 학습
~~~

즉 처음에는 **motor babbling / 시행착오 데이터 수집**에 집중한다.

### feature

temporal stack을 제거한다.

~~~text
(current DN Hz - baseline DN Hz) / 50
~~~

1,316개 current DN response만 사용한다.

그리고 label과 무관하게
training sample에서 variance가 큰 DN 상위 128개만 선택한다.

~~~text
feature selection에 HIT/WHIFF label 사용 안 함
distance 사용 안 함
~~~

선택된 DN은 training mean / standard deviation으로 standardize한다.

### classifier

실제 ATTACK outcome:

~~~text
HIT   -> 1
WHIFF -> 0
~~~

만으로 class-balanced logistic classifier를 학습한다.

hit / whiff 표본 수가 달라도
한쪽 class가 무조건 policy를 먹어버리지 않도록
class weight를 50:50으로 맞춘다.

evaluation에서는:

~~~text
P(hit | current DN) >= 0.5
-> ATTACK

그 미만
-> WAIT
~~~

한다.

이 0.5 threshold는 결과를 보고 조정하지 않는다.

### practice curriculum

~~~text
Stage 1
120 / 180 px

Stage 2
220 / 280 px

Stage 3
320 / 380 px

Stage 4
420 / 460 px
~~~

각 episode에서 100ms decision window마다
18% 확률로 exploratory ATTACK probe를 수행한다.

episode당 최대 8회다.

probe 시점은 target distance나 hittable 여부를 보고 정하지 않는다.

이것은 정답 제공이 아니라
**여러 시점에서 직접 칼을 휘둘러보고 맞았는지 경험하게 하는 탐색**이다.

### evaluation

held-out start distance:

~~~text
150 / 250 / 350 / 440 px
~~~

세 조건:

~~~text
MOVEMENT_ONLY
공격 없이 Skill 01 접근 성능만 확인

FULL
current DN classifier 사용

NEURAL_OFF
movement는 정상
ATTACK classifier에는 neural feature를 주지 않고 bias만 사용
~~~

### gate

Phase B에서 정한 기준을 낮추지 않는다.

~~~text
MOVEMENT_ONLY reach >= 85%
FULL hit            >= 70%
FULL - NEURAL_OFF   >= 25%p
FULL whiff          <= 30%
FULL timeout        <= 25%
모든 run FULL hit   >= 60%
~~~

PASS해도 바로 browser에 넣지 않는다.

별도 sparse/deployment continuous gate를 한 번 더 거친 뒤
Fly #001 Skill 02로 승격한다.


---

## Phase C smoke 실제 결과 — 거의 통과, gate는 유지

GitHub Actions:

~~~text
run      35464901609
commit   5e44be11ccc04f460ceaa393c8e036107a0a7ee8
artifact 10590508517

digest
sha256:59c1dd1cccf5aca60ba5624c0ac8d1a67522fb6765f55e622ca3313dbcd1f57d
~~~

push smoke 설정:

~~~text
2 independent runs
64 practice episodes / run
24 held-out eval episodes / condition / run
~~~

practice에서는 random exploratory ATTACK만 사용했고,
각 ATTACK의 실제 hit / whiff 결과만 classifier label로 사용했다.

### Run 1

~~~text
practice samples 453
hit share        30.5%

MOVEMENT_ONLY reach 100.0%

FULL hit         66.7%
NEURAL_OFF hit    0.0%
whiff            33.3%
timeout           0.0%
~~~

### Run 2

~~~text
practice samples 457
hit share        34.4%

MOVEMENT_ONLY reach 100.0%

FULL hit         70.8%
NEURAL_OFF hit    0.0%
whiff            29.2%
timeout           0.0%
~~~

### 평균

~~~text
movement reach   100.0%

FULL hit          68.8%
NEURAL_OFF hit     0.0%
difference        +68.8%p

whiff              31.3%
timeout              0.0%
~~~

사전 gate:

~~~text
FULL hit >= 70%
whiff    <= 30%
~~~

에 각각 약 1%p 정도 모자랐다.

따라서:

~~~text
V10C-GATE
FAIL
~~~

로 유지한다.

gate를 결과에 맞춰 낮추지 않는다.

### 중요한 변화

Phase A/B와 달리 두 independent run 모두
실제 neural input을 이용해 공격 타이밍을 잡는 수준까지 올라왔다.

~~~text
Phase B FULL 평균 22.9%
Phase C FULL 평균 68.8%
~~~

NEURAL_OFF는 두 run 모두 0%였다.

즉 current-DN + outcome-only 경험학습 방향은
이전 Q-learning / temporal stack보다 훨씬 안정적이다.

### 다음 검증

Phase C workflow에는 처음부터 full confirmation 기본값을 따로 정해 두었다.

~~~text
3 runs
96 practice episodes / run
32 eval episodes / condition / run
~~~

push smoke는 CI 비용 때문에 2 / 64 / 24였다.

현재 결과가 gate 바로 아래까지 왔으므로
threshold나 reward를 수정하지 않고
**사전에 정해 둔 full confirmation 규모만 실행한다.**

다음 run에서도 gate는 그대로 유지한다.

~~~text
movement reach >= 85%
FULL hit       >= 70%
FULL-OFF       >= 25%p
whiff          <= 30%
timeout        <= 25%
모든 run FULL  >= 60%
~~~


---

## Phase C full confirmation — PASS

GitHub Actions:

~~~text
run      35465429673
commit   5e1f5a85528039af4b6b6bdd2b894fc37eace610
artifact 10590739330

digest
sha256:552b71415945f82cddcbfe38c1397ea1c7a4eb8a5140708dbe26eb9cc2c92e51
~~~

결과:

~~~text
Run 1 FULL 87.5%
Run 2 FULL 75.0%
Run 3 FULL 65.6%

mean FULL         76.0%
mean NEURAL_OFF    0.0%
difference       +76.0%p

mean whiff        24.0%
mean timeout       0.0%
movement reach   100.0%

V10C-GATE
PASS
~~~

사전 gate를 변경하지 않고 통과했다.

따라서 Phase C 학습 자체는 성공으로 닫는다.

다만 browser 배치 승격은 아직 아니다.

Run 1 classifier를 frozen candidate로 만들고
새 seed / 새 start distance / DN_SHUFFLED control로
deployment gate를 별도로 돌린다.

deployment gate는 결과를 보기 전에:

~~~text
MOVEMENT_ONLY reach >= 85%
FULL hit            >= 70%
FULL - NEURAL_OFF   >= 25%p
FULL - DN_SHUFFLED  >= 20%p
FULL whiff          <= 30%
FULL timeout        <= 25%
각 run FULL hit     >= 60%
~~~

로 고정한다.


---

## Phase C deployment gate — 평균은 통과, seed 안정성 FAIL

GitHub Actions:

~~~text
run      35502791050
commit   fc71164d4a825af15a2523ff3884c165ae931b29
artifact 10603305959

digest
sha256:c786b0d0af44f25d658af8510036c5ef67fd2c9f2dc4861e0617881ee5429624
~~~

frozen candidate:

~~~text
source run       35465429673
source run index 1
selected DN      128
threshold        0.5
~~~

training과 confirmation에 쓰지 않은:

~~~text
seed 41000
seed 51000
seed 61000

start distance
170 / 270 / 360 / 470 px
~~~

에서 검증했다.

추가 control:

~~~text
NEURAL_OFF
DN_SHUFFLED
~~~

결과:

~~~text
Run 1
FULL       90.6%
OFF         0.0%
SHUFFLED   31.3%

Run 2
FULL       56.3%
OFF         0.0%
SHUFFLED   21.9%

Run 3
FULL       65.6%
OFF         0.0%
SHUFFLED    0.0%

mean movement reach 100.0%
mean FULL            70.8%
mean OFF              0.0%
mean SHUFFLED        17.7%
mean whiff           29.2%
mean timeout          0.0%
~~~

평균 gate 항목은 대부분 통과했다.

하지만 사전에 정한:

~~~text
각 run FULL hit >= 60%
~~~

에서 Run 2가 56.3%로 실패했다.

따라서:

~~~text
V10C-DEPLOY-GATE
FAIL
~~~

로 유지한다.

### 해석

이 결과는 ATTACK readout 방향 자체가 틀렸다는 뜻은 아니다.

~~~text
FULL 평균        70.8%
NEURAL_OFF        0.0%
DN_SHUFFLED      17.7%
~~~

이므로 실제 DN identity를 쓰는 signal은 분명 존재한다.

문제는 **한 independent practice run에서 고른 single best classifier를
Fly #001 최종 skill로 고정한 선택이 seed 변화에 충분히 안정적이지 않았다는 것**이다.

특히 Run 1 candidate를 "가장 잘 나온 run"이라는 이유로 고른 것은
deployment 관점에서 selection bias를 만들 수 있다.

### 다음 원칙 — Phase D continued practice

gate를 낮추거나 56.3%를 반올림해서 통과시키지 않는다.

ensemble로 여러 fly를 묶지도 않는다.

대신 같은 Fly #001 candidate가
**추가로 더 다양한 환경에서 직접 칼질을 연습**하게 한다.

~~~text
기존 selected DN / normalization 유지
기존 classifier weight에서 시작

새 training seed cohort 3개
각 cohort에서 random ATTACK motor babbling
HIT / WHIFF outcome만 추가 학습

그 뒤 완전히 새 evaluation seed에서 다시 deployment gate
~~~

즉 새 모델을 골라 끼우는 것이 아니라
Fly #001이 추가 경험을 쌓아
seed-specific 편향을 줄이는 방향으로 간다.

거리 / hittable / 정답 timing은 여전히 policy input에 넣지 않는다.


---

## Phase D 사전 등록 — continued practice / 추가 경험 학습

Phase C deployment gate는 평균 성능은 기준을 넘었지만
새 seed 중 한 run이 FULL 56.3%로 per-run floor 60%에 실패했다.

이번 Phase D에서는 결과를 보고 candidate를 다시 고르거나
gate / threshold / feature를 조정하지 않는다.

현재 Fly #001의 frozen v10C candidate 자체를 초기 학습 상태로 두고,
새로운 outcome-only 경험만 추가한다.

### 고정 상태

아래 항목은 v10C frozen candidate에서 그대로 유지한다.

~~~text
source candidate  v10c-run1-top128
DN contract       1,316
selected DN       128개 그대로 유지
means             그대로 유지
scales            그대로 유지
initial weights   그대로 유지
initial bias      그대로 유지
attack threshold  0.5
attack feature    (current DN Hz - baseline DN Hz) / 50
attack window     5 steps
movement skill    기존 Fly #001 Skill 01
connectome        alextitonis/fly.ai
brain commit      95a3dbcb05241b0a5c07028ca8ad945b23fbbe6e
~~~

selected DN을 다시 뽑지 않는다.
means/scales도 새 cohort에 맞춰 다시 계산하지 않는다.

즉 새 모델을 처음부터 학습하는 실험이 아니다.

### 새 practice cohort

결과 실행 전에 아래 값으로 고정한다.

~~~text
practice cohorts     3
episodes / cohort    64
total episodes       192

practice base seeds
71000
81000
91000

practice distances
145 / 245 / 345 / 445 px

random ATTACK probe rate     0.18
max probes / episode         8
max seconds / episode        4.5
~~~

각 episode에서는 기존 Phase C와 동일하게
임의 시점의 ATTACK motor babbling만 수행한다.

classifier 학습 입력에는 계속 다음을 넣지 않는다.

~~~text
target distance
player / target coordinates
attack range
hittable flag
stage / cohort name
correct attack timing
~~~

학습 label은 실제 게임 hitbox 결과의:

~~~text
HIT   = 1
WHIFF = 0
~~~

만 사용한다.

WAIT state에는 정답 label을 만들지 않는다.

### continued update 규칙

초기값:

~~~text
w0 = 현재 frozen v10C weights
b0 = 현재 frozen v10C bias
~~~

새 practice episode의 결과는 replay pool에 누적한다.

양쪽 class가 충분히 쌓인 뒤 episode마다
고정된 balanced minibatch로 SGD 1 step을 수행한다.

사전 고정 hyperparameter:

~~~text
batch HIT            16
batch WHIFF          16
learning rate        0.01
weight anchor lambda 0.10
bias anchor lambda   0.10
~~~

objective의 regularization은 0을 향한 일반 L2가 아니라:

~~~text
||w - w0||^2
(b - b0)^2
~~~

형태의 anchor다.

목적은 새 경험으로 update하면서도
기존 Skill 02 readout 전체가 급격히 무너지는 것을 막는 것이다.

이 값들은 Phase D 결과를 본 뒤 수정하지 않는다.
구현 버그가 아닌 성능 이유로 재튜닝하지 않는다.

### final unseen deployment cohort

practice에 사용한 seed와 완전히 분리한다.

~~~text
final base seeds
121000
131000
141000

final start distances
165 / 265 / 365 / 455 px

episodes / condition / run
32
~~~

같은 final cohort에서:

~~~text
BEFORE = continued practice 전 frozen v10C
AFTER  = continued practice 후 candidate
~~~

를 모두 평가한다.

각 candidate에 대해:

~~~text
FULL
NEURAL_OFF
DN_SHUFFLED
~~~

를 측정하고 MOVEMENT_ONLY reach도 별도로 기록한다.

BEFORE / AFTER의 DN_SHUFFLED는 run별 같은 permutation을 사용한다.

### deployment gate

기존 gate를 그대로 유지한다.

~~~text
MOVEMENT_ONLY reach >= 85%
FULL hit            >= 70%
FULL - NEURAL_OFF   >= 25%p
FULL - DN_SHUFFLED  >= 20%p
FULL whiff          <= 30%
FULL timeout        <= 25%
각 run FULL hit     >= 60%
~~~

최종 승격 판정은 AFTER에 적용한다.

결과가 나쁘더라도 이 기준을 낮추지 않는다.

### 추가 기록

Phase D artifact에는 최소 다음을 남긴다.

~~~text
practice cohort별 episode / probe / HIT / WHIFF
실제 SGD update 수

BEFORE / AFTER
- per-run FULL
- mean FULL
- NEURAL_OFF
- DN_SHUFFLED
- whiff
- timeout
- movement reach
- gate

weight 변화
- L2 delta from original
- bias delta
- sign flip count
- mean / max absolute weight delta
- largest weight changes
~~~

Phase D deployment gate가 PASS하기 전에는
browser `fly-controller.js`의 ATTACK decoder를 교체하지 않는다.


### Phase D 실행 최적화 — paired final trajectory

사전 등록한 seed / episode 수 / 거리 / 학습률 / anchor / threshold / gate는 변경하지 않는다.

초기 구현은 같은 final episode를 다음 조건마다 다시 MaleCNS simulation했다.

~~~text
MOVEMENT_ONLY
BEFORE FULL / OFF / SHUFFLED
AFTER  FULL / OFF / SHUFFLED
~~~

하지만 현재 headless ATTACK 검증에서 ATTACK action은
신경 입력이나 이동 상태를 바꾸는 feedback이 없고
첫 ATTACK에서 episode를 terminal 처리하는 역할만 한다.

따라서 같은 brain seed / 같은 sensory input / 같은 Skill 01 movement에서는
ATTACK을 실제로 terminal 처리하지 않고 끝까지 한 번 simulation하여
각 5-step ATTACK window의:

~~~text
DN feature
player position
target position
facing
time
그 시점까지의 closest distance
~~~

를 trajectory로 만든 뒤,

각 BEFORE / AFTER / OFF / SHUFFLED policy가
그 trajectory에서 처음 threshold 0.5를 넘는 시점을 찾아
그 시점의 실제 hitbox로 HIT / WHIFF를 판정할 수 있다.

이는 기존 조건별 재시뮬레이션과 policy 의미가 같다.
ATTACK 이전 trajectory가 policy에 의존하지 않기 때문이다.

오히려 BEFORE / AFTER가 완전히 같은 neural trajectory를 공유하므로
paired 비교가 더 명확하다.

이 변경은 계산 중복 제거만을 위한 것이다.

~~~text
practice cohort       변경 없음
final seeds           변경 없음
final distances       변경 없음
episodes / condition  32 유지
threshold             0.5 유지
deployment gate       변경 없음
~~~
