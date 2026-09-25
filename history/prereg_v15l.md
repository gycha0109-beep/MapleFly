# prereg_v15l — reward-only causal neural trace POTION remediation

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / FRESH TAPE COLLECTION / OUTCOME**

Authoritative prerequisite closure:

```text
v15K-D2 closure
  81dadcf66836af04e921c909de02ab426646f659

outcome
  V15K_D2_PERSISTENT_IMPACT_SIGNAL_PRESENT
```

Design rationale:

```text
history/design_v15l_causal_neural_trace.md
commit eec07e8373d035728000fd70dee6eb895d567c94
```

Scientific question:

> Can a reward-only sequential POTION policy satisfy the frozen survival/economy gates using a causal
> short-memory representation built only from frozen MaleCNS 100 ms DN frames plus the previous four
> own POTION actions, while requiring episode-specific neural alignment?

No result from this experiment may change the representation, seeds, optimizer, reward, controls, or gates
defined below.

---

## 1. frozen stack

```text
MaleCNS repository
  alextitonis/fly.ai

MaleCNS commit
  95a3dbcb05241b0a5c07028ca8ad945b23fbbe6e

v15E2 frozen neural core artifact
  10793265453

v15E2 artifact digest
  sha256:a119bc0e425d08c5ce2381e6054c6ee358bf9402d5c442a57c00c916fd3b9405

v15E2 representation sha
  244464c8b5e9c7f5871f35cb3acc4ac1e2e0c9b61860c1dd3c267de79d4758db

v15E2 model sha
  18be00b46303f46d62f8f63f26ca1a280b66f50f0004be6f469c637123077c96

MOVE
  v7

ATTACK
  v10F

JUMP
  v11H2

cross-skill interruption
  v14C

deployed POTION
  v15D
```

No deployed policy is modified by this experiment.

---

## 2. fresh cohorts

TRAIN base seeds:

```text
3751000
3761000
3771000
```

EVAL base seeds:

```text
3781000
3791000
3801000
```

As in the recent sequential POTION experiments:

```text
24 TRAIN episodes
24 EVAL episodes
48-second continuous ecology
10 POTION decisions per full episode
```

Lower-skill interruption RNG:

```text
3847000
```

CEM policy RNG:

```text
3858000
```

PCA seed base:

```text
3838000
```

No explicit short CI timeout.

---

## 3. exact causal neural trace

The existing POTION observation pipeline forms one DN-rate frame every:

```text
5 brain steps
= 100 ms
```

For all 1,316 DNs:

```text
x_t[d]
  = clamp(
      (DN_rate_t[d] - episode_baseline_rate[d]) / 50,
      -1,
      +1
    )
```

Initialize after baseline collection:

```text
trace_0[d] = 0
```

Freeze:

```text
TRACE_HALF_LIFE_SECONDS
  2.0

FRAME_SECONDS
  0.1

TRACE_DECAY
  2^(-FRAME_SECONDS / TRACE_HALF_LIFE_SECONDS)
  = 0.9659363289248456
```

Update at every 100 ms frame:

```text
trace_t[d]
  = TRACE_DECAY * trace_(t-1)[d]
    + (1 - TRACE_DECAY) * x_t[d]
```

The trace updates continuously through the episode, including frames between POTION decisions.

Forbidden trace inputs:

```text
contact timestamp
contact flag
damage flag
damage count
HP
missing HP
potion need
future damage
decision number
time since hit
oracle action
oracle injury state
```

No decay/window search is allowed after outcome.

---

## 4. decision snapshots and TRAIN-only compression

At each ordinary POTION decision boundary, snapshot the 1,316-D trace.

Exactly 240 TRAIN snapshots are expected:

```text
24 episodes * 10 decisions
```

Fit preprocessing on TRAIN snapshots only.

### 4.1 per-DN standardization

For each DN:

```text
mean[d]
  TRAIN snapshot mean

scale[d]
  TRAIN snapshot standard deviation

scale floor
  1e-6

z[d]
  = (trace[d] - mean[d]) / max(scale[d], 1e-6)
```

Freeze mean/scale before EVAL.

### 4.2 label-free PCA32

Use the deterministic sample-Gram power-iteration PCA already used by v15K-D1, now on standardized
TRAIN trace snapshots.

Freeze:

```text
components
  32

power iterations per component
  80

seed for component k
  3838000 + k

sign convention
  loading element with greatest absolute magnitude must be positive
```

PCA receives neural vectors only.

Forbidden PCA inputs:

```text
HP
contact age
contact labels
oracle POTION labels
survival labels
reward
EVAL vectors
```

Freeze component weights before EVAL.

---

## 5. policy observation and architecture

At each of the ten existing POTION decision boundaries:

```text
neural
  current 32-D PCA projection of causal trace

self memory
  previous 4 own POTION actions
  newest first
  WAIT = 0
  DRINK = 1
  zero padded at episode start
```

No previous neural-decision history is appended.

Linear deterministic policy:

```text
score
  = bias
  + sum_i neuralWeight[i] * neuralPc[i]
  + sum_j actionWeight[j] * previousOwnAction[j]

DRINK iff score > 0
WAIT otherwise
```

Parameter count:

```text
1 + 32 + 4
= 37
```

The previous-nine-action representation from v15I is forbidden.

---

## 6. reward-only training

Use the v15K terminal-health CEM objective unchanged.

