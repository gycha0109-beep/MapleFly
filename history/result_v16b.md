# result_v16b — frozen continuous ecology

## Verdict

```text
V16B_CONTINUOUS_ECOLOGY_FAIL
```

v16B는 implementation-valid, stress-sufficient 상태에서 scientific FAIL이다.

결과를 본 뒤 seed, horizon, respawn delay, contact damage, sensory gain,
skill threshold, history window, PASS gate, stress threshold를 변경하지 않았다.

---

## Authoritative protocol

Preregistration:

```text
history/prereg_v16b.md
04cb62206312f4b3b452548a35dfc26c46d3646e
```

Initial implementation:

```text
scripts/evaluate-v16b-continuous-ecology.mjs
5fd8c8d63145cc6efae310f261f1ed3ab9c640f6
```

CI wiring:

```text
cdeb1a327ea745f54fdc5b00ef43aa534a3a2ed4
```

The first CI run:

```text
run 35943893212
```

was implementation-invalid, not scientific evidence. The preregistered initial encounter is
defined as the unchanged v16A geometry, but the first implementation incorrectly applied the
new respawn world-fit constraint to that initial geometry and aborted on a 275-distance case.

Only that implementation mismatch was corrected:

```text
6ec552a49685d2e62a6c33fceaa2e6a378d9760a
fix(v16b): preserve preregistered initial v16a geometry
```

No scientific parameter, seed, gate, sensory gain, damage value, timing, policy, or model was
changed.

---

## Authoritative run

```text
workflow
  Evaluate MapleFly v16B Continuous Ecology

run
  35944188466

head
  6ec552a49685d2e62a6c33fceaa2e6a378d9760a

conclusion
  failure
  (expected because scientific outcome is FAIL)

artifact
  10785384382

artifact name
  maplefly-v16b-continuous-ecology-35944188466

digest
  sha256:21c50f6dfb7f46bafaf25c8c7ed59666b2a1b7e3e7ffba9613d1e38686a3d76e
```

The exact authoritative head was also deployed to Pages successfully:

```text
run 35944188485
conclusion SUCCESS
```

---

## Cohort

```text
base seeds
  3101000
  3111000
  3121000

initial geometry
  4 distances x 2 sides

continuous episodes
  24

planned horizon
  2400 steps = 48.0 s

respawn gap
  35 steps = 0.7 s

synthetic injury schedule
  OFF

damage source
  real player-target contact transition only
```

MaleCNS and all deployed skill/readout parameters remained frozen.

---

## Stress sufficiency

```text
POTION_OFF death rate
  100.0%

required
  >= 25%
```

Therefore:

```text
stressSufficient = true
```

This is not an understressed result. The scientific PASS/FAIL gates are applicable.

---

## Full result

```text
48 s survival                    0.0%
min base-seed survival           0.0%

episodes with >=3 kills         95.8%
mean kills                       3.417

spawned encounters                 106
encounter obstacle clear       100.0%
encounter target kill           77.4%
LEFT encounter kill             77.4%
RIGHT encounter kill            77.4%

attack hit precision            65.9%
airborne attack action          11.9%
post-clear jump encounter        0.0%
pre-clear attack encounter       2.8%

mean contacts                   10.5
mean damage                    105 HP
```

The lower-level movement/jump/attack/interruption ecology metrics remained inside every
preregistered gate.

The failure is concentrated in survival/POTION ecology rather than a general collapse of
the lower-skill stack.

---

## Per-seed result

```text
3101000
  survival       0.0%
  mean kills     3.25
  off death    100.0%

3111000
  survival       0.0%
  mean kills     3.50
  off death    100.0%

3121000
  survival       0.0%
  mean kills     3.50
  off death    100.0%
```

There was no surviving base-seed subgroup.

---

## POTION ecology

```text
mean decisions / episode          3.500
total decisions                      84

total DRINK actions                    4
total potion uses                      4
mean potion uses / episode         0.167

FULL survival                      0.0%
POTION_OFF survival                0.0%
survival benefit                  +0.0pp

FULL mean kills                    3.417
POTION_OFF mean kills              3.167
kill benefit                      +0.250

FULL cost-adjusted value          -2.500
POTION_OFF terminal HP             0.000
value improvement                 -2.500

wasted healing / DRINK             0.000 HP
```

All 24 episodes died before the 48-second horizon, so no episode reached the required
10 POTION decisions.

Mean death step:

```text
971.3 steps
~19.43 s
```

Observed death-step range:

```text
772 .. 1255
15.44 .. 25.10 s
```

---

## Decision diagnostics

The frozen v15B3 policy has a zero DRINK head, so DRINK occurs when the frozen WAIT value
becomes negative.

Observed continuous-ecology decisions:

```text
decision 1 / step 240
  n=24
  DRINK 0.0%
  mean Q_WAIT +0.7775

decision 2 / step 480
  n=24
  DRINK 8.3%
  mean Q_WAIT +0.5655

decision 3 / step 720
  n=24
  DRINK 4.2%
  mean Q_WAIT +0.7147

decision 4 / step 960
  n=11
  DRINK 9.1%
  mean Q_WAIT +0.6991

decision 5 / step 1200
  n=1
  DRINK 0.0%
  mean Q_WAIT +0.9061
```

Example authoritative trajectory:

```text
seed 3101000

step 240
  HP 80
  Q_WAIT +0.6362
  WAIT

step 480
  HP 60
  Q_WAIT +0.2955
  WAIT

step 720
  HP 20
  Q_WAIT +0.0483
  WAIT

step 853
  10th contact
  HP 0
  death
```

HP is shown only as an evaluator diagnostic. It was not a policy input.

The descriptive pattern is that the frozen POTION readout usually continued to assign a
positive WAIT value under the continuous mixed-sensory ecology, even after substantial real
contact injury.

This is consistent with a representation/distribution-shift or sensory-interference
hypothesis, but v16B alone does **not** establish which mechanism caused it.

---

## Gate audit

PASS:

```text
episodes with >=3 kills               PASS
encounter obstacle clear              PASS
encounter target kill                 PASS
LEFT encounter target kill            PASS
RIGHT encounter target kill           PASS
attack hit precision                  PASS
airborne attack action fraction       PASS
post-clear jump encounter             PASS
pre-clear attack encounter            PASS
wasted healing / DRINK                PASS
```

FAIL:

```text
48 s survival                         FAIL
min base-seed survival                FAIL
survivor POTION decision count        FAIL
FULL - POTION_OFF survival benefit    FAIL
FULL - POTION_OFF mean kill benefit   FAIL
cost-adjusted value improvement       FAIL
```

All required gates were frozen before the authoritative run.

---

## Scientific interpretation

Supported:

> The frozen five-skill stack retained strong repeated obstacle/combat performance under
> persistent-state ecology, but the frozen POTION readout did not transfer successfully from
> the controlled v15/v16A setting to sustained real-contact ecology. All 24 episodes died,
> despite a stress-sufficient environment.

Not supported:

- that the connectome learned or failed to learn;
- that HP leaked into the policy;
- that lower-level MOVE/JUMP/ATTACK generally collapsed;
- that one specific interference source has already been proven;
- that changing a POTION threshold would be scientifically justified from this run.

---

## Next

Per preregistration, v16B is frozen as FAIL.

The next authorized work is **not v16C**.

A separate preregistered diagnostic must isolate why the frozen POTION representation/readout
stays WAIT-biased in continuous ecology.

The diagnostic must not tune v16B to PASS and must keep the deployed v15D policy frozen.

```text
V16B_DIAGNOSTIC_REQUIRED
```

v16B is CLOSED.
