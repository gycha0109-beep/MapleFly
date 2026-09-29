# result_v15n_d6_d2_d3_d3_d4_d1 — realized-impact age attribution

## Status

```text
V15N_D6_D2_D3_D3_D4_D1_REALIZED_IMPACT_AGE_ATTRIBUTED
ageAxis = EARLY_ONLY_UNRESOLVED
```

Authoritative evidence:

```text
run            36507440642
head           5d0bb5fe959878f2bbb362afe265e99bf590afdb
artifact       11008183466
artifact sha   sha256:defbe3fa9e54dbb2031f5edd8570afccbb09f70c7e7b7aa5b9e37963f9b21a86
JSON sha256    4ff97795d030f668a43a99104247564d09e4831715dab3b2e13af76fb5512755
```

Frozen chain:

```text
design          79914daaa58a6351e5dee18f87e082ac0a39bfb8
prereg          a3f9a4074db6a1c3d92b3d3669bef99fae9d3a06
implementation  750472b8f2eeee97c12a3aeb7d713b7cc9be5f7e
workflow        5d0bb5fe959878f2bbb362afe265e99bf590afdb
D4 JSON         154974f62c014a59a2f0fa2202081a17a9c39665e0c0db8fb879c75b4d232138
CURRENT model   63d7272e8c3fa25f114bb78f82ef840c882b86b8fbfdcc140750efe007afa784
TEMPORAL3 model 4cb231aaf0c0f19b89dbc26f202aa2e50890e56452f1971627389cf63a5791a1
threshold       0.5
```

Exact D4 aggregate reproduction and provenance passed.

## Support

```text
ATTRIBUTION_A  tapes=64  EARLY=1675  LATE=1668  PASS
ATTRIBUTION_B  tapes=64  EARLY=1689  LATE=1686  PASS
```

## Frozen age attribution

```text
CURRENT_PCA32
  A EARLY recall 0.327761  LATE recall 0.709832
  B EARLY recall 0.316755  LATE recall 0.722420

PCA32_TEMPORAL3
  A EARLY recall 0.487164  LATE recall 0.803357
  B EARLY recall 0.477798  LATE recall 0.817912

TEMPORAL3 - CURRENT recall gain
  A EARLY +0.159403  LATE +0.093525
  B EARLY +0.161042  LATE +0.095492
```

TEMPORAL3 score summaries:

```text
A EARLY mean=0.485217 q25=0.330248 median=0.493618 q75=0.644712
A LATE  mean=0.684408 q25=0.539662 median=0.683462 q75=0.826706

B EARLY mean=0.484639 q25=0.333149 median=0.487641 q75=0.644825
B LATE  mean=0.688398 q25=0.539194 median=0.688137 q75=0.822745
```

Frozen gate:

```text
EARLY < 0.75 on both cohorts
LATE  >= 0.75 on both cohorts
```

Therefore the remaining TEMPORAL3 miss is concentrated in the first 100 ms after impact. The same frozen representation passes the realized-impact recall gate during 100–200 ms on both cohorts.

This supports causal response latency as the immediate blocker. It does not justify a temporal-depth sweep.

## Next scientific step

Keep the exact frozen TEMPORAL3 score and threshold. Test an oracle-window-free causal delayed eventizer that can emit after delayed neural evidence appears while keeping PRE_HIT activity separate from post-event evidence.

Do not tune temporal depth, threshold, age boundaries, D4 cohorts, or the deployed POTION policy from D4-D1.

## Deployment

```text
POTION v15D  DEPLOYED
v15N         CLOSED / BLOCKED
v16C         BLOCKED
```
