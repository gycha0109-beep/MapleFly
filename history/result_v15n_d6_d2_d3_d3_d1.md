# result_v15n_d6_d2_d3_d3_d1 — temporal miss attribution

## Status

```text
V15N_D6_D2_D3_D3_D1_LATE_WINDOW_RESCUE_DOMINANT
```

Authoritative evidence:

```text
run
  36338712265

head
  1fbef4fb89903db91b12a992a51faf7294dc7d31

artifact
  10939890187

artifact digest
  sha256:1c3b32cf3266299401d2326ffd7874428e1bdefb50607d74c7d1c3e8855fcd36

v15n_d6_d2_d3_d3_d1.json sha256
  bbc1aac5878949a118fe8c4ea51117695dd2cdea040461c9e4de358fbfdaf57b
```

Preregistration:

```text
22eaa9bdd918bde7fa1750f19358694a6eaeda3d
```

Implementation/workflow:

```text
377390bbeb68e63807668ea194f8f6ad73ad6ad4
1fbef4fb89903db91b12a992a51faf7294dc7d31
```

## Attribution

```text
PROSPECTIVE_A
  qualifying hits              1311
  first-frame recalled          505
  first-frame misses            806
  late-window rescue            604  (74.94% of misses)
  context dropout                23  ( 2.85%)
  window miss                   179  (22.21%)
  descriptive 200ms recall    84.59%

PROSPECTIVE_B
  qualifying hits              1346
  first-frame recalled          515
  first-frame misses            831
  late-window rescue            611  (73.53% of misses)
  context dropout                27  ( 3.25%)
  window miss                   193  (23.23%)
  descriptive 200ms recall    83.66%
```

For first-frame misses, the median first later-positive age is exactly 100 ms in both cohorts.

## Overlap check

```text
PROSPECTIVE_A
  overlapping next-hit window                         0
  late rescue with next hit before positive frame    0

PROSPECTIVE_B
  overlapping next-hit window                         0
  late rescue with next hit before positive frame    0
```

Therefore the late-window rescue is not attributable to a second physical hit entering the same 200 ms window in these cohorts.

## Interpretation

The D3-D3 positive-recall failure is primarily a temporal-alignment problem.

The exact frozen DN readout often remains below threshold on the first qualifying frame but crosses the same frozen threshold on the next causal neural frame, typically 100 ms later.

This supports a separately preregistered test of a fixed causal 200 ms delayed temporal aggregation using the frozen DN readout. It does not authorize threshold tuning, readout retraining, or deployment.

## Deployment

```text
POTION v15D
  DEPLOYED

v15N
  CLOSED / BLOCKED

D3-D3-D1
  DIAGNOSTIC COMPLETE

v16C
  BLOCKED
```
