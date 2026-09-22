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


# Phase D — random one-jump outcome classifier preregistration

Phase C timing audit에서 successful first jump는 median 118 px,
failed first jump는 median 174 px였다.

Phase D는 이 진단값을 policy input이나 정답 label로 사용하지 않는다.

목표는:

~~~text
random one-jump babbling
-> actual CLEAR / FAIL outcome
-> jump-state MaleCNS DN feature classifier
~~~

로 credit assignment를 직접 단순화하는 것이다.

## anti-leak invariant

classifier input 금지:

~~~text
obstacle distance
obstacle coordinate
player coordinate
jump window index
jump arc
can-clear / should-jump
correct timing
episode cohort
side
seed
~~~

classifier input은 frozen MaleCNS DN feature만 사용한다.

CLEAR/FAIL label은 실제 physics outcome으로만 생성한다.

## sensory / physics / movement

Phase C와 동일:

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

obstacle LC4 encoder는 Phase B에서 PASS한 식 그대로다.
horizontal movement는 frozen v7 Skill01을 그대로 쓴다.

ATTACK / POTION / climbing은 비활성화한다.

## Phase D practice action generation

practice는 learned policy를 사용하지 않는다.

각 obstacle episode 시작 전에
state와 무관한 deterministic random jump decision window를 하나 뽑는다.

~~~text
jump decision window ∈ {1..12}
random source seed = brainSeed + 3000
~~~

해당 decision window에서 grounded이면 실제 JUMP actuator를 딱 1회 발동한다.

이 window 선택은 obstacle distance / DN state / game outcome을 보지 않는다.

그 실제 JUMP 직전 5-step DN feature 하나를 저장한다.

episode 종료 후:

~~~text
obstacle 완전 통과 -> label CLEAR = 1
그 외 timeout       -> label FAIL  = 0
~~~

WAIT state는 label하지 않는다.

## practice schedule

새 base seeds:

~~~text
801000
811000
821000
~~~

각 cohort:

~~~text
12 blocks × 4 distances × 2 sides
= 96 obstacle episodes
~~~

총:

~~~text
288 random one-jump attempts
~~~

practice distances:

~~~text
145 / 185 / 225 / 265 px
~~~

brain seed:

~~~text
baseSeed + block * 8 + distanceIndex * 2 + sideIndex
sideIndex: L=0, R=1
~~~

side 순서는 block + distanceIndex parity로 L/R 순서를 교대한다.

## practice support gate

classifier 학습 전 실제 outcome support:

~~~text
CLEAR samples >= 24
FAIL samples  >= 24
~~~

하나라도 부족하면 Phase D는 classifier를 억지로 만들지 않고 FAIL한다.

## feature selection

각 actual jump sample에서 full 1,316 DN current feature:

~~~text
clamp((current_dn_hz - baseline_dn_hz) / 50, -1, 1)
~~~

을 얻는다.

label을 보기 전에 전체 practice sample의 feature variance만 계산해
top 128 DN을 고른다.

즉 sparse feature selection은 **unlabeled variance-only**다.

그 128 feature를 practice-only mean/std로 standardize하고
standardized feature는 [-5, 5]로 clip한다.

## classifier

class-balanced logistic regression:

~~~text
features       128
epochs         300
learning rate  0.03
L2             0.001
threshold      0.5
~~~

CLEAR / FAIL class가 같은 총 weight를 갖도록 sample weight를 준다.

threshold는 결과를 본 뒤 조정하지 않는다.

## online evaluation policy

final에서는 random jump를 쓰지 않는다.

매 5-step DN window마다 classifier를 계산한다.

~~~text
P(CLEAR) >= 0.5 -> JUMP
P(CLEAR) <  0.5 -> WAIT
~~~

episode당 actual JUMP budget은 Phase C와 동일하게 1회다.

첫 actual JUMP 뒤에는 WAIT만 가능하다.

## unseen final

새 final seeds:

~~~text
851000
861000
871000
~~~

final distances:

~~~text
155 / 195 / 235 / 275 px
~~~

각 run obstacle schedule:

~~~text
4 blocks × 4 distances × 2 sides
= 32 episodes
~~~

paired conditions:

~~~text
FULL
VISUAL_OFF
DN_SHUFFLED
~~~

DN_SHUFFLED permutation:

~~~text
finalBaseSeed + 900000
~~~

NO_OBSTACLE:

~~~text
2 blocks × 4 virtual distances × 2 sides
= 16 episodes
brain seed offset +7000
~~~

## metrics

practice:

~~~text
CLEAR / FAIL counts
CLEAR rate
CLEAR jump feature timing distribution
FAIL jump feature timing distribution
selected 128 DN indices
~~~

final:

~~~text
FULL clear
VISUAL_OFF clear
DN_SHUFFLED clear
FULL timeout
actual jump rate
first jump step / front distance
NO_OBSTACLE target reach
NO_OBSTACLE any-jump
~~~

