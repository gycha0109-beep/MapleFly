# result_v14b — dual learned proposal interruption

## Status

**FAIL — frozen v14B gate**

Preregistration:

~~~text
history/prereg_v14b.md
commit d208c9ef3ab2c674aad8ed17db38b850f38ee4f3
~~~

Authoritative run:

~~~text
head      378a6691298d71b0ff2d248f47f6833e233ab01a
run       35798458282
artifact  10725136545
digest    sha256:dda70bdb7476aed75aa0d53535fd82ef4ebdfe7b1807d1775c7bda2ffbd7ee77
~~~

## Frozen final

~~~text
episodes                       24
course completion             100.0%   PASS
minimum per-seed completion   100.0%   PASS
obstacle clear                100.0%   PASS
LEFT obstacle clear           100.0%   PASS
RIGHT obstacle clear          100.0%   PASS
target kill                   100.0%   PASS
timeout                         0.0%   PASS
mean actual JUMPs               1.458  PASS
post-clear JUMP episode         4.2%   PASS
pre-clear ATTACK episode        8.3%   PASS
ATTACK hit precision           58.1%   PASS

airborne ATTACK episode        66.7%   FAIL <=30%
~~~

proposal:

~~~text
ATTACK accepted / proposed   124 / 163
JUMP accepted / proposed      35 / 93
~~~

세 seed 모두 course completion / obstacle clear / target kill 100%였다.

~~~text
2651000 jumps 1.375  postJump 0.0%   airAtk 75.0%  precision 52.2%
2661000 jumps 1.625  postJump 12.5%  airAtk 62.5%  precision 70.6%
2671000 jumps 1.375  postJump 0.0%   airAtk 62.5%  precision 54.5%
~~~

## Failure localization

v14B는 v13의 LEFT obstacle 붕괴 없이 JUMP와 ATTACK proposal을 모두 억제했다.
특히 v14A same-seed lower-level baseline과 직접 seed가 같지는 않으므로
숫자를 인과 비교로 쓰지는 않지만, v14B 자체 final에서는 기능 지표가 안정적이었다.

airborne ATTACK episode gate만 실패했다.

사후 count를 보면:

~~~text
actual ATTACK actions       124
airborne ATTACK actions      17
airborne action fraction    13.7%

airborne ATTACK episode      16 / 24 = 66.7%
16개 episode는 airborne ATTACK 1회
1개 episode만 2회
~~~

즉 기존 episode-level metric은
"episode 중 airborne ATTACK이 단 한 번이라도 있었는가"를 측정하기 때문에
1회의 airborne ATTACK과 반복적인 airborne ATTACK을 동일하게 실패로 센다.

v14B를 PASS로 재해석하지 않는다.
preregistered gate가 66.7% > 30%였으므로 v14B는 그대로 FAIL이다.

다만 다음 검증에서는 candidate를 재학습하지 않고 그대로 freeze한 뒤,
새 unseen seed에서 action-level airborne fraction을 사전등록해 검증한다.
이렇게 하면 v14B 결과를 보고 threshold를 바꿔 같은 seed를 다시 통과시키는 것을 피할 수 있다.

## Deployment

v14B candidate는 현재 browser에 배포하지 않는다.
