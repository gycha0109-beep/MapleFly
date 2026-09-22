# prereg_v12_diag — integrated-course failure localization

v12 authoritative run 35788390176의 FAIL을 보정하기 전에 동일 frozen policies와 동일 24 episodes를 다시 재생해 event timing만 추가 기록한다.

변경 금지:

~~~text
MOVE / ATTACK / JUMP weights
selected DN
threshold
persistence
cooldown
sensory population / amplitude
v12 seeds
v12 distances
v12 gate
physics / hitbox / episode limit
~~~

추가 telemetry:

- each JUMP step, player position, obstacle-clear state
- pre-clear JUMP count
- post-clear JUMP count
- each ATTACK step, grounded/airborne, obstacle-clear state, hit/whiff
- target horizontal distance at ATTACK
- first post-clear JUMP step
- first airborne ATTACK step

목적은 다음 세 가설을 구분하는 것이다.

1. JUMP가 obstacle clear 이후에도 재발하여 combat phase를 교란한다.
2. ATTACK이 JUMP와 무관하게 ground에서도 과도한 whiff를 만든다.
3. 두 현상이 함께 나타난다.

이 diagnostic은 새 acceptance gate가 아니며 v12 FAIL을 PASS로 재분류하지 않는다.
