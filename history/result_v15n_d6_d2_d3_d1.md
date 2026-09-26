# result_v15n_d6_d2_d3_d1 — rising-edge failure attribution

## Status

```text
V15N_D6_D2_D3_D1_RISING_EDGE_SUPPRESSION_DOMINANT
```

Authoritative evidence:

```text
run
  36213174880

head
  41be7be00aaa638a75666d670d673249f1758d01

artifact
  10896464244

artifact digest
  sha256:2b2a84623b5312175d59b4472658979341ae29d771024f49819a8b8668553c60

v15n_d6_d2_d3_d1.json sha256
  4ee2b5acf8feb8ad04f72018afcad953dc7b2584102ee0d335eb3867cb711e16
```

## Missed-hit attribution

```text
EVAL
  missed hits                  487
  frame-classifier miss      0.00%
  edge suppression         100.00%
  matching conflict          0.00%
  already positive before
    first in-window positive 100.00%

HOLDOUT
  missed hits                  493
  frame-classifier miss      0.41%
  edge suppression          99.59%
  matching conflict          0.00%
  already positive before
    first in-window positive 100.00%
```

## False-event timing

```text
EVAL
  unmatched false events      627
  recent unmatched           0.00%
  LINGER                    63.00%
  BACKGROUND                37.00%

HOLDOUT
  unmatched false events      620
  recent unmatched           0.00%
  LINGER                    63.55%
  BACKGROUND                36.45%
```

The preregistered false-event axis is:

```text
LINGER_DOMINANT
```

## Interpretation

The D2-D3 eventization failure is not caused by absence of positive scalar frames around the missed physical impacts. Nearly every missed hit occurs while the frozen scalar classifier is already in the positive state from prior activity, so the binary 0->1 rising-edge rule cannot emit a new event.

The D2-D2 frame-level positive recall therefore cannot be interpreted as proof of a discrete onset edge: a frame can be correctly positive after a new hit while the classifier was already positive before that hit.

Unmatched false rising edges are predominantly generated during lingering post-impact activity.

The next diagnostic should therefore test whether, conditional on the classifier already being positive, a new physical hit causes a separable causal score innovation using only current/past neural-derived scalar dynamics. No replacement eventizer is authorized by this result.

## Deployment

```text
POTION v15D
  DEPLOYED

v15N
  CLOSED / BLOCKED

v15N-D6-D2-D3-D1
  DIAGNOSTIC COMPLETE

v16C
  BLOCKED
```
