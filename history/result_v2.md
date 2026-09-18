# result_v2 — SENSORY ON / OFF paired headless 대조실험

## 1. 목적

v1에서는 버섯 1마리가 KO되었지만,
그 장면만으로는 초파리 connectome이 버섯을 추적했다고 보기 어려웠다.

따라서 v2에서는 다음 질문을 검증했다.

> **MapleFly의 외부 sensory drive가 들어갈 때가, 외부 sensory drive가 전혀 없을 때보다 target 방향 이동과 공격 적중이 실제로 증가하는가?**

이번 문서는 행동을 의인화하지 않고,
실제로 기록된 수치만 기준으로 해석한다.

---

## 2. 실행 정보

GitHub Actions run:

```text
35352218016
```

실행 commit:

```text
d9f0a664f25fffb7d208104d53e6084048c77cf1
```

MaleCNS source:

```text
alextitonis/fly.ai
95a3dbcb05241b0a5c07028ca8ad945b23fbbe6e
```

조건:

```text
trial length : 180 simulated seconds
pairs        : 3
seeds        : 64, 65, 66
conditions   : SENSORY ON / SENSORY OFF
brain step   : 20 ms
steps/trial  : 9,000
total trials : 6
```

ON/OFF는 같은 pair 안에서 같은 seed를 사용했다.

버섯 spawn은 `seed + spawnIndex`로 결정되는 deterministic pseudo-random sequence이므로,
같은 pair에서 동일한 n번째 spawn까지 도달했다면 같은 n번째 x 좌표를 사용한다.

브라우저 화면은 사용하지 않았고
Node.js headless fixed-step runner에서 실행했다.

---

## 3. 개별 결과

| Pair | Seed | Condition | Target 방향 이동 | HIT / ATTACK | 적중률 | KILL |
| --- | ---: | --- | ---: | ---: | ---: | ---: |
| 1 | 64 | ON | 66.1% | 98 / 367 | 26.7% | 32 |
| 1 | 64 | OFF | 51.5% | 9 / 123 | 7.3% | 3 |
| 2 | 65 | OFF | 46.4% | 1 / 115 | 0.9% | 0 |
| 2 | 65 | ON | 65.8% | 78 / 334 | 23.4% | 26 |
| 3 | 66 | ON | 64.6% | 89 / 373 | 23.9% | 29 |
| 3 | 66 | OFF | 50.3% | 6 / 117 | 5.1% | 2 |

세 seed 모두에서 ON 조건의 target 방향 이동, HIT, KILL이 OFF보다 높았다.

---

## 4. 평균

| 지표 | SENSORY ON | SENSORY OFF | 차이 |
| --- | ---: | ---: | ---: |
| target 방향 이동 비율 | **65.5%** | 49.4% | **+16.1%p** |
| 공격 적중률 | **24.6%** | 4.4% | **+20.2%p** |
| KILL / 180초 | **29.00** | 1.67 | **+27.33** |

특히 OFF의 target 방향 이동 비율이 약 50%에 가까운 반면,
ON에서는 세 seed 모두 약 65% 수준으로 올라갔다.

공격 역시 ON에서는 평균 약 4회 중 1회가 실제 HIT였고,
OFF에서는 대부분 허공 공격이었다.

---

## 5. v1과 비교한 해석

v1의 결과는 다음 표현이 가장 적절했다.

> **"버섯을 사냥했다"기보다 "막 휘두르다 버섯이 얻어걸려 죽었다."**

v2에서는 상황이 달라졌다.

버섯 위치가 하단 전체에서 계속 바뀌는 조건에서도
세 개의 독립 seed 모두에서 SENSORY ON이 OFF보다:

- target 방향으로 더 많이 이동했고
- 실제 HIT가 크게 증가했고
- KILL 수도 크게 증가했다.

따라서 v2 결과는 최소한 다음을 지지한다.

> **현재 MapleFly의 외부 sensory input이 connectome의 출력과 게임 행동을 체계적으로 변화시키고 있다.**

즉 v1의 단일 우연 KO만으로 설명하기 어려운 반복 가능한 조건 차이가 확인되었다.

---

## 6. 아직 말하면 안 되는 것

이번 결과만으로 다음을 단정하지 않는다.

- 초파리가 "버섯"이라는 객체를 이해한다.
- 초파리가 공격의 목적을 이해한다.
- 실제 초파리가 메이플스토리를 학습했다.
- 현재 행동이 생물학적 의미의 사냥 행동이다.
- visual input만으로 target 추적이 발생했다고 확정한다.

가장 중요한 제한은 **SENSORY OFF가 target visual channel만 끈 조건이 아니라는 것**이다.

v2 OFF에서는 다음을 모두 제거했다.

```text
LC10a
LPLC1
LPLC2
LC4
SNta
```

즉 버섯 관련 visual drive뿐 아니라
현재 MapleFly에서 지면 접촉 상태를 주는 SNta drive까지 함께 제거되었다.

따라서 v2가 직접 증명한 것은:

> **"외부 sensory drive 전체가 있을 때와 없을 때 행동 성능이 크게 다르다."**

까지다.

아직:

> **"버섯 관련 visual drive 자체가 target 추적 차이를 만든다."**

까지 분리해서 증명한 것은 아니다.

---

## 7. 다음 대조군

다음 실험에서는 지면 관련 입력은 양쪽 모두 유지한다.

```text
FULL
  SNta   ON
  visual ON

VISUAL_OFF
  SNta   ON
  visual OFF
```

visual channel:

```text
LC10a
LPLC1
LPLC2
LC4
```

이렇게 하면 locomotion에 영향을 줄 수 있는 기본 ground input은 동일하게 유지하면서,
**target 위치·거리와 연결된 visual drive만 제거**할 수 있다.

다음 질문은 훨씬 좁다.

> **지면 감각을 동일하게 유지해도, 버섯 visual input이 있을 때 target 접근과 HIT/KILL이 증가하는가?**

이 대조군에서도 차이가 반복되면
v2보다 훨씬 직접적으로 "현재 visual encoder → connectome → target-directed behavior" 연결을 지지할 수 있다.

---

## 8. 결론

v2의 180초 × 3 paired experiment에서는
SENSORY ON이 OFF보다 모든 seed에서 큰 성능 차이를 보였다.

핵심 수치는 다음과 같다.

```text
target 방향 이동
ON  65.5%
OFF 49.4%

공격 적중률
ON  24.6%
OFF  4.4%

평균 KILL
ON  29.00
OFF  1.67
```

따라서 v1의 "우연히 하나 잡은 것"과 달리,
v2에서는 **외부 sensory input 유무와 행동 성능 사이의 반복 가능한 차이**가 확인되었다.

다만 OFF가 SNta까지 제거한 조건이므로,
target visual input의 독립 효과는 다음 대조군에서 분리 검증한다.
