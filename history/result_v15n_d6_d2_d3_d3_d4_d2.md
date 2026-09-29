# result_v15n_d6_d2_d3_d3_d4_d2 — causal delayed TEMPORAL3 eventizer

## Status

```text
V15N_D6_D2_D3_D3_D4_D2_CAUSAL_DELAYED_EVENT_STREAM_NOT_DEMONSTRATED
```

Authoritative evidence:

```text
run            36514263944
head           45298bb59896472d65b06e2e091ac66c83bb7fa1
artifact       11011816687
artifact sha   sha256:59289ee82b5d8502074b38c58974dde25ac1d6568f5183d24d6209d87e1b1ab0
JSON sha256    53dce522441c32080a83339b91cff5a02c4eea24585662c2f9766d8320da9ab4
```

Frozen chain:

```text
design          8cae6ffffbf261f3ebd0849eb88edf15e87537f7
prereg          e138e292e90fd3c239ad2f69a7497e7c2cdefbdb
implementation  78b52d739a3c6f8a2d0cb1900c5a09602ff023d7
workflow        45298bb59896472d65b06e2e091ac66c83bb7fa1
```

Frozen runtime diagnostic:

```text
representation   PCA32_TEMPORAL3
threshold        0.5
temporal depth   3
eventizer        positive rising edge
refractory       10 steps / 200 ms
old-scalar gate  disabled
oracle window    disabled
```

Provenance and support passed.

## Prospective A

```text
tapes                         64
physical impacts            1725
neural events               2240
matched                     1293
false events                 947
missed impacts               432
precision               0.577232
recall                  0.749565
F1                      0.652207
event / impact ratio    1.298551
mean tape count MAE     8.046875
median latency             100 ms
p90 latency                140 ms
pre-hit false events <200   272
refractory suppressed         0
```

## Prospective B

```text
tapes                         64
physical impacts            1701
neural events               2215
matched                     1263
false events                 952
missed impacts               438
precision               0.570203
recall                  0.742504
F1                      0.645046
event / impact ratio    1.302175
mean tape count MAE     8.031250
median latency             100 ms
p90 latency                140 ms
pre-hit false events <200   278
refractory suppressed         0
```

## Gate result

Frozen gates:

```text
precision >= 0.75
recall >= 0.75
F1 >= 0.75
0.80 <= event/impact ratio <= 1.20
mean tape count MAE <= 5.0
```

Neither cohort passed.

The delayed TEMPORAL3 signal does produce many correctly timed events: matched-event median latency is 100 ms and p90 is 140 ms. However, the stream still over-emits heavily and recall is not stably above the frozen 0.75 gate.

The 200 ms refractory is not the blocker here: no rising edge was suppressed in either cohort.

About 29% of false events occur within 200 ms before a later physical impact. The remaining false events must be attributed rather than assumed to be background.

The next experiment must keep the exact frozen representation, threshold, temporal depth, and refractory. It should attribute:

1. unmatched neural events by PRE_HIT / RECENT_POST_HIT / BACKGROUND timing;
2. missed physical impacts by whether TEMPORAL3 never becomes positive in the post-hit window, is already positive before the hit so no new rising edge occurs, or has an emitted event that is lost only to evaluator matching.

No threshold or refractory tuning is justified yet.

## Deployment

```text
POTION v15D  DEPLOYED
v15N         CLOSED / BLOCKED
v16C         BLOCKED
```
