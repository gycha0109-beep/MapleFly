# design_v15n — minimal nonlinear own-action recurrent POTION remediation

## Purpose

The frozen diagnosis is now:

```text
MaleCNS impact signal
  present

causal trace / PCA32
  cross-cohort stable

previous-four own actions
  decision-relevantly aliased

one exponential own-action scalar
  structurally insufficient

two fixed exponential own-action traces + linear separator
  structurally insufficient
```

The remaining defect is not simple memory duration. It is the nonlinear effect of action timing and healing
saturation on the latent decision state.

v15N is the smallest nonlinear recurrence we will test.

---

## 1. preserve the biological channel

Keep the v15M causal neural representation unchanged:

```text
100 ms all-1316-D MaleCNS frames
2.0 s causal exponential trace
TRAIN-only standardization
label-free PCA32
```

No D2 supervised impact weights are loaded.

The neural representation is current evidence only; it is not fed into the new own-action recurrent state.

---

## 2. two-dimensional nonlinear own-action state

Episode start:

```text
h = [0,0]
previousAction = 0
```

At each POTION decision:

```text
h_t =
  tanh(
    R * h_(t-1)
    + q * previousAction
  )
```

where:

```text
R
  learned 2x2 matrix

q
  learned 2-vector
```

There is deliberately **no recurrent bias**.

Therefore:

```text
h_0 = 0
previous actions all WAIT
  => h remains exactly [0,0]
```

The state cannot advance an autonomous decision clock before the agent actually takes a DRINK action.

---

## 3. policy

```text
score_t =
  bias
  + neuralWeights dot PCA32_t
  + actionStateWeights dot h_t

DRINK iff score_t > 0
tie -> WAIT
```

Trainable parameters:

```text
neuralWeights
  32

R
  4

q
  2

actionStateWeights
  2

bias
  1

total
  41
```

No HP, damage, contact, time, decision index, potion count, or explicit lag vector is present.

---

## 4. why this follows D3

D3 showed that two fixed linear action traces still produce overlapping oracle-class convex hulls.

v15N changes only the own-action state family:

```text
fixed linear traces
  ->
learned bounded nonlinear recurrence
```

The stable causal neural PCA32 channel and reward objective remain conceptually unchanged.

The tanh recurrence can preserve temporal pattern information that no single linear threshold over two
fixed exponential summaries can retain.

---

## 5. anti-schedule design

The v15I failure was a schedule controller.

v15N therefore has:

- no recurrent bias;
- no decision index;
- no absolute time;
- no time-since-hit;
- no lag-specific action vector;
- no cumulative potion count.

Mandatory frozen controls must demonstrate:

1. the nonlinear own-action state contributes;
2. MaleCNS neural evidence contributes;
3. episode-specific neural alignment contributes.

An action-only recurrence that survives by following a self-generated drink schedule is a FAIL.

---

## 6. deployment boundary

Even a scientific PASS does not deploy automatically.

```text
POTION v15D
  remains deployed during v15N

v15N
  experimental

v16C
  blocked
```
