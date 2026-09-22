# prereg_v13_diag — lower-level baseline on v13 final seeds

v13 final의 LEFT obstacle-clear collapse 원인을 분리한다.

동일 final seeds:

~~~text
2451000 / 2461000 / 2471000
~~~

에서 learned arbiter를 제거하고 frozen v7 + v10F + v11H2를 v12 방식 그대로 동시에 실행한다.

변경하지 않는 것:

- connectome
- geometry / distances / sides
- lower-level weights / thresholds / cooldown
- sensory encoding
- physics / hitbox
- 8s episode limit

질문은 하나다.

> v13 final seed에서 lower-level stack 자체가 LEFT/RIGHT obstacle을 통과할 수 있는가?

이 diagnostic은 새 gate가 아니다.
v13 FAIL을 재평가하지 않으며 결과에 따라 v13 weights를 수정하지 않는다.
