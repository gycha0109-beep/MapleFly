# development_v4 — Contact damage / LgLG knock

## 목적

v3에서 target visual input이 connectome 행동 차이에 강하게 기여하는 것이 확인되었다.

다음 질문은 단순하다.

> **버섯과 실제로 충돌해서 캐릭터가 피해를 입으면 MaleCNS 출력은 어떻게 달라지는가?**

## 게임 규칙

```text
player max HP  = 100
contact damage = 10
```

피해는 collision overlap이 유지되는 매 frame마다 반복하지 않는다.

```text
not touching -> touching
```

으로 바뀌는 **contact-enter** 순간에만 -10을 적용한다.
다시 떨어졌다가 접촉해야 다음 피해가 들어간다.

HP가 0이 되면 캐릭터는 KO 상태가 되고 움직임과 공격을 멈춘다.
R reset으로 다시 HP 100에서 시작할 수 있다.

## connectome 입력

현재 pinned upstream:

```text
alextitonis/fly.ai
95a3dbcb05241b0a5c07028ca8ad945b23fbbe6e
```

의 `world/src/senses.ts`와 `world/src/wiring.ts`에서는
`LgLG`를 hair plate / campaniform 계열의 **load, knocks** mechanosensory input으로 사용한다.

따라서 MapleFly는 접촉 피해를 "pain" 또는 nociception이라고 부르지 않는다.

접촉 순간:

```text
mushroom on left  -> LgLG_L = 0.7
mushroom on right -> LgLG_R = 0.7
pulse duration    = 120 ms
```

으로 knock proxy를 넣는다.

0.7은 upstream의 `MECH.load_gain = 0.7`과 맞춘 값이다.

## 브라우저

live game에도 다음이 추가된다.

- player HP bar
- HP 100
- 접촉 -10
- player damage popup
- KO 표시
- 접촉 side의 LgLG pulse

## v4 paired 대조군

HP 감소와 collision은 두 조건에서 **완전히 동일**하다.

차이는 connectome이 knock input을 받는지뿐이다.

```text
IMPACT_ON
  visual target input ON
  SNta ground input ON
  contact HP -10 ON
  LgLG knock pulse ON

IMPACT_OFF
  visual target input ON
  SNta ground input ON
  contact HP -10 ON
  LgLG knock pulse OFF
```

즉 다음 질문을 본다.

> 같은 피해를 입더라도 knock mechanosensory input을 MaleCNS에 넣었을 때 접촉 이후 행동과 생존이 달라지는가?

## 측정

- contacts
- damage taken
- final HP
- KO 여부 / KO 시각
- target 방향 이동
- HIT / KILL
- contact 후 600ms 동안 충돌 방향에서 멀어지는 이동 비율
- brain runtime

## 해석 제한

`LgLG`를 넣는 이유는 upstream에서 load/knock mechanosensory input으로 사용하기 때문이다.

따라서 결과가 나와도:

- "초파리가 아픔을 느꼈다"
- "통증을 학습했다"

라고 표현하지 않는다.

정확한 표현은:

> **충돌에 대응하는 engineered LgLG knock input이 connectome 출력과 이후 게임 행동을 바꾸는가**

이다.
