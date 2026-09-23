# prereg_v15a7 — temporal carrier decomposition of POTION injury-burden signal

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / OUTCOME**

v15A5 established a coarse CONCAT48 economic-state signal on its fresh cohort but
failed the nearest 1-vs-2 boundary. v15A6 then replaced temporal structure with a
single 4.8 s mean per DN (POOL48) and all screens were near chance.

v15A7 asks a mechanistic representation question:

> which temporal property of the 4.8 s MaleCNS descending-neuron history carries the
> coarse injury-burden signal: absolute alignment, temporal order, or cross-DN phase?

v15A7 is **not** a v15B unlock experiment. No outcome of v15A7, including a strong
1-vs-2 diagnostic, directly permits v15B. v15B remains BLOCKED after this experiment.

## Frozen biological / sensory contract

Unchanged from v15A4-v15A6:

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

Per-frame feature is unchanged:

```text
frame_feature[d,t] =
  clamp((DN_frame_Hz[d,t] - baseline_DN_Hz[d]) / 50, -1, +1)
```

## Fresh cohort

TRAIN base seeds:

```text
2840000
2840100
2840200
2840300
```

EVAL base seeds:

```text
2845000
2845100
2845200
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

Within one (baseSeed, replicate) group, all four original states share the same brain
seed and nested impact schedule.

The raw 48 x 1316 history is generated once per episode and is shared by every
representation/control below. No representation receives a separately simulated brain
trajectory.

## Representations

All four representations retain 48 x 1316 scalar values. They differ only in how
temporal indices are mapped before label-blind feature fitting.

### R0 — FULL_CONCAT48

Identity transform:

```text
X'[t,d] = X[t,d]
```

This is the fresh-cohort CONCAT48 **procedure baseline**. For fair comparison with the
transformed representations, its top-256 slots and normalization are fitted from the
v15A7 TRAIN cohort. It is therefore not claimed to be an exact frozen-feature replay
of the v15A5/v15A4 representation object.

### R1 — WHOLE_FRAME_CIRCULAR_SHIFT

For each paired (baseSeed, replicate) group, draw one deterministic non-zero shift
`s in [1,47]`. The same shift is used for all four original states and all DNs:

```text
X'[t,d] = X[(t - s) mod 48, d]
```

Seed:

```text
baseSeed + replicate * 1009 + 2848100
```

This preserves cyclic temporal order and within-frame population geometry while
destroying a common absolute frame alignment to the decision/taste endpoint.

### R2 — WHOLE_FRAME_PERMUTATION

For each paired (baseSeed, replicate) group, generate one Fisher-Yates permutation
`p` of frames 0..47. The same permutation is used for all four states and all DNs:

```text
X'[t,d] = X[p[t],d]
```

Seed:

```text
baseSeed + replicate * 1009 + 2848200
```

This preserves each instantaneous 1316-D population snapshot and the multiset of
frames while destroying absolute temporal alignment and frame order.

### R3 — INDEPENDENT_DN_CIRCULAR_SHIFT

For each paired (baseSeed, replicate) group, generate an independent non-zero circular
shift for every DN. The 1316 shifts are generated in ascending DN-slot order from one
deterministic RNG stream:

```text
s[d] in [1,47]
X'[t,d] = X[(t - s[d]) mod 48, d]
```

Seed:

```text
baseSeed + replicate * 1009 + 2848300
```

The same per-DN shift vector is used for all four original states in that paired group.

This preserves each DN's own cyclic temporal trajectory but destroys common cross-DN
phase/alignment and instantaneous population geometry.

## Label-blind representation fitting

Each representation R0/R1/R2/R3 is fitted **independently**, using TRAIN rows only.

Flatten transformed history:

```text
rawSlot = frame * 1316 + dnSlot
63,168 total temporal slots
```

Across all 96 TRAIN rows and all original 0/1/2/3 states:

1. compute population mean for every rawSlot,
2. compute population variance for every rawSlot,
3. rank by variance descending,
4. tie-break by lower rawSlot,
5. select exactly top 256,
6. compute TRAIN-only mean and population standard deviation for those 256 slots.

Normalization:

```text
scale = max(population_stddev, 1e-6)
z = clamp((value - TRAIN_mean) / scale, -5, +5)
```

No task label, economic class, HP, impact count, EVAL row, or task-specific outcome is
used for feature selection or normalization.

The exact selected slots, variances, means, scales, and SHA-256 of each fitted
representation object must be written to the evidence artifact.

## Tasks

The same five tasks are run independently on every representation.

### Task A — ECONOMIC_STATE — primary mechanistic task

```text
0/1 impacts -> label 0
2/3 impacts -> label 1
```

### Task B — ECONOMIC_BOUNDARY — diagnostic

```text
1 impact -> label 0
2 impacts -> label 1
```

### Task C — WIDE_ANCHOR — diagnostic

```text
0 impacts -> label 0
3 impacts -> label 1
```

### Task D — WITHIN_LOW — diagnostic

```text
0 impacts -> label 0
1 impact  -> label 1
```

### Task E — WITHIN_HIGH — diagnostic

```text
2 impacts -> label 0
3 impacts -> label 1
```

Only Task A determines whether the fresh-cohort R0 baseline is strong enough for
mechanistic carrier inference. Tasks B-E remain diagnostics and cannot unlock v15B.

## Classifier

Independent binary logistic probe for every representation x task.

Frozen hyperparameters:

```text
epochs         240
learning rate  0.03
L2             0.001
threshold      0.5
weight init    0
bias init      0
order seed     2846000
```

No hyperparameter search is permitted.

## Per-task gate

For reporting continuity, every representation x task reports the existing gate:

```text
FULL balanced accuracy >= 70%
both class recalls      >= 60%
FULL - DN_SHUFFLED      >= 20 percentage points
```

Task A on R0 is the **baseline replication gate**.

If R0 Task A fails this gate, v15A7 outcome is:

```text
BASELINE_NOT_REPLICATED
```

and no strong carrier inference may be made from R1/R2/R3.

## DN_SHUFFLED control

For each EVAL base seed, generate one fixed permutation of all 1,316 DN identities:

```text
seed = baseSeed + 900000
```

DN_SHUFFLED is applied **after the temporal representation transform**: a selected
transformed slot (t,d) reads the transformed activity of (t, permutation[d]).

For R3 this means the source DN retains its own preregistered per-DN temporal shift.

The trained model, selected temporal slots, TRAIN normalization, and all other
quantities remain unchanged.

## LABEL_SHUFFLED control

TRAIN task labels are deterministically permuted separately for each representation x
task:

```text
seed = 2847000 + representationIndex * 10 + taskIndex
representationIndex: R0=0 R1=1 R2=2 R3=3
taskIndex: A=0 B=1 C=2 D=3 E=4
```

LABEL_SHUFFLED is diagnostic and is not part of the frozen gate.

## Paired bootstrap degradation analysis

Task A only.

The EVAL set contains 18 paired groups:

```text
3 base seeds x 6 replicates
```

Each group contains all four original states. Bootstrap resampling operates on these
18 groups, preserving the four-state group intact.

Frozen procedure:

```text
iterations = 2000
seed       = 2849000
sample 18 paired groups with replacement per iteration
compute balanced accuracy for R0 and Rx on the same resample
delta = BA(R0) - BA(Rx)
report point delta and percentile 95% CI [2.5%, 97.5%]
```

A transformed representation Rx is called a **material carrier loss** only if all are
true:

1. R0 Task A passes the baseline replication gate,
2. Rx Task A fails the same gate,
3. point delta BA(R0)-BA(Rx) >= 10 percentage points,
4. paired-bootstrap 95% CI lower bound > 0.

The 10pp criterion and CI rule are frozen before outcome inspection.

## Mechanistic interpretation rules

Strong interpretation is allowed only when R0 Task A passes.

### Absolute alignment contribution

If R1 is a material carrier loss:

> common absolute temporal alignment to the endpoint contributes materially to the
> coarse economic-state signal.

### Temporal-order contribution beyond absolute alignment

If R1 is **not** a material carrier loss but R2 **is**:

> temporal frame order contributes materially beyond common absolute alignment.

### Cross-DN phase contribution

If R3 is a material carrier loss:

> cross-DN temporal phase / instantaneous population geometry contributes materially
> to the coarse economic-state signal.

These statements mean "contributes"; they do not establish exclusivity or a unique
causal code.

If R0 passes but none of R1/R2/R3 meets the material-loss rule, v15A7 records that
these controls did not localize the carrier.

## Forbidden leakage

Probe input may contain only the selected 256 standardized DN temporal features from
the preregistered representation transform.

Forbidden as feature/policy input:

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
impact schedule / timestamps
```

Seeds and schedules may exist only for deterministic simulation, pairing, transforms,
controls, and audit metadata.

## v15B status

**v15B remains BLOCKED regardless of v15A7 outcome.**

v15A7 is a representation-mechanism experiment only. It cannot directly authorize
DRINK/WAIT learning.

If R0 replicates and a temporal carrier is localized, the next permitted scientific
step is a separately preregistered temporal-localization experiment (v15A8).

If R0 does not replicate, the next step must investigate CONCAT48 seed/generalization
stability rather than adding more representation complexity.

## Forbidden post-hoc changes

After this preregistration is committed, do not:

- change the 284xxxx cohort,
- change any transform seed/formula,
- add/remove a temporal transform after seeing results,
- choose the best of multiple unregistered shift/permutation variants,
- change top-256,
- change classifier hyperparameters,
- change the 70% / 60% / +20pp gate,
- change the 10pp material-loss criterion,
- change bootstrap iterations/seed/CI rule,
- increase impact drive/pulse,
- extend history beyond 4.8 s,
- remove failed tasks/samples,
- use a diagnostic classifier as runtime POTION policy.

Existing deployed MOVE v7, ATTACK v10F, JUMP v11H2, and v14C remain unchanged.
