# result_v15n_d6_d2 — causal neural eventizer audit

## Status

```text
V15N_D6_D2_EVENTIZER_NOT_STABLE
```

The preregistered v15N-D6-D2 audit completed successfully. Provenance, ecology, support, frozen D6 detector reproduction, and frozen D6-D1 attribution reproduction passed.

The fixed causal eventizer did not convert the frozen D6 detector into stable physical-impact events.

Authoritative evidence:

```text
run
  36198312071

head
  b987e972f8fef623c374c8b5752a891a3d6409d4

artifact
  10891293918

artifact name
  maplefly-v15n-d6-d2-causal-neural-eventizer-36198312071

artifact digest
  sha256:377027609d0e87aeb50dea973c6871a67f7eeb421edef7cbf64bb14797b495ba

v15n_d6_d2.json sha256
  475d612723d48f89224bedbde903431235f0ae4555d38742ccaaaa7dae81f2a5
```

Preregistration:

```text
4f2d707620f0010efa431cb1d66828d7590e6920
```

Implementation/workflow:

```text
cfc5ac3b2b0b3131802d83917255d8741257e1cc
b987e972f8fef623c374c8b5752a891a3d6409d4
```

No replacement POTION policy or detector was trained.

---

## 1. event-level result

```text
TRAIN
  neural events     491
  physical hits     648
  precision         0.2098
  hit recall        0.1590
  false events/ep   16.17

EVAL
  neural events     476
  physical hits     606
  precision         0.1408
  hit recall        0.1106
  false events/ep   17.04

fresh HOLDOUT
  neural events     499
  physical hits     648
  precision         0.1904
  hit recall        0.1466
  false events/ep   16.83
```

The preregistered eventDetectionStable gate failed decisively.

---

## 2. cumulative count result

Direct cumulative neural-event count versus physical-hit count:

```text
TRAIN
  R2     0.6653
  MAE    3.525 hits
  bias  -3.475 hits

EVAL
  R2     0.7442
  MAE    2.858 hits
  bias  -2.533 hits

HOLDOUT
  R2     0.7237
  MAE    3.042 hits
  bias  -2.992 hits
```

The high direct correlation is not sufficient because the absolute count error is large and strongly negative.

After removing TRAIN decision-position means:

```text
TRAIN
  R2   -1.3224
  MAE   1.9146

EVAL
  R2   -1.5287
  MAE   1.9903

HOLDOUT
  R2   -0.9387
  MAE   1.8691
```

Episode shift:

```text
EVAL shifted R2      -1.5606
HOLDOUT shifted R2   -0.8706
```

The residual representation is not stable or episode-specific by the preregistered gates.

---

## 3. frozen gates

```text
supportPass
  true

ecologyPass
  true

eventDetectionStable
  false

directCountStable
  false

residualStable
  false

episodeSpecific
  false
```

Therefore:

```text
V15N_D6_D2_EVENTIZER_NOT_STABLE
```

---

## 4. interpretation

D6-D1 correctly identified temporal multicount in the naive frame-wise accumulator, but the fixed three-negative-frame re-arm mechanism is not a valid physical-impact eventizer.

This does not contradict the D6 frame-level detector result. The D6 detector's negative class deliberately excludes the 0.2-2.0 second post-impact interval. In D6-D1 EVAL, that excluded LINGER interval contains 2756 positive frames, compared with 1127 positive RECENT frames and 351 positive BACKGROUND frames. A short re-arm rule can therefore emit additional events inside the prolonged post-impact response and can also remain disarmed when a later physical hit occurs.

The next diagnostic must attribute D2 neural events by RECENT/LINGER/BACKGROUND timing and separate missed physical hits into raw-detector misses versus eventizer lockout. It must not tune a new refractory period from the same evidence.

---

## 5. deployment

```text
POTION v15D
  DEPLOYED

v15N
  CLOSED / BLOCKED

v15N-D6-D2
  DIAGNOSTIC COMPLETE

v16C
  BLOCKED
```
