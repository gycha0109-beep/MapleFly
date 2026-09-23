# prereg_v15a6 — temporal-integration POTION economic-boundary representation screen

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / OUTCOME**

v15A5 is preserved as a scientific FAIL. Its required pooled economic-state task passed,
but the nearest 1-vs-2 economic boundary did not:

```text
Task A  0/1 vs 2/3  80.6% balanced accuracy / +30.6pp DN margin  PASS
Task B  1   vs 2    63.9% balanced accuracy / +13.9pp DN margin  FAIL
```

Diagnostics also showed weak adjacent-state resolution while the wide 0-vs-3 anchor
was strong. v15B therefore remains blocked.

The v15A6 hypothesis is:

> recent injury burden is distributed across time within the 4.8 s MaleCNS DN history,
> so label-blind temporal integration per DN may preserve cumulative burden while
> reducing schedule-position noise that harms adjacent-state separation.

This is a new representation hypothesis. It does not lower a gate, increase sensory
drive, extend history, increase feature count, change the economic boundary, or reuse
v15A5 outcomes to select features.

No DRINK/WAIT reinforcement learner is trained here and no diagnostic probe is
deployed at runtime.

## Frozen biological source / sensory contract

Unchanged from v15A4/v15A5:

```text
connectome
  alextitonis/fly.ai
  95a3dbcb05241b0a5c07028ca8ad945b23fbbe6e

LgLG family
  cellsWithPrefix(meta, "LgLG", side)
  L=331 / R=338

impact
  drive 0.7
  pulse 6 steps = 120 ms

ground
  SNta_L/R = 0.05

taste offer
  LB3 + claw_tpGRN bilateral
  drive 0.8
  final 5 steps = 100 ms

history
  48 frames x 100 ms = 4.8 s
```

Taste offer is identical in every 0/1/2/3 state and is independent of HP, impact
count, economic class, or correct action.

The paired nested impact schedule is unchanged in form from v15A5.

## New representation — POOL48

The only scientific representation change is temporal integration.

Per-frame DN feature remains:

```text
frame_feature[d,t] =
  clamp((DN_frame_Hz[d,t] - baseline_DN_Hz[d]) / 50, -1, +1)
```

For each of the 1,316 descending neurons:

```text
POOL48[d] = mean(frame_feature[d,0..47])
```

Thus timing within the 4.8 s window is discarded while DN identity is preserved.

### Label-blind feature selection

Feature selection uses **TRAIN rows only**, pooled across all original 0/1/2/3 states.

For each DN, compute population variance of its raw POOL48 value across all 96 TRAIN
rows. Select the 256 DNs with highest variance.

Tie break is frozen:

```text
higher variance first
then lower DN slot index first
```

Labels, economic classes, HP, impact count, and EVAL rows are not consulted.

### TRAIN-only normalization

For each selected DN, compute mean and population standard deviation from all 96 TRAIN
rows only.

```text
scale = max(population_stddev, 1e-6)
standardized = clamp((POOL48 - TRAIN_mean) / scale, -5, +5)
```

The same selected DN identities, means, and scales are used for every task and every
EVAL/control probe.

No task-specific feature selection or normalization is permitted.

## Independent economic rationale

Existing environment economics remain:

```text
max HP       100
contact hit  -10 HP
red potion   +30 nominal HP
```

Controlled states imply:

```text
impacts  missing HP  nominal heal utilized
0        0           0.0%
1        10          33.3%
2        20          66.7%
3        30          100.0%
```

The frozen 50% utilization boundary therefore remains between 1 and 2 impacts:

```text
LOW-VALUE   0/1 impacts
HIGH-VALUE  2/3 impacts
```

These quantities define targets/rationale only. They are forbidden probe inputs.

## Tasks

### Required Task A — ECONOMIC_STATE

```text
0/1 impacts -> LOW  -> label 0
2/3 impacts -> HIGH -> label 1
```

### Required Task B — ECONOMIC_BOUNDARY

```text
1 impact -> LOW-side boundary  -> label 0
2 impacts -> HIGH-side boundary -> label 1
```

Task B remains required and cannot be rescued by Task A.

### Diagnostic Task C — WIDE_ANCHOR

```text
0 impacts -> label 0
3 impacts -> label 1
```

### Diagnostic Task D — WITHIN_LOW

