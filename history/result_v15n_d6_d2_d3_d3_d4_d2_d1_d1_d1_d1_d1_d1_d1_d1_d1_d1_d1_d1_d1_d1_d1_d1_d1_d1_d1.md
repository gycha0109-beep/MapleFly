# result_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1 — max-component surprise32 failure attribution

## Status

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_NEURAL_ONLY_MAX_COMPONENT_SURPRISE32_FAILURE_ATTRIBUTED
```

Frozen attribution axis:

```text
MAX_SIGNAL_ABSENT_DOMINANT
```

Authoritative evidence:

```text
run            37201941454
analyze job    111435458951
head           7c5ba7450fa2fad1f1e2445e25cd0d91f02b5592
artifact       11303800018
artifact sha   sha256:51050dd8b26ee326130bba2c955c13f602c365a4b95bd47899fc75ec086d1585
JSON sha256    18677b316b60564893eadd586b74f8fcb09957689bb381b18ad0ccaec0625509
```

Frozen chain:

```text
max-component failure  41e95ba575210da4fe02061301c137977262bd46
design                 6c725f2f8b58d24ce2aa105846a267684b397420
prereg                 0ce7588247a29156f6a6aabb7b593d90bbbe16f4
implementation         5add64587e55462a10b49f726b429ec200e971f3
workflow               7c5ba7450fa2fad1f1e2445e25cd0d91f02b5592
```

## Exact reproduction

All prerequisite values reproduced exactly.

```text
base model SHA
de8cc3c24cbb91a3a9a806aa2afe37ecd0294c0d2c4b5ce2d4a93c25d77a1cde

base raw tau
1.574078960908224

max repair model SHA
17c5b3e45a1748b940a903b02684c3683838825a6b77d4eeee04af963f9af6fb

tau_max
12.389163171560895

TRAIN tapes              64
TRAIN predictive rows 30080
CAL tapes                64
max calibration scores 30080
```

E/F authority metrics also reproduced exactly.

## Support

Both attribution cohorts passed all support floors.

```text
E: 64 tapes, 1716 impacts, 1425 events, 1274 false, 1565 misses
   finite local peak 1.0
   background frames 17244
   argmax available 1.0

F: 64 tapes, 1737 impacts, 1365 events, 1234 false, 1606 misses
   finite local peak 1.0
   background frames 17079
   argmax available 1.0
```

## Miss attribution

### E

```text
MATCH_CONFLICT                                0 / 1565 = 0
REFRACTORY_SUPPRESSED_IN_WINDOW              0 / 1565 = 0
PRE_HIT_MAX_CROSSING                       138 / 1565 = 0.0881789137
LATE_POST_HIT_MAX_CROSSING                 313 / 1565 = 0.2000000000
ABOVE_MAX_THRESHOLD_NO_CROSSING_IN_WINDOW    0 / 1565 = 0
NO_LOCAL_MAX_THRESHOLD_CROSSING            1114 / 1565 = 0.7118210863
```

### F

```text
MATCH_CONFLICT                                0 / 1606 = 0
REFRACTORY_SUPPRESSED_IN_WINDOW              0 / 1606 = 0
PRE_HIT_MAX_CROSSING                       132 / 1606 = 0.0821917808
LATE_POST_HIT_MAX_CROSSING                 306 / 1606 = 0.1905354919
ABOVE_MAX_THRESHOLD_NO_CROSSING_IN_WINDOW    0 / 1606 = 0
NO_LOCAL_MAX_THRESHOLD_CROSSING            1168 / 1606 = 0.7272727273
```

The preregistered strict axis therefore selects:

```text
MAX_SIGNAL_ABSENT_DOMINANT
```

## False-event timing

E:

```text
PRE_HIT_200MS          116 / 1274 = 0.0910518053
RECENT_POST_HIT_200MS    0 / 1274 = 0
BACKGROUND            1158 / 1274 = 0.9089481947
```

F:

```text
PRE_HIT_200MS          105 / 1234 = 0.0850891410
RECENT_POST_HIT_200MS    0 / 1234 = 0
BACKGROUND            1129 / 1234 = 0.9149108590
```

Background false events are common, but the preregistered precedence gives local-signal absence priority when both are present.

## Local peak timing

E:

```text
PRE_HIT_PEAK    381 / 1716 = 0.2220279720
IN_WINDOW_PEAK  391 / 1716 = 0.2278554779
LATE_POST_HIT   944 / 1716 = 0.5501165501
peak offset q10/q25/median/q75/q90 = -7 / 0 / 11 / 14 / 15
```

F:

```text
PRE_HIT_PEAK    368 / 1737 = 0.2118595279
IN_WINDOW_PEAK  393 / 1737 = 0.2262521589
LATE_POST_HIT   976 / 1737 = 0.5618883132
peak offset q10/q25/median/q75/q90 = -6 / 1 / 11 / 14 / 15
```

Missed-impact threshold gap:

```text
E q10/q25/median/q75/q90
-5.5957902796 / -0.7935197844 / 2.5180939660 / 5.0189587671 / 6.4736250469

