# prereg_v15n_d6_d2_d3_d3_d3_d1 — event-stream failure attribution

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / OUTCOME**

Frozen prerequisite:

```text
v15N-D6-D2-D3-D3-D3
  V15N_D6_D2_D3_D3_D3_CAUSAL_DN_EVENT_STREAM_NOT_DEMONSTRATED

result
  bcd25402566876ef1375fc6b5f9106a164cf7ded

receipt
  0711484ce63b1ca9a66f6f7289b2812b0d19f9a4
```

Design:

```text
history/design_v15n_d6_d2_d3_d3_d3_d1_event_stream_failure_attribution.md
commit 6ca417aefde9052ed879dd9edba797d1755d9735
```

---

## 1. exact prerequisite

Require:

```text
D3-D3-D3 artifact
  10947295144

artifact digest
  sha256:c139ef3b61721c2a3704fddca8a0c644bfe8c0d8fee3e4d54b406681b0ac80df

D3-D3-D3 JSON sha256
  5d18c3bd453024f8281e20bc5c33921528b40c5f43f1cab8db6c7565e2db1247

D3-D3-D3 outcome
  V15N_D6_D2_D3_D3_D3_CAUSAL_DN_EVENT_STREAM_NOT_DEMONSTRATED

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

refractory
  10 steps
```

Any provenance/reconstruction failure:

```text
V15N_D6_D2_D3_D3_D3_D1_IMPLEMENTATION_OR_PROVENANCE_INVALID
```

---

## 2. cohorts

Use exact D3-D3-D3 cohorts:

```text
TRAIN
  4081000 4091000 4101000
  interruption 4147000

ATTRIBUTION_A
  5091000 5101000 5111000 5121000
  5131000 5141000 5151000 5161000
  interruption 5177000

ATTRIBUTION_B
  5181000 5191000 5201000 5211000
  5221000 5231000 5241000 5251000
  interruption 5267000
```

Exactly 64 tapes per cohort.

---

## 3. exact event-stream reproduction

Reproduce D3-D3-D3 exactly:

```text
contextEligible = previous eligible frame oldScalarPositive
candidate = contextEligible && frozenDnScore >= 0.5
emit if candidate and frameStep-lastEmittedEventStep >= 10
```

Reproduce exact evaluator one-to-one matching.

Require aggregate D3-D3-D3 metrics for both cohorts to reproduce to absolute tolerance 1e-12 before attribution.

---

## 4. unmatched event categories

Each unmatched emitted event is exactly one:

```text
PRE_HIT_200MS
RECENT_POST_HIT_200MS
BACKGROUND_200MS
```

Precedence and boundaries are frozen exactly as in the design.

Report overlap case count where both a previous and future physical hit are <200 ms away; category remains PRE_HIT_200MS.

---

## 5. unmatched hit categories

Each unmatched physical hit is exactly one:

```text
MATCH_CONFLICT
REFRACTORY_SUPPRESSION
NO_CANDIDATE_WINDOW
OTHER_UNMATCHED
```

Precedence is frozen exactly as in the design.

Candidate definition and refractory rule are unchanged.

---

## 6. support

For each cohort require:

```text
64 tapes
unmatched neural events >= 500
unmatched physical hits >= 300
```

Otherwise:

```text
V15N_D6_D2_D3_D3_D3_D1_INSUFFICIENT_FAILURE_SUPPORT
```

---

## 7. diagnostic dominance labels

False-event axis:

```text
PRE_HIT_DOMINANT if PRE_HIT_200MS >= 0.50 in both cohorts
POST_HIT_DOMINANT if RECENT_POST_HIT_200MS >= 0.50 in both cohorts
BACKGROUND_DOMINANT if BACKGROUND_200MS >= 0.50 in both cohorts
MIXED_FALSE_EVENT otherwise
```

Miss axis:

```text
NO_CANDIDATE_DOMINANT if NO_CANDIDATE_WINDOW >= 0.60 in both cohorts
REFRACTORY_DOMINANT if REFRACTORY_SUPPRESSION >= 0.60 in both cohorts
MATCH_CONFLICT_DOMINANT if MATCH_CONFLICT >= 0.60 in both cohorts
MIXED_MISS otherwise
```

---

## 8. preregistered outcomes

Precedence:

### Invalid

```text
V15N_D6_D2_D3_D3_D3_D1_IMPLEMENTATION_OR_PROVENANCE_INVALID
```

### Insufficient support

```text
V15N_D6_D2_D3_D3_D3_D1_INSUFFICIENT_FAILURE_SUPPORT
```

### Valid attribution

```text
V15N_D6_D2_D3_D3_D3_D1_EVENT_STREAM_FAILURE_ATTRIBUTED
```

The false-event and miss axes are reported as separate frozen labels and determine the next experiment.

---

## 9. stop rule

After the first authoritative result do not change:

- cohorts/seeds;
- frozen model identities;
- DN threshold;
- refractory interval;
- matching rule/window;
- unmatched-event categories/precedence;
- unmatched-hit categories/precedence;
- support floors;
- dominance thresholds.

No threshold/refractory tuning, replacement eventizer, cumulative injury model, POTION policy, or deployment is evaluated.

```text
POTION v15D
  DEPLOYED

v15N
  CLOSED / BLOCKED

v16C
  BLOCKED
```
