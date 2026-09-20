# MapleFly v11 결과 — Fly #001 Skill03 JUMP Phase A

## 판정

~~~text
V11-JUMP-GATE=FAIL
~~~

Workflow:

~~~text
run      35542467674
head     2bccf61b453ebce9e754f3928b01234e9168ac04
artifact 10614624566
digest   sha256:1384794a6d6d62a38fd8481709d5134ec2a6b4bdae09f2971c88fe95cca11601
receipt commit
3141a206b098902a46c44aaee6b2399ea6b75864
~~~

syntax / experiment / upload / receipt / enforce step은 모두 success다.
과학적 gate만 FAIL이다.

## Practice

~~~text
Cohort 1
obstacle clear       100.0%
timeout                0.0%
mean jumps             1.917
NO_OBSTACLE reach     100.0%
NO_OBSTACLE any jump  100.0%

Cohort 2
obstacle clear       100.0%
timeout                0.0%
mean jumps             2.000
NO_OBSTACLE reach     100.0%
NO_OBSTACLE any jump  100.0%

Cohort 3
obstacle clear       100.0%
timeout                0.0%
mean jumps             2.000
NO_OBSTACLE reach     100.0%
NO_OBSTACLE any jump  100.0%
~~~

epsilon이 줄어도 불필요 점프가 줄지 않았다.

## Final unseen

세 run 모두 동일한 패턴이었다.

~~~text
FULL clear           100.0%
VISUAL_OFF clear     100.0%
DN_SHUFFLED clear    100.0%
FULL timeout           0.0%
FULL mean jumps        2.0
NO_OBSTACLE reach    100.0%
NO_OBSTACLE any jump 100.0%
NO_OBSTACLE mean jumps 2.25
~~~

평균:

~~~text
FULL                    100.0%
VISUAL_OFF              100.0%
FULL - VISUAL_OFF         0.0%p
DN_SHUFFLED             100.0%
FULL - DN_SHUFFLED        0.0%p
NO_OBSTACLE any jump    100.0%
NO_OBSTACLE target reach 100.0%
~~~

사전 gate와 비교:

~~~text
FULL clear >= 70%                    PASS
FULL - VISUAL_OFF >= 25pp            FAIL
FULL - DN_SHUFFLED >= 20pp           FAIL
every FULL run >= 60%                PASS
FULL timeout <= 25%                  PASS
FULL mean actual jumps <= 2.0        PASS (boundary)
NO_OBSTACLE any-jump <= 30%          FAIL
NO_OBSTACLE target reach >= 85%      PASS
~~~

## 해석

이 결과는 JUMP skill 학습 성공이 아니다.

정책은 obstacle cue나 DN identity에 의존하지 않고
거의 모든 episode에서 반복적으로 점프하는 degenerate strategy로 수렴했다.

즉:

~~~text
"장애물을 보고 점프"
아님

"항상 점프하면 obstacle도 통과하고 no-obstacle target도 도달"
에 가까움
~~~

현재 reward 구조에서는 obstacle episode의 +2와
NO_OBSTACLE episode의 +1이 모두 jump spam으로 획득 가능하고,
실제 jump penalty -0.02는 이를 억제하기에 충분하지 않았다.

다만 이 해석만으로 LC4 obstacle cue가 MaleCNS DN에 전달되지 않았다고
결론내릴 수는 없다.

사전 분석 순서대로 다음은 action learning을 중단하고
LC4 obstacle cue ON/OFF가 matched sensory trajectory에서
DN feature를 실제로 분리시키는지 먼저 측정한다.

gate를 낮추지 않는다.
