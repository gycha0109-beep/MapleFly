# result_v9 — Fly #001 Skill 02 / 정지 화면 ATTACK timing

## 결론

v9은 세 단계의 수정까지 실제 Actions로 돌렸지만 최종 FAIL이다.

중요한 점은 실패 결과를 숨기지 않고
왜 실패했는지 다음 curriculum의 설계 근거로 남기는 것이다.

최종 판정:

~~~text
Skill 02 ATTACK timing
NOT PROMOTED

Fly #001 browser state
UNCHANGED
~~~

즉 v9 결과는 Fly #001의 저장 skill에 합치지 않았다.

---

## Phase A — 최초 reward 설계

GitHub Actions:

~~~text
run      35444445392
commit   77fa57b0e2a192c2d439fab78f2b2c326a4578bb
artifact 10584547761
~~~

reward:

~~~text
ATTACK hit    +1
ATTACK whiff  -0.35
WAIT           0
~~~

training context는 hit 가능 / 불가능이 50:50이었다.

따라서 visual signal을 무시하고 무조건 ATTACK해도 기대 reward가 양수였다.

~~~text
0.5 × (+1) + 0.5 × (-0.35)
= +0.325
~~~

실제 결과:

~~~text
VISUAL_ON       50.0%
VISUAL_OFF      50.0%
near ATTACK    100.0%
far ATTACK     100.0%
precision       50.0%

V9-GATE FAIL
~~~

원인:

> reward economics가 unconditional ATTACK을 유리하게 만들었다.

이 결과는 neural state에 timing 정보가 없다는 증거가 아니다.

---

## Phase B — reward 중립화

GitHub Actions:

~~~text
run      35444727950
commit   ff5295e94546642a00eae41413e76b602bbc31d4
artifact 10585077493
~~~

reward를 다음처럼 바꿨다.

~~~text
ATTACK hit    +1
ATTACK whiff  -1
WAIT           0
~~~

balanced context에서 unconditional ATTACK과 WAIT의 기대 reward를 0으로 맞췄다.

결과:

~~~text
run 1 ON   65.3%
run 2 ON   50.0%

mean ON            57.6%
mean OFF           50.0%
difference         +7.6%p
near ATTACK        91.7%
far ATTACK         76.4%
precision          55.6%

V9-GATE FAIL
~~~

reward 문제는 줄었지만
한 run은 다시 거의 unconditional ATTACK으로 무너졌다.

---

## Phase C — DN magnitude 보존

GitHub Actions:

~~~text
run      35445084336
commit   a08647a4755082f5d4539de21edb2953a012197f
artifact 10585428084

digest
sha256:96bc0c6dc7053b400459ad8e925947ca990690ad1b51756f2f8107e7d2e9358f
~~~

v7 LEFT / RIGHT에서는 DN vector의 방향을 보기 위해 L2 normalize했다.

v9에서는 proximity 관련 neural response 크기가 중요할 수 있으므로
normalization을 제거하고 다음 값을 그대로 사용했다.

~~~text
(DN cue Hz - baseline Hz) / 50
~~~

거리값 자체는 policy feature에 넣지 않았다.

최종 결과:

~~~text
run 1
ON               63.9%
OFF              50.0%
near ATTACK     100.0%
far ATTACK       72.2%
precision        58.1%

run 2
ON               50.0%
OFF              50.0%
near ATTACK     100.0%
far ATTACK      100.0%
precision        50.0%

mean
ON               56.9%
OFF              50.0%
difference        +6.9%p
near ATTACK      100.0%
far ATTACK        86.1%
precision         54.0%

V9-GATE FAIL
~~~

---

## 왜 다음에는 같은 실험을 더 튜닝하지 않는가

v9은 캐릭터와 target을 세워 둔 상태에서:

~~~text
고정 distance
0.5 s target cue
ATTACK / WAIT
~~~

를 분류했다.

하지만 실제 사냥의 timing은:

~~~text
target 발견
-> 이동
-> 거리가 계속 변함
-> approaching visual signal 발생
-> neural state가 시간에 따라 변함
-> 어느 순간 ATTACK
~~~

이다.

MapleFly visual encoder에는 이미
`approaching`에 따라 LPLC1 / LPLC2 / LC4 drive가 변하는 경로가 있다.

v9에서는 target과 player가 고정되어 있어
이 중요한 시간 정보가 거의 0으로 제거돼 있었다.

따라서 다음 단계에서는 learning rate / penalty를 더 만지지 않는다.

> **문제를 정지 이미지 분류가 아니라
> 이동 중 첫 공격 시점을 선택하는 optimal-stopping 문제로 다시 정의한다.**

---

## v10로 넘기는 원칙

v10은 다음을 유지한다.

~~~text
distance            policy input 금지
target x/y          policy input 금지
hittable boolean    policy input 금지
정답 ATTACK label   금지
~~~

대신:

~~~text
Fly #001 Skill 01로 실제 접근
full MaleCNS continuous activity
DN current response
DN fast temporal trace
DN slow temporal trace
실제 hit / whiff outcome
~~~

를 사용한다.

v9의 실패는 삭제하지 않고
v10의 설계 근거로 고정한다.
