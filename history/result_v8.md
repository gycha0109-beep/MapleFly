# result_v8 — Fly #001 실제 runtime 배치 결과

## 결론

v7에서 reward-only로 배운 LEFT / RIGHT motor readout을
`Fly #001`이라는 저장 가능한 skill state로 만들고,
실제 MapleFly 브라우저 MaleCNS game loop에 연결했다.

배치 전 sparse policy 검증과
브라우저와 같은 continuous-control headless 검증은 모두 사전 gate를 통과했다.

현재 판정:

~~~text
Fly #001 learned LEFT/RIGHT skill
DEPLOYED

sparse deploy gate
PASS

continuous live-style gate
PASS

GitHub Pages
PASS
~~~

다만 이 문서에서 말하는 `live-style`은
브라우저 구현과 같은 calibration / decision window / movement loop를
headless로 재현한 실험이다.

**사람이 실제 브라우저 탭을 장시간 켜 두고 플레이를 관찰한 수동 runtime QA까지 끝났다는 뜻은 아니다.**

---

## 1. 저장된 Fly #001 skill

v7의 독립 학습 run 2 policy를 배치 대상으로 사용했다.

~~~text
schema       maplefly.fly-skill.v1
fly          Fly #001
version      v7-run2-top64
source run   35409704972
source commit
5634cc28c4b871ad9e93eee0f5e91504c3ee48cc
~~~

원본 v7 policy:

~~~text
descending-neuron features  1,316
VISUAL_ON evaluation          100%
VISUAL_OFF evaluation          50%
~~~

브라우저 runtime에서는 매 40 ms마다 1,316개 feature 전체를 복사하지 않고,
LEFT logit absolute weight 상위 64개 DN feature만 사용한다.

이 64개는 source run 2 LEFT weight의
L2 mass 약 92.6%를 보존한다.

skill state는 브라우저의 다음 key에 저장된다.

~~~text
maplefly.fly-001.skill.v1
~~~

현재 v8에서는 이 state를 **저장하고 재사용**하지만
실제 플레이 중 weight를 다시 갱신하는 online learning은 아직 하지 않는다.

---

## 2. sparse deployment 검증

브라우저에 올리기 전에
64-feature pruning이 학습 결과를 망가뜨리지 않는지 별도 검증했다.

GitHub Actions:

~~~text
run      35433208266
commit   963989f7776748409a7d4e60efb261f85f5f5f3d
artifact 10581535960

digest
sha256:860f88a3a2726d91bdd2b7aba4adaa6717c478230a83441b4c87730b5cfabc2c
~~~

사전 gate:

~~~text
150 px VISUAL_ON >= 90%
80 / 150 / 300 / 500 px 중 최저 VISUAL_ON >= 75%
모든 VISUAL_OFF <= 60%
~~~

실제 결과:

| target distance | VISUAL_ON | VISUAL_OFF | difference |
| ---: | ---: | ---: | ---: |
| 80 px | 100.0% | 50.0% | +50.0%p |
| 150 px | 100.0% | 50.0% | +50.0%p |
| 300 px | 100.0% | 50.0% | +50.0%p |
| 500 px | 100.0% | 50.0% | +50.0%p |

~~~text
deploy-gate = PASS
~~~

따라서 sparse64 policy를 실제 browser runtime에 배치했다.

---

## 3. 브라우저 runtime 연결

runtime integration commit:

~~~text
3819166ae86480c4e8871f3131ca4d35aa63e7be
feat(runtime): deploy Fly 001 learned movement skill
~~~

데이터 경로:

~~~text
MapleFly target visual encoder
        ↓
pinned MaleCNS
166,700 neurons / 25,088,107 connections
        ↓
64 selected descending-neuron spike counts
        ↓
Fly #001 saved v7 skill
        ↓
LEFT / RIGHT
~~~

Worker는 pinned metadata에서 전체 DN 1,316개의 ordering을 확인한 뒤
저장된 relative index 64개만 선택한다.

즉 브라우저 main thread로
1,316개 DN vector 전체를 매번 복사하지 않는다.

### calibration

v7 policy는 cue-minus-baseline feature로 학습했으므로
Fly control을 켜자마자 움직이게 하지 않는다.

브라우저는 먼저:

~~~text
SETTLE
약 0.52 s

BASELINE
약 0.52 s
visual target input OFF
SNta ground input 유지

LIVE
target visual input ON
약 0.52 s window마다 LEFT / RIGHT 갱신
~~~

순서로 들어간다.

### 혼합 controller

v7에서 실제로 학습한 것은 좌우 이동뿐이다.

따라서 v8은 다음처럼 구분한다.

