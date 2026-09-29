# result_v15n_d6_d2_d3_d3_d4_d2_d1_d1 — TEMPORAL3 scalar separability audit

## Status

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_TEMPORAL3_SCALAR_SEPARABILITY_AUDITED
```

Frozen scalar axis:

```text
PRECISION_RECALL_TRADEOFF
```

Authoritative evidence:

```text
run            36530978516
head           79e2b1d20926e27db6eb846216f9a870403a0ee8
artifact       11018846070
artifact sha   sha256:98dcd5d0d2a8e86c9fc46ed318a07405ecc91cacdbc03f72226ba39f63d732aa
JSON sha256    8e100496082be0c38bf66f24b1b0fdfe5e0115486831e7c38fa094a12a404fc9
```

Frozen chain:

```text
design          0c720cd536689c92120688b12f8473ca4543f470
prereg          e89f76d1980ad50e448a421ac9fbba3207cf124c
implementation  f19e7a00c4673461b31afc8e207c3d33ecb3ee95
workflow        79e2b1d20926e27db6eb846216f9a870403a0ee8
```

The exact D4-D2 threshold-0.5 metrics reproduced before the audit. Support passed:

```text
A: 64 tapes, 1725 physical impacts
B: 64 tapes, 1701 physical impacts
```

## Audit result

No preregistered threshold in the frozen grid

```text
0.10, 0.15, ..., 0.90
```

passed the original D4-D2 event-stream gates on both cohorts.

```text
commonPassingThresholds = []
```

The key scalar-separability summaries are:

```text
best recall with precision >= 0.75
  A = 0.5831884058
  B = 0.5873015873

best precision with recall >= 0.75
  A = unavailable
  B = unavailable
```

Therefore the frozen TEMPORAL3 scalar has a replicated precision/recall tradeoff.

## Representative operating points

```text
threshold 0.50
  A precision 0.5772, recall 0.7496, ratio 1.2986, MAE 8.0469
  B precision 0.5702, recall 0.7425, ratio 1.3022, MAE 8.0313

threshold 0.55
  A precision 0.6656, recall 0.7177, ratio 1.0783, MAE 2.9844
  B precision 0.6607, recall 0.7155, ratio 1.0829, MAE 3.1719

threshold 0.60
  A precision 0.7378, recall 0.6510, ratio 0.8823, MAE 3.6719
  B precision 0.7358, recall 0.6631, ratio 0.9012, MAE 3.5313

threshold 0.65
  A precision 0.7971, recall 0.5832
  B precision 0.7866, recall 0.5873
```

The tradeoff is not a narrow threshold-grid artifact: increasing the threshold suppresses background events, but recall collapses before precision reaches the required level.

The 10-step refractory suppressed zero rising edges throughout the audited grid, so refractory tuning remains unsupported.

## Interpretation

D4-D2-D1 already established:

```text
falseEventAxis = BACKGROUND_DOMINANT
missAxis       = NO_POSITIVE_DOMINANT
```

This audit now shows that those two failures cannot be jointly repaired by changing only the threshold on the same one-dimensional TEMPORAL3 scalar.

Therefore:

- threshold search stops;
- runtime threshold remains 0.5;
- no audited threshold is deployable;
- eventizer/refractory tuning remains unjustified;
- the next experiment must change the representation/readout structure rather than move the scalar operating point.

The next representation experiment must be separately designed and preregistered and must not reuse these audit cohorts for a new generalization claim.

## Deployment

```text
POTION v15D  DEPLOYED
v15N         CLOSED / BLOCKED
v16C         BLOCKED
```
