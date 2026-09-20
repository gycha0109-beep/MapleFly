# result_v10 — Fly #001 Skill 02 / ATTACK timing 학습

## 현재 결론

v10은 세 단계로 진행했다.

~~~text
Phase A
temporal REINFORCE
-> WAIT collapse
-> FAIL

Phase B
temporal Q-learning + curriculum
-> movement는 성공
-> attack은 seed 불안정
-> FAIL

Phase C
current DN + outcome-only motor babbling
-> full confirmation PASS
~~~

현재 상태:

~~~text
Skill 01 LEFT / RIGHT
DEPLOYED

Skill 02 ATTACK timing
TRAINING PASS
DEPLOYMENT VALIDATION 진행
~~~

즉 아직 browser runtime에 Skill 02를 합치지는 않는다.

## Phase C full confirmation

GitHub Actions:

~~~text
run      35465429673
commit   5e1f5a85528039af4b6b6bdd2b894fc37eace610
artifact 10590739330

digest
sha256:552b71415945f82cddcbfe38c1397ea1c7a4eb8a5140708dbe26eb9cc2c92e51
~~~

설정:

~~~text
3 independent runs
96 practice episodes / run
32 held-out eval episodes / condition / run
~~~

학습기는 target distance / 좌표 / attack range / hittable 여부를 입력받지 않았다.

practice 중 random ATTACK probe를 실제로 수행하고
HIT / WHIFF 결과만 학습했다.

WAIT state에는 정답 label을 붙이지 않았다.

### 독립 run

~~~text
Run 1
MOVEMENT_ONLY reach 100.0%
FULL hit            87.5%
NEURAL_OFF hit       0.0%
whiff               12.5%

Run 2
MOVEMENT_ONLY reach 100.0%
FULL hit            75.0%
NEURAL_OFF hit       0.0%
whiff               25.0%

Run 3
MOVEMENT_ONLY reach 100.0%
FULL hit            65.6%
NEURAL_OFF hit       0.0%
whiff               34.4%
~~~

평균:

~~~text
movement reach  100.0%

FULL hit          76.0%
NEURAL_OFF         0.0%
difference        +76.0%p

whiff              24.0%
timeout              0.0%
~~~

사전 gate:

~~~text
movement reach >= 85%
FULL hit       >= 70%
FULL-OFF       >= 25%p
whiff          <= 30%
timeout        <= 25%
모든 run FULL  >= 60%
~~~

판정:

~~~text
V10C-GATE
PASS
~~~

Run 3은 평균보다 약했지만 65.6%로
사전에 정한 per-run 60% floor를 넘었다.

## 해석

Phase B 평균 FULL hit 22.9%에서
Phase C full confirmation 76.0%까지 올라왔다.

핵심 구조는:

~~~text
현재 DN state
+ 실제 ATTACK outcome
+ random motor babbling
~~~

이다.

현재 결과는:

> Fly #001이 접근 중 만들어지는 full MaleCNS DN state와
> 실제 공격 HIT/WHIFF 경험 사이의 관계를 학습한 readout이
> held-out 접근 상황에서 공격 타이밍을 고를 수 있음을 보여준다.

다만 full MaleCNS 내부 synapse가 학습한 것은 아니다.
학습된 것은 connectome 위 ATTACK readout이다.

## deployment candidate

full confirmation에서 가장 좋은 Run 1 classifier를 고정 candidate로 사용한다.

~~~text
source run       35465429673
source run index 1
DN contract      1,316
selected DN      128
threshold        0.5
~~~

selected DN은 label을 보지 않고
practice sample variance 상위 128개로 선택됐다.

별도 deployment gate에서는:

~~~text
새 seed
새 start distance
NEURAL_OFF
DN_SHUFFLED
~~~

를 사용한다.

사전 deployment gate:

~~~text
MOVEMENT_ONLY reach >= 85%
FULL hit            >= 70%
FULL - NEURAL_OFF   >= 25%p
FULL - DN_SHUFFLED  >= 20%p
FULL whiff          <= 30%
FULL timeout        <= 25%
각 run FULL hit     >= 60%
~~~

