# result_v16b_d6 — phase-response curve

## Verdict

```text
V16B_D6_TRAINED_PHASE_PEAK
```

The preregistered common-cohort controls passed. The frozen v15D policy does not show a monotonic
"more recent injury => more DRINK" response. Instead, the response peaks around the trained/canonical
latest-onset region and collapses again when the intact injury sequence is shifted later.

No learning, deployed v15D change, threshold change, sensory-gain change, or connectome change occurred.

---

## Authoritative evidence

```text
preregistration
  7224037aea1137e9ca6f51c6c9e117edb02330fd

implementation
  9983dc03a7a22e127d56c62500c9a06c3e9ee8e3

workflow head
  dbc7760df766332e6f137bf81a6c603f91f1f487

run
  35958610575

conclusion
  SUCCESS

artifact
  10791174814

digest
  sha256:2e6da234eee7c61bbf25bf356c18f71201523c37c223702f023e1be65cecdfdc
```

---

## Common cohort

```text
base support
  67

common paired windows
  53
```

All five conditions used the same 53 windows, fresh MaleCNS/reset baseline, real chronological side
sequence, visual OFF, and the frozen v15D readout.

---

## Result

```text
REAL
   3.8% DRINK

A145
   9.4% DRINK

A175
  28.3% DRINK

A205
   0.0% DRINK

CANONICAL
  79.2% DRINK
```

Preregistered effects:

```text
D5-direction replication
  A175 - REAL
  +24.5pp
  PASS (>=15pp)

earlyToTrained
  A175 - A145
  +18.9pp

trainedToLate
  A205 - A175
  -28.3pp

fullSweep
  A205 - A145
  -9.4pp
```

Validity:

```text
COMMON N >= 20
  53
  PASS

REAL DRINK <= 30%
  3.8%
  PASS

CANONICAL DRINK >= 60%
  79.2%
  PASS

A175 - REAL >= 15pp
  24.5pp
  PASS
```

Classification:

```text
TRAINED_PHASE_PEAK
  TRUE

RECENCY_GRADIENT
  FALSE

LATE_PHASE_PEAK
  FALSE
```

---

## Interpretation

Supported:

> The v16B POTION failure is not explained by a simple rule that more recent injury evidence should
> cause more drinking. The frozen readout is strongly phase-selective: moving the same injury sequence
> to latest onset 175 improves DRINK, while moving it later to 205 collapses DRINK to 0%.

This is consistent with **temporal phase overfitting** in the frozen v15D representation/readout:
the reward-trained policy learned useful action value in the temporal regions exercised by its synthetic
training distribution, but did not acquire phase-invariant injury valuation across the 4.8-second history.

Important limitation:

- D6 does not prove that a particular individual DN or temporal feature causes the effect.
- CANONICAL remains much stronger than any rigidly shifted real sequence, so exact canonical temporal
  structure still carries additional support.
- v15D remains the deployed policy and v16B remains a scientific FAIL.
- No threshold patch or hand-coded HP rule is authorized.

---

## Next

The diagnostic chain has localized a remediation target sufficiently to stop post-hoc slicing.

```text
V15E_PHASE_RANDOMIZED_REWARD_TRAINING_PREREGISTRATION_AUTHORIZED
```

The next phase must train a **new candidate readout**, not mutate v15D in place. Training timing support
must be generated independently of the observed v16B schedules. The frozen v16B windows may be used only
as a known remediation benchmark; a later fresh-seed continuous ecology run is required before deployment.

D6 is CLOSED.
