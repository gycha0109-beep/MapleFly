# design_v15n_d3 — current-health observability audit

## Why this diagnostic exists

v15N-D2 removed the support problem and found that the frozen v15N score is approximately chance on the
minimum-use forced-action boundary.

That boundary depends on future damage as well as current hidden state, so it is not a clean test of whether
the allowed observation actually represents the agent's present health state.

v15N-D3 asks a narrower question:

> Can the exact frozen v15N observation, without HP as an input, linearly decode economically relevant
> current-health bands on unseen episodes?

This is diagnostic-only supervised probing. Diagnostic weights are forbidden from runtime/deployment.

---

## 1. frozen runtime representation

For every decision state use only:

```text
PCA32 causal MaleCNS trace
+
frozen v15N 2-D recurrent own-action state h
```

No HP, damage count, contact count, time, seed, decision index, oracle action, future damage, or potion count
is a probe input.

The evaluator may use hidden HP only as the diagnostic target.

---

## 2. exhaustive counterfactual states

As in v15N-D2, enumerate every surviving prior POTION history at every decision.

For each state:

```text
z = frozen PCA32 neural snapshot
h = frozen v15N recurrent state from prior own actions
hp = evaluator-only hidden HP before current action
```

Unlike D2, no future-horizon oracle is required for the primary target.

---

## 3. fixed health targets

Two targets are frozen before collection:

```text
CRITICAL
  positive iff current HP <= 30

FULL_HEAL_AVAILABLE
  positive iff current HP <= 70
```

Rationale:

- HP <=30 is a severe current-health state.
- HP <=70 means a 30-HP potion can heal its full nominal amount.

Neither target is a runtime input.

---

## 4. diagnostic probes

Fit deterministic class-balanced ridge linear probes on exhaustive TRAIN states only.

Feature sets:

```text
FULL34
  PCA32 + h2

NEURAL32
  PCA32 only

ACTION_STATE2
  h2 only
```

All feature standardization is TRAIN-only.

The probe is diagnostic and its weights must never be copied into a POTION policy.

---

## 5. evaluation

Evaluate unchanged probe weights on:

```text
exact v15N EVAL
fresh v15N-D3 HOLDOUT
```

Report for each target/feature set/cohort:

```text
balanced accuracy
positive recall
negative recall
ordinary accuracy
```

Also report class support and per-tape balanced accuracy.

This distinguishes a reward-only readout failure from a frozen-state observability bottleneck without using
future damage labels.

---

## 6. interpretation boundary

A successful supervised diagnostic does not authorize supervised runtime training.

It means only that the allowed frozen representation contains a linearly accessible current-health signal.

A failed probe does not prove MaleCNS has no impact signal; v15M-D1 already demonstrated stable recent-impact
information. It would instead show that recent-impact evidence plus the frozen v15N own-action state does not
make the tested current-health bands linearly recoverable across cohorts.

---

## 7. deployment

No deployment change.

```text
POTION v15D
  DEPLOYED

v15N
  CLOSED / BLOCKED

v16C
  BLOCKED
```
