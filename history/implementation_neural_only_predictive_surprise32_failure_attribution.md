# neural-only predictive-surprise32 실패 귀인 구현

상태: IMPLEMENTED / READY FOR AUTHORITATIVE RUN. 설계 8절 nearest-event 경계 해석은 권위 실행 전에 별도 clarification으로 고정 완료.

## 기준점과 범위

- 실제 GitHub `main`: `3ff4543ec4c4fd0971157e0e74f35e25d8684f9e`.
- 설계: `063a1f6be925ee7145961306503543e28b133131`.
- 사전등록: `68f34facc1ee456c7b91fe649b57e893258cabea`.
- 구현은 귀인·정확 재현·실행 manifest와 직접 fixture 검증으로 제한한다.
- 기존 고정 detector, v3/v4 simulation contract, v4 cohort, workflow 5개, 이전 결과·영수증, 배포 파일은 변경하지 않는다.
- 새 모델 학습, 임계값·lag·feature·timing 탐색 및 일반화 주장은 하지 않는다.

## 고정 계산의 재사용

`scripts/lib/neural-only-predictive-surprise32-frozen.mjs`는 v4 source anchor의 신경 전용 계산 함수와 직접 수학 의존 함수를 원문 그대로 복사한다. 고정 source anchor에 exports를 추가하면 v4 blob 계약이 달라지므로 원본을 변경하지 않는다. 직접 verifier가 32개 함수 본문과 관련 상수를 원문과 비교한다.

기존 train/calibration으로 모델을 같은 순서로 결정론적으로 재구축한다. 이것은 새 fitting 설계나 attribution A/B 기반 refit이 아니다. model SHA, tau, train/calibration 개수 및 A/B 모든 사전등록 metrics를 JavaScript의 정확한 값 동등성으로 비교한다. 반올림된 채팅 수치를 비교 기준으로 사용하지 않는다.

model SHA와 tau가 일치해야 evaluator truth 접근을 열며, A/B metrics도 모두 일치해야 귀인을 수행한다. 불일치하면 `ATTRIBUTION_IMPLEMENTATION_OR_PROVENANCE_INVALID`로 종료하고 axis와 attribution을 기록하지 않는다.

`scripts/lib/neural-only-predictive-surprise32-attribution.mjs`는 evaluator 전용이다. 두 신경 event stream 생성 뒤 matching, false timing, miss precedence, peak, nearest event, surprise 분포 및 A-B 차이를 산출한다. trace에서 계산한 emitted events를 기존 eventizer 출력과 정확 비교한다. impact·miss·false event별 원시 기록을 보존한다.

## Tape Pack 출처 확인

확인 시 GitHub 캐시는 다음 두 개뿐이다.

- `8446418732`: v3의 `tape-cache-validation-64/main` 전용, seeds 7881000–7951000, interruption 7967000.
- `7847350793`: 고정 MaleCNS 자산.

원래 권위 실행 `37081864923`의 artifact `11261347073`은 1489 bytes이며 단일 요약 JSON만 포함한다. 다운로드한 JSON SHA는 `78549dfb7514c4d3732ca9e4f6239ad6b1bc88162cf10312b661494b1bbc9546`로 확인했다. 해당 실행의 workflow는 Tape Pack을 저장하지 않았다.

따라서 존재하는 validation 테이프를 귀인 A/B로 바꾸거나, cache identity를 강제로 우회할 수 없다. v3→v4뿐 아니라 원래 실행 이후의 전체 source diff를 확인했고 변경은 caching, simulation context 분리, lazy initialization 및 직접 실행 guard에 한정된다. 현재 v4의 고정 simulation semantics로 기존 네 cohort를 필요한 경우 한 번 생성한다. 이후 분석은 정확 identity의 Tape Pack만 읽으며 MISS에서 실패한다.

새 cohort를 중복 정의하지 않고 `science/cohorts/neural-only-predictive-surprise32-v4.json`을 그대로 사용한다. A/B는 귀인 전용이다. train/calibration은 오직 기존 모델·tau 재구축에 사용한다.

