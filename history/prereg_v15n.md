# prereg_v15n — minimal nonlinear own-action recurrent POTION remediation

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / TRAINING / OUTCOME**

Frozen evidence chain:

```text
v15M-D1
  V15M_D1_TRACE_AND_PCA_SIGNAL_STABLE

v15M-D2
  V15M_D2_SCALAR_ACTION_STATE_BOTTLENECK

v15M-D3
  V15M_D3_TWO_TIMESCALE_STATE_BOTTLENECK

v15M-D3 receipt
  af2564893bf50ebef25e4a95c031588557e3e33b
```

Design:

```text
history/design_v15n_nonlinear_action_recurrence.md
commit fe9c6ba748ae09ae7d9fbf660dce5e72ee933665
```

---

## 1. fresh cohorts

TRAIN:

```text
4081000
4091000
4101000
```

EVAL:

```text
4111000
4121000
4131000
```

24 tapes per cohort.

Interruption RNG:

```text
4147000
```

TRAIN is collected first and EVAL second from the same deterministic interruption RNG stream.

---

## 2. frozen neural representation

Use the v15M recipe unchanged:

```text
MaleCNS
  frozen

DN count
  1316

frame
  100 ms

frame value
  clamp((DN_rate - episode_baseline_rate)/50, -1,+1)

causal trace half-life
  2.0 s

trace decay
  0.9659363289248456

decision snapshot
  current trace

standardization
  TRAIN-only mean/std
  scale floor 1e-6

PCA
  32 components
  80 power iterations/component
  seed base 3948000
  labelsUsed=false
```

No supervised diagnostic weight is loaded.

---

## 3. frozen nonlinear own-action state

Hidden dimension:

```text
2
```

Episode initialization:

```text
h0 = [0,0]
previousAction = 0
```

Update before current action:

```text
h_t[0] =
  tanh(
    R00*h_prev[0]
    + R01*h_prev[1]
    + q0*previousAction
  )

h_t[1] =
  tanh(
    R10*h_prev[0]
    + R11*h_prev[1]
    + q1*previousAction
  )
```

No recurrent bias.

Policy:

```text
score =
  bias
  + neuralWeights dot PCA32_t
  + stateWeight0*h_t[0]
  + stateWeight1*h_t[1]

DRINK iff score > 0
tie -> WAIT
```

Parameter order:

```text
0
  bias

1..32
  neural weights

33..36
  R00 R01 R10 R11

37..38
  q0 q1

39..40
  state weights
```

Total:

```text
41
```

---

## 4. forbidden runtime inputs

Never provide:

```text
HP / maxHP / missingHP
damage amount/count
contact flag/count/timestamp
time since hit
decision index
absolute time
potion count
cumulative potion count
future damage/contact
effective healing
wasted healing
oracle minimum uses
oracle action
oracle injury state
seed
target/obstacle geometry
```

Only:

```text
current MaleCNS-derived PCA32
previous internal 2-D action state
previous own POTION action
```

may affect the POTION decision.

---

## 5. reward-only CEM

```text
generations
  100

population
  256

elites
  32

old weight
  0.20

elite weight
  0.80

minimum std
  0.05

parameter clamp
  [-8,+8]

sampling RNG
  4168000

initial mean
  all 0

initial std
  all 1
```

No EVAL model selection.

Final candidate is the generation-100 smoothed distribution mean.

---

## 6. TRAIN objective

Keep the v15M objective:

```text
fitness =
  10000*survivalRate
  + meanTerminalHP
  - 15*meanPotionUses
```

HP is evaluator/environment state used for outcome reward only.

It is never a runtime policy input.

---

## 7. primary EVAL gates

All must pass:

```text
survival rate                    >=75%
minimum base-seed survival       >=62.5%
mean excess uses among survivors <=1.5
wasted healing / DRINK           <=10
```

Oracle minimum uses are post-hoc metrics only.

Lower-skill ecology gates remain unchanged from v15M.

---

## 8. mandatory frozen controls

No retraining.

### ACTION_STATE_OFF

At every decision:

```text
h = [0,0]
```

The current neural PCA32 remains.

Required contribution:

```text
survival drop >=12.5 pp
OR
mean excess uses increase >=1.0
```

### NEURAL_OFF

Force:

```text
neuralWeights dot PCA32 = 0
```

The nonlinear own-action recurrence remains.

Required contribution:

```text
survival drop >=12.5 pp
OR
mean excess uses increase >=1.0
```

An action-only self-generated schedule that improves survival/economy does not satisfy this gate.

### EPISODE_SHIFT_1

Give each EVAL tape the next EVAL episode's complete neural sequence while retaining the target tape and
its endogenous own-action recurrence.

Required contribution:

```text
survival drop >=12.5 pp
OR
mean excess uses increase >=0.5
```

### DECISION_MEAN_NEURAL

Replace episode-specific neural PCA32 at each decision position with the TRAIN-only mean PCA32 for that
position.

Required contribution:

```text
survival drop >=12.5 pp
OR
mean excess uses increase >=0.5
```

Both neural-alignment controls are mandatory.

---

## 9. outcome

If ecology is valid, all primary gates pass, and all four mandatory controls contribute:

```text
V15N_NONLINEAR_ACTION_RECURRENCE_PASS
```

A PASS authorizes evidence freeze and a separate deployment-specific validation only.

If ecology is valid but any scientific gate fails:

```text
V15N_NONLINEAR_ACTION_RECURRENCE_FAIL
```

If provenance/runtime/ecology is invalid:

```text
V15N_IMPLEMENTATION_OR_ECOLOGY_INVALID
```

---

## 10. stop rule

After the first authoritative outcome do not change inside v15N:

- hidden dimension;
- tanh recurrence;
- no-bias rule;
- neural trace half-life;
- PCA width/iterations/seed;
- TRAIN/EVAL seeds;
- reward;
- CEM;
- gates;
- control thresholds.

Do not add explicit lag memory.
Do not add HP/contact/damage/time inputs.
Do not deploy diagnostic oracle weights.
Do not modify deployed v15D.

```text
POTION v15D
  DEPLOYED

v15N
  EXPERIMENTAL

v16C
  BLOCKED
```
