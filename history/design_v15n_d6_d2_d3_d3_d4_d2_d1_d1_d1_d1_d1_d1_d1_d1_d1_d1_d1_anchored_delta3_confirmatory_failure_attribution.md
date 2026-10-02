# design_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_anchored_delta3_confirmatory_failure_attribution

## Question

The frozen PCA32_ANCHORED_DELTA3 representation produced:

```text
original prospective A  PASS
original prospective B  PASS
confirmatory A           FAIL only recall
confirmatory B           PASS
```

CONFIRM_A recall:

```text
0.7470588235294118
```

is below the frozen 0.75 gate by:

```text
0.0029411764705882
```

This experiment asks:

> Under the exact frozen anchored-delta3 score and exact frozen threshold, what mechanism accounts for the remaining missed impacts in CONFIRM_A/B?

This is attribution only.

No model refit, threshold search, calibration, feature change, temporal-depth change, refractory change, or eventizer change is permitted.

---

## 1. frozen prerequisite

Require:

```text
result
  4440e572859b58a1c70c327172d89601e879cf08

receipt
  d5f7105d4e1984297dd11512f0e6ab62a17ee45f

run
  36822848365

artifact
  11147009045

artifact digest
  sha256:d9b3268afbeae381956a5ad2eba17229cecd50329628dac8695aef9bc97bfdb9

JSON sha256
  1e1704f12d094e83c5e6f66e9ba8f589225e4a26a01c505275296e4de6334e99

trajectory model SHA
  6f2e4c0ec8c7ae438934a1b13db8f062387df3354383b6fab19eac5d8f354105

threshold
  0.5918989570787438
```

The exact confirmatory A/B metrics must be reproduced before attribution.

---

## 2. attribution cohorts

Reuse the exact confirmation cohorts solely for failure attribution.

CONFIRM_A:

```text
6801000 6811000 6821000 6831000
6841000 6851000 6861000 6871000
interruption 6887000
```

CONFIRM_B:

```text
6891000 6901000 6911000 6921000
6931000 6941000 6951000 6961000
interruption 6977000
```

Exactly 64 tapes each.

No new generalization claim is allowed from these cohorts.

---

## 3. exact frozen runtime diagnostic

Preserve:

```text
PCA32_ANCHORED_DELTA3
dimension = 128
horizons = 1 / 3 / 5 frames

trajectoryScore_t =
  intercept + beta dot standardized(x_t)

tau = 0.5918989570787438

positive_t = trajectoryScore_t >= tau
crossing_t = positive_t && !positive_(t-1)
refractory = 10 simulation steps

matching:
  earliest unmatched event in [hit, hit+10)
```

No alternate score or threshold.

---

## 4. false-event timing attribution

For each unmatched emitted event, frozen precedence:

```text
PRE_HIT_200MS
  future physical hit with
  0 < hitStep-eventStep < 10

RECENT_POST_HIT_200MS
  otherwise prior hit with
  0 <= eventStep-hitStep < 10

BACKGROUND_200MS
  otherwise
```

Report counts/fractions.

Precision already passes on both confirmation cohorts; this is descriptive only.

---

## 5. missed-impact attribution

For every unmatched physical impact inspect exact eventizer state in:

```text
[hitStep, hitStep+10)
```

Frozen precedence:

### MATCH_CONFLICT

An emitted event exists in-window but is consumed by an earlier impact.

### REFRACTORY_SUPPRESSED_CROSSING

If not MATCH_CONFLICT:

- a raw below-to-above threshold crossing occurs in-window;
- no event is emitted for that crossing;
- suppression is caused only by frozen 10-step refractory.

### PRE_HIT_ABOVE_THRESHOLD_CARRYOVER

If not above:

- no emitted event exists in-window;
- first eligible frame at/after hit is above tau;
- immediately previous eligible frame is also above tau.

### ABOVE_THRESHOLD_NO_EVENT_OTHER

If not above:

- at least one frame in-window is above tau;
- no emitted event exists in-window.

### NO_THRESHOLD_WINDOW

No eligible frame in [hit,hit+10) reaches tau.

