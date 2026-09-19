# development_v9 — Fly #001 Skill 02 / ATTACK timing

## 목적

v8에서 Fly #001은 reward-only로 학습한 LEFT / RIGHT 이동 skill을
실제 browser runtime에 배치했다.

v9의 다음 수업은:

> **버섯이 보인다는 이유만으로 공격하지 않고,
> full MaleCNS neural state만 보고 실제 공격이 닿을 때 ATTACK하고
> 닿지 않을 때 WAIT하는 timing을 경험으로 학습할 수 있는가?**

이다.

## 금지

policy input에 다음 값을 넣지 않는다.

~~~text
target distance
target x/y
player x/y
hittable boolean
attack range
정답 ATTACK/WAIT label
~~~

따라서 다음 조건문은 만들지 않는다.

~~~text
if distance < attackRange -> ATTACK
~~~

## 감각

v7/v8과 같은 target visual channel을 사용한다.

~~~text
LC10a
LPLC1
LPLC2
LC4
SNta
~~~

그 입력이 pinned full MaleCNS를 통과한 뒤
1,316 descending-neuron activity를 feature로 사용한다.

feature:

~~~text
0.5 s settle
0.5 s visual-off baseline
0.5 s target cue

normalized(
  cue DN Hz - baseline DN Hz
)
~~~

## 행동

가능한 action은 둘뿐이다.

~~~text
ATTACK
WAIT
~~~

## reward

정답 label을 직접 주지 않고 실제 게임 hitbox 결과를 사용한다.

~~~text
ATTACK + 실제 hit   -> +1
ATTACK + whiff      -> -0.35
WAIT                -> 0
~~~

WAIT에 "정답 보상"을 주지 않는다.

즉 policy가 공격하지 않았을 때는 별도 교사 label이 없다.
공격을 실제로 시도했을 때 발생한 hit / whiff 결과만 학습 신호가 된다.

## 물리 판정

hit 여부는 현재 MapleFly combat geometry를 그대로 단순화해 계산한다.

~~~text
player width  34
attack range  76
mushroom box  56 × 62
~~~

training distance:

~~~text
45
75
105
135
175
230 px
~~~

evaluation은 같은 숫자를 재사용하지 않는다.

~~~text
55
85
110
130
155
205 px
~~~

각 distance는 LEFT / RIGHT 양쪽을 정확히 같은 수로 사용한다.

정책은 이 distance 값을 받지 않는다.

## 학습기

2-action softmax policy gradient.

초기:

~~~text
P(ATTACK) = 0.5
P(WAIT)   = 0.5
~~~

signed outcome reward로만 weight를 갱신한다.

full MaleCNS connectome weight는 계속 frozen이다.

## 대조군

evaluation은 같은 seed / 같은 side / 같은 distance schedule로:

~~~text
VISUAL_ON
target visual cue 있음

VISUAL_OFF
SNta만 유지
target visual cue 없음
~~~

을 비교한다.

## 사전 gate

결과를 보기 전에 다음을 고정한다.

~~~text
mean VISUAL_ON opportunity accuracy >= 75%
mean VISUAL_ON - VISUAL_OFF          >= 15%p
hittable context ATTACK rate         >= 70%
unhittable context ATTACK rate       <= 30%
ATTACK precision                     >= 70%
각 independent run VISUAL_ON          >= 70%
~~~

여기서 opportunity accuracy는 평가용 지표일 뿐
training reward에는 사용하지 않는다.

## PASS 후

PASS하면 best independent run의
`ATTACK logit - WAIT logit` weight를 계산하고
absolute weight 상위 64개 DN만 뽑은 sparse deployment candidate를 만든다.

그 다음 별도 pruning gate를 통과한 경우에만:

~~~text
Fly #001
Skill 01 LEFT / RIGHT
Skill 02 ATTACK timing
~~~

으로 browser state를 확장한다.
