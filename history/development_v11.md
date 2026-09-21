# MapleFly v11 개발 기록 — Fly #001 Skill03 JUMP preregistration

## 목적

Skill01 LEFT / RIGHT와 Skill02 ATTACK 다음으로,
Fly #001이 **언제 점프해야 장애물을 넘을 수 있는지**를
frozen MaleCNS descending-neuron state에서 reward-only로 배우는지 검증한다.

이 문서는 v11 결과를 보기 전에 실험 조건을 고정하는 preregistration이다.

## 과학적 경계

MaleCNS connectome synapse는 계속 고정한다.

학습 대상은:

~~~text
MaleCNS DN activity
-> linear action-value readout
-> WAIT / JUMP
~~~

뿐이다.

다음 값은 JUMP policy input에 직접 넣지 않는다.

~~~text
obstacle distance
obstacle x/y
obstacle width/height
player x/y
jump arc
ground-truth jump timing
can-clear / should-jump flag
target coordinate
episode cohort
~~~

환경은 시각 자극으로만 obstacle 정보를 MaleCNS에 전달하고,
trainer는 action을 선택하지 않는다.

trainer가 사용하는 것은 실제 게임 outcome / reward뿐이다.

## 환경

브라우저 물리와 동일한 상수를 사용한다.

~~~text
world width     1000 px
groundY          530 px
gravity         1400 px/s^2
move speed       280 px/s
jump velocity    600 px/s
brain dt        0.02 s
~~~

player:

~~~text
width  34 px
height 46 px
~~~

obstacle:

~~~text
width  38 px
height 54 px
~~~

장애물은 시작점 기준 이동 방향 앞쪽에 둔다.

practice obstacle distance:

~~~text
145 / 185 / 225 / 265 px
~~~

target beacon은 obstacle far edge보다 160 px 더 멀리 둔다.

좌/우 방향은 block마다 교대한다.

## sensory encoding

ground:

~~~text
SNta_L = 0.05 when grounded
SNta_R = 0.05 when grounded
~~~

target beacon은 기존 movement encoder의
LC10a / LPLC1 / LPLC2를 사용한다.

obstacle looming cue는 이동 방향 쪽 `LC4`에만 추가한다.

~~~text
obstacle visual radius = 280 px
LC4 drive =
clamp((280 - front_distance) / 280 * 0.80, 0, 0.80)
~~~

LC4는 sensory transduction이며 policy 입력이 아니다.
policy는 LC4 값이나 obstacle distance를 보지 않고
그 자극을 통과한 MaleCNS DN activity만 본다.

## 기존 Skill01 사용

horizontal movement는 frozen v7 Skill01을 그대로 사용한다.

~~~text
movement window 26 brain steps
baseline        26 brain steps
settle          26 brain steps
~~~

v11은 movement readout을 다시 학습하지 않는다.

ATTACK / POTION / climbing은 v11 tutorial에서 비활성화한다.

## JUMP policy state

매 5 brain steps마다 전체 1,316 DN의 현재 rate를 계산한다.

~~~text
feature_i =
clamp((current_dn_hz_i - baseline_dn_hz_i) / 50, -1, 1)
~~~

policy는 이 feature만 사용한다.

## action

~~~text
WAIT
JUMP
~~~

5-step decision boundary에서 policy가 action을 선택한다.

JUMP가 선택되어도 실제 actuator는 grounded일 때만 발동한다.
airborne 상태에서 JUMP를 선택해도 별도 hidden correction은 하지 않는다.

실제 JUMP actuator cooldown은 750 ms로 둔다.

## learner

Phase A는 full 1,316-DN linear SARSA(0) readout으로 시작한다.

action별:

~~~text
Q_WAIT(x) = b_wait + w_wait · x
Q_JUMP(x) = b_jump + w_jump · x
~~~

epsilon-greedy exploration:

~~~text
cohort 1 epsilon 0.35
cohort 2 epsilon 0.20
cohort 3 epsilon 0.08
~~~

