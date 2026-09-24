# prereg_v16b_d6 — phase-response curve

## 0. Trigger

v16B-D5 closed as:

```text
V16B_D5_PHASE_RECENCY_DOMINANT
```

D5:

```text
PHASE arm
  real       DRINK  3.4%
  phase175   DRINK 25.9%
  canonical  DRINK 81.0%
  rescue          +22.4pp

SPACING arm
  real             DRINK 4.8%
  canonical gaps   DRINK 7.9%
  canonical        DRINK 82.5%
  rescue                +3.2pp
```

D5 establishes that absolute within-window phase/recency matters, but phase175 still remains far
below the full canonical pattern. D6 asks whether the frozen v15D readout has:

1. a broad recency gradient — later injury evidence increasingly favors DRINK;
2. a phase-localized response band around the trained latest-onset region;
3. or no stable phase-response curve on the same paired cohort.

Diagnostic only. No learning or deployment change.

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

D5 run
  35956418116

D5 artifact
  10790728530

D5 digest
  sha256:c037eb2043713d27b9c31a364932af268e3e543ae453e33d207029ee7e611f7b

D5 closure
  308af180ab6c25d97d568e4180c7e061a366a60a
```

---

## 2. base cohort

Start from the same authoritative v16B support windows:

```text
causal contacts per decision window
  exactly 2 or 3

base N
  67
```

Real source contact at absolute step `d` becomes local LgLG onset:

```text
d + 1 - windowStart
```

Side sequence remains the exact real chronological side sequence.

Pre-window pulse tail remains OFF, matching the D5 phase arm.

---

## 3. common paired cohort

D6 uses one common cohort for every phase anchor so rates can be compared directly.

Frozen anchors:

```text
145
175
205
```

They are separated by exactly 30 brain steps = 0.6 s.

- 145 and 175 are inside the frozen v15 canonical candidate grid.
- 205 is one equal 30-step extension beyond the latest canonical candidate and is diagnostic OOD.
- It is included to determine whether rescue continues with greater recency or peaks near the trained region.

For real onsets:

```text
r1 < ... < rn
```

anchor transform:

```text
delta = anchor - rn
p_i = r_i + delta
```

A base window enters the COMMON cohort iff **all three** transformed sequences satisfy:

```text
0 <= p_i <= 234
```

The upper bound 234 guarantees the full six-step LgLG pulse remains inside the 240-step history.

The same common windows are used for REAL, A145, A175, A205, and CANONICAL.

---

## 4. sensory/runtime contract

Every replay:

```text
fresh MaleCNS
fresh ground baseline
window          240 steps = 4.8 s
frame             5 steps
history           48 frames
ground SNta       bilateral 0.05
LgLG drive        0.7
pulse length      6 steps
taste             bilateral 0.8 final frame only
visual            OFF
pre-window tail   OFF
side sequence     REAL
```

No HP, contact count, anchor identity, correct action, or reward label enters the policy.

---

## 5. conditions

### REAL

Exact real in-window onset sequence.

### A145

Rigid translation; latest onset = 145.

### A175

Rigid translation; latest onset = 175.

### A205

Rigid translation; latest onset = 205.

### CANONICAL

Exact D3/D4/D5 canonical onset generator for the same contact count:

```text
candidate onsets
  25,55,85,115,145,175

rng
  brainSeed + decisionIndex*1000 + 500000

shuffle
take first n
sort
```

Real chronological side sequence is assigned to canonical onsets.

CANONICAL is a capability control, not a phase anchor.

---

## 6. validity gates

All must pass:

```text
COMMON N >= 20

REAL DRINK <= 30%

CANONICAL DRINK >= 60%
```

D5-direction replication on the common cohort:

```text
A175 DRINK - REAL DRINK >= 15 percentage points
```

The 15pp requirement is preregistered before D6 observation. It is a replication-direction
gate on a stricter common subset, not a replacement for D5's already-frozen 20pp result.

Failure:

```text
V16B_D6_CONTROL_FAILURE
```

No response-shape classification after failure.

---

## 7. preregistered phase-response effects

```text
earlyToTrained =
  DRINK(A175) - DRINK(A145)

trainedToLate =
  DRINK(A205) - DRINK(A175)

fullSweep =
  DRINK(A205) - DRINK(A145)
```

A material phase step is:

```text
>= 15 percentage points
```

### RECENCY_GRADIENT

true iff:

```text
A145 <= A175 <= A205
and
fullSweep >= 20pp
```

### TRAINED_PHASE_PEAK

true iff:

```text
A175 - A145 >= 15pp
and
A175 - A205 >= 15pp
```

### LATE_PHASE_PEAK

true iff:

```text
A205 - A175 >= 15pp
and
A205 - A145 >= 20pp
```

Classification priority after validity:

```text
TRAINED_PHASE_PEAK
  V16B_D6_TRAINED_PHASE_PEAK

else RECENCY_GRADIENT
  V16B_D6_RECENCY_GRADIENT

else LATE_PHASE_PEAK
  V16B_D6_LATE_PHASE_PEAK

else
  V16B_D6_PHASE_RESPONSE_COMPLEX
```

The priority prevents a noisy three-point curve from receiving two labels.

---

## 8. canonical-gap audit

For each anchor condition record:

```text
canonicalGap =
  CANONICAL DRINK - anchor DRINK
```

This is descriptive only.

Even if one phase anchor improves DRINK, D6 does not claim that phase alone explains the entire
canonical-vs-real gap unless the preregistered response classification supports it.

---

## 9. output

Record for each condition:

```text
N
DRINK rate
Q_WAIT min/mean/max
mean Q_DRINK
mean Q margin
```

Per paired window:

```text
brain seed
decision index
real onsets/sides
A145 onsets
A175 onsets
A205 onsets
canonical onsets
all five actions/Q values
```

---

## 10. stop rule

After observing D6 do not change:

- anchors 145/175/205;
- common-cohort eligibility;
- pulse semantics;
- 15pp D5-direction gate;
- 15pp material-step gate;
- 20pp sweep gate;
- classification priority;
- frozen v15D.

D6 is diagnostic only.

A sliding-decision or ecological retraining experiment requires a new preregistration after D6 is frozen.
