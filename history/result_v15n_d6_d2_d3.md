# result_v15n_d6_d2_d3 — causal scalar-onset eventizer

## Status

```text
V15N_D6_D2_D3_CAUSAL_EVENTIZATION_NOT_DEMONSTRATED
```

The preregistered v15N-D6-D2-D3 diagnostic completed successfully, but the causal rising-edge eventizer failed the frozen eventization gates.

Authoritative evidence:

```text
run
  36210113750

head
  5d75a4e2f348781c3fb12f8001a003205e9b5db5

artifact
  10895732694

artifact name
  maplefly-v15n-d6-d2-d3-causal-scalar-onset-eventizer-36210113750

artifact digest
  sha256:64cefd93dbaf61f8a405488f0c45468185851ae2b8f0a9bad8b6dd451bf77066

v15n_d6_d2_d3.json sha256
  7aa72195234fd7522217484a835da276a3e2a1a6b4b7be87eb587f838804a36a
```

Preregistration:

```text
f4259d5ea071d0bb1686e78ce1b2e3c2d863b539
```

Implementation/workflow:

```text
ac90ca24ff081c10df9f94f5fe2230d82443b259
5d75a4e2f348781c3fb12f8001a003205e9b5db5
```

---

## 1. causal rising-edge eventization metrics

```text
TRAIN
  physical hits            648
  neural events            770
  matched                  156
  precision             0.202597
  recall                0.240741
  F1                    0.220028
  event-count ratio     1.188272
  count MAE             5.083333

EVAL
  physical hits            606
  neural events            746
  matched                  119
  precision             0.159517
  recall                0.196370
  F1                    0.176036
  event-count ratio     1.231023
  count MAE             5.833333

fresh HOLDOUT
  physical hits            646
  neural events            773
  matched                  153
  precision             0.197930
  recall                0.236842
  F1                    0.215645
  event-count ratio     1.196594
  count MAE             5.375000
```

Support passed, but precision, recall, F1, and count-error gates failed.

---

## 2. D2-D2 scalar frame classifier reproduced

The exact frozen D2-D2 scalar readout reproduced before D2-D3 eventization.

```text
model sha256
  ee36661675a1f6717d53d2f2af63797704d89194bf78d980f5d4415e3ee4f066

EVAL frame-level
  balanced accuracy              0.877083
  positive recall                0.917492
  negative recall                0.836674
  suppressed re-impact recall    0.935065
```

Therefore the D2-D3 failure is not explained by failure to reproduce the D2-D2 frame classifier.

---

## 3. comparison with old D2 eventizer

```text
old D2 EVAL
  precision   0.140756
  recall      0.110561
  F1          0.123845

D2-D3 EVAL
  precision   0.159517
  recall      0.196370
  F1          0.176036
```

The scalar rising-edge eventizer improves recall relative to old D2, but remains far below the preregistered one-hit eventization requirement.

---

## 4. interpretation

D2-D2 established that a causal scalar onset representation can identify individual onset-labelled frames across unseen episodes.

D2-D3 shows that simply emitting an event on every classifier transition from negative to positive is insufficient to convert that frame-level information into approximately one physical event per hit.

The discrepancy requires failure attribution before any eventizer redesign. Plausible mechanisms include:

- the classifier is already positive before a new hit, suppressing a new rising edge;
- false-positive negative-frame classifications fragment into many unrelated rising edges;
- closely spaced physical hits compete for the same emitted event under one-to-one matching.

No eventizer parameter is changed in this result.

---

## 5. deployment

```text
POTION v15D
  DEPLOYED

v15N
  CLOSED / BLOCKED

v15N-D6-D2-D3
  DIAGNOSTIC COMPLETE / FAILED EVENTIZATION GATES

v16C
  BLOCKED
```
