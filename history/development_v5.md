# development_v5 — 빨간포션 / taste-responsive drink proxy

## 목적

v4에서 캐릭터는 HP 100, 버섯 접촉 1회당 -10 피해를 받았다.

이번 질문은 다음이다.

> **회복 아이템을 주면 MaleCNS controller가 실제로 포션을 사용하는가?**
>
> 특히 한 번 맞아서 HP가 90이 되자마자 +30 포션을 계속 낭비하는 식으로 먹는가,
> 아니면 어느 정도 버티다가 먹는가?

## 게임 규칙

```text
player max HP   = 100
contact damage  = 10
red potion      = 30개
heal / potion   = +30
full HP cap     = 100
```

포션은 HP가 100 미만일 때만 사용할 수 있다.

예:

```text
HP 90 -> potion -> HP 100
실제 회복 10
낭비 회복 20

HP 70 -> potion -> HP 100
실제 회복 30
낭비 0
```

따라서 "맞을 때마다 바로 먹는가"를 보면 단순 사용 횟수뿐 아니라
`wastedHealing`도 같이 봐야 한다.

## 중요한 인터페이스 문제

실제 초파리 connectome에는 당연히 메이플스토리의 빨간포션이나 인벤토리 개념이 없다.

그러므로 다음과 같은 직접 규칙은 넣지 않는다.

```text
if HP < 100:
  potion 사용
```

이렇게 하면 초파리 뇌를 테스트하는 의미가 없다.

대신 포션을 **마실 수 있는 액체가 입에 제시된 감각 자극**으로 번역한다.

## upstream 근거

Pinned upstream:

```text
alextitonis/fly.ai
95a3dbcb05241b0a5c07028ca8ad945b23fbbe6e
```

`wiz/probe.py`의 taste stimulus:

```text
LB3 + claw_tpGRN
0.8 V / step
```

같은 pinned probe 결과에서 taste 자극 시 `cb_motor`의 neck/head group은:

```text
L: 1.33 -> 1.77 Hz
R: 1.38 -> 1.95 Hz
```

로 증가했다.

양쪽 평균:

```text
baseline ≈ 1.36 Hz
taste    ≈ 1.86 Hz
midpoint ≈ 1.61 Hz
```

따라서 v5에서는 사전에 `1.6 Hz`를 DRINK proxy threshold로 고정한다.

이 threshold는 결과를 본 뒤 맞춘 값이 아니다.

## POTION action

캐릭터가 다쳐 있고 포션이 남아 있으면:

```text
taste_L = 0.8
taste_R = 0.8
```

를 connectome에 넣는다.

그리고:

```text
mean(neck/head L, neck/head R) >= 1.6 Hz
```

가 되면 `POTION` action을 1회 발생시킨다.

중복 소모를 막기 위해 800 ms cooldown을 둔다.
포션을 먹어 HP가 100이 되면 taste cue는 즉시 사라진다.

## 왜 "feeding neuron"이라고 부르지 않는가

Pinned upstream의 작은 world는 음식 위에 착지한 경우 feeding 상태를 환경 로직으로 처리하며,
실제 connectome에 "빨간포션 사용"과 정확히 대응하는 단일 motor output은 정의되어 있지 않다.

따라서 `cb_motor neck/head`는 어디까지나:

> **taste stimulus에 통계적으로 반응한 motor population을 게임의 DRINK action에 연결한 engineered proxy**

이다.

"초파리가 포션의 효용을 이해한다"라고 해석하면 안 된다.

## paired 대조군

### POTION_CUE_ON

```text
visual target input ON
SNta ground input ON
LgLG impact input ON
damage ON
30 potions ON
injured -> taste cue ON
head motor decoder ON
```

### POTION_CUE_OFF

```text
visual target input ON
SNta ground input ON
LgLG impact input ON
damage ON
30 potions ON
taste cue OFF
head motor decoder ON
```

두 조건 모두 같은 decoder를 사용한다.

따라서 CUE_OFF에서도 spontaneous neck/head activity가 1.6 Hz를 넘으면
포션을 우연히 사용할 수 있다.

이 차이를 비교해야 taste cue가 실제 포션 사용을 증가시키는지 알 수 있다.

## 측정

- contacts
- damageTaken
- potionUses
- quickPotionUses: 피격 후 1초 안에 사용
- quickUsePerContact
- totalHealed
- wastedHealing
- averageHpAtUse
- potionsRemaining
- finalPlayerHp
- survivalSeconds
- KILL / HIT
- brain runtime

## 해석 기준

예를 들어:

```text
contacts 20
potionUses 19
averageHpAtUse 90
wastedHealing 380
```

처럼 나오면 거의 **한 대 맞을 때마다 바로 빨간포션을 들이붓는 패턴**이다.

반대로 HP 60~70 부근에서 주로 먹고 낭비량이 작으면
게임 규칙상 훨씬 효율적인 사용 패턴이다.

단, 어느 결과든 "포션의 가치 이해"나 "전략적 판단"으로 과장하지 않는다.
