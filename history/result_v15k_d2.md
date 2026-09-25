# result_v15k_d2 — impact-locked DN temporal retention audit

## Status

```text
V15K_D2_PERSISTENT_IMPACT_SIGNAL_PRESENT
```

Authoritative run:

```text
run
  36075130775

head
  ba5a777119b43c4f58f9b471609b4ed116ff9f95

artifact
  10839319406

artifact name
  maplefly-v15k-d2-impact-retention-36075130775

artifact digest
  sha256:69b754ed8546a8409d7be0b3384c4b9b20061645342c585a04f6adb93fc38d7e

artifact size
  2568 bytes
```

Preregistration:

```text
cf2b221c9002dbf3582f452d3b689415aef048ab
```

Implementation:

```text
6243b24dba3a33f9a6a4267369af633d56e40f95
```

Workflow:

```text
ba5a777119b43c4f58f9b471609b4ed116ff9f95
```

The authoritative GitHub Actions job completed successfully. No deployed policy was changed.

---

## 1. frozen basis and diagnostic scope

The audit preserved the frozen MaleCNS stack and v15E2 neural core:

```text
MaleCNS
  alextitonis/fly.ai
  95a3dbcb05241b0a5c07028ca8ad945b23fbbe6e

v15E2 artifact
  10793265453

v15E2 artifact digest
  sha256:a119bc0e425d08c5ce2381e6054c6ee358bf9402d5c442a57c00c916fd3b9405

representation sha
  244464c8b5e9c7f5871f35cb3acc4ac1e2e0c9b61860c1dd3c267de79d4758db

model sha
  18be00b46303f46d62f8f63f26ca1a280b66f50f0004be6f469c637123077c96
```

This experiment is diagnostic only. Contact timestamps were evaluator labels, not runtime neural features.
The mean-difference probe weights are supervised diagnostic weights and are not deployment eligible.

---

## 2. 100 ms representation and residualization

Fresh tapes:

```text
TRAIN
  24 episodes
  base seeds 3681000 / 3691000 / 3701000

EVAL
  24 episodes
  base seeds 3711000 / 3721000 / 3731000

lower-skill interruption RNG
  3747000

frames per episode
  480

frame duration
  100 ms
```

The exact 1,316-D normalized DN frame before the old 4.8-second mean pool was retained.

TRAIN-only 48-frame phase means were removed before EVAL transformation:

```text
preprocessing
  TRAIN_ONLY_PHASE_48_RESIDUAL

phase mean sha
  1b4b2be3f1d9fbba396dc4adb81d843a3aae66a4befc04bd661b6f2ae940ad49

EVAL means used
  NO
```

This directly targets the repeatable temporal profile that dominated v15J/v15K and survived into v15K-D1.

---

## 3. lower-skill ecology validity

All preregistered ecology checks passed:

```text
episodes with >=3 kills
  100.0%        PASS
  required >=75%

obstacle clear
  97.1%         PASS
  required >=85%

target kill
  92.6%         PASS
  required >=70%

LEFT target kill
  90.1%         PASS
  required >=65%

RIGHT target kill
  95.0%         PASS
  required >=65%

attack precision
  63.8%         PASS
  required >=45%

airborne attack
  14.2%         PASS
  required <=22%

post-clear jump encounter
  0.8%          PASS
  required <=25%

pre-clear attack encounter
  5.8%          PASS
  required <=30%
```

The diagnostic ecology is valid.

---

## 4. B0 — DIRECT, 0–200 ms

EVAL support:

```text
positive
  1264

negative
  2830
```

FULL:

```text
balanced accuracy
  90.1%

positive recall
  93.9%

negative recall
  86.3%

score separation
  0.793

direct-encoding gate
  PASS
```

EPISODE_SHIFT:

```text
balanced accuracy
  55.0%

FULL -> SHIFT drop
  35.1 percentage points

episode-specific alignment
  TRUE
```

The direct contact response is strong and depends on the matching episode neural sequence.

---

## 5. B1 — EARLY_POST, 200–500 ms

EVAL support:

```text
positive / negative
  1888 / 2830
```

```text
FULL balanced accuracy
  83.9%

positive recall
  86.0%

negative recall
  81.8%

score separation
  0.581

EPISODE_SHIFT balanced accuracy
  53.7%

FULL -> SHIFT drop
  30.2 percentage points

retention gate
  PASS

episode-specific alignment
  TRUE
```

---

## 6. B2 — MID_POST, 500–1000 ms

EVAL support:

```text
positive / negative
  2722 / 2830
```

```text
FULL balanced accuracy
  78.6%

positive recall
  83.8%

negative recall
  73.4%

score separation
  0.395

EPISODE_SHIFT balanced accuracy
  53.6%

FULL -> SHIFT drop
  25.0 percentage points

retention gate
  PASS

episode-specific alignment
  TRUE
```

---

## 7. B3 — LATE_POST, 1000–2000 ms

EVAL support:

```text
positive / negative
  2816 / 2830
```

```text
FULL balanced accuracy
  72.5%

positive recall
  69.2%

negative recall
  75.8%

score separation
  0.328

EPISODE_SHIFT balanced accuracy
  51.5%

FULL -> SHIFT drop
  21.0 percentage points

retention gate
  PASS

episode-specific alignment
  TRUE
```

The latest preregistered post-contact band remains above all retention thresholds and loses 21.0 pp
under episode shift.

---

## 8. conclusion

The preregistered outcome resolves to:

```text
V15K_D2_PERSISTENT_IMPACT_SIGNAL_PRESENT
```

B0 passes the direct-encoding gate with episode-specific alignment, and all three post-pulse bands
B1/B2/B3 independently pass their retention gates with episode-specific alignment.

Supported interpretation:

```text
real contact produces a strong episode-specific signature in frozen MaleCNS DN activity at 100 ms
resolution, and diagnostically decodable information persists through the preregistered 1–2 second band
after the direct impact pulse
```

This makes the old 4.8-second decision mean a plausible representation bottleneck:

```text
strong 100 ms episode-specific impact signal
  -> 4.8 s mean pooling
  -> impact residual diluted
  -> repeatable phase/common temporal component dominates
```

This result does **not** establish that the fly "remembers HP", and it does not authorize deployment of
the supervised probe.

Authorized next work is design and preregistration of a runtime-feasible causal short-window / decaying
neural trace built only from MaleCNS-derived neural frames plus permitted own POTION-action memory.

Forbidden shortcuts remain forbidden:

```text
contact timestamp
damage flag / counter
HP / missing HP
time since hit
decision index
oracle injury state
future damage
oracle POTION label
```

Do not train the next reward-only POTION policy until that representation, controls, reward, optimizer,
seeds, and gates are separately preregistered.

POTION v15D remains deployed.
Experimental POTION replacement remains blocked.
v16C remains blocked.
