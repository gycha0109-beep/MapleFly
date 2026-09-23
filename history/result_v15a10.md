# result_v15a10 — recursive EARLY24 temporal localization

## Verdict

**V15A10 outcome: SINGLE_1P2S_HALF_SUFFICIENCY_PRESENT**

The fresh-cohort EARLY24 baseline replicated. The first fixed 1.2 s sub-half
(EARLY12_A, endpoint -4.8..-3.6 s) independently passed the primary coarse
injury-burden gate. The second sub-half (EARLY12_B, -3.6..-2.4 s) failed.

Neither fixed EARLY24-decoder mask met the preregistered >=10pp material-loss rule.

```text
EARLY24 Task A        PASS
EARLY12_A Task A      PASS
EARLY12_B Task A      FAIL

MASK_EARLY12_A        material=false
MASK_EARLY12_B        material=false

outcome               SINGLE_1P2S_HALF_SUFFICIENCY_PRESENT
v15B                  BLOCKED
```

## Provenance

```text
preregistration
  history/prereg_v15a10.md
  3a6ec0367a53e203bfcc073ab10b2f15630bfdf9

implementation
  e79c32d167b2fb85e7f343ef6ca95694af134827
  experiment(v15a10): add recursive early-half screen

workflow head
  477ee111fab04ab487235b669f232dec8bf997d6
  experiment(v15a10): wire recursive early-half CI

workflow
  Screen MapleFly v15A10 Recursive Early Half
  run 35890609334
  conclusion success

artifact
  10765321154
  maplefly-v15a10-early24-localization-35890609334
  sha256:460ab9ee9dd4c18bf044be03480d323b79118cab6a4060ba0b76d7e7905fe9b1
```

## Representation hashes

```text
R0 EARLY24
  9a25b1259e54616897972bb05c77d12c5a94cdcbb809520e1c48cfa63bd8a42c
  selected EARLY12_A 129
  selected EARLY12_B 127

R1 EARLY12_A
  db0c29469e4c79c303b46a1853e96968888824abda8096794b2a047df82c6e92

R2 EARLY12_B
  29e8e49827cf25d764cd06acd0ecdea46e6eeb8d2e22a3639ca21bd50c5f7d7f
```

## Task A — 0/1 vs 2/3

### R0 EARLY24

```text
balanced accuracy  79.2%
recall LOW/HIGH     80.6% / 77.8%
DN_SHUFFLED         50.0%
margin              +29.2pp
LABEL_SHUFFLED      51.4%
gate                PASS
```

### R1 EARLY12_A

```text
balanced accuracy  77.8%
recall LOW/HIGH     83.3% / 72.2%
DN_SHUFFLED         51.4%
margin              +26.4pp
LABEL_SHUFFLED      48.6%
gate                PASS
```

Therefore **EARLY12_A_SUFFICIENT** is supported under the frozen representation gate.

### R2 EARLY12_B

```text
balanced accuracy  65.3%
recall LOW/HIGH     69.4% / 61.1%
DN_SHUFFLED         48.6%
margin              +16.7pp
LABEL_SHUFFLED      59.7%
gate                FAIL
```

EARLY12_B is not sufficient under the preregistered gate.

## Fixed EARLY24 decoder sub-half ablations

### MASK_EARLY12_A

```text
masked BA             69.4%
EARLY24 BA            79.2%
point loss             9.7pp
paired bootstrap 95%  [2.8, 16.7]pp
material contribution false
```

The bootstrap interval excludes zero, but the frozen material-loss rule also required
a point loss >=10pp. The observed 9.7pp therefore remains **not material**.

### MASK_EARLY12_B

```text
masked BA             69.4%
EARLY24 BA            79.2%
point loss             9.7pp
paired bootstrap 95%  [-1.4, 20.8]pp
material contribution false
```

This fails both the >=10pp point-loss criterion and the positive bootstrap lower-bound
criterion.

## Task B — 1 vs 2 diagnostic

```text
EARLY24
  BA       63.9%
  recall   72.2% / 55.6%
  margin   +13.9pp
  gate     FAIL

EARLY12_A
  BA       55.6%
  recall   55.6% / 55.6%
  margin   +5.6pp
  gate     FAIL

EARLY12_B
  BA       63.9%
  recall   72.2% / 55.6%
  margin   +16.7pp
  gate     FAIL
```

Task B remains diagnostic only.

## Interpretation

v15A9 localized the reproducible coarse injury-burden carrier to EARLY24. v15A10
narrows independent sufficiency further:

> Under the frozen top-256 procedure and a fresh cohort, frames 0..11
> (-4.8..-3.6 s relative to the endpoint) are sufficient for coarse 0/1-vs-2/3
> injury-burden decoding, while frames 12..23 are not.

The fixed-decoder masking evidence is weaker than the independent-sufficiency evidence:
neither 1.2 s mask met the preregistered material-loss threshold. Therefore v15A10
does **not** support a claim that either sub-half is individually necessary for the
trained EARLY24 decoder.

The strongest preregistered distributed criterion was not met.

## Relationship to v15A8

v15A8 previously found no sufficient single 600 ms window on a separate fresh cohort.
That result remains intact. v15A10 does not reinterpret or overwrite it.

## Next permitted step

Because exactly one 1.2 s sub-half independently passed, a separately preregistered
recursive subdivision may test only EARLY12_A:

```text
EARLY6_A frames 0..5    endpoint -4.8..-4.2 s
EARLY6_B frames 6..11   endpoint -4.2..-3.6 s
```

This is a replication/localization test on new seeds, not a rescue of v15A8.

## v15B

**BLOCKED.**

No v15A10 probe is deployed as runtime POTION policy. Existing MOVE v7, ATTACK v10F,
JUMP v11H2, and v14C remain unchanged.
