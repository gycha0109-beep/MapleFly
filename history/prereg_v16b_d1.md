# prereg_v16b_d1 — POTION failure localization

## 0. 목적

v16B authoritative continuous ecology는 다음을 동시에 보였다.

```text
lower-skill ecology
  obstacle clear 100.0%
  target kill     77.4%
  attack precision 65.9%

POTION
  84 decisions
  4 DRINK
  0% 48-second survival
```

따라서 다음 질문을 먼저 분리한다.

> frozen v15D POTION이 continuous ecology에서 WAIT-biased가 된 원인이
> (A) injury load가 v15 training range를 벗어났기 때문인지,
> (B) target/obstacle visual sensory가 injury representation을 방해하기 때문인지,
> 또는 이 single-cycle diagnostic으로 설명되지 않는 persistent-state 요인인지?

이 실험은 **diagnostic only**다.

- 새 학습 없음
- deployed v15D 변경 없음
- threshold 변경 없음
- history/window 변경 없음
- sensory gain tuning 없음
- v16B를 PASS로 재실행하지 않음

---

## 1. frozen provenance

```text
MaleCNS
  alextitonis/fly.ai
  95a3dbcb05241b0a5c07028ca8ad945b23fbbe6e

POTION status
  V15D_DEPLOYED

representation
  33fc31f636e1cde215841dd33b0a93b24d4571cdabd32e9a1edc8fa2e696c847

policy
  47088bcb15ed2cd96f64d67a20169934bd7a866dcd56bacffea70b1f42537a59

v16B closure
  d5e69cdfa058e8f912b11b09ca8e2001044851dd
```

POTION policy는 browser-deployed bundle을 그대로 호출한다.

---

## 2. 공통 episode contract

각 row는 독립적인 4.8-second POTION cycle이다.

```text
brain step       20 ms
settle           26 steps
baseline         26 steps
frame            5 steps = 100 ms
history          48 frames = 4.8 s
taste            final frame only, bilateral 0.8
ground SNta      bilateral 0.05
LgLG drive       0.7
LgLG pulse       6 steps = 120 ms
```

각 row마다 새 MaleCNS instance를 만든다.
baseline은 ground-only에서 측정한다.

정책은 HP, damage count, class, context label을 입력받지 않는다.

---

## 3. fresh cohort

```text
base seeds
  3201000
  3201100
  3201200

replicates
  2

brain seed
  baseSeed + replicate*17 + 1
```

각 동일 `baseSeed + replicate + injuryCount` 조합은 모든 sensory context에서
동일 brain seed와 동일 injury event schedule/side를 사용한다.

paired comparison이다.

---

## 4. injury-load sweep

기존 v15 injury candidate slots를 그대로 사용한다.

```text
IMPACT_STARTS
  25,55,85,115,145,175
```

injury count:

```text
0,1,2,3,4,5,6
```

0..3은 v15 reward-policy training support와 직접 겹친다.

4..6은 **새 학습용 class가 아니라 diagnostic OOD probe**다.

event 선택/side RNG는 v15A12와 동일한 rule을 사용한다.

```text
rng seed = brainSeed + 500000
shuffle IMPACT_STARTS
take first injuryCount
side L/R from same RNG
sort by start
```

---

## 5. sensory contexts

### C0 CLEAN

v15C와 동일하다.

```text
ground + LgLG injury + final-frame taste
```

visual sensory 없음.

### C1 TARGET_STATIC

C0에 고정 target visual을 더한다.

고정 virtual target:

```text
side R
distance 120
approaching 0
```

v16B/browser target encoder 식을 그대로 적용한다.

```text
closeness = clamp(1-distance/620,0,1)

LC10a_R = clamp(0.12 + closeness*0.68,0,0.8)
LPLC1_R = clamp(closeness*0.12,0,0.55)
LPLC2_R = clamp(closeness*0.24,0,0.8)

distance < 175:
LC4_R = clamp(((175-distance)/175)*0.72,0,0.8)
```

### C2 OBSTACLE_STATIC

C0에 고정 obstacle visual을 더한다.

```text
side R
frontDistance 60
radius 170

obstacleDrive =
  clamp(((170-60)/170)*0.8,0,0.8)
```

동일 drive를 다음에 넣는다.

```text
LC6_R
LC16_R
LC22_R
LPLC4_R
```

### C3 TARGET_OBSTACLE_STATIC

C1 + C2를 동시에 넣는다.

### C4 FULL_DYNAMIC_VISUAL

실제 action을 oracle로 scripted하지 않는다.
오직 visual distractor trajectory만 preregistered하게 변화시킨다.

target:

```text
step 0..159:
  distance linearly 320 -> 60

step 160..239:
  distance 60
```

approaching은 v16B/browser 식:

```text
clamp((previousDistance-distance)/45,0,1)
```

