# neural-only PCA-complement innovation repair 구현

상태: IMPLEMENTED / PR 검증 전

## 기준

설계:

```text
05a3ed41bbd1b85757d2bb74ce5180fdb50afab4
```

사전등록:

```text
ef26f05bae876b1713f53c76bff9215638bbf428
```

직전 귀인:

```text
MAX_SIGNAL_ABSENT_DOMINANT
run 37201941454
artifact 11303800018
JSON sha256 18677b316b60564893eadd586b74f8fcb09957689bb381b18ad0ccaec0625509
```

## 구현 범위

기존 v4 simulator source와 frozen base model source는 수정하지 않았다.

추가:

```text
science/cohorts/neural-only-pca-complement-innovation-v4.json
science/manifests/neural-only-pca-complement-innovation.json
scripts/lib/neural-only-pca-complement-innovation.mjs
scripts/diagnose-neural-only-pca-complement-innovation.mjs
scripts/ci/test-pca-complement-innovation.mjs
```

## Score

기존 phase subtraction과 5-history innovation을 그대로 사용한다.

Frozen PCA preprocessing으로 full-DN innovation을 standardized한 뒤 frozen PCA32 span에 대한 Gram-exact orthogonal projection을 계산한다.

```text
G = C C^T
b = C u
a = G^-1 b

complementEnergy =
  max(0, ||u||^2 - b^T a)

score =
  complementEnergy / 1284
```

`1284 = 1316 - 32`.

component orthogonality를 가정하지 않는다.

## Calibration

기존 neural-only calibration tape만 사용한다.

```text
q = 0.95
nearest-rank
```

새 score의 `tau_complement`를 truth 없이 freeze한다.

## Prospective

Fresh G:

```text
8331000..8401000
interruption 8417000
```

Fresh H:

```text
8421000..8491000
interruption 8507000
```

기존 A/B/C/D/E/F/cache-validation seed와 충돌하지 않는다.

## Tape 책임

```text
MAPLEFLY_TAPE_BUILD_ALLOWED=false
analysis_needs_malecns=false
```

TRAIN/CAL은 기존 cache를 재사용하고 G/H만 simulate 단계에서 필요 시 생성한다.

## Freeze gate

prospective truth 전에:

```text
base model exact reproduction
Gram projection validation
complement calibration support
tau_complement freeze
repair model SHA freeze
G/H neural event streams 생성
```

을 완료한다.

## 배포

변경 없음.

```text
POTION v15D  DEPLOYED
v15N         CLOSED / BLOCKED
v16C         BLOCKED
```
