# result_v15m_d1 — cross-cohort causal-trace PCA stability audit

## Status

```text
V15M_D1_TRACE_AND_PCA_SIGNAL_STABLE
```

This is a valid preregistered diagnostic result.

Authoritative run:

```text
run
  36085872379

head
  3ad86f1ebf2e78175f8baa61c0c549029c01c5ff

artifact
  10843779825

artifact name
  maplefly-v15m-d1-trace-pca-stability-36085872379

artifact digest
  sha256:b88006fe192ede9d6a83897d3f1c9146f5b73d4522a3fd659e9bbfa2212a9286

v15m_d1.json sha256
  64b8589f1c60e988d5c47749910ae5fdebad4acf497f91c8b28071e8a40efa08
```

Preregistration:

```text
41be09846362c0e4162468b6bbaa183144555f92
```

Implementation/workflow:

```text
fa44491c8224cfa158dbd4c904f9cb14d5f856f1
3ad86f1ebf2e78175f8baa61c0c549029c01c5ff
```

Frozen v15M preprocessing was reproduced exactly:

```text
83cd6fa437c7cb526fc59bbb19285d7af7c7f2e397a97f7ac3b422409bccda99
```

No replacement POTION policy was trained.

---

## 1. ecology and support validity

Both EVAL and fresh HOLDOUT passed every frozen lower-skill ecology gate.

Label support also passed:

```text
TRAIN
  positive 191
  negative 49

EVAL
  positive 193
  negative 47

HOLDOUT
  positive 191
  negative 49
```

The preregistered minimum was 30 per class.

---

## 2. RAW causal trace

TRAIN-standardized 1316-D causal trace with a TRAIN-only centroid probe:

```text
TRAIN balanced accuracy
  78.28%

EVAL balanced accuracy
  75.12%

fresh HOLDOUT balanced accuracy
  80.77%
```

Fresh HOLDOUT episode-shift control:

```text
aligned
  80.77%

EPISODE_SHIFT_1
  55.12%

aligned - shifted
  +25.64 pp
```

Preregistered RAW stability requirements:

```text
HOLDOUT BA >=65%
  PASS

aligned-minus-shifted >=10 pp
  PASS
```

Therefore:

```text
rawStable = true
```

---

## 3. PCA32 causal trace

The exact v15M TRAIN-only label-free PCA32 representation:

```text
TRAIN balanced accuracy
  77.49%

EVAL balanced accuracy
  76.47%

fresh HOLDOUT balanced accuracy
  81.00%
```

Fresh HOLDOUT episode-shift control:

```text
aligned
  81.00%

EPISODE_SHIFT_1
  54.08%

aligned - shifted
  +26.93 pp
```

Preregistered PCA stability requirements:

```text
HOLDOUT BA >=65%
  PASS

aligned-minus-shifted >=10 pp
  PASS
```

TRAIN to HOLDOUT BA change:

```text
77.49% -> 81.00%
+3.51 pp
```

There is no preregistered strong PCA degradation:

```text
strongPcaDegradation = false
pcaStable = true
```

---

## 4. scientific interpretation

The v15M TRAIN->EVAL survival collapse is not explained by loss of the preregistered RECENT_IMPACT_2S
signal in the causal DN trace or by PCA32 destroying that signal.

The signal survives all three cohorts and remains episode-specific:

```text
RAW HOLDOUT
  80.77% BA
  shift penalty 25.64 pp

PCA32 HOLDOUT
  81.00% BA
  shift penalty 26.93 pp
```

This narrows the v15M failure downstream.

Combined evidence now says:

```text
v15K-D2
  impact-locked frozen MaleCNS information exists

v15L-D1
  four-action runtime observation is decision-relevantly aliased

v15M
  compact recurrent belief reward-only policy fails to generalize and does not use its action state

v15M-D1
  causal trace + PCA32 still carry stable cross-cohort recent-impact information
```

Therefore the next unresolved distinction is:

```text
A. the one-dimensional recurrent decision-state architecture is insufficient
vs
B. the architecture is sufficient but reward-only CEM fails to discover the useful state/policy
```

v15M-D1 itself does not decide between A and B.

---

## 5. deployment state

No deployment change is authorized.

```text
POTION v15D
  DEPLOYED

v15M
  CLOSED / BLOCKED

v16C
  BLOCKED
```

The next diagnostic should test the representational upper bound of the frozen v15M recurrent
decision-state architecture under oracle-supervised diagnostics before another reward-only remediation is
attempted.
