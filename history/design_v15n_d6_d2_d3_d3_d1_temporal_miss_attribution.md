# design_v15n_d6_d2_d3_d3_d1_temporal_miss_attribution

## Question

v15N-D6-D2-D3-D3 froze:

```text
V15N_D6_D2_D3_D3_CONDITIONAL_REIMPACT_NOT_DEMONSTRATED
```

The frozen context-balanced DN_INNOVATION_PCA32 readout strongly rejected LINGER/BACKGROUND but recalled only ~38% of qualifying re-impact first frames.

D3-D3-D1 is failure attribution only.

It asks:

> For physical re-impacts missed on the preregistered first conditional frame, does the exact frozen DN readout become positive later inside the already-defined 200 ms physical-hit window, does the old-scalar conditional context disappear, or is there no positive DN prediction anywhere in the available conditional window?

No model, threshold, feature, PCA, eventizer, or POTION policy is changed.

---

## 1. frozen prerequisite

Exact D3-D3 evidence:

```text
run
  36292221753

artifact
  10922928955

artifact digest
  sha256:68cf420e639aeb1fd53e8dd0ed809b0713db5aa7c77e9434fcdc7d811d3075dd

v15n_d6_d2_d3_d3.json sha256
  6d5164df93e621b497e716235b799b0a2604ef4ed8b582ac6750a4b4b3ed62c8

outcome
  V15N_D6_D2_D3_D3_CONDITIONAL_REIMPACT_NOT_DEMONSTRATED
```

Frozen identities:

```text
D6 weights
  5dc677cf4c14e398465af72cbcff784e40163cdf702064359e7f4648319c9eb5

old scalar model
  ee36661675a1f6717d53d2f2af63797704d89194bf78d980f5d4415e3ee4f066

innovation PCA
  b187f3de9229e14260b8d1464e20fa3b8d26158a715a5372e4696c1bf3b7fb33

D3-D3 DN readout
  a341d9747a19bf4a3a0cb625eca5a4ff6a3dd071e1f641a4d8005cd18d21f496

threshold
  0.5
```

---

## 2. cohorts

Use the exact D3-D3 cohorts.

TRAIN is used only to deterministically reconstruct the frozen representations/readout:

```text
4081000 4091000 4101000
interruption 4147000
```

Attribution cohorts:

```text
PROSPECTIVE_A
  4731000 4741000 4751000 4761000
  4771000 4781000 4791000 4801000
interruption 4817000

PROSPECTIVE_B
  4821000 4831000 4841000 4851000
  4861000 4871000 4881000 4891000
interruption 4907000
```

This is descriptive attribution of an already-frozen failure; no new HOLDOUT is introduced.

---

## 3. qualifying physical hits

Reproduce D3-D3 POSITIVE_REIMPACT qualification exactly:

- first eligible neural frame at/after a physical hit and <100 ms after it;
- immediately preceding eligible frame is positive under the frozen old scalar model.

The original D3-D3 first-frame DN prediction is reproduced exactly.

---

## 4. missed-hit categories

For each qualifying physical hit:

### FIRST_FRAME_RECALLED

The original first conditional frame has frozen DN score >= 0.5.

### LATE_WINDOW_RESCUE

The first conditional frame has DN score <0.5, and at least one later eligible frame satisfying the same previous-old-scalar-positive condition inside:

```text
0 <= frameStep - hitStep < 10 simulation steps
```

has DN score >=0.5.

### CONTEXT_DROPOUT

The first conditional frame has DN score <0.5, and there is no later eligible frame inside the 200 ms window satisfying the previous-old-scalar-positive condition.

### WINDOW_MISS

The first conditional frame has DN score <0.5, at least one later conditional frame exists inside the 200 ms window, and every available conditional DN score remains <0.5.

Every qualifying hit belongs to exactly one category.

---

## 5. additional frozen diagnostics

For original first-frame misses report:

- number of available conditional frames in the 200 ms window;
- maximum frozen DN score in the available conditional window;
- age in ms of the maximum score;
- age in ms of the first later positive prediction, when present;
- fraction with any later positive prediction;
- descriptive window-level recall: FIRST_FRAME_RECALLED + LATE_WINDOW_RESCUE over all qualifying hits.

No threshold search is permitted.

Also reproduce the original per-frame D3-D3 LINGER/BACKGROUND negative recalls exactly. These are not re-gated in D1; they verify frozen-readout reproduction.

---

## 6. scientific role

D3-D3-D1 does not propose a replacement eventizer.

Interpretation:

- LATE_WINDOW_RESCUE dominant: first-frame temporal alignment is the principal blocker; a separately preregistered causal temporal aggregation experiment may be justified.
- CONTEXT_DROPOUT dominant: the old-scalar conditional gate itself is structurally removing post-hit evidence.
- WINDOW_MISS dominant: the frozen 5-frame PCA32 innovation readout generally lacks a positive signal throughout the available 200 ms conditional window.
- mixed: no single mechanism dominates.

No outcome authorizes deployment.
