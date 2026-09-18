# MapleFly 개발 히스토리

이 디렉토리는 MapleFly의 **개발 과정**과 **실험 결과**를 분리해서 기록한다.

## v1

- [development_v1.md](./development_v1.md)  
  맵, 전투, MaleCNS 연결을 무엇을 어떻게 왜 구현했는지 정리한 개발 기록

- [result_v1.md](./result_v1.md)  
  첫 FLY CONTROL 실제 실행 결과와 해석

## 파일명 규칙

앞으로 같은 방식으로 버전별 기록을 남긴다.

```text
development_v1.md
result_v1.md

development_v2.md
result_v2.md
...
```

`develop_v1`보다 문서 의미가 명확한 **development_v1**을 사용한다.

## 작성 원칙

- 구현 내용과 실험 결과를 섞지 않는다.
- 생물학적 사실과 게임용 인터페이스 가정을 구분한다.
- "움직였다", "때렸다", "죽였다"와 "의도적으로 했다"를 구분한다.
- 우연한 성공을 목표지향적 성공으로 과장하지 않는다.
- upstream commit과 실험 조건을 가능한 한 고정해서 기록한다.
- 실패한 결과도 삭제하지 않고 다음 버전의 기준점으로 남긴다.