이 gate를 통과한 뒤에만
Fly #001 Skill 02를 실제 browser runtime에 합친다.


---

## 첫 deployment gate 결과

GitHub Actions:

~~~text
run      35502791050
commit   fc71164d4a825af15a2523ff3884c165ae931b29
artifact 10603305959
~~~

결과:

~~~text
Run 1 FULL 90.6%
Run 2 FULL 56.3%
Run 3 FULL 65.6%

mean FULL        70.8%
NEURAL_OFF        0.0%
DN_SHUFFLED      17.7%
whiff            29.2%
timeout            0.0%
movement reach  100.0%
~~~

평균 성능은 높았지만
Run 2가 사전 per-run floor 60%를 넘지 못했다.

~~~text
V10C-DEPLOY-GATE
FAIL
~~~

따라서 Skill 02는 아직 browser에 승격하지 않는다.

다음은 candidate를 교체하거나 gate를 낮추는 대신,
같은 Fly #001 classifier가 새로운 seed cohort에서
추가 outcome-only practice를 수행하는 Phase D다.


---

## Phase D continued practice 결과 — 추가 경험은 weight를 바꿨지만 seed 안정성 개선 실패

GitHub Actions:

~~~text
run      35509172541
head     22321d9c74a27b006322846ed723ec98d4549559
artifact 10604434886

digest
sha256:45a09ba81b28419d945d7e114638cf89d615390f2b6cd74a1230107425f29028

receipt commit
4ff48ba66a0d8b80193c2ab9b6a804f7e3b13c6a
~~~

workflow 자체는:

~~~text
completed / success
~~~

였다.

이는 실험 코드가 정상 실행되고 artifact / receipt가 생성됐다는 뜻이다.
실험 판정은 별도로 아래와 같이 FAIL이다.

### 실제 practice

사전 등록한 세 cohort를 그대로 사용했다.

~~~text
Cohort 1
seed     71000
episodes 64
probes   456
HIT      156
WHIFF    300
reach    100.0%
updates   59

Cohort 2
seed     81000
episodes 64
probes   466
HIT      152
WHIFF    314
reach    100.0%
updates   64

Cohort 3
seed     91000
episodes 64
probes   453
HIT      147
WHIFF    306
reach    100.0%
updates   64
~~~

누적:

~~~text
practice episodes 192
HIT samples       455
WHIFF samples     920
SGD updates       187
~~~

target distance / coordinates / attack range / hittable /
correct timing은 classifier input에 넣지 않았다.

### 같은 unseen final cohort에서 BEFORE / AFTER 비교

final seed:

~~~text
121000
131000
141000
~~~

final distance:

~~~text
165 / 265 / 365 / 455 px
~~~

각 run은 BEFORE / AFTER가 같은 MaleCNS trajectory를 공유했다.

결과:

~~~text
Run 1
BEFORE FULL      50.0%
AFTER FULL       43.8%
AFTER OFF         0.0%
AFTER SHUFFLED    3.1%

Run 2
BEFORE FULL      84.4%
AFTER FULL       87.5%
AFTER OFF         0.0%
AFTER SHUFFLED   40.6%

Run 3
BEFORE FULL      62.5%
AFTER FULL       65.6%
AFTER OFF         0.0%
AFTER SHUFFLED   12.5%
~~~

평균:

~~~text
                       BEFORE    AFTER
movement reach          100.0%   100.0%
FULL hit                 65.6%    65.6%
NEURAL_OFF                0.0%     0.0%
DN_SHUFFLED              25.0%    18.8%
FULL whiff               34.4%    34.4%
FULL timeout              0.0%     0.0%
neuron identity contrib  40.6%p   46.9%p
~~~

변화:

~~~text
FULL hit delta                  0.0%p
whiff delta                     0.0%p
neuron identity contribution   +6.3%p
~~~

### weight 변화