## Phase D gate

practice support gate를 먼저 통과해야 한다.

그 뒤 final gate:

~~~text
mean FULL clear               >= 70%
every FULL run                >= 60%
FULL - VISUAL_OFF             >= 25 percentage points
FULL - DN_SHUFFLED            >= 20 percentage points
FULL timeout                  <= 25%
NO_OBSTACLE target reach      >= 85%
NO_OBSTACLE any-jump episodes <= 30%
~~~

결과 후 gate/threshold를 낮추지 않는다.

## PASS 이후

Phase D PASS는 single-jump outcome classifier tutorial 성공이다.

그 다음 Phase E에서 새 unseen seed로:

~~~text
single-jump budget 제거
real 750 ms cooldown
self-retry / multiple obstacle interaction
~~~

을 검증해야 browser deployment로 이동한다.

## FAIL 이후

classifier threshold를 결과 보고 튜닝하지 않는다.

우선 확인:

1. practice CLEAR/FAIL support
2. practice CLEAR vs FAIL DN separability
3. online final에서 early false-positive가 다시 발생하는지
4. no-obstacle false-positive
5. sparse top128가 full feature signal을 잃었는지


## Phase D authoritative result

Run `35550206430`:

~~~text
practice support CLEAR 130 / FAIL 158 PASS

FULL         14.6%
VISUAL_OFF   53.1%
DN_SHUFFLED   0.0%
NO_OBS jump  39.6%
NO_OBS reach 100.0%
GATE          FAIL
~~~

Phase D classifier는 random practice의 CLEAR/FAIL support 부족으로 실패한 것이 아니다.

FULL이 VISUAL_OFF보다 크게 낮은 역전 결과 때문에,
다음 학습 phase 전에 기존 artifact만 읽는 timing audit으로
early first-positive preemption 여부를 확인한다.


## Phase D timing audit conclusion

Run `35587347745`:

~~~text
FULL first jump median         150 px
FULL successful median         118 px
FULL failed median             174 px

VISUAL_OFF first jump median     0 px
~~~

Phase D의 핵심 실패 모드는 early positive preemption으로 확정한다.

# Phase E — frozen classifier + 2-window persistence preregistration

Phase D의 learned classifier는 **재학습하지 않는다**.

Frozen source:

~~~text
source run      35550206430
source head     2c9daa3320d597e417217e5ccb2dcc2ffeb56953
source artifact 10618482118
source digest   sha256:3709991bed590ecfeea023a0229a27ce228deade0a830ff20db1ee53455ffd9e
selected DN     128
threshold       0.5
~~~

## change under test

매 5-step decision window마다 frozen classifier를 계산한다.

~~~text
P(CLEAR) >= 0.5 -> positive
P(CLEAR) <  0.5 -> negative
~~~

JUMP actuator는:

~~~text
positive가 2개 연속 window에서 관찰될 때만 1회 발동
negative가 나오면 streak = 0
~~~

으로 고정한다.

왜 2개인가:

Phase D timing audit에서 FULL median 150 px,
successful median 118 px였다.
한 decision window는 5 × 0.02 s = 0.1 s이고
수평 이동량은 약 28 px다.

따라서 1개 추가 positive confirmation은
관찰된 early-trigger gap과 같은 order의 지연이다.

이 결정은 Phase E 결과를 보기 전에 고정한다.

## anti-leak

persistence state에는 다음을 넣지 않는다.

~~~text
obstacle distance
coordinates
jump timing label
collision state
correct-action flag
side
seed
~~~

오직 직전 classifier threshold 결과의 연속 횟수만 저장한다.

## action constraint

Phase C/D와 동일하게 actual JUMP budget은 episode당 1회다.
Phase E PASS 후에만 multi-jump/self-retry generalization을 별도 검증한다.

## unseen final

새 final seeds:

~~~text
951000
961000
971000
~~~

distances:

~~~text
155 / 195 / 235 / 275 px
~~~

각 run:

~~~text
32 obstacle episodes:
FULL / VISUAL_OFF / DN_SHUFFLED

16 NO_OBSTACLE episodes
~~~

DN_SHUFFLED permutation:

~~~text
finalBaseSeed + 900000
~~~

## gate

Phase D와 동일:

~~~text
mean FULL clear               >= 70%
every FULL run                >= 60%
FULL - VISUAL_OFF             >= 25 percentage points
FULL - DN_SHUFFLED            >= 20 percentage points
FULL timeout                  <= 25%
NO_OBSTACLE target reach      >= 85%
NO_OBSTACLE any-jump episodes <= 30%
~~~

gate/threshold/persistence count는 결과 후 낮추거나 바꾸지 않는다.

## PASS 이후

다음 Phase F에서:

~~~text
single-jump budget 제거
real 750 ms cooldown 복원
self-retry / multi-obstacle generalization
browser exact-window equivalence
~~~

을 별도 preregister한다.

## FAIL 이후

먼저 확인:

