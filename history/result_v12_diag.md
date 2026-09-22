# result_v12_diag — failure localization

Diagnostic prereg:

~~~text
history/prereg_v12_diag.md
commit a2b46d91997163a3168e5308e62bcf59e3a4ce57
~~~

Instrumentation-only commit:

~~~text
3f04bb531e3e439286f9d2264f206c8c83af911e
~~~

Run:

~~~text
35788788672
artifact 10720059958
digest sha256:f190cd2ccc9c18921dc0dce748a32f566fcfedfb775c115a3873ec2b24fb760c
~~~

v12 acceptance result는 그대로 FAIL이며 gate/seed/policy parameter는 변경하지 않았다.

## Reproduction

원래 aggregate가 정확히 재현됐다.

~~~text
course complete       75.0%
clear                100.0%
kill                  75.0%
timeout               25.0%
mean JUMPs             2.542
pre-clear ATTACK ep   20.8%
airborne ATTACK ep    83.3%
hit precision         40.1%
~~~

## JUMP localization

~~~text
pre-clear JUMPs   49 total / 2.042 per episode
post-clear JUMPs  12 total / 0.500 per episode
post-clear JUMP episode rate 33.3%
~~~

따라서 반복 JUMP 전체를 단순히 obstacle-clear 이후 temporal residue로 설명할 수 없다.
상당수는 obstacle 접근/재접근 구간에서 발생한다.

특히 일부 episode는 한 번 obstacle을 통과한 뒤 movement가 target을 지나치거나 되돌아가면서
obstacle 경계로 다시 접근했다. v7 movement는 LEFT/RIGHT 두 action만 학습되어
target 근처에서 의도적으로 HOLD하는 learned action이 없다.

## ATTACK localization

전체:

~~~text
actual ATTACK 157
hit            63
whiff          94
precision      40.1%
~~~

airborne:

~~~text
ATTACK 42
hit     4
whiff  38
precision 9.5%
~~~

ground:

~~~text
ATTACK 115
hit     59
whiff   56
precision 51.3%
~~~

94 whiff 중 89회가 obstacle을 한 번 이상 clear한 뒤 combat continuation 구간에서 발생했다.
pre-clear whiff는 5회뿐이었다.

즉 가장 큰 손실은 초기 obstacle 판단이 아니라 **combat continuation**이다.

## 거리별

~~~text
distance   completion   mean JUMPs   ATTACK precision
155        83.3%        3.33         43.6%
195        33.3%        3.83         19.6%
235        83.3%        1.33         42.5%
275       100.0%        1.67         81.8%
~~~

195px obstacle-start condition에서 failure가 집중됐다.

## 결론

현재 세 learned module은 개별 task는 수행하지만, 동시에 계속 켜 놓으면 action selection 계층이 없다.

구조적으로:

~~~text
MOVE v7     LEFT / RIGHT만 제안
JUMP v11H2  JUMP / WAIT 제안
ATTACK v10F ATTACK / WAIT 제안

현재 runtime:
MOVE는 계속 적용
JUMP와 ATTACK pulse도 동시에 적용 가능
~~~

그래서 target 근처에서 멈추고 공격에 집중하거나,
airborne 상태에서 ATTACK proposal을 억제하는 것을 학습한 계층이 없다.

다음 보정은 game-state 조건식으로
"공중이면 공격 금지", "사거리면 이동 정지"를 넣는 방식으로 하지 않는다.

다음 phase는 frozen v7/v10F/v11H2 위에 **learned action arbiter**를 추가해
MOVE / JUMP / ATTACK / HOLD 중 어떤 proposal을 실제 actuate할지 reward로 학습하는 방향으로 진행한다.
