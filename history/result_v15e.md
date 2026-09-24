# result_v15e — phase-randomized reward-only POTION candidate

## Verdict

```text
V15E_PHASE_RANDOMIZED_REWARD_POLICY_FAIL
```

The preregistered phase-bin support was valid, but the candidate failed the scientific gates.

This is a scientific FAIL, not an implementation failure. The exact frozen v15A12/v15D 256-D
representation was retained; only a new reward-only readout was trained on independently generated
phase-randomized injury timing.

---

## Authoritative evidence

```text
preregistration
  6b58967912533cf068c6687a84584a9b0a7f2dc4

implementation
  e26d355be09abdb34d795d8f8e840b383117ce25

workflow head
  289a37a843302e56a8d844ba517d05dc542bd18f

run
  35960600099

GitHub conclusion
  FAILURE
  expected because scientific FAIL exits 1

artifact
  10793015011

digest
  sha256:19b57d749a41df15d7b8c7782409d7e66607912aa709b2c3dcb2c4f314738f02

candidate model sha256
  45bc54c314b0c3d4323c945c6fb0440065ce89a424da7b4299489c45fc7eb462
```

---

## Primary EVAL

```text
FULL balanced accuracy
  53.3%

WAIT recall
  55.0%

DRINK recall
  51.7%

mean G
  25.333

mean regret
  4.667
```

Controls:

```text
DN_SHUFFLED BA
  52.5%

FULL - DN_SHUFFLED
  +0.8pp

NEURAL_OFF BA
  50.0%

FULL - NEURAL_OFF
  +3.3pp
```

The candidate therefore did not learn a useful neural value policy under broad timing.

---

## Phase-bin audit

All support gates passed:

```text
EARLY
  N=22
  DRINK recall 59.1%

MID
  N=20
  DRINK recall 45.0%

LATE
  N=18
  DRINK recall 50.0%
```

Each bin had N>=10, so this is not an invalid sparse-bin result.

All three phase-robustness bins missed the required 60% DRINK recall gate.

---

## Interpretation

Supported:

> Simply retraining the two-head reward readout on phase-randomized injury schedules is not enough
> when the exact old 256-D v15A12 temporal representation is frozen.

Combined with D6's trained-phase peak, this points one level deeper than the readout weights:

> the old feature representation itself is not providing a sufficiently phase-robust injury signal
> for this reward learner across broad timing.

This does **not** mean MaleCNS lacks the information. The old representation consists of 256 selected
absolute temporal DN slots chosen under the earlier canonical timing regime. A new representation that
removes absolute phase dependence is now the justified remediation target.

Not authorized:

- v15F validation;
- deployment;
- threshold patch;
- HP input;
- post-hoc seed/gate/timing changes.

v15D remains deployed unchanged and v16B remains FAIL.

---

## Next

```text
V15E2_PHASE_INVARIANT_REPRESENTATION_PREREGISTRATION_AUTHORIZED
```

v15E is CLOSED.
