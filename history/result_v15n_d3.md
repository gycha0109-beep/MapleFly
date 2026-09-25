# result_v15n_d3 — current-health observability audit

## Status

```text
V15N_D3_INSUFFICIENT_HEALTH_STATE_SUPPORT
```

The diagnostic executed and reproduced the frozen v15N provenance and ecology, but the preregistered support
guard failed for the FULL_HEAL_AVAILABLE target. The primary outcome matrix therefore stops at insufficient
support.

Authoritative evidence:

```text
run
  36095500223

head
  8b1e619f4ff6de9ca9650945806a8a469d27e1c5

artifact
  10847054092

artifact name
  maplefly-v15n-d3-health-observability-36095500223

artifact digest
  sha256:668238ed23f2a60ff97a7dec795932f55967bde4f683385b97e04c8c36b9600a

v15n_d3.json sha256
  b7da534ad4110407efdc92b77e4082d9f6693236170664f623c8c4adfa797d0f
```

Preregistration:

```text
73d6f01a0db369525ebe31bc3875211a22c51ecd
```

Implementation/workflow:

```text
4b406707e01d38b2e512866f4b35ba7367b86032
8b1e619f4ff6de9ca9650945806a8a469d27e1c5
```

No runtime policy was trained and no diagnostic probe is deployable.

---

## 1. provenance

The frozen v15N candidate reproduced exactly on EVAL:

```text
survival
  62.5%

minimum base-seed survival
  50.0%

mean uses
  5.625

mean excess uses
  3.0667

wasted healing / DRINK
  3.2593
```

Frozen preprocessing reproduced:

```text
977aa76306c4aa387585c7cdea9a96de26296764ef98962565bd49935d6ccc83
```

All frozen lower-skill ecology gates passed in EVAL and fresh HOLDOUT.

---

## 2. support

CRITICAL (HP <=30) had ample support:

```text
TRAIN
  positive 3143
  negative 2079

EVAL
  positive 4086
  negative 3094

HOLDOUT
  positive 3372
  negative 2375
```

FULL_HEAL_AVAILABLE (HP <=70) did not satisfy the frozen >=500-per-class support gate:

```text
TRAIN
  positive 5100
  negative 122

EVAL
  positive 6978
  negative 202

HOLDOUT
  positive 5608
  negative 139
```

Therefore:

```text
supportPass = false
outcome = V15N_D3_INSUFFICIENT_HEALTH_STATE_SUPPORT
```

---

## 3. descriptive probe results

These values are retained as descriptive evidence only.

### CRITICAL

```text
FULL34 = PCA32 + h2
  TRAIN    65.1%
  EVAL     55.2%
  HOLDOUT  60.6%

NEURAL32
  EVAL     49.7%
  HOLDOUT  50.7%

ACTION_STATE2
  EVAL     61.7%
  HOLDOUT  62.0%
```

### FULL_HEAL_AVAILABLE

```text
FULL34
  TRAIN    76.7%
  EVAL     64.5%
  HOLDOUT  61.1%

NEURAL32
  EVAL     57.4%
  HOLDOUT  55.2%

ACTION_STATE2
  EVAL     66.9%
  HOLDOUT  66.4%
```

The descriptive pattern does not justify the preregistered health-observability claims because one target
failed support. It does motivate a support-independent continuous-health diagnostic.

---

## 4. next question

The next diagnostic should avoid arbitrary health-band class imbalance and ask directly:

> How much of continuous current HP can the frozen PCA32+h2 representation reconstruct on unseen cohorts?

A fixed TRAIN-only ridge regression on HP provides that test without changing a threshold after observing
D3.

---

## 5. deployment

```text
POTION v15D
  DEPLOYED

v15N
  CLOSED / BLOCKED

v15N-D3
  DIAGNOSTIC CLOSED / INSUFFICIENT SUPPORT

v16C
  BLOCKED
```
