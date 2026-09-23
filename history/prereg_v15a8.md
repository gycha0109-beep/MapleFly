# prereg_v15a8 — endpoint-aligned temporal localization

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / OUTCOME**

v15A7 replicated the coarse CONCAT48 injury-burden signal on fresh seeds and
preregisteredly demonstrated material contributions from common absolute temporal
alignment and cross-DN temporal phase / instantaneous population geometry.

v15A8 asks:

> where in the fixed endpoint-aligned 4.8 s DN history is the coarse 0/1-vs-2/3
> injury-burden information decodable, and is the population code transient or
> cross-temporally persistent?

v15A8 is a mechanistic localization experiment. It has **no v15B unlock authority**.
v15B remains BLOCKED regardless of outcome.

## Frozen biological / sensory contract

Unchanged from v15A4-v15A7:

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

Taste offer is identical in every original 0/1/2/3 state and independent of HP,
economic class, or correct action.

Per-frame feature remains:

```text
frame_feature[d,t] =
  clamp((DN_frame_Hz[d,t] - baseline_DN_Hz[d]) / 50, -1, +1)
```

## Fresh cohort

TRAIN base seeds:

```text
2850000
2850100
2850200
2850300
```

EVAL base seeds:

```text
2855000
2855100
2855200
```

Each base seed contains:

```text
6 replicates x original states 0/1/2/3
```

Therefore:

```text
TRAIN rows = 96
EVAL rows  = 72
```

Brain seed:

```text
baseSeed + replicate * 7 + 1
```

Impact schedule RNG:

```text
brainSeed + 500000
```

Within one (baseSeed, replicate) group, all four states share the same brain seed and
nested impact schedule.

The raw 48 x 1316 DN history is generated once per episode. FULL48, all eight windows,
all controls, and the cross-temporal matrix use that same history.

## Fixed temporal windows

The 4.8 s history is partitioned once into eight non-overlapping 600 ms windows.
No alternate window size or offset is permitted in v15A8.

```text
W0 frames  0.. 5   history 0.0..0.6 s   endpoint -4.8..-4.2 s
W1 frames  6..11   history 0.6..1.2 s   endpoint -4.2..-3.6 s
W2 frames 12..17   history 1.2..1.8 s   endpoint -3.6..-3.0 s
W3 frames 18..23   history 1.8..2.4 s   endpoint -3.0..-2.4 s
W4 frames 24..29   history 2.4..3.0 s   endpoint -2.4..-1.8 s
W5 frames 30..35   history 3.0..3.6 s   endpoint -1.8..-1.2 s
W6 frames 36..41   history 3.6..4.2 s   endpoint -1.2..-0.6 s
W7 frames 42..47   history 4.2..4.8 s   endpoint -0.6.. 0.0 s
```

Each window contains:

```text
6 frames x 1316 DN = 7896 relative temporal slots
```

Given the frozen impact-start set [25,55,85,115,145,175] brain steps and six-step
impact pulses, W7 (steps 210..239) contains no direct impact pulse. The identical
taste offer occupies only its final five brain steps (235..239). This fact is fixed
from the simulator schedule, not inferred from outcome.

W6 is not declared impact-free.

## FULL48 baseline

Before interpreting localization, v15A8 fits a fresh-cohort FULL48 procedure baseline:

```text
48 x 1316 = 63168 temporal slots
TRAIN all 0/1/2/3 states
label-blind variance top-256
TRAIN-only normalization
logistic probe
```

Primary Task A:

```text
0/1 impacts -> label 0
2/3 impacts -> label 1
```

Existing gate:

```text
balanced accuracy >= 70%
both class recalls      >= 60%
FULL - DN_SHUFFLED      >= 20 percentage points
```

If FULL48 Task A fails this gate:

```text
V15A8 = BASELINE_NOT_REPLICATED
```

Window and cross-temporal values remain recorded as diagnostics, but no strong temporal
localization/persistence inference is allowed.

## Window representation fitting

Each W0..W7 is fitted independently using TRAIN rows only.

For a window:

```text
relativeSlot = localFrame(0..5) * 1316 + dnSlot
7896 candidate slots
```

Across all 96 TRAIN rows and all original 0/1/2/3 states:

1. compute population mean for every candidate slot,
2. compute population variance for every candidate slot,
3. rank variance descending,
4. tie-break by lower relativeSlot,
5. select exactly top 256,
6. compute TRAIN-only population mean/std for selected slots.

Normalization:

```text
scale = max(population_stddev, 1e-6)
z = clamp((value - TRAIN_mean) / scale, -5, +5)
```

No task label, HP, impact count, economic class, EVAL row, or outcome is used for
selection or normalization.

Each fitted window representation stores its selected (localFrame, DN) coordinates,
variance, mean, scale, and SHA-256 in the artifact.

## Localization task

Task A is the only localization task with mechanistic interpretation authority:

```text
LOW  = original states 0/1
HIGH = original states 2/3
```

Each W0..W7 receives an independent logistic probe trained and evaluated within that
same window representation.

A window is called **LOCALIZED_PASS** only if it passes the unchanged gate:

```text
balanced accuracy >= 70%
both class recalls      >= 60%
FULL - DN_SHUFFLED      >= 20pp
```

No best-window selection is used to change the experiment or policy.

## Diagnostic nearest-boundary task

For audit continuity only, FULL48 and each W0..W7 also report:

```text
Task B
1 impact -> label 0
2 impacts -> label 1
```

