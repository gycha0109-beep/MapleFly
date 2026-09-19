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


---

## Phase A push 결과 — reward economics 오류 발견

최초 push run:

~~~text
run      35444445392
commit   77fa57b0e2a192c2d439fab78f2b2c326a4578bb
artifact 10584547761
~~~

최초 reward:

~~~text
ATTACK hit    +1
ATTACK whiff  -0.35
WAIT           0
~~~

training context는 hittable / unhittable가 정확히 50:50이다.

따라서 시각 신호를 전혀 구분하지 않고 무조건 ATTACK해도 기대 reward가:

~~~text
0.5 × (+1) + 0.5 × (-0.35)
= +0.325
~~~

이다.

실제 결과도 정확히 그 방향으로 붕괴했다.

~~~text
VISUAL_ON accuracy   50%
VISUAL_OFF accuracy  50%

hittable ATTACK     100%
unhittable ATTACK   100%
precision            50%

V9-GATE FAIL
~~~

이것은 "DN state에 timing 정보가 없다"는 결과가 아니다.
**reward 설계가 무조건 공격을 유리하게 만든 오류**다.

### 수정 원칙

정답 label이나 거리 조건식을 추가하지 않는다.

환경 outcome만 유지하면서 reward economics를 중립화한다.

~~~text
ATTACK hit    +1
ATTACK whiff  -1
WAIT           0
~~~

balanced 50:50 context에서
시각 정보를 무시한 unconditional ATTACK 기대 reward는 0,
unconditional WAIT도 0이다.

따라서 양의 reward를 지속적으로 얻으려면
**실제 neural state를 이용해 hit 가능한 상황과 whiff 상황을 구분해야 한다.**

사전 gate와 evaluation distance는 변경하지 않는다.
결과를 본 뒤 gate를 완화하지 않는다.


---

## Phase B push 결과 — 방향용 normalization이 거리 정보를 지운 문제

balanced reward 수정 run:

~~~text
run      35444727950
commit   ff5295e94546642a00eae41413e76b602bbc31d4
artifact 10585077493
~~~

결과:

~~~text
run 1 VISUAL_ON 65.3%
run 2 VISUAL_ON 50.0%

mean ON            57.6%
mean OFF           50.0%
near ATTACK        91.7%
far ATTACK         76.4%
precision          55.6%

V9-GATE FAIL
~~~

reward economics 오류는 해소됐지만
두 번째 run은 다시 unconditional ATTACK 쪽으로 무너졌다.

### feature preprocessing 재검토

v7 LEFT/RIGHT에서는 target이 어느 쪽인가를 구분해야 했기 때문에
DN delta vector를 L2 normalize했다.

~~~text
normalized(DN cue - DN baseline)
~~~

하지만 ATTACK timing의 핵심 정보는
"패턴 방향"뿐 아니라 **시각 자극에 따른 neural response의 크기**일 수 있다.

현재 visual encoder 자체도 target closeness에 따라
LC10a / LPLC1 / LPLC2 / LC4 drive 크기가 달라진다.

그런데 L2 normalization은 vector 전체 크기를 항상 1로 만들어
이 proximity-related neural magnitude를 제거한다.

### Phase C 변경

정답 distance를 feature로 넣지 않는다.

대신 이미 계산하던 full MaleCNS DN response를:

~~~text
(DN cue Hz - baseline Hz) / 50
~~~

그대로 사용한다.

50 Hz는 현재 simulation ceiling의 scale일 뿐
target distance 정보가 아니다.

즉 추가되는 정보는 없다.
**기존 neural signal에서 버리던 amplitude를 더 이상 버리지 않는 것**뿐이다.

reward / train distance / held-out eval distance / 사전 gate는 그대로 유지한다.
