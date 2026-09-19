# development_v6 — 학습 가능성 진단 / KC 포화 해소 후보 탐색

## 목적

v5까지 MapleFly의 full MaleCNS controller는 감각 입력을 받고 행동을 만들지만
경험에 따라 synapse가 바뀌지는 않는다.

이번 단계의 최종 목적은 바로 강화학습을 붙이는 것이 아니다.

> **166,700-neuron full MaleCNS에서 실제 학습 규칙을 쓰기 전에,
> mushroom-body 계열의 표현이 기억을 기록할 수 있을 정도로 분리되어 있는지 확인한다.**

특히 upstream이 full connectome에서 보고한 핵심 문제는 다음이다.

~~~text
KC가 20 ms 모델에서 평상시부터 과도하게 활성
PAM 계열도 높은 spontaneous activity
-> 냄새별 KC pattern을 안정적으로 구분하기 어려움
-> dopamine-gated KC -> MBON plasticity를 바로 켜면 신뢰하기 어려움
~~~

MapleFly는 이 결과를 그대로 가정하지 않고,
현재 프로젝트가 실제 사용하는 pinned MaleCNS와 동일한 Node headless runtime에서 다시 측정한다.

## 고정 brain

~~~text
repository: alexitonis/fly.ai
commit: 95a3dbcb05241b0a5c07028ca8ad945b23fbbe6e
neurons: 166,700
synapses: 25,088,107
dt: 20 ms
~~~

upstream 최신 main에 작은 world용 mushroom-body learning 구현이 생겼더라도,
MapleFly의 full connectome pin은 이 단계에서 바꾸지 않는다.

## 측정 population

cell-type prefix를 사용해 full metadata에서 직접 찾는다.

~~~text
KC*
MBON*
PAM*
PPL1*
APL*
~~~

그리고 superclass 기준 descending neurons도 함께 측정한다.

실행 시 실제 population size를 artifact에 기록한다.

## 입력

두 olfactory input을 사용한다.

~~~text
vinegar: ORN_VL2a
cVA:     ORN_DA1 + ORN_VA1d
~~~

각 자극은 pinned upstream의 sensory screen과 같은 방식으로
매 20 ms step에 0.5 V를 주입한다.

각 조건:

~~~text
1 s settle
1 s baseline
1 s stimulus
~~~

## KC sparse-code 측정

KC 하나가 200 ms 동안 한 번이라도 spike하면 그 window에서 active로 본다.

1초 측정은 200 ms window 5개로 나눈다.

주요 지표:

- rest KC active share
- vinegar KC active share
- cVA KC active share
- KC mean Hz
- 50 Hz ceiling에 붙은 KC 비율
- vinegar / cVA signature Jaccard

signature는 5개 window 중 60% 이상에서 active였던 KC 집합이다.

## MBON / dopamine / global-side-effect 측정

- vinegar와 cVA가 각 MBON cell을 baseline 대비 +2 Hz 이상 올리는 비율
- PAM / PPL1 / APL 평균 Hz
- resting descending-neuron mean Hz

KC를 억제했더니 전체 motor/descending system이 같이 망가지는 경우를 피하기 위해
KC bias=0과 비교한 resting DN drift도 측정한다.

## KC tonic-bias sweep

이번 sweep은 **학습 기능이 아니다.**

KC 포화가 단순 steady inhibition으로 풀릴 수 있는지 확인하는 진단 개입이다.

~~~text
0
-0.24
-0.26
-0.28
-0.29
-0.30
-0.31
-0.32
-0.34
~~~

각 값은 KC의 tonicExtra에 더한다.

이 sweep에서 특정 숫자가 좋아 보인다고 곧바로 production learning rule로 채택하지 않는다.
knife-edge라면 실패로 본다.

## 사전 gate

### Gate 1 — sparse / separated / non-destructive

~~~text
rest active <= 20%
vinegar active / rest >= 2x
cVA active / rest >= 2x
vinegar-cVA signature Jaccard < 0.5
resting DN drift <= 20%
~~~

### Gate 2 — MBON까지 전달

Gate 1을 만족하면서:

~~~text
vinegar: MBON의 >=10%가 baseline 대비 +2 Hz 이상
cVA:     MBON의 >=10%가 baseline 대비 +2 Hz 이상
~~~

### Robustness

서로 인접한 bias 3개가 모두 Gate 2를 통과해야
plasticity-ready로 본다.

단 하나의 값에서만 통과하면 learning을 얹지 않는다.

## 다음 분기

### robust PASS

그때 v7에서:

~~~text
base MaleCNS weight
+
KC -> MBON plastic overlay
~~~

형태의 dopamine-gated memory를 구현한다.

### FAIL / knife-edge

정적 bias를 억지로 고정하지 않는다.

다음 후보를 별도 실험한다.

~~~text
APL activity 기반 feedback inhibition
per-cell threshold heterogeneity
finer simulation timestep
~~~

## 금지

이번 단계에서도 다음과 같은 게임 정답 조건문은 넣지 않는다.

~~~text
if monsterRight -> RIGHT
if hp < 30 -> POTION
if hit -> JUMP
~~~

v6는 메이플 공략을 가르치는 단계가 아니라
**경험을 기록할 수 있는 뇌 상태를 만드는 단계**다.
