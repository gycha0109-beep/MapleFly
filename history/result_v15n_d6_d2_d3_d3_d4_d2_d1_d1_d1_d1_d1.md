# result_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1 — train-calibrated margin crossing

## Status

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_MARGIN_CROSSING_EVENT_STREAM_NOT_DEMONSTRATED
```

Authoritative evidence:

```text
run            36699990275
head           702cce06c0e41e1940e91cc095c1207504dff28f
artifact       11091860656
artifact sha   sha256:e0d4f25f828343ddaabb4c7e02df5dd05391cfde10daf1ebbfea369c0bc39651
JSON sha256    f5bdc5e56984083fd7f56c41c230a6a51ecef9ea8377b6bbbcce210406e012c3
```

Frozen chain:

```text
design          dc32192353960ef10f4c57ffe366bb8c6bd2e610
prereg          f0516f629d946871cdf37336cd921eca6287d525
implementation  c9f40d17bc2add806f8678a95605b1fbdc880e2f
workflow        702cce06c0e41e1940e91cc095c1207504dff28f
```

Prerequisite attribution SHA:

```text
a39781bedc4cb67da602c758a09b942b5a98b622a1aa9902123b9b0fda410024
```

Frozen three-class model SHA:

```text
cf9d38bbb697c1c2b98aa34f51c6ee39626c68763acbfb1c34e145eb738c7144
```

## Calibration

Support:

```text
64 tapes
1722 physical impacts
5661 threshold candidates
PASS
```

Feasible thresholds:

```text
131
```

Selected threshold:

```text
0.2378919189622094
```

Selected calibration metrics:

```text
physical impacts  1722
neural events     1753
matched           1318
false events       435
missed impacts     404
precision       0.751854
recall          0.765389
F1              0.758561
event/hit       1.018002
count MAE       2.296875
median latency     0.10 s
p90 latency        0.14 s
refractory suppressed 0
```

The threshold was selected only from the preregistered dedicated calibration cohort using the frozen deterministic lexicographic rule.

No attribution or prospective margin value entered threshold selection.

## Frozen class-state comparator on fresh cohorts

PROSPECTIVE_A:

```text
precision     0.441584
recall        0.801870
F1            0.569531
event/hit     1.815897
count MAE    21.812500
```

PROSPECTIVE_B:

```text
precision     0.446836
recall        0.812500
F1            0.576580
event/hit     1.818341
count MAE    21.890625
```

The frozen discrete three-class eventizer reproduces severe over-emission on the new cohorts.

## Margin-crossing prospective result

### PROSPECTIVE_A

```text
physical impacts  1711
neural events     1694
matched           1281
false events       413
missed impacts     430
precision       0.756198   PASS
recall          0.748685   FAIL
F1              0.752423   PASS
event/hit       0.990064   PASS
count MAE       2.640625   PASS
median latency     0.10 s
p90 latency        0.14 s
refractory suppressed 0
```

The recall gate is 0.75. A required at least 1284 matched impacts; it produced 1281, a deficit of three matches.

### PROSPECTIVE_B

```text
physical impacts  1712
neural events     1768
matched           1329
false events       439
missed impacts     383
precision       0.751697   PASS
recall          0.776285   PASS
F1              0.763793   PASS
event/hit       1.032710   PASS
count MAE       2.062500   PASS
median latency     0.10 s
p90 latency        0.14 s
refractory suppressed 0
```

All primary gates pass on B.

## Interpretation

The train-calibrated margin crossing is a large repair relative to the frozen discrete class-state eventizer:

- event/hit is reduced from about 1.82 to approximately 1.0;
- precision rises from about 0.44 to about 0.75;
- count MAE falls from about 21.8 to about 2–3;
- B passes every primary gate.

However, the preregistered requirement is both fresh cohorts. A misses the recall gate by 0.001315, therefore the event stream is not demonstrated.

This failure does not authorize threshold retuning. The selected threshold remains frozen at 0.2378919189622094.

The next experiment must attribute the missed-impact structure under this exact frozen margin crossing before any representation, threshold, temporal-depth, refractory, or eventizer change.

## Deployment

```text
POTION v15D  DEPLOYED
v15N         CLOSED / BLOCKED
v16C         BLOCKED
```