optimizer:

~~~text
learning rate 0.005
gamma         0.95
TD error clamp [-2, 2]
L2 decay      0.0001
~~~

정책은 trainer의 correct action을 받지 않는다.

## reward

reward는 action 정답표가 아니라 실제 게임 outcome에서 계산한다.

장애물 episode:

~~~text
obstacle 완전 통과            +2.00 terminal
5-step 동안 obstacle에 block  -0.04
실제 JUMP actuator 발동       -0.02
timeout                       -1.00 terminal
~~~

no-obstacle episode:

~~~text
target beacon 도달            +1.00 terminal
실제 JUMP actuator 발동       -0.02
timeout                       -0.50 terminal
~~~

즉 "지금 점프가 정답"이라는 label은 제공하지 않는다.

## practice curriculum

총 288 episodes:

~~~text
3 cohorts × 96 episodes
~~~

각 cohort:

~~~text
72 obstacle episodes
24 no-obstacle episodes
~~~

practice base seeds:

~~~text
451000
461000
471000
~~~

practice obstacle distances:

~~~text
145 / 185 / 225 / 265 px
~~~

각 episode의 brain seed / side / obstacle distance는
미리 결정된 deterministic schedule로 생성한다.

## final evaluation

학습 종료 후 weights를 freeze하고
epsilon=0 greedy policy로 unseen final을 측정한다.

final seeds:

~~~text
501000
511000
521000
~~~

final obstacle distances:

~~~text
155 / 195 / 235 / 275 px
~~~

각 run:

~~~text
32 obstacle episodes
16 no-obstacle specificity episodes
~~~

조건:

~~~text
FULL
  obstacle visual ON
  learned DN identity 그대로

VISUAL_OFF
  obstacle LC4 cue만 제거
  target beacon / ground input 유지

DN_SHUFFLED
  obstacle visual ON
  fixed DN identity permutation

NO_OBSTACLE
  obstacle 없음
  obstacle cue 없음
  target beacon은 유지
~~~

VISUAL_OFF / DN_SHUFFLED에서도 trainer가 action을 수정하지 않는다.

## 측정값

obstacle episode:

~~~text
clear rate
collision-block windows
timeout rate
actual jumps / episode
first jump step
closest obstacle-front distance before first jump
~~~

NO_OBSTACLE:

~~~text
target reach rate
episodes with >=1 unnecessary jump
mean jumps / episode
~~~

## 사전 deployment gate

Phase A PASS 조건:

~~~text
FULL clear                    >= 70%
FULL - VISUAL_OFF             >= 25 percentage points
FULL - DN_SHUFFLED            >= 20 percentage points
every FULL run clear          >= 60%
FULL timeout                  <= 25%
FULL mean actual jumps        <= 2.0 / episode
NO_OBSTACLE any-jump episodes <= 30%
NO_OBSTACLE target reach      >= 85%
~~~

이 gate는 결과를 본 뒤 낮추지 않는다.

## PASS 이후

Phase A가 PASS하더라도 full 1,316-DN readout을 바로 browser에 배치하지 않는다.

다음 순서:

~~~text
unlabeled / weight-magnitude 기반 sparse deployment candidate
-> unseen sparse equivalence gate
-> exact 5-step browser sampler
-> browser/headless equivalence
-> Pages deploy
~~~

를 별도로 거친다.

## FAIL 이후

FAIL이면 gate를 낮추지 않는다.

분석 우선순위:

1. obstacle visual cue가 DN에 구분 가능한 state를 만드는가
2. movement Skill01이 obstacle까지 안정적으로 접근하는가
3. sparse reward가 credit assignment에 충분한가
4. WAIT/JUMP sequential policy가 jump spam 또는 late-jump로 붕괴하는가

새 phase를 만들 경우 새로운 final seed를 preregister한다.


## 구현 전 정밀 고정

runner 구현 전에 다음 누락 경계값을 추가 고정한다.

