# result_v14c — frozen v14B candidate metric-correction validation

## Status

**PASS — frozen unseen validation**

Preregistration:

~~~text
history/prereg_v14c.md
commit cd9122e1dddec2d24f3629799a7411fe91ca8247
~~~

Validation runner:

~~~text
head      a1ed6dffdc6a3398d1d233431ab8ba8a7a0fdf36
run       35799237521
artifact  10725530980
digest    sha256:8df6084c8f221c6a24320e1a08e81c39363c8a9f99a0d561946d0a0ded7251c6
~~~

Candidate는 v14B run 35798458282에서 freeze된 ATTACK/JUMP 두 head를 그대로 사용했다.

~~~text
retrained          false
weights changed    false
threshold changed  false
history changed    false
~~~

## New unseen seeds

~~~text
2751000
  completion 87.5%
  clear      100%
  mean JUMPs 1.500
  postJump   0.0%
  air action 10.3%
  air ep     50.0%
  precision  59.0%

2761000
  completion 100%
  clear      100%
  mean JUMPs 1.375
  postJump   0.0%
  air action 12.8%
  air ep     75.0%
  precision  51.1%

2771000
  completion 100%
  clear      100%
  mean JUMPs 1.375
  postJump   0.0%
  air action 15.6%
  air ep     62.5%
  precision  75.0%
~~~

## Aggregate

~~~text
course completion                 95.8%   PASS >=75%
minimum seed completion           87.5%   PASS >=62.5%
obstacle clear                   100.0%   PASS >=87.5%
LEFT obstacle clear              100.0%   PASS >=87.5%
RIGHT obstacle clear             100.0%   PASS >=87.5%
target kill                       95.8%   PASS >=75%
timeout                            4.2%   PASS <=25%
mean actual JUMPs                  1.417  PASS <=1.75
post-clear JUMP episode            0.0%   PASS <=25%
pre-clear ATTACK episode          12.5%   PASS <=30%
ATTACK hit precision              60.2%   PASS >=50%

airborne ATTACK action fraction   12.7%   PASS <=20%
max seed airborne action          15.6%   PASS <=25%
~~~

기존 episode-level airborne ATTACK rate는 62.5%였다.
v14C에서는 prereg대로 telemetry로만 기록했으며 acceptance에는 사용하지 않았다.

## Interpretation

v14B 자체는 기존 prereg gate를 실패했으므로 결과 기록상 계속 FAIL이다.

다만 동일 frozen weights가 새 unseen seed에서 v14C의 사전등록된 action-level gate를
모두 통과했으므로 이 candidate는 **v14C-validated candidate**로 승격할 수 있다.

다음 단계는 browser runtime에 같은 CONCAT12 / 두 binary head를 정확히 wiring하고,
frozen weights/threshold를 바꾸지 않은 deterministic deployment smoke를 수행하는 것이다.

browser smoke 전까지 deployment status는 candidate다.
