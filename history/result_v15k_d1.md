# result_v15k_d1 — episode-specific neural residual audit

## Status

```text
V15K_D1_EPISODE_SPECIFIC_SIGNAL_NOT_DEMONSTRATED
```

Authoritative run:

```text
run
  36073412333

head
  e5a70f142114c0bd3c970586fb9f0664a81bef57

artifact
  10839846180

artifact digest
  sha256:57e92d596b8b807cf0dfd7324b9ad34fec482988e4547dba54f073fb22ffb5fe
```

Preregistration:

```text
01d1e90520ddd5891b268f0fd84c2f5aeb9ca04e
```

Implementation:

```text
7b9a926359dd8215cad3f84c5163dfc5885e4ef4
```

Workflow:

```text
e5a70f142114c0bd3c970586fb9f0664a81bef57
```

No explicit short job timeout was used.

---

## 1. fresh ecology

All 24 TRAIN and 24 EVAL tapes completed the full 48-second ecology with ten POTION opportunities.

The audit captured both:

```text
frozen v15E2 scalar baseMargin
exact 1,316-D standardized pooled-DN feature consumed by v15E2
```

TRAIN-only decision-position means were frozen before EVAL transformation.

Rich-DN PCA used only the 240 TRAIN residual vectors and no labels.

---

## 2. P0 — PHASE_ACTION

```text
balanced accuracy
  84.1%

WAIT recall
  68.1%

DRINK recall
  100.0%

downstream survival
  100.0%

mean excess potion uses
  2.708

economy-capable
  NO
```

A large amount of oracle-action structure is recoverable from episode phase plus the agent's own recent
actions, but the resulting policy overdrinks.

---

## 3. P1 — RAW_MARGIN

```text
balanced accuracy
  77.2%

WAIT recall
  83.3%

DRINK recall
  71.1%

downstream survival
  100.0%

mean excess potion uses
  1.875

economy-capable
  NO
```

Raw long neural margin history retains useful predictive structure, but misses the frozen economy gate
of <=1.5 excess uses.

---

## 4. P2 — RESIDUAL_MARGIN

TRAIN decision-position mean removed from scalar margin.

```text
balanced accuracy
  59.7%

WAIT recall
  78.1%

DRINK recall
  41.2%

downstream survival
  16.7%

mean excess potion uses among survivors
  0.750

economy-capable
  NO
```

Episode-shift control:

```text
balanced-accuracy drop
  3.7 percentage points

survival drop
  -8.3 percentage points

excess-use increase
  0.750

episode-specific contribution
  NO
```

The scalar residual does not satisfy the preregistered episode-specific information criterion.

---

## 5. P3 — RESIDUAL_DN32

The exact 1,316-D pooled-DN feature was decision-position detrended using TRAIN only, then compressed
with label-free TRAIN-only PCA32.

```text
balanced accuracy
  52.7%

WAIT recall
  36.3%

DRINK recall
  69.0%

downstream survival
  50.0%

mean excess potion uses
  2.167

economy-capable
  NO
```

Episode-shift control:

```text
balanced-accuracy drop
  2.4 percentage points

survival drop
  4.2 percentage points

excess-use increase
  0.106

episode-specific contribution
  NO
```

The richer pooled-DN residual also fails to demonstrate episode-specific injury-relevant information
under the frozen diagnostic.

---

## 6. conclusion

The preregistered hierarchy therefore resolves to:

```text
V15K_D1_EPISODE_SPECIFIC_SIGNAL_NOT_DEMONSTRATED
```

The strongest predictive signal remains the repeatable episode-phase/common temporal component.

This result does **not** prove that MaleCNS lacks an impact/injury signal. The current neural observation
is a 4.8-second mean-pooled decision representation. A short impact-locked neural response can be diluted
by that pooling and disappear after decision-position detrending.

The next diagnostic should therefore move one level earlier in the representation pipeline:

```text
100 ms DN frames
  -> impact-locked response
  -> retention / decay across time
  -> only then decide whether a causal neural accumulator is scientifically justified
```

Do not train another POTION reward policy before this temporal-retention audit.

Deployment remains blocked.
v16C remains blocked.
