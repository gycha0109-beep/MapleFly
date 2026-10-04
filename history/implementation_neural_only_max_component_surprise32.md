# neural-only max-component surprise32 repair 구현

상태: IMPLEMENTED / PR 검증 전

## 기준

설계:

```text
c072a69ba8accd346e54e6511be40ac557bbe619
```

사전등록:

```text
9e177539afc4ddadee87427f2d0b469d925ffb0f
```

직전 귀인:

```text
BASE_SIGNAL_ABSENT_DOMINANT
run 37179198946
artifact 11295075939
JSON sha256 4d34942cc294798c8363fab817a472469cea135cd8e5dc11a9587ff2ddeeca71
```

## 구현 범위

기존 v4 simulator source와 frozen base predictive model source는 수정하지 않았다.

추가/변경:

```text
science/cohorts/neural-only-max-component-surprise32-v4.json
science/manifests/neural-only-max-component-surprise32.json
scripts/lib/neural-only-max-component-surprise32.mjs
scripts/diagnose-neural-only-max-component-surprise32.mjs
scripts/ci/test-max-component-surprise32.mjs
```

## Score

기존 frozen predictor와 residual normalization을 그대로 재사용한다.

```text
e_j = target_j - pred_j
r_j = (e_j - residualMean_j) / residualScale_j
score = max_j(r_j^2)
```

32개 component 전부를 사용한다.

component selection, top-k, learned weight, smoothing은 없다.

## Calibration

기존 neural-only calibration tape만 사용한다.

```text
q = 0.95
nearest-rank
```

새 score의 `tau_max`를 truth 없이 freeze한다.

기존 base tau는 재현 확인용이며 변경하지 않는다.

## Prospective

Fresh E:

```text
8151000..8221000
interruption 8237000
```

Fresh F:

```text
8241000..8311000
interruption 8327000
```

기존 A/B/C/D/cache-validation seed와 충돌하지 않는다.

## Tape 책임

분석:

```text
MAPLEFLY_TAPE_BUILD_ALLOWED=false
analysis_needs_malecns=false
```

TRAIN/CAL은 기존 cache를 재사용하고 E/F만 simulate 단계에서 필요 시 생성한다.

## Freeze gate

prospective truth 전에:

```text
base model SHA exact reproduction
base raw tau exact reproduction
max-component calibration support
tau_max freeze
repair model SHA freeze
E/F neural event streams 생성
```

을 완료한다.

## 배포

변경 없음.

```text
POTION v15D  DEPLOYED
v15N         CLOSED / BLOCKED
v16C         BLOCKED
```
