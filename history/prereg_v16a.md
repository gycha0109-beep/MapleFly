# prereg_v16a — 5-skill 통합 자율행동 baseline

## 0. 목적

v15D에서 POTION v15까지 배포가 닫혔다.

v16A의 질문은 새 skill을 학습시키는 것이 아니다.

> 이미 배포된 MOVE v7 + ATTACK v10F + JUMP v11H2 + v14C interruption +
> POTION v15를 **한 에피소드에서 동시에 켰을 때**, 각 skill이 단독/이전 검증에서
> 확보한 기능을 유지하면서 하나의 frozen MaleCNS 위에서 공존할 수 있는가?

이 실험은 **통합 baseline**이다.

- 새 학습 없음
- 새 weight 없음
- threshold 변경 없음
- connectome weight 변경 없음
- sensory gain 변경 없음
- 기존 skill 수정 없음
- 결과를 본 뒤 gate/seed/window를 조정하지 않음

v16A 결과가 FAIL이면 FAIL을 보존하고 별도 prereg diagnostic으로 넘어간다.

---

## 1. frozen scientific objects

### MaleCNS

```text
repository  alextitonis/fly.ai
commit      95a3dbcb05241b0a5c07028ca8ad945b23fbbe6e
neurons     166700
synapses    25088107
DN          1316
```

connectome synaptic weight는 끝까지 frozen이다.

### deployed skills

```text
MOVE        v7
ATTACK      v10F
JUMP        v11H2
interruption v14C
POTION      v15D
```

POTION frozen objects:

```text
representation
33fc31f636e1cde215841dd33b0a93b24d4571cdabd32e9a1edc8fa2e696c847

policy
47088bcb15ed2cd96f64d67a20169934bd7a866dcd56bacffea70b1f42537a59

deployment activation
468334a93413b25cb4c4847a86ad01cdbef8a6ca
```

---

## 2. 핵심 금지사항

runtime action을 정답 game state로 직접 선택하지 않는다.

금지 예:

```text
target right -> RIGHT
distance < range -> ATTACK
obstacle near -> JUMP
airborne -> ATTACK 금지
HP < threshold -> DRINK
missingHP -> DRINK
impact count -> DRINK
classIndex -> DRINK
correct action -> DRINK
```

환경/평가기는 다음 hidden state를 outcome 계산에만 사용할 수 있다.

```text
HP
damage count
injury class
potion use
terminal HP
oracle G
course completion
```

이 값들은 frozen policy input에 추가하지 않는다.

---

## 3. 통합 episode

### 길이

```text
brain step       20 ms
live steps       400
live horizon     8.0 s
settle steps     26
baseline steps   26
```

target이 일찍 죽어도 episode는 400 live step까지 계속한다.
이는 첫 POTION 4.8 s cycle과 이후 6회 future damage를 모두 관측하기 위함이다.

target은 v16A에서 respawn하지 않는다.

### geometry

v14C와 동일한 matched obstacle course를 사용한다.

```text
start distances  [155, 195, 235, 275]
sides            [L, R]
obstacle         38 x 54
target offset    160
target HP        30
attack damage    10
attack range     76
```

target kill 뒤에는 target visual drive를 끈다.
obstacle visual drive는 obstacle을 통과하면 기존 방식대로 꺼진다.

---

## 4. paired cohort

fresh base seeds:

```text
3001000
3011000
3021000
```

각 base seed마다:

```text
4 distances
x 2 sides
x 4 injury classes
= 32 episodes
```

전체:

```text
96 episodes
```

동일 geometry의 class 0/1/2/3은 동일 brain seed를 공유한다.

```text
brainSeed = baseSeed + distanceIndex*10 + sideIndex
```

따라서 injury burden만 paired하게 달라진다.

---

## 5. injury sensory + 실제 HP damage

### pre-decision impacts

v15A12와 동일한 후보 시점을 사용한다.

```text
IMPACT_STARTS = [25, 55, 85, 115, 145, 175]
impact drive  = 0.7
pulse         = 6 steps = 120 ms
damage/event  = 10 HP
```

`brainSeed + 500000` RNG로 후보 순서를 shuffle한다.

injury class별 pre-decision 실제 impact 수:

```text
class 0 -> 0
class 1 -> 1
class 2 -> 2
class 3 -> 3
```

선택된 event side도 같은 frozen RNG에서 L/R로 결정한다.

event 시작 step에서 실제 HP를 10 감소시키고,
같은 event의 6 step 동안 corrected LgLG family에 0.7 drive를 준다.

corrected LgLG contract:

```text
LgLG prefix lookup
LEFT  331
RIGHT 338
```

exact `cells(meta, ["LgLG"], side)` lookup은 금지한다.

### post-decision future impacts

첫 POTION decision 이후 정확히 6개 future impact를 준다.

```text
start steps
[255, 275, 295, 315, 335, 355]

damage/event = 10 HP
LgLG drive   = 0.7
pulse        = 120 ms
```

side는 동일 episode RNG에서 결정한다.

따라서 hidden reward environment는 v15A12/v15B3와 동일하게
decision 이후 60 HP future damage를 갖는다.