For a policy evaluated on TRAIN tapes:

```text
fitness
  = 10000 * survivalRate
    + meanTerminalHp
    - 15 * meanPotionUses
```

Hidden game state may be used by the trainer to calculate terminal outcome/reward and by the evaluator to
calculate economy metrics. It is never a policy feature.

CEM constants:

```text
generations
  100

population
  256

elites
  32

old distribution weight
  0.20

elite distribution weight
  0.80

minimum std
  0.05

parameter clamp
  [-8, +8]

initial distribution mean
  all 37 parameters = 0

initial distribution std
  all 37 parameters = 1
```

No oracle action imitation, supervised contact classifier, or D2 probe weights may initialize the policy.

---

## 7. evaluation-only economy oracle

As in v15K, enumerate the 2^10 possible POTION action sequences for each EVAL tape to determine the
minimum number of uses among surviving sequences.

This oracle is evaluation-only.

It may compute:

```text
mean excess potion uses among survivors
```

It may not train, initialize, tune, or alter the policy.

---

## 8. lower-skill ecology validity

Fresh EVAL ecology must satisfy:

```text
episodes with >=3 kills          >= 75%
obstacle clear                   >= 85%
target kill                      >= 70%
LEFT target kill                 >= 65%
RIGHT target kill                >= 65%
attack precision                 >= 45%
airborne attack                  <= 22%
post-clear jump encounter        <= 25%
pre-clear attack encounter       <= 30%
```

Failure produces the invalid outcome and no scientific PASS.

---

## 9. primary survival/economy gates

FULL must satisfy all:

```text
survival rate
  >= 75%

minimum base-seed survival
  >= 62.5%

mean excess potion uses among survivors
  <= 1.5

wasted healing / DRINK
  <= 10
```

Do not relax these gates after outcome.

---

## 10. frozen anti-shortcut controls

All controls use the frozen trained policy. Do not retrain.

### C0 NEURAL_TRACE_OFF

```text
all 32 neural PCA inputs = 0
previous own-action memory unchanged
```

Neural trace contribution is demonstrated if any is true:

```text
FULL survival - control survival >= 12.5 percentage points

OR

control mean excess - FULL mean excess >= 1.0

OR

FULL has survivors and control has zero survivors
```

This contribution is mandatory.

### C1 ACTION_MEMORY_OFF

```text
neural PCA unchanged
previous 4 own-action inputs = 0
```

Report survival/economy change.

This is diagnostic and is not a mandatory PASS gate.

### C2 EPISODE_SHIFT_1

Keep every EVAL tape's game/contact/outcome schedule fixed.

Cyclically replace its complete 10-decision neural PCA sequence with the next EVAL episode's sequence at
matching decision positions.

Own-action memory evolves from the actions actually selected under the shifted neural sequence.

Do not retrain.

Episode-specific alignment contribution is demonstrated if any is true:

```text
FULL survival - SHIFT survival >= 12.5 percentage points

OR

SHIFT mean excess - FULL mean excess >= 0.5

OR

FULL has survivors and SHIFT has zero survivors
```

This contribution is mandatory.

### C3 DECISION_MEAN_NEURAL

For decision index 0..9, compute the 32-D mean neural PCA vector using TRAIN only.

Replace every EVAL neural vector at that decision index with the corresponding frozen TRAIN mean vector.

Own-action memory remains endogenous to the resulting policy actions.

Do not retrain.

Contribution uses the same frozen criterion as EPISODE_SHIFT_1:

```text
survival drop >= 12.5 percentage points

OR

mean excess increase >= 0.5

OR

zero-survivor control
```

This contribution is mandatory.

A policy that survives mainly from a repeatable decision schedule must therefore fail the experiment.

---

## 11. preregistered outcomes

### PASS

If ecology validity, all four primary FULL gates, NEURAL_TRACE_OFF contribution, EPISODE_SHIFT_1
contribution, and DECISION_MEAN_NEURAL contribution all pass:

```text
V15L_CAUSAL_NEURAL_TRACE_REMEDIATION_PASS
```

Supported interpretation:

```text
a reward-only sequential POTION policy can satisfy the frozen survival/economy gates using a causal
MaleCNS-derived neural trace plus short own-action memory, and its success requires episode-specific
neural alignment
```

PASS does not automatically deploy the candidate.

### FAIL

If ecology is valid but any mandatory scientific gate fails:

```text
V15L_CAUSAL_NEURAL_TRACE_REMEDIATION_FAIL
```

Freeze the failure. Do not change trace half-life, PCA width, action-memory length, reward, optimizer,
seeds, or gates inside v15L.

### INVALID

If mandatory tape count, decision count, frozen provenance, PCA contract, or lower-skill ecology validity
fails:

```text
V15L_IMPLEMENTATION_OR_ECOLOGY_INVALID
```

Fix only implementation/provenance defects. Scientific parameters remain frozen.

---

## 12. stop rule

After outcome do not:

- search another trace decay;
- add contact/damage/HP/time inputs;
- select DNs using contact labels;
- use D2 supervised probe weights;
- increase action history;
- tune PCA width;
- tune CEM constants;
- tune reward weights;
- relax economy or alignment gates;
- deploy the candidate in the same scientific run.

Freeze evidence first.

POTION v15D remains deployed.
Experimental POTION replacement remains blocked until a later deployment-specific closure.
v16C remains blocked.
