# prereg_v14b — dual learned proposal interruption

## 목적

v14A는 ATTACK proposal만 learned gate로 억제해 같은 unseen seed에서
completion 87.5% -> 91.7%, airborne ATTACK 91.7% -> 62.5%,
precision 41.2% -> 47.6%로 개선했지만 frozen gate는 FAIL했다.

동시에 mean JUMPs는 2.375 -> 2.250으로 거의 남았다.

v14B는 v13처럼 MOVE/JUMP/ATTACK 중 하나를 다시 선택하는 arbiter가 아니다.
MOVE는 항상 lower-level v7 proposal을 그대로 실행한다.

ATTACK과 JUMP에만 각각 독립적인 binary interruption head를 둔다.

~~~text
ATTACK proposal -> ACCEPT_ATTACK / INTERRUPT_ATTACK
JUMP proposal   -> ACCEPT_JUMP   / INTERRUPT_JUMP
MOVE proposal   -> 항상 그대로 실행
~~~

v14A failed weights는 사용하지 않는다.
두 head는 v14B practice에서 새로 학습한다.

## Frozen lower-level contract

~~~text
connectome
  alextitonis/fly.ai
  95a3dbcb05241b0a5c07028ca8ad945b23fbbe6e

MOVE
  v7 deployed bundle
  26 brain-step window
  gate 없음

ATTACK
  v10F-after-run-35516619170
  threshold 0.5
  5 brain-step window
  cooldown 21 brain steps

JUMP
  v11H2 authoritative run 35748844599
  sparse runtime DN 96
  CONCAT4
  threshold 0.5
  persistence 2
  cooldown 38 brain steps
  obstacle LC4 disabled
~~~

위 lower-level parameter는 v14B 결과를 보고 변경하지 않는다.

## Course / physics

v12-v14A와 같은 matched one-obstacle course.

~~~text
step                0.02s
settle              26
baseline            26
MOVE window         26
ATTACK/JUMP window   5
episode limit        8.0s

player              34 x 46
obstacle            38 x 54
target offset        160
start distances      155 / 195 / 235 / 275
side                 L / R balanced
target HP            30
ATTACK damage        10
~~~

Target sensory:
LC10a + LPLC1 + LPLC2 + LC4

Obstacle sensory:
LC6 + LC16 + LC22 + LPLC4

Obstacle LC4는 사용하지 않는다.
Target distance는 horizontal abs(dx).

## Temporal proposal interface

100ms마다 frame:

~~~text
moveConfidence = abs(tanh(moveScore))
attackP
attackMargin   = attackP - 0.5
jumpP
waitP
jumpMargin     = jumpP - waitP
didJump        = 직전 100ms interval 실제 JUMP 여부
didAttack      = 직전 100ms interval 실제 ATTACK 여부
~~~

최근 12 frame을 시간순 concatenate:

~~~text
CONCAT12 = 12 x 8 = 96 features
~~~

12 frame = 1.2초다.
이는 frozen JUMP cooldown 0.76초와 ballistic flight 약 0.86초를 모두 덮도록
결과를 보기 전에 고정한 history horizon이다.

episode 시작은 zero frame left-pad.
각 head에는 별도 scalar bias가 있다.

## Decision semantics

ATTACK v10F가 ATTACK을 proposal하고 cooldown이 끝났을 때만 ATTACK head를 평가한다.

JUMP v11H2가 JUMP를 proposal하고 lower-level availability가 true일 때만 JUMP head를 평가한다.

각 head의 deterministic final rule:

~~~text
P(ACCEPT) >= 0.5 -> ACCEPT
else             -> INTERRUPT
~~~

practice에서만 Bernoulli exploration.

같은 100ms boundary에서 둘 다 ACCEPT이면 browser intent order와 맞춰
JUMP를 먼저 actuate하고 ATTACK을 실행한다.
따라서 같은 boundary의 ATTACK airborne metric은 JUMP actuate 이후 상태를 사용한다.

## Forbidden policy inputs

두 head 모두 다음 값을 직접 입력받지 않는다.

~~~text
player x / y
target x / y
target distance
obstacle x / y
obstacle distance
grounded / airborne flag
collision
hittable / attack range
target HP
obstacle cleared
LEFT / RIGHT side label
seed
distance bin
correct action / oracle label
hit / whiff before action
reward before action
~~~

game state는 sensory encoding, physics, lower-level availability,
collision/hit, reward/outcome/metric에만 사용한다.

## Learners

두 head 모두 independent binary logistic policy-gradient.

~~~text
input            CONCAT12 96 + bias
gamma            0.97
learning rate    0.02
L2               0.0005
weight clamp     [-4,+4]
trainer RNG      914002
~~~

### ATTACK reward

~~~text
accepted ATTACK hit       +1.5
accepted ATTACK whiff     -1.0
target KILL               +2.0 terminal contribution
course complete           +5.0 terminal contribution
timeout                   -3.0 terminal contribution
~~~

### JUMP reward

~~~text
accepted JUMP             -0.35 action cost
first obstacle clear      +2.0 outcome contribution
target KILL               +2.0 terminal contribution
course complete           +5.0 terminal contribution
timeout                   -3.0 terminal contribution
~~~

JUMP action cost는 post-clear 여부를 보지 않는 동일 비용이다.
즉 "두 번째 JUMP라서 벌점" 같은 oracle rule을 사용하지 않는다.

## Practice

~~~text
base seeds
  2601000
  2611000
  2621000

blocks per seed
  4

brain seed per block
  baseSeed + block

each block
  4 distances x 2 sides = 8 episodes

total
  96 episodes
~~~

trainer RNG로 전체 schedule을 한 번 shuffle한다.
결과 확인 후 resample하지 않는다.

## Frozen validation

~~~text
2651000
2661000
2671000
~~~

각 seed 8 episodes.
총 24 episodes.

## Metrics

- course completion
- minimum per-seed completion
- obstacle clear
- LEFT / RIGHT obstacle clear
- target kill
- timeout
- mean actual JUMPs
- post-clear JUMP episode rate
- pre-clear ATTACK episode rate
- airborne ATTACK episode rate
- ATTACK hit precision
- ATTACK proposals accepted/interrupted
- JUMP proposals accepted/interrupted

post-clear / airborne / hit 여부는 metric/reward 계산용이며 policy input이 아니다.

## Frozen v14B gate

~~~text
course completion              >=75%
every seed completion          >=62.5%
obstacle clear                 >=87.5%
LEFT obstacle clear            >=87.5%
RIGHT obstacle clear           >=87.5%
target kill                    >=75%
timeout                        <=25%
mean actual JUMPs              <=1.75
post-clear JUMP episode        <=25%
pre-clear ATTACK episode       <=30%
airborne ATTACK episode        <=30%
ATTACK hit precision           >=50%
~~~

## 결과 처리

PASS:
- 두 head weights와 provenance를 evidence candidate로 freeze한다.
- browser 배포 전 deterministic deployment-equivalence smoke를 별도 수행한다.

FAIL:
- 이 gate / validation seed / reward / history / learner hyperparameter를 사후 수정하지 않는다.
- 실패를 proposal signal / JUMP suppression / ATTACK suppression / generalization으로 분해한다.
- 동일 v14B를 threshold tuning해 PASS로 만들지 않는다.
