# result_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1 — quadratic256 confirmatory replication

## Status

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_QUADRATIC256_CONFIRMATORY_REPLICATION_PASS
```

Authoritative evidence:

```text
run            37006306772
head           644470e7b40fe02d397648b91dff126324b6feb8
artifact       11232625088
artifact sha   sha256:7a4a5ec9d794746852dfb6649c0360814ee1a867e35879a676526d179332d176
JSON sha256    ffb4d8cbd0fecfa64ac84fc9cb90f079d3ab03a9d9e08df7b7ebff4139e398aa
```

Frozen chain:

```text
design          3953421e3b55027b5af3d4beaff6b59ac9c9cbed
prereg          ace688eeba4b1df6bb259066dad182a0d52025bf
implementation  88063afcc83cbc5a497813a236c9e9f996aded59
workflow        644470e7b40fe02d397648b91dff126324b6feb8
```

Frozen model:

```text
Quadratic256 SHA
6f72c6c5070b0a8bd9e3d64627614790fdb8c1c97b21b1f408ed1852ec5aaff7

tau
0.6097593618468664
```

No refit, calibration rerun, threshold candidate construction, threshold search, feature/degree/horizon change, eventizer change, or refractory tuning occurred.

## CONFIRM_A

```text
physical impacts 1708
neural events    1667
matched          1326
false events      341
missed impacts    382

precision       0.795441  PASS
recall          0.776347  PASS
F1              0.785778  PASS
event/hit       0.975995  PASS
count MAE       1.984375  PASS
median latency  0.10 s
p90 latency     0.14 s
```

## CONFIRM_B

```text
physical impacts 1698
neural events    1610
matched          1298
false events      312
missed impacts    400

precision       0.806211  PASS
recall          0.764429  PASS
F1              0.784764  PASS
event/hit       0.948174  PASS
count MAE       2.437500  PASS
median latency  0.10 s
p90 latency     0.14 s
```

Both independent confirmation cohorts pass every frozen gate.

## Frozen linear comparator

Same confirmation tapes:

```text
A
precision 0.773944
recall    0.761710
F1        0.767778

B
precision 0.772393
recall    0.741461
F1        0.756611
```

Quadratic256 retains the robustness improvement over the frozen linear anchored-delta3 readout, especially on CONFIRM_B where the linear comparator again misses the recall gate.

## Interpretation

The event-stream result now has both:

1. preregistered fresh prospective A/B demonstration;
2. independent frozen A/B confirmatory replication.

This closes the current representation/readout robustness question.

However, the detector remains evaluator-supervised because its ridge target and calibration threshold were selected using physical-hit truth. Therefore:

```text
diagnosticStackDeployable = false
```

The next authorized phase is a separate neural-only deployability bridge. That bridge must not use physical hit/contact/HP/damage for fitting, threshold selection, runtime score, or eventization. Physical truth may be used only after freezing for evaluation.

## Deployment

```text
POTION v15D  DEPLOYED
v15N         CLOSED / BLOCKED
v16C         BLOCKED
```
