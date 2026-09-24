# prereg_v16b — frozen continuous ecology

## 0. 질문

v16A에서 frozen five-skill stack은 preregistered 8-second integrated course를
재학습 없이 통과했다.

v16B의 질문은 다음과 같다.

> 동일한 frozen MaleCNS + MOVE v7 + JUMP v11H2 + ATTACK v10F +
> v14C interruption + POTION v15D를 리셋하지 않고 48초 동안 연속 실행했을 때,
> 반복되는 obstacle/target encounter와 실제 monster contact injury 아래에서
> 사냥과 생존을 지속할 수 있는가?

v16B는 새 skill 학습 실험이 아니다.

- connectome weight 변경 없음
- readout/policy 재학습 없음
- threshold 변경 없음
- sensory gain 변경 없음
- history window 변경 없음
- 결과를 본 뒤 seed/gate/timing 변경 없음

---

## 1. frozen provenance

### MaleCNS

```text
repository  alextitonis/fly.ai
commit      95a3dbcb05241b0a5c07028ca8ad945b23fbbe6e
neurons     166700
synapses    25088107
DN          1316
```

### deployed stack

```text
MOVE          v7
ATTACK        v10F
JUMP          v11H2
interruption  v14C
POTION        v15D
```

POTION:

```text
representation
33fc31f636e1cde215841dd33b0a93b24d4571cdabd32e9a1edc8fa2e696c847

policy
47088bcb15ed2cd96f64d67a20169934bd7a866dcd56bacffea70b1f42537a59

deployment
468334a93413b25cb4c4847a86ad01cdbef8a6ca
```

v16A closure:

```text
V16A_FROZEN_FIVE_SKILL_INTEGRATION_PASS
closure e77814c685ccd865c0bdd8c51ba67f4a5eca8f5d
```

---

## 2. runtime-policy 금지 입력

다음 값으로 runtime action을 직접 선택하지 않는다.

```text
target side -> LEFT/RIGHT
distance/range -> ATTACK
obstacle distance -> JUMP
grounded/airborne -> interruption answer
HP/maxHP/missingHP -> DRINK
contact count/damageTaken -> DRINK
potion count -> DRINK
wastedHealing -> DRINK
correct action/oracle -> any action
```

환경과 evaluator는 geometry, collision, HP, death, reward/counterfactual 계산에
game state를 사용할 수 있다.

이 값은 frozen learned policy feature에 추가하지 않는다.

---

## 3. continuous horizon

```text
brain step       20 ms
settle           26 steps
baseline         26 steps
live horizon     2400 steps
live duration    48.0 s
```

settle/baseline은 episode 시작 때 정확히 한 번만 수행한다.

encounter respawn 사이에는 다음을 리셋하지 않는다.

```text
MaleCNS state
MOVE windows
ATTACK windows
JUMP runtime/windows
v14C temporal history
POTION 48-frame history
baseline
player position
HP
cooldowns
facing
```

episode는 player HP가 0이 되면 즉시 종료한다.
그 외에는 2400 live steps까지 계속한다.

---

## 4. POTION cycle

배포된 v15D contract를 그대로 사용한다.

```text
runtime DN       24
frame            100 ms = 5 brain steps
history          48 frames = 4.8 s
features         256
taste            0.8 bilateral, final frame
action           WAIT / DRINK
heal             30
potion cost      15 (evaluation only)
```

full-horizon survivor의 decision step:

```text
240
480
720
960
1200
1440
1680
1920
2160
2400
```

즉 survivor는 정확히 10 decisions이어야 한다.

POTION cycle은 encounter respawn에서 reset하지 않는다.

---

## 5. cohort

fresh base seeds:

```text
3101000
3111000
3121000
```

각 base seed:

```text
4 initial distances
x 2 initial sides
= 8 episodes
```

전체 24 continuous episodes.

brain seed:

```text
baseSeed + distanceIndex*10 + sideIndex
```

ecology RNG:

```text
brainSeed + 700000
```

v14C deterministic readout evaluation을 유지한다.

---

## 6. encounter geometry

초기 encounter는 v16A geometry를 그대로 사용한다.

```text
distance       155 / 195 / 235 / 275
side           L / R
obstacle       38 x 54
target offset  160
target HP      30
attack damage  10
attack range   76
```

