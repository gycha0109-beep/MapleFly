# result_v15a9 — half-history temporal necessity

## Verdict

**V15A9 outcome: SINGLE_HALF_SUFFICIENCY_PRESENT**

The fresh-cohort FULL48 coarse injury-burden signal replicated again. The fixed
EARLY24 half (-4.8..-2.4 s) independently passed the Task-A gate, while LATE24
(-2.4..0 s) failed. Masking EARLY24 from the frozen FULL48 decoder caused a
preregistered material loss; masking LATE24 did not.

```text
FULL48 Task A             PASS
EARLY24 Task A            PASS
LATE24 Task A             FAIL
MASK_EARLY24 material     true
MASK_LATE24 material      false
outcome                   SINGLE_HALF_SUFFICIENCY_PRESENT
v15B                      BLOCKED
```

The strongest cross-half distributed criterion was therefore **not** met.

## Provenance

```text
preregistration
  history/prereg_v15a9.md
  d3f8e17430378761df81e7bda27c2ca8c5d009dd

implementation
  a79ce0f4a91dfd973d93bc5636b97e1e6e204df7
  experiment(v15a9): add half-history necessity screen

workflow head
  78a927ca0f09e4267403b994322db5ead32b9e24
  experiment(v15a9): wire half-history CI

workflow
  Screen MapleFly v15A9 Half History Necessity
  run 35889296818
  conclusion success

artifact
  10763554064
  maplefly-v15a9-half-history-necessity-35889296818
  sha256:c27cd945468fb16927d8d9ff2a8d31572edc1657abd3ce9e68374e687a6cee6e
```

## Representation hashes

```text
R0 FULL48
  fb4f13253b90d34cc1657b5c161668f232c1ef8aef8863d34b56808cc2d9ebe9

R1 EARLY24
  309d65268b84100ff654c52da452d6b3bedadf0413d15f6af092bedd040c69f8

R2 LATE24
  635a26c909d969adae8598244dc6be2d8549fab7acc2bc3ed42a2cc363f83bd8
```

FULL48 top-256 selected temporal slots:

```text
EARLY24 134
LATE24  122
```

## Task A — 0/1 vs 2/3

### R0 FULL48

```text
balanced accuracy  87.5%
recall LOW/HIGH     86.1% / 88.9%
DN_SHUFFLED         50.0%
margin              +37.5pp
LABEL_SHUFFLED      56.9%
gate                PASS
```

### R1 EARLY24

```text
balanced accuracy  81.9%
recall LOW/HIGH     83.3% / 80.6%
DN_SHUFFLED         55.6%
margin              +26.4pp
LABEL_SHUFFLED      52.8%
gate                PASS
```

Therefore **EARLY24_SUFFICIENT** is supported under the frozen representation gate.

### R2 LATE24

```text
balanced accuracy  63.9%
recall LOW/HIGH     66.7% / 61.1%
DN_SHUFFLED         51.4%
margin              +12.5pp
LABEL_SHUFFLED      61.1%
gate                FAIL
```

LATE24 is not sufficient under the preregistered gate.

## Fixed FULL48 decoder half ablations

### MASK_EARLY24

```text
masked BA             69.4%
FULL48 BA             87.5%
point loss            18.1pp
paired bootstrap 95%  [8.3, 26.4]pp
material contribution true
```

This satisfies the frozen material-loss rule:

- point loss >=10pp,
- bootstrap lower bound >0.

Therefore **EARLY24_DECODER_CONTRIBUTES** is supported.

### MASK_LATE24

```text
masked BA             81.9%
FULL48 BA             87.5%
point loss            5.6pp
paired bootstrap 95%  [0.0, 11.1]pp
material contribution false
```

LATE24 does not satisfy the preregistered material-loss rule.

## Task B — 1 vs 2 diagnostic

Task B remained diagnostic and had no region-selection authority.

```text
FULL48
  BA       63.9%
  recall   66.7% / 61.1%
  margin   +13.9pp
  gate     FAIL

EARLY24
  BA       72.2%
  recall   77.8% / 66.7%
  margin   +22.2pp
  gate     PASS

LATE24
  BA       41.7%
  recall   55.6% / 27.8%
  margin   -8.3pp
  gate     FAIL
```

The EARLY24 boundary result is retained as diagnostic evidence only. It does not
retroactively change the primary Task-A region-selection rule and does not unlock
v15B.

## Interpretation

v15A8 showed that no single 600 ms window was sufficient while FULL48 was strong.
v15A9 now narrows the coarse burden carrier:

> Under the frozen top-256 procedure, the first 2.4 s of the endpoint-aligned history
> is sufficient for coarse 0/1-vs-2/3 injury-burden decoding, while the final 2.4 s is
> not.

The FULL48 fixed-decoder ablation independently agrees with this direction:
removing EARLY24 materially degrades decoding, while removing LATE24 does not meet the
material-loss rule.

This means the v15A8 distributed result should not be interpreted as requiring both
4.8 s halves. The useful distributed temporal structure is localized primarily to the
EARLY24 interval at the current resolution.

The result does not establish which subregion inside EARLY24 is sufficient or
necessary.

## Next permitted step

The preregistration explicitly permits a separately preregistered recursive fixed
subdivision of the passing half.

Therefore the next experiment should bisect EARLY24 into:

```text
EARLY12_A frames 0..11   endpoint -4.8..-3.6 s
EARLY12_B frames 12..23  endpoint -3.6..-2.4 s
```

and test independent sufficiency plus fixed EARLY24-decoder masking without searching
any other split.

## v15B

**BLOCKED.**

No v15A9 classifier is deployed as the POTION policy. Existing MOVE v7, ATTACK v10F,
JUMP v11H2, and v14C remain unchanged.