~~~text
episode max duration   4.5 s
no-obstacle target reach radius 42 px
jump cooldown steps    round(0.75 / 0.02) = 38
~~~

obstacle complete pass 판정:

~~~text
RIGHT:
player left edge > obstacle far(right) edge

LEFT:
player right edge < obstacle far(left) edge
~~~

DN_SHUFFLED는 run별 final seed에서 고정 permutation을 만든다.

~~~text
permutation seed = final base seed + 900000
~~~

한 run의 모든 DN_SHUFFLED episode는 동일 permutation을 사용한다.

이 값들도 결과를 본 뒤 변경하지 않는다.


## deterministic schedule 세부 규칙

practice obstacle 72 episodes / cohort:

~~~text
9 blocks × 4 distances × 2 sides
brain seed = cohort base seed + block
~~~

practice NO_OBSTACLE 24 episodes / cohort:

~~~text
3 blocks × 4 virtual distances × 2 sides
brain seed = cohort base seed + 100 + block
target 위치는 obstacle이 있다고 가정했을 때의 far edge + 160 px
실제 obstacle / obstacle LC4 cue는 없음
~~~

final obstacle 32 episodes / run:

~~~text
4 blocks × 4 distances × 2 sides
brain seed = final base seed + block
FULL / VISUAL_OFF / DN_SHUFFLED는 같은 episode schedule을 paired 사용
~~~

final NO_OBSTACLE 16 episodes / run:

~~~text
2 blocks × 4 virtual distances × 2 sides
brain seed = final base seed + 7000 + block
~~~

side 순서는 block + distanceIndex parity로 L/R 순서를 교대한다.


practice 각 cohort의 96 episodes는
obstacle 72 + NO_OBSTACLE 24를 만든 뒤 deterministic Fisher-Yates로 섞는다.

~~~text
shuffle seed = cohort base seed + 5000
~~~

따라서 curriculum 순서도 run마다 재현 가능하며 결과 후 변경하지 않는다.


## Phase A authoritative result

Run `35542467674`는 workflow success / scientific FAIL이다.

~~~text
FULL          100%
VISUAL_OFF    100%
DN_SHUFFLED   100%
NO_OBS_JUMP   100%
GATE          FAIL
~~~

정책이 obstacle-specific timing을 배우지 않고
상시 점프 전략으로 붕괴했다.

따라서 reward를 바로 재튜닝하지 않는다.
preregister한 FAIL 분석 우선순위 1번에 따라,
먼저 obstacle LC4 cue의 DN sensory separability를 별도 paired assay로 측정한다.


# Phase B — obstacle sensory separability assay preregistration

Phase A FAIL 뒤 reward/learner를 조정하기 전에,
obstacle LC4 cue가 frozen MaleCNS의 DN state에 실제로 구분 가능한 흔적을 만드는지 측정한다.

이 Phase는 **action-learning 실험이 아니다.**

## 핵심 통제

player trajectory는 brain output과 무관한 scripted horizontal motion으로 고정한다.

~~~text
speed       280 px/s
grounded    true
jump        disabled
attack      disabled
potion      disabled
climb       disabled
~~~

ON/OFF pair는 다음을 완전히 공유한다.

~~~text
brain seed
side
obstacle geometry
target beacon geometry
player trajectory
ground input
target visual input
sampling distance
~~~

유일한 차이는 obstacle LC4 cue ON/OFF다.

따라서 game-state는 sensory stimulus 생성과 진단 sample 위치 정렬에만 사용하며
어떤 게임 action도 선택하지 않는다.

## geometry

assay obstacle start distances:

~~~text
300 / 340 / 380 / 420 px
~~~

obstacle:

~~~text
width  38 px
height 54 px
~~~

target beacon은 obstacle far edge보다 160 px 멀리 둔다.

## sensory

ground + target beacon은 양 조건 동일하다.

Obstacle cue ON:

