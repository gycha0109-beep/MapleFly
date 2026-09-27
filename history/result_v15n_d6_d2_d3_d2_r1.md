# result_v15n_d6_d2_d3_d2_r1 — frozen-readout support replication

## Status

```text
V15N_D6_D2_D3_D2_R1_CONDITIONAL_REIMPACT_NOT_REPLICATED
```

The corrected preregistered R1 replication completed successfully with adequate support on both 64-tape prospective cohorts.

Authoritative evidence:

```text
run
  36286352721

head
  1c501bd3e6a172a6902cc47bc6df80490d643ed9

artifact
  10921791405

artifact name
  maplefly-v15n-d6-d2-d3-d2-r1-frozen-readout-support-36286352721

artifact digest
  sha256:f31af207cc78cc938c0465e561f0d8f11762dd51830e8785157e6b4f24c9c8b7

v15n_d6_d2_d3_d2_r1.json sha256
  ff70bf5055712b48cc08b1dca3ee0c50ba8836ed2c501342fa5d49713e4f8a42
```

Preregistration:

```text
cc13947c32c9892a5d748eeaa4977800c1ffae2c
```

Corrected implementation:

```text
1c501bd3e6a172a6902cc47bc6df80490d643ed9
```

The first R1 attempt was separately frozen as implementation-invalid because it inherited a 24-tape equality instead of the preregistered 64-tape equality.

---

## 1. support

```text
REPLICATION_A
  tapes                    64
  POSITIVE_REIMPACT      1300
  NEGATIVE_LINGER        2005
  NEGATIVE_BACKGROUND     636
  support                  PASS

REPLICATION_B
  tapes                    64
  POSITIVE_REIMPACT      1341
  NEGATIVE_LINGER        2172
  NEGATIVE_BACKGROUND     613
  support                  PASS
```

The original D3-D2 support insufficiency is therefore resolved.

---

## 2. DERIVATIVE3 frozen replication

```text
REPLICATION_A
  balanced accuracy              0.722635
  positive re-impact recall      0.803846
  negative recall                0.641424
  LINGER negative recall         0.832918
  BACKGROUND negative recall     0.037736

REPLICATION_B
  balanced accuracy              0.715391
  positive re-impact recall      0.774049
  negative recall                0.656732
  LINGER negative recall         0.831492
  BACKGROUND negative recall     0.037520
```

DERIVATIVE3 fails the frozen 0.75 balanced-accuracy and negative-recall gates on both replication cohorts.

---

## 3. SCALAR4 frozen replication

```text
REPLICATION_A
  balanced accuracy              0.704710
  positive re-impact recall      0.738462
  negative recall                0.670958
  LINGER negative recall         0.833416
  BACKGROUND negative recall     0.158805

REPLICATION_B
  balanced accuracy              0.712132
  positive re-impact recall      0.743475
  negative recall                0.680790
  LINGER negative recall         0.822744
  BACKGROUND negative recall     0.177814
```

SCALAR4 also fails the frozen gates.

---

## 4. interpretation

The scalar conditional-reimpact route does not replicate once the preregistered BACKGROUND support requirement is satisfied.

The failure is highly structured:

- DERIVATIVE3 preserves reasonably high re-impact recall and LINGER rejection;
- however, it classifies almost all previous-positive BACKGROUND frames as re-impact;
- adding raw scalar margin improves BACKGROUND recall only modestly and lowers positive recall.

Therefore further tuning of scalar thresholds, refractory durations, or scalar feature weights is not justified by this branch.

The next diagnostic should move to the spatial structure of frozen MaleCNS activity: test whether a full-DN causal innovation representation can distinguish a new physical impact from LINGER/BACKGROUND while conditioning on the same previous-positive state.

---

## 5. deployment

```text
POTION v15D
  DEPLOYED

v15N
  CLOSED / BLOCKED

scalar conditional-reimpact route
  CLOSED BY REPLICATION

v16C
  BLOCKED
```
