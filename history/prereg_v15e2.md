# prereg_v15e2 — phase-invariant pooled-DN reward policy

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / OUTCOME**

v15E is frozen as a scientific FAIL:

```text
old absolute-temporal 256-D representation
+ phase-randomized reward-only retraining

FULL BA        53.3%
WAIT recall    55.0%
DRINK recall   51.7%
DN margin      +0.8pp
OFF margin     +3.3pp
```

The failed v15E cohort/gates are not changed or rerun.

v15E2 tests a new representation hypothesis:

> MaleCNS carries injury information across broad temporal phases, but the old 256 selected
> absolute temporal slots discard or fragment that information. Pooling each DN across the entire
> 4.8-second history should remove absolute phase as a representational coordinate while preserving
> distributed injury magnitude/state information.

Only the external representation/readout changes. Connectome synapses remain frozen.

---

## 1. biological / sensory contract

Unchanged:

```text
connectome
  alextitonis/fly.ai
  95a3dbcb05241b0a5c07028ca8ad945b23fbbe6e

DN count
  1316

LgLG
  LEFT 331
  RIGHT 338

impact
  drive 0.7
  pulse 6 brain steps = 120 ms

ground
  SNta_L/R 0.05

taste offer
  LB3 + claw_tpGRN bilateral
  drive 0.8
  final 100 ms
  HP-independent

history
  48 frames x 100 ms = 4.8 s
```

---

## 2. new phase-invariant representation

For each episode, first compute the same per-frame baseline-relative DN feature used by the old chain:

```text
z[f,d] = clamp(
  (rate[f,d] - baselineRate[d]) / 50,
  -1,
  +1
)
```

Then remove absolute temporal position by mean-pooling each DN across all 48 frames:

```text
p[d] = mean over f=0..47 of z[f,d]
```

Raw candidate representation:

```text
1316 pooled DN features
one feature per DN
no temporal slot identity
no feature selection
```

### TRAIN-only unsupervised standardization

Using only the v15E2 TRAIN cohort, without reward/action/class labels:

```text
mu[d]    = mean p[d] over TRAIN rows
sigma[d] = population std p[d] over TRAIN rows
scale[d] = max(sigma[d], 1e-6)

x[d] = clamp((p[d]-mu[d])/scale[d], -5, +5)
```

The same frozen `mu/scale` is used for EVAL and controls.

No label-based feature selection, PCA, reward correlation selection, or normalization refit on EVAL.

Representation artifact must hash:

- ordered DN identity list;
- pooling rule;
- TRAIN means;
- TRAIN scales.

---

## 3. phase-randomized timing generator

Same frozen generator family as v15E, but fresh seeds.

For hidden class n=0..3:

```text
n=0
  no impact

n=1..3
  integer onset sampled from [10,220]
  reject if <10 steps from any accepted onset
  sort ascending
  side L/R independently 50:50 after timing selection
```

RNG:

```text
brainSeed + 500000
```

No canonical timing grid and no v16B timing history is used.

---

## 4. fresh cohorts

TRAIN:

```text
3220000
3220100
3220200
3220300
```

EVAL:

```text
3225000
3225100
3225200
```

Each:

```text
10 replicates x classes 0/1/2/3
```

Totals:

```text
TRAIN 160
EVAL  120
```

Brain seed:

```text
baseSeed + replicate*7 + 1
```

---

## 5. reward environment

Unchanged:

```text
max HP            100
contact damage     10
potion heal        30
future contacts     6
potion cost         15

G = terminalHP - 15*potionUsed
R = (G-25)/15
```

Audit-only optimal action:

```text
class0 WAIT
class1 WAIT
class2 DRINK
class3 DRINK
```

---

## 6. learner

Same norm-stable reward-only learner family; dimensionality changes from 256 to 1316.

```text
Q_WAIT(x)  = w_wait dot x + b_wait
Q_DRINK(x) = w_drink dot x + b_drink

weights/biases = 0
epochs         = 80
mu             = 0.5
L2             = 0.001
epsilon        = 1.0
```

Policy exploration:

```text
WAIT  50%
DRINK 50%
```

Seeds:

```text
epoch order = 3226000 + epoch
policy RNG  = 3228000
```

Chosen-head normalized update is unchanged from v15B3/v15E.

No sweep.

---

## 7. forbidden policy inputs

The policy never receives:

```text
HP / missingHP
hidden injury class
impact count
impact timestamps
impact side
latest impact phase
timing bin
seed
future damage
potion effectiveness
unchosen reward
optimal action
v16B histories
v15D/v15E outputs
```

Representation standardization is unsupervised and TRAIN-only.

---

## 8. phase-coverage audit

On EVAL optimal-DRINK rows (classes 2/3), bin by latest generated onset:

```text
EARLY <=139
MID   140..189
LATE  >=190
```

Support gate:

```text
N >= 10 each
```

Scientific gate:

```text
DRINK recall >= 60% in each bin
```

Bins are audit metadata only.

---

## 9. causal controls

### DN_SHUFFLED

Permute the 1316 standardized pooled DN identities:

```text
seed = baseSeed + 900000
```

Same frozen candidate heads, no retraining.

### NEURAL_OFF

All 1316 standardized pooled features = 0.

No retraining.

---

## 10. v15E2 gate

PASS requires all:

```text
phase-bin support N                 >= 10 each

FULL balanced accuracy             >= 75%
WAIT recall                        >= 65%
DRINK recall                       >= 65%

EARLY DRINK recall                 >= 60%
MID DRINK recall                   >= 60%
LATE DRINK recall                  >= 60%

FULL - DN_SHUFFLED BA              >= 20pp
FULL - NEURAL_OFF BA               >= 20pp

FULL mean G                        >= 27.5
FULL mean regret                   <= 2.5
```

If all pass:

```text
V15E2_PHASE_INVARIANT_POOLED_DN_PASS
V15F frozen remediation validation = AUTHORIZED
deployment = BLOCKED
```

If support valid but a scientific gate fails:

```text
V15E2_PHASE_INVARIANT_POOLED_DN_FAIL
V15F = BLOCKED
deployment = BLOCKED
```

Implementation/provenance/support failure:

```text
V15E2_IMPLEMENTATION_INVALID
```

---

## 11. required artifact

Report:

- representation SHA256;
- all 1316 TRAIN means/scales;
- zero/near-zero scale count before floor;
- training action counts;
- optimizer norm/step diagnostics;
- model SHA256;
- overall EVAL metrics;
- per-class metrics;
- phase-bin support/recall;
- DN_SHUFFLED and NEURAL_OFF metrics/margins;
- gate audit.

---

## 12. stop rule

After outcome do not change:

- mean-pooling definition;
- 1316-D all-DN representation;
- standardization/floor;
- 322xxxx cohorts;
- phase generator;
- learner hyperparameters;
- phase bins;
- gates.

If v15E2 fails, do not tune pooling weights after seeing the result. A different representation
family requires another preregistration.

v15D remains deployed unchanged.
