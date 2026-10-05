# result_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1 — PCA-complement innovation failure attribution

## Status

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_NEURAL_ONLY_PCA_COMPLEMENT_INNOVATION_FAILURE_ATTRIBUTED
```

Frozen attribution axis:

```text
COMPLEMENT_SIGNAL_ABSENT_DOMINANT
```

Authoritative evidence:

```text
run            37260564427
analyze job    111607079673
head           0445d63782063ffa5571b45683630d4488129845
artifact       11324835401
artifact sha   sha256:1021d1ded1ff600f3fc72503d7173d9aa3cf7be0dcef222889dccf184b797486
JSON sha256    3c582b8925555e3e6603fc9b638993d9808554646db9f2e350a1ec60bb43f716
```

Frozen chain:

```text
PCA-complement failure 52bb0c383ce948739e334152e888a7633e1465f8
design                 4211f7799426d555a39ad49de151bbd3f8af3b89
prereg                 f6f5be8552efcc73bf462e9e2430fc2dc3f1e56c
implementation         8b0c55a3fe8ce44623a131e4801a2251fe027aaa
workflow               0445d63782063ffa5571b45683630d4488129845
```

## Exact reproduction

All frozen prerequisites and G/H authority metrics reproduced exactly.

```text
base model SHA
de8cc3c24cbb91a3a9a806aa2afe37ecd0294c0d2c4b5ce2d4a93c25d77a1cde

base tau
1.574078960908224

complement repair SHA
1b4489bf4e1720ebb16b8a14f16814999398c68bcbf46afc8e3c1b76e0416c7e

tau_complement
1.6592220236705837
```

Support passed on both cohorts.

## Miss attribution

### G

```text
PRE_HIT_COMPLEMENT_CROSSING          184 / 1521 = 0.1209730440
LATE_POST_HIT_COMPLEMENT_CROSSING    141 / 1521 = 0.0927021696
NO_LOCAL_COMPLEMENT_THRESHOLD_CROSSING
                                    1196 / 1521 = 0.7863247863
```

### H

```text
PRE_HIT_COMPLEMENT_CROSSING          155 / 1508 = 0.1027851459
LATE_POST_HIT_COMPLEMENT_CROSSING    122 / 1508 = 0.0809018568
NO_LOCAL_COMPLEMENT_THRESHOLD_CROSSING
                                    1231 / 1508 = 0.8163129973
```

No match-conflict, refractory suppression, or above-threshold-without-crossing cases were observed.

## False-event timing

```text
G BACKGROUND 1079 / 1241 = 0.8694601128
H BACKGROUND  997 / 1138 = 0.8760984183
```

Background false events remain common.

## Background separation

```text
G background q95    1.6016864578
G impact-local q95  1.7365423420
G q95 ratio         1.0841961818
G q99 ratio         1.1016408770

H background q95    1.5807415747
H impact-local q95  1.7006837967
H q95 ratio         1.0758771857
H q99 ratio         1.1038179128
```

Impact-local complement energy is only modestly shifted above background.

## Cross-representation context

Among missed impacts, all three frozen representations are locally absent in a majority of cases.

```text
G
BASE_ABSENT|MAX_ABSENT|COMPLEMENT_ABSENT
780 / 1521 = 0.5128205128

H
BASE_ABSENT|MAX_ABSENT|COMPLEMENT_ABSENT
812 / 1508 = 0.5384615385
```

Complement-only local presence among misses is limited:

```text
G BASE_ABSENT|MAX_ABSENT|COMPLEMENT_PRESENT
127 / 1521 = 0.0834976989

H BASE_ABSENT|MAX_ABSENT|COMPLEMENT_PRESENT
106 / 1508 = 0.0702917772
```

Thus the PCA-complement representation recovers some local novelty missed by projected scores, but not enough to explain most missed impacts.

## Interpretation

The failure is not primarily an eventizer or a simple timing-shift problem.

Across independent G/H cohorts, roughly 79–82% of missed impacts have no local complement threshold crossing. More importantly, roughly 51–54% of all misses have no local suprathreshold signal in **any** of the three frozen innovation-derived representations:

- mean predictive-surprise;
- max-component predictive-surprise;
- PCA-complement innovation energy.

This points to a common upstream limitation shared by all three: the current 5-history innovation representation itself may be suppressing or failing to expose impact-related neural structure.

The next repair should therefore test a neural-only representation upstream of the innovation transform rather than alter PCA dimension, thresholds, scalar aggregation, or eventizer timing.

## Scientific status

```text
reproductionPass           true
supportPass                true
attributionAxis            COMPLEMENT_SIGNAL_ABSENT_DOMINANT

diagnosticStackDeployable  false
deployabilityCandidate     false
deployment                 BLOCKED
```

## Deployment

```text
POTION v15D  DEPLOYED
v15N         CLOSED / BLOCKED
v16C         BLOCKED
```
