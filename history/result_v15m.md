# result_v15m — persistent neural-action belief POTION remediation

## Status

```text
V15M_PERSISTENT_NEURAL_ACTION_BELIEF_FAIL
```

This is a valid preregistered scientific FAIL.

Authoritative run:

```text
run
  36084321090

head
  781000d481ba702e715e71109bf25b931488233f

artifact
  10843389025

artifact name
  maplefly-v15m-persistent-neural-action-belief-36084321090

artifact digest
  sha256:f1580b836145f3dc38934f58200bee0c92a3dd851821110e81f41a9fba690f3

v15m_training.json sha256
  9d42047e23b87405448962d568fce62bead3ea390b7b8f2a4584507c158c04fe
```

Preregistration:

```text
e0aea2eed43942f6543fbcf40398501e1c99f432
```

Implementation:

```text
1c5acedd729bb774981b8d8b9eb06a09a6493611
c97f51bb54bb8e724eb7d66678deeff23dc1d56e
781000d481ba702e715e71109bf25b931488233f
```

The last commit is an implementation-only syntax repair: it removed a duplicate already-existing
`sigmoid` helper. No preregistered parameter, seed, reward, gate, or architecture changed.

No deployed policy changed.

---

## 1. frozen candidate

```text
recurrent decay
  0.6947230444

rawDecay
  0.8222938532

actionFeedback
  +2.1236043063

bias
  +0.7198003256

preprocessing sha256
  83cd6fa437c7cb526fc59bbb19285d7af7c7f2e397a97f7ac3b422409bccda99

policy params sha256
  6a334c271953e05734ce3990c67f6ad168890cc9303ff90ddae93a45078740e2
```

The D2 supervised diagnostic weights were not loaded.

---

## 2. TRAIN endpoint

At generation 100:

```text
TRAIN survival
  83.3%

TRAIN mean terminal HP
  77.08

TRAIN mean potion uses
  7.583

TRAIN fitness
  8296.667
```

The optimizer first reached 75% TRAIN survival by generation 10 and converged to 83.3%.

---

## 3. lower-skill ecology validity

All frozen ecology gates passed:

```text
episodes with >=3 kills
  100.0%

obstacle clear
  97.9%

target kill
  92.3%

LEFT target kill
  94.0%

RIGHT target kill
  90.8%

attack precision
  60.1%

airborne attack
  14.1%

post-clear jump encounter
  1.3%

pre-clear attack encounter
  6.4%
```

The scientific failure is not attributed to invalid lower-skill ecology.

---

## 4. fresh EVAL

FULL:

```text
survival
  16.7%        FAIL
  required >=75%

minimum base-seed survival
  12.5%        FAIL
  required >=62.5%

mean potion uses
  1.875

mean excess uses among survivors
  3.500        FAIL
  required <=1.500

wasted healing / DRINK
  2.667        PASS
  required <=10
```

TRAIN to EVAL survival:

```text
83.3% -> 16.7%

absolute drop
  66.7 percentage points
```

The compact recurrent state therefore did not solve the fresh generalization failure.

---

## 5. frozen controls

### MEMORY_OFF

```text
survival
  25.0%

mean excess uses
  1.667

mandatory contribution
  FAIL
```

Removing persistent belief memory improved rather than degraded survival/economy relative to FULL.

### ACTION_FEEDBACK_OFF

```text
survival
  16.7%

mean excess uses
  3.000

mandatory contribution
  FAIL
```

Removing the own-action feedback term did not materially hurt the candidate.

### NEURAL_OFF

```text
survival
  100.0%

minimum base-seed survival
  100.0%

mean potion uses
  10.000

mean excess uses
  4.000

mandatory contribution
  FAIL
```

Without neural evidence, the frozen candidate drinks at every opportunity and survives all EVAL tapes.

This is not an acceptable policy because economy is poor, but it shows that the learned neural term is
what suppresses drinking strongly enough to destroy FULL survival on fresh EVAL.

### EPISODE_SHIFT_1

```text
survival
  16.7%

mean excess uses
  4.000

episode-specific alignment contribution
  PASS
```

The preregistered contribution threshold is met through +0.5 excess use, not through a survival loss.

### DECISION_MEAN_NEURAL

```text
survival
  0.0%

mean potion uses
  0.000

episode-specific alignment contribution
  PASS
```

Replacing episode-specific neural vectors with the TRAIN-only decision-position mean drives the frozen
candidate to WAIT throughout and zero survival.

---

## 6. interpretation

v15M does not support deployment.

The D1-motivated persistent own-action state was available, but the trained candidate did not causally
depend on it under the frozen contribution gates:

```text
MEMORY_OFF
  no required degradation

ACTION_FEEDBACK_OFF
  no required degradation
```

The dominant fresh-EVAL signature is instead neural:

```text
FULL
  survival 16.7%
  mean uses 1.875

NEURAL_OFF
  survival 100%
  mean uses 10.000

DECISION_MEAN_NEURAL
  survival 0%
  mean uses 0
```

Together with the 66.7 pp TRAIN-to-EVAL survival collapse, this reopens the representation/generalization
question that v15L-D1 could not resolve.

v15L-D1 remains valid: the four-action contract was provably aliased. v15M removed that explicit
four-lag contract, but reward-only training did not learn a useful persistent action belief and still
generalized badly.

The next diagnostic should therefore freeze v15M and test whether the TRAIN-fitted PCA32 causal-trace
representation preserves a stable impact/recent-injury signal across TRAIN, EVAL, and fresh HOLDOUT
cohorts before changing the recurrent policy or optimizer.

---

## 7. stop rule and deployment state

Do not retune inside v15M:

```text
recurrent architecture
decay parameterization
PCA width
trace half-life
reward
CEM
seeds
gates
```

Do not deploy the v15M candidate.

```text
POTION v15D
  remains deployed

v15M
  closed / blocked

v16C
  remains blocked
```

Authorized next work:

```text
diagnose cross-cohort stability of the frozen causal-trace PCA32 representation
without training a replacement POTION policy
```
