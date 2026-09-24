# result_v15e2 — phase-invariant pooled-DN reward policy

## Verdict

```text
V15E2_PHASE_INVARIANT_POOLED_DN_PASS
```

The preregistered phase-invariant representation passed every scientific and causal-control gate.

The candidate replaces the old 256 selected absolute-temporal slots with one mean-pooled feature for
each of the 1,316 descending neurons across the complete 4.8-second history. Connectome synapses remain
frozen. The learned component is still only the external reward-trained readout.

No deployed v15D file was changed.

---

## Authoritative evidence

```text
preregistration
  749dbe369248277033aee6fdc9a334dfc6c3b081

implementation
  ac287b8406cced096f6c3d4229583a7f93396a48

workflow head
  a04fc64f159079a3e51d6e7ed3663fce25cb83bc

run
  35961707942

conclusion
  SUCCESS

artifact
  10793265453

digest
  sha256:a119bc0e425d08c5ce2381e6054c6ee358bf9402d5c442a57c00c916fd3b9405

representation sha256
  244464c8b5e9c7f5871f35cb3acc4ac1e2e0c9b61860c1dd3c267de79d4758db

candidate model sha256
  18be00b46303f46d62f8f63f26ca1a280b66f50f0004be6f469c637123077c96
```

Representation audit:

```text
DN features
  1316

pooling
  mean over all 48 x 100ms frames

TRAIN-only standardization
  population mean/std

scale floor
  1e-6

features hitting scale floor
  2
```

---

## Primary fresh EVAL

```text
FULL balanced accuracy
  87.5%

WAIT recall
  90.0%

DRINK recall
  85.0%

mean G
  29.208

mean regret
  0.792
```

All primary gates passed.

---

## Causal controls

```text
DN_SHUFFLED BA
  47.5%

FULL - DN_SHUFFLED
  +40.0pp

NEURAL_OFF BA
  50.0%

FULL - NEURAL_OFF
  +37.5pp
```

Both margins are well above the frozen +20pp gate.

This is evidence that the successful policy depends on the structured MaleCNS DN representation rather
than only the readout biases.

---

## Phase-bin audit

```text
EARLY
  N=16
  DRINK recall 93.8%

MID
  N=29
  DRINK recall 79.3%

LATE
  N=15
  DRINK recall 86.7%
```

Each bin had N>=10 and DRINK recall >=60%.

Unlike the old 256-D absolute-temporal representation, the pooled-DN candidate retained useful action
value across all preregistered injury phases.

---

## Interpretation

Supported:

> The frozen MaleCNS contains enough distributed injury-related DN information for a reward-only
> DRINK/WAIT readout to generalize across broad independently generated temporal phases when the
> representation removes absolute temporal-slot identity.

This is the remediation result sought after v16B D3-D6 and the v15E failure.

Not yet supported:

- that the candidate survives actual mixed target/obstacle/motor sensory ecology;
- that it repairs the authoritative v16B failure episodes;
- that it should replace deployed v15D;
- that continuous-ecology survival is solved.

Therefore deployment remains blocked.

---

## Next

```text
V15F_FROZEN_REMEDIATION_VALIDATION_AUTHORIZED
```

v15E2 is CLOSED.
