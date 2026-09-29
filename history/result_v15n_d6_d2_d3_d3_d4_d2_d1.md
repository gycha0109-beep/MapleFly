# result_v15n_d6_d2_d3_d3_d4_d2_d1 — event-stream failure attribution

## Status

```text
V15N_D6_D2_D3_D3_D4_D2_D1_EVENT_STREAM_FAILURE_ATTRIBUTED
```

Authoritative evidence:

```text
run            36521866553
head           d9a03ab832d93368db01048414b59a936c8bb387
artifact       11014769432
artifact sha   sha256:c9651707653c44b50eb30b68da569f02c185d3456ce15711673d873436844b37
JSON sha256    0636c0c4801062d0f2e11f9a30d5a4072d6de474da61f4572d2cf8b24c055862
```

Frozen chain:

```text
design          fca48afba38795d67930e91f2d6599239620e72e
prereg          e0f491bdfb1bef223c5829e7a26dc39d748494eb
implementation  d9a03ab832d93368db01048414b59a936c8bb387
workflow        0aeaf88039c4878240ddedd199fb71ffe1cb5faa
```

The first workflow run from `0aeaf880...` failed at syntax check before computation because the implementation accidentally reused an existing evidence-constant name. The implementation-only naming defect was fixed in `d9a03ab...`. No scientific contract, cohort, threshold, temporal depth, refractory, matching rule, or attribution rule changed.

The authoritative corrected run reproduced D4-D2 exactly before attribution.

## Support

```text
A: 64 tapes, 947 unmatched neural events, 432 missed physical impacts
B: 64 tapes, 952 unmatched neural events, 438 missed physical impacts
support PASS
```

## False-event attribution

### A

```text
PRE_HIT_200MS          272 / 947 = 0.287223
RECENT_POST_HIT_200MS    0 / 947 = 0
BACKGROUND_200MS       675 / 947 = 0.712777
```

### B

```text
PRE_HIT_200MS          278 / 952 = 0.292017
RECENT_POST_HIT_200MS    0 / 952 = 0
BACKGROUND_200MS       674 / 952 = 0.707983
```

Frozen false-event axis:

```text
BACKGROUND_DOMINANT
```

The dominant precision failure is therefore not lingering post-hit activity. The frozen TEMPORAL3 score generates many independent positive episodes in evaluator-defined background.

## Miss attribution

### A

```text
MATCH_CONFLICT                 0 / 432 = 0
PRE_HIT_CARRYOVER_NO_RISE    201 / 432 = 0.465278
POSITIVE_NO_RISE_OTHER         0 / 432 = 0
NO_POSITIVE_WINDOW           231 / 432 = 0.534722
```

### B

```text
MATCH_CONFLICT                 0 / 438 = 0
PRE_HIT_CARRYOVER_NO_RISE    212 / 438 = 0.484018
POSITIVE_NO_RISE_OTHER         0 / 438 = 0
NO_POSITIVE_WINDOW           226 / 438 = 0.515982
```

Frozen miss axis:

```text
NO_POSITIVE_DOMINANT
```

The residual miss problem is not matching conflict and is not caused by the 200 ms refractory.

Pre-hit carryover is nevertheless a large secondary component, accounting for about 47–48% of misses.

## Extended descriptive window for NO_POSITIVE_WINDOW

Among misses with no TEMPORAL3 positive frame in the frozen post-hit 0–200 ms window:

```text
A:
  late positive in 200–400 ms = 62 / 231 = 0.268398
  first-positive median latency = 220 ms
  p90 = 260 ms

B:
  late positive in 200–400 ms = 44 / 226 = 0.194690
  first-positive median latency = 220 ms
  p90 = 300 ms
```

Therefore most NO_POSITIVE_WINDOW misses are not explained by a small timing extension beyond 200 ms. The current representation frequently fails to produce a threshold-positive response even out to 400 ms.

## Interpretation

D4-D2-D1 identifies a two-sided representation problem:

1. **specificity failure:** background-dominant false events;
2. **sensitivity failure:** no-positive-dominant misses.

A simple eventizer repair is not supported:

- refractory suppression was zero in D4-D2;
- match conflict is zero here;
- recent-post-hit unmatched events are zero;
- merely waiting longer explains only a minority of no-positive misses.

The next diagnostic should test whether the frozen TEMPORAL3 scalar itself contains enough score separability to support any single-threshold repair, without changing the runtime threshold. This must be an attribution/separability audit, not a threshold-tuning experiment.

If no useful scalar separability exists, the next repair must be representation-level rather than eventizer-level.

## Deployment

```text
POTION v15D  DEPLOYED
v15N         CLOSED / BLOCKED
v16C         BLOCKED
```
