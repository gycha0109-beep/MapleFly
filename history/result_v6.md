# result_v6 — full MaleCNS learning-readiness

## 결론

v6에서는 full MaleCNS에 dopamine-gated memory를 바로 넣지 않았다.

먼저 현재 pinned 166,700-neuron brain이
**경험을 구분해서 기록할 수 있는 상태인지** 확인했다.

결과는 명확하다.

> **현재 20 ms full-connectome 모델은 그대로는 학습용 mushroom-body state로 쓰기 어렵다.**

원본 상태에서는 KC가 사실상 전부 켜져 있고,
PAM dopamine population도 ceiling에 붙는다.

정적 KC 억제로 잠깐 sparse code가 만들어지는 지점은 있었지만
한 값에서만 통과하는 knife-edge였다.

그 다음 실제 APL outgoing connectome edge를 강화하는 feedback proxy도 시험했지만,
넓고 안정적인 odor-specific sparse code를 만들지 못했다.

따라서 v6 종료 시점의 판정은:

~~~text
internal KC -> MBON plasticity
NOT READY
~~~

이다.

이 결과 때문에 `-0.30` 같은 숫자를 production 학습값으로 박지 않는다.

---

## Phase A — KC tonic-bias readiness

GitHub Actions:

~~~text
run      35408919611
commit   b32b5042ed0e8c19426bd708435f9d5230f307c8
artifact 10572964364
~~~

population:

~~~text
KC      4,064
MBON       97
PAM       316
PPL1       16
APL         2
DN      1,316
~~~

원본 brain:

~~~text
KC bias 0.00

rest KC active     100.0%
vinegar/rest         1.00x
cVA/rest             1.00x
signature Jaccard    1.00
PAM rest            50.00 Hz
~~~

즉 냄새가 오기 전부터 KC가 거의 전부 활성이고,
vinegar와 cVA의 KC signature도 사실상 같다.

### sweep 평균 — seeds 64 / 65

| KC bias | rest active | vinegar/rest | cVA/rest | Jaccard | vinegar/cVA MBON responders | Gate 1/2 |
| ---: | ---: | ---: | ---: | ---: | ---: | :---: |
| 0.00 | 100.0% | 1.00x | 1.00x | 1.00 | 1.5% / 3.1% | FAIL |
| -0.24 | 82.9% | 1.00x | 1.00x | 1.00 | 3.1% / 5.7% | FAIL |
| -0.26 | 82.9% | 1.00x | 1.00x | 1.00 | 11.3% / 11.9% | FAIL |
| -0.28 | 44.6% | 1.00x | 1.00x | 1.00 | 29.4% / 29.9% | FAIL |
| -0.29 | 10.8% | 3.55x | 5.71x | 0.51 | 59.3% / 83.5% | FAIL |
| **-0.30** | **5.0%** | **5.47x** | **7.64x** | **0.25** | **47.4% / 59.8%** | **PASS** |
| -0.31 | 3.9% | 1.65x | 5.33x | 0.29 | 13.9% / 34.5% | FAIL |
| -0.32 | 2.6% | 1.31x | 2.09x | 0.51 | 7.2% / 11.9% | FAIL |
| -0.34 | 1.2% | 1.71x | 2.36x | 0.53 | 8.2% / 9.8% | FAIL |

사전 기준은 **인접한 3개 level이 모두 PASS**해야 했다.

실제:

~~~text
-0.29 FAIL
-0.30 PASS
-0.31 FAIL
~~~

따라서:

~~~text
plasticity-ready = false
~~~

이다.

seed별로도 `-0.29~-0.31` 부근의 반응 폭이 크게 달라졌다.
고정 `-0.30`은 학습 기반으로 쓰기에는 지나치게 민감하다.

---

## Phase B — APL feedback proxy

Phase A의 정적 bias를 고정하는 대신,
pinned connectome 안에 실제로 존재하는 APL 두 뉴런의 outgoing synapse만 증폭했다.

새로운 KC 억제 연결을 만들지는 않았다.

~~~text
effective APL output
= pinned connectome weight × APL output gain
~~~

GitHub Actions:

~~~text
run      35409346812
commit   d0a0113777887cbb5166cd450b99aef09eeb7a2b
artifact 10573790136
~~~

추가 사전 gate:

~~~text
PAM rest  <= 5 Hz
PPL1 rest <= 5 Hz
~~~

### sweep 평균 — seeds 64 / 65

| APL gain | rest KC active | vinegar/rest | cVA/rest | Jaccard | PAM / PPL1 rest | ready |
| ---: | ---: | ---: | ---: | ---: | ---: | :---: |
| 1.0 | 100.0% | 1.00x | 1.00x | 1.00 | 50.00 / 34.38 Hz | FAIL |
| 1.5 | 100.0% | 1.00x | 1.00x | 1.00 | 50.00 / 34.38 Hz | FAIL |
| 2.0 | 94.3% | 1.00x | 1.00x | 1.00 | 45.77 / 32.88 Hz | FAIL |
| 3.0 | 44.6% | 1.00x | 1.00x | 1.00 | 13.09 / 17.47 Hz | FAIL |
| 4.0 | 42.5% | 1.00x | 1.01x | 1.00 | 10.87 / 15.78 Hz | FAIL |
| 6.0 | 28.0% | 1.01x | 1.00x | 0.96 | 4.64 / 8.66 Hz | FAIL |
| 8.0 | 32.5% | 0.93x | 1.02x | 0.83 | 3.78 / 6.44 Hz | FAIL |
| 12.0 | 37.2% | 0.88x | 0.87x | 0.84 | 3.03 / 4.16 Hz | FAIL |
| 16.0 | 38.3% | 0.98x | 0.89x | 0.83 | 2.93 / 3.91 Hz | FAIL |

gain 12 이상에서는 dopamine background는 낮아졌지만,
KC가 sparse하지 않고 냄새 자극이 rest보다 강한 분리 pattern을 만들지도 못했다.

즉 APL output을 단순 증폭하는 것만으로는 해결되지 않았다.

~~~text
plasticity-ready = false
~~~

---

## 해석

v6가 실패했다는 뜻은
"초파리가 학습할 수 없다"가 아니다.

정확한 뜻은:

> **현재 MapleFly가 사용하는 full MaleCNS LIF 모델에
> KC -> MBON dopamine plasticity만 추가해서는
> 안정적으로 경험을 기록한다고 보기 어렵다.**

특히 원본 상태의 `100% KC active + PAM 50 Hz`는
기억을 쓰기 전에 먼저 해결해야 하는 모델 문제다.

APL outgoing gain 하나로도 해결되지 않았다.

---

## 제품 방향 결정

MapleFly의 목적은 생물학 논문을 만드는 것이 아니라
**초파리 connectome을 메이플 노예로 어디까지 훈련시킬 수 있는지 보는 것**이다.

따라서 여기서 APL/KC 모델 보정만 계속 파지는 않는다.

다음 버전은 full connectome을 **frozen neural reservoir**로 유지하고,
그 brain의 descending-neuron activity를 읽는 **학습 가능한 motor readout**을 붙인다.

핵심 제약은 유지한다.

~~~text
monster right -> RIGHT        금지
HP < 30 -> POTION             금지
target coordinate -> action   금지

connectome neural state
        ↓
trainable readout
        ↓
action
        ↓
environment outcome
        ↓
readout update
~~~

즉 게임 정답을 조건문으로 넣는 대신,
초파리가 실제 플레이 결과를 통해 **brain signal을 어떻게 버튼으로 써야 하는지** 배우게 한다.

첫 수업은 좌/우 이동만 있는 최소 튜토리얼로 간다.
