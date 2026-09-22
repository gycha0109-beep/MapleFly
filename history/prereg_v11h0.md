# Phase H0 — orthogonal looming composite sensory screen preregistration

G3~G5는 모두 target과 obstacle이 LC4를 공유하는 상태에서 TARGET_ONLY false jump gate를 통과하지 못했다.

다음 단계에서는 policy threshold나 reward를 더 조정하지 않고 sensory architecture 자체를 다시 분리한다.

문헌상 LC6와 LC16은 모두 looming visual feature에 반응하며 avoidance behavior와 연결된다. 기존 G0에서 LC6 단독과 LC16 단독은 frozen MaleCNS DN separability gate를 통과하지 못했다. H0는 사후 channel 탐색 없이 두 preregistered looming population을 동시에 사용하는 고정 composite code 하나만 시험한다.

## sensory code

TARGET sensory는 v10F와 동일하게 보존한다.

~~~text
LC10a
LPLC1
LPLC2
LC4  <- close target cue, unchanged
~~~

OBSTACLE sensory:

~~~text
LC6 + LC16
~~~

동일 side의 LC6와 LC16에 같은 looming drive를 동시에 입력한다.

~~~text
drive = clamp(
  ((280 - max(0, frontDistance)) / 280) * 0.8,
  0,
  0.8
)
~~~

LC4 obstacle drive는 사용하지 않는다. LC6/LC16 간 가중치 탐색, amplitude sweep, 결과 후 tuning은 하지 않는다.

## assay

action-free context separability만 검사한다.

classes:

~~~text
OBSTACLE
TARGET_ONLY
~~~

두 class 모두 target sensory는 활성화한다. OBSTACLE만 LC6+LC16 composite obstacle cue를 추가한다.

runtime/policy에 class identity를 넣지 않는다. class label은 이 action-free assay의 평가용 teacher label에만 사용한다.

## representation screen

G2B와 동일한 네 representation을 한 번에 비교한다.

~~~text
CURRENT
MEAN4
DELTA
CONCAT4
~~~

history:

~~~text
4 windows x 5 brain steps = 0.4 s
~~~

classifier input은 DN-derived representation만 사용한다.

## seeds

~~~text
train  2001000 / 2001100 / 2001200 / 2001300
eval   2011000 / 2011100 / 2011200
~~~

sample bins:

~~~text
150 / 120 / 90 / 60
~~~

## gate

각 representation의 기존 context gate:

~~~text
mean FULL balanced accuracy      >= 85%
every eval run FULL              >= 75%
FULL - LABEL_SHUFFLED            >= 25pp
FULL - DN_PERMUTED               >= 25pp
~~~

history representation 선택에는 추가로 selected history - CURRENT >= 15pp가 필요하다.

여러 history representation이 PASS하면 highest mean FULL을 선택하고, 2pp 이내 tie면 더 낮은 차원을 우선한다.

## decision

PASS: 선택된 representation을 고정하고 H1 reward-only JUMP learner를 LC6+LC16 obstacle sensory로 새로 학습한다.

FAIL: LC6+LC16 단순 composite도 폐기하고 더 넓은 visual population code를 별도 preregistration한다.

H0는 action-free screen이므로 browser JUMP deployment는 하지 않는다.
