# prereg_v13 — learned proposal arbiter

## 문제

v12 integrated course는 obstacle clear 100%였지만 최종 gate는 FAIL이었다.

~~~text
course complete       75.0%
mean JUMPs             2.542  FAIL
airborne ATTACK ep    83.3%   FAIL
ATTACK precision      40.1%   FAIL
~~~

diagnostic run 35788788672에서 airborne ATTACK precision은 9.5%, ground ATTACK precision은 51.3%였다.
현재 runtime에는 v7/v10F/v11H2 proposal 사이를 학습해서 선택하는 계층이 없다.

game-state 조건식으로 "공중이면 공격 금지", "사거리면 정지"를 추가하지 않는다.

## 가설

frozen learned skills의 proposal/confidence만 보는 작은 learned arbiter가
MOVE / JUMP / ATTACK / HOLD 중 실제 actuate mode를 reward로 학습하면,
기존 세 skill을 수정하지 않고 continuation interference를 줄일 수 있다.

## Frozen lower-level skills

~~~text
MOVE   v7-run2-top64
ATTACK v10f-after-run-35516619170
JUMP   v11h2-after-run-35748844599
~~~

lower-level weights / DN selection / thresholds / persistence / cooldown / sensory channels는 변경하지 않는다.

## Arbiter input

5 brain-step마다 최신 lower-level proposal에서 다음 8개 bounded feature만 사용한다.

~~~text
1. bias = 1
2. tanh(v7 signed move score)
3. abs(tanh(v7 signed move score))
4. v10F ATTACK probability
5. ATTACK probability - 0.5
6. v11H2 JUMP probability (not-ready -> 0)
7. v11H2 WAIT probability (not-ready -> 0)
8. JUMP probability - WAIT probability
~~~

금지 input:

~~~text
player x/y
target x/y or distance
obstacle x/y or distance
grounded flag
attack hitbox overlap
target HP
obstacle-cleared flag
seed / side / distance bin
correct action label
~~~

grounded/cooldown은 기존 lower-level runtime의 action availability mask에만 사용한다.
arbiter numeric feature에는 넣지 않는다.

## Candidate modes

~~~text
MOVE
  latest v7 LEFT/RIGHT proposal을 5-step interval에 적용

JUMP
  v11H2가 JUMP를 proposal했고 기존 grounded/cooldown availability가 true일 때만 candidate
  v7 movement를 유지하면서 JUMP pulse actuate

ATTACK
  v10F가 ATTACK을 proposal했고 기존 cooldown이 끝났을 때만 candidate
  ATTACK pulse를 actuate하고 다음 5-step interval의 horizontal movement는 HOLD

HOLD
  다음 5-step interval horizontal movement 0
~~~

arbiter가 lower-level skill이 제안하지 않은 JUMP/ATTACK을 발명할 수 없다.

## Learner

4-action masked linear softmax policy.

~~~text
feature count      8
actions            MOVE / JUMP / ATTACK / HOLD
initial weights    0
training           episodic REINFORCE
gamma              0.97
learning rate      0.02
L2                 0.0005
weight clamp       [-4, +4]
sampling temp      1.0
episode baseline   mean return within episode
trainer RNG seed   913001
~~~

결과를 보고 hyperparameter를 변경하지 않는다.

## Reward

reward는 training signal일 뿐 policy input이 아니다.

5-step transition:

~~~text
target progress
  clamp((previous horizontal target distance - new distance) / 28, -1, +1) * 0.15

first obstacle clear   +1.5
successful hit         +1.5
whiff                  -0.75
actuated JUMP          -0.10
course complete        +5.0
timeout                -3.0
~~~

target/obstacle game state는 reward/outcome 계산에만 사용한다.

## Practice

~~~text
base seeds  2401000 / 2411000 / 2421000
3 blocks per base seed
block        4 distances x 2 sides
episodes     72
distance     155 / 195 / 235 / 275
max          8.0s
~~~

각 block의 brain seed는 baseSeed + block index.
episode order는 trainer RNG 913001로 deterministic shuffle한다.

practice와 final seed는 분리한다.

## Final evaluation

~~~text
2451000
2461000
2471000

각 seed 8 episodes
총 24 episodes
deterministic argmax policy
~~~

final에서는 학습을 중단하고 weights를 고정한다.

## Final gate

v12 acceptance 기준을 그대로 재사용한다.

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

추가 requirement:

~~~text
all final policy numeric inputs must be derivable only from frozen lower-level proposal outputs
~~~

FAIL이면 final gate/seed/lower-level skill을 사후 변경하지 않는다.
implementation bug만 수정 가능하다.
