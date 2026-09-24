# prereg_v15k_d2 — impact-locked DN temporal retention audit

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / FRESH TAPE COLLECTION / OUTCOME**

v15K-D1 closed with:

```text
V15K_D1_EPISODE_SPECIFIC_SIGNAL_NOT_DEMONSTRATED

P1 raw long margin
  BA 77.2%
  survival 100%
  excess 1.875

P2 decision-position residual margin
  BA 59.7%
  survival 16.7%

P3 decision-position residual pooled-DN PCA32
  BA 52.7%
  survival 50%
```

Closure:

```text
f296051e53dda3092a51a907d48aa05bd28f66b6
```

Scientific question:

> Does the frozen MaleCNS produce an episode-specific DN response to real contact that is visible at
> 100 ms resolution after removing the common 4.8-second phase profile, and how long does that response
> remain decodable after the direct LgLG impact pulse?

This is a diagnostic. No classifier produced here is deployment eligible.

---

## 1. frozen stack

Unchanged MaleCNS and lower skills.

```text
MaleCNS commit
  95a3dbcb05241b0a5c07028ca8ad945b23fbbe6e

v15E2 artifact
  10793265453

v15E2 representation sha
  244464c8b5e9c7f5871f35cb3acc4ac1e2e0c9b61860c1dd3c267de79d4758db

v15E2 model sha
  18be00b46303f46d62f8f63f26ca1a280b66f50f0004be6f469c637123077c96
```

No deployed policy is changed.

---

## 2. fresh cohorts

TRAIN:

```text
3681000
3691000
3701000
```

EVAL:

```text
3711000
3721000
3731000
```

24 TRAIN and 24 EVAL episodes.

Exact 48-second continuous ecology.

Lower-skill interruption RNG:

```text
3747000
```

No explicit short CI timeout.

---

## 3. 100 ms DN frames

The existing POTION observation pipeline already forms one DN-rate frame every:

```text
5 brain steps
= 100 ms
```

Before the 48-frame / 4.8-second mean pool, save the exact normalized frame:

```text
frame[d] =
  clamp(
    (DN_rate[d] - episode_baseline_rate[d]) / 50,
    -1,
    +1
  )
```

for all 1,316 DNs.

Each full 48-second episode therefore contributes 480 frames.

Also record the frame end step.

Contact timestamps are evaluator labels only and never neural features.

---

## 4. TRAIN-only phase residualization

The existing POTION/taste cycle is 48 frames.

For phase p=0..47 compute on TRAIN only:

```text
phaseMean[p][d]
  = mean frame[d] for every TRAIN frame with frameIndex mod 48 = p
```

Then:

```text
residualFrame[d]
  = frame[d] - phaseMean[phase][d]
```

Freeze TRAIN phase means before EVAL transformation.

Never compute EVAL means.

This removes the repeatable 4.8-second common temporal profile identified by v15J/v15K/v15K-D1.

---

## 5. contact-age labels

At each frame end, compute evaluator-only age since the most recent real contact.

The four preregistered positive bands are:

```text
B0 DIRECT
  0 ms <= age < 200 ms

B1 EARLY_POST
  200 ms <= age < 500 ms

B2 MID_POST
  500 ms <= age < 1000 ms

B3 LATE_POST
  1000 ms <= age < 2000 ms
```

Negative support for every band:

```text
NO_RECENT
  no prior contact
  OR age >= 2000 ms
```

Frames between the selected positive band and 2000 ms that belong to another positive band are excluded
from that band's binary classifier.

A band is support-valid only if TRAIN and EVAL each contain at least:

```text
100 positive frames
100 negative frames
```

Otherwise that band is reported unsupported and cannot establish retention.

---

## 6. deterministic mean-difference probe

For each band independently, using TRAIN residual frames only:

```text
positiveMean[d]
negativeMean[d]

w[d]
  = positiveMean[d] - negativeMean[d]

w
  L2-normalized

threshold
  midpoint between TRAIN projected positive mean and negative mean
```

If the weight norm is <=1e-12, that band is invalid.

No gradient optimizer, feature selection, PCA, HP label, oracle POTION label, or EVAL tuning.

Prediction:

```text
positive iff dot(w, residualFrame) > threshold
```

---

## 7. primary EVAL metrics

For each supported band report:

```text
balanced accuracy
positive recall
negative recall
score separation
```

Primary direct-encoding gate:

```text
B0 balanced accuracy >= 70%
B0 positive recall    >= 60%
B0 negative recall    >= 60%
```

Post-pulse retention gate for B1/B2/B3 individually:

```text
balanced accuracy >= 65%
positive recall    >= 60%
negative recall    >= 60%
```

---

## 8. episode-shift alignment control

Keep every EVAL contact timestamp/label sequence fixed.

Cyclically replace each episode's complete residual DN frame sequence with the next EVAL episode's
sequence at the same frame positions.

Do not retrain probes.

For a band to count as episode-specific evidence, shifted alignment must reduce balanced accuracy by:

```text
>= 10 percentage points
```

relative to FULL.

---

## 9. lower-skill validity

Fresh EVAL ecology must retain the same lower-skill gates:

```text
episodes with >=3 kills          >= 75%
obstacle clear                   >= 85%
target kill                      >= 70%
LEFT target kill                 >= 65%
RIGHT target kill                >= 65%
attack precision                 >= 45%
airborne attack                  <= 22%
post-clear jump encounter        <= 25%
pre-clear attack encounter       <= 30%
```

Failure makes the diagnostic ecology-invalid.

---

## 10. preregistered outcomes

### A — persistent post-pulse signal

If B0 passes with episode-specific alignment and at least one of B1/B2/B3 also passes its retention gate
with episode-specific alignment:

```text
V15K_D2_PERSISTENT_IMPACT_SIGNAL_PRESENT
```

Interpretation:

```text
real contact produces a DN signature that survives beyond the direct LgLG pulse;
the 4.8-second mean pool is a plausible dilution bottleneck
```

Authorize a future runtime-feasible causal short-window / trace representation built only from neural
frames and own POTION actions.

### B — transient-only signal

If B0 passes with episode-specific alignment but none of B1/B2/B3 passes:

```text
V15K_D2_TRANSIENT_IMPACT_SIGNAL_PRESENT
```

Interpretation:

```text
contact is neurally detectable, but persistence is too short for the current 4.8-second decision mean;
a future causal neural accumulator may be justified, but must be separately preregistered
```

### C — no demonstrated direct signal

If B0 fails or lacks episode-specific alignment:

```text
V15K_D2_IMPACT_SIGNAL_NOT_DEMONSTRATED
```

Interpretation:

```text
the current MaleCNS + LgLG encoding does not demonstrate a robust episode-specific impact signature even
at 100 ms diagnostic resolution
```

Then inspect sensory encoding before further POTION policy work.

### Invalid

If ecology validity or mandatory B0 support fails:

```text
V15K_D2_IMPLEMENTATION_OR_SUPPORT_INVALID
```

---

## 11. stop rule

After outcome do not:

- tune age bands;
- tune 70% / 65% gates;
- tune phase residualization;
- select DNs using labels;
- change LgLG drive or pulse width;
- train a POTION policy in the same run;
- deploy diagnostic probe weights.

Freeze D2 before designing the next remediation.

Deployment remains blocked.
v16C remains blocked.
