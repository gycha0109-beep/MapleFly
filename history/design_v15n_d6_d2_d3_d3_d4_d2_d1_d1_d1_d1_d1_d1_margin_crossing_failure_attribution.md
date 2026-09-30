# design_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_d1_margin_crossing_failure_attribution

## Question

D4-D2-D1-D1-D1-D1-D1 produced a valid fresh prospective result:

```text
A recall = 0.7486849795441263  FAIL
B recall = 0.7762850467289719  PASS
```

while all other primary gates passed on both cohorts.

The selected threshold was calibrated independently and is frozen:

```text
tau = 0.2378919189622094
```

This experiment asks:

> Why are impacts still missed under the frozen margin-crossing eventizer, especially on prospective A?

This is attribution only. No threshold or eventizer tuning is allowed.

---

## 1. frozen prerequisite

Require:

```text
result
  07397cace8c3877d29386f9b4b9ed064c2779ffd

receipt
  a6f092335b9530e77d4a35d1f5424069a653494a

run
  36699990275

artifact
  11091860656

artifact digest
  sha256:e0d4f25f828343ddaabb4c7e02df5dd05391cfde10daf1ebbfea369c0bc39651

JSON sha256
  f5bdc5e56984083fd7f56c41c230a6a51ecef9ea8377b6bbbcce210406e012c3

selected threshold
  0.2378919189622094

three-class model SHA
  cf9d38bbb697c1c2b98aa34f51c6ee39626c68763acbfb1c34e145eb738c7144
```

Reproduce exact prospective A/B margin-crossing metrics before attribution.

---

## 2. attribution cohorts

Reuse the exact failed prospective cohorts solely for failure attribution.

A:

```text
5901000 5911000 5921000 5931000
5941000 5951000 5961000 5971000
interruption 5987000
```

B:

```text
5991000 6001000 6011000 6021000
6031000 6041000 6051000 6061000
interruption 6077000
```

Exactly 64 tapes each.

No new generalization claim is allowed from these cohorts.

---

## 3. frozen runtime diagnostic

Preserve exactly:

```text
PCA32_TEMPORAL3
frozen three-class ridge model
margin_t =
  REALIZED score
  - max(PRE_HIT score, TRUE_BACKGROUND score)

tau = 0.2378919189622094

positive_t = margin_t >= tau
crossing_t = positive_t && !positive_(t-1)

refractory = 10 steps
matching window = [hit, hit+10)
```

No threshold search, no alternate threshold, no hysteresis, no persistence, no derivative or peak eventizer.

---

## 4. false-event timing attribution

For each unmatched emitted event, frozen precedence:

```text
PRE_HIT_200MS
  future hit with 0 < hitStep-eventStep < 10

RECENT_POST_HIT_200MS
  otherwise previous hit with
  0 <= eventStep-hitStep < 10

BACKGROUND_200MS
  otherwise
```

Report counts/fractions.

This is descriptive because precision already passes.

---

## 5. missed-impact attribution

For every unmatched physical impact inspect the exact frozen eventizer state in:

```text
[hitStep, hitStep+10)
```

Use this precedence.

### MATCH_CONFLICT

An emitted event exists in-window but is already consumed by an earlier physical impact.

### REFRACTORY_SUPPRESSED_CROSSING

If not MATCH_CONFLICT:

- a raw below-to-above threshold crossing occurs in-window;
- no event is emitted for that crossing;
- the crossing is suppressed only because the 10-step refractory is active.

### PRE_HIT_ABOVE_THRESHOLD_CARRYOVER

If not above:

- no emitted event exists in-window;
- the first eligible frame at/after hit is above threshold;
- the immediately previous eligible frame is also above threshold.

This means the margin already crossed before the physical hit and remains above threshold, so no new crossing can occur at hit onset.

### ABOVE_THRESHOLD_NO_EVENT_OTHER

If not above:

- at least one frame in-window is above threshold;
- no emitted event exists in-window.

### NO_THRESHOLD_WINDOW

No eligible frame in [hit, hit+10) reaches tau.

---

## 6. no-threshold-window margin geometry

For every NO_THRESHOLD_WINDOW miss compute:

```text
peakMargin200ms
thresholdGap = tau - peakMargin200ms
```

Report:

- mean thresholdGap;
- q10;
- q25;
- median;
- q75;
- q90.

Do not convert these values into a new threshold.

Also inspect [hit+10, hit+20) descriptively:

- whether margin reaches tau late;
- first late crossing latency when present.

---

## 7. pre-hit carryover geometry

For every PRE_HIT_ABOVE_THRESHOLD_CARRYOVER miss report:

```text
preHitMargin
firstPostHitMargin
peakMargin200ms
postHitGain =
  peakMargin200ms - preHitMargin
```

Report mean/quantiles of postHitGain.

This determines whether the neural confidence meaningfully rises after impact despite no threshold crossing.

No gain threshold may be selected here.

---

## 8. frozen miss axis

For each cohort compute miss fractions.

Axis precedence:

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
  MIXED_MARGIN_CROSSING_MISS
```

---

## 9. cohort asymmetry

Because only A failed recall, report descriptively:

```text
A minus B miss fraction
for every miss category

A minus B median thresholdGap
for NO_THRESHOLD_WINDOW

A minus B median postHitGain
for PRE_HIT_ABOVE_THRESHOLD_CARRYOVER
```

No statistical significance threshold and no tuning decision is preregistered from this comparison.

---

## 10. support

Require per cohort:

```text
64 tapes
physical impacts >= 1000
matched events >= 1000
missed impacts >= 250
```

Otherwise:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_INSUFFICIENT_ATTRIBUTION_SUPPORT
```

---

## 11. valid outcome

After exact reproduction and support:

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_MARGIN_CROSSING_FAILURE_ATTRIBUTED
```

A valid result must report:

```text
missAxis
false timing distributions
threshold-gap geometry
carryover post-hit-gain geometry
cohort asymmetry
```

---

## 12. next-step interpretation

No repair is implemented here.

Allowed next directions depend on the frozen result:

```text
PRE_HIT_CARRYOVER_DOMINANT
  test a separately preregistered event variable based on post-hit-like
  neural confidence change that does not require physical-hit state.

NO_THRESHOLD_DOMINANT
  representation sensitivity remains limiting;
  do not simply lower tau using attribution cohorts.

REFRACTORY_DOMINANT
  refractory structure becomes a testable blocker,
  but refractory cannot be changed from this result directly.

MATCH_CONFLICT_DOMINANT
  event/hit assignment structure is the immediate evaluation blocker.

MIXED_MARGIN_CROSSING_MISS
  require a narrower diagnostic before repair.
```

The fact that A missed the recall gate by only three matched impacts does not relax the preregistered 0.75 gate.

---

## 13. deployment

```text
POTION v15D  DEPLOYED
v15N         CLOSED / BLOCKED
v16C         BLOCKED
```
