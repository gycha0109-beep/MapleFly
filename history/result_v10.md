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
