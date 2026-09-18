# result_v5 — 빨간포션 사용 실험

## 질문

캐릭터에게 다음 조건을 줬다.

```text
최대 HP       100
버섯 접촉 피해 -10
빨간포션       30개
포션 회복량     +30
```

확인하고 싶은 것은 단순히 "포션을 쓸 수 있는가"가 아니다.

> **한 대 맞아서 HP가 90이 되자마자 포션을 들이붓는가, 아니면 HP가 더 내려간 뒤 효율적으로 사용하는가?**

## POTION action 인터페이스

실제 초파리 connectome에는 메이플스토리의 HP나 빨간포션 개념이 없다.

따라서 `HP < 100 -> 포션 사용` 같은 직접 규칙은 넣지 않았다.

Pinned upstream:

```text
alextitonis/fly.ai
95a3dbcb05241b0a5c07028ca8ad945b23fbbe6e
```

의 taste probe를 기준으로 다음 인터페이스를 고정했다.

```text
injured + potion remaining
-> LB3 + claw_tpGRN taste cue 0.8

mean(cb_motor neck/head L/R) >= 1.6 Hz
-> POTION action
```

`1.6 Hz`는 v5 결과를 보기 전에 upstream probe의 baseline/stimulus 중간값을 기준으로 고정했다.

이것은 실제 "포션 마시기 뉴런"이 아니라 **engineered DRINK proxy**다.

## 대조 조건

```text
POTION_CUE_ON
  visual target ON
  SNta ground ON
  LgLG contact knock ON
  damage ON
  potion 30개
  injured -> taste cue ON

POTION_CUE_OFF
  위 조건 동일
  injured -> taste cue OFF
```

두 조건 모두 동일한 head-motor decoder를 사용한다.
따라서 OFF에서도 spontaneous head-motor activity가 threshold를 넘으면 포션을 사용할 수 있다.

## 실행

GitHub Actions:

```text
run     35362106281
commit  290cfa801c5fc3b57060cd5c89e905570ac32c7c
```

조건:

```text
180 simulated seconds
3 pairs
seeds 64, 65, 66
6 trials
```

실제 connectome interface group 크기:

```text
taste L/R = 67 / 70 neurons
head  L/R = 54 / 53 cb_motor neurons
```

## 개별 결과

| Pair | Seed | 조건 | 접촉 | 포션 | 피격 1초 이내 | 평균 사용 HP | 실제 회복 | 낭비 회복 | 생존 |
| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 64 | CUE_ON | 40 | 30 | 30 | 90.0 | 300 | 600 | 42.94s |
| 1 | 64 | CUE_OFF | 46 | 30 | 28 | 88.0 | 360 | 540 | 50.24s |
| 2 | 65 | CUE_OFF | 54 | 30 | 30 | 85.3 | 440 | 460 | 57.84s |
| 2 | 65 | CUE_ON | 44 | 30 | 30 | 88.7 | 340 | 560 | 43.18s |
| 3 | 66 | CUE_ON | 42 | 30 | 30 | 89.3 | 320 | 580 | 42.00s |
| 3 | 66 | CUE_OFF | 43 | 30 | 29 | 89.0 | 330 | 570 | 46.78s |

## 평균

```text
                         CUE_ON    CUE_OFF
contacts                   42.0       47.7
potion uses                30.0       30.0
quick potion uses          30.0       29.0
quick / contact            71.5%      61.3%
average HP at use          89.3       87.4
actual healing            320.0      376.7
wasted healing            580.0      523.3
potions remaining           0.0        0.0
final HP                    0.0        0.0
survival                   42.7s      51.6s
mean head motor             1.431 Hz   1.400 Hz
```

## 가장 눈에 띄는 결과

### 1. 네. 거의 한 대 맞을 때마다 바로 먹었다.

CUE_ON에서는 세 trial 모두 포션 **30개를 전부 사용**했다.