target kill 후:

```text
respawn gap    35 brain steps = 0.7 s
```

gap 동안 target과 encounter obstacle은 sensory/physics에서 제거한다.

gap 종료 후 ecology RNG가:

```text
side      L/R 50:50
distance  {155,195,235,275} uniform
```

을 뽑는다.

새 geometry는 **현재 player 위치**를 기준으로 생성한다.
player는 teleport하지 않는다.

### world-fit rule

sampled side의 target body가 world [0,1000] 안에 들어오지 않으면 반대 side로
한 번 mirror한다.

양쪽 모두 불가능하면 sampled distance를 다음 순서로만 축소한다.

```text
275 -> 235 -> 195 -> 155
235 -> 195 -> 155
195 -> 155
155
```

각 candidate에서 sampled side, then mirrored side 순으로 검사한다.

이 rule은 geometry 생성용 환경 rule이며 policy action을 선택하지 않는다.

---

## 7. 실제 contact injury

v16A의 scheduled synthetic impact는 v16B에서 사용하지 않는다.

damage source는 실제 player-target body collision뿐이다.

browser semantics와 같이:

```text
not touching -> touching transition
  => contact damage 10 HP
  => corrected LgLG pulse 0.7
  => pulse length 6 steps = 120 ms
```

계속 겹쳐 있는 동안 추가 damage는 없다.
한 번 분리된 뒤 다시 접촉하면 새 contact event다.

impact side는 contact 순간 target이 player center의 어느 쪽에 있는지로 정한다.

corrected LgLG family:

```text
LEFT   331
RIGHT  338
```

exact `cells(meta, ["LgLG"], side)` lookup은 금지한다.

HP가 0이면 episode death다.

---

## 8. target/obstacle sensory

visual encoder는 v16A/browser contract를 유지한다.

동시에 존재 가능한 sensory:

```text
ground SNta
target visual
obstacle visual
real-contact LgLG injury
final-frame taste
```

target dead/respawn gap이면 target visual은 0.
encounter obstacle이 clear되면 obstacle visual은 기존 방식으로 사라진다.

---

## 9. action arbitration

순서를 변경하지 않는다.

```text
MOVE
JUMP proposal -> v14C interruption
ATTACK proposal -> v14C interruption
POTION v15D
```

JUMP-before-ATTACK ordering을 유지한다.

POTION DRINK는 movement/attack/jump animation lock을 새로 만들지 않는다.

---

## 10. encounter accounting

각 spawned encounter에 다음을 기록한다.

```text
encounter index
spawn step
side
distance
obstacle clear step
kill step
end step
jumps
post-clear jumps
attacks
pre-clear attacks
hits
whiffs
airborne attacks
contacts
damage
```

마지막 미완료 encounter도 denominator에 포함한다.

primary encounter metrics:

```text
obstacle clear rate
target kill rate
LEFT target kill rate
RIGHT target kill rate
attack hit precision
post-clear jump encounter rate
pre-clear attack encounter rate
airborne attack action fraction
```

episode metrics:

```text
48 s survival
kills
>=3 kills
death step
terminal HP
potion decisions
potion uses
wasted healing
```

---

## 11. paired POTION_OFF counterfactual

별도의 second brain rollout을 만들지 않는다.

FULL rollout에서 발생한 실제 contact damage timeline을 기록한다.

현재 frozen contract에서:

- HP는 MOVE/JUMP/ATTACK/POTION policy input이 아니다.
- DRINK는 다른 action을 lock하지 않는다.
- taste timing은 HP/action-independent frozen cycle이다.

따라서 FULL damage timeline에서 heal만 제거하면,
POTION_OFF가 언제 0 HP가 되는지 같은 trajectory prefix에서 계산할 수 있다.

POTION_OFF:

```text
initial HP 100
each recorded contact -10
heal 0
death when HP <= 0
```

counterfactual death 이후 FULL trajectory의 kill은 OFF kill에 포함하지 않는다.

측정:

```text
POTION_OFF death rate
FULL survival - OFF survival
FULL mean kills - OFF mean kills
FULL cost-adjusted terminal value - OFF terminal HP
```

FULL cost-adjusted terminal value:

```text
terminalHP - 15*potionUses
```

OFF terminal HP는 counterfactual death면 0,
survive면 100 - 10*contacts다.

