# result_v15n — nonlinear own-action recurrent POTION remediation

## Status

```text
V15N_NONLINEAR_ACTION_RECURRENCE_FAIL
```

This is a valid preregistered scientific FAIL.

Authoritative evidence:

```text
run
  36089829819

head
  d3e434fc5a9f9a8b9e83d96637b25e2058398274

artifact
  10846125740

artifact name
  maplefly-v15n-nonlinear-action-recurrence-36089829819

artifact digest
  sha256:2a4492b371eaaaccaf12cbb29f5062708833e722d0af111a50e7cd0112abf6e2

v15n_training.json sha256
  103e3ebc84e7d062394ec22608b533cfc135c89eedc766f7f7c682a6dcdcd1a4
```

Preregistration:

```text
1db0933739f2a5550ce9c99469933cc07697a9ad
```

Implementation/workflow:

```text
79f7e2d1ac66b4db680d0d0cdcb5fe25caff8308
d3e434fc5a9f9a8b9e83d96637b25e2058398274
```

No deployed policy changed.

---

## 1. frozen candidate

The candidate used exactly the preregistered 41-parameter contract:

```text
32 neural PCA weights
2x2 recurrent matrix R
2-D previous-action input q
2 action-state readout weights
1 bias

recurrent bias
  [0,0]

zero action / zero state
  fixed point
```

Policy parameter SHA256:

```text
c3a2a2516296fb907834c3f6556afca1ea2f127a09e1b64d5ad46e4b00cbc5e5
```

TRAIN-only preprocessing SHA256:

```text
977aa76306c4aa387585c7cdea9a96de26296764ef98962565bd49935d6ccc83
```

---

## 2. TRAIN endpoint

Generation 100 distribution mean:

```text
survival
  87.5%

mean terminal HP
  84.17

mean potion uses
  8.250

fitness
  8710.417
```

The reward-only optimizer therefore found a high-survival TRAIN solution.

---

## 3. fresh EVAL

FULL:

```text
survival
  62.5%        FAIL
  required >=75%

minimum base-seed survival
  50.0%        FAIL
  required >=62.5%

mean potion uses
  5.625

mean excess uses among survivors
  3.067        FAIL
  required <=1.500

wasted healing / DRINK
  3.259        PASS
  required <=10
```

TRAIN-to-EVAL survival fell:

```text
87.5% -> 62.5%

absolute drop
  25.0 percentage points
```

This is materially better than v15M's 16.7% EVAL survival, but it does not satisfy the frozen gates.

---

## 4. mandatory controls

### ACTION_STATE_OFF

```text
survival
  58.3%

mean excess uses
  3.286

contribution
  FAIL
```

Removing the nonlinear own-action state changes survival by only 4.17 pp and excess use by +0.219.

The candidate therefore did not demonstrate required causal use of the new recurrent state.

### NEURAL_OFF

```text
survival
  100.0%

minimum base-seed survival
  100.0%

mean potion uses
  10.000

mean excess uses
  4.208

contribution
  PASS
```

The action-only system survives by drinking at every opportunity. Economy degradation satisfies the
preregistered neural contribution criterion, but this is not a deployable behavior.

### EPISODE_SHIFT_1

```text
survival
  58.3%

minimum base-seed survival
  37.5%

mean excess uses
  3.214

contribution
  FAIL
```

Breaking episode alignment produces only a 4.17 pp survival loss and +0.148 excess uses.

### DECISION_MEAN_NEURAL

```text
survival
  95.8%

minimum base-seed survival
  87.5%

mean potion uses
  7.667

mean excess uses
  2.217

wasted healing / DRINK
  0.217

contribution
  FAIL
```

Replacing episode-specific neural vectors with the TRAIN-only decision-position mean substantially
improves survival. This is the opposite of the required episode-specific neural contribution signature.

---

## 5. ecology validity

All lower-skill ecology gates passed:

```text
3-kill episode
  100.0%

obstacle clear
  99.58%

target kill
  90.25%

LEFT target kill
  89.66%

RIGHT target kill
  90.83%

attack precision
  61.63%

airborne attack
  15.29%

post-clear jump
  0.42%

pre-clear attack
  6.78%
```

The scientific failure is not attributed to invalid lower-skill ecology.

---

## 6. interpretation

v15N improved fresh survival relative to v15M but failed both the primary economy/survival gates and the
causal-use gates.

The frozen evidence chain is now:

```text
v15M-D1
  causal trace / PCA32 contains stable cross-cohort recent-impact information

v15M-D2
  one scalar own-action state is structurally insufficient

v15M-D3
  two fixed linear action traces remain structurally insufficient

v15N
  2-D nonlinear recurrence improves fresh survival to 62.5%
  but its own-action state does not demonstrate required causal contribution
  and episode-specific neural alignment does not demonstrate required contribution
```

The DECISION_MEAN_NEURAL control is especially diagnostic:

```text
FULL
  survival 62.5%

DECISION_MEAN_NEURAL
  survival 95.8%
```

The next step should not enlarge or retune the recurrence.

Instead, freeze the candidate and audit the actual decision-score decomposition and oracle agreement across
TRAIN/EVAL to determine whether the reward-only neural readout is using stable biological variation in the
wrong direction, at the wrong decision positions, or with margins dominated by cohort-specific variance.

---

## 7. stop rule and deployment

Do not retune inside v15N:

```text
hidden dimension
recurrence
PCA
reward
CEM
seeds
gates
control thresholds
```

Do not deploy v15N.

```text
POTION v15D
  DEPLOYED

v15N
  CLOSED / BLOCKED

v16C
  BLOCKED
```

Authorized next work:

```text
frozen-candidate decision-score decomposition and oracle-agreement diagnostic
without training a replacement POTION policy
```
