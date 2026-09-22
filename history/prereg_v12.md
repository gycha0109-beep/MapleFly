# prereg_v12 — learned MOVE + JUMP + ATTACK integrated course

## 목적

개별 배포 검증을 통과한 세 learned skill을 하나의 연속 episode에서 동시에 실행한다.

~~~text
MOVE v7
  -> obstacle approach
  -> JUMP v11H2
  -> landing / continued movement
  -> target approach
  -> ATTACK v10F
  -> 3 successful hits
  -> KILL
~~~

이 단계는 새 skill 학습이나 새 causal claim을 위한 실험이 아니다.
frozen/deployed 세 policy가 같은 MaleCNS runtime에서 함께 작동할 때 cross-skill interference 없이
실제 task sequence를 완주하는지 확인하는 deployment integration acceptance다.

## Frozen contract

~~~text
connectome  alextitonis/fly.ai @ 95a3dbcb05241b0a5c07028ca8ad945b23fbbe6e
MOVE        v7 deployed bundle / 26-step window
ATTACK      v10F-after-run-35516619170 / threshold .5 / 5-step window / cooldown 420ms
JUMP        v11H2 run 35748844599 / sparse 96 DN / CONCAT4 / threshold .5 /
            persistence 2 / cooldown 38 brain steps / obstacle LC4=false
~~~

learned weights, selected DN, threshold, persistence, cooldown, sensory population은 결과를 보고 변경하지 않는다.

## Course

H2 browser geometry를 그대로 사용한다.

~~~text
player width      34
obstacle          38 x 54
target offset     160
start distances   155 / 195 / 235 / 275
side              L / R balanced
player-center -> target-center = obstacle-front distance d + 215px
target HP         30
ATTACK damage     10
~~~

따라서 KILL에는 실제 melee hit 3회가 필요하다.

Target sensory: LC10a + LPLC1 + LPLC2 + LC4.
Obstacle sensory: LC6 + LC16 + LC22 + LPLC4.
Obstacle sensory에는 LC4를 사용하지 않는다.
Target distance는 deployed browser와 동일한 horizontal abs(dx)다.

## Policy input 제한

각 policy는 frozen DN feature만 입력받는다.

금지:

~~~text
target side -> LEFT/RIGHT
obstacle distance -> JUMP
attack range -> ATTACK
target HP -> ATTACK
obstacle cleared -> policy action
correct action / seed / distance bin / side -> policy input
~~~

game state는 physics, collision, hit 판정, outcome/metric 계산에만 사용한다.

## Runtime

~~~text
brain step          0.02s
settle              26 steps
visual-off baseline 26 steps
MOVE window         26 steps
ATTACK window        5 steps
JUMP window          5 steps
ATTACK cooldown     21 brain steps = 420ms
JUMP cooldown       38 brain steps
episode limit        8.0s
~~~

JUMP availability는 grounded + cooldown만 사용한다.
ATTACK은 learned output이 ATTACK이고 cooldown이 끝났을 때만 actuate한다.
hit은 browser melee hitbox overlap으로 판정한다.

## Fixed evaluation

새 integration seeds:

~~~text
2301000
2311000
2321000
~~~

각 seed는 4 distances x 2 sides = 8 episodes, 총 24 episodes.
결과 확인 후 seed/geometry를 resample하지 않는다.

## Metrics

- obstacle clear
- JUMP before obstacle clear
- actual JUMP count
- actual ATTACK count
- ATTACK before obstacle clear
- ATTACK while airborne
- hit / whiff
- target kill
- course complete = obstacle clear AND target kill
- timeout
- ATTACK hit precision = hits / actual attacks

## Frozen integration acceptance gate

~~~text
aggregate course completion     >= 75%
every seed completion           >= 62.5%
obstacle clear                  >= 87.5%
target kill                     >= 75%
timeout                         <= 25%
mean actual JUMPs               <= 1.75
pre-clear ATTACK episode rate   <= 30%
airborne ATTACK episode rate    <= 30%
ATTACK hit precision            >= 50%
~~~

FAIL이면 threshold / sensory / seed / gate를 사후 변경하지 않는다.
실패 위치를 MOVE / JUMP / ATTACK / arbitration / geometry-runtime equivalence로 분해하고,
필요한 보정은 다음 prereg에서 별도로 검증한다.