1. FULL first-positive / first-jump timing
2. positive streak 길이 분포
3. NO_OBSTACLE false-positive streak
4. VISUAL_OFF delayed-trigger artifact
5. 필요 시 classifier 자체의 temporal-state representation 재설계


## Phase E authoritative result

Run 35596856019:

~~~text
FULL          86.5%
VISUAL_OFF     0.0%
DN_SHUFFLED    0.0%
NO_OBS jump    0.0%
NO_OBS reach 100.0%
timeout       13.5%
GATE           PASS
~~~

2-window persistence는 Phase D의 early-trigger preemption을 해결했다.

# Phase F — real cooldown + self-retry preregistration

Phase E policy를 frozen candidate로 고정한 뒤 single-jump tutorial 제약을 제거한다.

## frozen policy

~~~text
source Phase E run 35596856019
source classifier Phase D run 35550206430
selected DN 128
threshold 0.5
positive persistence 2 consecutive 5-step windows
~~~

classifier weight / bias / mean / scale / selected DN / threshold / persistence count는
Phase F 결과를 보고 변경하지 않는다.

## actuator

Phase F에서는 actualJumpBudget=1 제한을 제거한다.

실제 runtime과 같은 jump actuator 조건:

~~~text
grounded == true
jump cooldown == 0
~~~

실제 JUMP 성공 시:

~~~text
vy = -600
cooldown = 38 brain steps ~= 750 ms
positive streak = 0
~~~

cooldown/airborne 동안 classifier는 계속 관찰하지만 JUMP actuator는 실행되지 않는다.

다시 grounded + cooldown 0이 된 뒤
새로운 2-window positive streak가 만들어지면 self-retry가 가능하다.

## anti-leak

policy와 actuator에 다음을 넣지 않는다.

~~~text
obstacle distance
coordinates
correct timing
clearability
collision state를 이용한 action override
side
seed
~~~

collision/clear 상태는 outcome 측정과 episode terminal에만 사용한다.

## unseen final

새 seeds:

~~~text
1051000
1061000
1071000
~~~

distances:

~~~text
155 / 195 / 235 / 275 px
~~~

각 run:

~~~text
32 obstacle FULL
32 VISUAL_OFF
32 DN_SHUFFLED
16 NO_OBSTACLE
~~~

DN_SHUFFLED permutation은 finalBaseSeed + 900000.

## metrics

~~~text
clear rate
timeout rate
actual jumps / episode
first jump step / front distance
retry jump count
NO_OBSTACLE any-jump
NO_OBSTACLE reach
~~~

## Phase F gate

~~~text
mean FULL clear               >= 75%
every FULL run                >= 65%
FULL - VISUAL_OFF             >= 25 percentage points
FULL - DN_SHUFFLED            >= 20 percentage points
FULL timeout                  <= 20%
FULL mean actual jumps        <= 1.75
NO_OBSTACLE target reach      >= 85%
NO_OBSTACLE any-jump episodes <= 30%
~~~

gate는 결과 후 낮추지 않는다.

## PASS 이후

Phase F PASS 후에만 browser controller에 Skill03 JUMP candidate를 통합하고,
exact 5-step x 2 persistence 및 real 750 ms cooldown equivalence를 검증한다.

multi-obstacle generalization은 별도 Phase G에서 새 obstacle schedule로 검증한다.


## Phase F authoritative result

Run 35607509887:

~~~text
FULL          100.0%
VISUAL_OFF      0.0%
DN_SHUFFLED     0.0%
timeout         0.0%
actual jumps    1.198
retry jumps     0.198
NO_OBS jump     0.0%
NO_OBS reach  100.0%
GATE            PASS
~~~

Phase F PASS로 Skill03 JUMP는 headless runtime-level self-retry gate를 통과했다.

# Browser integration preregistration

다음 변경은 학습이 아니라 deployment equivalence다.

고정할 것:

~~~text
source Phase F run 35607509887
source artifact 10643127642
classifier source Phase D
threshold 0.5
positive persistence 2 x 5-step windows
cooldown 38 brain steps ~= 750 ms
selected DN 128
~~~

browser worker/controller에서도:

~~~text
settle 26
baseline 26
movement window 26
jump window 5
positive streak 2
cooldown 38
~~~

을 정확히 유지한다.

browser JUMP policy에는 obstacle distance/coordinate/collision/target geometry를 전달하지 않는다.

deployment equivalence PASS 조건:

~~~text
authoritative headless unseen seeds를 browser bundle implementation으로 replay
FULL clear = 100%
VISUAL_OFF = 0%
DN_SHUFFLED = 0%
NO_OBSTACLE jump = 0%
mean actual jumps = 1.198과 exact episode aggregate 일치
~~~

부동소수점 점수 자체보다 action/outcome trajectory equivalence를 우선 검증한다.

browser equivalence PASS 전에는 README에 JUMP deployed라고 표기하지 않는다.


# Cross-skill sensory coexistence preregistration

