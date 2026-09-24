# result_v15j — reward-only long neural history

## Status

```text
V15J_REWARD_ONLY_LONG_NEURAL_HISTORY_FAIL
```

This is a scientific gate failure. The authoritative workflow exits 1 because the preregistered scientific
PASS condition was not met.

Authoritative run:

```text
run
  35983240290

head
  7d75dba57f9ba0aa169b319246bca110cc3be75a

artifact
  10801234805

artifact digest
  sha256:25b31e63ff7789f0c9493a41d7b48c9452562f707509ddb496843b3f9803f818
```

Frozen preregistration:

```text
b6c64235cff6d1c01ed5cd53662b7bd9852825df
```

Implementation history:

```text
implementation
  3279c59b9fd073f4c1c394186ec2ba99ae302218

workflow
  e3983c131d91d2e5eed0db4e6072671614567351

syntax-only correction before scientific execution
  7d75dba57f9ba0aa169b319246bca110cc3be75a
```

The first workflow attempt, run `35983170268`, failed at syntax check because a legacy oracle helper
was duplicated. No scientific outcome was produced. The duplicate helper was removed without changing
the frozen v15J representation, seeds, optimizer, reward, gates, or controls.

---

## 1. fresh tape validity

The authoritative run completed all 24 TRAIN and all 24 EVAL MaleCNS tapes, each with ten POTION
opportunities.

Lower-skill behavior remained operational throughout the fresh ecology. The scientific failure below
is therefore evaluated on complete tapes rather than a truncated run.

---

## 2. FULL candidate

```text
survival
  62.5%          FAIL
  required >=75%

minimum base-seed survival
  50.0%          FAIL
  required >=62.5%

mean potion uses
  5.958

mean excess uses among survivors
  1.333          PASS
  required <=1.500

wasted healing / DRINK
  3.147          PASS
  required <=10
```

Candidate parameter hash:

```text
310023a3c29600afdd4182a4e36c1795017198625df7694776923917e6e08cfe
```

The candidate improved potion economy relative to the v15I schedule-like candidate, but failed the
binding survival gates.

---

## 3. persistence controls

LONG_NEURAL_HISTORY_OFF:

```text
survival
  83.3%

mean excess uses
  3.600
```

Removing lagged neural margins increased survival but substantially worsened potion economy. Long
neural history therefore changed behavior, but not in a way that satisfies the complete survival/economy
objective.

ALL_NEURAL_OFF:

```text
survival
  0.0%

mean excess uses
  Infinity
```

The candidate depends strongly on some neural term. This does not establish that episode-specific
biological variation is carrying the adaptive information.

---

## 4. anti-schedule alignment controls

EPISODE_SHIFT_1:

```text
survival
  66.7%

mean excess uses
  1.188

preregistered alignment contribution
  NO
```

DECISION_MEAN_NEURAL:

```text
survival
  95.8%

mean excess uses
  1.826

preregistered alignment contribution
  NO
```

Replacing every episode's neural sequence with the cohort decision-position mean substantially
increased survival. Breaking episode-specific neural/contact alignment did not satisfy either
anti-schedule contribution gate.

Therefore the v15J candidate is not supported as an episode-adaptive neural-history policy.

---

## 5. interpretation

The combined evidence now separates two issues.

v15I showed that long lag-specific self-action history can become a near-fixed drinking schedule.

v15J removed that long action clock, but the learned long neural-history policy still did not require
episode-specific neural/contact alignment. In particular, the decision-position mean neural sequence
performed better on survival than the actual episode-specific sequences.

The supported conclusion is narrow:

```text
the current reward-only linear policy is exploiting a repeatable neural temporal profile more than
episode-specific injury variation
```

This does not mean MaleCNS contains no injury information. D2 supervised diagnostics showed useful
signal exists. It means the present reward-only objective/policy class did not isolate that information.

---

## 6. consequence

Do not:

- deploy v15J;
- proceed to v16C;
- relax survival or economy gates;
- tune v15J weights after EVAL;
- rerun v15J with changed seeds and call it the same experiment;
- add HP/contact count/time to runtime state.

Next work should diagnose the frozen neural representation itself before another reward-only learner:
separate the decision-position/common temporal component from episode-specific neural residuals and test
whether the residual retains injury-relevant information on fresh tapes.

---

## 7. CI timeout policy

The explicit 25-minute job timeout was removed after this authoritative run at user request.

Future long MaleCNS workflows should not add an artificial short job timeout unless explicitly requested.
