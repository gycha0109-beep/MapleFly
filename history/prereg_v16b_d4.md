# prereg_v16b_d4 — contact timing / side / boundary-tail decomposition

## 0. Trigger

v16B-D3 closed as:

```text
V16B_D3_REAL_CONTACT_SCHEDULE_INTERFERENCE
```

Primary 2..3-contact support:

```text
source FULL       DRINK  6.0%
CANONICAL_RESET   DRINK 85.1%
REAL_RESET        DRINK  4.5%
REAL_PERSISTENT   DRINK  4.5%

scheduleDrop 80.6pp
persistenceDrop 0.0pp
```

D4 decomposes the D3 "real contact schedule" factor without changing the deployed policy.

No learning, v15D weight change, threshold change, sensory-gain change, connectome change,
or v16B result reinterpretation is allowed.

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

D3 authoritative run
  35950443954

D3 artifact
  10789315281

D3 digest
  sha256:80503579c0e72ce60d682cd8592d9ddf84094a0f0a84338e69afe1fd88a60025

D3 closure
  26da9fcaf6cd0945b6da194e4a82f451036eca74
```

---

## 2. cohort

Use the same authoritative 84 D3 windows.

Primary support remains frozen:

```text
causal contact onsets per window = 2 or 3
N = 67
decisionStep contact excluded
```

All D4 primary classifications use only these 67 paired windows.

Each condition is a fresh MaleCNS reset with the same brain seed and fresh ground baseline.
No persistent-state condition is needed because D3 already measured persistenceDrop = 0.0pp.

---

## 3. common sensory semantics

D4 compares **LgLG pulse onset schedules**.

```text
window length   240 steps = 4.8 s
settle          26
baseline        26
frame           5 steps
history         48 frames
ground SNta     bilateral 0.05
LgLG drive      0.7
pulse length    6 steps
taste           bilateral 0.8, final frame only
visual          OFF
```

For a real source contact recorded at absolute step `d`:

```text
real pulse onset = d + 1
active = d+1 .. d+6
```

For a canonical synthetic event at local start `s`:

```text
canonical pulse onset = s
active = s .. s+5
```

This preserves the exact D3 semantics rather than silently shifting the historical canonical control.

---

## 4. canonical generator

For window with causal contact count `n`:

```text
candidate pulse onsets
  25,55,85,115,145,175

rng
  brainSeed + decisionIndex*1000 + 500000

shuffle candidates
take first n
sort ascending
```

Canonical side sequence is generated from the same RNG exactly as D3.

Real side sequence is the chronological side sequence of the source window's causal contacts.

---

## 5. five preregistered conditions

### C0 — CANONICAL_TIMING_CANONICAL_SIDE

Exact D3 canonical control.

- canonical pulse onsets
- canonical RNG sides
- no pre-window pulse tail

### C1 — CANONICAL_TIMING_REAL_SIDE

- canonical pulse onsets
- real causal-contact side sequence assigned chronologically
- no pre-window pulse tail

This changes side sequence only relative to C0.

### R0 — REAL_TIMING_CANONICAL_SIDE

- exact in-window real causal pulse onsets `d+1`
- canonical RNG side sequence assigned chronologically
- pre-window pulse tails excluded

This changes timing only relative to C0 while retaining canonical sides.

### R1 — REAL_TIMING_REAL_SIDE

- exact in-window real causal pulse onsets `d+1`
- exact real causal side sequence
- pre-window pulse tails excluded

This is the in-window real schedule without boundary carry-in.

### R1T — REAL_TIMING_REAL_SIDE_WITH_TAIL

Exact D3 REAL_RESET replication.

- exact real causal pulse timing/side
- include any source contact before window start whose `d+1..d+6` pulse overlaps the window
- no visual input
- fresh MaleCNS/reset baseline

This adds only the pre-window boundary pulse tail relative to R1.

---

## 6. validity gates

D4 classification is valid only if both pass.

### V1 canonical capability

```text
C0 support DRINK rate >= 60%
```

### V2 D3 replication

D3 observed REAL_RESET support DRINK = 4.5%.

```text
abs(R1T support DRINK rate - 4.5%) <= 5 percentage points
```

Failure:

```text
V16B_D4_CONTROL_FAILURE
```

No causal classification after a validity failure.

---

## 7. preregistered effects

All effects are percentage-point DRINK-rate drops.

### SIDE_ON_CANONICAL

```text
C0 - C1
```

true if >= 20pp.

### TIMING_WITH_CANONICAL_SIDE

```text
C0 - R0
```

true if >= 20pp.

### TIMING_WITH_REAL_SIDE

```text
C1 - R1
```

true if >= 20pp.

### SIDE_ON_REAL_TIMING

```text
R0 - R1
```

true if >= 20pp.

### BOUNDARY_TAIL

```text
R1 - R1T
```

true if >= 20pp.

---

## 8. primary classification

After V1/V2 PASS:

### timingDominant

true when both:

```text
TIMING_WITH_CANONICAL_SIDE >= 20pp
TIMING_WITH_REAL_SIDE      >= 20pp
```

### sideSensitive

true when either:

```text
SIDE_ON_CANONICAL >= 20pp
SIDE_ON_REAL_TIMING >= 20pp
```

### boundaryTailSensitive

true when:

```text
BOUNDARY_TAIL >= 20pp
```

Outcome labels:

```text
timingDominant=true, sideSensitive=false, boundaryTailSensitive=false
  V16B_D4_IN_WINDOW_TIMING_DOMINANT

timingDominant=true and (sideSensitive=true or boundaryTailSensitive=true)
  V16B_D4_TIMING_WITH_SECONDARY_STRUCTURE

timingDominant=false, sideSensitive=true, boundaryTailSensitive=false
  V16B_D4_SIDE_SEQUENCE_DOMINANT

timingDominant=false, sideSensitive=false, boundaryTailSensitive=true
  V16B_D4_BOUNDARY_TAIL_DOMINANT

timingDominant=false and at least two of side/tail timing-specific effects are implicated
  V16B_D4_MIXED_SCHEDULE_STRUCTURE

none of the >=20pp effects explain D3
  V16B_D4_DECOMPOSITION_INCONCLUSIVE
```

If timing is dominant, the next diagnostic is authorized to decompose **absolute phase/recency vs
inter-contact spacing**. D4 itself does not alter timing or tune the policy.

---

## 9. descriptive metrics

For every condition, record:

```text
N
DRINK rate
Q_WAIT min/mean/max
mean Q_DRINK
mean Q margin
```

Also record per-window:

```text
brain seed
decision index
causal count
canonical pulse onsets/sides
real pulse onsets/sides
pre-window tail count
all five actions/Q values
paired Q_WAIT deltas
```

Descriptive timing histograms/statistics may be emitted, but cannot alter the preregistered
20pp gates or classification.

---

## 10. stop rule

After observing D4:

- do not change cohort/support;
- do not move pulse onsets;
- do not change side assignment;
- do not change 60%/5pp validity gates;
- do not change 20pp effect gates;
- do not change v15D;
- do not reinterpret v16B FAIL.

Any phase/spacing experiment requires a new preregistration.
