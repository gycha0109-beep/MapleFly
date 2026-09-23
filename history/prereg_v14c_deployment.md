# prereg_v14c_deployment — frozen interruption candidate deployment closure

## 목적

v14C unseen validation PASS candidate를 browser runtime에 배포하기 전에
**weights / threshold / history / lower-level skill을 변경하지 않고**
구현 동등성, 실제 MaleCNS 통합 course, 기존 skill regression을 검증한다.

이 phase는 새 학습 실험이 아니다.

## Frozen provenance

~~~text
connectome
  alextitonis/fly.ai
  commit 95a3dbcb05241b0a5c07028ca8ad945b23fbbe6e

MOVE
  v7 deployed

ATTACK
  v10F-after-run-35516619170
  threshold 0.5
  window 5
  cooldown 21 brain steps / 420ms

JUMP
  v11H2
  authoritative run 35748844599
  sparse DN 96
  CONCAT4
  threshold 0.5
  persistence 2
  cooldown 38
  obstacle LC4 = false

interruption candidate
  source v14B run       35798458282
  source artifact       10725136545
  source digest         sha256:dda70bdb7476aed75aa0d53535fd82ef4ebdfe7b1807d1775c7bda2ffbd7ee77
  v14C validation run   35799237521
  validation artifact   10725530980
  validation digest     sha256:8df6084c8f221c6a24320e1a08e81c39363c8a9f99a0d561946d0a0ded7251c6
  representation        CONCAT12
  frame size            8
  feature count         96
  ATTACK head           frozen
  JUMP head             frozen
  threshold             P(ACCEPT) >= 0.5
~~~

Candidate status before closure:

~~~text
V14C_VALIDATED_CANDIDATE_NOT_DEPLOYED
~~~

## Forbidden deployment changes

- ATTACK/JUMP interruption bias 또는 weight 변경
- threshold 변경
- CONCAT12 history 길이 변경
- frame feature 변경
- lower-level v7/v10F/v11H2 변경
- sensory 변경
- reward / learner 추가
- game-state answer input 추가
- grounded / airborne / 좌표 / 거리 / obstacle-cleared / target HP를 interruption feature로 추가
- deployment smoke 결과를 보고 acceptance gate 변경

구현-equivalence bug만 수정 가능하다.

## Phase D1 — evaluator exact equivalence

독립 reference evaluator와 browser-loaded `MapleFlyInterruptionV14B`를
동일 candidate와 동일 CONCAT12 feature에 적용한다.

검증:

~~~text
ATTACK probability max abs error <= 1e-12
JUMP probability max abs error   <= 1e-12
ATTACK decision mismatch         = 0
JUMP decision mismatch           = 0
history feature mismatch         = 0
~~~

fixture는 deterministic frame sequence를 포함하고,
zero-left-pad 초기 history와 full CONCAT12 history를 모두 포함해야 한다.

## Phase D2 — real MaleCNS integrated deployment smoke

실제 pinned MaleCNS에서 다음 전체 경로를 실행한다.

~~~text
sensory
  -> frozen MaleCNS
  -> DN activity
  -> MOVE v7
  -> ATTACK v10F proposal
  -> JUMP v11H2 proposal
  -> CONCAT12
  -> frozen v14C ATTACK/JUMP heads
  -> JUMP-before-ATTACK action ordering
  -> physics / hit / kill
~~~

v14C authoritative unseen seeds를 deterministic replay한다.

~~~text
2751000
2761000
2771000
~~~

각 seed 4 distances x 2 sides = 8, 총 24 episodes.

과학적 gate는 v14C와 동일하다.

~~~text
course completion                    >=75%
every seed completion                >=62.5%
obstacle clear                       >=87.5%
LEFT obstacle clear                  >=87.5%
RIGHT obstacle clear                 >=87.5%
target kill                          >=75%
timeout                              <=25%
mean actual JUMPs                    <=1.75
post-clear JUMP episode              <=25%
pre-clear ATTACK episode             <=30%
ATTACK hit precision                 >=50%
aggregate airborne ATTACK action     <=20%
every-seed airborne ATTACK action    <=25%
~~~

추가 deployment equivalence check:

authoritative v14C receipt의 아래 summary와 deterministic replay가
floating tolerance 1e-3 이내여야 한다.

~~~text
course completion        0.9583333333333334
min seed completion      0.875
obstacle clear           1.0
LEFT clear               1.0
RIGHT clear              1.0
target kill              0.9583333333333334
timeout                  0.041666666666666664
mean JUMPs               1.4166666666666667
post-clear JUMP episode  0.0
pre-clear ATTACK episode 0.125
airborne action fraction 0.127
max-seed airborne action 0.156
ATTACK precision         0.602
~~~

receipt의 action/precision 값은 문서용 3-decimal 값이므로 1e-3 tolerance를 사용한다.
그 외 exact fraction 값도 동일 tolerance 안에서 비교한다.

## Phase D3 — browser static wiring

다음을 재검증한다.

~~~text
candidate source run      35798458282
candidate validation run  35799237521
historyFrames             12
featureCount              96
MOVE                      ungated
JUMP gate                 before ATTACK gate
browser page              fly-interruption-v14b.js loaded
forbidden direct game-state interruption input 없음
~~~

## Phase D4 — frozen skill regressions

deployment closure head에서 기존 skill evidence를 다시 실행한다.

필수:

~~~text
MOVE v7 deploy check
ATTACK v10F authoritative experiment
JUMP v11H2 browser deployment smoke
v11F legacy isolation
v14C browser wiring
~~~

기존 frozen scientific gate를 변경하지 않는다.

하나라도 regression이면 v14C deployment는 HOLD한다.

## Deployment decision

모든 D1-D4가 PASS일 때만:

~~~text
candidate status -> V14C_DEPLOYED
deploymentAllowed -> true
~~~

그리고 다음을 기록한다.

~~~text
history/result_v14c_deployment.md
history/run_receipts/v14c_deployment_latest.json
README.md
~~~

FAIL이면 candidate는 `V14C_VALIDATED_CANDIDATE_NOT_DEPLOYED` 상태를 유지한다.
