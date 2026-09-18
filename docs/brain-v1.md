# MapleFly Brain-in-a-Jar v1

## 목적

MapleFly의 수동 키 입력을 실제 초파리 MaleCNS connectome 출력으로 대체하는 첫 통합 단계다.

이 버전에서 **게임 상태를 보고 곧바로 행동을 결정하는 AI 로직은 두지 않는다.**

```text
MapleFly 게임 상태
  -> 감각 인코더
  -> 실제 MaleCNS connectome
  -> descending / motor readout
  -> LEFT / RIGHT / UP / DOWN / JUMP / ATTACK
  -> 기존 MapleFly 캐릭터
```

## 고정 upstream

외부 데이터는 다음 upstream commit에 고정한다.

```text
repository: alexitonis/fly.ai
commit: 95a3dbcb05241b0a5c07028ca8ad945b23fbbe6e
MaleCNS: 166,700 neurons
connections: 25,088,107
weights: ~57.6 MB
meta: ~0.34 MB
```

MapleFly 저장소에 대형 connectome 바이너리를 복사하지 않고, 브라우저가 고정 commit의
`raw.githubusercontent.com` asset을 직접 내려받는다.

## 브라우저 구조

`src/brain/fly-worker.js`

- 대형 connectome 파싱
- leaky integrate-and-fire step
- 20 ms timestep
- 시냅스 전파
- 출력 뉴런 spike rate 계산
- 메인 UI가 멈추지 않도록 Web Worker에서 실행

`src/brain/fly-controller.js`

- 게임 상태를 감각 입력으로 바꿈
- Worker에 감각 drive 전달
- 실제 connectome의 출력 spike rate를 게임 행동으로 디코딩
- 뇌 상태 UI/telemetry 관리

`src/game.js`

- 기존 물리/전투 코드는 유지
- MANUAL과 FLY CONTROL 입력 소스만 교체

## 감각 인코더 v1

현재 버섯 중 화면 좌표상 가장 가까운 살아 있는 개체를 시각 대상이라고 간주한다.

| 게임에서 관측한 것 | 자극하는 실제 cell type | 용도 |
| --- | --- | --- |
| 대상이 왼쪽/오른쪽에 있음 | LC10a L/R | target tracking |
| 대상이 가까움/접근 중 | LPLC1 L/R | small approaching object |
| 대상이 커지듯 가까워짐 | LPLC2 L/R | looming |
| 아주 가까운 대상 | LC4 L/R | fast looming / threat |
| 바닥에 발이 닿음 | SNta L/R | tarsal contact |
| 상단 발판의 점프 갭 접근 | LPLC2 + LC4 | v1의 edge/threat proxy |

마지막 점프 갭 처리는 실제 파리의 완전한 시각 모델이 아니라,
현재 2D 게임에서 edge cue를 looming/threat 입력으로 번역한 **인터페이스 가정**이다.

## 출력 디코더 v1

| connectome 출력 | MapleFly 행동 | 해석 |
| --- | --- | --- |
| DNa02 L vs R | LEFT / RIGHT | 실제 파리 steering readout |
| DNp01 | JUMP | giant-fiber escape / take-off |
| leg extensor vs flexor motor groups | UP / DOWN | 사다리용 실험적 매핑 |
| arm-pull DN group | ATTACK | 게임 인터페이스용 실험적 매핑 |

ATTACK은 실제 초파리의 "버섯 공격 뉴런"을 의미하지 않는다.
현재는 fly.ai의 browser worker가 추적하는 threat-responsive arm-pull descending group을
게임의 근접 공격 버튼에 연결한 것이다.

## 중요한 경계

- connectome 내부 weight를 학습하거나 바꾸지 않는다.
- 몬스터 위치를 보고 `moveRight()` 같은 직접 스크립트를 실행하지 않는다.
- 감각 인코더와 출력 디코더는 인간이 정한 인터페이스다.
- 따라서 "초파리가 메이플을 이해한다"는 의미가 아니다.
- 결과가 이상하거나 아무것도 못 하는 것도 유효한 실험 결과다.

## 조작

1. 페이지에서 **초파리 뇌 불러오기** 클릭
2. 약 58 MB의 upstream connectome asset 다운로드
3. READY가 되면 **FLY CONTROL 시작**
4. MANUAL 입력이 차단되고 connectome 출력이 캐릭터를 조종
5. 다시 버튼을 누르면 사람이 조종
6. `R`은 맵/몹 상태와 connectome runtime을 함께 초기화

## 알려진 위험

- raw GitHub의 일시적인 rate limit 또는 네트워크 문제로 로드가 실패할 수 있다.
- 166,700 뉴런과 25M+ 연결을 브라우저 메모리에 올리므로 저사양 PC/모바일에서는 무겁다.
- 현재 motor decoder threshold는 hand-tuned interface 값이다.
- 실제 MaleCNS에서 DNg100/MDN walking command가 감각 입력에 잘 반응하지 않는 upstream 한계가 있다.
- 현재 ATTACK과 사다리는 생물학적으로 강한 의미를 주장하지 않는다.

## 다음 검증

- 실제 페이지에서 upstream asset CORS/다운로드 성공 확인
- READY 이후 fired/step 및 step ms telemetry 확인
- LC10a 편측 자극에 DNa02 편측 차이가 생기는지 확인
- 가까운 버섯/갭에서 DNp01 증가 여부 확인
- FLY CONTROL 5분 baseline 기록
- kill / hit / 이동거리 / 추락 / idle 비율 기록
