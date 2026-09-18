# development_v2 — 평지 대조실험 자동화

## 목표

v1에서 하단 버섯 M-03이 KO되었지만,
그 결과는 "버섯을 의도적으로 사냥했다"기보다
불규칙하게 움직이고 공격을 휘두르다가 우연히 hitbox가 겹친 결과로 보는 것이 타당했다.

따라서 v2의 질문은 다음으로 좁혔다.

> **버섯에 대한 감각 입력이 있을 때가, 외부 감각 입력이 전혀 없을 때보다 실제 행동이 달라지는가?**

이를 사람 손으로 반복 측정하지 않고
같은 조건으로 자동 실행·기록할 수 있게 만드는 것이 이번 개발 목표다.

---

## 1. 2층을 일시적으로 제거

현재 main의 실험 환경은 v1의 상단 발판, 점프 갭, 사다리를 잠시 제거했다.

v2 arena:

```text
            플레이어                    버섯
─────────────── flat ground ───────────────
```

실험마다 플레이어는 중앙에서 시작하고,
버섯은 하단 전체 폭의 pseudo-random x 위치에 배치된다.

이유는 다층 navigation 문제를 제거하고
**감각 입력 자체가 접근/공격 행동에 영향을 주는지** 먼저 분리해서 보기 위해서다.

v1 맵 구조는 `history/development_v1.md`에 남아 있으므로 삭제된 실험 기록은 아니다.

---

## 2. SENSORY ON / OFF 대조군

### ON

기존 v1과 동일하게 버섯 상태가 다음 sensory channel로 변환된다.

- LC10a
- LPLC1
- LPLC2
- LC4
- SNta

### OFF

connectome과 decoder는 그대로 두고
**외부 sensory drive만 완전히 빈 객체로 보낸다.**

즉 OFF도 같은 166,700-neuron network가 계속 tonic/noise와 내부 activity로 움직이지만,
MapleFly의 버섯/바닥 정보는 넣지 않는다.

이렇게 해야 "초파리 뇌가 원래 시끄럽게 움직이는 것"과
"버섯 입력 때문에 행동이 달라지는 것"을 비교할 수 있다.

---

## 3. paired seed

v1 worker는 reset마다 항상 seed 64를 사용했다.

v2에서는 worker reset에 seed를 전달할 수 있게 바꿨다.

각 pair는 다음처럼 같은 seed를 공유한다.

```text
pair 1
  ON  seed 64
  OFF seed 64

pair 2
  OFF seed 65
  ON  seed 65
```

같은 pair의 ON/OFF가 같은 pseudo-random noise sequence에서 시작하므로
noise 차이를 줄이고 sensory 조건의 영향을 더 직접적으로 비교할 수 있다.

---

## 4. 순서와 방향 편향 완화

pair마다 두 가지를 번갈아 바꾼다.

### ON/OFF 순서

```text
pair 1: ON  -> OFF
pair 2: OFF -> ON
pair 3: ON  -> OFF
...
```

항상 ON부터 돌려서 생길 수 있는 시간/브라우저 상태 편향을 줄이기 위함이다.

### 버섯 위치

초기 위치와 KO 이후 위치 모두 하단 전체 폭에서 pseudo-random하게 뽑는다.

다만 ON/OFF 대조군의 공정성을 위해 실시간 `Math.random()`은 쓰지 않는다.
각 위치는 `pair seed + spawn index`로 결정되므로 같은 pair에서
ON/OFF가 n번째 spawn까지 도달했다면 **n번째 x 좌표가 동일하다.**

---

## 5. 자동 macro

페이지에 `AUTOMATED A/B TEST` 패널을 추가했다.

입력:

- trial seconds
- pair 수
- base seed

기본값:

```text
60초 × 3 pair = 총 6 trials
```

긴 baseline용 프리셋:

```text
300 simulated seconds × 5 pair = 총 10 trials
```

### 왜 wall-clock이 아니라 brain step으로 끊는가

같은 seed를 ON/OFF에 재사용해도 wall-clock 60초 동안 실행하면
조건별 계산량 차이 때문에 실제 brain step 수가 달라질 수 있다.