~~~text
LC4_side =
clamp((280 - front_distance) / 280 * 0.80, 0, 0.80)
~~~

Obstacle cue OFF:

~~~text
LC4 obstacle contribution = 0
~~~

기존 target encoder의 LC10a/LPLC1/LPLC2는 그대로 유지한다.

## baseline / feature

각 episode:

~~~text
SETTLE   26 steps visual OFF
BASELINE 26 steps visual OFF
~~~

그 뒤 scripted trajectory를 시작한다.

5-step DN window feature:

~~~text
feature_i =
clamp((current_dn_hz_i - baseline_dn_hz_i) / 50, -1, 1)
~~~

전체 1,316 DN을 사용한다.

## matched sample bins

각 episode에서 obstacle front distance가 처음 다음 threshold 이하가 된
5-step window를 각각 1개 채집한다.

~~~text
240 px
180 px
120 px
 60 px
~~~

ON/OFF pair는 동일 threshold sample을 가진다.

한 episode당 4 samples,
각 sample은 label `LC4_ON` 또는 `LC4_OFF`만 가진다.

## train schedule

train base seeds:

~~~text
601000 / 601100 / 601200 / 601300
~~~

각 base seed마다:

~~~text
4 distances × 2 sides × ON/OFF
= 16 episodes
= 64 feature samples
~~~

총:

~~~text
64 episodes
256 samples
128 ON / 128 OFF
~~~

## diagnostic readout

이 readout은 게임 action이 아니라 cue-presence 진단용 classifier다.

train-only mean/std로 standardize한 뒤
class-balanced logistic regression을 사용한다.

~~~text
epochs         120
learning rate  0.02
L2             0.0005
threshold      0.5
~~~

sample 순서는 seed 606000의 deterministic Fisher-Yates shuffle로 고정한다.

classifier에는 distance / side / geometry / seed를 넣지 않는다.
입력은 1,316 DN feature뿐이다.

## unseen evaluation

eval base seeds:

~~~text
611000 / 611100 / 611200
~~~

각 run:

~~~text
4 distances × 2 sides × ON/OFF
= 16 episodes
= 64 samples
~~~

3 runs 총 192 unseen samples.

## controls

### LABEL_SHUFFLED

train label만 seed 616000으로 고정 shuffle한 동일 classifier를 별도로 학습한다.
eval data와 feature는 동일하다.

### DN_PERMUTED

정상 classifier를 유지하고 eval feature의 DN identity를
run별 seed `evalBaseSeed + 900000` 고정 permutation으로 바꿔 평가한다.

## metrics

~~~text
FULL balanced accuracy
per-run FULL accuracy
LABEL_SHUFFLED accuracy
DN_PERMUTED accuracy
FULL - LABEL_SHUFFLED
FULL - DN_PERMUTED
mean paired ON/OFF L2 distance
~~~

paired L2는 같은 seed/side/distance/bin의 ON/OFF feature 차이다.

## 사전 PASS gate

~~~text
mean FULL balanced accuracy >= 80%
every FULL run             >= 70%
FULL - LABEL_SHUFFLED      >= 20 percentage points
~~~

DN_PERMUTED는 진단값으로 기록하지만 PASS 필수조건으로 두지 않는다.
LC4 cue가 identity-specific인지 global-rate 성분도 갖는지 해석에 사용한다.

paired L2에는 결과 전 임의 threshold를 두지 않는다.

## 결과 해석

PASS:
- obstacle LC4 cue는 DN state에서 unseen seed까지 선형 분리 가능한 흔적을 만든다.
- Phase A 실패의 우선 원인은 "cue가 DN에 전달되지 않음"이 아니다.
- 그 다음 Phase C에서 jump-spam을 깨는 reward/curriculum redesign을 새 seed로 preregister한다.

FAIL:
- reward를 바꾸기 전에 sensory encoding 자체를 재설계한다.
- action learner를 추가 실행하지 않는다.


Phase B seed/geometry 세부 규칙도 구현 전에 고정한다.

