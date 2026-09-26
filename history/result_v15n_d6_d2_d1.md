# result_v15n_d6_d2_d1 — event timing and lockout attribution

## Status

```text
V15N_D6_D2_D1_EVENTIZER_LOCKOUT_DOMINANT
```

The preregistered v15N-D6-D2-D1 attribution completed successfully.

Authoritative evidence:

```text
run
  36201795474

head
  18c29cc61e47f88b414ae11c608598e2e213e3f2

artifact
  10893121955

artifact name
  maplefly-v15n-d6-d2-d1-event-timing-lockout-36201795474

artifact digest
  sha256:42461e3bd2f2582c826840a1425f347986b1e1698c465267b085a4e9685976f7

v15n_d6_d2_d1.json sha256
  89da8a8d4bd77e798cf778f702275c7e4205cc933f7ce3a3341ea5b83a3ea63f
```

Preregistration:

```text
43a96d18c2f399ebac03dff7eb70546e19cc94dc
```

Implementation/workflow:

```text
ad2ecd5e0015b4dfa86c5c49bf5d65efc2b743da
18c29cc61e47f88b414ae11c608598e2e213e3f2
```

---

## 1. dominant failure attribution

```text
EVAL
  physical hits                         606
  recalled hits                          67
  missed hits                           539
  raw-D6-detectable hits                606
  raw detector misses                     0
  eventizer suppression misses          539
  suppression fraction among misses   1.000

fresh HOLDOUT
  physical hits                         648
  recalled hits                          95
  missed hits                           553
  raw-D6-detectable hits                648
  raw detector misses                     0
  eventizer suppression misses          553
  suppression fraction among misses   1.000
```

Every physical hit in EVAL and HOLDOUT had at least one positive frozen-D6 frame in the preregistered recent window. Every missed hit was therefore attributable to the fixed D2 eventizer state, not absence of raw detector response.

---

## 2. false emitted-event timing

```text
EVAL
  false events             409
  LINGER                   207  (50.61%)
  BACKGROUND               202  (49.39%)
  0.2-0.5 s LINGER           0
  0.5-1.0 s LINGER          74
  1.0-2.0 s LINGER         133

HOLDOUT
  false events             404
  LINGER                   213  (52.72%)
  BACKGROUND               191  (47.28%)
  0.2-0.5 s LINGER           0
  0.5-1.0 s LINGER          74
  1.0-2.0 s LINGER         139
```

Neither LINGER nor BACKGROUND alone crossed the preregistered 0.60 dominance gate.

---

## 3. physical inter-hit timing

```text
EVAL
  intervals                  582
  median                    1.26 s
  p25                       0.96 s
  p75                       3.035 s
  <1.0 s                   27.49%
  <2.0 s                   64.43%

HOLDOUT
  intervals                  624
  median                    1.24 s
  p25                       0.92 s
  p75                       2.64 s
  <1.0 s                   30.93%
  <2.0 s                   67.31%
```

A simple long fixed refractory interval would overlap heavily with genuine subsequent impacts.

---

## 4. frozen gates

```text
supportPass
  true

lingerDominated
  false

suppressionDominated
  true

backgroundDominated
  false
```

Therefore:

```text
V15N_D6_D2_D1_EVENTIZER_LOCKOUT_DOMINANT
```

---

## 5. interpretation

The current blocker is not raw recent-impact observability under the frozen diagnostic detector. The fixed D2 armed/disarmed eventizer discards later real impacts while also emitting false events from both lingering and background detector activity.

The next diagnostic should test whether a new physical impact creates a causal neural onset/innovation signature that can be distinguished from ongoing post-impact activity. It must use a fresh final HOLDOUT and must not tune a refractory duration on D2-D1 evidence.

---

## 6. deployment

```text
POTION v15D
  DEPLOYED

v15N
  CLOSED / BLOCKED

v15N-D6-D2-D1
  DIAGNOSTIC COMPLETE

v16C
  BLOCKED
```