MaleCNS runtime은 20ms timestep, 즉 50 Hz이므로
v2 macro는 trial 길이를 다음처럼 고정한다.

```text
60초  -> 3,000 brain steps
300초 -> 15,000 brain steps
```

따라서 paired ON/OFF가 같은 수의 random draws와 simulation steps를 거치도록 맞춘다.
실제 벽시계 실행 시간(wallDurationMs)은 별도로 기록한다.

실험 시작 버튼을 누르면:

1. connectome이 없으면 자동 로드
2. trial 조건 생성
3. brain seed reset
4. sensory ON/OFF 설정
5. player와 target 위치 reset
6. 지정한 "초"를 50 Hz brain step 수로 변환해 정확히 그 step 수만큼 실행
7. 결과 기록
8. 2초 간격
9. 다음 trial 진행
10. 모든 pair 종료 후 평균 비교 표시

---

## 6. logger

각 trial마다 다음 값을 기록한다.

- pair
- seed
- target side
- SENSORY ON/OFF
- duration
- 총 이동 거리
- target 방향 이동 거리
- target 반대 방향 이동 거리
- target 방향 이동 비율
- 버섯까지 최소 거리
- 공격 가능 거리 근처에 있었던 시간
- LEFT decision 수
- RIGHT decision 수
- JUMP decision 수
- ATTACK decision 수
- IDLE decision 수
- HIT 수
- HIT / ATTACK 적중률
- KILL 수
- 첫 HIT까지 시간
- 첫 KILL까지 시간
- 종료 시 버섯 HP
- 종료 시 player x
- 평균 fired neurons / step
- 평균 brain step ms

결과는 세 군데에 남는다.

1. 화면 table
2. browser localStorage
3. 사용자가 CSV / JSON으로 다운로드 가능

---

## 7. 실험 유효성 보호

브라우저 탭을 background로 보내거나 최소화하면
timer / animation / worker scheduling이 달라질 수 있다.

따라서 실험 중 `document.hidden`이 되면 자동으로 중단한다.

중단된 run은 완료된 결과로 취급하지 않는다.

---

## 8. 이번 버전에서 하지 않은 것

- decoder threshold 개선
- 공격을 버섯 가까이에서만 허용하는 규칙
- 버섯 쪽으로 직접 이동시키는 rule
- 보상 함수
- 강화학습
- 사다리
- 2층 navigation

v2의 목적은 초파리를 잘하게 만드는 것이 아니라
**v1의 행동이 감각 입력과 실제로 연결되어 있는지를 측정 가능하게 만드는 것**이다.


---

## 9. KO 후 위치를 바꿔 재생성

초기 v2 구현은 버섯이 한 번 죽으면 trial 종료까지 죽은 상태로 남았다.
이 경우 60초나 180초를 길게 돌려도 첫 KO 이후의 전투 구간은 거의 정보가 없어지는 문제가 있다.

그래서 다음 규칙을 추가했다.

```text
버섯 HP 0
→ KO
→ 0.7초 대기
→ HP 30으로 재생성
→ 하단 전체 폭의 다른 pseudo-random x 좌표에 생성
→ trial 계속
```

재생성 위치는 화면 한쪽 주변에 묶지 않는다.

```text
spawn x 범위:
55 .. 945 px
```

즉 사실상 하단 전 구간을 사용한다.

다만 재현성을 위해 완전한 실시간 랜덤이 아니라
pair seed와 spawn index를 hash한 pseudo-random 값을 사용한다.
따라서 같은 seed를 쓰는 SENSORY ON/OFF pair는
**n번째 spawn까지 도달했다면 같은 n번째 위치가 나온다.**

이 방식을 택한 이유는 두 가지다.

1. 같은 자리에 계속 서 있는 버섯을 우연히 연타해서 죽이는 상황을 줄인다.
2. ON/OFF 비교에서 respawn 위치 자체가 다른 랜덤 변수로 들어오는 것을 막는다.

logger에는 다음도 추가했다.

- respawn 횟수
- 실제 spawn x 위치 배열

따라서 앞으로는 단순 KILL 수뿐 아니라
위치가 바뀐 새 target에 다시 접근해 HIT/KILL이 이어지는지도 확인할 수 있다.


