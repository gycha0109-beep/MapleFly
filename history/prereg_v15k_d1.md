# prereg_v15k_d1 — episode-specific neural residual audit

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / FRESH TAPE COLLECTION / OUTCOME**

Evidence entering this diagnostic:

```text
v15K
  survival 83.3%
  min-seed survival 75.0%
  excess potion 2.550 FAIL

LONG_NEURAL_HISTORY_OFF
  survival 87.5%

EPISODE_SHIFT_1
  survival 79.2%
  alignment contribution FAIL

DECISION_MEAN_NEURAL
  survival 91.7%
  alignment contribution FAIL
```

v15K closure:

```text
d830e011ac4f3484bb62cb9ddc21820df63584e2
```

Scientific question:

> After removing the TRAIN-estimated common decision-position neural component, does frozen MaleCNS
> activity retain episode-specific information sufficient to distinguish oracle WAIT from DRINK and
> support survival/economy on fresh tapes?

This is an information-localization diagnostic. No supervised probe produced here is deployment eligible.

---

## 1. frozen biological stack

Unchanged:

```text
MaleCNS
  alextitonis/fly.ai
  95a3dbcb05241b0a5c07028ca8ad945b23fbbe6e

MOVE
  v7 deployed

ATTACK
  v10F deployed

JUMP
  v11H2 deployed

interruption
  v14C deployed

v15E2 artifact
  10793265453

v15E2 representation sha
  244464c8b5e9c7f5871f35cb3acc4ac1e2e0c9b61860c1dd3c267de79d4758db

v15E2 model sha
  18be00b46303f46d62f8f63f26ca1a280b66f50f0004be6f469c637123077c96
```

Connectome synapses and all deployed skill weights remain frozen.

---

## 2. fresh cohorts

TRAIN:

```text
3601000
3611000
3621000
```

EVAL:

```text
3631000
3641000
3651000
```

Each base seed:

```text
4 distances x 2 sides
= 8 episodes/base
```

Totals:

```text
24 TRAIN
24 EVAL
```

Exact 48-second continuous ecology and ten POTION opportunities per complete tape.

Lower-skill interruption RNG:

```text
3667000
```

Consume one deterministic stream in TRAIN then EVAL collection order.

No explicit short CI job timeout.

---

## 3. neural observations saved at each POTION opportunity

For each of the ten decision opportunities save:

### scalar

```text
baseMargin =
  frozen v15E2 Q_DRINK - Q_WAIT
```

### rich neural

The exact 1,316-D standardized pooled-DN feature already consumed by frozen v15E2:

```text
z_d =
  clamp(
    (mean pooled DN d over the 4.8 s history - frozen v15E2 TRAIN mean_d)
    / frozen v15E2 TRAIN scale_d,
    -5,
    +5
  )
```

No new biological weights are learned to create this vector.

Diagnostic-only hidden game state may be used to construct oracle labels and downstream outcome metrics.
It is never a probe feature.

---

## 4. TRAIN-only common temporal component

For each decision position j=0..9 compute from TRAIN tapes only:

```text
scalarMean[j]
  mean baseMargin at position j

dnMean[j][d]
  mean standardized pooled-DN feature d at position j
```

Then:

```text
scalarResidual[j]
  = baseMargin[j] - scalarMean[j]

dnResidual[j][d]
  = pooledDn[j][d] - dnMean[j][d]
```

Freeze these TRAIN means before EVAL transformation.

Never compute EVAL means for preprocessing.

Decision position is used only to construct this diagnostic residual and the explicit P0 baseline.
The residual transform is not deployment-authorized.

---

## 5. label-free rich-DN compression

Fit PCA only on the 240 TRAIN residual DN vectors:

```text
24 tapes x 10 positions
```

Freeze exactly:

```text
32 principal components
```

No HP, contact count, oracle label, reward, or EVAL data may enter PCA.

Deterministic PCA implementation:

```text
covariance action
  X^T(Xv) / N

component extraction
  power iteration + Gram-Schmidt deflation

initial vector for component k
  deterministic PRNG seed 3678000 + k

power iterations
  80 per component

normalization epsilon
  1e-12

component sign
  force largest-absolute loading positive
```

If any component norm collapses below epsilon, the diagnostic is implementation-invalid.

Project TRAIN and EVAL residual DN vectors onto the frozen 32 components.

---

## 6. exact oracle reachable states

For every fresh tape enumerate all:

```text
2^10 = 1024
```

complete POTION action sequences.

For every reachable action prefix at every still-alive decision opportunity, evaluator privately records:

```text
Q*_WAIT
Q*_DRINK
```

under the frozen utility:

```text
U = 165 * survived - 15 * potionUses
```

Strict label:

```text
DRINK if Q*_DRINK > Q*_WAIT
WAIT  if Q*_WAIT  > Q*_DRINK
tie   excluded from classification training/evaluation
```

