# design_v15n_d6_d2_d3_d3_d2_causal_200ms_delayed_max_observability

## Question

v15N-D6-D2-D3-D3-D1 froze:

```text
V15N_D6_D2_D3_D3_D1_LATE_WINDOW_RESCUE_DOMINANT
```

About 74% of first-frame misses became positive on the next causal neural frame inside the already established 200 ms hit window, with zero overlapping second-hit windows in both attribution cohorts.

D3-D3-D2 asks:

> Does a fixed 200 ms delayed max over the exact frozen D3-D3 DN score recover re-impact observability on entirely fresh cohorts while preserving LINGER and BACKGROUND rejection?

No new readout is trained. No threshold is tuned.

---

## 1. frozen score

Reconstruct exactly:

```text
D6 detector
old D2-D2 scalar context model
label-free DN innovation PCA32
context-balanced D3-D3 DN readout
DN threshold = 0.5
```

Required identities:

```text
D6 weights
  5dc677cf4c14e398465af72cbcff784e40163cdf702064359e7f4648319c9eb5

old scalar model
  ee36661675a1f6717d53d2f2af63797704d89194bf78d980f5d4415e3ee4f066

innovation PCA
  b187f3de9229e14260b8d1464e20fa3b8d26158a715a5372e4696c1bf3b7fb33

D3-D3 DN readout
  a341d9747a19bf4a3a0cb625eca5a4ff6a3dd071e1f641a4d8005cd18d21f496
```

---

## 2. fixed 200 ms window score

For a window with eligible conditional frames F:

```text
delayedMaxScore = max(DN_score(frame) for frame in F)
prediction = 1 iff delayedMaxScore >= 0.5
```

At most the existing neural frames inside:

```text
0 <= frameStep - windowStartStep < 10 simulation steps
```

are used.

No interpolation, smoothing, learned aggregation, score calibration, or threshold search.

This is a causal delayed diagnostic upper bound: at the end of the fixed window, all included neural frames are in the past. It is not yet a deployable eventizer because runtime does not receive oracle hit-window boundaries.

---

## 3. positive windows

For each physical hit that satisfies the exact D3-D3 conditional qualification:

- first eligible frame at/after hit and <100 ms;
- immediately preceding eligible frame old-scalar-positive;

define the positive window from the physical hit step through <200 ms.

Include every eligible frame in the window whose immediately preceding eligible frame is old-scalar-positive.

Exactly one positive window per qualifying hit.

---

## 4. negative windows

Start from the exact D3-D3 NEGATIVE_LINGER and NEGATIVE_BACKGROUND anchor rows.

For each negative anchor:

- windowStartStep = anchor frame step;
- require no physical hit in [windowStartStep, windowStartStep + 200 ms);
- include the anchor and later eligible frames within <200 ms whose immediately preceding eligible frame is old-scalar-positive;
- delayedMaxScore is the maximum frozen DN score over those frames.

Subtype is frozen from the anchor:

```text
LINGER
BACKGROUND
```

Negative windows with a physical hit inside the 200 ms window are excluded before scoring.

---

## 5. cohorts

TRAIN is used only to reconstruct the already-frozen representations/readout:

```text
4081000 4091000 4101000
interruption 4147000
```

Fresh PROSPECTIVE_A:

```text
4911000 4921000 4931000 4941000
4951000 4961000 4971000 4981000
interruption 4997000
```

Fresh PROSPECTIVE_B:

```text
5001000 5011000 5021000 5031000
5041000 5051000 5061000 5071000
interruption 5087000
```

64 tapes per prospective cohort.

---

## 6. metrics

Report per prospective cohort:

- positive windows;
- LINGER negative windows;
- BACKGROUND negative windows;
- positive recall;
- overall negative recall;
- LINGER negative recall;
- BACKGROUND negative recall;
- balanced accuracy;
- mean / median number of conditional frames per window;
- positive first-frame recall as a frozen baseline;
- delayed-max recall gain over first-frame recall.

---

## 7. scientific role

If delayed-max observability passes prospectively, the next separate experiment may construct a strictly causal event stream without oracle hit-window boundaries.

If delayed-max observability fails, the current frozen 5-frame PCA32 DN representation is not rescued by the D1 temporal-alignment finding alone.

No POTION policy or deployment is evaluated.
