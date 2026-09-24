# prereg_v15e — phase-randomized reward-only POTION candidate

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / OUTCOME**

The v16B diagnostic chain is frozen:

```text
D3  real contact schedule interference
D4  in-window timing dominant
D5  phase/recency dominant
D6  trained-phase peak
```

D6 showed on a common paired cohort:

```text
REAL       DRINK  3.8%
A145       DRINK  9.4%
A175       DRINK 28.3%
A205       DRINK  0.0%
CANONICAL  DRINK 79.2%
```

The frozen v15D policy is therefore retained as the deployed baseline but is **not modified**.

v15E tests one remediation hypothesis:

> the existing frozen 256-D MaleCNS DN representation contains enough injury information outside
> the old canonical temporal positions, and a new reward-only readout trained on an independently
> generated broad timing distribution can learn a less phase-fragile DRINK/WAIT value policy.

This is a new candidate readout. It is not a deployment patch.

---

## 1. frozen biological / sensory contract

```text
connectome
  alextitonis/fly.ai
  95a3dbcb05241b0a5c07028ca8ad945b23fbbe6e

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
  48 x 100 ms = 4.8 s
```

Connectome synaptic weights remain frozen.

---

## 2. frozen representation

Reuse the exact v15A12/v15D representation:

```text
artifact
  10768761312

digest
  sha256:8aa759b04643d618e69aaa647d7251eb237816ee3b84bcc97a0f451d20cbba78

representation
  FULL48_REWARD_ADVANTAGE

sha256
  33fc31f636e1cde215841dd33b0a93b24d4571cdabd32e9a1edc8fa2e696c847

features
  256 standardized temporal DN features
```

No feature reselection or normalization refit is allowed in v15E.

If this experiment fails, a later preregistration may test a new phase-robust representation.

---

## 3. reward environment

Unchanged from v15B3/v15D:

```text
max HP            100
contact damage     10
potion heal        30
future contacts     6
potion cost         15

G = terminalHP - 15*potionUsed
R = (G - 25) / 15
```

Hidden injury class 0/1/2/3 exists only in the trainer-side environment.

Optimal actions for audit only:

```text
class 0 WAIT
class 1 WAIT
class 2 DRINK
class 3 DRINK
```

The learner never receives the optimal action or unchosen action reward.

---

## 4. independent phase-randomized timing generator

v15E MUST NOT train on or sample timing from the observed v16B contact histories.

For each episode:

```text
brainSeed = baseSeed + replicate*7 + 1
timing RNG = brainSeed + 500000
```

For hidden class `n`:

- n=0: no impact.
- n=1..3: sample n integer impact onsets independently from the inclusive interval **[10,220]**.
- Reject a proposed onset if it is within fewer than **10 brain steps** of any already accepted onset.
- Continue until n onsets are accepted.
- Sort onsets ascending.
- After timing is fixed, draw each impact side independently from the same RNG, P(L)=P(R)=0.5.
- The full six-step pulse therefore remains inside the 240-step history.

This timing support and generator are frozen before outcome.

No canonical grid `[25,55,85,115,145,175]` is used for v15E TRAIN or primary EVAL.

---

## 5. fresh cohorts

No 321xxxx seed is used by the v15D training chain or v16B diagnostics.

TRAIN:

```text
3210000
3210100
3210200
3210300
```

EVAL:

```text
3215000
3215100
3215200
```

Each base seed:

```text
10 replicates x classes 0/1/2/3
```

Totals:

```text
TRAIN 160 contexts
EVAL  120 contexts
```

TRAIN and EVAL are disjoint.

---

## 6. learner

Exact v15B3 normalized reward-only two-head learner:

```text
Q_WAIT(x)  = w_wait  dot x + b_wait
Q_DRINK(x) = w_drink dot x + b_drink

initial weights/biases = 0

epochs 80
L2     0.001
mu     0.5
epsilon 1.0
```

