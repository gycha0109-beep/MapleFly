# prereg_v15a10 — recursive EARLY24 temporal localization

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / OUTCOME**

v15A9 established on a fresh cohort:

```text
FULL48 Task A   PASS
EARLY24 Task A  PASS
LATE24 Task A   FAIL

MASK_EARLY24    material decoder loss
MASK_LATE24     no preregistered material loss
```

Its frozen outcome was:

```text
SINGLE_HALF_SUFFICIENCY_PRESENT
```

v15A10 performs the only recursive subdivision permitted by that preregistration:

> bisect the passing EARLY24 interval once into two fixed 1.2 s halves and test
> independent sufficiency plus fixed-EARLY24-decoder contribution.

No other temporal region is searched.

v15A10 has **no v15B unlock authority**. v15B remains BLOCKED regardless of outcome.

## Frozen biological / sensory contract

Unchanged from v15A4-v15A9:

```text
connectome
  alextitonis/fly.ai
  95a3dbcb05241b0a5c07028ca8ad945b23fbbe6e

corrected LgLG
  LEFT 331
  RIGHT 338

impact
  drive 0.7
  pulse 6 brain steps = 120 ms

ground
  SNta_L/R = 0.05

taste offer
  LB3 + claw_tpGRN bilateral
  drive 0.8
  final 5 brain steps = 100 ms

history
  48 x 100 ms = 4.8 s
```

Per-frame feature:

```text
clamp((DN_frame_Hz - baseline_DN_Hz) / 50, -1, +1)
```

The full 4.8 s trajectory is simulated exactly as before. v15A10 only changes which
frozen temporal slots are exposed to each representation.

## Fresh cohort

TRAIN:

```text
2870000
2870100
2870200
2870300
```

EVAL:

```text
2875000
2875100
2875200
```

Each base seed:

```text
6 replicates x original states 0/1/2/3
```

Therefore:

```text
TRAIN 96 rows
EVAL  72 rows
```

Brain seed:

```text
baseSeed + replicate * 7 + 1
```

Impact schedule RNG:

```text
brainSeed + 500000
```

The raw history is generated once per episode and shared by all representations and
ablations.

## Fixed recursive split

Only the previously passing EARLY24 interval is considered.

```text
R0 EARLY24
  frames 0..23
  endpoint -4.8..-2.4 s
  24 x 1316 candidate slots

R1 EARLY12_A
  frames 0..11
  endpoint -4.8..-3.6 s
  12 x 1316 candidate slots

R2 EARLY12_B
  frames 12..23
  endpoint -3.6..-2.4 s
  12 x 1316 candidate slots
```

No LATE24 region, overlap, shifted boundary, or arbitrary combination is tested.

## Representation fitting

Each R0/R1/R2 representation is fitted independently using all 96 TRAIN rows and all
four original states.

For every candidate temporal slot:

1. TRAIN population mean,
2. TRAIN population variance,
3. variance descending,
4. tie-break lower relative slot,
5. exactly top 256,
6. TRAIN-only population mean/std.

Normalization:

```text
scale = max(population_stddev, 1e-6)
z = clamp((value - TRAIN_mean) / scale, -5, +5)
```

No labels, HP, impact count, economic class, EVAL data, or outcome enters feature
selection.

R0 stores the number of selected top-256 coordinates in EARLY12_A versus EARLY12_B.

## Tasks

### Task A — primary

```text
0/1 impacts -> 0
2/3 impacts -> 1
```

### Task B — diagnostic only

```text
1 impact -> 0
2 impacts -> 1
```

Task B has no region-selection or v15B authority.

## Classifier

```text
binary logistic
epochs         240
learning rate  0.03
L2             0.001
threshold      0.5
weight init    0
bias init      0
order seed     2876000
```

No hyperparameter search.

## Representation gate

For every representation/task:

```text
balanced accuracy >= 70%
both class recalls      >= 60%
FULL - DN_SHUFFLED      >= 20pp
```

R0 EARLY24 Task A is the baseline replication gate.

If R0 fails:

```text
V15A10 = BASELINE_NOT_REPLICATED
```

and no strong sub-half inference is permitted.

## DN_SHUFFLED

For each EVAL base seed:

```text
seed = baseSeed + 900000
```

