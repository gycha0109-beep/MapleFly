# MapleFly

MapleFly is an experiment that connects a fruit-fly MaleCNS connectome controller
to a deliberately simplified, MapleStory-inspired 2D environment.

## Current scope

**Fly #001 — learned movement + learned ATTACK**

- pinned real MaleCNS connectome remains frozen
- Skill01 LEFT / RIGHT is the v7 reward-only learned motor readout
- Skill02 ATTACK is the v10F learned sparse DN readout
- browser runtime uses exact 26-step movement and 5-step ATTACK windows
- v10F post-merge browser/headless equivalence passed at FULL 84.4%, whiff 15.6%
- JUMP / UP / DOWN still use legacy connectome decoders
- POTION still uses the engineered taste / head-motor proxy
- Skill03 JUMP: Phase E single-jump unseen gate PASS (FULL 86.5%, VISUAL_OFF/DN_SHUFFLED 0%); Phase F real cooldown + self-retry validation next
- no claim is made that the fly understands MapleStory

## Brain source

```text
alextitonis/fly.ai
95a3dbcb05241b0a5c07028ca8ad945b23fbbe6e
166,700 neurons
25,088,107 connections
```

The connectome binaries are fetched from that fixed upstream commit at runtime.

## Play

https://gycha0109-beep.github.io/MapleFly/

## Experiment v2

Default quick run:

```text
60 seconds × 3 pairs
= 6 trials total
```

Long baseline preset:

```text
300 seconds × 5 pairs
= 10 trials total
≈ 50 minutes
```

Each pair uses the same brain noise seed for SENSORY ON and OFF.
Target positions are deterministic pseudo-random values derived from the paired seed and spawn index, so ON/OFF trials share the same nth spawn position. Condition order alternates between pairs.

Logged metrics include movement toward target, minimum distance, attack/hit/kill,
jump count, hit rate, and brain runtime telemetry.

## Documentation

- `docs/brain-v1.md` — connectome/controller contract
- `history/development_v1.md` — v1 implementation history
- `history/result_v1.md` — v1 observed result
- `history/development_v2.md` — v2 A/B macro/logger design
- `history/result_v2.md` — v2 180s × 3 paired headless result
- `THIRD_PARTY_NOTICES.md` — upstream attribution

No claim is made that the fly understands MapleStory.


## Headless experiment runner

브라우저 화면을 켜 두지 않고 실험하려면 Node.js headless runner를 사용한다.

### 로컬 PC

Node.js 24+:

```powershell
npm run experiment:v2 -- --seconds 180 --pairs 3 --seed 64
```

결과:

```text
results/experiment-v2/
├─ experiment_v2.json
├─ experiment_v2.csv
└─ summary.md
```

브라우저는 필요 없지만 로컬 실행 중에는 터미널/PC가 켜져 있어야 한다.

### GitHub Actions

PC까지 꺼도 되는 방식:

1. repository의 **Actions**
2. **Run MapleFly Experiment v2**
3. **Run workflow**
4. seconds / pairs / seed 입력
5. 실행 후 artifact 다운로드

Workflow:

```text
.github/workflows/experiment-v2.yml
```

Connectome asset은 pinned commit 기준으로 GitHub Actions cache에 저장된다.


## Experiment v3 — visual-only control

v2의 SENSORY OFF는 SNta까지 제거했기 때문에,
v3에서는 ground input을 양쪽에 동일하게 유지하고 target visual channel만 제거한다.

```text
FULL
  SNta + LC10a/LPLC1/LPLC2/LC4

VISUAL_OFF
  SNta only
```

GitHub Actions:

```text
Run MapleFly Experiment v3 Visual Control
```

로컬:

```powershell
npm run experiment:v3 -- --seconds 180 --pairs 3 --seed 64
```


### Experiment v3 result

Run `35353782679`, 180 simulated seconds × 3 pairs:

```text
                 FULL   VISUAL_OFF
toward target    65.5%     49.8%
hit rate         24.6%      7.7%
kills / trial    29.00      2.33
```

Interpretation: `history/result_v3.md`


## Experiment v4 — contact damage

캐릭터에 HP를 추가한다.

```text
player HP     100
mushroom touch -10
damage rule   contact-enter 1회당 10
```

겹쳐 있는 매 frame마다 피해를 주지 않고,
버섯과 **새로 접촉한 순간**에만 -10이다. 다시 떨어졌다가 닿아야 다음 피해가 들어간다.

Pinned fly.ai의 `LgLG`는 hair plate / campaniform 계열의 **load / knock** mechanosensory input으로 정의되어 있어,
접촉 순간을 pain이라고 부르지 않고 **knock proxy**로 연결한다.

