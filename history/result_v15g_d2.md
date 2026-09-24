# result_v15g_d2 — long-memory sufficiency matrix

## Status

```text
V15G_D2_ACTION_MEMORY_SUFFICIENT
```

Authoritative run:

```text
run
  35974540001

head
  ca5eecf35015253ad1fefc5c9678b07f1a03af68

artifact
  10797874198

artifact digest
  sha256:785afcd37c45530a7f2f9898268950bcfc0d2642d44dd23de374dd396882c284
```

Preregistration:

```text
initial D2 prereg + v15H procedural invalidation
  cd217554910c50dea59b6a10c520fe1c112ff655

compute-budget amendment before implementation/outcome
  c0c8d61c8e99c156dc4057fab2358ce15eaafe49
```

Implementation:

```text
diagnostic implementation
  f474d6dfd1e3cd95c748e73a4e6a9e0e37f3e0a2

workflow
  0bc681372391ff266286b5c627e506b362af09fb

syntax-only correction
  ca5eecf35015253ad1fefc5c9678b07f1a03af68
```

The first workflow attempt, run `35974472864`, failed at `node --check` because
`tapeValidity` had been declared twice. No MaleCNS tape or scientific result was produced.
The duplicate helper was removed without changing seeds, gates, memory definitions, fitting parameters,
or outcome rules. Run `35974540001` is the authoritative D2 run.

---

## 1. fresh tape validity

All lower-skill validity gates passed.

```text
episodes with >=3 kills
  100.0%

obstacle clear
  98.30%

target kill
  91.91%

LEFT target kill
  92.37%

RIGHT target kill
  91.45%

attack precision
  62.89%

airborne attack
  12.37%

post-clear jump encounter
  1.28%

pre-clear attack encounter
  4.68%
```

Oracle reachable-state counts:

```text
TRAIN
  6,123

EVAL
  6,160

strict EVAL states
  5,022
```

---

## 2. M0 — current state

Representation:

```text
current v15E2 neural margin
+ previous 4 POTION actions
```

Exact observable conflict-state fraction:

```text
25.73%
```

LINEAR:

```text
balanced accuracy
  64.83%

WAIT recall
  72.66%

DRINK recall
  57.00%

survival
  45.83%

minimum base-seed survival
  37.5%

mean potion uses
  5.542

mean excess uses among survivors
  0.455

economy-capable
  NO
```

MLP16 also failed the preregistered economy-capable definition.

Therefore the fresh cohort reproduces the short-memory insufficiency.

---

## 3. M1 — long self-action memory

Representation:

```text
current v15E2 neural margin
+ previous 9 POTION actions
```

Exact observable conflict-state fraction:

```text
0.00%
```

LINEAR:

```text
balanced accuracy
  81.72%

WAIT recall
  81.79%

DRINK recall
  81.65%

survival
  87.5%

minimum base-seed survival
  87.5%

mean potion uses
  7.000

mean excess uses among survivors
  1.000

wasted healing / DRINK
  4.643

mean utility
  39.375

economy-capable
  YES
```

Model hash:

```text
b2a3d2e47ff9be3f1721638a75b779c37b3a8a0fb49c32fabdb0e0d8aa2af5f4
```

This supervised model is diagnostic only and is not deployment eligible.

---

## 4. M2 — long neural memory

Representation:

```text
current + previous 9 v15E2 neural margins
+ previous 4 POTION actions
```

The exact observable conflict-state fraction remained:

```text
25.73%
```

The LINEAR probe nevertheless passed the economy-capable gates:

```text
balanced accuracy
  82.28%

survival
  95.83%

minimum base-seed survival
  87.5%

mean excess uses
  1.435
```

This is secondary evidence that longer neural history can improve generalization, but the preregistered
localization priority classifies D2 from M1 because M0 failed and M1 already became economy-capable.

---

## 5. M3 — full long memory

Representation:

```text
current + previous 9 neural margins
+ previous 9 actions
```

Exact observable conflict-state fraction:

```text
0.00%
```

Both probes survived every EVAL tape, but both missed the preregistered economy gate:

```text
LINEAR mean excess uses
  1.750

MLP16 mean excess uses
  1.583

required
  <= 1.500
```

Therefore M3 is not marked economy-capable under the frozen definition.

This does not override M1. D2 localization uses the preregistered priority rule, not an after-the-fact
ranking of raw survival.

---

## 6. interpretation

The D1 failure is not explained by a need to expose HP, contact count, decision index, or clock time.

On fresh tapes, extending only the agent's memory of its **own previous POTION actions** from four
decisions to the complete nine-action prefix:

1. removed exact observable conflicts from 25.73% to 0%;
2. made the preregistered M1 LINEAR diagnostic probe economy-capable;
3. raised deterministic downstream survival from 45.83% to 87.5%.

The supported conclusion is therefore:

```text
V15G_D2_ACTION_MEMORY_SUFFICIENT
```

This is a sufficiency result for the allowed representation. It does not prove that self-action memory
is the only possible solution, and it does not authorize deployment of the supervised D2 probe.

---

## 7. next phase

Authorized:

```text
separate reward-only remediation
using current frozen MaleCNS-derived v15E2 margin
+ longer self-action memory
```

Still forbidden:

```text
HP
contact / impact count
time / decision index
oracle labels
D2 supervised weights
post-hoc threshold tuning
```

Deployment remains blocked until a separately preregistered reward-only candidate passes fresh
evaluation and causal controls.
