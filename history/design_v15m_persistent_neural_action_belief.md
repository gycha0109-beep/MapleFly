# design_v15m — persistent neural-action belief POTION remediation

## Purpose

The frozen evidence chain now says two different things at once:

```text
v15K-D2
  real episode-specific impact information is present in 100 ms MaleCNS DN activity
  and remains decodable through the preregistered 1–2 s post-impact band

v15L-D1
  current causal neural trace + previous 4 own POTION actions is non-Markov
  for the POTION economy
```

v15L-D1 found 106 exact decision-relevant aliasing groups on fresh HOLDOUT tapes, with conflicts in
23/24 episodes. The same runtime observation can correspond to a hidden state where WAIT is uniquely
minimum-use optimal and another where DRINK is uniquely minimum-use optimal.

The next remediation must therefore preserve both:

1. MaleCNS-derived episode-specific injury evidence;
2. healing-relevant information from the agent's own actions beyond four explicit lags.

It must not restore the v15I nine-lag schedule controller.

---

## 1. design principle

Replace explicit lag-specific action memory with one persistent recurrent belief scalar.

At POTION decision t:

```text
z_t
  current 32-D PCA projection of the causal 100 ms DN trace

a_(t-1)
  previous own POTION action
  DRINK=1
  WAIT=0

b_(t-1)
  previous internal belief scalar
```

Update:

```text
decay = sigmoid(rawDecay)

b_t =
  decay * b_(t-1)
  + neuralWeights dot z_t
  + actionFeedback * a_(t-1)

score_t =
  b_t + bias

DRINK iff score_t > 0
tie -> WAIT
```

Episode start:

```text
b = 0
previous action = 0
```

There is no constant added to the recurrent update. Therefore recurrence alone cannot advance a clock
while the neural term and own action are both zero.

The persistent state can carry the effect of an old DRINK after that action is no longer one of the last
four decisions.

---

## 2. neural representation

Keep the v15L neural recipe unchanged so that the remediation isolates the action-state defect.

```text
MaleCNS DN frame
  100 ms
  all 1316 DNs

frame value
  clamp((DN_rate - episode_baseline) / 50, -1, +1)

causal trace
  trace_t =
    0.9659363289248456 * trace_(t-1)
    + (1 - 0.9659363289248456) * frame_t

trace half-life
  2.0 s

decision observation
  current trace snapshot only

preprocessing
  TRAIN-only mean/std
  scale floor 1e-6

compression
  label-free PCA32
```

PCA is fit only on the fresh v15M TRAIN cohort.

No D2 supervised impact-probe weight is loaded.

---

## 3. why this is not v15I again

v15I exposed nine separate lag-specific action coefficients:

```text
a_(t-1)
a_(t-2)
...
a_(t-9)
```

That representation learned a near-fixed DRINK-x8 schedule.

v15M exposes no lag position and no decision index.

The entire own-action history can affect behavior only through:

```text
one recurrent scalar
+ one previous action feedback coefficient
+ one learned decay
```

This is deliberately much lower-capacity than a lag vector.

A schedule-like solution is still possible in principle, so v15M must pass explicit episode-specific
neural-alignment controls before any PASS can be accepted.

---

## 4. required causal evidence

A primary PASS is not enough.

The frozen final candidate must also show all of the following without retraining:

### MEMORY_OFF

At each decision force:

```text
b_(t-1) = 0
```

Current neural evidence and previous own action remain.

This tests whether persistent state contributes.

### ACTION_FEEDBACK_OFF

Force:

```text
actionFeedback * a_(t-1) = 0
```

This tests whether the persistent state actually incorporates the agent's own healing actions.

### NEURAL_OFF

Force:

```text
neuralWeights dot z_t = 0
```

This tests whether the policy is not merely an own-action recurrence.

### EPISODE_SHIFT_1

Give each EVAL tape the complete neural sequence from the next EVAL episode while leaving its game/contact
tape unchanged.

This breaks episode-specific biological alignment.

### DECISION_MEAN_NEURAL

Replace every EVAL episode's neural vector at each decision position with the TRAIN-only mean vector for
that decision position.

This preserves any common phase profile while removing episode-specific variation.

A valid v15M PASS requires both neural-alignment controls to hurt the frozen candidate.

---

## 5. interpretation boundary

If v15M passes, the supported claim is narrow:

```text
a reward-only policy can combine frozen MaleCNS-derived causal neural evidence with a compact persistent
state updated by its own POTION actions to satisfy the preregistered survival/economy gates on fresh tapes
```

Do not claim:

- the fly learned HP;
- the recurrent scalar equals HP;
- the MaleCNS learned new synaptic weights;
- the policy is ready for deployment without a separate online/deployment closure.

If v15M fails, freeze it. Do not tune decay, reward, PCA width, seeds, gates, or optimizer after seeing
the result.

---

## 6. deployment boundary

Throughout v15M:

```text
POTION v15D
  remains deployed

v15M
  experimental only

v16C
  remains blocked
```
