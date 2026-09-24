# prereg_v15i_d1 — schedule dominance vs neural alignment

## Status

**PREREGISTERED BEFORE DIAGNOSTIC IMPLEMENTATION / OUTCOME**

Source v15I closed with:

```text
V15I_REWARD_ONLY_LONG_ACTION_MEMORY_FAIL

FULL survival
  83.33%

FULL mean excess uses
  1.650
  gate <= 1.500

ACTION_MEMORY_OFF
  survival 100%
  excess 3.583

NEURAL_OFF
  survival 54.17%
```

The v15I candidate therefore depends on both allowed components under the original ablations, but its
observed action sequences are strongly concentrated around early DRINKs followed by late WAITs.

D1 is diagnostic only.

Scientific question:

> Is the frozen v15I candidate using episode-specific MaleCNS neural variation in a way aligned with
> each episode's injury history, or is its behavior dominated by an action-history-derived schedule
> for which the neural margin mainly acts as an offset?

---

## 1. frozen source

Authoritative source:

```text
run
  35980309878

head
  8915f99273f260f030701e2be15c3060f3509174

artifact
  10800930547

artifact digest
  sha256:8aaf38c7d46c6db3a4ae4aeb2eeaf8e81d48d329d8071a66d73f4e87f3ec26a9

policy sha256
  2cd005ebe7587aac363938dbb9bce9f7dbfc5ba8400a363470478859b6ca8d1e
```

No new MaleCNS run, learning, parameter fitting, or threshold tuning is allowed.

---

## 2. tape reconstruction

Use the source `ACTION_MEMORY_OFF` rows because all 24 survive and expose all ten decision boundaries.

For each episode reconstruct:

```text
m_1..m_10
  stored baseMargin sequence

contactsBeforeDecision1
  (100 - hpBefore_1) / 10

contactsAfterDecision_i
  (hpAfterPotion_i - hpBefore_(i+1)) / 10
  for i=1..9

contactsAfterDecision10
  (hpAfterPotion_10 - finalHp) / 10
```

All inferred contact counts must be non-negative integers.

Decision ordering remains:

```text
POTION decision
then same-interval contact damage
```

The contact tape is evaluator-only and never becomes a policy input.

---

## 3. mandatory replay validity

Replay the exact frozen v15I policy on each reconstructed tape.

Require exact agreement with the stored FULL evaluation for:

```text
all policy actions that occur before stored death
survived
uses
finalHp
wasted healing
```

All 24 episodes must match.

Otherwise:

```text
V15I_D1_RECONSTRUCTION_INVALID
```

No causal interpretation is allowed.

---

## 4. diagnostic controls

No parameters are retrained.

### A. FIRST_7_DRINK

Evaluator-only fixed schedule:

```text
DRINK x7
WAIT  x3
```

### B. FIRST_8_DRINK

Evaluator-only fixed schedule:

```text
DRINK x8
WAIT  x2
```

### C. FIRST_9_DRINK

Evaluator-only fixed schedule:

```text
DRINK x9
WAIT  x1
```

These schedules are controls only and are never deployment candidates.

### D. EPISODE_SHIFT_1

Keep each episode's contact tape unchanged.

Replace its ten neural margins with the complete neural-margin sequence from the **next artifact row**,
cyclically:

```text
row 0 <- row 1
...
row 22 <- row 23
row 23 <- row 0
```

This preserves real ten-step neural sequences and their temporal structure but breaks alignment with
the episode's own contact history.

### E. DECISION_MEAN_NEURAL

For each decision position 1..10 compute the mean margin across the 24 source rows.

Feed that same ten-value mean sequence to every episode.

This preserves the cohort's decision-position mean neural profile while removing all episode-specific
neural variation.

Decision position is used only to construct this evaluator control; it is not added to the policy.

---

## 5. metrics

For FULL replay and every control report:

```text
survival rate
minimum base-seed survival
mean potion uses
mean excess uses among survivors
wasted healing / DRINK
```

Also compute the frozen policy's ten-action sequence on all 24 neural tapes without stopping at death.

Against FIRST_8_DRINK report:

```text
action mismatch count / 240
action mismatch fraction
```

---

## 6. neural-alignment contribution

For EPISODE_SHIFT_1 and DECISION_MEAN_NEURAL separately, neural alignment is considered materially
important only if relative to FULL at least one occurs:

```text
survival drop >= 12.5 percentage points
OR
mean excess uses increase >= 0.5
```

A control improving survival/economy does not count as evidence for episode-specific neural alignment.

---

## 7. schedule-dominance criterion

Schedule dominance is supported only if all are true:

```text
FIRST_8 action mismatch fraction <= 10%

EPISODE_SHIFT_1
  no neural-alignment contribution

DECISION_MEAN_NEURAL
  no neural-alignment contribution
```

If true:

```text
V15I_D1_SCHEDULE_DOMINATED_POLICY
```

Interpretation:

The v15I architecture/optimizer found a policy whose behavior is mostly reproduced by an
action-history-derived early-drink schedule; the frozen neural margin affects decisions, but its
episode-specific alignment is not required for comparable performance under these controls.

If either neural control materially degrades performance:

```text
V15I_D1_EPISODE_SPECIFIC_NEURAL_ALIGNMENT_PRESENT
```

If FIRST_8 mismatch exceeds 10% and neither neural control contributes:

```text
V15I_D1_NONTRIVIAL_NONALIGNED_POLICY
```

---

## 8. stop rule

D1 does not authorize:

- changing the v15I economy gate;
- changing v15I parameters;
- deployment;
- v16C;
- a new training reward;
- a larger training cohort;
- a new architecture.

Freeze D1 first.

Only after D1 may the next remediation question be preregistered.
