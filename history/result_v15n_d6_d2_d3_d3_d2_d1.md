# result_v15n_d6_d2_d3_d3_d2_d1 — background window fate attribution

## Status

```text
V15N_D6_D2_D3_D3_D2_D1_BACKGROUND_IS_NEAR_FUTURE_HIT_DOMINANT
```

Authoritative evidence:

```text
run
  36348614888

head
  a655612ef531e22db4808534dbad0336773cd1e1

artifact
  10942941071

artifact digest
  sha256:5a446f379f3322fc6f316d3111681ffee26b27ec985e7cc5212494b95020e7cd

v15n_d6_d2_d3_d3_d2_d1.json sha256
  da79868d2866bd13f8d6e5b8b34597436979d742fa70a27f7b3ca711621190d6
```

Preregistration:

```text
24a425cd4a3af8f078545fee723a64ef96ba8dfb
```

Implementation/workflow:

```text
dd71c442361c678c73c706328cb04e616ca0de41
a655612ef531e22db4808534dbad0336773cd1e1
```

## 1. support

```text
ATTRIBUTION_A
  tapes                    64
  raw BACKGROUND anchors  608
  support                  PASS

ATTRIBUTION_B
  tapes                    64
  raw BACKGROUND anchors  615
  support                  PASS
```

## 2. BACKGROUND anchor fate

```text
ATTRIBUTION_A
  HIT_FREE_200MS                 3   ( 0.49%)
  HIT_WITHIN_0_100MS          171   (28.13%)
  HIT_WITHIN_100_200MS        434   (71.38%)
  any future hit <200ms       605   (99.51%)

ATTRIBUTION_B
  HIT_FREE_200MS                15  ( 2.44%)
  HIT_WITHIN_0_100MS           162  (26.34%)
  HIT_WITHIN_100_200MS         438  (71.22%)
  any future hit <200ms        600  (97.56%)
```

The preregistered >=0.90 future-hit dominance gate passes independently in both cohorts.

Median future-hit age is 100 ms in both cohorts.

## 3. frozen DN timing among future-hit anchors

```text
ATTRIBUTION_A
  PRE_HIT_POSITIVE                 58  ( 9.59%)
  POST_HIT_OR_SAME_STEP_POSITIVE 112  (18.51%)
  NO_DN_POSITIVE_200MS            435  (71.90%)

ATTRIBUTION_B
  PRE_HIT_POSITIVE                 44  ( 7.33%)
  POST_HIT_OR_SAME_STEP_POSITIVE 121  (20.17%)
  NO_DN_POSITIVE_200MS            435  (72.50%)
```

Timing label:

```text
MIXED_OR_SILENT
```

Median signed first-DN-positive minus physical-hit latency is 0 ms when both exist.

## 4. interpretation

The D3-D3-D2 BACKGROUND support collapse is structural, not a simple shortage of tapes.

The D3-D3 BACKGROUND label means that the anchor itself has no recent hit. It does **not** mean that the following 200 ms is physically hit-free. In these cohorts, almost every such anchor is followed by an actual physical hit within the exact delayed-max window.

Therefore treating a raw BACKGROUND anchor plus its entire future 200 ms as a negative delayed-max window creates a label/window conflict. Blindly adding tapes would preserve the same conflict rather than solve it.

The next experiment should stop evaluating oracle-bounded positive/negative windows and instead evaluate a causal event stream directly:

- consume only past/current frozen neural evidence;
- use the frozen old-scalar context gate and frozen D3-D3 DN score;
- emit neural events without physical-hit window boundaries;
- match emitted events one-to-one against physical hits only in the evaluator.

That experiment remains diagnostic/nondeployable because the frozen score stack itself was trained with evaluator labels.

## 5. deployment

```text
POTION v15D
  DEPLOYED

v15N
  CLOSED / BLOCKED

D3-D3-D2 delayed-max window formulation
  CLOSED AS STRUCTURALLY CONFOUNDED FOR BACKGROUND SUPPORT

v16C
  BLOCKED
```
