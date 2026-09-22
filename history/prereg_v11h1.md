# Phase H1 — broad orthogonal obstacle feature code preregistration

H0 authoritative run 35745831597은 사전등록된 overall screen gate를 통과하지 못했다.
CURRENT 91.7%, MEAN4 91.7%, CONCAT4 95.8%로 개별 context gate는 통과했지만,
history representation이 CURRENT보다 15pp 이상 개선되어야 한다는 preregistered selection rule 때문에
selectedRepresentation=NONE, overall gate=FAIL이었다.

따라서 H0의 LC6+LC16 단순 composite를 그대로 learner에 배포하지 않는다.

H1은 sensory architecture를 더 넓은 obstacle visual population code로 바꾼다.

## biological motivation

- LC6, LC16: looming/avoidance 관련 visual projection neurons.
- LC12, LC15: moving vertical bar / edge / object-motion 관련 visual projection neurons.

게임 obstacle은 접근하면서 커지는 looming object이면서 수직 bar/edge 형태이므로,
두 종류 feature population을 하나의 고정 obstacle code로 사용한다.

## frozen target sensory

v10F target sensory는 변경하지 않는다.

~~~text
LC10a
LPLC1
LPLC2
LC4 close-target cue
~~~

## obstacle sensory

~~~text
LC6
LC16
LC12
LC15
~~~

동일 side의 네 population에 같은 fixed drive를 동시에 입력한다.

~~~text
drive = clamp(
  ((280 - max(0, frontDistance)) / 280) * 0.8,
  0,
  0.8
)
~~~

obstacle은 LC4를 자극하지 않는다. population별 weight/amplitude sweep은 하지 않는다.

## action-free assay

classes:

~~~text
OBSTACLE
TARGET_ONLY
~~~

두 class 모두 target sensory 활성. OBSTACLE만 LC6+LC16+LC12+LC15 obstacle code 활성.

classifier input:

~~~text
CURRENT 1316-DN activity only
~~~

H0 결과를 보고 representation을 새로 탐색하지 않는다.
H1은 CURRENT 하나만 독립 seed에서 confirm한다.

## seeds

~~~text
train  2101000 / 2101100 / 2101200 / 2101300
eval   2111000 / 2111100 / 2111200
~~~

sample bins:

~~~text
150 / 120 / 90 / 60
~~~

## classifier

~~~text
class-balanced logistic
epochs       120
learningRate 0.02
L2           0.0005
threshold    0.5
~~~

## gate

~~~text
mean FULL balanced accuracy      >= 85%
every eval run FULL              >= 75%
FULL - LABEL_SHUFFLED            >= 25pp
FULL - DN_PERMUTED               >= 25pp
~~~

PASS:
broad obstacle sensory code를 freeze하고 H2 reward-only JUMP learner로 이동한다.

FAIL:
추가 LC channel cherry-picking을 중단하고 sensory encoding의 구조 자체를 다시 설계한다.

H1은 action-free assay이며 browser JUMP deployment는 하지 않는다.
