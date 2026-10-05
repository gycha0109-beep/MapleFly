# neural-only phase-residual energy repair 구현

상태: IMPLEMENTED / PR 검증 전

## 기준

설계:

```text
e0a508583b0ef173c77b87a4a05dc2dafff6ef2f
```

사전등록:

```text
c1d3dfbc8c6a83bccbfb2ea316b32fb47fde90a6
```

직전 귀인:

```text
COMPLEMENT_SIGNAL_ABSENT_DOMINANT
run 37260564427
artifact 11324835401
JSON sha256 3c582b8925555e3e6603fc9b638993d9808554646db9f2e350a1ec60bb43f716
```

## 구현 범위

기존 v4 simulator source와 frozen base model source는 수정하지 않았다.

추가:

```text
science/cohorts/neural-only-phase-residual-energy-v4.json
science/manifests/neural-only-phase-residual-energy.json
scripts/lib/neural-only-phase-residual-energy.mjs
scripts/diagnose-neural-only-phase-residual-energy.mjs
scripts/ci/test-phase-residual-energy.mjs
```

## Score

기존 TRAIN phase mean을 그대로 사용한다.

TRAIN에서 phase별 DN RMS residual scale을 계산한다.

```text
phaseScale[p][d] =
max(sqrt(mean((x-phaseMean)^2)), 1e-6)
```

runtime:

```text
score =
mean_d(
  ((x_d-phaseMean[p][d])/phaseScale[p][d])^2
)
```

5-history innovation, PCA, predictor, DN subset, weighting, smoothing은 없다.

## Calibration

기존 neural-only calibration tape만 사용한다.

```text
q = 0.95
nearest-rank
```

새 score의 `tau_phase_residual`을 truth 없이 freeze한다.

## Prospective

Fresh I:

```text
8511000..8581000
interruption 8597000
```

Fresh J:

```text
8601000..8671000
interruption 8687000
```

## Tape 책임

```text
MAPLEFLY_TAPE_BUILD_ALLOWED=false
analysis_needs_malecns=false
```

TRAIN/CAL은 기존 cache를 재사용하고 I/J만 simulate 단계에서 필요 시 생성한다.

## 배포

변경 없음.

```text
POTION v15D  DEPLOYED
v15N         CLOSED / BLOCKED
v16C         BLOCKED
```