v10F ATTACK과 v11F JUMP는 실제 browser runtime에서 같은 MaleCNS를 공유한다.

중요한 차이:

~~~text
v10F target encoder:
  LC10a / LPLC1 / LPLC2
  + target distance < 175 px일 때 LC4

v11F obstacle encoder:
  obstacle front distance < 280 px에서 LC4
~~~

따라서 browser deployment 완료 전,
target LC4와 obstacle LC4가 동시에 존재하는 실제 runtime sensory composition을
새 unseen seed에서 검증한다.

## frozen components

~~~text
MaleCNS commit
95a3dbcb05241b0a5c07028ca8ad945b23fbbe6e

movement
v7 frozen

JUMP
source run 35607509887
browser equivalence run 35610126652
threshold 0.5
persistence 2 x 5-step windows
cooldown 38 brain steps
selected DN 128
~~~

v11 JUMP weight / bias / mean / scale / selected DN / threshold / persistence / cooldown은 변경하지 않는다.

## combined encoder

target cue는 v10F와 동일:

~~~text
LC10a
LPLC1
LPLC2

if targetDistance < 175:
  LC4_target =
    clamp(((175-distance)/175)*0.72 + approaching*0.18, 0, 0.8)
~~~

obstacle cue는 v11F와 동일:

~~~text
LC4_obstacle =
  clamp(((280-max(0,frontDistance))/280)*0.8, 0, 0.8)
~~~

동일 side에서 둘 다 존재하면:

~~~text
LC4_side = max(LC4_target, LC4_obstacle)
~~~

으로 고정한다. 합산으로 cue 크기를 인위적으로 증폭하지 않는다.

## unseen seeds

~~~text
1151000
1161000
1171000
~~~

distances:

~~~text
155 / 195 / 235 / 275 px
~~~

각 run:

~~~text
32 FULL_COMBINED
32 OBSTACLE_CUE_OFF
32 DN_SHUFFLED
16 NO_OBSTACLE_TARGET_ONLY
~~~

OBSTACLE_CUE_OFF에서는 target cue 전체와 target LC4는 유지하고
obstacle LC4만 제거한다.

NO_OBSTACLE_TARGET_ONLY에서도 v10F target LC4를 포함한다.
즉 target LC4가 JUMP false-positive를 일으키는지 직접 본다.

## frozen gate

~~~text
mean FULL_COMBINED clear           >= 75%
every FULL_COMBINED run            >= 65%
FULL - OBSTACLE_CUE_OFF            >= 25 percentage points
FULL - DN_SHUFFLED                 >= 20 percentage points
FULL timeout                       <= 20%
FULL mean actual jumps             <= 1.75
NO_OBSTACLE target reach           >= 85%
NO_OBSTACLE any-jump episodes      <= 30%
~~~

gate는 결과 후 낮추지 않는다.

## interpretation

PASS:
target LC4와 obstacle LC4가 같은 MaleCNS에 공존해도
v11F JUMP의 obstacle-specific behavior가 유지된다.

FAIL:
browser deployed 표기를 하지 않는다.
먼저 target-only false jump인지, obstacle cue masking인지,
DN identity interaction인지 분석한다.
ATTACK/JUMP 중 어느 쪽이든 결과를 보고 cue를 임의 변경하지 않는다.


## Cross-skill LC4 result and next diagnostic

Run 35627450424는 scientific FAIL.

핵심:

~~~text
combined obstacle + target:
  FULL clear 100%

target only, no obstacle:
  JUMP false-positive 68.8%
~~~

즉 shared LC4 channel에서 target cue가 JUMP를 자극한다.

# Target-LC4 ablation for frozen v10F ATTACK — preregistration

목적:

v10F ATTACK이 target LC4 없이도 기존 frozen gate를 유지하는지 확인한다.

변경점은 sensory encoder 하나뿐이다.

기존 v10F target cue:

~~~text
LC10a
LPLC1
LPLC2
LC4 when distance < 175
~~~

ablation:

~~~text
LC10a unchanged
LPLC1 unchanged
LPLC2 unchanged
target LC4 = 0
~~~

다음은 전부 frozen:

~~~text
v10F weights / bias
selected DN 128
threshold 0.5
movement v7
attack window 5
settle 26
baseline 26
attack cooldown 420 ms
final seeds 401000 / 411000 / 421000
final distances 185 / 285 / 385 / 485
~~~

기존 v10F deployment gate를 그대로 사용한다.

~~~text
movement reach                >= 85%
mean FULL hit                 >= 70%
FULL - NEURAL_OFF             >= 25pp
FULL - DN_SHUFFLED            >= 20pp
whiff                         <= 30%
timeout                       <= 25%
each FULL run                 >= 60%
~~~

판정:

PASS:
target LC4를 shared runtime에서 제거하고
LC4를 obstacle JUMP cue 전용으로 사용한 뒤
새 unseen cross-skill validation을 다시 수행한다.

