# design_v15n_d6_d2_d3_d3_d2_d1_background_window_fate_attribution

## Question

v15N-D6-D2-D3-D3-D2 froze:

```text
V15N_D6_D2_D3_D3_D2_INSUFFICIENT_DELAYED_MAX_SUPPORT
```

The decisive support failure was not positive-window support. It was the collapse of hit-free BACKGROUND windows after applying the frozen 200 ms delayed-max window.

D2-D1 asks:

> What happens to raw D3-D3 BACKGROUND anchors during the next 200 ms, and when does the exact frozen DN score cross threshold relative to any upcoming physical hit?

No classifier, eventizer, threshold, representation, or policy is changed.

---

## 1. frozen prerequisite

Use exact D2 cohorts and exact frozen D3-D3 score stack.

Required D2 evidence:

```text
run
  36342783894

artifact
  10939579823

artifact digest
  sha256:102a5308585a923f0134fb26cc202038fa6c553072969a4e08a393561bafd1d3

v15n_d6_d2_d3_d3_d2.json sha256
  5273efaf28c24415ae3372f9a9380f2821ba0de017bc57bf8e9baf0daa5fd1da

outcome
  V15N_D6_D2_D3_D3_D2_INSUFFICIENT_DELAYED_MAX_SUPPORT
```

Frozen DN threshold:

```text
0.5
```

---

## 2. cohorts

Reconstruct TRAIN only for frozen model identity.

```text
TRAIN
  4081000 4091000 4101000
  interruption 4147000

ATTRIBUTION_A
  4911000 4921000 4931000 4941000
  4951000 4961000 4971000 4981000
  interruption 4997000

ATTRIBUTION_B
  5001000 5011000 5021000 5031000
  5041000 5051000 5061000 5071000
  interruption 5087000
```

This is failure attribution on the already-frozen D2 cohorts, not a new generalization claim.

---

## 3. raw BACKGROUND anchors

Generate exact D3-D3 negative rows.

Select only:

```text
y = 0
negativeKind = BACKGROUND
```

No future-hit exclusion is applied at anchor selection.

---

## 4. anchor fate categories

For each raw BACKGROUND anchor, inspect physical hits in:

```text
[anchorStep, anchorStep + 10 simulation steps)
```

Exactly one fate:

```text
HIT_FREE_200MS
HIT_WITHIN_0_100MS
HIT_WITHIN_100_200MS
```

Boundary:

- first future hit age <5 steps => HIT_WITHIN_0_100MS;
- 5 <= age <10 steps => HIT_WITHIN_100_200MS;
- no hit before 10 steps => HIT_FREE_200MS.

---

## 5. frozen DN timing relative to future hit

For every anchor, compute frozen DN-positive frames inside the same 200 ms window using the exact D2 conditional-frame rule.

For anchors with a future hit, report:

- any DN positive strictly before the first future hit;
- any DN positive at or after the first future hit within the 200 ms window;
- first DN-positive age from anchor;
- first future-hit age from anchor;
- signed latency: firstDNPositiveStep - firstFutureHitStep when both exist.

Timing categories for future-hit anchors:

```text
PRE_HIT_POSITIVE
POST_HIT_OR_SAME_STEP_POSITIVE
NO_DN_POSITIVE_200MS
```

If DN is positive both before and after the hit, classify PRE_HIT_POSITIVE because it crossed threshold before physical contact.

---

## 6. support

For each attribution cohort require:

```text
64 tapes
raw BACKGROUND anchors >= 500
```

Otherwise attribution is insufficient.

---

## 7. interpretation

Primary quantity:

```text
futureHitWithin200msFraction
  = (HIT_WITHIN_0_100MS + HIT_WITHIN_100_200MS) / raw BACKGROUND anchors
```

Preregistered descriptive dominance threshold:

```text
FUTURE_HIT_DOMINANT if fraction >= 0.90 in both cohorts
HIT_FREE_DOMINANT if HIT_FREE_200MS fraction >= 0.60 in both cohorts
otherwise MIXED
```

Secondary timing attribution among future-hit anchors:

```text
PRE_HIT_DN_DOMINANT
  PRE_HIT_POSITIVE fraction >= 0.60 in both cohorts

POST_HIT_DN_DOMINANT
  POST_HIT_OR_SAME_STEP_POSITIVE fraction >= 0.60 in both cohorts

otherwise MIXED_OR_SILENT
```

These timing categories do not alter the primary outcome precedence.

---

## 8. scientific role

If FUTURE_HIT_DOMINANT, the D2 BACKGROUND support problem is structural: the D3-D3 BACKGROUND anchor definition is usually a near-future-impact state when expanded into a 200 ms window. Blindly increasing tape count is not justified.

If HIT_FREE_DOMINANT, the prior support failure is unexpected and requires implementation/provenance review.

If MIXED, a redesigned negative-window sampling rule may need a separate preregistration.

No deployment is authorized.
