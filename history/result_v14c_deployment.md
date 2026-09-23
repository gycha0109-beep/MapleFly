# result_v14c_deployment — frozen cross-skill interruption deployment closure

## Status

**DEPLOYED — final post-deployment closure PASS**

v14C scientific validation과 deployment closure에서
weights / threshold / history / lower-level skill은 변경하지 않았다.

## Frozen provenance

~~~text
connectome
  alextitonis/fly.ai
  95a3dbcb05241b0a5c07028ca8ad945b23fbbe6e

v14B source run
  35798458282
  artifact 10725136545
  sha256:dda70bdb7476aed75aa0d53535fd82ef4ebdfe7b1807d1775c7bda2ffbd7ee77

v14C unseen validation
  run 35799237521
  artifact 10725530980
  sha256:8df6084c8f221c6a24320e1a08e81c39363c8a9f99a0d561946d0a0ded7251c6

deployment prereg
  history/prereg_v14c_deployment.md
  ee57facc8ddfaeab173598a0d2c7ea98c2d021de
~~~

## Pre-promotion closure

Run:

~~~text
35803350811
head cca594668b8ce15d31b866dc71256011f9d6b85e
result SUCCESS
~~~

이 run에서 evaluator equivalence, real MaleCNS deployment smoke,
v7/v10F/v11H2 regression, legacy isolation, browser wiring이 모두 PASS했다.

Smoke artifact:

~~~text
10727010181
sha256:af0116a0f4b052a4d91eab80da15a86fa15745f1d8a52a75e9d432d16ae29163
~~~

이 evidence를 근거로 candidate를 `V14C_DEPLOYED`로 승격했다.

Promotion commit:

~~~text
77cf4c57358eea9c62b3899cd140eff25f52e466
~~~

## Deployment-transition implementation fixes

promotion 직후 두 CI contract 문제가 드러났다.

1. frozen validation / deployment verifier가 candidate의 이전 상태 문자열
   `V14C_VALIDATED_CANDIDATE_NOT_DEPLOYED`를 요구했다.
2. browser wiring verifier는 deployment closure provenance를 요구했지만
   controller loader가 closureRunId를 아직 확인하지 않았다.

과학 파라미터는 변경하지 않고 deployment-state / provenance contract만 수정했다.

~~~text
d2e232519436308c8173786bc996bbe59c68ac76
  keep frozen verifiers valid after deployment

98993f7020d033048b21d070891beabc4c307268
  enforce deployed closure provenance in runtime

85978145309590b73b15e2e750bea9db6d552d14
  bind closure suite to deployed runtime changes
~~~

참고로 deployed-status frozen validation run `35803791710`도 SUCCESS했다.

## Final post-deployment closure

Authoritative final deployment verification:

~~~text
run       35803839466
head      85978145309590b73b15e2e750bea9db6d552d14
conclusion SUCCESS

artifact  10726869276
digest    sha256:c2d8c0cf91c001338e0e63be495ba57892f2475bd8a00d5b3d3f6567f128489a
~~~

### Evaluator exact equivalence

~~~text
comparisons                 96
history max abs error        0
ATTACK probability error     0
JUMP probability error       0
ATTACK decision mismatch     0
JUMP decision mismatch       0
PASS
~~~

### Real MaleCNS integrated deployment smoke

~~~text
course completion                  95.8%
minimum seed completion            87.5%
obstacle clear                    100.0%
LEFT obstacle clear               100.0%
RIGHT obstacle clear              100.0%
target kill                        95.8%
timeout                             4.2%
mean actual JUMPs                   1.417
post-clear JUMP episode             0.0%
pre-clear ATTACK episode           12.5%
airborne ATTACK action fraction    12.7%
max-seed airborne action           15.6%
ATTACK precision                   60.2%

deployment gate PASS
~~~

Per seed:

~~~text
2751000  complete 87.5%  clear 100%  jumps 1.500  airAction 10.3%  precision 59.0%
2761000  complete 100%   clear 100%  jumps 1.375  airAction 12.8%  precision 51.1%
2771000  complete 100%   clear 100%  jumps 1.375  airAction 15.6%  precision 75.0%
~~~

### Frozen lower-level regressions

~~~text
MOVE v7
  distance 80/150/300/500
  ON 100.0% at every distance
  OFF 50.0% at every distance
  deploy-gate PASS

ATTACK v10F
  FULL 84.4%
  whiff 15.6%
  browser equivalence PASS

JUMP v11H2
  FULL 100.0%
  timeout 0.0%
  mean jumps 1.375
  TARGET reach 100.0%
  false JUMP 0.0%
  browser deployment smoke PASS

v11F
  old research bundle preserved
  old runtime disabled
  v11H2 runtime active
  legacy isolation PASS
~~~

Browser wiring:

~~~text
history 12
features 96
MOVE ungated
ATTACK dual-head gate
JUMP dual-head gate
JUMP-before-ATTACK ordering
source 35798458282
validation 35799237521
deployment authorization 35803350811
PASS
~~~

## Interpretation

현재 browser runtime은 frozen MaleCNS의 DN activity 위에서
기존 learned MOVE v7 / ATTACK v10F / JUMP v11H2를 유지하면서,
CONCAT12 learned interruption heads가 JUMP와 ATTACK proposal의
cross-skill interference를 억제한다.

이는 "초파리 전체 뇌가 MapleStory를 학습했다"는 주장이 아니다.
connectome은 frozen이고, 그 activity 위의 readout/policy가 학습된 구조다.

Skill04 POTION은 아직 engineered proxy이며 learned skill이 아니다.