FAIL:
target LC4를 임의 제거하지 않는다.
ATTACK 또는 JUMP sensory representation을 별도 학습 phase에서 재설계한다.

결과를 보고 gate/threshold를 변경하지 않는다.


# Phase G0 — alternate looming channel screen preregistration

Cross-skill LC4 coexistence FAIL과 target-LC4 ablation FAIL 때문에
기존 ATTACK sensory contract를 유지하면서 JUMP obstacle cue만 다른 biological visual channel로 분리한다.

후보:

~~~text
LC6
LC16
~~~

선정 근거:

- 두 타입 모두 Drosophila visual projection neuron 계열의 looming / avoidance 반응이 보고되어 있다.
- 현재 v10F ATTACK encoder가 사용하는 LC4 / LPLC1 / LPLC2 / LC10a와 겹치지 않는다.
- LC16은 looming visual threat에서 backward escape/retreat 회로와 연결된 보고가 있다.

이 단계는 action learning이 아니라 frozen MaleCNS sensory separability screen이다.

## shared target sensory

모든 조건에서 v10F target encoder는 그대로 유지한다.

~~~text
LC10a
LPLC1
LPLC2
target LC4 (<175 px)
~~~

즉 후보 obstacle channel이 실제 ATTACK sensory와 공존하는 상태에서만 평가한다.

## candidate obstacle cue

geometry는 기존 v11과 동일:

~~~text
obstacle width  38
obstacle height 54
visual radius   280 px
drive =
  clamp(((280-max(0,frontDistance))/280)*0.8, 0, 0.8)
~~~

단 obstacle cue의 입력 population만:

~~~text
LC6_side
또는
LC16_side
~~~

으로 바꾼다.

## train / eval seeds

train:

~~~text
1201000
1201100
1201200
1201300
~~~

eval:

~~~text
1211000
1211100
1211200
~~~

distances:

~~~text
300 / 340 / 380 / 420
~~~

sample front-distance bins:

~~~text
240 / 180 / 120 / 60
~~~

settle 26 / baseline 26 / sample window 5.

## diagnostic classifier

input:

~~~text
1316-DN activity only
feature = clamp((currentHz-baselineHz)/50,-1,1)
~~~

geometry / side / seed / channel label은 model input에 넣지 않는다.

각 candidate별:

~~~text
logistic regression
epochs 120
LR 0.02
L2 0.0005
threshold 0.5
~~~

controls:

~~~text
LABEL_SHUFFLED
DN_PERMUTED
paired ON/OFF L2
~~~

## candidate gate

각 후보는 모두 만족해야 PASS:

~~~text
mean FULL balanced accuracy      >= 80%
every eval run FULL              >= 70%
FULL - LABEL_SHUFFLED            >= 20pp
FULL - DN_PERMUTED               >= 20pp
~~~

## selection rule

1. PASS 후보가 하나면 그 후보 선택.
2. 둘 다 PASS면 mean FULL balanced accuracy가 높은 후보 선택.
3. 두 후보 차이가 <= 2pp이면 LC16 선택.
4. 둘 다 FAIL이면 새 JUMP action learning으로 진행하지 않는다.

이 selection rule은 결과 전에 고정한다.

## PASS 이후

선택된 channel을 사용해 JUMP policy를 처음부터 다시 학습한다.
기존 v11F LC4 JUMP weights를 재사용하지 않는다.

새 JUMP 학습은 target LC4가 항상 존재하는 shared sensory environment에서 진행하고,
target-only no-obstacle false JUMP gate를 반드시 포함한다.


## Phase G0 authoritative result

Run 35630336587:

~~~text
LC6  FULL 58.3%  gate FAIL
LC16 FULL 56.8%  gate FAIL
selected NONE
~~~

다음 action learning 전,
shared LC4 자체가 target-vs-obstacle context에서 DN 수준으로 구분 가능한지 진단한다.

# Phase G1 — shared-LC4 source-context separability preregistration

목적:

같은 LC4 population을 사용하더라도
전체 MaleCNS DN state가 다음 두 시각 context를 구분할 수 있는지 확인한다.

Class A — OBSTACLE:

~~~text
38x54 obstacle
target = obstacle far edge + 160 px
v10F target sensory 유지
obstacle LC4 유지
~~~

Class B — TARGET_ONLY:

~~~text
obstacle 없음
가까운 target 자체가 LC4를 발생
v10F target sensory 그대로
~~~

이것은 action learning이 아닌 sensory representation diagnostic이다.

## input

classifier input:

~~~text
1316-DN activity only
feature = clamp((currentHz-baselineHz)/50,-1,1)
~~~

금지 input:

~~~text
class identity
distance
coordinates
side
seed
obstacle flag
target flag
~~~

## sampling

context source distance bins:

~~~text
150 / 120 / 90 / 60 px
~~~

OBSTACLE class에서는 obstacle front distance 기준.
TARGET_ONLY class에서는 target center distance 기준.

