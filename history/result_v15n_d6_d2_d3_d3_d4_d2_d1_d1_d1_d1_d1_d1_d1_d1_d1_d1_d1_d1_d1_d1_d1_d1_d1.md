# result_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1 — multilag-rise failure attribution

## Status

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_NEURAL_ONLY_PREDICTIVE_SURPRISE32_MULTILAG_RISE_FAILURE_ATTRIBUTED
```

Frozen attribution axis:

```text
BASE_SIGNAL_ABSENT_DOMINANT
```

Authoritative evidence:

```text
run            37179198946
analyze job    111368268616
head           0536d354e6d62c03879efa2460ca0932e8d1d123
artifact       11295075939
artifact sha   sha256:493ab7b5a7b8575d3a1af2f4a7a822aa35f3e3257e01e1b37185af3adb1d18b0
JSON sha256    4d34942cc294798c8363fab817a472469cea135cd8e5dc11a9587ff2ddeeca71
```

Frozen chain:

```text
multilag-rise failure  b57448ba2ed20ddd08b5ff3853bc117324c0b178
design                 40d439f188c2fdc55984f484b7a20404da36920f
prereg                 d608390653b63b1e7e7a3e7431d7cf7263f77fa3
implementation         eb21e7569874dfc75ce3375f5590f2525d163217
workflow               0536d354e6d62c03879efa2460ca0932e8d1d123
```

## Exact reproduction

All frozen prerequisite values reproduced exactly.

```text
base model SHA
de8cc3c24cbb91a3a9a806aa2afe37ecd0294c0d2c4b5ce2d4a93c25d77a1cde

base tau
1.574078960908224

repair model SHA
8556002505564c754f972abd62afc20ff8b89f0e7bca52b7e365a6f5120b275a

tau_rise
1.0756203121500945

TRAIN tapes              64
TRAIN predictive rows 30080
CAL tapes                64
rise calibration scores 29760
```

C/D authority metrics also reproduced exactly.

## Support

Both attribution cohorts passed all support floors.

```text
C: 64 tapes, 1721 impacts, 1373 events, 1209 false, 1557 misses
   finite rise peak 1.0
   finite raw peak  1.0

D: 64 tapes, 1703 impacts, 1319 events, 1144 false, 1528 misses
   finite rise peak 1.0
   finite raw peak  1.0
```

## Rise miss attribution

### C

```text
MATCH_CONFLICT                              0 / 1557 = 0
REFRACTORY_SUPPRESSED_IN_WINDOW            0 / 1557 = 0
PRE_HIT_RISE_CROSSING                    153 / 1557 = 0.0982658960
LATE_POST_HIT_RISE_CROSSING              223 / 1557 = 0.1432241490
ABOVE_RISE_THRESHOLD_NO_CROSSING_IN_WINDOW 0 / 1557 = 0
NO_LOCAL_RISE_THRESHOLD_CROSSING         1181 / 1557 = 0.7585099550
```

### D

```text
MATCH_CONFLICT                              0 / 1528 = 0
REFRACTORY_SUPPRESSED_IN_WINDOW            0 / 1528 = 0
PRE_HIT_RISE_CROSSING                    147 / 1528 = 0.0962041885
LATE_POST_HIT_RISE_CROSSING              191 / 1528 = 0.1250000000
ABOVE_RISE_THRESHOLD_NO_CROSSING_IN_WINDOW 0 / 1528 = 0
NO_LOCAL_RISE_THRESHOLD_CROSSING         1190 / 1528 = 0.7787958115
```

## Frozen raw predictive-surprise context

All missed impacts:

```text
C
RAW_LOCAL_SUPRATHRESHOLD_PRESENT  402 / 1557 = 0.2581888247
RAW_LOCAL_SUBTHRESHOLD           1155 / 1557 = 0.7418111753

D
RAW_LOCAL_SUPRATHRESHOLD_PRESENT  363 / 1528 = 0.2375654450
RAW_LOCAL_SUBTHRESHOLD           1165 / 1528 = 0.7624345550
```

Inside only `NO_LOCAL_RISE_THRESHOLD_CROSSING` misses:

```text
C
RAW_LOCAL_SUPRATHRESHOLD_PRESENT   62 / 1181 = 0.0524978831
RAW_LOCAL_SUBTHRESHOLD           1119 / 1181 = 0.9475021169

D
RAW_LOCAL_SUPRATHRESHOLD_PRESENT   58 / 1190 = 0.0487394958
RAW_LOCAL_SUBTHRESHOLD           1132 / 1190 = 0.9512605042
```

This satisfies the preregistered strict axis rule for:

```text
BASE_SIGNAL_ABSENT_DOMINANT
```

## Peak timing and gaps

Rise peak offset:

```text
C q10/q25/median/q75/q90 = -8 / -1 / 7 / 13 / 15
D q10/q25/median/q75/q90 = -9 / -2 / 6 / 13 / 15
```

Missed-impact rise threshold gap:

```text
C q10/q25/median/q75/q90
-0.4805278953 / 0.0135652203 / 0.3116868956 / 0.5219249857 / 0.6682509367

D q10/q25/median/q75/q90
-0.4856039486 / 0.0330730962 / 0.3119450147 / 0.5178066530 / 0.6548347264
```

Frozen raw peak offset:

```text
C q10/q25/median/q75/q90 = -8 / -1 / 10 / 14 / 16
D q10/q25/median/q75/q90 = -9 / -3 / 9 / 14 / 15
```

Frozen raw threshold gap:

```text
C q10/q25/median/q75/q90
-0.5123016168 / -0.0136328692 / 0.3319941231 / 0.5312276231 / 0.6659666961

D q10/q25/median/q75/q90
-0.5209539476 / 0.0198779110 / 0.3219842929 / 0.5277865070 / 0.6840129726
```

## False-event timing

C:

```text
PRE_HIT_200MS          124 / 1209 = 0.1025641026
RECENT_POST_HIT_200MS    0 / 1209 = 0
BACKGROUND            1085 / 1209 = 0.8974358974
```

D:

```text
PRE_HIT_200MS          108 / 1144 = 0.0944055944
RECENT_POST_HIT_200MS    0 / 1144 = 0
BACKGROUND            1036 / 1144 = 0.9055944056
```

## Interpretation

The multilag-rise transform is not the dominant source of failure.

For roughly 76–78% of misses, the rise score does not produce a local crossing. More importantly, roughly 74–76% of **all** misses also lack a frozen raw predictive-surprise value above the already frozen base threshold in the local window.

Among the no-local-rise misses, about 95% also lack a raw suprathreshold local signal.

Therefore the failed bridge is primarily upstream of the rise eventizer: the current aggregate predictive-surprise representation does not make most physical impacts locally salient enough.

This does not authorize lowering either frozen threshold. The next repair should change the neural-only score representation/aggregation under a new preregistration and fresh prospective cohorts rather than retune eventizer timing or thresholds.

## Scientific status

```text
reproductionPass           true
supportPass                true
attributionAxis            BASE_SIGNAL_ABSENT_DOMINANT

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
