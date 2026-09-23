# result_v15a11 — final recursive 600 ms localization

## Verdict

**V15A11 outcome: EARLY12_SUFFICIENT_NO_600MS_SUFFICIENCY**

The fresh-cohort EARLY12_A baseline replicated, but neither fixed 600 ms half passed
the primary coarse injury-burden gate.

```text
EARLY12_A Task A   PASS
EARLY6_A Task A    FAIL
EARLY6_B Task A    FAIL

MASK_EARLY6_A      material=false
MASK_EARLY6_B      material=false

outcome            EARLY12_SUFFICIENT_NO_600MS_SUFFICIENCY
v15B               BLOCKED
```

This closes the planned recursive temporal-localization sequence. No 300 ms search is
authorized.

## Provenance

```text
preregistration
  history/prereg_v15a11.md
  e60be014bff0604354d4b190dbbc9917a46c6440

implementation
  66fd8fcac5a086694ff4b39a90a821b144b76bd1
  experiment(v15a11): add final 600ms localization screen

workflow head
  6efe3f91c7bee92d03da4ceef3eeac5acaf50890
  experiment(v15a11): wire final 600ms CI

workflow
  Screen MapleFly v15A11 Final 600ms Localization
  run 35891837162
  conclusion success

artifact
  10764768427
  maplefly-v15a11-early12-600ms-localization-35891837162
  sha256:139a06d9c64755a3304be02f1f7c97064950d8fea785a7e3afe33d52497a3af6
```

## Representation hashes

```text
R0 EARLY12_A
  5ed00b7610bb06e46545de2d28b2c7adf3c8daf54454cce9b8646460ee7fe57c
  selected EARLY6_A 143
  selected EARLY6_B 113

R1 EARLY6_A
  ec9a197877727a6888b37e01cde01888c41c1e5617a693f24046c33748219cad

R2 EARLY6_B
  c2d980714a3edd2f2be9f8f6fcefb78fc66e4ecd58f11876894c86b7115389c8
```

## Task A — 0/1 vs 2/3

### R0 EARLY12_A

```text
balanced accuracy  75.0%
recall LOW/HIGH     75.0% / 75.0%
DN_SHUFFLED         51.4%
margin              +23.6pp
LABEL_SHUFFLED      48.6%
gate                PASS
```

### R1 EARLY6_A

```text
balanced accuracy  69.4%
recall LOW/HIGH     86.1% / 52.8%
DN_SHUFFLED         48.6%
margin              +20.8pp
LABEL_SHUFFLED      44.4%
gate                FAIL
```

The balanced-accuracy threshold is missed and HIGH recall is below 60%.

### R2 EARLY6_B

```text
balanced accuracy  66.7%
recall LOW/HIGH     77.8% / 55.6%
DN_SHUFFLED         51.4%
margin              +15.3pp
LABEL_SHUFFLED      43.1%
gate                FAIL
```

This misses balanced accuracy, HIGH recall, and DN-shuffle margin.

## Fixed EARLY12_A decoder masks

### MASK_EARLY6_A

```text
masked BA             68.1%
EARLY12_A BA          75.0%
point loss             6.9pp
paired bootstrap 95%  [1.4, 13.9]pp
material contribution false
```

Although the CI lower bound is positive, the frozen point-loss requirement was >=10pp.

### MASK_EARLY6_B

```text
masked BA             65.3%
EARLY12_A BA          75.0%
point loss             9.7pp
paired bootstrap 95%  [-5.6, 22.2]pp
material contribution false
```

This misses the >=10pp point-loss rule and its CI includes zero.

## Task B — 1 vs 2 diagnostic

```text
EARLY12_A
  BA       66.7%
  recall   61.1% / 72.2%
  margin   +16.7pp
  gate     FAIL

EARLY6_A
  BA       63.9%
  recall   77.8% / 50.0%
  margin   +13.9pp
  gate     FAIL

EARLY6_B
  BA       58.3%
  recall   66.7% / 50.0%
  margin   +8.3pp
  gate     FAIL
```

Task B remains diagnostic only.

## Interpretation

The localization sequence now supports the following bounded statement:

> Under the frozen probe family, a 1.2 s endpoint-aligned EARLY12_A DN history is
> sufficient for coarse 0/1-vs-2/3 injury-burden decoding on this fresh cohort, while
> neither constituent 600 ms half is independently sufficient.

This agrees with v15A8's separate fresh-cohort result in which no individual 600 ms
window passed.

It does not prove that 1.2 s is a unique biological integration constant. The
experiments establish sufficiency under the specified representation/probe and place a
practical temporal-resolution bracket between a single 600 ms window and the 1.2 s
EARLY12_A interval.

The fixed-decoder masks did not establish individual necessity for either 600 ms half.

## Localization stop rule

The preregistered stop rule is now active:

- do not recurse to 300 ms,
- do not shift or overlap 600 ms windows,
- do not search arbitrary temporal combinations to manufacture a PASS.

The next scientific axis is action/reward relevance.

## Next step

A new preregistered experiment should test whether DN temporal history predicts the
counterfactual reward advantage of **DRINK versus WAIT**.

The simulator/trainer may compute the target from hidden state and future outcomes, but
runtime/probe inputs must remain biological DN history only. Decision/taste opportunity
must be HP-independent.

## v15B

**BLOCKED.**

No v15A11 classifier is deployed as the POTION policy. Existing MOVE v7, ATTACK v10F,
JUMP v11H2, and v14C remain unchanged.