Hidden HP, contacts, future damage, and oracle values are diagnostic labels only.

---

## 7. four preregistered probes

All probes are linear logistic classifiers trained only on TRAIN strict oracle states.

### P0 PHASE_ACTION

```text
10-way one-hot decision position
+ previous 4 own POTION actions
```

This intentionally measures the shortcut available from episode phase.

### P1 RAW_MARGIN

```text
current + previous 9 raw baseMargins
+ previous 4 own actions
```

Unavailable neural/action history is zero-filled at episode start.

### P2 RESIDUAL_MARGIN

```text
current + previous 9 TRAIN-detrended scalar residuals
+ previous 4 own actions
```

### P3 RESIDUAL_DN32

```text
current + previous 9 residual DN PCA32 vectors
+ previous 4 own actions
```

Dimension:

```text
10 * 32 + 4 = 324
```

No probe receives HP, contact count, time in seconds, seed, future state, or oracle value.

---

## 8. frozen probe optimizer

For every P0..P3:

```text
model
  linear logistic

initial weights/bias
  0

class weighting
  equal total WAIT / DRINK weight

epochs
  250

learning rate
  0.05

L2
  0.001

weight/bias clamp
  [-10,+10]

sample order
  deterministic fixed order

early stopping
  none
```

No hyperparameter sweep and no EVAL-based model selection.

---

## 9. classification gates

On strict EVAL oracle states:

```text
balanced accuracy >= 70%
WAIT recall       >= 60%
DRINK recall      >= 60%
```

---

## 10. deterministic downstream evaluation

For each EVAL tape, start with empty own-action history and apply each frozen probe sequentially across
the ten decision opportunities.

The environment privately applies potion healing and frozen contact schedule.

Economy-capable requires all:

```text
classification BA               >= 70%
WAIT recall                     >= 60%
DRINK recall                    >= 60%
survival                        >= 75%
minimum base-seed survival      >= 62.5%
mean excess uses among survivors <= 1.5
wasted healing / DRINK          <= 10
```

Evaluator-only minimum-use oracle is computed by exhaustive 2^10 enumeration after probe training.

---

## 11. episode-specific alignment control

Apply only to P2 and P3.

Keep each EVAL contact/game tape fixed.

Cyclically replace the complete ten-step neural residual sequence with the next EVAL episode's residual
sequence. Own actions remain generated by the probe on the recipient tape.

For P2 this shifts scalar residuals.
For P3 this shifts residual PCA32 sequences.

Episode-specific contribution is present if, relative to FULL, at least one occurs:

```text
balanced accuracy drop >= 10 percentage points
OR
survival drop >= 12.5 percentage points
OR
mean excess uses among survivors increases >= 1.0
OR
shifted control has zero survivors while FULL survives
```

No retraining under the shifted control.

---

## 12. lower-skill tape validity

Fresh EVAL tape validity must satisfy:

```text
episodes with >=3 kills          >= 75%
obstacle clear                   >= 85%
target kill                      >= 70%
LEFT target kill                 >= 65%
RIGHT target kill                >= 65%
attack precision                 >= 45%
airborne attack                  <= 22%
post-clear jump encounter        <= 25%
pre-clear attack encounter       <= 30%
```

If these fail, outcome is implementation/ecology invalid rather than an information conclusion.

---

## 13. preregistered localization hierarchy

### A

If P2 is economy-capable and P2 episode-shift contribution is present:

```text
V15K_D1_SCALAR_RESIDUAL_SIGNAL_PRESENT
```

Interpretation:

```text
episode-specific injury-relevant information survives all the way into the frozen v15E2 scalar margin;
the main unresolved problem is reward-only shortcut learning / causal detrending
```

P3 remains descriptive and cannot override A.

### B

Else, if P3 is economy-capable and P3 episode-shift contribution is present:

```text
V15K_D1_RICH_DN_SIGNAL_PRESENT_SCALAR_COMPRESSION_LOSS
```

Interpretation:

```text
episode-specific information is demonstrable in the richer pooled-DN representation but not sufficient
in the scalar residual under the frozen gates
```

This authorizes a future POTION readout over richer DN evidence, not deployment of P3.

### C

Otherwise:

```text
V15K_D1_EPISODE_SPECIFIC_SIGNAL_NOT_DEMONSTRATED
```

Interpretation:

```text
under this preregistered residualization/probe test, episode-specific injury-relevant neural information
was not demonstrated strongly enough for the existing survival/economy objective
```

This does not prove biological absence of signal.

---

## 14. stop rule

After outcome:

- do not tune PCA component count;
- do not tune residual definition;
- do not tune probe optimizer;
- do not relax gates;
- do not choose a favorable subset of EVAL states;
- do not deploy supervised probes;
- do not add HP/contact/time to runtime state.

Freeze the result before designing the next reward-only policy.

Deployment remains blocked.
v16C remains blocked.
