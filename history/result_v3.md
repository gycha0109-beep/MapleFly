# result_v3 — Visual-only 대조군

## 목적

v2의 SENSORY OFF는 target visual input과 SNta ground input을 함께 제거했다.
v3에서는 SNta는 양쪽 조건에 동일하게 유지하고 target visual channel만 제거했다.

질문:

> SNta를 유지해도 target visual input이 있을 때 target 접근과 HIT/KILL이 증가하는가?

## 실행

GitHub Actions run:

```text
35353782679
```

commit:

```text
588a372a95337aaa16e202268202e64c3cdeed4e
```

MaleCNS:

```text
alextitonis/fly.ai
95a3dbcb05241b0a5c07028ca8ad945b23fbbe6e
```

조건:

```text
180 simulated seconds
3 pairs
seeds 64, 65, 66
9,000 brain steps / trial

FULL
  SNta + LC10a + LPLC1 + LPLC2 + LC4

VISUAL_OFF
  SNta only
```

같은 pair는 같은 seed를 사용했고 실행 순서를 번갈아 배치했다.

## 개별 결과

| Pair | Seed | Condition | Target 방향 이동 | HIT / ATTACK | 적중률 | KILL |
| --- | ---: | --- | ---: | ---: | ---: | ---: |
| 1 | 64 | FULL | 66.1% | 98 / 367 | 26.7% | 32 |
| 1 | 64 | VISUAL_OFF | 50.7% | 11 / 96 | 11.5% | 3 |
| 2 | 65 | VISUAL_OFF | 46.9% | 6 / 111 | 5.4% | 2 |
| 2 | 65 | FULL | 65.8% | 78 / 334 | 23.4% | 26 |
| 3 | 66 | FULL | 64.6% | 89 / 373 | 23.9% | 29 |
| 3 | 66 | VISUAL_OFF | 51.9% | 6 / 98 | 6.1% | 2 |

## 평균

| 지표 | FULL | VISUAL_OFF | 차이 |
| --- | ---: | ---: | ---: |
| target 방향 이동 | **65.5%** | 49.8% | **+15.7%p** |
| 공격 적중률 | **24.6%** | 7.7% | **+17.0%p** |
| KILL / 180초 | **29.00** | 2.33 | **+26.67** |

세 seed 모두 같은 방향의 차이를 보였다.

v2 ALL_OFF와 비교하면:

```text
v2 ALL_OFF       toward 49.4% / hitRate 4.4% / kills 1.67
v3 VISUAL_OFF    toward 49.8% / hitRate 7.7% / kills 2.33
v3 FULL          toward 65.5% / hitRate 24.6% / kills 29.00
```

SNta를 유지하면 baseline 성능이 조금 올라가지만 FULL과의 큰 차이는 그대로 남는다.

## 해석

현재 실험 설계가 직접 지지하는 표현은 다음이다.

> **MapleFly의 target visual encoder가 connectome을 거쳐 target-directed movement와 전투 성능 차이에 강하게 기여한다.**

v1의 단일 우연 KO와 달리, 위치가 계속 바뀌는 target에서도 세 seed 모두 FULL이 VISUAL_OFF보다 높은 성능을 보였다.

다만 다음은 아직 주장하지 않는다.

- 실제 초파리가 버섯이라는 개념을 이해한다.
- biological fly의 자연 사냥 행동이다.
- 공격 의미를 학습했다.
- LC10a/LPLC1/LPLC2/LC4 중 특정 하나가 단독 원인이다.
- 현재 visual encoder가 실제 초파리 시각계를 그대로 재현한다.

현재 구조는 사람이 설계한 인터페이스다.

```text
게임 상태
→ 위치/거리/approaching 계산
→ visual sensory drive
→ MaleCNS LIF simulation
→ descending output
→ hand-tuned decoder
→ 게임 행동
```

표본은 seed 3개이므로 여기서는 통계적 유의성 검정까지 하지 않는다.

## 결론

```text
target 방향 이동
FULL       65.5%
VISUAL_OFF 49.8%

공격 적중률
FULL       24.6%
VISUAL_OFF  7.7%

평균 KILL
FULL       29.00
VISUAL_OFF  2.33
```

따라서 현재 MapleFly에서는 **target 위치와 연결된 visual sensory drive가 행동 차이의 핵심 설명 변수 중 하나**라는 근거가 v2보다 강해졌다.
