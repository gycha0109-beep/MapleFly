# development_v3 — Visual-only 대조군

## 목적

v2에서 SENSORY ON과 OFF 사이에 큰 행동 차이가 확인되었다.

하지만 v2의 OFF는 target visual input뿐 아니라
지면 상태를 전달하는 SNta까지 모두 제거했다.

따라서 v3에서는 질문을 더 좁힌다.

> **지면 관련 입력을 동일하게 유지해도, target visual input 자체가 target 접근과 HIT/KILL 차이를 만드는가?**

---

## 조건

### FULL

```text
SNta    ON
LC10a   ON
LPLC1   ON
LPLC2   ON
LC4     ON
```

### VISUAL_OFF

```text
SNta    ON
LC10a   OFF
LPLC1   OFF
LPLC2   OFF
LC4     OFF
```

두 조건 모두 같은 connectome, decoder, physics, respawn 규칙을 사용한다.

---

## paired 설계

v2와 동일하게 pair 안에서는 같은 seed를 사용한다.

```text
pair 1 seed 64: FULL -> VISUAL_OFF
pair 2 seed 65: VISUAL_OFF -> FULL
pair 3 seed 66: FULL -> VISUAL_OFF
```

실행 순서를 번갈아 배치해서 order effect를 줄인다.

버섯 spawn sequence도 동일한 `seed + spawnIndex` 규칙을 사용한다.

---

## 구현

새 파일:

```text
src/headless/experiment-v3-core.mjs
scripts/experiment-v3-visual-control.mjs
.github/workflows/experiment-v3.yml
```

v2의 headless connectome runtime과 flat arena / motor decoder는 그대로 재사용한다.

v3에서 새로 분리한 것은 sensory encoder다.

`VISUAL_OFF`에서도 다음 drive는 유지한다.

```text
SNta_L = grounded ? 0.05 : 0
SNta_R = grounded ? 0.05 : 0
```

그리고 target 위치·거리·approaching으로 만들어지는 visual channel만 제거한다.

---

## 결과 파일

```text
results/experiment-v3/
├─ experiment_v3.json
├─ experiment_v3.csv
└─ summary.md
```

측정 지표는 v2와 동일하게 유지한다.

- target 방향 이동 비율
- 최소 target 거리
- LEFT / RIGHT / JUMP / ATTACK
- HIT
- hit rate
- KILL
- respawn
- brain runtime telemetry

---

## 해석 기준

v3에서 FULL이 VISUAL_OFF보다 반복적으로 높은 성능을 보이면:

> **현재 MapleFly의 target visual encoder가 connectome을 거쳐 target-directed behavior 차이에 기여한다.**

라고 말할 근거가 v2보다 강해진다.

그래도 다음은 여전히 주장하지 않는다.

- 초파리가 버섯의 의미를 이해한다.
- biological fly의 자연 사냥 행동이다.
- 공격의 의미를 학습했다.
- MapleStory를 이해한다.

현재 visual encoder와 motor decoder 자체는 사람이 설계한 인터페이스다.
