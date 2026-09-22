# result_v14a — learned ATTACK interruption gate

## Status

**FAIL — frozen v14A screen gate**

Preregistration:

~~~text
history/prereg_v14a.md
commit 35dd16531facee98742a22f66af98890ba7d097c
~~~

Authoritative scientific runner:

~~~text
commit 5c4527a523dfbb05b7fcdb5230f896d557d0116e
run    35797391192
~~~

Artifact:

~~~text
id      10724443147
name    maplefly-v14a-attack-interruption-35797391192
digest  sha256:344cfbdd694e0b29a070c423d75111a89a5a76cb97e8c136865cdd09a25ac10d
~~~

앞선 두 workflow failure는 import newline / 중복 const의 syntax-only 구현 오류였다.
두 오류 모두 experiment 실행 전에 발생했고 prereg, seed, reward, learner, gate,
lower-level skill parameter는 변경하지 않았다.

## Practice

~~~text
episodes                  72
course completion         84.7%
obstacle clear           100.0%
target kill               84.7%
timeout                   15.3%
ATTACK precision          49.4%
airborne ATTACK episode   52.8%
mean JUMPs                 2.167
~~~

practice first 24 -> last 24:

~~~text
course completion   75.0% -> 91.7%
ATTACK precision    40.6% -> 58.3%
airborne ATTACK     70.8% -> 41.7%
mean JUMPs           2.583 -> 1.833
~~~

practice 개선을 frozen final PASS로 해석하지 않는다.

## Frozen final

~~~text
episodes                       24
course completion              91.7%   PASS >=75%
minimum per-seed completion    75.0%   PASS >=62.5%
obstacle clear                100.0%   PASS >=87.5%
LEFT obstacle clear           100.0%   PASS >=87.5%
RIGHT obstacle clear          100.0%   PASS >=87.5%
target kill                    91.7%   PASS >=75%
timeout                         8.3%   PASS <=25%

airborne ATTACK episode        62.5%   FAIL <=30%
ATTACK hit precision           47.6%   FAIL >=50%
~~~

ATTACK proposal:

~~~text
proposals     187
accepted      145
interrupted    42
actual hits    69
actual whiffs  76
~~~

seed:

~~~text
2551000  complete 100.0%  clear 100%  kill 100%  airAtk 62.5%  precision 50.0%
2561000  complete 100.0%  clear 100%  kill 100%  airAtk 62.5%  precision 55.8%
2571000  complete  75.0%  clear 100%  kill  75%  airAtk 62.5%  precision 38.9%
~~~

v13과 달리 MOVE/JUMP 실행 권한을 건드리지 않았기 때문에
LEFT/RIGHT obstacle clear는 모두 100%로 보존됐다.

그러나 ATTACK interruption만으로는 frozen interference gate를 통과하지 못했다.

## Post-hoc failure localization

아래는 gate 변경이 아니라 authoritative artifact의 사후 분해다.

거리별:

~~~text
distance  completion  airborne ATTACK ep  precision  mean JUMPs
155       83.3%       100.0%              36.2%      3.333
195      100.0%        83.3%              42.9%      3.167
235       83.3%        33.3%              43.2%      1.167
275      100.0%        33.3%              94.7%      1.333
~~~

episode를 실제 JUMP 수로만 사후 분리하면:

~~~text
repeat JUMP >1
  n=14
  completion 92.9%
  ATTACK precision 41.4%
  mean JUMPs 3.143
  mean airborne ATTACK 2.643

single JUMP <=1
  n=10
  completion 90.0%
  ATTACK precision 60.9%
  mean JUMPs 1.000
  mean airborne ATTACK 0.100
~~~

이 결과는 v14A가 obstacle traversal을 보존하면서 combat completion은 높였지만,
**반복 JUMP가 남아 있는 episode의 airborne/whiff interference를 ATTACK gate 하나만으로
충분히 제거하지 못했다**는 failure pattern과 일치한다.

이 상관은 원인 증명이 아니다.
다음 단계에서는 같은 v14A final seed에서 arbiter 없는 frozen lower-level stack을 재생해
v14A가 실제로 무엇을 개선했고 무엇을 남겼는지 먼저 비교한다.

## Frozen-result rule

이 FAIL 뒤에 다음을 변경해 v14A를 재실행하지 않는다.

- v14A final seed
- v14A gate
- threshold
- CONCAT8 history length
- reward
- learning rate / gamma / L2
- lower-level MOVE / ATTACK / JUMP parameter
- sensory population / amplitude

v14A candidate는 browser에 배포하지 않는다.
