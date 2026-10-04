# result_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1_d1 — neural-only predictive-surprise32 failure attribution

## Status

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_D1_NEURAL_ONLY_PREDICTIVE_SURPRISE32_FAILURE_ATTRIBUTED
```

Frozen attribution axis:

```text
NO_LOCAL_THRESHOLD_DOMINANT
```

Authoritative evidence:

```text
run            37168311777
analyze job    111349797407
head           094baf6969f4c6cf9cbb1dbb586d63f8412c9d15
artifact       11291943099
artifact sha   sha256:e3b3d06404ee4c6f5d8170979ae4c1b4746d07a2ad32d75247631fd8bf7f54ca
JSON sha256    5952740e8403843872e370a94cc8d4d45699b2f5df77e54f14665b6b36c8a4f3
```

Frozen chain:

```text
design          063a1f6be925ee7145961306503543e28b133131
prereg          68f34facc1ee456c7b91fe649b57e893258cabea
clarification   2707951db2a48dd0b793a690409b7c13e43bcd23
implementation  190ea1d8a6e1ebc4985780cc997df58c46394fca
workflow        094baf6969f4c6cf9cbb1dbb586d63f8412c9d15
```

## Exact reproduction gate

Exact reproduction passed.

```text
model SHA expected  de8cc3c24cbb91a3a9a806aa2afe37ecd0294c0d2c4b5ce2d4a93c25d77a1cde
model SHA observed  de8cc3c24cbb91a3a9a806aa2afe37ecd0294c0d2c4b5ce2d4a93c25d77a1cde

threshold expected   1.574078960908224
threshold observed   1.574078960908224

TRAIN tapes           64
predictive rows    30080
CAL tapes             64
CAL scores         30080
```

The authoritative prospective A/B metrics were reproduced exactly, including all counts, precision, recall, F1, event/hit ratio, and count MAE.

### A

```text
tapes             64
physical impacts 1747
neural events    1435
matched           192
false events     1243
missed impacts   1555
precision        0.1337979094076655
recall           0.10990269032627362
F1               0.12067881835323696
event/hit        0.8214081282198054
count MAE        5.875
```

### B

```text
tapes             64
physical impacts 1704
neural events    1376
matched           172
false events     1204
missed impacts   1532
precision        0.125
recall           0.10093896713615023
F1               0.11168831168831168
event/hit        0.8075117370892019
count MAE        5.46875
```

## Attribution support

Support passed independently on both cohorts.

```text
A: 64 tapes, 1747 impacts, 1435 neural events, 1243 false events, 1555 misses, finite peak fraction 1.0
B: 64 tapes, 1704 impacts, 1376 neural events, 1204 false events, 1532 misses, finite peak fraction 1.0
```

## Miss attribution

### A

```text
MATCH_CONFLICT                         0 / 1555 = 0
REFRACTORY_SUPPRESSED_IN_WINDOW       0 / 1555 = 0
PRE_HIT_CROSSING                    163 / 1555 = 0.1048231511
LATE_POST_HIT_CROSSING              193 / 1555 = 0.1241157556
ABOVE_THRESHOLD_NO_CROSSING_IN_WINDOW 2 / 1555 = 0.0012861736
NO_LOCAL_THRESHOLD_CROSSING        1197 / 1555 = 0.7697749196
```

### B

```text
MATCH_CONFLICT                         0 / 1532 = 0
REFRACTORY_SUPPRESSED_IN_WINDOW       0 / 1532 = 0
PRE_HIT_CROSSING                    155 / 1532 = 0.1011749347
LATE_POST_HIT_CROSSING              202 / 1532 = 0.1318537859
ABOVE_THRESHOLD_NO_CROSSING_IN_WINDOW 0 / 1532 = 0
NO_LOCAL_THRESHOLD_CROSSING        1175 / 1532 = 0.7669712794
```

The preregistered strict rule therefore selects:

```text
NO_LOCAL_THRESHOLD_DOMINANT
```

Both cohorts independently exceed the strict 0.50 dominance requirement by a wide margin.

## False-event timing

### A

```text
PRE_HIT_200MS          129 / 1243 = 0.1037811746
RECENT_POST_HIT_200MS    0 / 1243 = 0
BACKGROUND            1114 / 1243 = 0.8962188254
```

### B

```text
PRE_HIT_200MS          126 / 1204 = 0.1046511628
RECENT_POST_HIT_200MS    0 / 1204 = 0
BACKGROUND            1078 / 1204 = 0.8953488372
```

Most false events are therefore not immediate impact-adjacent events.

## Local peak timing

A:

```text
PRE_HIT_PEAK    398 / 1747 = 0.2278191185
IN_WINDOW_PEAK  510 / 1747 = 0.2919290212
LATE_POST_HIT   839 / 1747 = 0.4802518603
peak offset q10/q25/median/q75/q90 = -7 / 0 / 8 / 13 / 15
```

B:

```text
PRE_HIT_PEAK    425 / 1704 = 0.2494131455
IN_WINDOW_PEAK  465 / 1704 = 0.2728873239
LATE_POST_HIT   814 / 1704 = 0.4776995305
peak offset q10/q25/median/q75/q90 = -8 / 0 / 9 / 13 / 15
```

Local surprise peaks tend to occur late, but the frozen dominance rule does not classify the failure as late-phase-shift dominant because the miss-level late crossing fraction is only about 12–13%.

## Missed-impact threshold gap

```text
A q10/q25/median/q75/q90
-0.4935629738 / 0.0241544040 / 0.3155247539 / 0.5381863061 / 0.6865543505