A fixed permutation of all 1316 DN identities is applied while preserving temporal
frame identity.

## LABEL_SHUFFLED

Diagnostic only:

```text
seed = 2877000 + representationIndex * 10 + taskIndex

R0=0
R1=1
R2=2

Task A=0
Task B=1
```

Not part of the gate.

## Fixed EARLY24 decoder sub-half ablations

Task A only.

After fitting R0 EARLY24 and training its Task-A model, evaluate the exact frozen model
under two EVAL-only mean masks.

### MASK_EARLY12_A

All selected R0 features from absolute frames 0..11:

```text
standardized feature := 0
```

Frames 12..23 remain untouched.

### MASK_EARLY12_B

All selected R0 features from absolute frames 12..23:

```text
standardized feature := 0
```

Frames 0..11 remain untouched.

No retraining, reselection, or renormalization after masking.

## Paired bootstrap material-loss rule

EVAL contains 18 paired groups:

```text
3 base seeds x 6 replicates
```

Each group retains all four original states.

For each mask:

```text
iterations = 2000
seed       = 2879000
delta      = BA(R0 EARLY24) - BA(masked)
95% percentile CI
```

A sub-half is **MATERIAL_DECODER_CONTRIBUTION** only if:

1. R0 Task A passes,
2. point delta >= 10pp,
3. bootstrap 95% CI lower bound > 0.

This tests contribution to the trained R0 decoder, not exclusive biological necessity.

## Preregistered interpretation

Strong interpretation requires R0 EARLY24 Task A PASS.

Independent sufficiency:

```text
EARLY12_A_SUFFICIENT
  R1 Task A passes

EARLY12_B_SUFFICIENT
  R2 Task A passes
```

If both fail:

```text
NO_SINGLE_1P2S_HALF_SUFFICIENT
```

Fixed-decoder contribution:

```text
EARLY12_A_DECODER_CONTRIBUTES
  MASK_EARLY12_A meets material-loss rule

EARLY12_B_DECODER_CONTRIBUTES
  MASK_EARLY12_B meets material-loss rule
```

The strongest distributed finding:

```text
EARLY24_DISTRIBUTED_ACROSS_1P2S_HALVES
```

requires all:

1. R0 EARLY24 Task A PASS,
2. R1 EARLY12_A Task A FAIL,
3. R2 EARLY12_B Task A FAIL,
4. MASK_EARLY12_A material loss,
5. MASK_EARLY12_B material loss.

If exactly one sub-half independently passes, v15A10 outcome is
`SINGLE_1P2S_HALF_SUFFICIENCY_PRESENT` and any further subdivision requires a new
preregistration.

If both independently pass, outcome is `BOTH_1P2S_HALVES_SUFFICIENT`.

If neither passes and the two-mask distributed criterion is not met, outcome is
`1P2S_LOCALIZATION_INCONCLUSIVE`.

## Relationship to v15A8

v15A8 found no sufficient 600 ms W0..W7 window on its separate fresh cohort. v15A10
does not reuse those outcomes to tune this experiment. It tests the preregistered
hierarchical 1.2 s subdivision of the v15A9-passing EARLY24 region on new seeds.

## Forbidden inputs

Only standardized DN temporal features may enter the probe.

Forbidden:

```text
HP
maxHP
missingHP
damageTaken
impact count
economic class
potion count
effective healing
wasted healing / overheal
heal utilization
survival probability
shouldDrink
correct action
seed
impact side
impact schedule/timestamps
```

## Forbidden post-hoc changes

Do not:

- change the 287xxxx cohort,
- move the frame-12 split,
- add overlap or shifted windows,
- inspect LATE24 as a rescue,
- merge arbitrary 600 ms windows,
- change top-256,
- change normalization,
- change classifier hyperparameters,
- change the 70/60/+20pp representation gate,
- change the 10pp material-loss threshold,
- change bootstrap seed/iterations/CI rule,
- alter masking after seeing results,
- increase impact drive/pulse,
- extend history,
- remove failed samples,
- use Task B to select a region,
- deploy any probe as runtime POTION policy.

## v15B

**BLOCKED regardless of outcome.**

Existing MOVE v7, ATTACK v10F, JUMP v11H2, and v14C remain unchanged.
