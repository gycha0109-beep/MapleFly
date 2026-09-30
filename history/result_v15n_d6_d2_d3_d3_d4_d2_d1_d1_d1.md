# result_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1 — THREE_CLASS_TEMPORAL3

## Status

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_THREE_CLASS_EVENT_STREAM_NOT_DEMONSTRATED
```

Authoritative evidence:

```text
run            36576316325
head           10924c03c63dcf23d6cf8dbe15a8796b08bce2f9
artifact       11040692357
artifact sha   sha256:316acd1aeb8fb08dadd2427182976661c6ef2f48f312cfd5b2ebce147188d28b
JSON sha256    cc1c5fb57b7363fe8e936d5a67854bb4ee754c2472e30071f89888643e9678b7
```

Frozen chain:

```text
design          c343748d952064741a46203bee7c22a6e4453fe0
prereg          1dcc276e934ad99432938179e9ec5c35096ecca8
implementation  0ec7e9b19ea39efd476a4e414b2c44e3d9473199
workflow        10924c03c63dcf23d6cf8dbe15a8796b08bce2f9
```

Three-class model SHA:

```text
cf9d38bbb697c1c2b98aa34f51c6ee39626c68763acbfb1c34e145eb738c7144
```

Support passed on both fresh prospective cohorts.

## Frame-level result

PROSPECTIVE_A:

```text
REALIZED_IMPACT recall   0.762515
PRE_HIT recall           0.470026
TRUE_BACKGROUND recall   0.728272
macro recall             0.653604

TRUE_BACKGROUND -> REALIZED_IMPACT
  2553 rows

PRE_HIT -> REALIZED_IMPACT
  475 rows
```

PROSPECTIVE_B:

```text
REALIZED_IMPACT recall   0.752755
PRE_HIT recall           0.477585
TRUE_BACKGROUND recall   0.726117
macro recall             0.652152

TRUE_BACKGROUND -> REALIZED_IMPACT
  2610 rows

PRE_HIT -> REALIZED_IMPACT
  476 rows
```

The three-class readout raises realized-impact frame sensitivity above 0.75 on both cohorts, but class separation remains weak, especially for PRE_HIT and TRUE_BACKGROUND.

## Frozen binary baseline on the same fresh cohorts

PROSPECTIVE_A:

```text
precision     0.573297
recall        0.756998
F1            0.652464
event/hit     1.320429
count MAE     8.406250
```

PROSPECTIVE_B:

```text
precision     0.565452
recall        0.748214
F1            0.644120
event/hit     1.323214
count MAE     8.484375
```

The frozen binary baseline therefore replicated the previously observed over-emission pattern on fresh cohorts.

## THREE_CLASS_TEMPORAL3 event stream

PROSPECTIVE_A:

```text
physical impacts  1679
neural events     3056
matched           1319
false events      1737
missed impacts     360
precision       0.431610
recall          0.785587
F1              0.557128
event/hit       1.820131
count MAE      21.515625
median latency      80 ms
p90 latency        140 ms
refractory suppressed 0
```

PROSPECTIVE_B:

```text
physical impacts  1680
neural events     3071
matched           1305
false events      1766
missed impacts     375
precision       0.424943
recall          0.776786
F1              0.549358
event/hit       1.827976
count MAE      21.734375
median latency      80 ms
p90 latency        140 ms
refractory suppressed 0
```

The three-class readout improves recall relative to the binary baseline, but precision and count structure become substantially worse.

## False-event timing

PROSPECTIVE_A:

```text
PRE_HIT_200MS        410 / 1737 = 0.236039
RECENT_POST_HIT_200MS  0 / 1737 = 0
BACKGROUND_200MS    1327 / 1737 = 0.763961
```

PROSPECTIVE_B:

```text
PRE_HIT_200MS        396 / 1766 = 0.224236
RECENT_POST_HIT_200MS  0 / 1766 = 0
BACKGROUND_200MS    1370 / 1766 = 0.775764
```

The precision failure is therefore strongly background-dominant on both fresh cohorts.

## Interpretation

The experiment falsifies the hypothesis that binary scalar compression alone was the main blocker.

Separating REALIZED_IMPACT, PRE_HIT, and TRUE_BACKGROUND into three linear ridge heads does recover enough realized-impact sensitivity, but it also converts many background frames into REALIZED_IMPACT episodes. The resulting event stream over-emits even more strongly than the binary baseline.

The immediate blocker is now class-transition specificity, not event refractory timing:

- refractory suppression is zero;
- realized-impact frame recall is above 0.75;
- false events are approximately 76–78% background;
- TRUE_BACKGROUND -> REALIZED_IMPACT frame errors are numerous and replicated;
- PRE_HIT class recall is only about 47%.

No class-score threshold, margin, ridge, temporal-depth, refractory, or post-hoc class rule may be tuned on these cohorts.

The next experiment must attribute the three-class event failures before any new repair. It should distinguish:

1. false event entry source: PRE_HIT -> REALIZED versus TRUE_BACKGROUND -> REALIZED;
2. false-event score margin: low-margin class ambiguity versus strong REALIZED misclassification;
3. missed hits: no REALIZED class inside 200 ms versus pre-hit REALIZED carryover versus evaluator matching conflict.

## Deployment

```text
POTION v15D  DEPLOYED
v15N         CLOSED / BLOCKED
v16C         BLOCKED
```
