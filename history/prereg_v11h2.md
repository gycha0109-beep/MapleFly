# Phase H2 — orthogonal sensory reward-only JUMP preregistration

H1 authoritative run 35748359986이 matched target background에서
LC6+LC16+LC22+LPLC4 obstacle code의 DN separability gate를 PASS했다.

H2는 G3와 동일한 reward-only learning architecture를 사용하고,
sensory architecture만 H1의 orthogonal code로 교체한다.

목표는 G3~G5에서 반복된 TARGET_ONLY false jump가 shared-LC4 collision 때문이었는지
직접 검증하는 것이다.

## frozen sensory architecture

TARGET sensory:

~~~text
LC10a
LPLC1
LPLC2
LC4 close-target cue
~~~

OBSTACLE sensory:

~~~text
LC6
LC16
LC22
LPLC4
~~~

obstacle drive:

~~~text
drive = clamp(
  ((280 - max(0, frontDistance)) / 280) * 0.8,
  0,
  0.8
)
~~~

obstacle은 LC4를 자극하지 않는다.
네 obstacle population의 weight/amplitude는 동일하며 sweep하지 않는다.

## matched geometry

OBSTACLE과 TARGET_ONLY 모두 같은 source-distance schedule과 target trajectory를 사용한다.

virtual obstacle front distance d에서 target center는 player center로부터:

~~~text
d + 215 px
~~~

떨어진다.

OBSTACLE에만 실제 obstacle과 orthogonal obstacle sensory가 존재한다.
TARGET_ONLY는 obstacle만 제거한다.

## policy representation

G3와 동일하게 유지한다.

~~~text
representation      CONCAT4
history             4 x 5 brain-step windows = 0.4 s
raw dimensions      5264
feature selection   top 256 by unlabeled practice variance
persistence         2 consecutive positive JUMP decisions
cooldown            38 brain steps
~~~

policy input 금지:

~~~text
context identity
obstacle/target flag
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

## practice

~~~text
cohort seeds        2201000 / 2211000 / 2221000
episodes/cohort     96
OBSTACLE            48
TARGET_ONLY         48
source distances    155 / 195 / 235 / 275
intervention window uniform random 1..14
intervention action WAIT/JUMP 50:50 random
~~~

intervention window/action은 episode 시작 전에 seeded RNG로 정하고
DN state/context와 독립이다.

한 episode에는 intervention action 한 번만 허용한다.
그 이후 teacher action은 없다.

## reward

OBSTACLE:

~~~text
CLEAR    +1
TIMEOUT  -1
~~~

TARGET_ONLY:

~~~text
TARGET reached  +1
actual JUMP     -1
TIMEOUT         -1
~~~

binary desirable label:

~~~text
reward > 0
~~~

## learner

WAIT/JUMP 각각 독립 class-balanced logistic readout:

~~~text
epochs       300
learningRate 0.03
L2           0.001
threshold    0.5
~~~

practice support gate:

~~~text
WAIT positive >= 24
WAIT negative >= 24
JUMP positive >= 12
JUMP negative >= 24
~~~

support fail이면 resampling/tuning 없이 H2 FAIL이다.

runtime decision:

~~~text
jumpCandidate =
  P(desirable | DN, JUMP) >= 0.5
  AND
  P(desirable | DN, JUMP) > P(desirable | DN, WAIT)

2 consecutive available windows
=> JUMP
otherwise WAIT
~~~

airborne/cooldown unavailable 시 streak=0.
actual JUMP 후 streak=0.

## unseen final

~~~text
seeds      2251000 / 2261000 / 2271000
distances  155 / 195 / 235 / 275
~~~

각 run:

~~~text
32 OBSTACLE FULL
32 OBSTACLE_CUE_OFF
32 DN_SHUFFLED
16 TARGET_ONLY
~~~

OBSTACLE_CUE_OFF는 LC6/LC16/LC22/LPLC4 obstacle drive만 제거하고
target sensory는 그대로 유지한다.

DN_SHUFFLED는 selected temporal-DN identity에 고정 permutation을 적용한다.

## frozen gate

~~~text
mean OBSTACLE FULL clear  >= 75%
every FULL run            >= 65%
FULL - CUE_OFF            >= 25pp
FULL - DN_SHUFFLED        >= 20pp
FULL timeout              <= 20%
FULL mean actual jumps    <= 1.75
TARGET_ONLY reach         >= 85%
TARGET_ONLY any-jump      <= 30%
~~~

gate/threshold/seeds는 결과 후 낮추거나 바꾸지 않는다.

PASS:
candidate freeze -> browser bundle equivalence -> v7 regression -> v10F regression ->
combined browser deployment 순서로 진행한다.

FAIL:
candidate를 배포하지 않고 실패 criterion과 outcome pattern을 먼저 진단한다.
