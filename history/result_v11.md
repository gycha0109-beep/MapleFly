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


---

## Phase D — random one-jump outcome classifier

판정:

~~~text
V11D-JUMP-GATE=FAIL
~~~

Workflow:

~~~text
run      35550206430
head     2c9daa3320d597e417217e5ccb2dcc2ffeb56953
artifact 10618482118
digest   sha256:3709991bed590ecfeea023a0229a27ce228deade0a830ff20db1ee53455ffd9e
~~~

Practice support:

~~~text
CLEAR 130
FAIL  158
support gate PASS
practice clear rate 45.1%
~~~

practice random-jump outcome은 세 cohort 모두 충분한 양쪽 class를 만들었다.

~~~text
cohort 1 CLEAR 45 / FAIL 51
cohort 2 CLEAR 43 / FAIL 53
cohort 3 CLEAR 42 / FAIL 54
~~~

random practice의 평균 first-jump distance:

~~~text
cohort 1 CLEAR  51.6 px / FAIL 183.5 px
cohort 2 CLEAR  59.2 px / FAIL 181.9 px
cohort 3 CLEAR  69.0 px / FAIL 176.7 px
~~~

Final unseen:

~~~text
Run 1 FULL 12.5% / VISUAL_OFF 62.5% / SHUFFLED 0.0%
Run 2 FULL 18.8% / VISUAL_OFF 56.3% / SHUFFLED 0.0%
Run 3 FULL 12.5% / VISUAL_OFF 40.6% / SHUFFLED 0.0%

mean FULL         14.6%
mean VISUAL_OFF   53.1%
mean DN_SHUFFLED   0.0%
FULL timeout      85.4%
NO_OBS any jump   39.6%
NO_OBS reach     100.0%
~~~

사전 gate는 FAIL이다.

특히:

~~~text
FULL - VISUAL_OFF = -38.5%p
~~~

로 방향이 역전됐다.

이 결과는 obstacle cue가 없을 때 더 잘 학습됐다는 뜻으로 해석하지 않는다.
Phase B에서 LC4 cue 자체의 DN separability는 이미 PASS했다.

더 가능성이 높은 설명은,
FULL의 LC4-driven state가 classifier threshold를 **너무 이른 시점에 먼저 통과**해
single-jump budget을 소모하고,
VISUAL_OFF에서는 그 early trigger가 사라져 일부 episode에서
target-approach state가 더 늦게 threshold를 넘는 현상이다.

이를 확인하기 위해 기존 authoritative artifact의
FULL / VISUAL_OFF first-jump step과 obstacle-front distance를 별도 audit한다.


### Phase D timing audit

기존 authoritative artifact만 읽은 분석-only CI:

~~~text
run      35587347745
artifact 10632953594
digest   sha256:131963a4a52fa5c53dc9209b090c6aedae6c58d94cab6fde360c853a1da20f69
~~~

FULL:

~~~text
first-jump distance median      150 px
successful first-jump median    118 px
failed first-jump median        174 px

first-jump step median            30
successful step median            40
failed step median                15
~~~

VISUAL_OFF:

~~~text
first-jump distance median        0 px
first-jump step median          100
clear 51 / 96
~~~

즉 Phase D의 역전 현상은 obstacle cue가 유용하지 않아서가 아니라,
LC4가 켜진 FULL에서 classifier가 너무 일찍 threshold를 넘는 경우가 많아
single-jump budget을 조기 소모하는 **early-trigger preemption**으로 설명된다.

다음 Phase는 classifier/threshold를 재학습·재튜닝하지 않고,
동일 frozen classifier의 positive가 연속 window에서 지속될 때만 actuator를 허용하는
temporal persistence를 새 unseen seed에서 검증한다.


---

## Phase E — frozen classifier + 2-window persistence

판정:

~~~text
V11E-JUMP-GATE=PASS
~~~

Workflow:

~~~text
run      35596856019
head     5d460569816b342010aa8ad8320f040e8053ef64
artifact 10636579724
digest   sha256:fde1df68e40c0908d090e1b61749a714ab7cc3c19898a9746ce0e43a98544afe
~~~

Final unseen:

~~~text
Run 1 FULL 90.6% / VISUAL_OFF 0% / SHUFFLED 0%
Run 2 FULL 71.9% / VISUAL_OFF 0% / SHUFFLED 0%
Run 3 FULL 96.9% / VISUAL_OFF 0% / SHUFFLED 0%

mean FULL          86.5%
minimum FULL       71.9%
FULL timeout       13.5%
VISUAL_OFF          0.0%
DN_SHUFFLED         0.0%
NO_OBSTACLE jump    0.0%
NO_OBSTACLE reach 100.0%
~~~

사전 gate는 전 항목 PASS다.

Phase D의 frozen classifier와 threshold 0.5는 변경하지 않았고,
positive threshold가 2개 연속 5-step window에서 유지되어야
JUMP actuator를 허용한 것만 달라졌다.

따라서 Phase E는 frozen MaleCNS DN classifier + 2-window temporal persistence가
unseen obstacle-specific JUMP timing을 single-jump tutorial 조건에서 통과한 것으로 판정한다.

아직 실제 runtime 배치 조건은 아니다.
episode당 1회 jump budget을 사용했으므로
다음 Phase F에서 제한 제거 + 실제 750 ms cooldown/self-retry를 검증한다.


---

## Phase F — real cooldown + self-retry

판정:

~~~text
V11F-JUMP-GATE=PASS
~~~

Workflow:

~~~text
run      35607509887
head     90f3e14f9c1e2456a84624826051357548b1e4b6
artifact 10643127642
digest   sha256:80c316f633b5fb97e8de3123eaf4271542ef4b5917612e9814e265687e2577b9
~~~

Final unseen:

~~~text
Run 1 FULL 100.0% / VISUAL_OFF 0.0% / SHUFFLED 0.0%
Run 2 FULL 100.0% / VISUAL_OFF 0.0% / SHUFFLED 0.0%
Run 3 FULL 100.0% / VISUAL_OFF 0.0% / SHUFFLED 0.0%

mean FULL          100.0%
minimum FULL       100.0%
FULL timeout         0.0%
FULL actual jumps    1.198
FULL retry jumps     0.198
VISUAL_OFF            0.0%
DN_SHUFFLED           0.0%
NO_OBSTACLE jump      0.0%
NO_OBSTACLE reach   100.0%
~~~

사전 Phase F gate는 전 항목 PASS다.

single-jump budget을 제거하고 real 750 ms cooldown을 복원했는데도
frozen Phase E policy는 새 unseen seed에서 96/96 obstacle episode를 모두 clear했다.

약 19.8% episode에서는 첫 점프 뒤 실제 self-retry가 발생했으며,
NO_OBSTACLE에서는 점프가 전혀 발생하지 않았다.

따라서 Skill03 JUMP의 학습 정책은 headless 조건에서
runtime actuator 제약까지 통과한 것으로 판정한다.