---

## 6. NO_THRESHOLD_WINDOW geometry

For each NO_THRESHOLD_WINDOW miss compute:

```text
peakScore200ms
thresholdGap = tau - peakScore200ms
```

Report:

```text
mean
q10
q25
median
q75
q90
```

Also inspect [hit+10, hit+20):

```text
lateAboveThreshold
lateRawCrossing
firstLateCrossingLatencySeconds
```

Descriptive only.

No threshold may be chosen from these values.

---

## 7. PRE_HIT carryover geometry

For each PRE_HIT_ABOVE_THRESHOLD_CARRYOVER miss report:

```text
preHitScore
firstPostHitScore
peakScore200ms
postHitGain =
  peakScore200ms - preHitScore
```

Aggregate postHitGain:

```text
mean
q10
q25
median
q75
q90
```

No gain threshold may be selected.

---

## 8. frozen miss axis

Apply in precedence:

```text
PRE_HIT_CARRYOVER_DOMINANT
  PRE_HIT_ABOVE_THRESHOLD_CARRYOVER > 0.50 on both cohorts

NO_THRESHOLD_DOMINANT
  NO_THRESHOLD_WINDOW > 0.50 on both cohorts

REFRACTORY_DOMINANT
  REFRACTORY_SUPPRESSED_CROSSING > 0.50 on both cohorts

MATCH_CONFLICT_DOMINANT
  MATCH_CONFLICT > 0.50 on both cohorts

otherwise
  MIXED_ANCHORED_DELTA3_MISS
```

Dominance is strict > 0.50.

---

## 9. confirmatory cohort asymmetry

Because only CONFIRM_A failed recall, report:

```text
A minus B fraction
  for every miss category

A minus B median thresholdGap
A minus B median postHitGain
```

No significance threshold and no repair selection are allowed from this descriptive comparison.

---

## 10. original-vs-confirm descriptive comparison

Read the original prospective metrics from authoritative anchored-delta3 evidence and report:

```text
original A/B recall
confirm A/B recall
original-to-confirm recall deltas
```

Do not rerun original cohorts for tuning.

Do not pool original and confirmation cohorts.

---

## 11. support

Require per confirmation cohort:

```text
64 tapes
physical impacts >= 1000
matched events >= 1000
missed impacts >= 250
```

Globally require:

```text
authoritative evidence SHA matches
trajectory model SHA matches
threshold matches
exact confirmatory metric reproduction passes
```

Provenance/reproduction failure:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_IMPLEMENTATION_OR_PROVENANCE_INVALID
```

Support failure:

```text
...D1_INSUFFICIENT_ATTRIBUTION_SUPPORT
```

---

## 12. valid outcome

After exact reproduction and support:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_ANCHORED_DELTA3_CONFIRMATORY_FAILURE_ATTRIBUTED
```

Must report:

```text
missAxis
false-event timing
NO_THRESHOLD geometry
carryover geometry
confirmatory cohort asymmetry
original-vs-confirm recall deltas
```

---

## 13. next-step interpretation

No repair is implemented here.

If:

```text
NO_THRESHOLD_DOMINANT
```

then frozen anchored-delta3 score sensitivity is the replication blocker. Do not lower tau from confirmation cohorts. A separately preregistered robustness/representation bridge is required.

If:

```text
PRE_HIT_CARRYOVER_DOMINANT
```

then score information exists but crossing semantics is the blocker. A separate runtime-neural eventization audit is required.

If:

```text
REFRACTORY_DOMINANT
```

then frozen refractory becomes a testable blocker but cannot be changed directly.

If:

```text
MATCH_CONFLICT_DOMINANT
```

then evaluator assignment is the immediate blocker.

If mixed, perform a narrower audit.

---

## 14. stop rule / deployment

No:

- refit;
- calibration;
- threshold search;
- feature search;
- horizon search;
- refractory tuning;
- eventizer modification;
- deployment change.

```text
diagnosticStackDeployable = false
POTION v15D  DEPLOYED
v15N         CLOSED / BLOCKED
v16C         BLOCKED
```
