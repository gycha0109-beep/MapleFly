# result_v15l — causal neural trace POTION remediation

## Status

```text
V15L_CAUSAL_NEURAL_TRACE_REMEDIATION_FAIL
```

This is a valid preregistered scientific FAIL, not an implementation-invalid result.

Authoritative run:

```text
run
  36081124828

head
  c4c00392b7e86ecdc76b7ba0ecae1975b76723b5

artifact
  10842242941

artifact name
  maplefly-v15l-causal-neural-trace-36081124828

artifact digest
  sha256:92335df0c05930d02820bdd477c3c39f890a30ef7be9f4adba04a699edaa2b46

v15l_training.json sha256
  f712f3d2f30619bd57a9b89b82cca42061a8c5b80052619a6780a7563a170673
```

Preregistration:

```text
613143b63fd4149015d6b0b2a3f435bfb3362573
```

Implementation chain:

```text
f589dcb3829b02459b394a807614c28edabb5e94
72b8ffffff85751163de46a60dd4205423aee4de
84ce4b7979893c15d6b7265a4353a5561c202858
c4c00392b7e86ecdc76b7ba0ecae1975b76723b5
```

No deployed policy changed.

---

## 1. deterministic corroboration

An earlier workflow run on the same implementation, before the workflow-only trigger comment, independently
produced the exact same evidence JSON:

```text
corroboration run
  36081114727

head
  84ce4b7979893c15d6b7265a4353a5561c202858

artifact
  10842875764

artifact digest
  sha256:7efb99a1e3ce2f125eb78061d46950b64e9bd655f8c6620bcd969be8eb35fe12

v15l_training.json sha256
  f712f3d2f30619bd57a9b89b82cca42061a8c5b80052619a6780a7563a170673
```

The uncompressed JSON payloads are byte-identical.

This rules out workflow-trigger nondeterminism as an explanation for the result.

---

## 2. frozen representation

```text
frame
  100 ms

DNs
  1316

causal trace half-life
  2.0 s

trace decay
  0.9659363289248456

preprocessing
  TRAIN-only mean/std
  scale floor 1e-6

compression
  label-free PCA32
  80 power iterations/component
  seed base 3838000

policy inputs
  current 32-D trace PCA
  previous 4 own POTION actions

policy parameters
  37

preprocessing sha256
  f3145c140b7eff694ad503201a708e34c7f2d2701c109f0f7179bf19e3d35421

policy params sha256
  ec2f49955e4a24e458babde1b5d8c49abd4ea3c1b7e6c28bdea1fc159254d166
```

The D2 supervised probe weights were not loaded.

---

## 3. lower-skill ecology validity

All frozen ecology gates passed:

```text
episodes with >=3 kills
  100.0%       PASS

obstacle clear
  98.7%        PASS

target kill
  91.8%        PASS

LEFT target kill
  94.8%        PASS

RIGHT target kill
  88.9%        PASS

attack precision
  59.0%        PASS

airborne attack
  13.3%        PASS

post-clear jump encounter
  0.4%         PASS

pre-clear attack encounter
  6.0%         PASS
```

The scientific failure is therefore not attributed to invalid lower-skill ecology.

---

## 4. FULL policy

```text
survival
  12.5%        FAIL
  required >=75%

minimum base-seed survival
  0.0%         FAIL
  required >=62.5%

mean potion uses
  1.708

mean excess uses among survivors
  2.667        FAIL
  required <=1.5

wasted healing / DRINK
  1.951        PASS
  required <=10
```

The candidate drinks too little to survive reliably and, among the few survivors, is still not economical
enough to satisfy the frozen excess-use gate.

---

## 5. controls

### NEURAL_TRACE_OFF

```text
survival
  100.0%

minimum base-seed survival
  100.0%

mean uses
  10.000

mean excess uses
  3.708
```

The control survives by drinking at every decision. Its excess-use degradation is large enough to satisfy
the preregistered neural-contribution criterion, but this does not rescue FULL because the primary FULL
survival/economy gates fail.

### ACTION_MEMORY_OFF

```text
survival
  4.2%

mean uses
  1.208

mean excess uses
  4.000
```

Short own-action memory contributes materially, but FULL remains unusable.

### EPISODE_SHIFT_1

```text
survival
  12.5%

mean uses
  1.583

mean excess uses
  3.333

alignment contribution
  PASS
```

The preregistered contribution criterion is met through excess-use degradation, not survival loss.

### DECISION_MEAN_NEURAL

```text
survival
  95.8%

minimum base-seed survival
  87.5%

mean uses
  8.792

mean excess uses
  2.783

mandatory contribution
  FAIL
```

Replacing episode-specific neural vectors with the TRAIN-only decision-position mean makes survival
dramatically better, although inefficient.

This is the most important failure signature.

---

## 6. interpretation

The result does **not** support deployment of the causal-trace policy.

The observed pattern is:

```text
FULL episode-specific trace
  -> drinks rarely
  -> survival collapses to 12.5%

NEURAL_TRACE_OFF
  -> drinks every decision
  -> survival 100%, poor economy

DECISION_MEAN_NEURAL
  -> drinks very frequently
  -> survival 95.8%, poor economy
```

The causal trace representation is therefore not simply "missing injury information". D2 already showed
that recent impact information exists in the 100 ms DN stream.

Instead, v15L shows that the reward-only optimizer maps the episode-specific PCA trace into an
under-drinking policy, while removing/replacing that variation moves the same learned policy toward
aggressive drinking.

The next diagnostic must determine whether the failure is primarily:

1. TRAIN-to-EVAL policy overfit / sign instability in the 32-D PCA trace;
2. reward/CEM optimization selecting a brittle low-use local optimum;
3. PCA variance directions being poorly aligned with the reward-relevant impact residual despite D2
   showing that such residual information exists in the full DN frame.

Do not choose among these explanations from v15L alone.

---

## 7. stop rule and deployment state

The frozen v15L preregistration is closed.

Do not retune inside v15L:

```text
trace half-life
PCA width
action-memory length
CEM constants
reward weights
seeds
gates
```

Do not deploy the supervised D2 probe.

```text
POTION v15D
  remains deployed

v15L candidate
  deployment blocked

v16C
  remains blocked
```

Authorized next work:

```text
diagnose the frozen v15L representation/optimizer failure without training a replacement policy
```
