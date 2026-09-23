# result_v14a_diag — frozen ATTACK interruption representation diagnostic

## Status

**DIAGNOSTIC PASS — authoritative replay exact / classification LEARNER_CREDIT**

이 결과는 v14A의 scientific FAIL을 변경하지 않는다.
또한 v14B/v14C 이후에 수행한 retrospective diagnostic이므로
v14B/v14C를 소급 정당화하는 근거로 사용하지 않는다.

Preregistration:

~~~text
history/prereg_v14a_diag.md
commit a9fe19a59d6a4c59a46c2ad22ce07c37f01c9a8f
~~~

Diagnostic implementation:

~~~text
initial implementation  eab21631fbd9734cb08a5852e41241cd9d63e23b
syntax-only fix         22d76db49ac8c31cf7d86101803ef0b323c97971
~~~

Authoritative diagnostic:

~~~text
run       35802645781
artifact  10726632460
digest    sha256:1cb13e656453cbf919a4f99f5937ad82ee30fb427d5358927c81194243ac86de
~~~

Source frozen v14A policy:

~~~text
run       35797391192
artifact  10724443147
digest    sha256:344cfbdd694e0b29a070c423d75111a89a5a76cb97e8c136865cdd09a25ac10d
~~~

## Exact replay

artifact에서 추출한 failed v14A bias/64 weights를 재학습 없이 사용했다.

24 final episode가 authoritative v14A와 exact reproduction check를 통과했다.

~~~text
course completion        91.7%
obstacle clear          100.0%
target kill              91.7%
timeout                   8.3%
mean JUMPs                2.250

ATTACK proposals        187
accepted                145
interrupted              42
actual ATTACK           145
hits                     69
whiffs                   76
airborne ATTACK ep       62.5%
precision                47.6%
~~~

따라서 아래 proposal-level diagnostic은 원래 v14A failure trajectory와 동일한 실행에서 나온다.

## Counterfactual gate confusion

모든 187 ATTACK proposal에서 실제 행동을 바꾸지 않고
proposal 순간의 `attackWouldHit(state)`를 read-only counterfactual label로 기록했다.

~~~text
ACCEPT + wouldHit        69
ACCEPT + wouldWhiff      76
INTERRUPT + wouldHit     15
INTERRUPT + wouldWhiff   27
~~~

~~~text
good accept rate         82.1%
good interrupt rate      26.2%
false accept rate        73.8%
false interrupt rate     17.9%
proposal accuracy        51.3%
~~~

즉 v14A gate는 좋은 공격의 대부분을 살렸지만,
**would-whiff proposal의 73.8%도 그대로 ACCEPT**했다.

조건부 gate 출력:

~~~text
                         mean P(ACCEPT)   ACCEPT rate
grounded                     0.884          90.7%
airborne                     0.549          55.1%

wouldHit                     0.795          82.1%
wouldWhiff                   0.732          73.8%
~~~

wouldHit / wouldWhiff 사이의 gate probability separation이 작았다.

Frozen v14A gate를 wouldHit classifier로 평가하면:

~~~text
AUROC                 0.607
balanced accuracy     0.542
sensitivity           0.821
specificity           0.262
~~~

## Held-out representation probes

Probe 입력은 오직 v14A policy-visible CONCAT8[64]였다.
grounded/airborne/wouldHit/좌표/거리/seed는 feature로 사용하지 않았다.

세 final seed leave-one-seed-out validation을 사용했다.

### Air-state probe

~~~text
held-out 2551000  AUROC 1.000   bal.acc 0.974
held-out 2561000  AUROC 0.996   bal.acc 0.971
held-out 2571000  AUROC 0.983   bal.acc 0.924

macro AUROC            0.993
minimum seed AUROC     0.983
macro balanced acc     0.956
minimum balanced acc   0.924
~~~

사전등록 band: **STRONGLY_SEPARABLE**

### Would-hit probe

~~~text
held-out 2551000  AUROC 0.836   bal.acc 0.785
held-out 2561000  AUROC 0.930   bal.acc 0.808
held-out 2571000  AUROC 0.852   bal.acc 0.776

macro AUROC            0.873
minimum seed AUROC     0.836
macro balanced acc     0.790
minimum balanced acc   0.776
~~~

사전등록 band: **STRONGLY_SEPARABLE**

## Temporal localization

JUMP 이후 ATTACK proposal을 사전등록 bucket으로 분해했다.

~~~text
jump age   proposals  airborne  wouldHit  gate P(A)  ACCEPT
0-9             5      100%       80%      0.632      80.0%
10-19          10      100%        0%      0.666      90.0%
20-29          14      100%        0%      0.498      35.7%
30-39          26      100%        0%      0.508      46.2%
40+           132       10.6%      60.6%    0.850      87.1%
~~~

특히 **JUMP 후 10-19 step의 10 proposal은 전부 wouldWhiff였지만 90%가 ACCEPT**됐다.

20-39 step에서도 모든 proposal이 wouldWhiff였으나 상당수가 계속 ACCEPT됐다.

따라서 v14A의 문제를 단순히 "CONCAT8에 공중 phase 정보가 없었다"로 설명할 수 없다.
같은 CONCAT8은 held-out probe에서 airborne를 거의 완벽하게,
wouldHit도 강하게 분리했다.

## Frozen diagnostic classification

Preregistered routing rule:

~~~text
Hit probe strongly separable
AND frozen v14A gate AUROC < 0.75
=> LEARNER_CREDIT
~~~

Observed:

~~~text
Hit probe AUROC      0.873
Hit probe bal.acc    0.790
v14A gate AUROC      0.607
classification       LEARNER_CREDIT
~~~

따라서 이 diagnostic의 결론은:

> v14A CONCAT8 representation에는 ATTACK 유용성을 구별할 상당한 정보가 있었지만,
> episodic reward-only policy-gradient gate가 그 정보를 충분히 추출하지 못했다.

이는 representation insufficiency보다 **learner / credit-assignment failure**와 더 일치한다.

## Relation to later v14B/v14C

이 diagnostic 실행 시점에는 repository가 이미 v14B/v14C까지 진행되어 있었다.

따라서:

- v14A FAIL은 그대로 FAIL
- v14B FAIL은 그대로 FAIL
- v14C unseen validation PASS는 별도 evidence
- 이 결과로 과거 threshold/reward/gate를 소급 변경하지 않음
- 현재 v14C browser wiring을 변경하지 않음

향후 새로운 interruption learner를 설계할 경우,
무조건 더 많은 game-state feature를 추가하기보다
현재 neural/proposal temporal representation을 유지한 채
credit assignment / action-value 학습을 개선하는 방향을 우선 검토할 근거가 생겼다.
