# prereg_v16b_d3 — authoritative real-contact history replay

## 0. 질문

v16B에서 실제로 실패한 POTION decision window의 **real contact schedule**을 그대로 가져와
visual sensory를 제거한 상태로 replay했을 때도 frozen v15D가 WAIT-biased가 되는가?

D1:
- CLEAN/high-load 자체는 정상
- TARGET_OBSTACLE_STATIC interference 검출

D2:
- canonical injury schedule에서 persistent MaleCNS state/baseline carryover만으로는 실패 재현 불가

따라서 D3는 다음 둘을 분리한다.

1. v16B의 실제 contact timing/side schedule 자체가 frozen POTION representation을 깨는가?
2. 그 실제 schedule과 persistent MaleCNS state가 결합될 때 추가 붕괴가 생기는가?

이 실험은 diagnostic only다.

- 새 학습 없음
- deployed v15D 변경 없음
- threshold 변경 없음
- sensory gain 변경 없음
- v16B PASS/FAIL 변경 없음

---

## 1. frozen provenance

```text
MaleCNS
  alextitonis/fly.ai
  95a3dbcb05241b0a5c07028ca8ad945b23fbbe6e

POTION
  V15D_DEPLOYED

representation
  33fc31f636e1cde215841dd33b0a93b24d4571cdabd32e9a1edc8fa2e696c847

policy
  47088bcb15ed2cd96f64d67a20169934bd7a866dcd56bacffea70b1f42537a59

v16B authoritative run
  35944188466

v16B artifact
  10785384382

artifact digest
  sha256:21c50f6dfb7f46bafaf25c8c7ed59666b2a1b7e3e7ffba9613d1e38686a3d76e

v16b_ecology.json sha256
  062f5d8e222ba188f173bec96fc2a8210910938b074fb45f4708fa0f45611528

D2 closure
  e352f0c66dd49c03057b5ec54bb9879847bb092f
```

CI는 run 35944188466의 exact artifact를 다운로드해 source tape로 사용한다.
source JSON hash가 다르면 FAIL한다.

---

## 2. source tape

authoritative v16B artifact의 24 episode / 84 POTION decisions를 그대로 읽는다.

각 decision window:

```text
window length
  240 live steps = 4.8 s

window start
  decisionStep - 239

recorded contacts
  causal onsets with windowStart <= damageEvent.step < decisionStep

pulse-overlap audit
  additionally inspect damageEvents from windowStart-6 through decisionStep-1
  because v16B applies LgLG on the six brain steps after contact

recorded fields used
  brain seed
  decision index/step
  contact relative step
  contact side
  original FULL action/Q_WAIT
```

HP는 source audit/descriptive field로만 읽을 수 있고 replay policy input으로 사용하지 않는다.

authoritative source의 observed contact-count distribution은 audit 대상으로만 고정한다.

```text
1 contact   8 windows
2 contacts 41 windows
3 contacts 26 windows
4 contacts  8 windows
5 contacts  1 window
total      84 windows
```

primary support set:

```text
contact count 2..3
67 windows
```

이는 original v15 reward policy에서 DRINK가 optimal인 2/3-injury support와 대응한다.

---

## 3. exact real-contact sensory semantics

real v16B에서는 contact가 physics/contact update에서 기록된 뒤 다음 brain step부터
LgLG pulse가 들어간다.

따라서 absolute recorded contact step `d`에 대해 replay LgLG pulse는 exact v16B order를 따라:

```text
d+1 .. d+6
```

이다.

따라서 RESET replay도 window 시작 직전 contact의 pulse tail이 현재 window와 겹치면 재생한다.

```text
window = [start, end]
relevant source contacts = d where start-6 <= d <= end-1
active on replay step t iff d+1 <= t <= d+6
```

PERSISTENT replay에서는 이 pulse tail을 cycle boundary 너머로 그대로 carry한다.

decisionStep 자체에서 physics/contact update로 새로 기록된 contact는 그 decision에 영향을 주지 않고
다음 step부터 영향을 주므로 primary contact count에서도 제외한다.

공통:

```text
settle        26
baseline      26
ground SNta   bilateral 0.05
LgLG drive    0.7
taste         final frame only, bilateral 0.8
frame         5 steps
history       48 frames
visual        OFF
```