그리고 30회 사용 전부가 직전 피격 후 1초 안에 발생했다.

평균 사용 HP는 **89.3**이었다.

즉 대부분:

```text
HP 100
-> 버섯 접촉
-> HP 90
-> 빨간포션
-> HP 100
```

형태였다.

Pair 1 / seed 64에서는 실제로 30개 포션이 **전부 HP 90에서 사용**됐다.

### 2. 회복량의 약 64%를 버렸다.

CUE_ON에서 포션 30개의 명목 회복량은 trial당:

```text
30 × 30 = 900 HP
```

이다.

하지만 평균 실제 회복은 320 HP뿐이었고,
평균 **580 HP가 overheal로 사라졌다.**

```text
580 / 900 = 64.4%
```

즉 게임 관점에서는 상당히 심한 물약 낭비다.

### 3. 더 중요한 문제: taste cue가 없어도 30개를 다 먹었다.

CUE_OFF에서도 세 trial 모두 포션 30개를 전부 사용했다.

평균 29회가 피격 1초 이내였고,
평균 사용 HP도 87.4였다.

따라서 현재 결과만 보면:

> **taste 자극을 받아서 포션을 적절히 마신다기보다, 현재 1.6 Hz head-motor decoder가 spontaneous activity에도 너무 쉽게 열려 있어서 다치기만 하면 포션 사용 기회가 생기는 즉시 거의 계속 소비한다.**

라는 해석이 더 정확하다.

CUE_ON의 mean head motor는 1.431 Hz,
CUE_OFF는 1.400 Hz로 ON 쪽이 조금 높았지만,
두 조건 모두 포션 재고를 전부 소모했기 때문에 현재 decoder는 포화 상태다.

### 4. CUE_ON이 오히려 더 낭비했다.

세 pair 평균에서:

```text
wasted healing
CUE_ON  580
CUE_OFF 523.3

survival
CUE_ON  42.7 s
CUE_OFF 51.6 s
```

이었다.

CUE_ON이 포션을 더 빨리 사용하면서 더 많은 overheal을 만들었고,
결과적으로 실제 회복량은 OFF보다 작았다.

다만 pair가 3개뿐이고 taste cue 자체가 connectome 전체 동역학을 바꾸므로,
"taste cue가 생존을 나쁘게 만든다"는 일반 결론으로 확대하지 않는다.

현재 확인된 것은 **이 설정에서는 CUE_ON이 더 즉시적이고 더 낭비적인 소비 패턴을 보였다**는 정도다.

## 결론

질문에 가장 직접적으로 답하면:

> **네. 지금 초파리는 빨간포션을 주면 거의 한 대 맞을 때마다 들이붓는다. 포션 30개를 전부 털고, 평균 HP 89 정도에서 마셔서 회복량 대부분을 버린 뒤 결국 죽는다.**

하지만 이것을 "초파리가 포션을 먹어야 산다는 것을 이해했다"고 해석할 근거는 없다.

오히려 v5가 드러낸 핵심 문제는 다음이다.

> **현재 DRINK threshold가 selective하지 않다.**

다음 실험에서 해야 할 일은 포션 threshold를 결과에 맞춰 임의로 높이는 것이 아니라,
injured 상태에서 taste cue 전후의 head-motor 분포를 직접 측정하고
absolute threshold 대신 **cue-induced delta / sustained response** 기준을 잡는 것이다.

## 실행 후 로깅 수정

이 run에서는 실제 포션 사용 이벤트와 `potionUses`, `potionEvents`는 정상 기록됐지만,
공용 `decisions` map에 `POTION` key가 빠져 있어 보조 지표 `potionDecisions`가 0으로 표시되는 로깅 오류가 있었다.

행동과 위 결과 수치에는 영향을 주지 않는다.

run 완료 후 이 bookkeeping 오류를 수정했고,
브라우저에서도 HP가 가득 찬 상태에서는 POTION action 자체가 나오지 않도록 정리했다.
