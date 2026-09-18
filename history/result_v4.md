# result_v4 — Contact damage / LgLG knock 대조실험

## 목적

캐릭터에 HP를 추가하고 버섯과 접촉할 때 실제로 피해를 받게 만든 뒤,
그 충돌을 MaleCNS의 mechanosensory input에 넣었을 때 행동이 달라지는지 확인했다.

게임 규칙:

```text
player HP      100
contact damage 10
damage timing  contact-enter
KO             HP 0
```

같은 overlap이 유지되는 동안 매 frame 피해를 주는 것이 아니라,
떨어져 있다가 새로 접촉한 순간마다 10의 피해를 준다.

## connectome 입력

Pinned upstream:

```text
alextitonis/fly.ai
95a3dbcb05241b0a5c07028ca8ad945b23fbbe6e
```

에서 `LgLG`는 hair plate / campaniform 계열의 load / knock mechanosensory input으로 사용된다.

따라서 이번 실험은 이를 pain 또는 nociception이라고 부르지 않고
**충돌 knock proxy**로 취급한다.

```text
impact drive    0.7
pulse duration  120 ms
left collision  LgLG_L
right collision LgLG_R
```

## 조건

```text
IMPACT_ON
  visual target input ON
  SNta ground input ON
  HP damage ON
  LgLG knock pulse ON

IMPACT_OFF
  visual target input ON
  SNta ground input ON
  HP damage ON
  LgLG knock pulse OFF
```

HP 감소, 버섯 위치, seed, visual input은 pair 안에서 동일하다.
차이는 LgLG knock pulse뿐이다.

## 실행

GitHub Actions run:

```text
35358933389
```

commit:

```text
dbe77203b169876fdbe030062d393153a5cc575d
```

조건:

```text
180 simulated seconds
3 pairs
seeds 64, 65, 66
6 trials
```

## 결과

| Pair | Seed | Condition | Contacts | Final HP | Contact 후 away 비율 | KILL |
| --- | ---: | --- | ---: | ---: | ---: | ---: |
| 1 | 64 | IMPACT_ON | 10 | 0 | 39.1% | 2 |
| 1 | 64 | IMPACT_OFF | 10 | 0 | 39.1% | 2 |
| 2 | 65 | IMPACT_OFF | 10 | 0 | 34.7% | 1 |
| 2 | 65 | IMPACT_ON | 10 | 0 | 34.7% | 1 |
| 3 | 66 | IMPACT_ON | 10 | 0 | 40.1% | 1 |
| 3 | 66 | IMPACT_OFF | 10 | 0 | 40.1% | 1 |

평균:

```text
              IMPACT_ON   IMPACT_OFF
contacts         10.00        10.00
final HP          0.0          0.0
away ratio       38.0%        38.0%
```

세 seed 모두 **정확히 10번 접촉한 뒤 HP 0으로 KO**되었다.

그리고 현재 측정 지표에서는 IMPACT_ON과 IMPACT_OFF 사이에 차이가 없었다.

## 해석

이번 결과에서 가장 중요한 점은 "맞으면 피한다"가 나오지 않았다는 것이다.

현재 MapleFly의 visual encoder는 버섯 쪽으로 접근시키는 경향을 만들지만,
접촉 순간 LgLG knock pulse를 추가해도 현재 decoder가 내보내는 실제 게임 행동에는
측정 가능한 회피 변화가 나타나지 않았다.

즉 현재 결과는 다음처럼 표현하는 것이 정확하다.

> **버섯에게 맞았다는 knock input을 MaleCNS에 넣어도, 현재 decoder 기준으로는 도망가거나 회피하는 행동 변화가 관찰되지 않았다. 결국 10번 접촉해서 HP가 0이 되었다.**

이 결과가 LgLG가 뇌 전체에 아무 영향을 주지 않는다는 뜻은 아니다.

현재 MapleFly decoder는 주로 다음 output만 행동으로 사용한다.

```text
DNa02   -> 좌우 이동
DNp01   -> 점프
arm pull -> 공격
```

따라서 가능한 설명은 다음 단계에서 직접 확인해야 한다.

- LgLG가 현재 decoder가 보는 output에는 거의 전달되지 않을 수 있다.
- 다른 descending / motor group은 변했지만 게임 행동으로 읽지 않았을 수 있다.
- 현재 pulse 세기/시간이 decoded behavior를 바꾸기에 부족할 수 있다.

이 문서에서는 그중 어느 것도 아직 원인으로 단정하지 않는다.

## 결론

HP 100 / 접촉 -10 규칙 자체는 정상적으로 작동했고,
모든 trial에서 10회 접촉 후 KO가 발생했다.

하지만 현재 LgLG knock proxy는 **IMPACT_OFF 대비 측정 가능한 행동 차이를 만들지 못했다.**

v4는 실패한 실험이 아니라,
다음 질문을 명확하게 만든 null result다.

> **충돌 직후 실제로 어떤 descending / motor neuron group이 변하는가?**

다음 단계에서는 LgLG 세기를 임의로 올리기 전에,
접촉 전후의 connectome output을 직접 probe해서 어떤 출력이 반응하는지부터 찾는 것이 맞다.