```text
0 impacts -> label 0
1 impact  -> label 1
```

### Diagnostic Task E — WITHIN_HIGH

```text
2 impacts -> label 0
3 impacts -> label 1
```

Diagnostics cannot rescue a required-task failure.

## Classifier

Each task uses an independent binary logistic probe.

Frozen hyperparameters:

```text
epochs         240
learning rate  0.03
L2             0.001
threshold      0.5
weight init    0
bias init      0
order seed     2836000
```

No hyperparameter search is permitted.

## Fresh unseen dataset

TRAIN base seeds:

```text
2830000
2830100
2830200
2830300
```

EVAL base seeds:

```text
2835000
2835100
2835200
```

For every base seed:

```text
6 replicates x original states 0/1/2/3
```

Therefore:

```text
TRAIN rows 96
EVAL rows  72
```

Brain seed:

```text
baseSeed + replicate * 7 + 1
```

Impact schedule RNG:

```text
brainSeed + 500000
```

Within one replicate, all four states share the same brain seed and nested impact
schedule. No v15A5 base seed is reused.

## Controls

### DN_SHUFFLED

For each EVAL base seed, construct one fixed permutation of all 1,316 DN identities:

```text
baseSeed + 900000
```

Before selected-DN extraction, replace each selected DN identity with the permuted raw
DN identity while keeping the trained model, selected slot positions, normalization,
activity values, and pooled temporal structure otherwise unchanged.

This destroys the selected DN identity mapping without changing the per-row pooled
activity distribution.

### LABEL_SHUFFLED

TRAIN task labels only are deterministically permuted:

```text
2837000 + taskIndex
```

LABEL_SHUFFLED is a sanity diagnostic and does not participate in the frozen gate.

## Metrics

Every task reports:

- FULL balanced accuracy
- both class recalls
- minimum class recall
- confusion matrix
- DN_SHUFFLED balanced accuracy
- FULL - DN_SHUFFLED margin
- LABEL_SHUFFLED balanced accuracy

Task A additionally reports P(HIGH) by original 0/1/2/3 state: count, mean, median,
minimum, and maximum. This is interpretation-only and does not alter the gate.

The artifact must also record the exact selected 256 DN slot indices, TRAIN variances,
means, and scales so the POOL48 representation can be independently audited and hashed
after the run.

## Frozen gate

Required Task A and Required Task B must each independently satisfy:

```text
FULL balanced accuracy >= 70%
both-class recall       >= 60%
FULL - DN_SHUFFLED      >= 20 percentage points
```

Overall:

```text
V15A6 PASS = Task A PASS && Task B PASS
```

Diagnostic Tasks C/D/E cannot rescue a required-task failure.

## Forbidden leakage

Probe input may contain only the 256-dimensional standardized POOL48 DN representation
defined above.

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

These values may exist only in controlled dataset construction, target construction,
economic rationale, or audit metadata.

## Scientific interpretation boundary

PASS means only:

> under the preregistered fresh-seed screen, temporally pooled frozen-MaleCNS DN
> activity contains enough information for simple linear probes to distinguish both
> the potion-economic low/high states and the nearest 1-vs-2 boundary.

PASS would support the specific hypothesis that temporal integration improves the
reward-relevant representation of cumulative injury burden.

PASS does not mean:

- MaleCNS learned potion value,
- the fly knows HP,
- exact impact count is decoded,
- DRINK/WAIT has been learned,
- the probe may be used as runtime policy.

FAIL means the preregistered POOL48 representation did not establish sufficient local
economic-boundary resolution. A coarse Task A PASS cannot rescue Task B.

## Outcome handling

PASS:

- freeze v15A6 evidence separately,
- permit a new v15B preregistration,
- do not deploy the diagnostic classifier as policy,
- v15B decision opportunity/taste offer must remain HP-independent,
- v15B policy input may contain only frozen DN temporal representation plus its own
  previous POTION motor history,
- DRINK/WAIT must be learned from reward/outcome.

FAIL:

- v15B remains blocked,
- preserve the FAIL,
- do not lower gates or post-hoc change top-256, 4.8 s history, impact drive/pulse,
  fresh seeds, required tasks, or classifier hyperparameters to manufacture PASS.

In either outcome, deployed MOVE v7, ATTACK v10F, JUMP v11H2, and v14C interruption
remain unchanged.
