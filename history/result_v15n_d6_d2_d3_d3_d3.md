# result_v15n_d6_d2_d3_d3_d3 — causal DN pulse eventizer

## Status

```text
V15N_D6_D2_D3_D3_D3_CAUSAL_DN_EVENT_STREAM_NOT_DEMONSTRATED
```

The preregistered causal DN pulse eventizer completed successfully with adequate support on both fresh prospective cohorts, but failed the frozen event-stream gates.

Authoritative evidence:

```text
run
  36360419550

head
  5e117ed527a839f5f92af203150ba8f45ec23411

artifact
  10947295144

artifact digest
  sha256:c139ef3b61721c2a3704fddca8a0c644bfe8c0d8fee3e4d54b406681b0ac80df

v15n_d6_d2_d3_d3_d3.json sha256
  5d18c3bd453024f8281e20bc5c33921528b40c5f43f1cab8db6c7565e2db1247
```

Preregistration:

```text
41eeb16da054924ab30f51aa66d9e38ebcc0ce37
```

Implementation/workflow:

```text
dc89684c4a354e47399a3c343e2c3306aa53c52a
5e117ed527a839f5f92af203150ba8f45ec23411
```

## 1. support

```text
PROSPECTIVE_A
  tapes          64
  physical hits 1680
  neural events 2129
  support        PASS

PROSPECTIVE_B
  tapes          64
  physical hits 1719
  neural events 2174
  support        PASS
```

## 2. event-stream metrics

```text
PROSPECTIVE_A
  precision                         0.591827
  recall                            0.750000
  F1                                0.661591
  event / hit count ratio           1.267262
  mean tape absolute count error    7.015625
  median matched latency            100 ms
  p90 matched latency               160 ms
  unmatched events                  869
  unmatched hits                    420
  unmatched pre-hit events <200ms   140
  close hit-pair fraction           0.000000

PROSPECTIVE_B
  precision                         0.591076
  recall                            0.747528
  F1                                0.660159
  event / hit count ratio           1.264689
  mean tape absolute count error    7.109375
  median matched latency            100 ms
  p90 matched latency               160 ms
  unmatched events                  889
  unmatched hits                    434
  unmatched pre-hit events <200ms   164
  close hit-pair fraction           0.000000
```

Frozen gates were:

```text
precision >= 0.75
recall >= 0.75
F1 >= 0.75
0.80 <= event/hit ratio <= 1.20
mean tape absolute count error <= 5.0
```

The primary failure pattern is over-emission:

- precision is about 0.59 in both cohorts;
- event count is about 1.265x physical-hit count;
- count MAE exceeds 7;
- recall is near 0.75, not catastrophically low.

The 200 ms refractory is not obviously exposed to closely spaced physical hits in these cohorts because no consecutive physical-hit pair is separated by <200 ms.

## 3. interpretation

The first oracle-window-free D3 event stream is not yet sufficiently precise.

The next experiment must not tune the DN threshold or refractory interval. It should first attribute:

### Unmatched neural events

- PRE_HIT_200MS:
  unmatched event occurs within 200 ms before a future physical hit;
- RECENT_POST_HIT_200MS:
  unmatched event occurs within 200 ms after a previous physical hit;
- BACKGROUND:
  neither a previous nor future physical hit is within 200 ms.

### Unmatched physical hits

- NO_CANDIDATE_WINDOW:
  no causal DN candidate exists in the post-hit 200 ms evaluator window;
- REFRACTORY_SUPPRESSION:
  a causal candidate exists in the post-hit window but was not emitted because the frozen 200 ms refractory suppressed it;
- MATCH_CONFLICT:
  an emitted event exists in the post-hit window but was consumed by earlier one-to-one matching;
- OTHER_UNMATCHED:
  residual category if none of the above applies.

This attribution should determine whether over-emission is predominantly anticipatory/pre-hit, lingering/post-hit, or true background activity, and whether recall loss is representational or introduced by eventization.

No threshold/refractory tuning is justified before that attribution.

## 4. deployment

```text
POTION v15D
  DEPLOYED

v15N
  CLOSED / BLOCKED

D3-D3-D3 causal DN event stream
  NOT DEMONSTRATED

v16C
  BLOCKED
```