~~~text
distance는 episode 시작 시 player front -> obstacle near edge 거리
distanceIndex = 0..3
sideIndex: L=0, R=1
brain seed = baseSeed + distanceIndex * 2 + sideIndex
~~~

ON/OFF pair는 동일 brain seed를 공유한다.

각 5-step window에서 scripted player는 매 brain step마다
해당 side 방향으로 정확히 `280 * 0.02 = 5.6 px` 이동한다.
obstacle collision physics는 diagnostic trajectory에 적용하지 않는다.
이는 action policy가 없는 sensory isolation assay이기 때문이다.


## Phase B authoritative result

Run `35543660671`:

~~~text
FULL              85.4%
LABEL_SHUFFLED    45.8%
DN_PERMUTED       50.5%
paired L2          2.0167
GATE              PASS
~~~

따라서 Phase A FAIL의 1차 원인은 sensory separability 부족이 아니다.

다음 Phase C는 결과를 보기 전에 새 seed / reward / gate를 고정하고,
초기 tutorial에서 **episode당 실제 jump actuator budget을 1회**로 제한한다.

이 제약은 "언제 점프해야 하는지"를 trainer가 알려주는 것이 아니다.
정답 action/timing은 계속 제공하지 않으며,
단지 Phase A에서 확인된 반복 jump 전략을 action-space에서 제거하는
tutorial actuator constraint다.

Phase C가 PASS해도 이 single-jump budget 상태를 바로 browser에 배치하지 않는다.
후속 multi-jump/self-retry generalization을 별도로 통과해야 한다.


# Phase C — single-jump reward-only tutorial preregistration

Phase B에서 obstacle LC4 cue의 DN separability가 PASS했으므로
sensory encoder는 변경하지 않는다.

Phase C의 목적은 Phase A에서 관찰된 반복 jump 전략을 제거하고,
frozen MaleCNS DN state만으로 **첫 jump 시점**을 reward-only로 학습할 수 있는지 검증하는 것이다.

## invariant

다음은 Phase A와 동일하게 금지한다.

~~~text
obstacle distance
obstacle coordinate
player coordinate
jump arc
can-clear / should-jump flag
correct jump timing
episode cohort
~~~

policy input은 1,316 DN feature뿐이다.

## actuator constraint

episode당 실제 JUMP actuator budget:

~~~text
1
~~~

첫 실제 jump 이후 episode가 끝날 때까지
JUMP actuator는 unavailable 상태가 된다.

이후 decision boundary에서 policy가 JUMP를 선택해도
환경은 WAIT와 동일하게 처리한다.

trainer는 언제 budget을 써야 하는지 알려주지 않는다.

이 constraint는 Phase A의 반복-jump 퇴행 전략을 제거하기 위한 tutorial constraint이며,
Phase C PASS 후에도 그대로 browser에 배치하지 않는다.

## physics / sensory / windows

Phase A와 동일:

~~~text
gravity          1400 px/s^2
move speed        280 px/s
jump velocity     600 px/s
episode max       4.5 s
settle             26 steps
baseline           26 steps
movement window    26 steps
jump window         5 steps
~~~

obstacle visual LC4 encoder도 Phase B에서 PASS한 식을 그대로 사용한다.

## learner

linear SARSA(0), full 1,316 DN:

~~~text
learning rate 0.005
gamma         0.95
TD clamp      [-2, 2]
L2 decay      0.0001
~~~

epsilon:

~~~text
cohort 1  0.35
cohort 2  0.15
cohort 3  0.05
~~~

## reward

obstacle episode:

~~~text
clear terminal              +2.00
blocked 5-step window       -0.04
actual JUMP actuator        -0.20
timeout                     -1.00
~~~

NO_OBSTACLE:

~~~text
target reach terminal       +1.00
actual JUMP actuator        -0.20
timeout                     -0.50
~~~

