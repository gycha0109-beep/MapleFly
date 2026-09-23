# prereg_v15a9 — multi-window temporal necessity by fixed half-history bisection

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / OUTCOME**

v15A8 replicated FULL48 coarse 0/1-vs-2/3 injury-burden decoding on fresh seeds but
no preregistered 600 ms window passed the localization gate. Its frozen outcome was:

```text
DISTRIBUTED_MULTIWINDOW_SIGNAL
```

v15A9 asks a narrower mechanistic question:

> is the successful endpoint-aligned 4.8 s representation reducible to either fixed
> 2.4 s half, and does the trained FULL48 decoder materially rely on information from
> each half?

This is a hierarchical temporal-span / decoder-ablation experiment. It does not search
arbitrary window combinations.

v15A9 has **no v15B unlock authority**. v15B remains BLOCKED regardless of outcome.

## Frozen biological / sensory contract

Unchanged from v15A4-v15A8:

```text
connectome
  alextitonis/fly.ai
  95a3dbcb05241b0a5c07028ca8ad945b23fbbe6e

corrected LgLG family
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
  48 frames x 5 brain steps
  100 ms per frame
  4.8 s total
```

Per-frame feature:

```text
frame_feature[d,t] =
  clamp((DN_frame_Hz[d,t] - baseline_DN_Hz[d]) / 50, -1, +1)
```

## Fresh cohort

TRAIN:

```text
2860000
2860100
2860200
2860300
```

EVAL:

```text
2865000
2865100
2865200
```

Each base seed:

```text
6 replicates x states 0/1/2/3
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

The raw 48 x 1316 history is simulated once per episode and shared by all v15A9
representations and ablations.

## Fixed temporal bisection

The history is divided exactly once at the midpoint:

```text
EARLY24
  frames 0..23
  endpoint -4.8..-2.4 s

LATE24
  frames 24..47
  endpoint -2.4..0.0 s
```

No other split, overlap, offset, or hand-picked multi-window combination is permitted.

## Representations

Three independently fitted label-blind representations:

### R0 FULL48

```text
frames 0..47
48 x 1316 = 63168 candidate temporal slots
```

### R1 EARLY24

```text
frames 0..23
24 x 1316 = 31584 candidate temporal slots
```

### R2 LATE24

```text
frames 24..47
24 x 1316 = 31584 candidate temporal slots
```

For each representation independently, using all 96 TRAIN rows and all four original
states:

1. compute population mean per candidate temporal slot,
2. compute population variance,
3. rank variance descending,
4. tie-break by lower relative slot,
5. select exactly top 256,
6. compute TRAIN-only mean and population std.

Normalization:

```text
scale = max(population_stddev, 1e-6)
z = clamp((value - TRAIN_mean) / scale, -5, +5)
```

No labels, HP, impact count, economic class, EVAL rows, or outcomes enter selection.

The artifact must store selected coordinates, variances, means, scales, SHA-256, and
for R0 the count of selected slots belonging to EARLY24 vs LATE24.

## Tasks

### Task A — primary

```text
0/1 impacts -> label 0
2/3 impacts -> label 1
```

### Task B — diagnostic only

```text
1 impact -> label 0
2 impacts -> label 1
```

Task B cannot select a half, change an ablation, or unlock v15B.

## Classifier

Every independent representation/task probe:

```text
binary logistic
epochs         240
learning rate  0.03
L2             0.001
threshold      0.5
weight init    0
bias init      0
order seed     2866000
```

No hyperparameter search.

## Existing representation gate

Every independent representation/task reports:

```text
balanced accuracy >= 70%
both class recalls      >= 60%
FULL - DN_SHUFFLED      >= 20 percentage points
```

R0 FULL48 Task A is the baseline replication gate.

If R0 Task A fails:

```text
V15A9 = BASELINE_NOT_REPLICATED
```

and no strong half-history or necessity inference is permitted.

## DN_SHUFFLED

For each EVAL base seed:

```text
seed = baseSeed + 900000
```

One fixed permutation of all 1316 DN identities is used. Temporal frame identity is
preserved. The trained model and fitted representation remain unchanged.

## LABEL_SHUFFLED

Diagnostic only:

```text
seed = 2867000 + representationIndex * 10 + taskIndex

