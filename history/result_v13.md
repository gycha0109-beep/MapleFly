# result_v13 — learned proposal arbiter

## Status

**FAIL — frozen final gate**

Prereg:

~~~text
history/prereg_v13.md
commit e304475872acd79c1b34d200ab54be25caf1b01e
~~~

Runner:

~~~text
dff2618c96648b09779ee92984ae91f99db4c5a2
~~~

Run:

~~~text
35789526982
artifact 10720974518
digest sha256:40e28b48c293a502af7025891bfd4e002ee5072d995d42cc5b5de6b400d91a10
~~~

## Practice

학습은 practice set에서 빠르게 개선됐다.

~~~text
first 24
  complete 91.7%
  clear    100.0%
  precision 77.8%
  mean JUMPs 1.833

last 24
  complete 100.0%
  clear    100.0%
  precision 65.5%
  mean JUMPs 1.458
~~~

하지만 practice 성능을 final 성능으로 해석하지 않는다.

## Frozen final

~~~text
episodes             24
course complete      45.8%   FAIL
min seed complete    37.5%   FAIL
obstacle clear       50.0%   FAIL
target kill          45.8%   FAIL
timeout              54.2%   FAIL
mean JUMPs            1.042  PASS
pre-clear ATTACK ep   8.3%   PASS
airborne ATTACK ep   37.5%   FAIL
ATTACK precision     50.0%   PASS
~~~

seed:

~~~text
2451000 complete 50.0% / clear 50.0%
2461000 complete 37.5% / clear 50.0%
2471000 complete 50.0% / clear 50.0%
~~~

## 중요한 패턴

final 12개 LEFT episode가 전부 obstacle clear에 실패했고,
대부분 arbiter mode가 80/80 MOVE, JUMP 0이었다.

반대로 RIGHT episode는 대부분 obstacle을 통과하고 combat까지 진행했다.

따라서 arbiter가 v12의 combat-side 문제를 일부 줄인 것은 사실이다.

~~~text
v12 mean JUMPs        2.542 -> v13 1.042
v12 ATTACK precision 40.1%  -> v13 50.0%
v12 airborne ATTACK  83.3%  -> v13 37.5%
~~~

하지만 final에서 obstacle clear가 100% -> 50%로 붕괴했기 때문에 전체 구조는 채택할 수 없다.

## 다음 확인

현재 결과만으로 LEFT failure를 arbiter가 JUMP proposal을 억제한 탓이라고 단정하지 않는다.
v13 final seed 2451000 / 2461000 / 2471000 자체에서 frozen lower-level v7+v10F+v11H2가
arbiter 없이 obstacle을 정상적으로 통과하는지 동일 geometry로 재생한다.

그 baseline이 LEFT를 통과하면 arbiter generalization failure,
baseline도 실패하면 lower-level JUMP seed generalization failure다.

v13 weights / feature / gate / final seed는 사후 변경하지 않는다.
