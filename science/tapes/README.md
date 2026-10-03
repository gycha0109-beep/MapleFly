# 테이프 묶음 규격 v1

비싼 결정론적 시뮬레이션과 후속 분석을 분리한다.

현재 새 실험용 시뮬레이션 계약은 다음 파일이다.

```text
science/simulations/v15n-deterministic-v2.json
```

동일 계약과 동일 씨앗 조합은 같은 캐시 키를 사용한다.

```text
.cache/maplefly-tapes/<sha256>.v8.gz
```

새 과학 스크립트는 직접 `collectTapes()`를 반복 호출하지 않고
`scripts/lib/v15n-tape-cache.mjs`의 `loadOrBuildV15nTapePack()`을 사용한다.

첫 실행은 캐시 미적중으로 시뮬레이션하고 저장한다.
이후 동일 조합은 캐시 적중으로 저장된 테이프를 읽는다.

키에는 다음이 포함된다.

- 시뮬레이션 계약 식별자
- 고정 MaleCNS 커밋
- 코호트 이름
- 기본 씨앗 목록
- 개입 난수 씨앗

시뮬레이션 계약 파일은 실제 실행 소스의 Git blob SHA를 검증한다.
실행 의미가 바뀌면 기존 계약을 수정하지 않고 새 계약 버전을 만든다.

신경 전용 학습은 `neuralOnlyTapeView()`를 통해 물리 정답 정보를 제거할 수 있고,
평가 단계는 `evaluatorTruthTapeView()`를 별도로 사용한다.
