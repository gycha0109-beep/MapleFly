# development_v8 — Fly #001 학습 skill을 실제 브라우저 맵에 배치

## 목적

v7에서 PASS한 LEFT/RIGHT motor readout을
실제 MapleFly 브라우저 게임 loop에 연결한다.

이번 단계는 새로 학습시키는 단계가 아니라
**검증된 skill state를 실제 플레이 경로에서 재사용하는 배치 단계**다.

## Fly #001 skill

~~~text
schema       maplefly.fly-skill.v1
storage key  maplefly.fly-001.skill.v1
source run   35409704972
source run2  VISUAL_ON 100% / VISUAL_OFF 50%
~~~

원래 v7 policy는 1,316 descending-neuron feature를 사용했다.

브라우저 배치에서는 v7 weight 절대값 상위 64개 feature만 남긴
`v7-run2-top64` sparse policy를 사용한다.

이 sparse policy는 별도 Actions gate를 통과한 경우에만 main runtime에 배치한다.

## 저장

페이지 최초 로드 시 bundled Fly #001 state를 localStorage에 기록한다.

다음 접속부터 동일 schema/version이면 저장된 state를 다시 읽는다.

현재는 live online learning을 아직 하지 않으므로
브라우저에서 weight 자체가 변하지는 않는다.

하지만 state 계약과 저장 경로를 먼저 고정해
다음 단계에서 실제 플레이 후 weight update를 붙일 수 있게 한다.

## Worker 데이터 경로

브라우저 Worker는 전체 1,316 DN vector를 25Hz로 main thread에 복사하지 않는다.

대신 Fly #001 sparse policy가 실제 사용하는 64개 DN만
pinned metadata의 원래 DN ordering에서 선택한다.

Worker는 40ms마다 그 64개 뉴런의 spike count만 전송한다.

## calibration

v7 training feature는:

~~~text
0.5 s baseline
0.5 s target cue

DN feature
= cue Hz - baseline Hz
~~~

였으므로 browser에서도 FLY CONTROL을 켜자마자 바로 움직이지 않는다.

~~~text
SETTLE    약 0.52 s
BASELINE  약 0.52 s
LIVE
~~~

SETTLE / BASELINE 동안 target visual input을 잠시 끄고
SNta ground input만 유지한다.

LIVE가 되면 원래 target visual encoder를 다시 켠다.

64개 cue-minus-baseline feature를 normalize하고
Fly #001 저장 weight로 LEFT/RIGHT를 결정한다.

## 혼합 controller

v8에서 학습된 것은 좌우 이동뿐이다.

따라서:

~~~text
LEFT / RIGHT
  -> Fly #001 learned skill

JUMP / ATTACK / UP / DOWN
  -> 기존 connectome decoder

POTION
  -> 기존 taste/head-motor proxy
~~~

로 유지한다.

학습하지 않은 행동까지 학습했다고 가장하지 않는다.

## no-target

살아 있는 mushroom target이 없으면
Fly #001 LEFT/RIGHT action을 IDLE로 막는다.

이는 target 방향 정답을 넣는 것이 아니라
**읽을 대상 자체가 없는 동안 motor skill을 사용하지 않는 안전 guard**다.

## 검증

동일 commit에서 다음을 모두 확인한다.

- v7 sparse deployment headless gate
- worker/controller/game syntax
- GitHub Pages deploy

실제 브라우저에서의 장시간 플레이 성능은 별도 result에서 기록한다.