~~~text
LEFT / RIGHT
-> Fly #001 learned skill

JUMP / ATTACK / UP / DOWN
-> 기존 connectome decoder

POTION
-> 기존 taste / head-motor engineered proxy
~~~

학습하지 않은 행동까지 학습했다고 처리하지 않았다.

---

## 4. continuous live-style 검증

단일 150 px episode에서 100%가 나온 것만으로
실제 맵에서 계속 움직일 수 있다고 결론내리지 않았다.

그래서 browser 구현과 비슷하게:

~~~text
flat continuous arena
실제 MapleFly visual encoder 수식
move speed 280 px/s
0.52 s settle
0.52 s fixed baseline
이후 continuous visual cue
0.52 s마다 새 LEFT / RIGHT decision
target 도달 시 deterministic respawn
~~~

으로 별도 headless 실험을 만들었다.

paired 조건:

~~~text
VISUAL_ON
target visual input 사용

VISUAL_OFF
같은 seed / 같은 world
SNta만 유지
target visual input 제거
~~~

사전 gate:

~~~text
mean VISUAL_ON toward >= 70%
mean ON-OFF             >= 15%p
모든 VISUAL_ON          >= 60%
mean VISUAL_ON reaches  >= 1
~~~

GitHub Actions:

~~~text
run      35433545656
commit   b141edc56f0978902e7bba6a7a413ae79a15385c
artifact 10581911656

digest
sha256:3bb870bdaebbe4faeb29f4249ae61d45e44363a2e014da95c30204167d1193df
~~~

### trial 결과

| pair | seed | condition | toward | correct-direction windows | reaches / 60s |
| ---: | ---: | --- | ---: | ---: | ---: |
| 1 | 64 | VISUAL_ON | 75.7% | 78.3% | 29 |
| 1 | 64 | VISUAL_OFF | 47.8% | 26.1% | 0 |
| 2 | 65 | VISUAL_OFF | 18.8% | 0.9% | 1 |
| 2 | 65 | VISUAL_ON | 82.7% | 48.7% | 17 |
| 3 | 66 | VISUAL_ON | 72.6% | 51.3% | 21 |
| 3 | 66 | VISUAL_OFF | 18.8% | 0.9% | 0 |

평균:

~~~text
VISUAL_ON toward      77.0%
VISUAL_OFF toward     28.5%
difference           +48.5%p

minimum VISUAL_ON     72.6%
VISUAL_ON reaches     22.3 / 60s
~~~

판정:

~~~text
LIVE-GATE = PASS
~~~

VISUAL_OFF가 정확히 50%가 아닌 것은
continuous world에서는 한 번의 방향 bias가 이동 경로와
이후 target geometry에 계속 영향을 주기 때문이다.

중요한 비교는 같은 실험 구조에서
target visual cue가 있을 때 toward movement가
`77.0% vs 28.5%`로 크게 증가했다는 점이다.

---

## 5. GitHub Pages

현재 v8 main:

~~~text
b141edc56f0978902e7bba6a7a413ae79a15385c
~~~

Pages run:

~~~text
35433545609
SUCCESS
~~~

live URL:

~~~text
https://gycha0109-beep.github.io/MapleFly/
~~~

화면에는:

~~~text
Experiment v8 · Fly #001
FLY #001 SKILL
SKILL STATE
~~~

telemetry가 추가되어 있다.

---

## 정확한 해석

v8에서 확인한 것은 다음이다.

> **v7에서 reward-only로 학습한 LEFT / RIGHT motor readout을
> 저장 가능한 Fly #001 state로 만들고,
> pinned full MaleCNS의 descending-neuron activity에 다시 연결했으며,
> continuous control headless 실험에서도 target visual input이 있을 때
> 목표 방향 이동 성능이 대조군보다 크게 높았다.**

다음처럼 말하면 과장이다.

~~~text
"초파리 connectome 내부가 학습했다"
"초파리가 메이플을 이해한다"
"사냥 전체를 학습했다"
"점프/공격/포션도 학습했다"
~~~

---

## 다음 단계

이제 LEFT / RIGHT skill은 첫 번째 저장 가능한 기술로 취급할 수 있다.

다음 학습 순서는 행동을 한꺼번에 섞지 않고
별도 curriculum으로 추가하는 것이 안전하다.

~~~text
Fly #001 Skill 01
LEFT / RIGHT
PASS + DEPLOYED

다음 후보
ATTACK timing
-> 그 다음 JUMP / obstacle
-> 그 다음 POTION utility
~~~

각 skill은 reward와 대조군을 따로 두고
실제 성능이 확인된 것만 Fly #001 state에 합친다.