Headless v4는 HP 감소 자체는 양쪽에 동일하게 적용하고,
접촉 순간 LgLG pulse만 ON/OFF해서 반응 차이를 본다.


### Experiment v4 result

Run `35358933389`, 180 simulated seconds × 3 pairs:

```text
              IMPACT_ON   IMPACT_OFF
contacts         10.00        10.00
final HP          0.0          0.0
away ratio       38.0%        38.0%
```

Every trial reached KO after exactly 10 contact-enter damage events.
No measured game-behavior difference was observed from the current LgLG knock pulse.
See `history/result_v4.md`.


## Experiment v5 — red potion

```text
player HP        100
contact damage    10
red potions       30
heal / potion     30
```

HP가 100 미만이고 포션이 남아 있으면 potion taste cue를 사용할 수 있다.
Pinned fly.ai의 taste probe(`LB3 + claw_tpGRN`)에서 가장 일관되게 증가한
`cb_motor` neck/head population을 **engineered DRINK proxy**로 읽는다.

이것은 실제 초파리의 "포션 마시기 뉴런"이라는 뜻이 아니다.
게임 행동을 연결하기 위한 명시적 interface assumption이다.

v5 headless paired 조건:

```text
POTION_CUE_ON
  visual + SNta + LgLG impact
  injured -> LB3/claw_tpGRN taste cue
  head motor >= 1.6 Hz -> POTION

POTION_CUE_OFF
  same game / same decoder / same potions
  taste cue만 제거
```

측정에는 포션 사용 수, 피격 1초 이내 사용 수, 실제 회복량,
overheal 낭비량, 평균 포션 사용 HP, 남은 포션, 생존 시간이 포함된다.


### Experiment v5 result

Run `35362106281`, 180 simulated seconds × 3 pairs:

```text
                         CUE_ON    CUE_OFF
potion uses                30.0       30.0
quick potion uses          30.0       29.0
average HP at use          89.3       87.4
wasted healing            580.0      523.3
survival                   42.7s      51.6s
```

Both conditions emptied all 30 potions.
With the taste cue ON, every potion use happened within one second of a hit and the average use HP was 89.3.
The current 1.6 Hz drink proxy is therefore not selective enough: spontaneous head-motor activity also empties the inventory when the taste cue is OFF.

Interpretation: `history/result_v5.md`


## Experiment v6 — learning readiness

Full MaleCNS 내부에 곧바로 plasticity를 넣기 전에
KC sparse code와 dopamine teacher baseline을 확인했다.

Phase A에서 원본 brain은 rest에서 KC 100% active,
PAM 50 Hz였고 vinegar/cVA KC signature Jaccard도 1.00이었다.

정적 KC inhibition sweep은 `-0.30` 한 지점에서만 Gate 1/2를 통과했다.
인접한 안정 구간이 없어 production 값으로 채택하지 않았다.

Phase B에서는 pinned connectome의 APL 2개 뉴런 outgoing edge만 강화했지만
gain 1~16 어디에서도 최종 readiness gate를 통과하지 못했다.

~~~text
internal KC -> MBON plasticity
NOT READY
~~~

그래서 다음 단계는 connectome을 frozen neural reservoir로 유지하고,
descending-neuron state에서 게임 action을 배우는 trainable motor readout으로 진행한다.

Details: `history/result_v6.md`


## Experiment v7 — first learned motor skill

Full MaleCNS는 frozen reservoir로 유지하고
1,316 descending-neuron activity에서 LEFT / RIGHT를 읽는
2-action motor readout만 reward 결과로 학습했다.

Push smoke run `35409704972`:

~~~text
run 1 train first/last 57.5% -> 72.5%
run 2 train first/last 52.5% -> 82.5%

eval VISUAL_ON  100%
eval VISUAL_OFF  50%
delta            +50%p

tutorial gate PASS
~~~

정답 target side / coordinate는 policy input에 넣지 않았다.

Details: `history/result_v7.md`


## Experiment v8 — Fly #001 deployment

The v7 reward-only LEFT / RIGHT policy is now versioned as a persistent
`Fly #001` skill and connected to the browser MaleCNS runtime.

Sparse deployment check:

~~~text
80 / 150 / 300 / 500 px
VISUAL_ON  100%
VISUAL_OFF  50%
deploy gate PASS
~~~

Continuous browser-style headless run `35433545656`:

~~~text
VISUAL_ON toward   77.0%
VISUAL_OFF toward  28.5%
difference        +48.5%p
minimum ON         72.6%
mean reaches       22.3 / 60 s
live gate PASS
~~~

The learned skill controls LEFT / RIGHT only.
Jump, attack, climbing and potion behavior have not yet been learned by this readout.

GitHub Pages deployment succeeded.

Details: `history/result_v8.md`
