# result_v15n_d6_d2_d3_d3_d3_d1_d1 — gate component and score separability

## Status

```text
V15N_D6_D2_D3_D3_D3_D1_D1_COMPONENT_AND_SCORE_ATTRIBUTED
```

Frozen diagnostic axes:

```text
missComponentAxis       = DN_SUBTHRESHOLD_DOMINANT
scoreSeparabilityLabels = NO_SINGLE_SCORE_SEPARABILITY
```

Authoritative evidence:

```text
run
  36470915285

head
  f8c6aa860d7a259a96410e809aac706595c3bd58

artifact
  10993630636

artifact digest
  sha256:d5e74ac8f50cd44087dbd947ab72f5309706546a25d3906c0b4212e841108f08

v15n_d6_d2_d3_d3_d3_d1_d1.json sha256
  778ef1d800af2a6f8e14e3f86ded08ad91ee571b6ba60257da714f914daef3f0
```

Preregistration:

```text
c9eef1e76433c6058c2ee0c65c604eb45f0c98e6
```

Implementation/workflow:

```text
39d74c82a52a717cea6efaef9d558772aed8c563
f8c6aa860d7a259a96410e809aac706595c3bd58
```

## 1. support

```text
ATTRIBUTION_A
  NO_CANDIDATE hits          394
  matched events            1260
  BACKGROUND false events    729
  support                    PASS

ATTRIBUTION_B
  NO_CANDIDATE hits          416
  matched events            1285
  BACKGROUND false events    725
  support                    PASS
```

## 2. NO_CANDIDATE component decomposition

```text
ATTRIBUTION_A
  CONTEXT_ABSENT                       120  (30.46%)
  DN_SUBTHRESHOLD_UNDER_CONTEXT        274  (69.54%)

ATTRIBUTION_B
  CONTEXT_ABSENT                       110  (26.44%)
  DN_SUBTHRESHOLD_UNDER_CONTEXT        306  (73.56%)
```

Therefore:

```text
missComponentAxis = DN_SUBTHRESHOLD_DOMINANT
```

The dominant missed-hit failure remains inside frames where the old-scalar context is already available: the frozen DN score simply remains below 0.5.

Descriptive score levels for NO_CANDIDATE hits:

```text
A median maximum DN score overall       0.496381
A median maximum DN score under context 0.435775

B median maximum DN score overall       0.485852
B median maximum DN score under context 0.436417
```

## 3. old-scalar context also removes some usable DN evidence

Among CONTEXT_ABSENT misses:

```text
A DN_POSITIVE_WITHOUT_CONTEXT  111 / 120 = 92.50%
B DN_POSITIVE_WITHOUT_CONTEXT   97 / 110 = 88.18%
```

Thus the old-scalar gate is a secondary sensitivity bottleneck: when context is absent, DN-positive evidence usually exists elsewhere in the same post-hit 200 ms window.

However this affects only about 26–30% of NO_CANDIDATE misses; it is not the dominant miss component.

## 4. matched-event vs true-BACKGROUND false-event score separability

### Frozen DN score

```text
ATTRIBUTION_A
  matched median       0.645734
  background median    0.595145
  AUC                  0.598101

ATTRIBUTION_B
  matched median       0.636828
  background median    0.594288
  AUC                  0.604018
```

### Previous old-scalar score

```text
ATTRIBUTION_A
  matched median       0.749765
  background median    0.883440
  AUC matched-higher   0.380324

ATTRIBUTION_B
  matched median       0.758162
  background median    0.888961
  AUC matched-higher   0.369755
```

Neither score reaches the preregistered AUC >= 0.70 criterion on either cohort.

Therefore:

```text
scoreSeparabilityLabels = NO_SINGLE_SCORE_SEPARABILITY
```

The old-scalar score is actually higher on average for BACKGROUND false events than for matched events, so simply increasing that gate would move in the wrong direction.

## 5. interpretation

The current failed causal eventizer cannot be repaired scientifically by simple scalar threshold tuning.

Two facts hold simultaneously:

1. most missed hits have old-scalar context available but the current 5-frame PCA32 DN readout stays subthreshold;
2. current DN score magnitude does not cleanly distinguish matched events from true BACKGROUND false events.

The old-scalar binary gate additionally suppresses usable DN-positive evidence in a smaller but substantial subset of misses.

The appropriate next step is therefore representation-level rather than threshold-level:

- keep the frozen MaleCNS representation pipeline;
- remove old-scalar gating from the new diagnostic representation;
- preserve temporal shape instead of collapsing each frame to one current innovation vector;
- compare the current PCA32 innovation against a causal multi-frame PCA32 temporal-shape representation under identical realized-impact / pre-hit / true-background labels on fresh cohorts.

No threshold/refractory retuning is justified by D1-D1.

## 6. deployment

```text
POTION v15D
  DEPLOYED

v15N
  CLOSED / BLOCKED

D3-D3-D3 scalar-threshold repair
  NOT JUSTIFIED

v16C
  BLOCKED
```
