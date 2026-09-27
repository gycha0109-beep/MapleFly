# result_v15n_d6_d2_d3_d3 — context-balanced DN innovation observability

## Status

```text
V15N_D6_D2_D3_D3_CONDITIONAL_REIMPACT_NOT_DEMONSTRATED
```

The corrected preregistered D3-D3 audit completed successfully with adequate support on both 64-tape prospective cohorts.

Authoritative evidence:

```text
run
  36292221753

head
  556127852df942b380b9e1007bdc9f395a6900c2

artifact
  10922928955

artifact name
  maplefly-v15n-d6-d2-d3-d3-context-balanced-dn-36292221753

artifact digest
  sha256:68cf420e639aeb1fd53e8dd0ed809b0713db5aa7c77e9434fcdc7d811d3075dd

v15n_d6_d2_d3_d3.json sha256
  6d5164df93e621b497e716235b799b0a2604ef4ed8b582ac6750a4b4b3ed62c8
```

Preregistration:

```text
47d45be53043af245ebbb690322880fdbda9b8e4
```

Corrected implementation:

```text
556127852df942b380b9e1007bdc9f395a6900c2
```

The earlier run `36289367631` failed before model fitting/outcome due a missing D2 trace prerequisite and produced no scientific artifact.

---

## 1. Support

```text
PROSPECTIVE_A
  tapes                    64
  POSITIVE_REIMPACT      1311
  NEGATIVE_LINGER        2087
  NEGATIVE_BACKGROUND     631
  support                  PASS

PROSPECTIVE_B
  tapes                    64
  POSITIVE_REIMPACT      1346
  NEGATIVE_LINGER        2104
  NEGATIVE_BACKGROUND     612
  support                  PASS
```

---

## 2. DN_INNOVATION_PCA32

```text
PROSPECTIVE_A
  balanced accuracy              0.638701
  positive re-impact recall      0.385202
  negative recall                0.892200
  LINGER negative recall         0.878294
  BACKGROUND negative recall     0.938193

PROSPECTIVE_B
  balanced accuracy              0.629268
  positive re-impact recall      0.382615
  negative recall                0.875920
  LINGER negative recall         0.864544
  BACKGROUND negative recall     0.915033
```

The DN representation strongly rejects both negative subtypes but fails the frozen positive-recall and balanced-accuracy gates.

---

## 3. context-balanced DERIVATIVE3

```text
PROSPECTIVE_A
  balanced accuracy              0.557186
  positive re-impact recall      0.154844
  negative recall                0.959529
  LINGER negative recall         0.973646
  BACKGROUND negative recall     0.912837

PROSPECTIVE_B
  balanced accuracy              0.567627
  positive re-impact recall      0.181278
  negative recall                0.953976
  LINGER negative recall         0.964829
  BACKGROUND negative recall     0.916667
```

Context balancing fixes the prior BACKGROUND false-positive pathology for DERIVATIVE3, but at the cost of collapsing re-impact recall.

---

## 4. frozen identities

```text
D6 detector weights
  5dc677cf4c14e398465af72cbcff784e40163cdf702064359e7f4648319c9eb5

old D2-D2 scalar model
  ee36661675a1f6717d53d2f2af63797704d89194bf78d980f5d4415e3ee4f066

label-free DN innovation PCA
  b187f3de9229e14260b8d1464e20fa3b8d26158a715a5372e4696c1bf3b7fb33

D3-D3 DN model
  a341d9747a19bf4a3a0cb625eca5a4ff6a3dd071e1f641a4d8005cd18d21f496

D3-D3 DERIVATIVE3 model
  6fdbda776c1e39c3ff5ba576cb917de94504ce66c168cc11b154045348d3c11d
```

---

## 5. interpretation

The scalar route's R1 failure was not merely a consequence of BACKGROUND under-weighting. Explicit POSITIVE/LINGER/BACKGROUND balancing produces high negative subtype recall but poor re-impact recall.

Adding 1316-D spatial innovation through the frozen label-free PCA32 improves positive recall relative to DERIVATIVE3, but only to about 38%, far below the 0.75 gate.

Therefore the present five-frame causal innovation representation does not demonstrate robust conditional re-impact observability.

The next diagnostic must not retune thresholds or representation immediately. It should first determine whether the frozen DN readout's missed physical hits are:

- temporal-alignment failures where a positive prediction appears later inside the existing 200 ms hit window; or
- true window-level misses with no positive DN prediction anywhere in that window.

---

## 6. deployment

```text
POTION v15D
  DEPLOYED

v15N
  CLOSED / BLOCKED

scalar conditional-reimpact route
  CLOSED BY REPLICATION

D3-D3 five-frame DN innovation
  NOT DEMONSTRATED

v16C
  BLOCKED
```