settle 26 / baseline 26 / sample window 5.

train seeds:

~~~text
1301000
1301100
1301200
1301300
~~~

eval seeds:

~~~text
1311000
1311100
1311200
~~~

## classifier

~~~text
linear logistic regression
epochs 120
LR 0.02
L2 0.0005
threshold 0.5
~~~

controls:

~~~text
LABEL_SHUFFLED
DN_PERMUTED
~~~

## frozen gate

~~~text
mean FULL balanced accuracy   >= 85%
every eval run FULL           >= 75%
FULL - LABEL_SHUFFLED         >= 25pp
FULL - DN_PERMUTED            >= 25pp
~~~

결과 후 gate를 낮추지 않는다.

## interpretation

PASS:
shared LC4라도 target-vs-obstacle context가 DN 수준에서 충분히 분리 가능하다.
다음 단계에서 direct state label 없이 reward-only mixed-context JUMP learner를 설계한다.

FAIL:
현재 sensory representation 자체가 policy가 구분하기에 불충분하다고 본다.
기존 JUMP weights를 억지 보정하지 않고 sensory architecture를 더 크게 재설계한다.


# Phase G2 — temporal DN context separability preregistration

G1에서 single-window 1316-DN state만으로는
OBSTACLE과 TARGET_ONLY context 분리가 충분하지 않았다.

G2는 sensory encoder를 바꾸지 않는다.
v10F target sensory와 shared LC4 composition을 그대로 유지하고,
classifier 입력 표현만 short temporal DN history로 확장한다.

## sensory

~~~text
target:
  LC10a
  LPLC1
  LPLC2
  target LC4 when target distance < 175 px

obstacle:
  same-side LC4
  LC4_side = max(target LC4, obstacle LC4)
~~~

obstacle geometry:

~~~text
width  38
height 54
visual radius 280 px
~~~

## temporal representation

각 decision sample은 최근 4개 연속 5-step window를 사용한다.

~~~text
window 1: t-0.4 ~ t-0.3 s
window 2: t-0.3 ~ t-0.2 s
window 3: t-0.2 ~ t-0.1 s
window 4: t-0.1 ~ t     s
~~~

각 window마다 1316-DN feature:

~~~text
clamp((currentHz-baselineHz)/50,-1,1)
~~~

classifier input은 4 x 1316 = 5264 차원 temporal feature를 단순 concatenate한다.

정답 누설 금지:

~~~text
context label
distance
coordinates
side
seed
obstacle flag
target flag
sample bin
~~~

은 model input에 넣지 않는다.

## contexts

Class A — OBSTACLE:

~~~text
38x54 obstacle 존재
target은 obstacle 바깥 160 px
target sensory + obstacle LC4 모두 존재
~~~

Class B — TARGET_ONLY:

~~~text
obstacle 없음
target sensory만 존재
target이 175 px 안으로 들어오면 target LC4 발생
~~~

## sampling

source-distance bins:

~~~text
150 / 120 / 90 / 60 px
~~~

OBSTACLE은 obstacle front distance,
TARGET_ONLY는 target center distance 기준이다.

각 bin을 끝내는 현재 window와 직전 3개 window를 temporal sample로 묶는다.

settle 26 / baseline 26 / sample window 5.

train seeds:

~~~text
1401000
1401100
1401200
1401300
~~~

eval seeds:

~~~text
1411000
1411100
1411200
~~~

start distances:

~~~text
260 / 300 / 340 / 380 px
~~~

## classifier

~~~text
linear logistic regression
epochs 120
LR 0.02
L2 0.0005
threshold 0.5
~~~

controls:

~~~text
LABEL_SHUFFLED
DN_PERMUTED
TEMPORAL_ORDER_SHUFFLED
~~~

DN_PERMUTED는 모든 4개 temporal window에 같은 DN permutation을 적용한다.
TEMPORAL_ORDER_SHUFFLED는 각 sample의 4개 window 순서만 고정 permutation으로 뒤섞는다.

## frozen gate

~~~text
mean FULL balanced accuracy       >= 85%
every eval run FULL               >= 75%
FULL - LABEL_SHUFFLED             >= 25pp
FULL - DN_PERMUTED                >= 25pp
FULL - TEMPORAL_ORDER_SHUFFLED    >= 15pp
~~~

결과 후 gate를 낮추지 않는다.

## interpretation

PASS:
instantaneous DN state는 부족했지만 short temporal trajectory에는
OBSTACLE과 TARGET_ONLY를 구분할 수 있는 정보가 존재한다.
다음 Phase G3에서 이 temporal DN representation을 사용해
mixed-context reward-only JUMP policy를 처음부터 새로 학습한다.

FAIL:
현재 shared LC4 sensory architecture에서는
짧은 시간축까지 포함해도 context 분리가 불충분하다.
기존 v11F JUMP weights를 보정하거나 threshold를 조절하지 않고
sensory architecture를 더 크게 재설계한다.


