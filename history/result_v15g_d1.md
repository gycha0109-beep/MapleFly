# result_v15g_d1 — observable-state / credit-assignment localization

## Verdict

```text
V15G_D1_OBSERVABLE_STATE_LIMITED
```

The diagnostic localizes the v15G failure primarily to the runtime observable state, not merely to the
REINFORCE optimizer.

Even with trainer-only oracle supervision, neither the exact v15G linear class nor a more permissive
linear class with a trainable neural-margin coefficient could meet the preregistered support and
downstream economy gates.

No supervised diagnostic probe is deployment eligible.

---

## Evidence

```text
preregistration
  c04fa62f58051f3a5ee422a3aed6a8f8d0f99af9

implementation
  e66f5d41ee7aadef462432eda32d563ab5562310

workflow head
  fda411030e18e67284c5addb356068555858aa9b

run
  35971683895

conclusion
  SUCCESS

artifact
  10796781682

digest
  sha256:d33df817b43cef3dd166f76ed9699e5141c8fbacaf2944ddc5a65b76a42ce46e
```

The diagnostic reconstructed the exact v15G TRAIN/EVAL MaleCNS tapes and passed all lower-skill tape
validity checks.

---

## Reachable-state audit

```text
TRAIN reachable states
  5,538

EVAL reachable states
  7,212

EVAL observable groups
  1,956

EVAL exact conflict groups
  205
  10.48% of observable groups

strict oracle-labeled EVAL states
  5,975

strict states inside exact conflict groups
  1,278
  21.39%
```

This crosses the preregistered 20% observable-conflict localization threshold.

An exact conflict means two reachable prefixes have the same runtime observation:

```text
same frozen v15E2 baseMargin
same previous four POTION actions
same decision opportunity
```

but the optimal action under exact future utility is different.

Example:

```text
seed
  3261000

decision
  step 1440

baseMargin
  1.238378

visible action history
  [0,0,1,1]

prefix 01100
  hidden audit HP 10
  oracle WAIT

prefix 11100
  hidden audit HP 30
  oracle DRINK
```

The hidden HP is shown only to explain the diagnostic contradiction. It was not a probe input.

The two prefixes differ in an action older than the four-action memory window. The current runtime state
therefore cannot distinguish them even though their survival/economy decision differs.

---

## Supervised probes

These probes used oracle labels only for localization and are forbidden from deployment.

### MARGIN_ONLY

```text
EVAL balanced accuracy
  55.82%

WAIT recall
  65.38%

DRINK recall
  46.27%

downstream survival
  25.0%

minimum base-seed survival
  0%

mean excess uses among survivors
  1.500
```

Not economy-capable.

### FIXED_V15G_CLASS

Exact v15G score form with coefficient on baseMargin fixed to 1:

```text
EVAL balanced accuracy
  66.40%

WAIT recall
  75.17%

DRINK recall
  57.62%

downstream survival
  41.67%

minimum base-seed survival
  25.0%

mean excess uses among survivors
  1.400
```

Not economy-capable.

Therefore the v15G FAIL cannot be localized merely to reward-only REINFORCE credit assignment.

### FREE_MARGIN_LINEAR

The baseMargin coefficient was allowed to train diagnostically:

```text
EVAL balanced accuracy
  64.16%

WAIT recall
  67.43%

DRINK recall
  60.89%

downstream survival
  41.67%

minimum base-seed survival
  25.0%

mean excess uses among survivors
  1.200
```

Not economy-capable.

Allowing a different linear scale for the frozen neural margin did not repair the missing state.

---

## Interpretation

Supported:

> The v15G observable state — one current 4.8-second pooled neural margin plus only the previous four
> POTION actions — loses information needed for the sequential survival/economy decision.

The strongest evidence is not just classifier accuracy. It is exact state aliasing: 21.39% of strict
reachable states belong to observable groups in which the same runtime observation maps to contradictory
oracle actions.

This is consistent with a finite-memory problem. Older injury/action history can change the latent
survival state while disappearing from the current 4.8-second neural window and four-action memory.

Not supported:

- adding HP as an input;
- adding contact count as an input;
- deploying an oracle-trained probe;
- claiming the exact minimal sufficient memory architecture is already known.

---

## Next

```text
LONGER_NEURAL_SELF_ACTION_MEMORY_REMEDIATION_PREREGISTRATION_AUTHORIZED
```

The next policy must build persistent state only from allowed signals:

- frozen MaleCNS-derived neural evidence;
- the agent's own POTION actions.

HP, contact count, damage count, time, decision index, and future information remain forbidden.

Deployment remains BLOCKED.

v16C remains BLOCKED.

D1 is CLOSED.
