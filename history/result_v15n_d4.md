# result_v15n_d4 — continuous current-HP observability audit

## Status

```text
V15N_D4_INCONCLUSIVE
```

The preregistered continuous-health diagnostic completed successfully. Provenance, ecology, state-count,
and HP-variance guards all passed. The primary FULL34 representation did not satisfy stable reconstruction,
did not show preregistered neural contribution, and also missed the deliberately strict "clearly weak"
outcome because MAE remained below 20 HP.

Authoritative evidence:

```text
run
  36097663719

head
  43009412a0c65b6add0682da8723c490f8048e22

artifact
  10849120410

artifact name
  maplefly-v15n-d4-continuous-health-36097663719

artifact digest
  sha256:38d455554f11da5de9fcf745ee6f9584f59b399f92f04bd2dcaad72b39705a7a

v15n_d4.json sha256
  f838731a5ea4bb647bb2bc2369f83ee4bd2cb65e8072eb20b79358c8b9a01735
```

Preregistration:

```text
b8d0e6b946412c8269597865b122b49f16599ee6
```

Implementation/workflow:

```text
89afa03c168418837060fda847512fbc14b25b83
43009412a0c65b6add0682da8723c490f8048e22
```

No runtime policy was trained. Regression weights are diagnostic-only.

---

## 1. support and provenance

```text
reachable states
  TRAIN    5222
  EVAL     7180
  HOLDOUT  5855

HP standard deviation
  TRAIN    18.58
  EVAL     19.08
  HOLDOUT  19.15

supportPass
  true

ecologyPass
  true
```

The exact frozen v15N EVAL aggregate reproduced:

```text
survival             62.5%
minimum seed         50.0%
mean uses             5.625
mean excess uses      3.0667
wasted healing/DRINK  3.2593
```

---

## 2. continuous HP reconstruction

### FULL34 = PCA32 + recurrent h2

```text
TRAIN
  R2       0.1762
  MAE     13.83 HP
  RMSE    16.87 HP
  r        0.4197

EVAL
  R2      -0.0830
  MAE     16.32 HP
  RMSE    19.85 HP
  r        0.1867

fresh HOLDOUT
  R2      -0.0337
  MAE     16.45 HP
  RMSE    19.47 HP
  r        0.2917
```

### NEURAL32 only

```text
EVAL
  R2      -0.0885
  MAE     16.46 HP
  r       -0.0224

fresh HOLDOUT
  R2      -0.0401
  MAE     16.54 HP
  r        0.1288
```

### ACTION_STATE2 only

```text
EVAL
  R2       0.0950
  MAE     14.97 HP
  r        0.3183

fresh HOLDOUT
  R2       0.0824
  MAE     15.26 HP
  r        0.2883
```

Preregistered gates:

```text
fullStable
  false

neuralAddsHealth
  false

fullClearlyWeak
  false
```

Therefore the frozen outcome is:

```text
V15N_D4_INCONCLUSIVE
```

---

## 3. diagnostic interpretation

The snapshot-style frozen v15N observation does not demonstrate generalizable continuous current-HP
reconstruction.

In both unseen cohorts, FULL34 has negative R2 and performs worse than ACTION_STATE2 alone. NEURAL32 alone
also has negative R2.

This does not contradict v15K-D2 / v15M-D1. Those experiments established that recent impacts leave stable
episode-specific MaleCNS information. D4 instead asks whether the current 2-second causal-trace snapshot,
combined with the frozen 2-D own-action state, already represents accumulated current health.

The answer is not positive under the frozen D4 criteria.

A key remaining distinction is:

```text
recent impact is observable
versus
long-horizon accumulated injury is remembered
```

The next diagnostic should therefore test a causal multi-timescale neural memory rather than another
instantaneous readout.

---

## 4. deployment

```text
POTION v15D
  DEPLOYED

v15N
  CLOSED / BLOCKED

v15N-D4
  DIAGNOSTIC COMPLETE / INCONCLUSIVE

v16C
  BLOCKED
```
