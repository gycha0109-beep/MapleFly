# design_v15n_d6_d2_d3_d3_context_balanced_dn_innovation

## Question

R1 validly froze:

```text
V15N_D6_D2_D3_D2_R1_CONDITIONAL_REIMPACT_NOT_REPLICATED
```

The frozen DERIVATIVE3 readout retained re-impact and LINGER discrimination but almost completely failed previous-positive BACKGROUND rejection.

D3-D3 asks two coupled questions on entirely fresh cohorts:

1. Does explicit TRAIN-only balancing of POSITIVE / LINGER / BACKGROUND resolve the conditional scalar failure?
2. If not, does the spatial 1316-D frozen MaleCNS innovation pattern contain re-impact information that the scalar projection discarded?

No eventizer or POTION policy is evaluated.

---

## 1. frozen neural representation

Use the exact D6 phase-residualized 1316-D neural frame:

```text
r_t
```

Causal innovation:

```text
innovation_t =
  r_t - mean(r_(t-1) ... r_(t-5))
```

Use the exact label-free D2-D2 PCA preprocessing:

```text
eligible TRAIN innovation sequence
-> exactly 240 evenly spaced TRAIN rows
-> TRAIN-only standardization
-> deterministic PCA32
-> 80 power iterations
-> PCA seed 3948000
```

Required preprocessing SHA256:

```text
b187f3de9229e14260b8d1464e20fa3b8d26158a715a5372e4696c1bf3b7fb33
```

This PCA fit does not use hit labels.

---

## 2. conditional context and labels

Reproduce D3-D2 exactly.

Only rows whose immediately previous eligible frame is positive under the frozen old D2-D2 scalar model enter the diagnostic.

Labels:

```text
POSITIVE_REIMPACT
  first eligible frame at/after physical hit and <100 ms
  previous old-scalar-positive required

NEGATIVE_LINGER
  previous old-scalar-positive
  0.5 s <= latest hit age < 2.0 s
  no hit in preceding 100 ms

NEGATIVE_BACKGROUND
  previous old-scalar-positive
  no prior hit OR latest hit age >= 2.0 s
  no hit in preceding 100 ms
```

Labels are evaluator/trainer-only diagnostic truth.

---

## 3. feature families

### DN_INNOVATION_PCA32 — primary

Project the causal 1316-D innovation through the exact frozen label-free PCA32.

Dimension: 32.

### DERIVATIVE3 — scalar comparator

```text
delta1
delta5mean
peakRise5
```

This is the same scalar innovation representation that failed R1, but now receives the identical context-balanced training weights as DN_INNOVATION_PCA32.

---

## 4. context-balanced diagnostic ridge

For each family independently:

```text
TRAIN-only feature standardization
deterministic ridge least squares
lambda = 1e-3
threshold = 0.5
```

Training sample weights are frozen by diagnostic stratum:

```text
total POSITIVE_REIMPACT weight  = 1/3
total NEGATIVE_LINGER weight    = 1/3
total NEGATIVE_BACKGROUND weight= 1/3
```

Thus each row receives:

```text
POSITIVE row weight   = 1 / (3 * N_positive)
LINGER row weight     = 1 / (3 * N_linger)
BACKGROUND row weight = 1 / (3 * N_background)
```

No threshold/hyperparameter search.

This weighting is diagnostic training only; it is not a deployable source of oracle context.

---

## 5. cohorts

Original TRAIN is used only for fitting:

```text
4081000 4091000 4101000
interruption 4147000
```

Two entirely fresh prospective 64-tape cohorts:

```text
PROSPECTIVE_A
  4731000 4741000 4751000 4761000
  4771000 4781000 4791000 4801000
interruption 4817000

PROSPECTIVE_B
  4821000 4831000 4841000 4851000
  4861000 4871000 4881000 4891000
interruption 4907000
```

Previous D3-D2/R1 EVAL/HOLDOUT/replication episodes do not enter gates.

---

## 6. support

Each prospective cohort independently requires:

```text
64 tapes
POSITIVE_REIMPACT >= 400
NEGATIVE_LINGER >= 500
NEGATIVE_BACKGROUND >= 500
```

---

## 7. observability

A family passes only if all are true on both prospective cohorts:

```text
balanced accuracy >= 0.75
positive re-impact recall >= 0.75
overall negative recall >= 0.75
LINGER negative recall >= 0.75
BACKGROUND negative recall >= 0.75
```

Subtype recalls are explicit gates so overall negative support cannot hide BACKGROUND failure.

---

## 8. scientific interpretation

Possible valid interpretations:

- DN passes, DERIVATIVE3 fails:
  spatial DN innovation adds necessary information beyond the scalar projection.

- both pass:
  prior scalar failure was substantially attributable to conditional-context weighting rather than lack of scalar information.

- DERIVATIVE3 passes, DN fails:
  the scalar dynamics are sufficient under context-balanced training; PCA32 loses useful information.

- neither passes:
  this causal 5-frame innovation family does not demonstrate robust conditional re-impact separability.

Any successful diagnostic remains nondeployable because impact labels are used for diagnostic readout training.