# Phase G2B — short-history representation screen preregistration

목적:

G2에서 4-window CONCAT은 높은 separability를 보였지만
window 순서 자체는 중요하지 않았다.

새 unseen seed의 동일한 sample history에서 다음 4개 representation을 동시에 비교한다.

~~~text
CURRENT:
  마지막 5-step window의 1316-DN feature

MEAN4:
  최근 4개 window의 DN별 평균
  1316 dimensions

DELTA:
  마지막 window - 첫 window
  1316 dimensions

CONCAT4:
  최근 4개 window concatenate
  5264 dimensions
~~~

모든 representation은 동일 episode / 동일 brain seed / 동일 sample bin을 사용한다.

## sensory

G2와 완전히 동일한 shared-LC4 sensory:

~~~text
target:
  LC10a + LPLC1 + LPLC2
  target LC4 when target distance < 175 px

obstacle:
  same-side LC4

LC4_side = max(target LC4, obstacle LC4)
~~~

## train / eval

train seeds:

~~~text
1501000
1501100
1501200
1501300
~~~

eval seeds:

~~~text
1511000
1511100
1511200
~~~

start distances:

~~~text
260 / 300 / 340 / 380 px
~~~

sample bins:

~~~text
150 / 120 / 90 / 60 px
~~~

settle 26 / baseline 26 / sample 5 / history 4 windows.

## classifier

각 representation마다 독립 linear logistic regression:

~~~text
epochs 120
LR 0.02
L2 0.0005
threshold 0.5
~~~

각 representation control:

~~~text
LABEL_SHUFFLED
DN_PERMUTED
~~~

## representation PASS gate

각 후보는 모두 만족해야 PASS:

~~~text
mean FULL balanced accuracy      >= 85%
every eval run FULL              >= 75%
FULL - LABEL_SHUFFLED            >= 25pp
FULL - DN_PERMUTED               >= 25pp
~~~

## history-value gate

history representation(MEAN4 / DELTA / CONCAT4)을 선택하려면 추가로:

~~~text
selected mean FULL - CURRENT mean FULL >= 15pp
~~~

이어야 한다.

## selection rule

1. CURRENT가 단독 PASS여도 history-value gate가 없으므로 G3 근거로 사용하지 않는다.
2. PASS한 history representation 중 mean FULL이 가장 높은 것을 선택한다.
3. 최고 두 후보 차이가 <= 2pp이면 차원이 작은 후보를 선택한다:
   DELTA 또는 MEAN4(1316) > CONCAT4(5264).
4. history PASS 후보가 없거나 CURRENT 대비 +15pp가 없으면 G2B FAIL.

이 rule은 결과 전에 고정한다.

## anti-leak

model input 금지:

~~~text
context label
distance
coordinates
side
seed
obstacle flag
target flag
sample bin
~~~

## PASS 이후

선택 representation으로 mixed-context reward-only JUMP learner Phase G3를 설계한다.
기존 v11F LC4 JUMP weights는 재사용하지 않는다.


# Phase G3 — mixed-context reward-only JUMP learning preregistration

G2B PASS에 따라 policy input representation은 CONCAT4로 고정한다.

중요:

G2/G2B의 context classifier weights는 절대 policy에 복사하지 않는다.
G3는 action/outcome babbling으로 처음부터 새 policy를 학습한다.

## frozen sensory and brain

~~~text
MaleCNS:
  alexitonis/fly.ai
  95a3dbcb05241b0a5c07028ca8ad945b23fbbe6e

movement:
  frozen v7

target sensory:
  LC10a
  LPLC1
  LPLC2
  target LC4 when distance < 175 px

obstacle sensory:
  same-side LC4
  radius 280 px

shared LC4:
  max(target LC4, obstacle LC4)
~~~

## policy input

최근 4개 연속 5-step DN window:

~~~text
window feature:
  clamp((currentHz-baselineHz)/50,-1,1)

policy feature:
  CONCAT4
  4 x 1316 = 5264 dimensions
  history = 0.4 seconds
~~~

policy input 금지:

~~~text
context identity
obstacle flag
target flag
distance
coordinates
collision state
clearability
correct timing
side
seed
sample bin
reward before action
~~~

## practice curriculum

3 cohorts:

~~~text
1601000
1611000
1621000
~~~

각 cohort 96 episodes.

각 cohort는:

~~~text
48 OBSTACLE
48 TARGET_ONLY
~~~

를 포함하며 ordering은 fixed seeded shuffle로 섞는다.

source start distances:

~~~text
155 / 195 / 235 / 275 px
~~~

각 episode의 intervention window:

~~~text
uniform integer 1..10
~~~

각 episode의 intervention action:

~~~text
WAIT or JUMP
50/50 seeded random
~~~

intervention window와 action은 sensory state와 context를 읽지 않고 미리 결정한다.

