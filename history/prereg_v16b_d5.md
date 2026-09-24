# prereg_v16b_d5 — phase/recency vs inter-contact spacing

## 0. Trigger

v16B-D4 closed as:

```text
V16B_D4_IN_WINDOW_TIMING_DOMINANT
```

Primary D4 result:

```text
canonical timing + real side   DRINK 82.1%
real timing + real side        DRINK  4.5%

timing effect                  77.6pp
side effects                    3.0 / 4.5pp
boundary-tail effect            0.0pp
```

D5 asks which in-window timing property carries that failure:

1. absolute phase / recency, especially how late the latest injury evidence occurs;
2. inter-contact spacing pattern independent of the latest-injury phase.

Diagnostic only. No policy/connectome/threshold/gain change.

---

## 1. frozen provenance

```text
MaleCNS
  alextitonis/fly.ai
  95a3dbcb05241b0a5c07028ca8ad945b23fbbe6e

POTION
  V15D_DEPLOYED

representation
  33fc31f636e1cde215841dd33b0a93b24d4571cdabd32e9a1edc8fa2e696c847

policy
  47088bcb15ed2cd96f64d67a20169934bd7a866dcd56bacffea70b1f42537a59

v16B source run
  35944188466

v16B source JSON sha256
  062f5d8e222ba188f173bec96fc2a8210910938b074fb45f4708fa0f45611528

D4 run
  35955487325

D4 artifact
  10790362728

D4 digest
  sha256:fe601ff6b2c80808e9a00856283e587205dc78152e80305043a23633178c606d

D4 closure
  b2a6a977f945beb24659cc8394dd4fe2565afe08
```

---

## 2. base cohort and sensory semantics

Start from the same 67 authoritative windows with exactly 2 or 3 causal contacts.

```text
window          240 steps
frame             5 steps
history           48 frames
ground SNta       bilateral 0.05
LgLG drive        0.7
pulse length      6
taste             bilateral 0.8 final frame only
visual            OFF
fresh MaleCNS     every replay
fresh baseline    every replay
pre-window tail   OFF
side sequence     REAL, chronological
```

Real source contact at step `d` gives local pulse onset:

```text
d + 1 - windowStart
```

All D5 interventions manipulate pulse onset time only. They never alter contact count or side identity.

---

## 3. frozen canonical timing pattern

Use the exact D3/D4 canonical generator:

```text
candidate onsets
  25,55,85,115,145,175

rng
  brainSeed + decisionIndex*1000 + 500000

shuffle
take first n
sort
```

Only the canonical **onset positions** are used. D5 keeps the real chronological side sequence.

The latest canonical candidate, 175, is the preregistered phase anchor. It is not estimated from D5 results.

---

## 4. phase/recency arm

For a real onset sequence:

```text
r1 < ... < rn
span = rn - r1
```

A window is PHASE_ELIGIBLE iff translating the whole sequence so the latest onset becomes 175
keeps every onset inside [0,239].

Equivalent:

```text
p_i = r_i + (175 - rn)
all p_i in [0,239]
```

Because translation is rigid:

- every inter-contact gap is unchanged;
- chronological side sequence is unchanged;
- only absolute within-window phase/recency changes.

Conditions on exactly the same PHASE_ELIGIBLE windows:

### P_REAL
Exact real in-window onsets.

### P_PHASE175
Rigidly translated real onsets with latest onset fixed to 175.

### P_CANONICAL
Full canonical onset pattern for the same count, with real side sequence.
This is a capability control, not part of the phase-effect calculation.

Primary phase rescue:

```text
phaseRescue =
  DRINK(P_PHASE175) - DRINK(P_REAL)
```

---

## 5. spacing arm

For the same window let canonical sorted onsets be:

```text
c1 < ... < cn
```

Build canonical relative offsets from the canonical latest onset:

```text
offset_i = c_i - cn
```

Keep the real latest onset `rn` frozen and transplant only the canonical gap pattern:

```text
s_i = rn + offset_i
```

A window is SPACING_ELIGIBLE iff all `s_i` are inside [0,239].

Thus:

- latest-injury recency `rn` is exactly unchanged;
- contact count unchanged;
- real chronological side sequence unchanged;
- only inter-contact spacing pattern changes to a v15-supported canonical pattern.

Conditions on exactly the same SPACING_ELIGIBLE windows:

### S_REAL
Exact real in-window onsets.

### S_CANONICAL_GAPS
Canonical relative spacing anchored at the exact real latest onset.

### S_CANONICAL
Full canonical onset pattern for the same count, with real side sequence.
Capability control only.

Primary spacing rescue:

```text
spacingRescue =
  DRINK(S_CANONICAL_GAPS) - DRINK(S_REAL)
```

---

## 6. arm validity gates

Each arm must independently satisfy all three:

```text
eligible N >= 20

REAL DRINK rate <= 30%

CANONICAL DRINK rate >= 60%
```

These ensure:
- enough paired windows remain;
- the selected cohort still exhibits the v16B timing failure;
- the same cohort can still express DRINK under training-supported timing.

If either arm fails validity:

```text
V16B_D5_CONTROL_FAILURE
```

No phase-vs-spacing causal classification is made.

---

## 7. preregistered causal gates

After both arms are valid:

```text
phaseSensitive
  phaseRescue >= 20 percentage points

spacingSensitive
  spacingRescue >= 20 percentage points
```

Classification:

```text
phase=true, spacing=false
  V16B_D5_PHASE_RECENCY_DOMINANT

phase=false, spacing=true
  V16B_D5_SPACING_DOMINANT

phase=true, spacing=true
  V16B_D5_PHASE_AND_SPACING

phase=false, spacing=false
  V16B_D5_HIGHER_ORDER_TIMING_STRUCTURE
```

"Dominant" here means sufficient under the preregistered intervention/gate, not that every possible
timing statistic has been exhausted.

---

## 8. descriptive audit

Before any outcome label, emit for the full 67-window base cohort:

```text
real latest-onset min/mean/max
real first-onset min/mean/max
real span min/mean/max
real inter-contact gap min/mean/max
phase-eligible N
spacing-eligible N
```

For each arm/condition emit:

```text
N
DRINK rate
Q_WAIT min/mean/max
mean Q_DRINK
mean Q margin
```

Per-window evidence includes original/transformed onsets and all Q values.

Descriptive statistics cannot change eligibility rules or gates.

---

## 9. stop rule

After observing D5 do not change:

- 175 phase anchor;
- canonical generator;
- eligibility formulas;
- N>=20 gate;
- REAL<=30% gate;
- CANONICAL>=60% gate;
- 20pp rescue gates;
- frozen v15D;
- v16B FAIL.

Any remediation or sliding-decision architecture requires a later preregistration.
