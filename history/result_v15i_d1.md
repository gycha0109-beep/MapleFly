# result_v15i_d1 — schedule dominance vs neural alignment

## Status

```text
V15I_D1_SCHEDULE_DOMINATED_POLICY
```

Authoritative run:

```text
run
  35982770613

head
  164ab97c57e626634a52b9f2e783e40a80e7d82b

artifact
  10799989166

artifact digest
  sha256:ace33ca9c49abb8dab44a44deb52601b7a5be6cbb6663b79954460721b3dbbde
```

Preregistration:

```text
7cded543afba1160173044ebdbfb9c2f509232a9
```

---

## 1. reconstruction validity

The source v15I EVAL contact tape was reconstructed from the all-surviving ACTION_MEMORY_OFF rows.

Exact FULL replay:

```text
episode mismatches
  0 / 24
```

The reconstruction is valid.

---

## 2. schedule similarity

Frozen v15I policy versus evaluator-only:

```text
FIRST_8_DRINK
  DRINK x8
  WAIT  x2
```

Across all ten policy decisions for all 24 tapes:

```text
mismatches
  9 / 240

mismatch fraction
  3.75%

preregistered schedule criterion
  <= 10%

PASS
```

Performance:

```text
FULL
  survival 83.33%
  mean excess uses 1.650

FIRST_8_DRINK
  survival 95.83%
  mean excess uses 1.696
```

The fixed eight-drink schedule is therefore extremely close in action pattern and comparable in economy,
while actually surviving more of this frozen cohort.

This fixed schedule is a diagnostic control only and is not a deployment candidate.

---

## 3. neural alignment controls

### EPISODE_SHIFT_1

Each contact tape received the complete ten-margin neural sequence from the next source episode.

```text
survival
  87.5%

mean excess uses
  1.524

FULL-relative survival drop
  -4.17 percentage points

FULL-relative excess increase
  -0.126

neural-alignment contribution
  NO
```

Breaking episode-specific neural/contact alignment did not hurt the candidate.

### DECISION_MEAN_NEURAL

All episodes received the same cohort-mean neural margin at each decision position.

```text
survival
  95.83%

mean excess uses
  1.696

FULL-relative survival drop
  -12.5 percentage points

FULL-relative excess increase
  +0.046

neural-alignment contribution
  NO
```

Removing all episode-specific neural variation also did not materially hurt performance under the
preregistered criterion.

---

## 4. interpretation

The original v15I NEURAL_OFF control was real: zeroing the neural term changed behavior and reduced
survival.

D1 shows something more specific.

The candidate does **not** require the neural sequence to remain aligned with the episode that produced
it. Its behavior is mostly reproduced by:

```text
drink early
then stop after roughly eight own decisions
```

The long lag-specific action weights therefore function primarily as a schedule-like controller.
The neural margin perturbs that schedule, but the episode-specific biological signal is not carrying
the adaptive burden required for a stronger autonomy claim.

This explains why simply noting that NEURAL_OFF failed was insufficient.

---

## 5. consequence

Do not:

- relax the v15I economy gate;
- deploy v15I;
- enlarge the v15I cohort and call that the same experiment;
- tune the existing lag weights;
- proceed to v16C.

The next remediation should avoid relying on long lag-specific self-action positions as the main state
carrier.

v15G-D2 also found its M2 representation economy-capable:

```text
current + previous 9 frozen neural margins
+ previous 4 own POTION actions
```

That provides a preregistered evidence-backed alternative direction: shift persistence toward neural
history while retaining only the already-existing short self-action history, and require an
episode-specific neural-alignment control before any PASS.
