# prereg_v15n_d6_d2_d3_d3_d3 — causal DN pulse eventizer

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / OUTCOME**

Frozen prerequisite:

```text
v15N-D6-D2-D3-D3-D2-D1
  V15N_D6_D2_D3_D3_D2_D1_BACKGROUND_IS_NEAR_FUTURE_HIT_DOMINANT

result
  fcb05366fc3a0d79a0968ff533db33c42adefd00

receipt
  2a8c1dea3e962e0cd55823bc9ada1b9279097d5d
```

Design:

```text
history/design_v15n_d6_d2_d3_d3_d3_causal_dn_pulse_eventizer.md
commit 60790839c103f1bdc6cd1694dfec720ce2bfa0af
```

---

## 1. exact frozen stack

Require:

```text
D2-D1 artifact
  10942941071

artifact digest
  sha256:5a446f379f3322fc6f316d3111681ffee26b27ec985e7cc5212494b95020e7cd

D2-D1 JSON sha256
  da79868d2866bd13f8d6e5b8b34597436979d742fa70a27f7b3ca711621190d6

D2-D1 outcome
  V15N_D6_D2_D3_D3_D2_D1_BACKGROUND_IS_NEAR_FUTURE_HIT_DOMINANT

D6 weights
  5dc677cf4c14e398465af72cbcff784e40163cdf702064359e7f4648319c9eb5

old scalar model
  ee36661675a1f6717d53d2f2af63797704d89194bf78d980f5d4415e3ee4f066

innovation PCA
  b187f3de9229e14260b8d1464e20fa3b8d26158a715a5372e4696c1bf3b7fb33

D3-D3 DN readout
  a341d9747a19bf4a3a0cb625eca5a4ff6a3dd071e1f641a4d8005cd18d21f496

DN threshold
  0.5
```

Any provenance/reconstruction failure:

```text
V15N_D6_D2_D3_D3_D3_IMPLEMENTATION_OR_PROVENANCE_INVALID
```

---

## 2. causal eventizer

At eligible frame index i:

```text
contextEligible = frames[i-1].oldScalarPositive
candidate = contextEligible && frames[i].dnScore >= 0.5
```

Emit if candidate and:

```text
no previous emitted event
OR
frameStep - lastEmittedEventStep >= 10 simulation steps
```

Fixed refractory:

```text
10 steps = 200 ms
```

No physical-hit/contact/HP/damage state enters the eventizer.

---

## 3. evaluator one-to-one matching

For each physical hit in ascending step order, match the earliest unmatched neural event satisfying:

```text
eventStep >= hitStep
eventStep - hitStep < 10 steps
```

Unmatched hit = false negative.
Unmatched neural event = false positive.
Pre-hit events are not matched forward.

---

## 4. cohorts

TRAIN only:

```text
4081000 4091000 4101000
interruption 4147000
```

PROSPECTIVE_A:

```text
5091000 5101000 5111000 5121000
5131000 5141000 5151000 5161000
interruption 5177000
```

PROSPECTIVE_B:

```text
5181000 5191000 5201000 5211000
5221000 5231000 5241000 5251000
interruption 5267000
```

Exactly 64 tapes per prospective cohort.

---

## 5. support gates

For each prospective cohort require:

```text
64 tapes
physical hits >= 1000
emitted neural events >= 500
```

Otherwise:

```text
V15N_D6_D2_D3_D3_D3_INSUFFICIENT_EVENT_SUPPORT
```

---

## 6. event-stream gates

All must pass independently on both cohorts:

```text
precision >= 0.75
recall >= 0.75
F1 >= 0.75
0.80 <= neuralEventCount / physicalHitCount <= 1.20
mean tape-level absolute event-count error <= 5.0
```

Latency and pre-hit false-event diagnostics are descriptive only.

---

## 7. preregistered outcomes

Precedence:

### Invalid

```text
V15N_D6_D2_D3_D3_D3_IMPLEMENTATION_OR_PROVENANCE_INVALID
```

### Insufficient support

```text
V15N_D6_D2_D3_D3_D3_INSUFFICIENT_EVENT_SUPPORT
```

### Pass

```text
V15N_D6_D2_D3_D3_D3_CAUSAL_DN_EVENT_STREAM_DEMONSTRATED
```

### Fail

```text
V15N_D6_D2_D3_D3_D3_CAUSAL_DN_EVENT_STREAM_NOT_DEMONSTRATED
```

---

## 8. stop rule

After the first authoritative result do not change:

- cohorts/seeds;
- old-scalar context gate;
- DN model/threshold;
- refractory duration;
- evaluator matching window/algorithm;
- support floors;
- event-stream gates;
- outcome precedence.

If FAIL, perform attribution before any threshold/refractory tuning.

If PASS, the next separate experiment may test cumulative injury memory over this frozen event stream.

No POTION policy/deployment is evaluated here.

```text
POTION v15D
  DEPLOYED

v15N
  CLOSED / BLOCKED

v16C
  BLOCKED
```
