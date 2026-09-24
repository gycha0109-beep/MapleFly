# result_v16a — 5-skill 통합 자율행동 baseline

## Verdict

```text
V16A_FROZEN_FIVE_SKILL_INTEGRATION_PASS
```

v16A preregistration의 모든 required gate가 PASS했다.

새 학습, weight 변경, threshold 변경, sensory gain 변경 없이 다음 frozen stack을
동시에 실행했다.

```text
MOVE v7
ATTACK v10F
JUMP v11H2
v14C interruption
POTION v15D
frozen MaleCNS
```

## Authoritative run

```text
workflow
  Evaluate MapleFly v16A Five-Skill Integration

run
  35941098263

head
  5dee3f578c8f0beece2c1c6155adbefaf67a0aa8

artifact
  10785212130

artifact name
  maplefly-v16a-five-skill-integration-35941098263

digest
  sha256:a5ec82ae290720eb21e81c6ec543e83837e3b04aea9c270f3284f213aaf7bbb3

conclusion
  SUCCESS
```

Preregistration:

```text
history/prereg_v16a.md
622e9c6e790c0506a5672544ff2576cd0814ff72
```

Implementation:

```text
scripts/evaluate-v16a-five-skill-integration.mjs
9b5bf6a0bf0204b62b89f8a885f9cd55eb159c33
```

CI wiring:

```text
.github/workflows/evaluate-v16a-five-skill-integration.yml
5dee3f578c8f0beece2c1c6155adbefaf67a0aa8
```

## Cohort

```text
base seeds
  3001000
  3011000
  3021000

geometry
  4 distances x 2 sides

injury classes
  0 / 1 / 2 / 3

paired episodes
  96

live horizon
  400 steps = 8.0 s
```

동일 geometry의 injury class 0/1/2/3은 동일 brain seed를 공유했다.

## Full integrated result

```text
course completion             97.9%
min-seed completion           93.8%
obstacle clear               100.0%
left obstacle clear          100.0%
right obstacle clear         100.0%
target kill                   97.9%
timeout                        2.1%

mean jumps                     1.542
post-clear jump episode        3.1%
pre-clear attack episode       5.2%

attack hit precision          64.0%
airborne attack action        10.7%
max seed airborne action      12.7%

post-kill attacks                 1
post-kill jumps                   0
```

Per-seed headline:

```text
3001000
  completion 100.0%
  clear      100.0%
  kill       100.0%
  POTION BA   87.5%
  G           29.375
  regret       0.625

3011000
  completion  93.8%
  clear      100.0%
  kill        93.8%
  POTION BA   84.4%
  G           29.219
  regret       0.781

3021000
  completion 100.0%
  clear      100.0%
  kill       100.0%
  POTION BA   90.6%
  G           29.531
  regret       0.469
```

## POTION coexistence

```text
decision coverage            100.0%
decisions / episode            1.000
balanced accuracy             87.5%
WAIT recall                   75.0%
DRINK recall                 100.0%
mean G                        29.375
mean regret                    0.625
mean potion uses               0.625
mean wasted healing            5.000
```

class별 실제 선택:

```text
class 0
  optimal WAIT
  WAIT rate 100%
  mean G 40.0
  regret 0.0

class 1
  optimal WAIT
  WAIT rate 50%
  DRINK rate 50%
  mean G 27.5
  regret 2.5

class 2
  optimal DRINK
  DRINK rate 100%
  mean G 25.0
  regret 0.0

class 3
  optimal DRINK
  DRINK rate 100%
  mean G 25.0
  regret 0.0
```

가장 약한 경계는 class 1이었다.
다만 이는 preregistered overall WAIT recall / balanced accuracy / return / regret gate를
모두 통과했다.

결과를 본 뒤 threshold나 gate를 조정하지 않았다.

## Gate audit

모든 frozen required gate:

```text
courseCompletion                     PASS
minSeedCompletion                    PASS
obstacleClear                        PASS
leftObstacleClear                    PASS
rightObstacleClear                   PASS
targetKill                           PASS
timeout                              PASS
meanJumps                            PASS
postClearJump                        PASS
preClearAttack                       PASS
attackHitPrecision                   PASS
airborneAttackActionFraction         PASS
perSeedAirborneAttackActionFraction  PASS
potionDecisionCoverage               PASS
potionDecisionCount                  PASS
potionBalancedAccuracy               PASS
potionWaitRecall                     PASS
potionDrinkRecall                    PASS
potionMeanG                          PASS
potionMeanRegret                     PASS
```

## Scientific interpretation

이번 결과가 지지하는 범위:

> frozen MaleCNS sensory dynamics 위에서 독립적으로 배포된
> MOVE/JUMP/ATTACK/interruption/POTION readout이,
> preregistered 8-second integrated stress course에서
> 재학습 없이 동시에 기능했다.

특히 target/obstacle visual drive와 LgLG injury drive, final-frame taste가 같은 episode에
겹쳐도 lower-skill course completion은 97.9%였고 POTION balanced accuracy는 87.5%였다.

이번 결과가 지지하지 않는 범위:

- connectome 자체가 학습했다.
- 초파리 전체 뇌가 MapleStory를 학습했다.
- 무제한 시간의 연속 환경으로 일반화됐다.
- 다중 target respawn ecology가 검증됐다.

## Next

preregistered rule에 따라:

```text
V16B_PREREGISTRATION_AUTHORIZED
```

v16B에서는 frozen five-skill stack을 유지한 채,
단일 8-second course에서 벗어나 respawn / multi-target / longer-horizon
continuous ecology를 평가한다.

v16A는 CLOSED다.
