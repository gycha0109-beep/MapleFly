# development_v1 — MapleFly v1 개발 기록

## 목적

MapleFly v1은 실제 메이플스토리 클라이언트가 아니라,
초파리 MaleCNS connectome을 붙여 행동을 관찰할 수 있는 **작은 메이플풍 실험 환경**을 먼저 만드는 단계다.

핵심 순서는 다음과 같다.

```text
단순 맵
→ 이동 물리
→ 버섯/HP/공격
→ 실제 MaleCNS connectome 연결
→ 초파리 출력으로 캐릭터 제어
```

---

## 1. 단순 맵부터 만든 이유

실제 메이플스토리부터 연결하면 화면 인식, UI, 네트워크, 안티치트,
복잡한 지형과 수많은 게임 상태가 한꺼번에 들어온다.

그래서 첫 환경은 행동 공간을 작게 제한했다.

### 맵 구조

- 하단 전체 평지
- 좌측 상단 발판
- 우측 상단 발판
- 두 상단 발판 사이에는 지형이 없고 점프로만 이동
- 좌측 사다리는 상단 발판부터 하단 바닥까지 연결
- 플레이어는 하단 중앙에서 시작
- 버섯 3개 배치

초기 스케치 해석 과정에서 점프 궤적 표시를 곡선 지형으로,
하단 플레이어 표시를 포털로 잘못 이해했으나 설명을 다시 받아 수정했다.

---

## 2. 사람 조작을 먼저 넣은 이유

초파리를 넣기 전에 맵 자체가 정상적으로 동작하는지 확인해야 했다.

수동 디버그 조작:

```text
A/D 또는 좌우 화살표: 이동
W/S 또는 상하 화살표: 사다리
Space: 점프
F: 공격
R: 전체 리셋
```

이 수동 입력은 최종 제어기가 아니라 **맵과 전투를 검증하기 위한 기준 입력**이다.

---

## 3. 전투 베이스라인

초파리 행동을 나중에 수치로 관찰하기 위해 버섯을 단순 그림이 아니라 상태를 가진 entity로 만들었다.

```text
버섯 수: 3
각 HP: 30
플레이어 ATK: 10
공격 1회 적중: -10 HP
HP 0: KO
```

추가한 것:

- 버섯 개체별 독립 HP
- 공격 hitbox
- 데미지 표시
- HP bar
- HITS / KILLS 카운터
- 리셋 시 모든 버섯 상태 복구

이 단계의 목적은 "잘 싸우는 게임"을 만드는 것이 아니라
초파리가 나중에 무엇을 했는지 측정할 수 있게 만드는 것이다.

---

## 4. Brain in a Jar v1

### 목표

사람 키보드 대신 실제 MaleCNS connectome 출력을 캐릭터 입력으로 사용한다.

```text
게임 상태
→ 감각 입력으로 변환
→ MaleCNS connectome
→ descending / motor neuron activity
→ MapleFly 행동
```

### upstream 선택

외부 connectome은 다음 snapshot으로 고정했다.

```text
repository: alexitonis/fly.ai
commit: 95a3dbcb05241b0a5c07028ca8ad945b23fbbe6e

neurons:      166,700
connections:  25,088,107
weights:      약 57.6 MB
meta:         약 0.34 MB
```

대형 바이너리를 MapleFly 저장소에 복사하지 않고,
브라우저가 이 고정 commit의 asset을 직접 읽는 방식을 선택했다.

이유:

- 저장소 크기를 불필요하게 키우지 않음
- upstream browser-export를 그대로 활용 가능
- commit 고정으로 재현 가능
- 빠르게 첫 실험까지 갈 수 있음

---

## 5. 브라우저 구현

### `src/brain/fly-worker.js`

Web Worker 안에서 실제 connectome 계산을 수행한다.

주요 역할:

1. `brain.json` 로드
2. `meta.bin` 로드
3. `weights.0.bin`, `weights.1.bin` 로드
4. cell type / left-right side index 구성
5. 25M+ connection 파싱
6. 20 ms timestep의 LIF network 실행
7. output group spike rate 계산
8. 메인 화면으로 telemetry 전달

업데이트 형태는 upstream browser implementation과 같은 계열이다.

```text
v <- decay*v + gain*(W @ spikes) + tonic + noise + sensory drive
v >= 1 -> spike, reset
```

### `src/brain/fly-controller.js`

게임과 뇌 사이의 인터페이스다.

#### 입력 쪽

현재 가장 가까운 살아 있는 버섯을 visual target으로 삼는다.

- LC10a: target tracking
- LPLC1: small approaching object
- LPLC2: looming
- LC4: 가까운 threat
- SNta: 발 접촉

상단 점프 갭은 아직 완전한 시각계 모델이 없기 때문에
LPLC2/LC4에 edge/threat proxy를 넣는다.

이것은 "실제 초파리가 낭떠러지를 이 뉴런으로 본다"는 주장이 아니라,
현재 2D 환경을 기존 connectome input channel로 번역하기 위한 인터페이스 가정이다.

#### 출력 쪽

- DNa02 L/R → LEFT / RIGHT
- DNp01 → JUMP
- leg extensor / flexor group → UP / DOWN
- arm-pull descending group → ATTACK

특히 ATTACK은 실제 초파리의 "버섯 공격 뉴런"이 아니다.
게임 입력에 연결하기 위해 선택한 실험용 readout이다.

---

## 6. 직접 자동사냥 로직을 넣지 않은 이유

다음과 같은 코드는 의도적으로 넣지 않았다.

```js
if (mushroom.x > player.x) moveRight();
if (nearMushroom) attack();
```

이렇게 하면 connectome은 장식이 되고 실제 행동은 사람이 만든 bot rule이 결정한다.

MapleFly v1의 핵심 경계는 다음이다.

```text
버섯/맵 상태
→ sensory stimulation
→ 166,700 neurons / 25M+ connections
→ output firing
→ 행동
```

즉 행동이 엉뚱하거나 아무것도 못 해도 그것 자체가 실험 결과다.

---

## 7. UI

화면 오른쪽에 `BRAIN IN A JAR` 패널을 추가했다.

표시 항목:

- connectome load 상태
- neuron 수
- synapse 수
- fired neurons / step
- brain step 시간
- DNa02 L/R
- DNp01
- arm-pull output
- 현재 action

`FLY CONTROL`을 켜면 사람 입력 대신 connectome 출력이 캐릭터에 들어간다.

---

## 8. v1에서 의도적으로 남긴 한계

- 완전한 초파리 시각계를 렌더링하지 않음
- 사다리의 의미를 학습시키지 않음
- 목적 함수 없음
- 강화학습 없음
- connectome weight 변경 없음
- 경로 계획 없음
- ATTACK readout은 생물학적 의미가 약한 게임용 매핑
- threshold는 hand-tuned interface 값

따라서 v1은 "초파리가 메이플을 배웠다"가 아니라
**실제 connectome을 작은 게임 환경에 폐루프로 연결한 첫 베이스라인**이다.