---

## 6. POTION runtime contract

POTION은 배포된 v15D를 그대로 사용한다.

```text
runtime DN       24
history frames   48
frame width      100 ms
history          4.8 s
features         256
taste drive      0.8 bilateral
taste timing     final 100 ms frame only
actions          WAIT / DRINK
```

첫 decision은 live step 240에서 발생해야 한다.

400-step horizon이므로 두 번째 48-frame cycle은 완성되지 않는다.
따라서 episode당 POTION decision은 **정확히 1회**여야 한다.

DRINK가 선택되면:

```text
heal             30
max HP           100
potion cost      evaluation에서 15
full-HP DRINK    legal
```

HP는 actuation 결과 계산에만 쓰며 policy input으로 쓰지 않는다.

---

## 7. 통합 sensory

각 brain step에서 동시에 존재할 수 있는 drive:

```text
ground SNta
target visual
obstacle visual
LgLG injury
final-frame taste
```

v16A의 핵심은 이 sensory superposition 상태에서 frozen skill들이
서로를 파괴하지 않는지 보는 것이다.

visual encoder의 target/obstacle geometry는 v14C contract를 유지한다.

---

## 8. action arbitration

기존 runtime 순서를 유지한다.

```text
MOVE
JUMP proposal -> v14C interruption
ATTACK proposal -> v14C interruption
POTION v15 decision
```

JUMP-before-ATTACK ordering을 바꾸지 않는다.

v14C는 deterministic threshold evaluation을 사용한다.
재학습하지 않는다.

---

## 9. POTION reward audit

episode의 terminal utility:

```text
G = terminalHP - 15 * potionUses
```

class별 frozen oracle은 기존 v15와 동일하다.

```text
class 0: WAIT 40, DRINK 25 -> WAIT
class 1: WAIT 30, DRINK 25 -> WAIT
class 2: WAIT 20, DRINK 25 -> DRINK
class 3: WAIT 10, DRINK 25 -> DRINK
```

oracle은 **평가 전용**이다.
policy input/training에는 사용하지 않는다.

측정:

```text
balanced accuracy
WAIT recall
DRINK recall
mean G
mean regret
class별 DRINK rate
decision coverage
```

---

## 10. lower-skill 통합 지표

측정:

```text
course completion
min-seed completion
obstacle clear
left/right obstacle clear
target kill
timeout
mean jumps
post-clear jump episode rate
pre-clear attack episode rate
attack hit precision
airborne attack action fraction
max per-seed airborne attack action fraction
```

추가 diagnostic:

```text
class별 completion
class별 clear
class별 kill
class별 attack precision
class별 jump count
post-kill attack count
post-kill jump count
```

추가 diagnostic은 PASS gate를 바꾸지 않는다.

---

## 11. frozen PASS gate

### lower-skill coexistence

```text
course completion                    >= 70%
min seed completion                  >= 60%
obstacle clear                       >= 85%
left obstacle clear                  >= 80%
right obstacle clear                 >= 80%
target kill                          >= 70%
timeout                              <= 30%
mean jumps                           <= 1.85
post-clear jump episode              <= 25%
pre-clear attack episode             <= 30%
attack hit precision                 >= 45%
airborne attack action fraction      <= 22%
max per-seed airborne attack action  <= 30%
```

### POTION coexistence

```text
decision coverage                    = 100%
decisions per episode                = 1
balanced accuracy                    >= 70%
WAIT recall                          >= 60%
DRINK recall                         >= 60%
mean G                               >= 27.5
mean regret                          <= 2.5
```

모든 required gate가 동시에 PASS해야 v16A PASS다.

---

## 12. interpretation

### PASS

```text
V16A_FROZEN_FIVE_SKILL_INTEGRATION_PASS
```

허용되는 주장:

> frozen MaleCNS sensory dynamics 위에서 독립적으로 배포된
> MOVE/JUMP/ATTACK/interruption/POTION readout이,
> preregistered 8-second integrated stress course에서
> 재학습 없이 동시에 기능했다.

허용되지 않는 주장:

- 초파리 전체 뇌가 메이플을 학습했다.
- connectome이 학습했다.
- 임의의 MapleStory 환경으로 일반화됐다.

PASS면 다음 단계는 **v16B continuous ecology** preregistration이다.
예: respawn/multi-target/longer horizon.

### FAIL

```text
V16A_FROZEN_FIVE_SKILL_INTEGRATION_FAIL
```

FAIL이면:

1. 결과를 그대로 freeze한다.
2. deployed skill weight/threshold를 수정하지 않는다.
3. v16A gate/seed/window를 수정하지 않는다.
4. 별도 prereg diagnostic에서 interference source를 분해한다.
5. diagnostic 전에는 v16B로 넘어가지 않는다.

---

## 13. stop rule

v16A는 integration baseline 1회다.

결과를 보고:

- seed 추가
- gate 완화
- impact timing 변경
- sensory gain 변경
- policy threshold 변경
- history window 변경

으로 PASS를 만들지 않는다.

이 문서가 authoritative preregistration이다.
