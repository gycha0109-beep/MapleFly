# result_v15n_d5 — causal multiscale cumulative-injury observability

## Status

```text
V15N_D5_CUMULATIVE_INJURY_MEMORY_NOT_DEMONSTRATED
```

The preregistered v15N-D5 diagnostic completed successfully. Provenance, ecology, support, and exact
2.0-second trace reproduction all passed.

Four causal MaleCNS traces with half-lives 0.5 / 2 / 8 / 32 seconds fit TRAIN cumulative-injury residuals
well, but the frozen TRAIN-only readout did not generalize to EVAL or fresh HOLDOUT. The preregistered
"both clearly weak" condition therefore fired.

Authoritative evidence:

```text
run
  36185790793

head
  5d744d22e4db1106afd320d2f875b82669b6c0f5

artifact
  10886652854

artifact name
  maplefly-v15n-d5-multiscale-injury-memory-36185790793

artifact digest
  sha256:1d6b24520ac51835223d648359cb3da0b346de92dacc5e61828256774927020b

v15n_d5.json sha256
  4058cb2e363922de466b57cb77f09c933b318fbbf89cd9aeab73eee20ef30684
```

Preregistration:

```text
189e0bdb15c73ea1f1ec4e1e6daa86805008725b
```

Implementation/workflow:

```text
2dd3a8ccd9d72674b4817886275dcaa55ec6d03c
5d744d22e4db1106afd320d2f875b82669b6c0f5
```

No POTION policy was trained. Damage-regression weights are diagnostic-only and non-deployable.

---

## 1. validity

```text
snapshots
  TRAIN    240
  EVAL     240
  HOLDOUT  240

damage-residual SD
  TRAIN    16.16 HP
  EVAL     15.34 HP
  HOLDOUT  15.16 HP

2-second trace max absolute reproduction error
  0

supportPass
  true

ecologyPass
  true
```

The exact frozen v15N EVAL FULL aggregate reproduced:

```text
survival             62.5%
minimum seed         50.0%
mean uses             5.625
mean excess uses      3.0667
wasted healing/DRINK  3.2593
```

---

## 2. multiscale cumulative-injury reconstruction

### MULTISCALE_PCA32

```text
TRAIN
  R2       0.8383
  MAE      5.19 HP
  RMSE     6.50 HP
  r        0.9156

EVAL
  R2      -0.7312
  MAE     15.84 HP
  RMSE    20.18 HP
  r        0.2046

fresh HOLDOUT
  R2      -0.2603
  MAE     13.22 HP
  RMSE    17.02 HP
  r        0.2763
```

### frozen SINGLE2_PCA32 comparator

```text
TRAIN
  R2       0.7936
  MAE      5.78 HP
  RMSE     7.34 HP
  r        0.8909

EVAL
  R2      -0.7640
  MAE     16.03 HP
  RMSE    20.37 HP
  r        0.2156

fresh HOLDOUT
  R2      -0.2453
  MAE     13.32 HP
  RMSE    16.92 HP
  r        0.3152
```

Both representations therefore fail the preregistered stable reconstruction criterion.

---

## 3. episode-shift control

MULTISCALE:

```text
EVAL
  unshifted R2  -0.7312
  shifted R2    -0.8853
  drop           0.1541

HOLDOUT
  unshifted R2  -0.2603
  shifted R2    -0.4730
  drop           0.2127
```

The preregistered episode-specificity difference criterion passes. This means the neural sequence contains
some episode-specific information relevant to the target. It does not rescue reconstruction: absolute
generalization remains poor.

---

## 4. frozen gates

```text
multiStable
  false

singleStable
  false

multiImproves
  false

episodeSpecific
  true

bothClearlyWeak
  true
```

Therefore, by the preregistered precedence:

```text
V15N_D5_CUMULATIVE_INJURY_MEMORY_NOT_DEMONSTRATED
```

---

## 5. interpretation

This result narrows the bottleneck.

The previous diagnostics established:

1. recent real impacts produce stable episode-specific MaleCNS DN evidence;
2. the frozen v15N snapshot does not stably reconstruct current HP;
3. simply retaining four raw exponential neural memories does not turn that short-lived impact evidence
   into a generalizable cumulative-injury variable.

The large TRAIN R2 together with negative unseen-cohort R2 indicates that a generic PCA32 + ridge readout
can fit cohort-specific structure but does not recover a stable cross-cohort cumulative injury coordinate.

The episode-shift degradation shows that the result is not equivalent to "there is no episode-specific
signal". The unresolved question is whether a mechanistically constrained recent-impact detector followed
by causal evidence accumulation can form a stable injury state.

That is a different architecture from retaining the entire DN vector with several exponential half-lives,
and should be tested as a new frozen diagnostic rather than by retuning D5.

---

## 6. deployment

```text
POTION v15D
  DEPLOYED

v15N
  CLOSED / BLOCKED

v15N-D5
  DIAGNOSTIC COMPLETE / NOT DEMONSTRATED

v16C
  BLOCKED
```