It uses the same frozen classifier and gate, but it has no localization authority and
cannot determine which window is selected or interpreted. A Task-B PASS cannot unlock
v15B.

## Classifier

Every independent probe uses:

```text
epochs         240
learning rate  0.03
L2             0.001
threshold      0.5
weight init    0
bias init      0
order seed     2856000
```

No hyperparameter search.

## DN_SHUFFLED control

For each EVAL base seed, generate one fixed permutation of all 1316 DN identities:

```text
seed = baseSeed + 900000
```

For FULL48, selected (frame,DN) reads (frame, permutation[DN]).

For a window, selected (localFrame,DN) reads
(windowStart+localFrame, permutation[DN]).

The fitted selected coordinates, normalization, and model remain unchanged.

## LABEL_SHUFFLED control

Diagnostic only.

TRAIN labels are deterministically permuted:

```text
seed = 2857000 + representationIndex * 10 + taskIndex

representationIndex:
  FULL48 = 0
  W0..W7 = 1..8

taskIndex:
  A = 0
  B = 1
```

LABEL_SHUFFLED is not part of the gate.

## Cross-temporal decoding

Cross-temporal decoding is performed for Task A only.

For every train window Wi:

1. use Wi's TRAIN-only selected top-256 relative coordinates,
2. use Wi's TRAIN-only means/scales,
3. train the Wi Task-A logistic model,
4. evaluate that exact model on every test window Wj.

A selected Wi coordinate:

```text
(localFrame=k, DN=d)
```

is mapped at test window Wj to:

```text
absoluteFrame = Wj.startFrame + k
DN = d
```

Critically, test-window feature selection and test-window normalization are **not**
used for Wi->Wj. Wi's coordinate system and normalization are frozen across the row.

The artifact stores an 8x8 matrix of:

- balanced accuracy,
- both recalls,
- confusion matrix.

The diagonal Wi->Wi must exactly match that window's ordinary Task-A FULL evaluation;
the runner must assert this equality within floating-point tolerance.

## Preregistered persistence interpretation

Strong interpretation requires the FULL48 Task-A baseline gate to pass.

A directed cross-temporal edge Wi->Wj is called **GENERALIZES** when:

```text
balanced accuracy >= 70%
both recalls      >= 60%
```

DN_SHUFFLED is not recomputed for every off-diagonal edge; biological identity
specificity is established by each window's diagonal localization gate and by the
FULL48 baseline. Therefore an off-diagonal edge alone is never called localized.

A **PERSISTENT_ADJACENT_PAIR** exists for adjacent Wi,W(i+1) only when:

1. both diagonal windows are LOCALIZED_PASS,
2. Wi -> W(i+1) GENERALIZES,
3. W(i+1) -> Wi GENERALIZES.

If at least one such pair exists, v15A8 may state that the data support a
cross-temporally persistent burden code across that specific adjacent 1.2 s span.

A **DYNAMIC_LOCALIZED_PATTERN** is recorded when:

1. at least two windows are LOCALIZED_PASS,
2. no adjacent pair of LOCALIZED_PASS windows satisfies bidirectional GENERALIZES.

This means decodable burden information appears in multiple windows but the
preregistered adjacent cross-temporal persistence criterion is not met. It does not
prove a uniquely dynamic neural code.

If only one window passes, the result is **SINGLE_WINDOW_LOCALIZATION**.

If no window passes while FULL48 passes, the result is
**DISTRIBUTED_MULTIWINDOW_SIGNAL**: the coarse signal requires information distributed
across windows at this 600 ms resolution under the frozen top-256 procedure.

## W7 interpretation

If FULL48 passes and W7 is LOCALIZED_PASS, v15A8 may state:

> coarse injury-burden information remains decodable during the final 600 ms window,
> which contains no direct impact pulse under the frozen schedule.

This does not by itself prove biological memory, recurrence, or a specific storage
mechanism; prior network state and the identical taste offer may contribute.

## Forbidden probe inputs

Only standardized DN temporal features are permitted.

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
impact timestamps/schedule
```

Seeds/schedules may be used only for deterministic simulation, pairing, controls, and
audit metadata.

## v15B status

**v15B remains BLOCKED regardless of v15A8 outcome.**

No FULL48/window/cross-temporal classifier from this experiment may be deployed as the
runtime POTION policy.

If FULL48 replicates, v15A8 determines the next mechanistic experiment:

- W7 pass or persistent late pair -> separately preregister late-state causal/necessity test,
- multiple localized but nonpersistent windows -> investigate dynamic trajectory,
- FULL48 pass with zero window passes -> separately preregister multi-window necessity test,
- FULL48 fail -> return to CONCAT48 seed/generalization stability.

## Forbidden post-hoc changes

After this preregistration is committed, do not:

- change the 285xxxx cohort,
- change 600 ms window size,
- change window offsets or overlap windows,
- merge W6+W7 after seeing results,
- add 300/400/800 ms windows,
- change top-256,
- change normalization,
- change classifier hyperparameters,
- change the 70% / 60% / +20pp diagonal gate,
- change cross-temporal GENERALIZES thresholds,
- change persistence definition,
- increase impact drive/pulse,
- extend history beyond 4.8 s,
- remove failed windows/samples,
- select a window using Task B,
- use any probe as runtime POTION policy.

Existing deployed MOVE v7, ATTACK v10F, JUMP v11H2, and v14C remain unchanged.