F q10/q25/median/q75/q90
-6.3847684615 / -0.6104700856 / 2.7222635331 / 5.1180903876 / 6.4047772589
```

## Background separation

E:

```text
BACKGROUND q95  11.5228320819
BACKGROUND q99  19.2456251909
IMPACT_LOCAL q95 13.9984419042
IMPACT_LOCAL q99 24.0917195386

q95 ratio 1.2148438686
q99 ratio 1.2518023862
```

F:

```text
BACKGROUND q95  11.1634383722
BACKGROUND q99  19.7027530369
IMPACT_LOCAL q95 13.9211894924
IMPACT_LOCAL q99 24.2644355113

q95 ratio 1.2470342047
q99 ratio 1.2315251308
```

Impact-local max scores are descriptively higher than background, but separation is modest and insufficient to create reliable local threshold crossings.

## Argmax component diagnostic

Background argmax is diffuse:

```text
E top1 component 30 share 0.0533518905
E top3 share 0.1558803062
E normalized entropy 0.9504361003

F top1 component 21 share 0.0559751742
F top3 share 0.1612506587
F normalized entropy 0.9480712921
```

False-event argmax is more concentrated, but does not meet the preregistered noise-dominance rule:

```text
E false-event top1 component 3 share 0.1828885400
E false-event top3 share 0.4850863422
E normalized entropy 0.7589263008

F false-event top1 component 3 share 0.1871961102
F false-event top3 share 0.4797406807
F normalized entropy 0.7656878114
```

Matched events also do not isolate one stable component set:

```text
E matched-event top1 component 4 share 0.2251655629
E matched-event top3 share 0.5298013245
E normalized entropy 0.7230769044

F matched-event top1 component 2 share 0.1832061069
F matched-event top3 share 0.4732824427
F normalized entropy 0.7522486273
```

Therefore the failure is not explained by one or a few globally dominant noisy PCA components.

## Interpretation

The max-component aggregation does increase impact-local score tails relative to background, but the effect is too weak and temporally diffuse.

The dominant failure remains upstream signal insufficiency: roughly 71–73% of missed impacts do not produce any local max-score threshold crossing. Background false events are also frequent, but their argmax component distribution is not concentrated enough to support the preregistered `BACKGROUND_MAX_NOISE_DOMINANT` axis.

Taken together with the earlier mean-energy and multilag-rise failures, this indicates that changing only the scalar aggregation/eventizer layer is unlikely to solve the bridge. The next repair should move upstream to the neural representation or predictive target itself rather than tune threshold, timing, or component weights on E/F.

## Scientific status

```text
reproductionPass           true
supportPass                true
attributionAxis            MAX_SIGNAL_ABSENT_DOMINANT

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
