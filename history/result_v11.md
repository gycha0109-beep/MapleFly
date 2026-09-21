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


---

## Phase B — obstacle sensory separability assay

판정:

~~~text
V11B-SENSORY-GATE=PASS
~~~

Workflow:

~~~text
run      35543660671
head     a0ec7e8c56600f4ccb57fdf693447e2b63304cd9
artifact 10615429165
digest   sha256:5178991d436b0c423557a7e0462245598f773568a019ce8b242428c7779d70d6
~~~

unseen evaluation:

~~~text
Run 1 FULL            82.8%
Run 2 FULL            87.5%
Run 3 FULL            85.9%

mean FULL              85.4%
LABEL_SHUFFLED         45.8%
FULL - LABEL_SHUFFLED +39.6%p
DN_PERMUTED            50.5%
FULL - DN_PERMUTED    +34.9%p

paired ON/OFF L2 mean   2.0167
minimum run FULL        82.8%
~~~

사전 gate:

~~~text
mean FULL >= 80%                 PASS
every FULL run >= 70%            PASS
FULL - LABEL_SHUFFLED >= 20pp    PASS
~~~

해석:

- obstacle LC4 cue는 unseen seed에서도 frozen MaleCNS DN state에 선형 분리 가능한 흔적을 만든다.
- DN identity permutation에서 약 chance까지 붕괴하므로 단순 global-rate 증가만으로 설명되지 않는다.
- Phase A의 jump-spam 실패를 "obstacle sensory cue가 brain에 전달되지 않았다"로 설명할 수 없다.
- 다음 단계는 sensory encoding 변경이 아니라 action-learning 구조를 바꾸는 것이다.


---

## Phase C — single-jump reward-only tutorial

판정:

~~~text
V11C-JUMP-GATE=FAIL
~~~

Workflow:

~~~text
run      35544510915
head     2c7f1880870fd156353df2bec0ea8ed4ea8e4438
artifact 10616841358
digest   sha256:32ba178ad3d6af7d97462ede099b3c5e32b88bcdd07b032eef17d768ad29ecc4
~~~

Practice:

~~~text
Cohort 1 obstacle clear   0.0%
         timeout        100.0%
         mean jumps       1.0
         NO_OBS jump    100.0%

Cohort 2 obstacle clear   0.0%
         timeout        100.0%
         mean jumps       1.0
         NO_OBS jump     83.3%

Cohort 3 obstacle clear   0.0%
         timeout        100.0%
         mean jumps       1.0
         NO_OBS jump     39.6%
~~~

Final unseen:

~~~text
Run 1 FULL          0.0%
Run 2 FULL          9.4%
Run 3 FULL         18.8%

mean FULL           9.4%
VISUAL_OFF          0.0%
DN_SHUFFLED         0.0%
NO_OBSTACLE jump    0.0%
NO_OBSTACLE reach 100.0%
FULL timeout       90.6%
FULL actual jumps   1.0
~~~

사전 gate와 비교:

~~~text
mean FULL >= 70%                    FAIL
every FULL run >= 60%               FAIL
FULL - VISUAL_OFF >= 25pp           FAIL (+9.4pp)
FULL - DN_SHUFFLED >= 20pp          FAIL (+9.4pp)
FULL timeout <= 25%                 FAIL
NO_OBSTACLE target reach >= 85%     PASS
NO_OBSTACLE any-jump <= 30%         PASS
~~~

## Phase C 해석

Phase A의 obstacle-independent jump spam은 제거됐다.

Final에서:

~~~text
FULL           actual jump = 1.0 / episode
VISUAL_OFF     clear = 0%
DN_SHUFFLED    clear = 0%
NO_OBSTACLE    jump = 0%
~~~

이므로 learned policy가 obstacle sensory/DN identity와 무관하게
항상 점프하는 상태는 아니다.

그러나 FULL에서도 clear가 9.4%에 불과하고 timeout이 90.6%다.

현재 근거가 지지하는 범위는:

~~~text
obstacle cue에 의존한 JUMP 선택성은 생겼다.
하지만 useful jump timing은 학습되지 않았다.
~~~

이다.

특히 FULL의 blocked-window 평균이 run별 약 27.2~32.9로 매우 높아,
실제 1회 jump가 obstacle clearance에 유효한 시간대로 충분히 정렬되지 않았음을 시사한다.

정확한 early/late 분포는 artifact의 per-episode
`firstJumpStep` / `firstJumpFrontDistance`를 별도 timing audit으로 추출해 판정한다.


### Phase C timing audit

기존 authoritative artifact `10616841358`만 다시 읽었다.
MaleCNS는 재실행하지 않았다.

~~~text
audit run      35549956342
audit artifact 10617784401
source run     35544510915
source artifact 10616841358
~~~

FULL 96 episodes:

~~~text
jumped episodes   96 / 96
clear              9 / 96
timeout           87 / 96
~~~

첫 JUMP obstacle-front distance:

~~~text
ALL
median 168 px
mean   163.9 px

CLEAR
median 118 px
mean   121.6 px

FAILED
median 174 px
mean   168.3 px
~~~

첫 JUMP decision step:

~~~text
CLEAR
median 50
mean   47.8

FAILED
median 15
mean   21.4
~~~

blocked windows:

~~~text
CLEAR  median 0
FAILED median 33
~~~

따라서 Phase C의 주된 실패 모드는
**cue가 없는 것이 아니라 obstacle cue의 이른 구간에서 jump budget을 너무 빨리 소비하는 것**이다.

현재 물리에서도 이 차이는 일관된다.
초기 수평 속도 280 px/s, jump air-time 약 0.857 s이고,
player width 34 + obstacle width 38까지 완전히 넘어가려면
jump 시작 후 약 240 px 이내에 far edge clearance가 끝나야 한다.
따라서 아주 먼 거리에서 시작한 jump는 착지 전에 obstacle 전체를 넘지 못할 수 있다.

이 기하학 계산은 진단/환경 검증용이며
다음 learner의 policy input이나 정답 timing label로 사용하지 않는다.
