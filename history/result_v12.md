# result_v12 — learned MOVE + JUMP + ATTACK integrated course

## Status

**FAIL — frozen integration acceptance gate**

Preregistration:

~~~text
history/prereg_v12.md
commit 79da4228eae11917c9ef7d74a1f8311f13dbfda0
~~~

Runner commit:

~~~text
430fbc5041ee0050027340e5aaada2a9d60a1e93
~~~

Authoritative first run:

~~~text
run       35788390176
artifact  10721535319
digest    sha256:4a9a76c77dcc7fd90133a73bba497376b9d527620d8c823c4de3b0d8a6082ce9
~~~

## Aggregate

~~~text
episodes                       24
course completion              75.0%   PASS >=75%
minimum per-seed completion    62.5%   PASS >=62.5%
obstacle clear                100.0%   PASS >=87.5%
target kill                    75.0%   PASS >=75%
timeout                        25.0%   PASS <=25%

mean actual JUMPs               2.542  FAIL <=1.75
pre-clear ATTACK episode       20.8%   PASS <=30%
airborne ATTACK episode        83.3%   FAIL <=30%
ATTACK hit precision           40.1%   FAIL >=50%
~~~

세 seed completion:

~~~text
2301000  75.0%   clear 100%   kill 75.0%   timeout 25.0%
2311000  87.5%   clear 100%   kill 87.5%   timeout 12.5%
2321000  62.5%   clear 100%   kill 62.5%   timeout 37.5%
~~~

## 관찰

장애물 통과 자체는 24/24 성공했고 모든 episode에서 obstacle clear 이전 JUMP가 발생했다.
즉 MOVE -> obstacle approach -> JUMP 구간은 통합 환경에서도 유지됐다.

실패는 obstacle 이후 combat 구간에 집중됐다.

전체 157 ATTACK 중 63 hit / 94 whiff로 precision은 40.1%였다.
episode의 83.3%에서 airborne ATTACK이 한 번 이상 발생했다.
반면 obstacle clear 이전 ATTACK episode는 20.8%로 prereg gate 안에 있었다.

거리별 사후 진단은 gate 변경이 아니라 failure localization 용도다.

~~~text
distance  completion  mean JUMPs  ATTACK precision
155       83.3%       3.33        43.6%
195       33.3%       3.83        19.6%
235       83.3%       1.33        42.5%
275      100.0%       1.67        81.8%
~~~

성공 episode와 실패 episode의 단순 비교:

~~~text
                         success    fail
mean JUMPs                 2.17     3.67
mean airborne ATTACK       1.22     3.33
mean actual ATTACK         5.39    10.00
ATTACK hit precision      55.7%    15.0%
~~~

이 패턴은 개별 JUMP/ATTACK deployment가 깨졌다는 뜻이 아니다.
같은 episode에서 obstacle sensory 이후 target combat까지 계속 진행할 때
**반복 JUMP와 airborne ATTACK이 결합되는 cross-skill continuation 문제**가 있음을 보여준다.

## 다음 진단 원칙

이 FAIL 뒤에 v12 gate, seed, threshold, persistence, cooldown, sensory population을 변경하지 않는다.

다음 단계는 동일 frozen policy / 동일 seed에서 event telemetry를 추가해:

- JUMP가 obstacle clear 전/후 각각 몇 번 발생하는지
- ATTACK이 ground/air에서 각각 언제 발생하는지
- whiff가 post-clear repeated JUMP와 시간적으로 겹치는지

를 분리한다.

그 결과가 나온 뒤에만 다음 prereg에서 학습/구조 보정 방향을 결정한다.
