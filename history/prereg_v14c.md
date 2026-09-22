# prereg_v14c — frozen v14B candidate metric-correction validation

## 목적

v14B는 preregistered airborne ATTACK episode gate 하나 때문에 FAIL했다.

동시에 v14B final은:

~~~text
course completion      100%
obstacle clear         100%
target kill            100%
timeout                  0%
mean JUMPs               1.458
post-clear JUMP ep       4.2%
ATTACK precision        58.1%
~~~

이었다.

사후 count에서 airborne ATTACK은 124 actual ATTACK 중 17회 = 13.7%였지만,
그 17회가 16개 episode에 분산되어 episode-level rate는 66.7%가 됐다.

v14C는 v14B를 소급 PASS 처리하지 않는다.
v14B weights를 **재학습 없이 그대로 freeze**하고,
새 unseen seed에서 action-level interference metric을 사전등록해 검증한다.

## Frozen candidate

~~~text
source run       35798458282
source artifact  10725136545
candidate        src/brain/fly-interruption-v14b-candidate.json
history          CONCAT12
ATTACK head      frozen
JUMP head        frozen
threshold        P(ACCEPT) >= 0.5
~~~

weights / bias / history / threshold를 v14C에서 변경하지 않는다.

## Lower-level contract

v7 MOVE, v10F ATTACK, v11H2 JUMP와 sensory / cooldown / physics / matched geometry는
v14B와 동일하게 고정한다.

MOVE는 interruption 대상이 아니다.

## New unseen validation

~~~text
2751000
2761000
2771000
~~~

각 seed:
4 distances x 2 sides = 8 episodes.

총 24 episodes.
v14B practice/final에 사용하지 않은 seed다.

## Metrics

기존 v14B metrics를 모두 기록한다.

추가로:

~~~text
airborne ATTACK action fraction
  = airborne actual ATTACK count / all actual ATTACK count

per-seed airborne ATTACK action fraction
~~~

기존 airborne ATTACK episode rate도 telemetry로 계속 기록하지만
v14C acceptance gate로 사용하지 않는다.

이 변경은 v14B 결과를 소급 변경하는 것이 아니라
새 unseen validation에만 적용한다.

## Frozen v14C gate

~~~text
course completion                    >=75%
every seed completion                >=62.5%
obstacle clear                       >=87.5%
LEFT obstacle clear                  >=87.5%
RIGHT obstacle clear                 >=87.5%
target kill                          >=75%
timeout                              <=25%
mean actual JUMPs                    <=1.75
post-clear JUMP episode              <=25%
pre-clear ATTACK episode             <=30%
ATTACK hit precision                 >=50%

aggregate airborne ATTACK action     <=20%
every-seed airborne ATTACK action    <=25%
~~~

20%는 "실제 ATTACK 다섯 번 중 한 번 이하가 airborne"라는 action-level 제한이다.
per-seed 25% 제한을 함께 두어 aggregate 평균만으로 한 seed의 실패를 숨기지 않는다.

## 결과 처리

PASS:
- v14B frozen candidate를 v14C-validated candidate로 승격한다.
- 그 뒤 browser wiring / deterministic deployment smoke를 수행한다.

FAIL:
- v14B candidate는 계속 미배포 상태로 둔다.
- v14C seed/gate를 사후 변경하지 않는다.
- 새로운 학습 phase를 별도 prereg한다.