continued practice가 실제 classifier를 바꿨는지도 확인했다.

~~~text
L2 delta from original       0.341518
bias delta                  +0.008085
sign flip count             12
mean absolute weight delta   0.024471
max absolute weight delta    0.089625
~~~

따라서 AFTER와 BEFORE가 사실상 동일한 classifier였던 것은 아니다.

추가 경험은 readout을 실제로 변경했고
DN identity에 대한 의존성도 더 커졌다.

하지만 이 변화가 실제 deployment hit rate 개선으로 이어지지 않았다.

### 사전 deployment gate 판정

gate:

~~~text
MOVEMENT_ONLY reach >= 85%
FULL hit            >= 70%
FULL - NEURAL_OFF   >= 25%p
FULL - DN_SHUFFLED  >= 20%p
FULL whiff          <= 30%
FULL timeout        <= 25%
각 run FULL hit     >= 60%
~~~

AFTER:

~~~text
movement reach          100.0%  PASS
FULL hit                  65.6%  FAIL
FULL - NEURAL_OFF        +65.6%p PASS
FULL - DN_SHUFFLED       +46.9%p PASS
FULL whiff                34.4%  FAIL
FULL timeout               0.0%  PASS
Run 1 FULL                43.8%  FAIL
Run 2 FULL                87.5%  PASS
Run 3 FULL                65.6%  PASS
~~~

판정:

~~~text
V10D-AFTER-GATE
FAIL
~~~

gate를 낮추지 않는다.

Skill 02는 browser에 승격하지 않는다.

### 해석

Phase D는:

> random motor-babbling HIT/WHIFF 경험을 더 많이 누적하면
> frozen v10C classifier의 seed 안정성이 개선되는가

를 시험했다.

결과는 개선되지 않았다.

특히:

~~~text
BEFORE mean FULL 65.6%
AFTER  mean FULL 65.6%
~~~

이므로 단순히 같은 분포의 random outcome sample을 더 넣는 것만으로
현재 deployment 오류를 해결하지 못했다.

반면:

~~~text
DN_SHUFFLED 25.0% -> 18.8%
~~~

로 내려갔으므로 classifier가 neural identity를 덜 쓰게 된 것도 아니다.
오히려 neural identity contribution은 증가했다.

현재 실패 형태는 timeout이 아니라 whiff다.

~~~text
AFTER timeout  0.0%
AFTER whiff   34.4%
~~~

즉 classifier가 공격을 못 하는 문제가 아니라
**deployment에서 처음 threshold 0.5를 넘는 공격 중 일부가 너무 이른/잘못된 strike인 문제**다.

다음 단계에서는 이 final cohort를 tuning에 다시 사용하지 않는다.
새 practice / 새 final seed를 사용해야 한다.


---

## Phase E on-policy first-strike continued practice 결과 — deployment 분포 학습도 실패

GitHub Actions:

~~~text
run      35510155721
head     6d8cf5d12db1af0ac6e2b66310f2af5c8daf1e80
artifact 10605735615

digest
sha256:dee955e677f7919ce2fa30265f720ad5009031baaf59185a99d2da21020c46ed

receipt commit
6859ac615d31d3b57bb5835797b3c4a4e31df5e7
~~~

workflow는 모든 step이 success였다.

### practice

Phase E에서는 random ATTACK probe를 제거하고
현재 classifier가 처음 threshold 0.5를 넘는 시점에만 실제 ATTACK했다.

~~~text
Cohort 1
episodes 96
HIT      59
WHIFF    37
NO_STRIKE 0
updates  65
replay hit share 61.5%

Cohort 2
episodes 96
HIT      64
WHIFF    32
NO_STRIKE 0
updates  96
replay hit share 64.1%

Cohort 3
episodes 96
HIT      71
WHIFF    25
NO_STRIKE 0
updates  96
replay hit share 67.4%
~~~

누적:

~~~text
practice episodes 288
first-strike HIT   194
first-strike WHIFF  94
NO_STRIKE            0
SGD updates         257
~~~

