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
