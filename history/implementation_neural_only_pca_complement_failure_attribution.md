# neural-only PCA-complement 실패 귀인 구현

상태: IMPLEMENTED / PR 검증 전

## 기준

설계:

```text
4211f7799426d555a39ad49de151bbd3f8af3b89
```

사전등록:

```text
f6f5be8552efcc73bf462e9e2430fc2dc3f1e56c
```

권위 실패:

```text
run          37202530369
artifact     11304103673
JSON sha256  cf2182a46b6d7ee9e233f01734a8f919df3914b0bd69835dc73062b4a7b1c2d5
```

## 구현

새 simulator source를 수정하지 않았다.

추가:

```text
scripts/lib/neural-only-pca-complement-attribution.mjs
scripts/diagnose-neural-only-pca-complement-failure-attribution.mjs
scripts/ci/test-pca-complement-attribution.mjs
science/manifests/neural-only-pca-complement-failure-attribution.json
```

기존 G/H cohort set을 attribution-only로 재사용한다.

## 재현 gate

분석 전에 정확히 재현:

```text
base model SHA
base raw tau
complement repair model SHA
tau_complement
G/H 모든 권위 metrics
```

불일치 시 귀인을 수행하지 않는다.

## 귀인

complement miss precedence:

```text
MATCH_CONFLICT
REFRACTORY_SUPPRESSED_IN_WINDOW
PRE_HIT_COMPLEMENT_CROSSING
LATE_POST_HIT_COMPLEMENT_CROSSING
ABOVE_COMPLEMENT_THRESHOLD_NO_CROSSING_IN_WINDOW
NO_LOCAL_COMPLEMENT_THRESHOLD_CROSSING
```

추가 descriptive 분석:

```text
background / impact-local complement score separation
base / max / complement frozen local-threshold presence 조합
```

score fusion, threshold tuning, PCA dimension/DN selection에는 사용하지 않는다.

## Tape 책임

```text
MAPLEFLY_TAPE_BUILD_ALLOWED=false
analysis_needs_malecns=false
```

TRAIN/CAL/G/H 기존 v4 cache만 읽는다.

## 배포

변경 없음.

```text
POTION v15D  DEPLOYED
v15N         CLOSED / BLOCKED
v16C         BLOCKED
```
