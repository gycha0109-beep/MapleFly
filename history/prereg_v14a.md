# prereg_v14a — learned ATTACK interruption gate

## 목적

v12에서 확인된 cross-skill combat interference를 lower-level skill 재학습 없이 줄인다.

v13 learned arbiter는 MOVE/JUMP/ATTACK/HOLD 전체를 재선택하면서 LEFT obstacle clear를 0%로 붕괴시켰다.
같은 v13 final seed에서 arbiter를 제거한 lower-level stack은 obstacle clear 100%, course complete 87.5%였다.

따라서 v14A는 MOVE와 JUMP의 실행 권한을 건드리지 않는다.
ATTACK v10F가 ATTACK을 proposal한 순간에만 learned binary gate가 ACCEPT / INTERRUPT를 선택한다.

이 실험은 v14A ATTACK interruption candidate의 reward-only screen이다.

## Frozen lower-level contract

~~~text
connectome
  alextitonis/fly.ai
  95a3dbcb05241b0a5c07028ca8ad945b23fbbe6e

MOVE
  v7 deployed bundle
  26 brain-step window
  gate 없음 / proposal 그대로 실행

ATTACK
  v10F-after-run-35516619170
  threshold 0.5
  5 brain-step window
  cooldown 21 brain steps = 420ms

JUMP
  v11H2 authoritative run 35748844599
  sparse runtime DN 96
  CONCAT4
  threshold 0.5
  persistence 2
  cooldown 38 brain steps
  obstacle LC4 disabled
  gate 없음 / proposal 그대로 실행
~~~

v14A 결과를 보고 위 learned weights, selected DN, threshold, persistence, cooldown,
sensory population/amplitude를 변경하지 않는다.

## Course / physics

v12/v13 browser-equivalent course를 그대로 사용한다.

~~~text
step                0.02s
settle              26 steps
visual-off baseline 26 steps
MOVE window         26 steps
ATTACK/JUMP window   5 steps
episode limit        8.0s

player width         34
obstacle             38 x 54
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

Obstacle sensory에는 LC4를 사용하지 않는다.
Target distance는 deployed browser와 동일한 horizontal abs(dx)를 사용한다.

## Interruption interface

100ms(5 brain steps)마다 proposal frame을 갱신한다.

한 frame:

~~~text
moveConfidence = abs(tanh(moveScore))
attackP
attackMargin   = attackP - 0.5
jumpP
waitP
jumpMargin     = jumpP - waitP
didJump        = 직전 100ms interval에서 실제 JUMP가 있었으면 1
didAttack      = 직전 100ms interval에서 실제 ATTACK이 있었으면 1
~~~

총 8 features.

최근 8 frame을 시간순으로 concatenate한다.

~~~text
CONCAT8 = 8 frames x 8 features = 64 features
~~~

episode 시작 시 history는 zero frame으로 left-pad한다.
policy에는 별도 scalar bias가 있다.

중요:
signed LEFT/RIGHT move score는 사용하지 않는다.
moveConfidence는 절댓값만 사용한다.

ATTACK v10F가 ATTACK을 proposal하지 않은 frame에서는 gate action을 샘플링하지 않는다.

ATTACK proposal이 있고 cooldown이 끝난 경우에만:

~~~text
binary learned gate
  ACCEPT
  INTERRUPT
~~~

를 결정한다.

ACCEPT이면 기존 browser melee ATTACK을 실행한다.
INTERRUPT이면 그 proposal 하나만 버린다.

MOVE와 JUMP에는 v14A gate를 적용하지 않는다.

## Forbidden policy inputs

다음 값은 v14A policy input에 들어가면 안 된다.

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
hit / whiff before the action
reward before the action
~~~

game state는 sensory encoding, physics, collision, hit 판정, reward/outcome/metric 계산에만 사용한다.

## Learner

binary logistic policy-gradient gate.

~~~text
actions          ACCEPT / INTERRUPT
input            CONCAT8 64 + bias
gamma            0.97
learning rate    0.02
L2               0.0005
weight clamp     [-4, +4]
trainer RNG      914001
final decision   deterministic P(ACCEPT) >= 0.5
~~~

practice에서만 Bernoulli sampling으로 exploration한다.
validation에서는 frozen weights로 deterministic decision만 사용한다.

episode trajectory에는 ATTACK proposal decision만 저장한다.

Reward:

~~~text
executed ATTACK hit       +1.5
executed ATTACK whiff     -1.0
target KILL               +2.0 terminal contribution
course complete           +5.0 terminal contribution
timeout                   -3.0 terminal contribution
~~~

INTERRUPT 자체에는 oracle reward를 주지 않는다.
grounded, hittable, distance를 사용한 정답 label도 만들지 않는다.

## Practice set

~~~text
base seeds
  2501000
  2511000
  2521000

blocks per seed
  3

brain seed per block
  baseSeed + block

each block
  4 distances x 2 sides = 8 episodes

total
  72 episodes
~~~

episode 순서는 trainer RNG로 한 번 shuffle한다.
practice schedule을 결과 확인 후 resample하지 않는다.

## Frozen validation set

~~~text
2551000
2561000
2571000
~~~

각 seed:
4 distances x 2 sides = 8 episodes.

총 24 episodes.
practice에 사용하지 않는다.

## Metrics

- course completion
- minimum per-seed completion
- obstacle clear
- LEFT obstacle clear
- RIGHT obstacle clear
- target kill
- timeout
- mean actual JUMPs
- ATTACK proposals
- accepted / interrupted ATTACK proposals
- pre-clear ATTACK episode rate
- airborne ATTACK episode rate
- executed ATTACK hit / whiff
- ATTACK hit precision

airborne 여부는 metric/outcome 계산에만 사용하며 policy input에는 들어가지 않는다.

## Frozen v14A screen gate

~~~text
aggregate course completion     >= 75%
every seed completion           >= 62.5%
obstacle clear                  >= 87.5%
LEFT obstacle clear             >= 87.5%
RIGHT obstacle clear            >= 87.5%
target kill                     >= 75%
timeout                         <= 25%
airborne ATTACK episode rate    <= 30%
ATTACK hit precision            >= 50%
~~~

mean JUMP는 v14A acceptance gate가 아니다.
v14A는 JUMP를 수정하지 않기 때문이다. 단, regression 관찰용으로 반드시 기록한다.

pre-clear ATTACK도 regression metric으로 기록하지만 v14A gate로 사용하지 않는다.

## 결과 처리

PASS:
- v14A candidate weights를 evidence artifact로 freeze한다.
- browser에는 아직 배포하지 않는다.
- 다음 prereg v14B에서 v14A를 frozen 상태로 사용해 Repeat-JUMP interruption을 학습한다.

FAIL:
- 이 gate / validation seed / lower-level threshold / sensory를 사후 변경하지 않는다.
- failure를 feature insufficiency / reward learning / lower-level regression으로 분해한다.
- 같은 결과를 PASS로 만들기 위한 threshold tuning을 하지 않는다.
