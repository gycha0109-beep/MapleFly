# prereg_v15n_d6_d2_d1 — event timing and lockout attribution

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / OUTCOME**

Frozen prerequisite:

```text
v15N-D6-D2
  V15N_D6_D2_EVENTIZER_NOT_STABLE

v15N-D6-D2 receipt
  2f75719500c13bcfa1195605a13c5c8e7f61ac91
```

Design:

```text
history/design_v15n_d6_d2_d1_event_timing_lockout_attribution.md
commit 3eaf3eab4650c9391fd52ce8c6ca0eab860f6354
```

No alternative eventizer is evaluated.

---

## 1. cohorts

Reuse exact D2 cohorts:

```text
TRAIN
  4081000 4091000 4101000

EVAL
  4111000 4121000 4131000

HOLDOUT
  4391000 4401000 4411000

TRAIN->EVAL interruption RNG
  4147000

HOLDOUT interruption RNG
  4427000
```

24 tapes per cohort.

---

## 2. exact D2 reproduction

Require:

```text
artifact
  10891293918

artifact digest
  sha256:377027609d0e87aeb50dea973c6871a67f7eeb421edef7cbf64bb14797b495ba

v15n_d6_d2.json sha256
  475d612723d48f89224bedbde903431235f0ae4555d38742ccaaaa7dae81f2a5
```

Reproduce to absolute tolerance 1e-12:

- D2 event precision / recall / F1;
- false events per episode;
- direct-count metrics;
- residual metrics.

Require exact D6 detector weight SHA, threshold, and separation.

Any failure:

```text
V15N_D6_D2_D1_IMPLEMENTATION_OR_PROVENANCE_INVALID
```

---

## 3. support

For EVAL and HOLDOUT separately require:

```text
false emitted events >= 200
missed physical hits >= 200
physical inter-hit intervals >= 400
```

Otherwise:

```text
V15N_D6_D2_D1_INSUFFICIENT_ATTRIBUTION_SUPPORT
```

---

## 4. frozen attribution gates

### LINGER-dominated false emissions

For each cohort:

```text
lingerDominated =
  falseLingerFraction >= 0.60
```

Global:

```text
lingerDominated =
  EVAL lingerDominated
  AND HOLDOUT lingerDominated
```

### Eventizer suppression-dominated misses

For each cohort:

```text
suppressionDominated =
  eventizerSuppressionMisses / allMissedHits >= 0.60
```

Global requires EVAL and HOLDOUT.

### BACKGROUND-dominated false emissions

For each cohort:

```text
backgroundDominated =
  falseBackgroundFraction >= 0.60
```

Global requires EVAL and HOLDOUT.

No gate is tuned after outcome.

---

## 5. preregistered outcomes

Precedence:

### Invalid provenance

```text
V15N_D6_D2_D1_IMPLEMENTATION_OR_PROVENANCE_INVALID
```

### Insufficient support

```text
V15N_D6_D2_D1_INSUFFICIENT_ATTRIBUTION_SUPPORT
```

### LINGER + suppression

If global lingerDominated and global suppressionDominated:

```text
V15N_D6_D2_D1_LINGER_RETRIGGER_AND_LOCKOUT
```

### LINGER only

If global lingerDominated:

```text
V15N_D6_D2_D1_LINGER_RETRIGGER_DOMINANT
```

### Suppression only

If global suppressionDominated:

```text
V15N_D6_D2_D1_EVENTIZER_LOCKOUT_DOMINANT
```

### Background only

If global backgroundDominated:

```text
V15N_D6_D2_D1_BACKGROUND_EVENT_DOMINANT
```

### Mixed

Otherwise:

```text
V15N_D6_D2_D1_MIXED_EVENTIZER_FAILURE
```

---

## 6. stop rule

After the first authoritative result do not change:

- cohorts;
- D6 detector;
- D2 eventizer;
- RECENT/LINGER/BACKGROUND windows;
- 0.60 attribution gates;
- support gates;
- outcome precedence.

Do not select or test a new refractory duration in D1.
Do not deploy the D6 detector.
Do not modify v15D.

```text
POTION v15D
  DEPLOYED

v15N
  CLOSED / BLOCKED

v16C
  BLOCKED
```