Trainer가 ATTACK 시점을 고르지 않았고
target distance / coordinates / attack range / hittable / correct timing은
classifier input에 넣지 않았다.

### unseen final cohort BEFORE / AFTER

final seeds:

~~~text
251000
261000
271000
~~~

결과:

~~~text
Run 1
BEFORE FULL      71.9%
AFTER FULL       75.0%
AFTER OFF         0.0%
AFTER SHUFFLED    0.0%

Run 2
BEFORE FULL      68.8%
AFTER FULL       62.5%
AFTER OFF         0.0%
AFTER SHUFFLED    3.1%

Run 3
BEFORE FULL      59.4%
AFTER FULL       56.3%
AFTER OFF         0.0%
AFTER SHUFFLED    0.0%
~~~

평균:

~~~text
                       BEFORE    AFTER
movement reach          100.0%   100.0%
FULL hit                 66.7%    64.6%
NEURAL_OFF                0.0%     0.0%
DN_SHUFFLED               4.2%     1.0%
FULL whiff               33.3%    35.4%
FULL timeout              0.0%     0.0%
~~~

변화:

~~~text
FULL hit delta   -2.1%p
whiff delta      +2.1%p
timeout delta     0.0%p
~~~

Phase E AFTER는 Phase D source candidate보다
새 final cohort에서 오히려 약해졌다.

### weight 변화

~~~text
L2 delta from Phase D AFTER    0.696694
bias delta                    -0.048325
sign flip count               30
mean absolute weight delta     0.048947
max absolute weight delta      0.173235
~~~

즉 학습 update가 미미해서 실패한 것은 아니다.

### gate

AFTER:

~~~text
movement reach          100.0% PASS
FULL hit                  64.6% FAIL
FULL - NEURAL_OFF        +64.6%p PASS
FULL - DN_SHUFFLED       +63.5%p PASS
FULL whiff                35.4% FAIL
FULL timeout               0.0% PASS
Run 1 FULL                75.0% PASS
Run 2 FULL                62.5% PASS
Run 3 FULL                56.3% FAIL
~~~

판정:

~~~text
V10E-AFTER-GATE
FAIL
~~~

gate를 낮추지 않는다.
browser ATTACK decoder도 변경하지 않는다.

### 해석

Phase E는 Phase D보다 deployment 분포에 가까운
on-policy first-strike samples만 추가 학습했지만
mean FULL hit는:

~~~text
66.7% -> 64.6%
~~~

로 오히려 떨어졌다.

따라서 현재 병목은 단순한 off-policy/random sampling mismatch만으로
설명되지 않는다.

Phase C/D/E 모두 공통적으로
각 순간의 DN state를 독립적인 binary sample로 보고:

~~~text
P(HIT | current DN)
~~~

를 학습한 뒤,
실제 deployment에서는 시간 순서상 처음 threshold를 넘는 state를 선택한다.

이 두 문제는 동일하지 않다.

deployment 오류의 핵심은
한 episode 안에서 **조금 뒤에 더 좋은 strike state가 존재하더라도
더 이른 false-positive crossing이 먼저 나오면 즉시 WHIFF로 끝난다**는 점이다.

다음 phase에서는 단순 window classification을 계속 반복하지 않고
순차 decision 자체를 outcome으로 학습하는 방향으로 전환한다.


---

## Phase F self-retry after WHIFF — authoritative PASS

최종 authoritative GitHub Actions:

~~~text
run      35516619170
head     6fca4fa57396839a67967ac4eaa361ef8ba22fcc
artifact 10606809328
digest   sha256:964a0692c6207c35cea23a301bc6ce1e3037c1861327088f8ea9bdd20d90ab2a
receipt commit
edccfb8b2fc1a4870c20e8763acbebdb6d906542
~~~

receipt의 `headSha`가 위 실험 head와 일치하고,
workflow의 syntax / experiment / upload가 모두 success다.

