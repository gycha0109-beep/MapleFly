# result_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_d1_d1_d1 — DYNAMICS6 history utility attribution

## Status

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_DYNAMICS6_HISTORY_UTILITY_ATTRIBUTED
```

Frozen axis:

```text
historyUtilityAxis = HISTORY_NEGLIGIBLE
```

Authoritative evidence:

```text
run            36787883448
head           c75b5980d4949ab9626db6a1b8e130875ec3087a
artifact       11132717991
artifact sha   sha256:a00cd69befebcb81cc9d837f979f24820a152faf50fe5297a4e07f6cf5944cdb
JSON sha256    956605344594e575ee0bb4bb3c51a4c333e928f2a7f0071666d021d05a891302
```

Frozen chain:

```text
design          55d522309e7b8126e46c626c4b0ce0f576b1735c
prereg          5a407e9d0a8fb8889e8739f182bfa272347a9b4c
implementation  a7410d4a8c855da3ef7b5fb674e09c427aba5dd2
workflow        c75b5980d4949ab9626db6a1b8e130875ec3087a
```

Prerequisite reproduction passed exactly.

Frozen DYNAMICS6 model:

```text
c55667f336c004a2fe649a3019d77ca4cc08b2b3791b635ae977ce2bf5894e41
```

Frozen threshold:

```text
0.7026438754417108
```

## Support

```text
A: 64 tapes, 1694 impacts, 1311 matched, 1780 emitted — PASS
B: 64 tapes, 1724 impacts, 1294 matched, 1774 emitted — PASS
```

## Event-decision divergence

A:

```text
full events                 1780
current-only events         1802
shared exact-step events    1728
history-added events          52
history-removed events        74
symmetric difference         126
symmetric difference frac  0.035176
```

B:

```text
full events                 1774
current-only events         1781
shared exact-step events    1712
history-added events          62
history-removed events        69
symmetric difference         131
symmetric difference frac  0.036850
```

History changes only about 3.5–3.7% of the combined event-step decisions.

## History-added event quality

A:

```text
history-added matched   28
history-added false     24
history-added precision 0.538462
```

B:

```text
history-added matched   44
history-added false     18
history-added precision 0.709677
```

The history-induced additions are not consistently selective enough to support a useful event signal.

## Full versus current-only metrics

A current-only:

```text
precision  0.733074
recall     0.779811
F1         0.755721
event/hit  1.063754
count MAE  2.875000
```

Full minus current-only:

```text
precision  +0.003442
recall     -0.005903
F1         -0.000971
event/hit  -0.012987
count MAE  -0.156250
```

B current-only:

```text
precision  0.723189
recall     0.747100
F1         0.734950
event/hit  1.033063
count MAE  2.640625
```

Full minus current-only:

```text
precision  +0.006236
recall     +0.003480
F1         +0.004901
event/hit  -0.004060
count MAE  -0.078125
```

All precision and recall deltas remain below 0.01 in absolute magnitude on both cohorts.

## Contribution geometry

Matched events:

```text
A median history contribution            -0.000657
A median current contribution             0.541575
A median |history/current|                0.014836

B median history contribution             0.000300
B median current contribution             0.544533
B median |history/current|                0.015573
```

False events:

```text
A median history contribution            -0.001765
A median current contribution             0.454107
A median |history/current|                0.019248

B median history contribution            -0.001293
B median current contribution             0.454966
B median |history/current|                0.018820
```

Evaluator-only AUC of history contribution, matched positive vs false negative:

```text
A  0.528168
B  0.534982
```

This is near chance and does not indicate selective matched-event information in the fitted historical contribution.

## Interpretation

The six-frame scalar-margin history does not materially control event decisions.

The full DYNAMICS6 model and its current-only counterfactual differ at only about 3.5–3.7% of event steps, and full-model precision/recall differ by less than one percentage point from current-only on both cohorts.

The historical contribution is also tiny relative to the current-margin contribution and has near-chance evaluator-only AUC for matched versus false emitted events.

Therefore the previous temporal-history repair did not fail because its threshold was poorly selected. It failed because temporal structure had already been compressed away before DYNAMICS6 received the scalar margin.

The scalar-margin temporal-history direction is now exhausted.

The next representation repair should operate on the upstream PCA32 neural trajectory before the three-class scalar margin compression. It must use completely new TRAIN/CALIBRATION/prospective cohorts and must not reuse these attribution cohorts for fitting or threshold selection.

## Deployment

```text
modelRefit                  false
thresholdSearched           false
temporalDepthTuned          false
refractoryTuned             false
diagnosticStackDeployable   false

POTION v15D  DEPLOYED
v15N         CLOSED / BLOCKED
v16C         BLOCKED
```
