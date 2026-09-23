# prereg_v14a_diag — retrospective ATTACK interruption representation diagnostic

## Status / chronology

이 문서는 v14A authoritative FAIL 뒤의 원인 분석을 위한 **read-only retrospective diagnostic**을
실행하기 전에 고정한다.

중요한 chronology:

~~~text
v14A authoritative FAIL   run 35797391192
v14B authoritative FAIL   run 35798458282
v14C unseen validation    run 35799237521, PASS
v14C browser wiring       already present on main
~~~

따라서 이 diagnostic 결과는 v14B/v14C를 소급 정당화하거나 그 preregistration을 대체하지 않는다.
현재 deployed/candidate runtime의 weights, threshold, history, lower-level skill을 변경하지 않는다.
목적은 v14A failure의 정보/학습/보정 원인을 재현 가능한 evidence로 남기고 이후 설계에 사용하기 위함이다.

## Source policy

v14A authoritative artifact:

~~~text
run       35797391192
artifact  10724443147
digest    sha256:344cfbdd694e0b29a070c423d75111a89a5a76cb97e8c136865cdd09a25ac10d
head      5c4527a523dfbb05b7fcdb5230f896d557d0116e
~~~

artifact의 frozen v14A ATTACK-gate bias/64 weights를 그대로 사용한다.
재학습하지 않는다.

Replay는 authoritative v14A final seed:

~~~text
2551000
2561000
2571000
~~~

각 seed 4 distances x 2 sides = 8 episodes, 총 24 episodes.

Replay는 먼저 authoritative aggregate를 정확히 재현해야 한다.

~~~text
course completion       91.6666666667%
obstacle clear         100%
target kill             91.6666666667%
timeout                  8.3333333333%
mean JUMPs               2.25
ATTACK proposals       187
accepted               145
interrupted             42
actual ATTACK          145
hits                    69
whiffs                  76
airborne ATTACK ep      62.5%
precision               47.5862068966%
~~~

위 재현이 tolerance 1e-12 / exact count를 만족하지 않으면 diagnostic 결과를 만들지 않고 실패한다.

## Policy-visible proposal telemetry

ATTACK v10F proposal마다 실제 v14A gate가 보던 값만 별도 기록한다.

~~~text
proposalId
episodeId
brainStep

moveConfidence
attackP
attackMargin
jumpP
waitP
jumpMargin
didJump
didAttack

CONCAT8[64]

gateAcceptProbability
gateDecision = ACCEPT | INTERRUPT
~~~

CONCAT8은 v14A와 동일한 8 features x 8 frames, zero-left-pad이다.

## Oracle diagnostic labels

아래 값은 policy input이 아니라 사후 label/분석에만 사용한다.

~~~text
groundedAtProposal
airborneAtProposal
wouldHitNow
wouldWhiffNow
obstacleClearedAtProposal

stepsSinceActualJump
stepsSinceActualAttack

playerX
playerY
targetX
targetDistance
side
startDistance
seed
targetHp

actualOutcome = HIT | WHIFF | INTERRUPTED
~~~

wouldHitNow는 proposal 순간의 기존 attackWouldHit(state)를 read-only 호출한다.
INTERRUPT proposal에서도 state/action을 변경하지 않는다.

## Gate confusion

모든 proposal을 다음 4칸으로 분해한다.

~~~text
ACCEPT + wouldHit
ACCEPT + wouldWhiff
INTERRUPT + wouldHit
INTERRUPT + wouldWhiff
~~~

기록:

~~~text
goodAcceptRate
goodInterruptRate
falseAcceptRate
falseInterruptRate
proposalDecisionAccuracy
~~~

또한 다음 conditional mean/rate를 기록한다.

~~~text
mean P(ACCEPT | grounded)
mean P(ACCEPT | airborne)
mean P(ACCEPT | wouldHit)
mean P(ACCEPT | wouldWhiff)

ACCEPT rate | grounded
ACCEPT rate | airborne
ACCEPT rate | wouldHit
ACCEPT rate | wouldWhiff
~~~

## Temporal bins

stepsSinceActualJump를 다음 사전 고정 bucket으로 분석한다.

~~~text
NO_PREVIOUS_JUMP
0_9
10_19
20_29
30_39
40_PLUS
~~~

각 bucket:

~~~text
proposal count
airborne rate
wouldHit rate
mean attackP
mean jumpP
mean jumpMargin
mean gate P(ACCEPT)
ACCEPT rate
actual/counterfactual whiff rate
~~~

## Representation probes

Probe는 controller가 아니며 게임 행동에 사용하지 않는다.

입력은 오직 policy-visible CONCAT8[64].

Probe A:

~~~text
X = CONCAT8[64]
y = airborneAtProposal
~~~

Probe B:

~~~text
X = CONCAT8[64]
y = wouldHitNow
~~~

oracle/game-state 값은 label로만 사용한다.

### Validation split

row random split 금지.

leave-one-seed-out:

~~~text
fold 1 train 2561000,2571000 / test 2551000
fold 2 train 2551000,2571000 / test 2561000
fold 3 train 2551000,2561000 / test 2571000
~~~

standardization mean/std는 fold train rows에서만 계산한다.

### Probe learner

class-balanced logistic regression:

~~~text
input       64
bias        yes
epochs      300
LR          0.03
L2          0.001
threshold   0.5
initial     all zero
~~~

각 class의 총 gradient weight가 동일하도록 positive/negative sample weight를 계산한다.

기록:

~~~text
AUROC
balanced accuracy
sensitivity
specificity
positive support
negative support

macro mean AUROC
minimum seed AUROC
macro balanced accuracy
minimum balanced accuracy
~~~

## Interpretation bands

이 값은 scientific deployment PASS gate가 아니라 diagnostic routing rule이다.

Strongly separable:

~~~text
macro held-out AUROC >= 0.75
AND
macro balanced accuracy >= 0.70
~~~

Weakly separable:

~~~text
macro held-out AUROC <= 0.60
OR
macro balanced accuracy <= 0.60
~~~

그 사이는 ambiguous.

## Failure classification

Hit probe를 primary로 사용한다.

~~~text
if Hit probe strongly separable:
  if frozen v14A gate AUROC against wouldHit >= 0.75:
    classification = CALIBRATION
  else:
    classification = LEARNER_CREDIT

else if Hit probe weakly separable:
  if Air probe strongly separable:
    classification = COMBAT_REPRESENTATION
  else:
    classification = REPRESENTATION

else:
  classification = AMBIGUOUS
~~~

이 classification은 다음 실험 방향을 정하기 위한 diagnostic label일 뿐
v14A/v14B/v14C의 기존 PASS/FAIL을 변경하지 않는다.

## Forbidden actions

이 diagnostic에서는 다음을 하지 않는다.

- v14A weights 재학습
- v14A threshold 변경
- CONCAT8 history 길이 변경
- reward 변경
- seed 교체/삭제/resample
- lower-level MOVE/ATTACK/JUMP 변경
- sensory 변경
- side별 gate 생성
- grounded/airborne/wouldHit/거리/좌표를 gate input으로 사용
- diagnostic probe를 실제 controller로 사용
- v14B/v14C 결과를 소급 PASS/FAIL 변경

## Artifacts

~~~text
results/v14a-attack-interruption-diagnostic/
  proposal_rows.json
  summary.json
  probe_air_state.json
  probe_hit_state.json
  temporal_bins.json
  gate_confusion.json
~~~

진단 종료 조건:

1. authoritative v14A final replay exact reproduction
2. 모든 ATTACK proposal counterfactual row 확보
3. held-out Air/Hit separability 측정
4. frozen routing rule로 classification 산출
