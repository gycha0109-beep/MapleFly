# prereg_v15a5 — reward-relevant POTION economic-state representation screen

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / OUTCOME**

v15A4 is preserved as a scientific FAIL. It showed:

```text
0 vs 1  63.9% balanced accuracy / +13.9pp DN margin  FAIL
1 vs 3  77.8% balanced accuracy / +27.8pp DN margin  PASS
0 vs 3 100.0% balanced accuracy / +50.0pp DN margin  PASS diagnostic
```

The next question is not whether first injury can be detected accurately and is not
whether exact impact count can be decoded.

The v15A5 question is:

> does the already-frozen v15A4 CONCAT48 DN representation contain enough
> information to distinguish potion-inefficient low-burden states from
> potion-efficient high-burden states, including the nearest economic boundary,
> on unseen seeds?

This is a representation screen only. No DRINK/WAIT reinforcement learner is
trained here and no diagnostic probe is deployed at runtime.

## Independent economic rationale

The existing MapleFly potion environment predates v15A5:

```text
max HP       100
contact hit  -10 HP
red potion   +30 nominal HP
```

For the controlled 0/1/2/3 recent-impact states:

```text
impacts  missing HP  effective heal  overheal  nominal heal utilized
0        0           0               30        0.0%
1        10          10              20        33.3%
2        20          20              10        66.7%
3        30          30              0         100.0%
```

Therefore a 50% nominal-heal-utilization boundary separates:

```text
LOW-VALUE   0 or 1 impacts   <=33.3% utilization / >=20 HP overheal
HIGH-VALUE  2 or 3 impacts   >=66.7% utilization / <=10 HP overheal
```

There is no class exactly at 50%.

This mapping exists only to define diagnostic targets. HP, missing HP, impact
count, effective healing, overheal, and utilization are forbidden probe inputs.

## Frozen biological source / sensory

Unchanged from v15A4:

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
```

Taste offer is identical in every 0/1/2/3 state and does not depend on HP,
impact count, economic class, or correct action.

## Frozen representation

v15A5 does not perform representation selection.

It uses the exact authoritative v15A4 representation object from:

```text
run       35808078481
head      65d4a402224b495f1aa340befa897828bfc96f37
artifact  10728751928
digest    sha256:a65c007102f9f56ed30edb4cc43806d0d29e9892f39ebe98fde7493bf55a464b
```

Representation contract:

```text
CONCAT48
48 x 100 ms = 4.8 s
selected temporal slots = 256
TRAIN-only means/scales = those frozen by v15A4
```

Canonical SHA-256 of the v15A4 artifact's JSON-stringified
`representation` object:

```text
dca322283c5e4f6ff106e17f882350408de1953856b0f47cdfa293edb24f0a91
```

Implementation must load that exact representation and verify this hash before
using any v15A5 row. It may not reselect features or refit normalization on
v15A5 data.

Per-frame feature remains:

```text
clamp((DN frame Hz - baseline DN Hz) / 50, -1, +1)
```

and frozen standardization remains clamped to [-5,+5].

## Tasks

### Required Task A — ECONOMIC_STATE

```text
original state 0 impacts -> LOW  -> label 0
original state 1 impact  -> LOW  -> label 0
original state 2 impacts -> HIGH -> label 1
original state 3 impacts -> HIGH -> label 1
```

This is the primary reward-relevant pooled economic-state test.

### Required Task B — ECONOMIC_BOUNDARY

```text
1 impact  -> LOW-side boundary  -> label 0
2 impacts -> HIGH-side boundary -> label 1
```

Task B prevents easy 0-vs-3 separation from manufacturing a pooled Task A PASS.
The nearest economic boundary must itself be separable.

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

Tasks C/D/E are reported only. They cannot rescue required Task A or B.

## Classifier

Every task uses an independent binary logistic probe with the same frozen
hyperparameters as v15A4:

```text
epochs         240
learning rate  0.03
L2             0.001
threshold      0.5
weight init    0
bias init      0
order seed     2826000
```

No hyperparameter search is permitted.

## Unseen dataset

TRAIN base seeds:

```text
2820000
2820100
2820200
2820300
```

EVAL base seeds:

```text
2825000
2825100
2825200
```

For every base seed:

```text
6 replicates x original states 0/1/2/3
```

Thus:

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

Within one replicate, all four original states share the same brain seed and
nested impact schedule, preserving the paired-noise design.

No v15A/v15A2/v15A3/v15A4 brain seed is reused.

## Controls

### DN_SHUFFLED

EVAL base-seed fixed DN-identity permutation within every temporal frame:

```text
baseSeed + 900000
```

The trained model, temporal frame order, and activity distribution remain
unchanged.

### LABEL_SHUFFLED

TRAIN task labels only are deterministically permuted:

```text
2827000 + taskIndex
```

LABEL_SHUFFLED is a sanity diagnostic and cannot rescue or fail the frozen gate.

## Metrics

Every task reports:

- FULL balanced accuracy
- both class recalls
- minimum class recall
- confusion matrix
- DN_SHUFFLED balanced accuracy
- FULL - DN_SHUFFLED margin
- LABEL_SHUFFLED balanced accuracy

Task A additionally reports, for each original 0/1/2/3 state, the distribution
of predicted P(HIGH): count, mean, median, minimum, and maximum.

Those per-state probabilities are interpretation diagnostics only. No monotonic
ordering is added to the PASS gate after results are observed.

## Frozen gate

Required Task A and Required Task B must each independently satisfy:

```text
FULL balanced accuracy >= 70%
both-class recall       >= 60%
FULL - DN_SHUFFLED      >= 20 percentage points
```

Overall:

```text
V15A5 PASS = Task A PASS && Task B PASS
```

Diagnostic Tasks C/D/E cannot rescue a required-task failure.

## Forbidden leakage

Probe input may contain only the exact frozen v15A4 256-dimensional standardized
CONCAT48 DN representation.

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

Those values may exist only in dataset construction, diagnostic target
construction, reward rationale, or audit metadata.

## Scientific interpretation boundary

PASS means only:

> the frozen MaleCNS CONCAT48 DN representation contains enough information for
> simple linear probes to distinguish the preregistered potion-economic
> low/high states and their nearest 1-vs-2 boundary on unseen seeds.

PASS does not mean:

- MaleCNS learned potion value,
- the fly knows HP,
- exact impact count is decoded,
- DRINK/WAIT has been learned,
- a diagnostic classifier may be used as runtime policy.

## Outcome handling

PASS:

- preserve v15A5 evidence separately,
- permit a new v15B preregistration,
- v15B may receive only the frozen raw DN temporal representation plus its own
  previous POTION motor history,
- v15B must learn DRINK/WAIT from outcome reward.

FAIL:

- v15B remains blocked,
- preserve the FAIL,
- do not change gate, seeds, history length, feature count, impact drive/pulse,
  normalization, or required-task definitions after observing results.

In either case the existing deployed MOVE v7, ATTACK v10F, JUMP v11H2, and v14C
interruption system remain unchanged.
