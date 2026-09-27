# prereg_v15n_d6_d2_d3_d3_d2 — causal 200ms delayed-max observability

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / OUTCOME**

Frozen prerequisite:

```text
v15N-D6-D2-D3-D3-D1
  V15N_D6_D2_D3_D3_D1_LATE_WINDOW_RESCUE_DOMINANT

result
  f0a2b748f53d7b640a56254359cdb0bd27ec4c01

receipt
  a7979c26968690be06920d2f353892e0624c5c88
```

Design:

```text
history/design_v15n_d6_d2_d3_d3_d2_causal_200ms_delayed_max_observability.md
commit 8b4c733c7c570686a716ac789c0bb6c93d2418a5
```

---

## 1. exact prerequisite

Require:

```text
D3-D3-D1 artifact
  10939890187

artifact digest
  sha256:1c3b32cf3266299401d2326ffd7874428e1bdefb50607d74c7d1c3e8855fcd36

v15n_d6_d2_d3_d3_d1.json sha256
  bbc1aac5878949a118fe8c4ea51117695dd2cdea040461c9e4de358fbfdaf57b

D3-D3-D1 outcome
  V15N_D6_D2_D3_D3_D1_LATE_WINDOW_RESCUE_DOMINANT

D3-D3 DN model
  a341d9747a19bf4a3a0cb625eca5a4ff6a3dd071e1f641a4d8005cd18d21f496

old scalar model
  ee36661675a1f6717d53d2f2af63797704d89194bf78d980f5d4415e3ee4f066

innovation PCA
  b187f3de9229e14260b8d1464e20fa3b8d26158a715a5372e4696c1bf3b7fb33
```

Any provenance or deterministic reconstruction failure:

```text
V15N_D6_D2_D3_D3_D2_IMPLEMENTATION_OR_PROVENANCE_INVALID
```

---

## 2. cohorts

TRAIN only:

```text
4081000 4091000 4101000
interruption 4147000
```

PROSPECTIVE_A:

```text
4911000 4921000 4931000 4941000
4951000 4961000 4971000 4981000
interruption 4997000
```

PROSPECTIVE_B:

```text
5001000 5011000 5021000 5031000
5041000 5051000 5061000 5071000
interruption 5087000
```

Exactly 64 tapes per prospective cohort.

---

## 3. frozen delayed-max detector

Frozen DN score threshold:

```text
0.5
```

For every positive or negative window:

```text
delayedMaxScore = maximum frozen DN score
over eligible conditional frames with
0 <= frameStep - windowStartStep < 10 simulation steps

prediction = 1 iff delayedMaxScore >= 0.5
```

No model fitting on prospective data.
No threshold search.
No interpolation or smoothing.

---

## 4. positive windows

Positive windows reproduce exact D3-D3 qualifying-hit criteria.

Exactly one window per qualifying physical hit.

Window start:

```text
physical hit step
```

Include eligible frames in the 200 ms window only when their immediately preceding eligible frame is old-scalar-positive.

---

## 5. negative windows

Anchors reproduce exact D3-D3 negative rows.

For each anchor:

```text
windowStartStep = anchor frame step
```

Exclude the window if any physical hit occurs within the 200 ms window.

Otherwise include anchor/later eligible conditional frames inside the same window.

Frozen subtype:

```text
LINGER
BACKGROUND
```

---

## 6. support gates

For each prospective cohort require:

```text
64 tapes
positive windows >= 1000
LINGER negative windows >= 1500
BACKGROUND negative windows >= 500
```

Otherwise:

```text
V15N_D6_D2_D3_D3_D2_INSUFFICIENT_DELAYED_MAX_SUPPORT
```

---

## 7. observability gates

All must be >= 0.75 on both prospective cohorts:

```text
balanced accuracy
positive recall
overall negative recall
LINGER negative recall
BACKGROUND negative recall
```

First-frame recall and delayed-max recall gain are descriptive only.

---

## 8. preregistered outcomes

Precedence:

### Invalid

```text
V15N_D6_D2_D3_D3_D2_IMPLEMENTATION_OR_PROVENANCE_INVALID
```

### Insufficient support

```text
V15N_D6_D2_D3_D3_D2_INSUFFICIENT_DELAYED_MAX_SUPPORT
```

### Pass

```text
V15N_D6_D2_D3_D3_D2_CAUSAL_DELAYED_MAX_OBSERVABLE
```

### Fail

```text
V15N_D6_D2_D3_D3_D2_CAUSAL_DELAYED_MAX_NOT_DEMONSTRATED
```

---

## 9. stop rule

After the first authoritative result do not change:

- cohorts/seeds;
- window duration;
- conditional context;
- positive/negative anchor definitions;
- frozen DN model;
- threshold 0.5;
- support floors;
- observability gates;
- outcome precedence.

No eventizer, cumulative injury accumulator, POTION policy, or deployment is evaluated in D2.

```text
POTION v15D
  DEPLOYED

v15N
  CLOSED / BLOCKED

v16C
  BLOCKED
```