분석 스크립트는 simulation module을 import하지 않는다. `allowBuild:false`와 `MAPLEFLY_TAPE_BUILD_ALLOWED=false`를 함께 요구하며, simulation context·정책·MaleCNS를 초기화하는 호출이 없다. 출력에는 각 pack key, 압축 파일 SHA256 및 cache HIT 여부를 기록한다.

## nearest-event 경계 해석 고정

권위 실행 전에 다음 clarification을 별도 커밋으로 고정했다.

```text
history/clarification_neural_only_predictive_surprise32_failure_attribution_nearest_event_boundary.md
commit 2707951db2a48dd0b793a690409b7c13e43bcd23
```

검색은 기존대로 inclusive `+/-20 steps`를 유지하고, 사전등록에 이름이 붙은 세 구간을 확장하지 않는다.

```text
PRE_200MS   [-10,0)
IN_WINDOW   [0,10)
LATE_200MS  [10,20)
[-20,-10)   -> NONE
+20         -> NONE
```

원시 signed offset은 그대로 보존한다. 이 보조 bucket은 최종 attribution axis 계산에 사용되지 않는다. frozen model, q, tau, eventizer, matching, miss attribution precedence 및 배포 상태는 변경하지 않는다.

그 밖의 기술적 집계 관례는 결과와 함께 명시한다. 동일 거리 nearest 후보는 이른 step을 선택한다. peak 동점은 사전등록대로 이른 step을 선택한다. surprise 분포는 tape별 각 구간에 포함되는 finite score frame을 구간 내 한 번씩 집계하고 보간하지 않는다. impact 구간끼리 겹치면 같은 frame이 서로 다른 구간에 속할 수 있다.

## 직접 검증

현재 Node `v24.14.0`, Windows에서 실행했다.

```text
node --check scripts/lib/neural-only-predictive-surprise32-frozen.mjs
node --check scripts/lib/neural-only-predictive-surprise32-attribution.mjs
node --check scripts/diagnose-neural-only-predictive-surprise32-failure-attribution.mjs
node scripts/ci/test-surprise32-attribution.mjs
node scripts/ci/validate-science-manifest.mjs science/manifests/neural-only-predictive-surprise32-failure-attribution.json
node scripts/ci/validate-science-tape-contract.mjs science/manifests/neural-only-predictive-surprise32-failure-attribution.json
node scripts/ci/validate-workflow-policy.mjs
node scripts/ci/test-tape-pack-cache.mjs
```

모두 PASS. fixture는 freeze 이전 truth 차단, stripped view, 정확 matching, miss/false precedence, refractory, 구간 끝점, peak 동점 및 strict `> 0.50` A/B dominance를 확인한다.

구현 커밋: `014a7c4034781bc7d8f61bae4bc62acf83b0cf62`. [PR #4](https://github.com/gycha0109-beep/MapleFly/pull/4)를 draft로 생성했다. 해당 HEAD의 [MapleFly CI Architecture Guard 실행 37166618562](https://github.com/gycha0109-beep/MapleFly/actions/runs/37166618562)은 job `111330730880`에서 success로 완료했다. `Validate workflow policy`, `Test Tape Pack cache`, `Check cached science base`, `Validate reusable science template`이 모두 성공했다. 이 CI 결과는 과학 재현·귀인 성공을 의미하지 않는다.

필수 문제에 대한 한 번의 재검토에서 새 Critical·High, 보안·데이터 손실·공개 계약·migration drift 문제는 발견하지 않았다. 남은 완료 기준 미충족은 권위 실행·산출물 검증·결과/영수증 동결이다.

실제 모델 SHA·tau·A/B metric 재현, attribution support 및 axis는 아직 권위 실행에서 검증하지 않았다. 경계 clarification 반영 후 `science/active.json`을 권위 실행용 manifest로 전환할 수 있는 상태다.

```text
POTION v15D  DEPLOYED
v15N         CLOSED / BLOCKED
v16C         BLOCKED
```
