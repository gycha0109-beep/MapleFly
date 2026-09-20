# MapleFly 개발 히스토리

이 디렉토리는 MapleFly의 **개발 과정**과 **실험 결과**를 분리해서 기록한다.

## v1

- [development_v1.md](./development_v1.md)  
  맵, 전투, MaleCNS 연결을 무엇을 어떻게 왜 구현했는지 정리한 개발 기록

- [result_v1.md](./result_v1.md)  
  첫 FLY CONTROL 실제 실행 결과와 해석

## v2

- [development_v2.md](./development_v2.md)  
  2층을 잠시 제거하고 SENSORY ON/OFF paired 대조실험 macro와 logger를 만든 개발 기록

- [result_v2.md](./result_v2.md)  
  180초 × 3 paired headless SENSORY ON/OFF 대조실험 결과와 해석

## 파일명 규칙

```text
development_v1.md
result_v1.md

development_v2.md
result_v2.md
...
```

## 작성 원칙

- 구현 내용과 실험 결과를 섞지 않는다.
- 생물학적 사실과 게임용 인터페이스 가정을 구분한다.
- "움직였다", "때렸다", "죽였다"와 "의도적으로 했다"를 구분한다.
- 우연한 성공을 목표지향적 성공으로 과장하지 않는다.
- upstream commit과 실험 조건을 가능한 한 고정해서 기록한다.
- 실패한 결과도 삭제하지 않고 다음 버전의 기준점으로 남긴다.


## v3

- [development_v3.md](./development_v3.md)  
  SNta ground input은 유지하고 target visual channel만 제거하는 paired 대조군

- [result_v3.md](./result_v3.md)  
  SNta를 유지한 FULL / VISUAL_OFF 180초 × 3 paired 대조실험 결과


## v4

- [development_v4.md](./development_v4.md)  
  캐릭터 HP 100 / 버섯 접촉 -10과 LgLG knock 입력을 추가한 contact-damage 실험 설계

- [result_v4.md](./result_v4.md)  
  HP 100 / 접촉 -10과 LgLG knock IMPACT_ON/OFF 180초 × 3 paired 결과


## v5

- [development_v5.md](./development_v5.md)  
  빨간포션 30개(+30)와 taste-responsive head-motor 기반 POTION action을 추가한 실험 설계

- [result_v5.md](./result_v5.md)  
  빨간포션 30개(+30) POTION_CUE_ON/OFF 180초 × 3 paired 결과


## v6

- [development_v6.md](./development_v6.md)  
  full MaleCNS에서 KC sparse code / MBON 전달 / dopamine baseline을 측정하고 학습 가능성을 판정하는 readiness assay

- [result_v6.md](./result_v6.md)  
  KC tonic-bias와 APL-feedback proxy 실제 Actions 결과. 내부 mushroom-body plasticity는 아직 NOT READY로 판정


## v7

- [development_v7.md](./development_v7.md)  
  full MaleCNS를 frozen reservoir로 두고 1,316 descending-neuron activity에서 LEFT/RIGHT를 reward-only로 배우는 첫 튜토리얼

- [result_v7.md](./result_v7.md)  
  reward-only LEFT/RIGHT motor readout 실제 학습 결과. VISUAL_ON 100%, VISUAL_OFF 50%, 사전 gate PASS


## v8

- [development_v8.md](./development_v8.md)  
  v7 PASS Fly #001 LEFT/RIGHT skill을 localStorage에 저장하고 실제 브라우저 MaleCNS game loop에 연결

- [result_v8.md](./result_v8.md)  
  Fly #001 sparse deployment PASS, continuous live-style gate PASS, GitHub Pages 배치 결과


## v9

- [development_v9.md](./development_v9.md)  
  full MaleCNS DN state만 보고 ATTACK / WAIT를 reward-only로 배우는 Fly #001 Skill 02 설계

- [result_v9.md](./result_v9.md)  
  세 차례 실제 Actions 결과 모두 FAIL. static ATTACK 분류를 중단하고 continuous Approach-to-Strike로 전환한 근거


## v10

- [development_v10.md](./development_v10.md)  
  Fly #001 Skill 01로 실제 접근하면서 temporal DN trajectory만으로 첫 ATTACK 시점을 배우는 Approach-to-Strike 설계

- [result_v10.md](./result_v10.md)  
  Phase A/B 실패 후 Phase C outcome-only ATTACK 학습 full confirmation PASS. browser 승격 전 deployment gate 진행
