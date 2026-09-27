# prereg_v15n_d6_d2_d3_d3_d1 — temporal miss attribution

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / OUTCOME**

Frozen prerequisite:

```text
v15N-D6-D2-D3-D3
  V15N_D6_D2_D3_D3_CONDITIONAL_REIMPACT_NOT_DEMONSTRATED

result
  ecac7ef4f68c22d1f23a2d112ce39cef79f1b49b

receipt
  bf81a3ed024dff7e8fbb81aa5eb5d6e3660f23ae
```

Design:

```text
history/design_v15n_d6_d2_d3_d3_d1_temporal_miss_attribution.md
commit e0944fcaccb0bc674c1feffb7fa477596fb15ca3
```

---

## 1. exact prerequisite

Require:

```text
D3-D3 artifact
  10922928955

artifact digest
  sha256:68cf420e639aeb1fd53e8dd0ed809b0713db5aa7c77e9434fcdc7d811d3075dd

v15n_d6_d2_d3_d3.json sha256
  6d5164df93e621b497e716235b799b0a2604ef4ed8b582ac6750a4b4b3ed62c8

D3-D3 outcome
  V15N_D6_D2_D3_D3_CONDITIONAL_REIMPACT_NOT_DEMONSTRATED

D3-D3 DN model sha256
  a341d9747a19bf4a3a0cb625eca5a4ff6a3dd071e1f641a4d8005cd18d21f496

old scalar model sha256
  ee36661675a1f6717d53d2f2af63797704d89194bf78d980f5d4415e3ee4f066

innovation PCA sha256
  b187f3de9229e14260b8d1464e20fa3b8d26158a715a5372e4696c1bf3b7fb33
```

Any provenance/reproduction failure:

```text
V15N_D6_D2_D3_D3_D1_IMPLEMENTATION_OR_PROVENANCE_INVALID
```

---

## 2. cohorts

Use exact D3-D3 cohorts:

```text
TRAIN
  4081000 4091000 4101000
  interruption 4147000

PROSPECTIVE_A
  4731000 4741000 4751000 4761000
  4771000 4781000 4791000 4801000
  interruption 4817000

PROSPECTIVE_B
  4821000 4831000 4841000 4851000
  4861000 4871000 4881000 4891000
  interruption 4907000
```

64 tapes per prospective cohort.

---

## 3. frozen reconstruction

Reconstruct exactly:

- D6 detector;
- old D2-D2 scalar model;
- label-free innovation PCA32;
- context-balanced D3-D3 DN readout;
- threshold 0.5;
- D3-D3 qualifying labels and per-frame prospective metrics.

Require D3-D3 prospective DN metrics to reproduce to absolute tolerance 1e-12 before attribution.

---

## 4. missed-hit categories

Each D3-D3 qualifying physical hit is exactly one of:

```text
FIRST_FRAME_RECALLED
LATE_WINDOW_RESCUE
CONTEXT_DROPOUT
WINDOW_MISS
```

Definitions are frozen exactly as in the design.

The temporal window is the already established:

```text
0 <= frameStep - hitStep < 10 simulation steps
```

No threshold search or score calibration.

---

## 5. support gates

For PROSPECTIVE_A and PROSPECTIVE_B separately require:

```text
64 tapes
qualifying physical hits >= 1000
original first-frame misses >= 700
```

Otherwise:

```text
V15N_D6_D2_D3_D3_D1_INSUFFICIENT_MISS_SUPPORT
```

---

## 6. dominance gates

Fractions are among original first-frame misses only.

```text
lateWindowRescueDominated
  LATE_WINDOW_RESCUE fraction >= 0.60
  in both prospective cohorts

contextDropoutDominated
  CONTEXT_DROPOUT fraction >= 0.60
  in both prospective cohorts

windowMissDominated
  WINDOW_MISS fraction >= 0.60
  in both prospective cohorts
```

Also report descriptive window-level recall:

```text
(FIRST_FRAME_RECALLED + LATE_WINDOW_RESCUE) / qualifying hits
```

This descriptive recall is not itself an outcome gate.

---

## 7. preregistered outcomes

Precedence:

### Invalid

```text
V15N_D6_D2_D3_D3_D1_IMPLEMENTATION_OR_PROVENANCE_INVALID
```

### Insufficient support

```text
V15N_D6_D2_D3_D3_D1_INSUFFICIENT_MISS_SUPPORT
```

### Late-window rescue dominant

```text
V15N_D6_D2_D3_D3_D1_LATE_WINDOW_RESCUE_DOMINANT
```

### Context dropout dominant

```text
V15N_D6_D2_D3_D3_D1_CONTEXT_DROPOUT_DOMINANT
```

### Window miss dominant

```text
V15N_D6_D2_D3_D3_D1_WINDOW_MISS_DOMINANT
```

### Otherwise

```text
V15N_D6_D2_D3_D3_D1_MIXED_TEMPORAL_FAILURE
```

---

## 8. stop rule

After the first authoritative result do not change:

- cohorts/seeds;
- qualifying-hit definition;
- frozen D3-D3 model/PCA/scalar context;
- threshold 0.5;
- 200 ms attribution window;
- category definitions;
- support gates;
- 0.60 dominance gates;
- outcome precedence.

No replacement eventizer, new readout, cumulative-injury model, or POTION policy is evaluated in D1.

```text
POTION v15D
  DEPLOYED

v15N
  CLOSED / BLOCKED

v16C
  BLOCKED
```