R0=0
R1=1
R2=2

Task A=0
Task B=1
```

Not part of the gate.

## FULL48 fixed-decoder half ablations

Task A only.

After R0 FULL48 is fitted and its Task-A model is trained, two EVAL-only ablations are
applied to that exact representation/model.

### A0 MASK_EARLY24

For every selected R0 feature whose absolute frame is 0..23:

```text
raw value := that feature's TRAIN mean
standardized value := 0
```

Selected R0 features in frames 24..47 remain untouched.

### A1 MASK_LATE24

For every selected R0 feature whose absolute frame is 24..47:

```text
raw value := TRAIN mean
standardized value := 0
```

Selected R0 features in frames 0..23 remain untouched.

No model retraining, feature reselection, or renormalization occurs after masking.

These ablations test **necessity for the trained FULL48 decoder**, not exclusive
biological necessity.

## Paired bootstrap material-loss rule

Task A ablations only.

EVAL has 18 paired groups:

```text
3 base seeds x 6 replicates
```

Each group retains all four original states.

Frozen bootstrap:

```text
iterations = 2000
seed       = 2869000
sample 18 paired groups with replacement
delta = BA(R0 FULL48) - BA(masked)
95% percentile CI
```

A half is called **MATERIAL_DECODER_CONTRIBUTION** only if:

1. R0 Task A passes the baseline gate,
2. point delta >= 10 percentage points,
3. bootstrap 95% CI lower bound > 0.

Unlike independent half representations, masked evaluations do not use the
DN_SHUFFLED gate; they are fixed-model ablations.

## Preregistered interpretation

Strong interpretation requires R0 FULL48 Task A PASS.

### Half sufficiency

```text
EARLY24_SUFFICIENT
  R1 Task A passes the existing representation gate

LATE24_SUFFICIENT
  R2 Task A passes the existing representation gate
```

If both R1 and R2 fail while R0 passes:

```text
NO_SINGLE_HALF_SUFFICIENT
```

This means neither fixed 2.4 s half is sufficient under the frozen top-256 procedure.
It does not prove every temporal region is individually necessary.

### Fixed-decoder contribution

```text
EARLY24_DECODER_CONTRIBUTES
  MASK_EARLY24 satisfies material-loss rule

LATE24_DECODER_CONTRIBUTES
  MASK_LATE24 satisfies material-loss rule
```

If both hold:

```text
BOTH_HALVES_DECODER_CONTRIBUTE
```

This means the trained FULL48 decoder materially relies on selected information from
both temporal halves.

### Combined distributed-span finding

The strongest preregistered v15A9 conclusion:

```text
CROSS_HALF_DISTRIBUTED_CODE_SUPPORTED
```

requires all of:

1. R0 FULL48 Task A PASS,
2. R1 EARLY24 Task A FAIL,
3. R2 LATE24 Task A FAIL,
4. MASK_EARLY24 material loss,
5. MASK_LATE24 material loss.

This supports a representation distributed across the fixed -4.8..-2.4 s and
-2.4..0 s halves under this decoder family. It does not establish a unique neural
mechanism.

If one independent half passes, the next localization experiment must recurse only
through a separately preregistered fixed subdivision; v15A9 itself does not subdivide.

## Forbidden inputs

Probe input may contain only selected standardized DN temporal features.

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

## v15B status

**v15B remains BLOCKED regardless of v15A9 outcome.**

No v15A9 classifier may become the runtime POTION policy.

## Forbidden post-hoc changes

After this preregistration is committed, do not:

- change the 286xxxx cohort,
- move the 24-frame split,
- add quarters or arbitrary window combinations,
- add overlap,
- change top-256,
- change normalization,
- change classifier hyperparameters,
- change the 70% / 60% / +20pp representation gate,
- change the 10pp material-loss threshold,
- change bootstrap seed/iterations/CI rule,
- replace mean masking with another ablation after seeing results,
- increase impact drive/pulse,
- extend history,
- remove failed samples,
- use Task B to select a region,
- use any probe as runtime POTION policy.

Existing deployed MOVE v7, ATTACK v10F, JUMP v11H2, and v14C remain unchanged.
