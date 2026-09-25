# result_v15m_d3 — two-timescale own-action state separability audit

## Status

```text
V15M_D3_TWO_TIMESCALE_STATE_BOTTLENECK
```

Valid preregistered diagnostic result.

Authoritative run:

```text
run
  36088917488

head
  cf1ab147c9d64d7abf4af49ee5964546e4a9b564

artifact
  10845137132

artifact name
  maplefly-v15m-d3-two-timescale-action-state-36088917488

artifact digest
  sha256:96140389e273926dfa702fdaf51512454d054a465596ccde5085df9e72ea837b

v15m_d3.json sha256
  838d291d09f6563397ad56fcee36db5ff0d918ae5a042e3e424281cae764162c
```

Preregistration:

```text
412f08a5994bb6d6a0d7baca54a2096767b25383
```

Implementation/workflow:

```text
cf848301f51efdee4fe9ea2fc5b9c878369c2090
cf1ab147c9d64d7abf4af49ee5964546e4a9b564
```

No replacement POTION policy was trained.

---

## 1. fresh cohort

```text
base seeds
  4041000
  4051000
  4061000

tapes
  24

interruption RNG
  4077000
```

All frozen lower-skill ecology gates passed.

---

## 2. exact oracle support

```text
reachable states
  5655

FORCED_WAIT
  2241

FORCED_DRINK
  2000

EITHER
  1129

UNSURVIVABLE
  285

forced states
  4241

mixed tape/decision groups
  50
```

Support guards passed.

---

## 3. frozen two-timescale state

```text
short trace decay
  0.50

long trace decay
  0.90
```

For every mixed tape/decision group, the diagnostic granted an independently optimal arbitrary linear
separator in this two-dimensional action-state plane.

That is more permissive than a real shared policy.

Result:

```text
mixed groups
  50

non-linearly-separable mixed groups
  11

non-separable fraction
  22.0%
```

Preregistered bottleneck threshold:

```text
>=10%
```

Therefore:

```text
V15M_D3_TWO_TIMESCALE_STATE_BOTTLENECK
```

---

## 4. localization

```text
non-separable groups by decision index

0  0
1  0
2  0
3  0
4  0
5  0
6  0
7  0
8  10
9  1
```

As in v15M-D2, the structural failure is concentrated at the late episode.

Adding one short and one long linear action trace reduces neither the underlying saturation/timing problem
enough to make the oracle boundary linearly representable.

---

## 5. geometry example

At fresh seed 4041020, decision 8, the convex hull of FORCED_WAIT action histories intersects the convex
hull of FORCED_DRINK action histories in the fixed:

```text
(short decay 0.50, long decay 0.90)
```

plane.

Representative forced states include:

```text
FORCED_WAIT
  prior [0,1,1,1,1,1,1,0]
  short 0.984375
  long  4.217031
  evaluator HP 30

FORCED_DRINK
  prior [1,0,1,1,1,1,1,0]
  short 0.9765625
  long  4.1638869
  evaluator HP 20
```

The full class hulls overlap, so no linear combination:

```text
wShort * short + wLong * long + threshold
```

can classify every forced state in that exact tape/decision group.

The threshold was allowed to be group-specific, so shared neural-weight limitations cannot explain this
failure.

Evaluator HP is evidence only and remains forbidden at runtime.

---

## 6. interpretation

The diagnosis has progressed from memory length to state geometry:

```text
previous four explicit actions
  insufficient

one exponential action scalar
  insufficient

two fixed exponential action traces
  still insufficient under a linear decision surface
```

The common failure is late-episode healing saturation/timing.

This makes another bank of purely linear decayed action summaries a weak next move.

The next architecture should add a **minimal nonlinear recurrent own-action state**, while preserving the
stable MaleCNS causal-trace PCA32 as the biological evidence channel.

A useful constraint is:

```text
own-action state starts at zero
no recurrent bias
zero neural + zero own actions cannot advance an internal clock
```

This directly addresses the v15I schedule failure mode.

---

## 7. deployment

No deployment change.

```text
POTION v15D
  DEPLOYED

v15M
  CLOSED / BLOCKED

v16C
  BLOCKED
```