Policy-owned exploration:

```text
P(WAIT)  = 0.5
P(DRINK) = 0.5
```

Policy RNG:

```text
3218000
```

Epoch order seed:

```text
3216000 + epoch
```

Chosen-head update:

```text
prediction = Q_chosen(x)
error      = prediction - R
denom      = 1 + sum x[f]^2
step       = 0.5 / denom

bias_chosen -= step * error

weight_chosen[f] -= step * (
  error*x[f] + 0.001*weight_chosen[f]
)
```

No optimizer sweep or tuning.

---

## 7. forbidden learner inputs

Never provide to the candidate policy:

```text
HP / maxHP / missingHP
damageTaken
impact count / hidden class
impact timestamps
impact side
latest impact phase
timing-bin identity
potion count
effective healing / overheal
future contacts / future damage
terminal HP before reward calculation
unchosen action reward
DeltaG
optimal/correct action
seed
v16B source histories
v15D Q values/actions
```

The trainer may use hidden class only to execute the chosen action, calculate realized scalar reward,
and score the frozen scientific audit after action selection.

---

## 8. primary EVAL

No exploration:

```text
argmax(Q_WAIT,Q_DRINK)
tie -> WAIT
```

Required overall metrics:

- balanced accuracy;
- WAIT recall;
- DRINK recall;
- confusion matrix;
- mean G;
- mean oracle G;
- mean regret;
- per-class DRINK rate;
- Q ranges.

---

## 9. preregistered phase-coverage audit

For EVAL rows whose optimal action is DRINK (classes 2 and 3), bin by the **latest generated impact onset**:

```text
EARLY
  latest <= 139

MID
  140 <= latest <= 189

LATE
  latest >= 190
```

The bins are trainer-side audit metadata only and never policy inputs.

Before MaleCNS outcome evaluation, each bin must contain at least:

```text
N >= 10
```

If deterministic seed generation does not satisfy this support gate, the run is
`V15E_IMPLEMENTATION_INVALID`; seeds/bins may not be changed after observing neural outcomes.

Required phase robustness:

```text
DRINK recall in EACH EARLY/MID/LATE bin >= 60%
```

This is the key remediation gate.

---

## 10. causal controls

On the same EVAL cohort, frozen candidate heads:

### DN_SHUFFLED

```text
DN permutation seed = baseSeed + 900000
```

### NEURAL_OFF

```text
all 256 standardized features = 0
```

No retraining.

---

## 11. v15E gate

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

FULL mean realized G               >= 27.5
FULL mean regret                   <= 2.5
```

If all pass:

```text
V15E_PHASE_RANDOMIZED_REWARD_POLICY_PASS
V15F frozen remediation validation = AUTHORIZED
deployment = BLOCKED
```

If support is valid but any scientific gate fails:

```text
V15E_PHASE_RANDOMIZED_REWARD_POLICY_FAIL
V15F = BLOCKED
deployment = BLOCKED
```

If implementation/provenance/support is invalid:

```text
V15E_IMPLEMENTATION_INVALID
```

---

## 12. interpretation limits

PASS supports only:

> with the old frozen 256-D representation, a new reward-only readout can learn useful DRINK/WAIT
> value across a broad independently generated temporal injury distribution.

PASS does not establish continuous-ecology survival and does not authorize deployment.

The already-observed v16B windows are intentionally excluded from v15E. If v15E passes, v15F may
use them as a **known remediation benchmark** alongside new independent tests. A later fresh-seed
continuous ecology experiment is still required before any deployment decision.

---

## 13. stop rule

After outcome do not change:

- representation;
- [10,220] timing support;
- 10-step minimum separation;
- 321xxxx cohorts;
- 10 replicates;
- 80 epochs / mu / L2 / epsilon;
- phase bins;
- phase support gate;
- accuracy/recall/control/return gates.

Do not patch v15D or add an HP threshold.