target channels는 C1과 동일한 exact encoder 식을 매 step 적용한다.

obstacle:

```text
step 0..99:
  frontDistance linearly 140 -> 0

step 100..119:
  frontDistance 0

step 120..239:
  obstacle visual OFF
```

obstacle channel 식은 C2와 동일하다.

이 condition은 MOVE/JUMP/ATTACK action을 실행하지 않는다.
목적은 **visual sensory alone가 frozen POTION representation에 미치는 영향**만 분리하는 것이다.

---

## 6. row count

```text
3 base seeds
x 2 replicates
x 7 injury counts
x 5 contexts
= 210 rows
```

각 row는 240 live brain steps다.

---

## 7. frozen POTION evaluation

각 row에서 browser-deployed v15D API로:

```text
24 runtime DN
48 frames
256 frozen features
Q_WAIT
Q_DRINK
greedy action
```

을 계산한다.

현재 frozen model에서 Q_DRINK=0인 사실은 diagnostic으로 기록하지만 변경하지 않는다.

---

## 8. primary summaries

각 context x injuryCount에 대해:

```text
n
DRINK rate
mean/min/max Q_WAIT
mean/min/max Q_DRINK
mean Q margin = Q_DRINK - Q_WAIT
```

paired row마다 CLEAN 대비:

```text
delta Q_WAIT
delta Q margin
action flip
```

을 기록한다.

---

## 9. controlled-support audit

0..3 injury count에 대해서 기존 reward-optimal label을 evaluator에서만 사용한다.

```text
0 -> WAIT
1 -> WAIT
2 -> DRINK
3 -> DRINK
```

각 context의:

```text
WAIT recall
DRINK recall
balanced accuracy
```

를 계산한다.

label은 policy input이 아니다.

---

## 10. preregistered diagnostic classification

### D0 — CLEAN_REPLICATION_FAILURE

먼저 C0 CLEAN이 frozen v15D controlled behavior를 재현해야 한다.

C0, injury 0..3:

```text
balanced accuracy >= 70%
WAIT recall        >= 60%
DRINK recall       >= 60%
```

하나라도 미달이면:

```text
V16B_D1_CLEAN_REPLICATION_FAILURE
```

이 경우 다른 causal classification을 하지 않는다.

### D1 — INJURY_LOAD_OOD

CLEAN replication이 PASS한 뒤 검사한다.

C0에서 high injury 4..6의 DRINK rate가:

```text
< 60%
```

이면:

```text
INJURY_LOAD_OOD = true
```

이는 visual interference 없이도 training-support 밖의 injury load에서 frozen readout이
WAIT로 되돌아가는 현상을 의미한다.

### D2 — VISUAL_INTERFERENCE

CLEAN replication이 PASS한 뒤 각 visual context C1..C4의 support-range 0..3 BA를
C0와 비교한다.

visual context 중 하나라도:

```text
C0_BA - context_BA >= 20 percentage points
```

또는 injury 2..3 DRINK recall이:

```text
C0_DRINK_RECALL - context_DRINK_RECALL >= 20 percentage points
```

이면:

```text
VISUAL_INTERFERENCE = true
```

가장 처음 악화되는 context는 다음 고정 순서로 기록한다.

```text
TARGET_STATIC
OBSTACLE_STATIC
TARGET_OBSTACLE_STATIC
FULL_DYNAMIC_VISUAL
```

### D3 — SINGLE_CYCLE_EXPLANATION_INCOMPLETE

CLEAN replication PASS이며:

```text
INJURY_LOAD_OOD = false
VISUAL_INTERFERENCE = false
```

이면:

```text
SINGLE_CYCLE_EXPLANATION_INCOMPLETE = true
```

이 경우 다음 diagnostic은 persistent brain/history carryover를 직접 시험해야 한다.

---

## 11. outcome vocabulary

가능한 primary outcome:

```text
V16B_D1_CLEAN_REPLICATION_FAILURE

V16B_D1_INJURY_LOAD_OOD
V16B_D1_VISUAL_INTERFERENCE
V16B_D1_INJURY_LOAD_OOD_PLUS_VISUAL_INTERFERENCE

V16B_D1_SINGLE_CYCLE_EXPLANATION_INCOMPLETE
```

둘 이상의 원인이 동시에 검출되면 combined outcome을 사용한다.

이 diagnostic은 v16B PASS/FAIL을 변경하지 않는다.

---

## 12. stop rule

authoritative 결과를 본 뒤 다음을 변경하지 않는다.

```text
fresh seeds
replicate count
injury counts
impact slots
sensory gains
visual geometry/proxy trajectory
history length
decision timing
diagnostic thresholds
classification rules
```

결과를 freeze한 뒤 다음 실험을 별도 preregister한다.

특히 v15D threshold/weights를 이 결과를 보고 수정하지 않는다.
