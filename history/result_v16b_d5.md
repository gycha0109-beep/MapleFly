# result_v16b_d5 — phase/recency vs inter-contact spacing

## Verdict

```text
V16B_D5_PHASE_RECENCY_DOMINANT
```

Both preregistered arms passed their validity controls. Rigidly moving the real injury sequence
to the preregistered latest-onset phase 175 rescued DRINK by 22.4 percentage points, crossing
the frozen 20pp phase gate. Replacing only the inter-contact gaps while preserving the real
latest-injury phase rescued only 3.2pp.

No learning, deployed v15D change, threshold change, sensory-gain change, or connectome change occurred.

---

## Authoritative evidence

```text
preregistration
  4b02bd3b77d51f8350b339dcb8a157d42b49c691

implementation
  c939d7ca37ee62b7af86ffa1478697e3eee65a94

workflow head
  476ed5045f60b206a963b0df344edb4d89d856a5

run
  35956418116

conclusion
  SUCCESS

artifact
  10790728530

digest
  sha256:c037eb2043713d27b9c31a364932af268e3e543ae453e33d207029ee7e611f7b
```

---

## Cohort audit

```text
base support windows
  67

phase eligible
  58

spacing eligible
  63

real latest-onset mean
  165.57 steps

real span mean
  96.34 steps
```

---

## Phase/recency arm

```text
N
  58

P_REAL
  DRINK 3.4%

P_PHASE175
  DRINK 25.9%

P_CANONICAL
  DRINK 81.0%

phaseRescue
  +22.4 percentage points

validity
  N >= 20                PASS
  REAL <= 30%            PASS
  CANONICAL >= 60%       PASS

phaseSensitive
  rescue >= 20pp
  TRUE
```

The intervention preserved the real inter-contact gaps and side order and changed only the
absolute within-window phase so that the latest onset became step 175.

---

## Spacing arm

```text
N
  63

S_REAL
  DRINK 4.8%

S_CANONICAL_GAPS
  DRINK 7.9%

S_CANONICAL
  DRINK 82.5%

spacingRescue
  +3.2 percentage points

validity
  N >= 20                PASS
  REAL <= 30%            PASS
  CANONICAL >= 60%       PASS

spacingSensitive
  rescue >= 20pp
  FALSE
```

The intervention preserved the exact real latest-injury phase and side order and changed only
the relative gaps to the canonical count-matched pattern.

---

## Interpretation

Supported:

> Absolute within-window phase / injury recency is a causal contributor to the v16B POTION failure
> under the preregistered intervention. Moving the intact real injury sequence to latest onset 175
> increased DRINK from 3.4% to 25.9%.

Also supported:

> Inter-contact spacing replacement by itself, while keeping the real latest-injury phase fixed,
> did not meet the preregistered causal gate.

Important limitation:

The phase intervention did **not** restore canonical performance. P_PHASE175 remained 25.9% DRINK
while the same phase-arm cohort reached 81.0% under the full canonical onset pattern. Therefore
"PHASE_RECENCY_DOMINANT" is the preregistered gate label, not evidence that a single latest-contact
timestamp fully explains the policy.

This is consistent with the frozen v15D readout being strongly phase-sensitive to where injury
evidence lands inside its 48-frame temporal representation. The remaining canonical-vs-phase175
gap requires a separate preregistered decomposition; it must not be tuned away post hoc.

---

## Next

```text
V16B_D6_PHASE_RESPONSE_DIAGNOSTIC_AUTHORIZED
```

D5 is CLOSED.
