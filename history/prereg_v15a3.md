# prereg_v15a3 — corrected injury-history DN representation screen

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / OUTCOME**

v15A exact-name LgLG screen was invalidated by an empty sensory group.
v15A2 then established that the pinned MaleCNS family mapping:

~~~text
cellsWithPrefix(meta, "LgLG", side)
L=331 / R=338
~~~

produces robust DN spike propagation at the original 0.7 / 120 ms stimulus.

v15A3 repeats the original scientific question on unseen seeds:

> can recent 0/1/2/3 corrected LgLG impact history be decoded from frozen
> MaleCNS DN temporal activity without HP / damage counter input?

## Frozen source / sensory

~~~text
connectome
  alextitonis/fly.ai
  95a3dbcb05241b0a5c07028ca8ad945b23fbbe6e

ground
  SNta_L = 0.05
  SNta_R = 0.05

impact mapping
  cellsWithPrefix(meta, "LgLG", side)
  expected L=331 / R=338

impact drive
  0.7

impact pulse
  6 steps = 120 ms

taste offer
  LB3 + claw_tpGRN
  bilateral 0.8
  final 5 steps = 100 ms
~~~

Taste offer is identical in all classes and independent of impact count.

## Timing / classes

~~~text
settle            26
baseline          26
history frames    48
frame steps       5
history duration  4.8 s

impact candidate starts
25 / 55 / 85 / 115 / 145 / 175

classes
0 / 1 / 2 / 3 impacts
~~~

Same replicate across the four classes shares one brain seed.
The class N impact schedule is the first N items from one deterministic
shuffled candidate list, so schedules are nested and shared-event side is
paired.

## Feature

Each 100 ms frame:

~~~text
x = clamp((DN frame Hz - baseline DN Hz) / 50, -1, +1)
~~~

Candidate representations only:

~~~text
CURRENT   1 frame
CONCAT12  12 frames
CONCAT24  24 frames
CONCAT48  48 frames
~~~

Each representation independently selects unlabeled TRAIN variance top-256
temporal slots.

Selection:

- variance descending
- tie raw slot ascending
- labels forbidden
- fewer than 256 nonzero-variance slots -> representation FAIL

TRAIN-only mean/std standardization, std <1e-6 -> 1, standardized clamp [-5,+5].

## Diagnostic classifier

4-class linear softmax:

~~~text
epochs         240
learning rate  0.03
L2             0.001
optimizer      full-batch gradient descent
weight init    0
bias init      0
order seed     2806000
~~~

## Unseen dataset

TRAIN:

~~~text
2800000
2800100
2800200
2800300

6 replicates x 4 classes x 4 seeds = 96 rows
~~~

EVAL:

~~~text
2805000
2805100
2805200

6 replicates x 4 classes x 3 seeds = 72 rows
~~~

Brain seed:

~~~text
baseSeed + replicate * 7 + 1
~~~

Schedule RNG:

~~~text
brainSeed + 500000
~~~

No v15A or v15A2 brain seed is reused.

## Controls

FULL:
normal DN identity.

DN_SHUFFLED:
EVAL base-seed fixed DN permutation within each temporal frame.

~~~text
permutation seed = baseSeed + 900000
~~~

LABEL_SHUFFLED:
TRAIN labels only, deterministic permutation seed `2807000`.
Sanity diagnostic only; not a gate.

## Frozen gate

Representation PASS requires:

~~~text
FULL balanced accuracy       >=65%
every-class recall           >=50%
FULL - DN_SHUFFLED           >=20pp
~~~

Selection:

~~~text
shortest PASS:
CURRENT -> CONCAT12 -> CONCAT24 -> CONCAT48
~~~

No PASS -> v15A3 FAIL and v15B remains blocked.

## Forbidden feature leakage

Classifier input may contain only selected baseline-relative DN temporal slots.

Forbidden:

~~~text
HP / maxHP / missingHP
damageTaken
impact count
class label
potion count
wasted healing
survival
correct action
seed
impact side
impact schedule/timestamp
~~~

Metadata may contain those values for audit but feature vectors may not.

## Outcome handling

PASS:
- selected shortest representation is frozen for the next POTION-learning prereg.
- no runtime deployment yet.

FAIL:
- no post-hoc history / drive / gate tuning.
- v15B remains blocked.