한 episode에는 intervention action을 한 번만 허용한다.
JUMP intervention은 grounded/cooldown available일 때만 실제 actuation된다.
그 뒤 추가 JUMP teacher action은 없다.

## reward / desirable outcome

trainer는 game outcome과 action cost만 사용한다.

OBSTACLE:

~~~text
CLEAR   reward +1
TIMEOUT reward -1
~~~

TARGET_ONLY:

~~~text
TARGET reached +1
actual JUMP cost -1
timeout -1
~~~

binary desirable label:

~~~text
reward > 0
~~~

즉:

- obstacle에서 실제로 넘은 JUMP는 positive가 될 수 있다.
- obstacle WAIT 또는 잘못된 JUMP는 실제 outcome에 따라 negative.
- target-only WAIT + reach는 positive.
- target-only unnecessary JUMP는 reward 0 이하이므로 negative.

context identity는 reward 계산에만 사용하며 policy feature에는 들어가지 않는다.

## feature reduction

practice CONCAT4 5264 feature에서 label/action/reward를 보지 않고
unlabeled variance 상위 256 feature만 선택한다.

선택된 slot은 frozen한다.

각 slot은:

~~~text
temporal window index
DN relative index
~~~

만 의미한다.

## action-value learners

WAIT와 JUMP 각각 독립 class-balanced logistic model:

~~~text
P(desirable | feature, WAIT)
P(desirable | feature, JUMP)
~~~

standardization은 practice data만 사용.

~~~text
epochs 300
LR 0.03
L2 0.001
threshold 0.5
~~~

practice support gate:

~~~text
WAIT positive >= 24
WAIT negative >= 24
JUMP positive >= 12
JUMP negative >= 24
~~~

support 미달이면 scientific FAIL이며 post-result resampling/tuning하지 않는다.

## deployment decision rule

available state에서:

~~~text
jumpCandidate =
  P_JUMP >= 0.5
  AND P_JUMP > P_WAIT
~~~

JUMP는 jumpCandidate가 2개 연속 5-step decision에서 유지될 때만 actuation.

~~~text
positive persistence = 2
real cooldown = 38 brain steps ~= 750 ms
airborne/cooldown unavailable:
  probabilities may be observed
  positive streak resets to 0
after actual JUMP:
  positive streak resets to 0
~~~

그 외 WAIT.

## final unseen evaluation

seeds:

~~~text
1651000
1661000
1671000
~~~

각 run:

~~~text
32 OBSTACLE FULL
32 OBSTACLE_CUE_OFF
32 DN_SHUFFLED
16 TARGET_ONLY
~~~

distances:

~~~text
155 / 195 / 235 / 275 px
~~~

OBSTACLE_CUE_OFF:
target sensory와 target LC4는 유지하고 obstacle LC4만 제거한다.

DN_SHUFFLED:
policy input의 selected temporal-DN identity를 fixed permutation한다.

TARGET_ONLY:
shared target sensory는 그대로이며 obstacle은 없다.

## frozen final gate

~~~text
mean OBSTACLE FULL clear       >= 75%
every FULL run                 >= 65%
FULL - OBSTACLE_CUE_OFF        >= 25pp
FULL - DN_SHUFFLED             >= 20pp
FULL timeout                   <= 20%
FULL mean actual jumps         <= 1.75

TARGET_ONLY reach              >= 85%
TARGET_ONLY any-jump episodes  <= 30%
~~~

gate는 결과 후 낮추지 않는다.

## PASS 이후

G3 PASS 후에만:

1. learned mixed-context JUMP candidate를 freeze
2. browser bundle equivalence
3. v7 movement regression
4. v10F ATTACK regression
5. combined browser deployment

순서로 진행한다.


## Phase G3 preregistration amendment — before implementation/run

G3를 실제 실행하기 전 temporal-history warmup과 TARGET_ONLY terminal timing을 검토해
geometry를 다음처럼 명시한다.

이 amendment는 G3 결과를 보기 전에 고정한다.

OBSTACLE:

~~~text
startDistance = obstacle front distance
155 / 195 / 235 / 275 px
target = obstacle far edge + 160 px
~~~

TARGET_ONLY:

~~~text
obstacle 없음
target center start distance =
  startDistance + obstacleWidth + 160
= startDistance + 198 px
~~~

즉 TARGET_ONLY 실제 초기 target distance는:

~~~text
353 / 393 / 433 / 473 px
~~~

이다.

이 geometry는 기존 v11F no-obstacle evaluation contract와 동일하며,
CONCAT4 history 4 windows가 준비되기 전에 target terminal이 발생하는 문제를 피한다.

random intervention window는 history가 준비된 첫 policy decision을 1로 세어:

~~~text
uniform integer 1..14
~~~

로 고정한다.

intervention window/action은 여전히 episode context나 sensory state를 읽지 않고
episode 시작 전에 seeded random으로 결정한다.

나머지 G3 preregistration, reward, feature selection, support gate,
policy rule, final seeds와 final gate는 변경하지 않는다.
