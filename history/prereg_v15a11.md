# prereg_v15a11 — recursive EARLY12_A 600 ms localization

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / OUTCOME**

v15A10 replicated EARLY24 and established independent Task-A sufficiency for only the
first fixed 1.2 s sub-half:

```text
EARLY24    PASS
EARLY12_A  PASS
EARLY12_B  FAIL
```

Neither EARLY24 fixed-decoder sub-half mask met the frozen material-loss rule.

v15A11 performs one final hierarchical bisection of the passing EARLY12_A interval:

> can either fixed 600 ms half independently retain the coarse injury-burden signal,
> and does the trained EARLY12_A decoder materially rely on either half?

This experiment is also an explicit fresh-cohort check against the earlier v15A8
observation that no single 600 ms window passed. It is not allowed to erase or replace
that prior negative result.

v15A11 has **no v15B unlock authority**.

## Frozen biological / sensory contract

Unchanged from v15A4-v15A10:

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

The complete trajectory is generated exactly as before. Only the exposed temporal
slots differ between representations.

## Fresh cohort

TRAIN:

```text
2880000
2880100
2880200
2880300
```

EVAL:

```text
2885000
2885100
2885200
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

## Fixed recursive split

Only v15A10's passing EARLY12_A region is considered.

```text
R0 EARLY12_A
  frames 0..11
  endpoint -4.8..-3.6 s
  12 x 1316 candidate slots

R1 EARLY6_A
  frames 0..5
  endpoint -4.8..-4.2 s
  6 x 1316 candidate slots

R2 EARLY6_B
  frames 6..11
  endpoint -4.2..-3.6 s
  6 x 1316 candidate slots
```

No other 600 ms window, offset, overlap, combination, or LATE region is searched.

## Representation fitting

R0/R1/R2 are independently fitted from all 96 TRAIN rows and all four original states.

For each candidate temporal slot:

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

No labels, HP, impact count, economic class, EVAL rows, or outcomes enter feature
selection.

R0 stores the number of selected coordinates in EARLY6_A versus EARLY6_B.

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

Task B cannot select a region, rescue Task A, or unlock v15B.

## Classifier

```text
binary logistic
epochs         240
learning rate  0.03
L2             0.001
threshold      0.5
weight init    0
bias init      0
order seed     2886000
```

No hyperparameter search.

## Representation gate

For every representation/task:

```text
balanced accuracy >= 70%
both class recalls      >= 60%
FULL - DN_SHUFFLED      >= 20pp
```

R0 EARLY12_A Task A is the baseline replication gate.

If R0 fails:

```text
V15A11 = BASELINE_NOT_REPLICATED
```

No strong 600 ms inference is allowed.

## DN_SHUFFLED

For each EVAL base seed:

```text
seed = baseSeed + 900000
```

One fixed permutation of all 1316 DN identities; temporal frame identity remains
unchanged.

## LABEL_SHUFFLED

Diagnostic only:

```text
seed = 2887000 + representationIndex * 10 + taskIndex
```

Not part of the gate.

## Fixed EARLY12_A decoder 600 ms ablations

Task A only.

After R0 EARLY12_A is fitted and its Task-A model trained, evaluate the exact frozen
model under two EVAL-only mean masks.

### MASK_EARLY6_A

Selected R0 features from frames 0..5:

```text
standardized feature := 0
```

Frames 6..11 remain untouched.

### MASK_EARLY6_B

Selected R0 features from frames 6..11:

```text
standardized feature := 0
```

Frames 0..5 remain untouched.

No retraining, reselection, or renormalization after masking.

## Paired bootstrap material-loss rule

EVAL has 18 paired groups:

```text
3 base seeds x 6 replicates
```

Each retains all four original states.

For each mask:

```text
iterations = 2000
seed       = 2889000
delta      = BA(R0 EARLY12_A) - BA(masked)
95% percentile CI
```

A 600 ms half is MATERIAL_DECODER_CONTRIBUTION only if:

1. R0 Task A passes,
2. point delta >=10pp,
3. bootstrap 95% CI lower bound >0.

## Preregistered interpretation

Strong interpretation requires R0 EARLY12_A Task A PASS.

Independent sufficiency:

```text
EARLY6_A_SUFFICIENT
  R1 Task A passes

EARLY6_B_SUFFICIENT
  R2 Task A passes
```

If both fail:

```text
NO_SINGLE_600MS_HALF_SUFFICIENT
```

Fixed-decoder contribution:

```text
EARLY6_A_DECODER_CONTRIBUTES
  MASK_EARLY6_A meets material-loss rule

EARLY6_B_DECODER_CONTRIBUTES
  MASK_EARLY6_B meets material-loss rule
```

### Stable temporal-scale bracket

If R0 passes and both R1/R2 fail:

```text
EARLY12_SUFFICIENT_NO_600MS_SUFFICIENCY
```

This is consistent with v15A8's independent no-single-600ms result and brackets the
observed sufficient temporal scale, under this probe family, between a 600 ms single
window and the 1.2 s EARLY12_A interval.

No 300 ms recursive split is permitted from that outcome.

### 600 ms positive result

If exactly one or both 600 ms representations pass, the result is retained, but because
v15A8 previously found no passing 600 ms window on another cohort, it is classified:

```text
600MS_COHORT_INSTABILITY
```

unless the same 600 ms interval had also passed in v15A8.

A v15A11-only 600 ms PASS therefore does **not** authorize immediate subdivision to
300 ms. It requires an independent preregistered replication before any finer
localization.

### Distributed 600 ms contribution

If both independent 600 ms halves fail but both masks meet the material-loss rule:

```text
EARLY12_DISTRIBUTED_ACROSS_600MS_HALVES
```

This is compatible with, but stronger than, the temporal-scale bracket above.

## Stop rule for localization

v15A11 is the planned end of the recursive localization sequence unless a 600 ms
positive result independently replicates prior evidence.

After v15A11, do not continue shrinking windows merely to search for a PASS.

The next scientific axis should be action/reward relevance rather than finer temporal
feature engineering.

## Forbidden inputs

Probe input may contain only standardized DN temporal features.

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

- change the 288xxxx cohort,
- move the frame-6 split,
- add other 600 ms windows,
- add overlap or shifted windows,
- change top-256,
- change normalization,
- change classifier hyperparameters,
- change the 70/60/+20pp gate,
- change the 10pp material-loss threshold,
- change bootstrap seed/iterations/CI,
- alter masking after outcome,
- increase impact drive/pulse,
- extend history,
- remove failed samples,
- use Task B to select a region,
- continue to 300 ms without the stated replication condition,
- deploy any probe as runtime POTION policy.

## v15B

**BLOCKED regardless of outcome.**

Existing MOVE v7, ATTACK v10F, JUMP v11H2, and v14C remain unchanged.