이 control은 evaluation-only이며 policy input이 아니다.

---

## 12. time-bin diagnostics

48초를 8초씩 6 bins로 고정한다.

```text
0-8
8-16
16-24
24-32
32-40
40-48 s
```

각 bin:

```text
kills
encounter clears
attacks/hits/precision
airborne attacks
jumps
contacts
damage
HP at bin end
POTION WAIT/DRINK
Q_WAIT/Q_DRINK
v14C accepted/interrupted proposals
DN fired-count diagnostic
```

time-bin 값은 diagnostic이다.
결과를 본 뒤 primary gate로 승격하지 않는다.

---

## 13. stress sufficiency

먼저 ecology가 POTION 효용을 시험할 만큼 위험했는지 판정한다.

```text
POTION_OFF death rate >= 25%
```

미달이면:

```text
V16B_ECOLOGY_STRESS_INSUFFICIENT
```

로 freeze한다.

이 경우 PASS로 간주하지 않으며, 같은 결과를 보고 v16B 환경을 즉석 수정하지 않는다.
별도 preregistered stress diagnostic이 필요하다.

---

## 14. frozen primary gates

stress가 sufficient일 때만 PASS/FAIL gate를 평가한다.

### survival / ecology

```text
48 s survival rate                    >= 75%
min base-seed survival                >= 62.5%
episodes with >=3 kills               >= 75%
encounter obstacle clear              >= 85%
encounter target kill                 >= 70%
LEFT encounter target kill            >= 65%
RIGHT encounter target kill           >= 65%
attack hit precision                  >= 45%
airborne attack action fraction       <= 22%
post-clear jump encounter             <= 25%
pre-clear attack encounter            <= 30%
```

### POTION ecology

```text
every 48 s survivor decisions         = 10
FULL survival - POTION_OFF            >= +15 percentage points
FULL mean kills - POTION_OFF          >= +0.5
mean cost-adjusted value improvement  >= +5
mean wasted healing / DRINK           <= 10 HP
```

모든 required gate가 동시에 PASS해야 한다.

---

## 15. outcome precedence

### implementation invalid

다음은 scientific FAIL이 아니다.

```text
NaN/non-finite
provenance mismatch
DN count mismatch
POTION cycle misalignment
LgLG count mismatch
impossible geometry after frozen fit rule
counterfactual accounting inconsistency
```

결과:

```text
V16B_IMPLEMENTATION_INVALID
```

implementation만 보정하고 동일 prereg를 다시 실행할 수 있다.

### ecology stress insufficient

implementation valid지만:

```text
POTION_OFF death rate < 25%
```

이면:

```text
V16B_ECOLOGY_STRESS_INSUFFICIENT
```

### scientific pass/fail

stress sufficient 후 모든 gate PASS:

```text
V16B_CONTINUOUS_ECOLOGY_PASS
```

하나라도 FAIL:

```text
V16B_CONTINUOUS_ECOLOGY_FAIL
```

---

## 16. stop rule

authoritative v16B 결과를 본 뒤 다음을 바꾸지 않는다.

```text
seed
48 s horizon
respawn delay
contact damage
sensory gain
world-fit rule
skill threshold
history window
PASS gate
stress threshold
```

PASS를 만들기 위한 rerun/tuning을 금지한다.

FAIL 또는 STRESS_INSUFFICIENT면 결과를 freeze하고,
원인 분해는 별도 preregistration에서 한다.

---

## 17. interpretation

PASS가 허용하는 주장:

> frozen MaleCNS sensory dynamics 위의 deployed five-skill stack이
> 48-second persistent-state ecology에서 재학습 없이 반복 encounter를 처리했고,
> 실제 contact injury 아래에서 frozen POTION policy가 생존/사냥 효용을 제공했다.

허용하지 않는 주장:

- connectome이 학습했다.
- 초파리 전체 뇌가 MapleStory를 학습했다.
- simultaneous multi-target selection을 해결했다.
- arbitrary MapleStory environment로 일반화됐다.
- 48초 결과가 장시간 endurance를 보장한다.

PASS면:

```text
V16C_ENDURANCE_BROWSER_PARITY_PREREGISTRATION_AUTHORIZED
```

다음 단계는 180-second endurance + browser-parity다.
