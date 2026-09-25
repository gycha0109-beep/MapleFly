# design_v15n_d6_mechanistic_impact_accumulator — detect recent impacts, then accumulate neural evidence

## Why this diagnostic exists

v15N-D5 showed that retaining the full DN vector at 0.5 / 2 / 8 / 32 second exponential time scales is
not enough to produce a generalizable cumulative-injury coordinate with generic PCA32 + ridge.

At the same time:

- v15K-D2 showed strong cross-episode recent-impact information in frozen MaleCNS DN activity;
- v15M-D1 showed the causal trace/PCA signal itself is cross-cohort stable;
- v15N-D5 still showed a preregistered episode-shift degradation even though absolute cumulative-injury
  reconstruction failed.

The next question is therefore narrower:

> Can a mechanistically constrained neural event detector convert the known short impact signal into a
> stable cumulative injury state?

This is an upper-bound diagnostic. The impact detector is trained with evaluator-only contact-age labels
and is therefore **not deployable**.

---

## 1. neural frame

Every 100 ms use the same all-1316-D normalized MaleCNS frame:

```text
x_t[d] =
  clamp((DN_rate_t[d] - episode_baseline_rate[d]) / 50, -1, +1)
```

No HP, damage count, contact flag, contact age, decision number, or oracle label enters the runtime feature.

---

## 2. TRAIN-only phase residualization

The environment has a repeatable 48-frame / 4.8-second POTION observation cycle.

For each frame phase 0..47, fit on TRAIN only:

```text
phaseMean[phase][d]
```

Then:

```text
r_t = x_t - phaseMean[phase_t]
```

This is the same structural control used by the successful v15K-D2 impact-retention diagnostic.

---

## 3. diagnostic recent-impact detector

Evaluator-only labels:

```text
POSITIVE
  most recent real contact-damage age in [0, 200 ms)

NEGATIVE
  no prior real contact damage
  OR most recent contact-damage age >= 2.0 s

EXCLUDED
  200 ms <= age < 2.0 s
```

Fit on TRAIN only:

```text
positiveMean
negativeMean

w =
  normalize(positiveMean - negativeMean)

threshold =
  midpoint(
    mean TRAIN positive projection,
    mean TRAIN negative projection
  )
```

At runtime the detector uses only neural residual:

```text
margin_t = dot(w, r_t) - threshold
```

Oracle contact-age labels are used only to fit and evaluate this diagnostic direction.

---

## 4. causal cumulative neural evidence

Convert the detector margin into non-negative evidence:

```text
separation =
  TRAIN positive projected mean
  - TRAIN negative projected mean

e_t =
  max(0, margin_t) / separation
```

Then accumulate causally without access to hidden game state:

```text
A_0 = 0
A_t = A_t-1 + e_t
```

No reset is triggered by a hidden hit. No damage counter is supplied.

At each POTION decision snapshot retain only the scalar `A_t`.

---

## 5. remove the repeatable decision-position profile

Fit TRAIN-only decision-position means:

```text
meanEvidence[d]
meanDamage[d]
```

Diagnostic variables:

```text
evidenceResidual =
  A_t - meanEvidence[decisionIndex]

damageResidual =
  cumulativeDamageBeforeDecision
  - meanDamage[decisionIndex]
```

This prevents a generic "later in episode => more evidence => more damage" trajectory from passing.

Decision index is evaluator-only preprocessing here; it is not a runtime POTION input.

---

## 6. one-dimensional calibration

Fit exactly one TRAIN-only affine ridge readout:

```text
damageResidual ~ evidenceResidual
ridge lambda = 1e-3
```

No PCA, no multivariate flexible readout, no hyperparameter search.

The calibration is diagnostic-only and non-deployable.

---

## 7. controls

Report:

1. recent-impact detector balanced accuracy / positive recall / negative recall;
2. cumulative-damage residual R2 / MAE / RMSE / Pearson r;
3. episode-shift control:
   replace each episode's evidenceResidual sequence with the next episode's sequence at the same decision
   indices while keeping the recipient damage target;
4. decision-mean-only baseline, which predicts zero damageResidual and therefore has R2=0 by construction
   on a cohort whose residual mean structure matches TRAIN.

---

## 8. interpretation

Possible scientific conclusions:

- detector stable + accumulator stable:
  the known recent-impact signal can be transformed into a causal cumulative neural injury state;
- detector stable + accumulator weak:
  impacts are observable but naive positive-evidence integration does not preserve a stable cumulative
  injury variable;
- detector weak on these cohorts:
  the previously demonstrated impact direction does not transfer under this exact v15N cohort contract.

None of these outcomes deploys a POTION policy.

---

## 9. deployment

```text
POTION v15D
  DEPLOYED

v15N
  CLOSED / BLOCKED

v16C
  BLOCKED
```