Phase F 첫 두 번의 실행은 구현/provenance 결함이었다.

~~~text
35513768722
- practice + final 계산 완료 직후 stale replayPool serialization 오류
- 공식 결과로 사용하지 않음

35515717958
- 실험과 artifact는 성공
- 결과 파일명 불일치로 receipt detail null
- browser 승격 근거로 사용하지 않음
~~~

두 결함 수정 시 seed / 거리 / optimizer / threshold / gate는 변경하지 않았다.

### practice

각 episode에서 Fly #001이 스스로 threshold를 넘겨 ATTACK했다.
WHIFF 뒤에는 420ms actuator cooldown 후 동일 episode를 계속 진행했다.
Trainer는 ATTACK/WAIT 시점을 선택하지 않았다.

~~~text
Cohort 1
episodes           96
first ATTACK HIT   68
first ATTACK WHIFF 28
total ATTACK      153
total WHIFF        57
eventual HIT       96
NO_HIT              0
updates             73

Cohort 2
episodes           96
first ATTACK HIT   74
first ATTACK WHIFF 22
total ATTACK      134
total WHIFF        38
eventual HIT       96
NO_HIT              0
updates             96

Cohort 3
episodes           96
first ATTACK HIT   69
first ATTACK WHIFF 27
total ATTACK      143
total WHIFF        48
eventual HIT       95
NO_HIT              1
updates             96
~~~

누적 replay:

~~~text
HIT samples    287
WHIFF samples  143
total          430
SGD updates    265
~~~

classifier input에는 계속 다음 값이 없다.

~~~text
target distance
target coordinates
attack range
hittable flag
correct timing
stage/cohort
~~~

WAIT에도 정답 label을 붙이지 않았다.

### unseen final

~~~text
Run 1 seed 401000
BEFORE FULL 71.9%
AFTER  FULL 93.8%
AFTER  OFF   0.0%
AFTER  SHUFFLED 6.3%

Run 2 seed 411000
BEFORE FULL 87.5%
AFTER  FULL 81.3%
AFTER  OFF   0.0%
AFTER  SHUFFLED 62.5%

Run 3 seed 421000
BEFORE FULL 65.6%
AFTER  FULL 78.1%
AFTER  OFF   0.0%
AFTER  SHUFFLED 34.4%
~~~

평균:

~~~text
                       BEFORE    AFTER
movement reach          100.0%   100.0%
FULL hit                 75.0%    84.4%
NEURAL_OFF                0.0%     0.0%
DN_SHUFFLED               4.2%    34.4%
FULL whiff               25.0%    15.6%
FULL timeout              0.0%     0.0%
~~~

변화:

~~~text
FULL hit       +9.375%p
whiff          -9.375%p
timeout         0.000%p
~~~

### deployment gate

~~~text
movement reach          100.0% PASS
FULL hit                  84.4% PASS
FULL - NEURAL_OFF        +84.4%p PASS
FULL - DN_SHUFFLED       +50.0%p PASS
FULL whiff                15.6% PASS
FULL timeout               0.0% PASS
Run 1 FULL                93.8% PASS
Run 2 FULL                81.3% PASS
Run 3 FULL                78.1% PASS
~~~

판정:

~~~text
V10F-AFTER-GATE
PASS
~~~

### 해석

Phase F에서 처음으로
실제 deployment와 같은 반복 행동 구조:

~~~text
ATTACK
-> WHIFF
-> cooldown
-> 계속 sensory / movement
-> 다시 Fly가 ATTACK 선택
~~~

를 경험시킨 뒤 first-strike 품질이 개선됐다.

이는 full connectome synapse를 학습한 것이 아니다.
MaleCNS connectome은 고정이며,
학습된 것은 그 활동을 읽는 sparse ATTACK readout이다.

다음 작업은 v10F AFTER candidate를 freeze한 뒤
브라우저에서 정확한 5-step ATTACK window와 420ms cooldown으로
동일 readout을 배치하고 headless/browser-equivalence를 검증하는 것이다.