reward는 실제 outcome과 실제 actuator cost만 사용한다.
"지금 JUMP가 정답" label은 없다.

## practice curriculum

새 base seeds:

~~~text
701000
711000
721000
~~~

각 cohort 96 episodes:

~~~text
48 obstacle
48 NO_OBSTACLE
~~~

obstacle / virtual-distance:

~~~text
145 / 185 / 225 / 265 px
~~~

schedule:

~~~text
obstacle:
6 blocks × 4 distances × 2 sides = 48

NO_OBSTACLE:
6 blocks × 4 virtual distances × 2 sides = 48
brain seed offset = +100

cohort deterministic shuffle seed = baseSeed + 5000
~~~

side 순서는 block + distanceIndex parity로 L/R를 교대한다.

## final unseen

새 final seeds:

~~~text
751000
761000
771000
~~~

final distances:

~~~text
155 / 195 / 235 / 275 px
~~~

각 run:

~~~text
32 obstacle episodes
16 NO_OBSTACLE episodes
~~~

paired obstacle conditions:

~~~text
FULL
VISUAL_OFF
DN_SHUFFLED
~~~

DN_SHUFFLED permutation seed:

~~~text
finalBaseSeed + 900000
~~~

NO_OBSTACLE seed offset:

~~~text
+7000
~~~

## metrics

~~~text
clear rate
timeout rate
actual jump rate
first jump step
first jump obstacle-front distance
blocked windows

NO_OBSTACLE target reach
NO_OBSTACLE any-jump rate
~~~

## Phase C gate

~~~text
mean FULL clear               >= 70%
every FULL run                >= 60%
FULL - VISUAL_OFF             >= 25 percentage points
FULL - DN_SHUFFLED            >= 20 percentage points
FULL timeout                  <= 25%
NO_OBSTACLE target reach      >= 85%
NO_OBSTACLE any-jump episodes <= 30%
~~~

gate는 결과 후 낮추지 않는다.

## PASS 이후

Phase C PASS는 single-jump tutorial의 성공일 뿐이다.

다음 Phase D에서:

~~~text
single-jump budget 제거
real 750 ms cooldown 복원
same learned policy 또는 frozen candidate
multi-jump / self-retry unseen generalization
~~~

을 별도 preregister하고 통과해야 browser deployment로 간다.

## FAIL 이후

gate를 낮추지 않는다.

우선 분석:

1. early-jump / late-jump 분포
2. FULL vs VISUAL_OFF first-jump timing 차이
3. NO_OBSTACLE false jump state 분포
4. SARSA value collapse / action prior


## Phase C authoritative result

Run `35544510915`:

~~~text
FULL clear        9.4%
VISUAL_OFF        0.0%
DN_SHUFFLED       0.0%
NO_OBS jump       0.0%
NO_OBS reach    100.0%
FULL timeout     90.6%
GATE              FAIL
~~~

Phase A의 jump-spam 문제는 해결됐지만,
single-jump policy가 useful timing을 찾지 못했다.

다음 작업은 새 learning run이 아니라 기존 artifact의
`firstJumpStep` / `firstJumpFrontDistance`를 추출하는
짧은 timing audit이다.

이 audit은 frozen artifact만 읽으며 MaleCNS를 다시 실행하지 않는다.


## Phase C timing audit conclusion

Run `35549956342`는 기존 v11C artifact를 읽는 분석-only CI였고 1분 미만에 완료됐다.

핵심:

~~~text
successful first jump distance median 118 px
failed first jump distance median     174 px
successful first jump step median      50
failed first jump step median          15
~~~

Phase C policy는 obstacle-specific JUMP 선택성은 만들었지만,
cue가 처음 강해지는 먼 구간에서 너무 빨리 single jump를 소비했다.

다음 Phase D는 state/action 정답을 teacher가 주지 않고,
**random one-jump babbling -> 실제 CLEAR/FAIL outcome**으로
jump-state DN feature를 직접 학습하는 outcome classifier로 전환한다.