정책은 browser-deployed v15D API를 그대로 호출한다.

---

## 4. replay modes

### M0 CANONICAL_RESET

각 source window를 독립 fresh MaleCNS로 replay한다.

injury count만 source와 동일하게 유지하고, timing/side는 v15 canonical generator를 사용한다.

```text
IMPACT_STARTS
  25,55,85,115,145,175

rng
  brainSeed + decisionIndex*1000 + 500000

shuffle starts
take first injuryCount
side from same RNG
sort
```

각 canonical contact pulse는 D1/v15 synthetic semantics처럼 event start부터 6 steps다.

목적:
same frozen policy + same brain-seed family에서 count-matched controlled DRINK capability 확인.

### M1 REAL_RESET

각 source window마다 fresh MaleCNS + fresh ground baseline.

visual OFF.

source의 exact absolute contact timing/side를 위 real-contact `d+1..d+6` semantics로 replay한다.
window 시작 전 최대 6-step pulse tail도 source artifact에서 복원한다.

목적:
real contact schedule만으로 WAIT bias가 재현되는지 검사.

### M2 REAL_PERSISTENT

episode별로 MaleCNS instance 하나를 만들고 ground baseline을 최초 1회만 측정한다.

source decision window를 시간 순서대로 연속 replay하며, absolute damage-event pulse tail을
cycle boundary 너머로 그대로 유지한다.

각 cycle 뒤:
- POTION history만 `finishCycle`로 clear
- MaleCNS state 유지
- original baseline 유지

visual OFF.

목적:
real contact schedule + persistent state interaction 검사.

---

## 5. metrics

전체 84 windows와 primary support 66 windows를 각각 기록한다.

mode별:

```text
DRINK rate
mean/min/max Q_WAIT
mean Q_DRINK
mean Q margin
```

source FULL도 같은 window set에서 descriptive comparison으로 기록한다.

paired window별:

```text
CANONICAL_RESET action/Q_WAIT
REAL_RESET action/Q_WAIT
REAL_PERSISTENT action/Q_WAIT
source FULL action/Q_WAIT

REAL_RESET - CANONICAL_RESET Q_WAIT
REAL_PERSISTENT - REAL_RESET Q_WAIT
source FULL - REAL_PERSISTENT Q_WAIT
action mismatch
```

---

## 6. validity gate

primary support set(2..3 contacts)에서:

```text
CANONICAL_RESET DRINK rate >= 60%
```

미달이면:

```text
V16B_D3_CANONICAL_CONTROL_FAILURE
```

다른 causal classification을 하지 않는다.

---

## 7. preregistered classification

control PASS 후:

```text
scheduleDrop =
  CANONICAL_RESET support DRINK rate
  - REAL_RESET support DRINK rate

persistenceDrop =
  REAL_RESET support DRINK rate
  - REAL_PERSISTENT support DRINK rate
```

### REAL_CONTACT_SCHEDULE_INTERFERENCE

```text
scheduleDrop >= 20 percentage points
```

### REAL_CONTACT_PERSISTENCE_INTERACTION

```text
persistenceDrop >= 20 percentage points
```

classification:

```text
schedule=true, persistence=false
  V16B_D3_REAL_CONTACT_SCHEDULE_INTERFERENCE

schedule=false, persistence=true
  V16B_D3_REAL_CONTACT_PERSISTENCE_INTERACTION

schedule=true, persistence=true
  V16B_D3_SCHEDULE_PLUS_PERSISTENCE_INTERACTION

schedule=false, persistence=false
  V16B_D3_CLEAN_REAL_CONTACT_HISTORY_NOT_SUFFICIENT
```

마지막 outcome은 실제 contact history를 clean sensory로 replay해도 실패가 재현되지 않았다는 뜻이다.
그 경우 다음 diagnostic은 actual mixed visual/game sensory를 shadow counterfactual로 분리해야 한다.

---

## 8. stop rule

authoritative D3 결과를 본 뒤 다음을 변경하지 않는다.

```text
source artifact/run
source window selection
support definition 2..3 causal contact onsets (decisionStep excluded)
pulse onset/cross-boundary rule
canonical event generator
history/frame timing
sensory gains
60% validity gate
20pp causal gates
classification
frozen v15D
```

D3는 v16B FAIL을 변경하지 않는다.
