# result_v15i — reward-only long self-action memory

## Status

```text
V15I_REWARD_ONLY_LONG_ACTION_MEMORY_FAIL
```

This is a scientific gate failure, not an infrastructure failure.

Authoritative run:

```text
run
  35980309878

head
  8915f99273f260f030701e2be15c3060f3509174

artifact
  10800930547

artifact digest
  sha256:8aaf38c7d46c6db3a4ae4aeb2eeaf8e81d48d329d8071a66d73f4e87f3ec26a9
```

Frozen preregistration:

```text
32d600cace1ece3447e9ce50433a44e06d7714d5
```

Candidate parameter hash:

```text
2cd005ebe7587aac363938dbb9bce9f7dbfc5ba8400a363470478859b6ca8d1e
```

---

## 1. tape validity

All lower-skill validity gates passed.

```text
episodes with >=3 kills
  100.0%

obstacle clear
  97.41%

target kill
  91.38%

LEFT target kill
  88.89%

RIGHT target kill
  93.91%

attack precision
  61.48%

airborne attack
  12.81%

post-clear jump encounter
  0.86%

pre-clear attack encounter
  5.17%
```

---

## 2. TRAIN result

By generation 100 the frozen CEM mean reached:

```text
TRAIN survival
  100%

TRAIN mean potion uses
  7.542
```

No supervised D2 weight was loaded. CI explicitly rejected the D2 model hash and `v15g_d2.json`
dependency before training.

---

## 3. fresh EVAL

FULL:

```text
survival
  83.33%        PASS

minimum base-seed survival
  75.0%         PASS

mean potion uses
  7.708

mean excess uses among survivors
  1.650         FAIL
  required <= 1.500

wasted healing / DRINK
  3.838         PASS
```

Per base seed:

```text
3421000
  survival 75%

3431000
  survival 100%

3441000
  survival 75%
```

The primary failure is therefore narrow but preregistered and binding:

```text
mean excess uses
  1.650 > 1.500
```

The threshold is not relaxed after seeing the result.

---

## 4. causal controls

ACTION_MEMORY_OFF:

```text
survival
  100%

mean potion uses
  9.917

mean excess uses
  3.583

FULL-relative excess increase
  +1.933

contributes
  YES
```

NEURAL_OFF:

```text
survival
  54.17%

minimum base-seed survival
  37.5%

mean potion uses
  7.000

FULL-relative survival drop
  29.17 percentage points

contributes
  YES
```

Both preregistered causal gates passed.

---

## 5. learned policy

```text
neuralGain
  +1.3695644450

bias
  +0.3302358093

actionWeight1..9
  +0.6788884823
  -0.0076963089
  -0.0582325404
  +0.1546525432
  -0.4161085185
  +0.1921108864
  -2.1508831389
  -2.5807517276
  -1.7646588521
```

Descriptively, the frozen EVAL trajectories are highly concentrated around drinking on the first
seven or eight opportunities and then waiting. This observation is not used to change the v15I gate
or parameters.

It motivates a separate diagnostic asking whether the neural margin is being used in an
episode-specific injury-sensitive way or mainly as an offset around an action-history-derived schedule.

---

## 6. conclusion

v15I demonstrates that reward-only training can recover:

- high fresh survival;
- a real dependence on long self-action memory;
- a real dependence on the frozen MaleCNS-derived neural margin.

However it misses the frozen economy gate by:

```text
0.150 mean excess uses
```

Therefore:

```text
V15I_REWARD_ONLY_LONG_ACTION_MEMORY_FAIL
```

No deployment and no v16C authorization.

Next work must diagnose the schedule-like action pattern before changing optimizer settings, training
cohort size, architecture, thresholds, or reward.
