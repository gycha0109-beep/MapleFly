# design_v15l — causal neural trace POTION remediation

## Purpose

v15K-D2 closed with:

```text
V15K_D2_PERSISTENT_IMPACT_SIGNAL_PRESENT
```

The result establishes that real contact produces an episode-specific frozen MaleCNS DN signature at
100 ms resolution and that decodable information persists through the preregistered 1–2 second band.

It does not identify an optimal runtime memory architecture.

The next remediation therefore uses one deliberately simple causal trace and freezes it before outcome.

---

## 1. representation objective

The old POTION representation averages 48 consecutive 100 ms DN frames into one 4.8-second vector.

The replacement must:

1. update from neural frames only;
2. retain recent neural perturbations across the 4.8-second POTION decision interval;
3. avoid contact/damage/HP/time-since-hit inputs;
4. avoid long self-action history becoming a clock;
5. remain small enough for reward-only sequential policy optimization.

---

## 2. causal trace

For each 100 ms frame and every one of the 1,316 DNs:

```text
x_t[d]
  = clamp(
      (DN_rate_t[d] - episode_baseline_rate[d]) / 50,
      -1,
      +1
    )
```

Trace state:

```text
trace_0[d] = 0

lambda
  = 2^(-0.1 / 2.0)
  = 0.9659363289248456

trace_t[d]
  = lambda * trace_(t-1)[d]
    + (1 - lambda) * x_t[d]
```

The fixed decay corresponds to a 2.0-second half-life.

Rationale: 2.0 seconds is the outer preregistered retention horizon already tested by D2. It is used once
as a fixed engineering bridge, not searched as a hyperparameter.

The trace is never updated from contact timestamps, damage counters, HP, potion need, decision number, or
future outcomes.

---

## 3. label-free compression

A 1,316-parameter sequential policy would unnecessarily enlarge the optimizer search space.

Use only TRAIN trace snapshots at the ten ordinary POTION decision boundaries.

TRAIN-only preprocessing:

```text
per-DN mean/std
  -> z-score with scale floor 1e-6
  -> label-free PCA32
```

No HP, contact age, oracle action, survival label, reward, or EVAL data enters the PCA fit.

The PCA basis, means, and scales are frozen before EVAL.

This follows the existing label-free PCA precedent while moving the information source from a 4.8-second
mean to the causal 100 ms-updated trace.

---

## 4. policy observation

At each of the ten existing POTION decision boundaries:

```text
32-D neural trace PCA
+ previous 4 own POTION actions
```

Policy:

```text
score
  = bias
  + dot(neuralWeights[32], tracePca[32])
  + dot(actionWeights[4], previousOwnActions[4])

DRINK iff score > 0
otherwise WAIT
```

Total trainable parameters:

```text
37
```

There is no previous neural-decision history. Temporal memory lives inside the causal neural trace itself.

The four-action memory is retained from v15J/v15K because it is short and represents only the agent's own
actions. The nine-action memory that behaved as a clock in v15I is not reintroduced.

---

## 5. reward-only learner

Keep the v15K terminal-health CEM objective and optimizer family unchanged so the main intervention is the
representation.

Training may use hidden game state to calculate reward/outcome, but the policy observation cannot.

The evaluation oracle for minimum potion uses remains evaluation-only and cannot train the policy.

---

## 6. anti-shortcut controls

Mandatory controls:

```text
NEURAL_TRACE_OFF
  zero all 32 neural trace components
  retain own-action memory

ACTION_MEMORY_OFF
  retain neural trace
  zero previous own-action inputs

EPISODE_SHIFT_1
  cyclically replace each EVAL episode's complete 10-decision neural trace sequence
  with the next EVAL episode's sequence at matching decision positions
  do not retrain

DECISION_MEAN_NEURAL
  replace each EVAL neural vector with the TRAIN-only mean vector for that decision position
  do not retrain
```

The two alignment controls test whether the policy requires the neural sequence belonging to the actual
episode rather than a repeatable schedule.

---

## 7. unchanged primary gates

```text
survival >= 75%
minimum base-seed survival >= 62.5%
mean excess potion uses among survivors <= 1.5
wasted healing / DRINK <= 10
```

Lower-skill ecology gates remain unchanged.

Episode-specific neural contribution remains mandatory and must be frozen numerically in preregistration.

---

## 8. interpretation boundary

A PASS would support:

```text
a reward-only POTION policy can use a causal trace derived only from frozen MaleCNS DN activity,
plus short own-action memory, to satisfy the frozen survival/economy gates while depending on
episode-specific neural alignment
```

It would not support:

```text
the fly knows its HP
the fly learned the game end-to-end
the supervised D2 impact probe is deployed
the MaleCNS synaptic weights changed
```

POTION v15D remains deployed until a later deployment-specific closure.
v16C remains blocked.