B q10/q25/median/q75/q90
-0.5008725902 / 0.0223240588 / 0.3297425934 / 0.5383123452 / 0.6747114707
```

The median missed impact remains materially below the frozen threshold in both cohorts.

## Nearest event distance for misses

The pre-run clarification keeps the inclusive +/-20 search but maps unnamed boundaries `[-20,-10)` and exact `+20` to `NONE`.

A:

```text
PRE_200MS    163 / 1555 = 0.1048231511
IN_WINDOW      0 / 1555 = 0
LATE_200MS   180 / 1555 = 0.1157556270
NONE        1212 / 1555 = 0.7794212219
outside named buckets = 156
```

B:

```text
PRE_200MS    155 / 1532 = 0.1011749347
IN_WINDOW      0 / 1532 = 0
LATE_200MS   192 / 1532 = 0.1253263708
NONE        1185 / 1532 = 0.7734986945
outside named buckets = 161
```

## Surprise distributions

### A

```text
             q50       q75       q90       q95       q99
BACKGROUND   0.630901  0.845495  1.186092  1.505163  2.342932
PRE_HIT      0.703949  0.944252  1.307579  1.683250  2.903852
IN_WINDOW    0.722942  0.963911  1.325420  1.671538  2.850330
LATE_POST    0.839271  1.130586  1.506795  1.773929  2.546458
```

### B

```text
             q50       q75       q90       q95       q99
BACKGROUND   0.629548  0.842285  1.172942  1.477396  2.253456
PRE_HIT      0.709048  0.947020  1.308526  1.617639  2.721712
IN_WINDOW    0.735171  0.965798  1.315947  1.661958  2.696325
LATE_POST    0.832046  1.114392  1.519205  1.840233  2.659786
```

## A/B consistency

The attribution is highly consistent across A/B.

```text
A-B PRE_HIT_CROSSING fraction                   +0.0036482164
A-B LATE_POST_HIT_CROSSING fraction             -0.0077380303
A-B ABOVE_THRESHOLD_NO_CROSSING fraction        +0.0012861736
A-B NO_LOCAL_THRESHOLD_CROSSING fraction        +0.0028036402

A-B PRE_HIT false-event fraction                -0.0008699882
A-B BACKGROUND false-event fraction             +0.0008699882

A-B median peak offset                           -1 step
A-B median nearest non-NONE event offset          0 step
A-B median missed-impact threshold gap           -0.0142178396
```

## Tape provenance

All four packs were exact v4 cache hits in the analysis stage; analysis had build disabled and did not initialize simulation context.

```text
TRAIN          64 tapes  cache HIT
CALIBRATION    64 tapes  cache HIT
PROSPECTIVE_A  64 tapes  cache HIT
PROSPECTIVE_B  64 tapes  cache HIT

analysis tapeBuildAllowed            false
analysis simulationContextInitialized false
```

## Interpretation

The failure is not primarily a matching conflict, refractory block, or a simple early/late phase shift.

The dominant failure is that, for roughly 77% of missed impacts on both independent attribution cohorts, the frozen predictive-surprise signal does not produce a local threshold crossing in the preregistered impact neighborhood.

This is consistent with the descriptive threshold-gap result: the median missed impact remains below the frozen threshold by about 0.32 score units in both cohorts.

This finding does **not** authorize lowering or retuning the threshold. The attribution cohorts are diagnostic-only and cannot be used to choose a repair. Any repair must start from a separate design and preregistration and must preserve the separation between neural-only runtime signals and physical truth.

## Scientific status

```text
reproductionPass           true
supportPass                true
attributionAxis            NO_LOCAL_THRESHOLD_DOMINANT

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