---

## 10. 우측 편향 제거 — 하단 전체 random spawn

첫 respawn 구현은 초기 target side를 기준으로 ±30~90px만 움직였다.
이 방식은 특히 우측 시작 trial에서 버섯이 계속 우측 구역에 몰리는 문제가 있었다.

이를 폐기하고 **초기 spawn부터 모든 respawn까지 하단 전체 폭을 사용**하도록 변경했다.

```text
x = 55 .. 945 px
```

spawn 위치는 `seed + spawnIndex`의 deterministic hash로 계산한다.

즉 화면상으로는 하단 전체에 랜덤하게 나타나지만,
같은 paired seed의 ON/OFF 실험은 동일한 spawn 순서를 재현할 수 있다.

이 변경으로 측정 질문도 더 명확해진다.

> 초파리가 한쪽에 고정된 대상을 우연히 때리는 것이 아니라,
> 계속 바뀌는 위치의 target에 대해 SENSORY ON일 때 접근·적중 성능이 달라지는가?


---

## 11. 브라우저 종속성 제거 — Headless Runner

실제로 180초 이상 실험을 반복해 보니 브라우저 화면을 계속 띄워둬야 하는 구조가 실험 운영에 적합하지 않았다.

백그라운드 탭에서는 브라우저가 `requestAnimationFrame`과 timer를 throttling할 수 있으므로,
사이트를 최소화하거나 다른 작업을 하는 순간 실험 조건이 달라질 수 있다.

따라서 v2에 **브라우저와 완전히 분리된 Node.js Headless Runner**를 추가했다.

### 구조

```text
src/headless/connectome-runtime.mjs
  ├─ pinned MaleCNS 다운로드/캐시
  ├─ FLYM / FLYW parser
  ├─ LIF connectome runtime
  └─ output spike-rate tracker

src/headless/experiment-v2-core.mjs
  ├─ sensory encoder
  ├─ motor decoder
  ├─ flat arena fixed-step simulator
  ├─ deterministic random spawn
  └─ trial metrics

scripts/experiment-v2-headless.mjs
  ├─ CLI
  ├─ paired ON/OFF scheduler
  ├─ CSV / JSON
  └─ 한국어 summary.md
```

브라우저 renderer나 DOM은 headless 실행 경로에 전혀 필요하지 않다.

### fixed-step

Headless 실험은 다음 기준으로만 진행한다.

```text
brain step = 20 ms
game step  = 20 ms
decoder    = 2 brain steps마다
sensory    = 2 brain steps마다
```

따라서 컴퓨터가 빠르면 실제 벽시계 시간보다 빨리 계산될 수 있고,
느리면 더 오래 걸릴 수 있지만 **180 simulated seconds는 항상 같은 step 수**다.

### 브라우저 쪽도 simulation time으로 정렬

기존 browser controller의 jump / attack cooldown은 `performance.now()`를 기준으로 했다.
이를 brain step × 20ms 기준으로 바꿨다.

sensory update도 wall-clock 45ms 대신 brain step 수를 기준으로 전송한다.

이 변경의 목적은 화면 실험과 headless 실험이 가능한 한 같은 제어 계약을 사용하게 만드는 것이다.

### GitHub Actions

`.github/workflows/experiment-v2.yml`을 추가했다.

Actions 화면에서 다음 세 값만 입력한다.

- seconds
- pairs
- seed

그 뒤 브라우저를 닫거나 PC를 꺼도 GitHub hosted runner가 실험을 끝까지 수행한다.

결과 artifact:

```text
experiment_v2.json
experiment_v2.csv
summary.md
```

MaleCNS 약 58MB asset은 commit 기준 cache key로 캐시한다.

### 자동 smoke test

headless 코드나 workflow가 main에 변경되면 push 이벤트에서

```text
2 simulated seconds × 1 pair
```

의 짧은 smoke experiment를 자동 실행한다.

이 smoke가 성공해야 최소한 다음을 확인할 수 있다.

- Node에서 connectome 다운로드/캐시 가능
- binary parse 성공
- 실제 connectome step 실행
- ON/OFF 2개 trial 종료
- 결과 파일 생성
- artifact 업로드 성공
