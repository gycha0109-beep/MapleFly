# prereg_v15a4 — pairwise injury-burden separability screen

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / OUTCOME**

v15A3 showed that corrected LgLG-family CONCAT48 contains nontrivial
impact-history information:

~~~text
FULL            55.6%
DN_SHUFFLED     29.2%
identity margin +26.4pp
~~~

but exact four-way 0/1/2/3 decoding failed its frozen gate.

v15A4 asks a narrower question that is sufficient for a later reward-only
POTION policy:

> does the raw CONCAT48 DN history distinguish both first injury from no
> injury and heavier recent injury from lighter recent injury?

The diagnostic classifiers themselves will not be deployed.
If this screen passes, v15B receives only the raw selected DN history.

## Frozen source / sensory

Same corrected contract as v15A3:

~~~text
connectome
  alextitonis/fly.ai
  95a3dbcb05241b0a5c07028ca8ad945b23fbbe6e

LgLG family
  cellsWithPrefix(meta, "LgLG", side)
  L=331 / R=338

impact
  drive 0.7
  6 steps = 120 ms

ground
  SNta_L/R = 0.05

taste offer
  LB3 + claw_tpGRN bilateral
  0.8
  final 5 steps = 100 ms
~~~

## Representation

Fixed before this run:

~~~text
CONCAT48
48 x 100 ms = 4.8 s
raw slots = 48 x 1316
~~~

Frame feature:

~~~text
clamp((DN frame Hz - baseline DN Hz) / 50, -1, +1)
~~~

One generic top-256 slot set is selected from **all four TRAIN classes
0/1/2/3 together** by unlabeled variance.

- label forbidden
- variance descending
- raw slot ascending tie break
- TRAIN-only standardization
- standardized clamp [-5,+5]

The same 256 slots / stats are used for every pairwise probe and control.

## Pairwise diagnostic tasks

Required Task A — injury presence:

~~~text
class 0 impacts -> label 0
class 1 impact  -> label 1
~~~

Required Task B — burden escalation:

~~~text
class 1 impact  -> label 0
class 3 impacts -> label 1
~~~

Diagnostic Task C — wide separation:

~~~text
class 0 impacts -> label 0
class 3 impacts -> label 1
~~~

Task C is reported only and is not a gate.

No class-2 label is used by the pairwise probes, but class-2 rows remain in
the unlabeled variance feature-selection pool.

## Classifier

Each task uses an independent binary logistic probe:

~~~text
epochs         240
learning rate  0.03
L2             0.001
threshold      0.5
weight init    0
bias init      0
order seed     2816000
~~~

## Unseen dataset

TRAIN base seeds:

~~~text
2810000
2810100
2810200
2810300
~~~

EVAL base seeds:

~~~text
2815000
2815100
2815200
~~~

For every base seed:

~~~text
6 replicates x 4 classes
~~~

Brain seed:

~~~text
baseSeed + replicate * 7 + 1
~~~

Impact schedule RNG:

~~~text
brainSeed + 500000
~~~

No v15A/v15A2/v15A3 brain seed is reused.

## Controls

DN_SHUFFLED:
fixed EVAL base-seed DN identity permutation within each frame.

~~~text
baseSeed + 900000
~~~

LABEL_SHUFFLED:
TRAIN task labels only, permutation seed:

~~~text
2817000 + taskIndex
~~~

reported as sanity diagnostic, not gate.

## Frozen gate

Both required tasks A and B must independently satisfy:

~~~text
FULL balanced accuracy >=70%
both-class recall       >=60%
FULL - DN_SHUFFLED      >=20pp
~~~

v15A4 PASS requires Task A PASS **and** Task B PASS.

Task C cannot rescue either required task.

## Scientific boundary

PASS means:

> the corrected frozen MaleCNS CONCAT48 DN history carries enough information
> for simple probes to separate no-vs-first injury and lighter-vs-heavier
> recent impact burden on unseen seeds.

PASS does not mean:

- runtime knows HP,
- runtime knows impact count,
- diagnostic labels may be used as POTION policy input,
- POTION value has been learned.

The future v15B policy may receive only the raw frozen 256-slot CONCAT48
representation plus its own motor history and must learn DRINK/WAIT from
outcome reward.

## Outcome handling

PASS:
- freeze CONCAT48 + selected 256 slots + TRAIN-only mean/std as the v15
  injury-history representation candidate.
- preregister v15B reward-only POTION learning on new seeds.

FAIL:
- v15B remains blocked.
- no post-hoc threshold / feature count / history / drive tuning.
