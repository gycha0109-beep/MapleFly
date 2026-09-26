# design_v15n_d6_d2_d3_causal_scalar_onset_eventizer

## Question

v15N-D6-D2-D2 froze:

```text
V15N_D6_D2_D2_REIMPACT_ONSET_OBSERVABLE_SCALAR
```

The frozen diagnostic scalar onset representation generalized to fresh HOLDOUT:

```text
EVAL
  BA                         0.877083
  positive recall            0.917492
  negative recall            0.836674
  suppressed re-impact       0.935065

fresh HOLDOUT
  BA                         0.878071
  positive recall            0.916006
  negative recall            0.840136
  suppressed re-impact       0.943534
```

D6-D2-D3 asks:

> Can the frozen scalar-onset diagnostic be converted into a strictly causal rising-edge event stream that separates physical impacts approximately one-for-one on unseen episodes?

This is still a diagnostic upper bound. The underlying D6 detector and the D2-D2 scalar readout are trained using evaluator-only impact/onset labels and are not deployable.

---

## 1. frozen prerequisite

Exact D2-D2 evidence:

```text
run
  36204734622

artifact
  10893084661

artifact digest
  sha256:9873b523751ac109596b70d96d2bbde264ae0a92d2df8abebcce99d9e983b8fe

v15n_d6_d2_d2.json sha256
  51bcb6fbc61e568b6f515660325c45127a9a4f51cf9fe19086abc78b3b3c496d

outcome
  V15N_D6_D2_D2_REIMPACT_ONSET_OBSERVABLE_SCALAR
```

Reproduce the exact D6 detector, D2-D2 scalar features, TRAIN-only standardization, class-balanced ridge lambda 1e-3, and threshold 0.5.

---

## 2. cohorts

```text
TRAIN
  4081000 4091000 4101000

EVAL
  4111000 4121000 4131000

fresh HOLDOUT
  4471000 4481000 4491000

TRAIN->EVAL interruption RNG
  4147000

fresh HOLDOUT interruption RNG
  4507000
```

24 tapes per cohort.

The D2-D2 HOLDOUT is not used for final D2-D3 gating.

---

## 3. causal eventizer

For each eligible 100 ms neural frame, compute the exact frozen D2-D2 SCALAR_ONSET readout score:

```text
features =
  [margin, delta1, delta5mean, peakRise5]

positive_t = score_t >= 0.5
```

State:

```text
previousPositive = false
```

Transition:

```text
if positive_t AND NOT previousPositive:
    emit exactly one neural event at frame t

previousPositive = positive_t
```

There is:

- no refractory timer;
- no contact-age input;
- no HP/damage-count input;
- no decision-index input;
- no oracle runtime input;
- no threshold search;
- no re-arm duration.

The only eventizer state is the previous binary onset prediction.

---

## 4. evaluator-only event matching

Physical damage events are evaluator-only truth.

Use deterministic one-to-one chronological matching.

For each physical hit in chronological order:

1. consider unmatched emitted neural events at or after the hit;
2. require eventStep - hitStep in [0, 10) simulation steps = [0, 200 ms);
3. match the earliest eligible unmatched neural event;
4. each physical hit and neural event may be matched at most once.

Report:

```text
precision = matched events / emitted events
recall    = matched hits / physical hits
F1
false events per episode
missed hits per episode
event-count ratio = emitted events / physical hits
```

Also report per-episode absolute count error:

```text
abs(emitted neural events - physical hits)
```

---

## 5. old-D2 comparator

Reproduce the frozen D2 eventizer metrics on TRAIN and EVAL.

Run the old D2 eventizer on the fresh HOLDOUT as a descriptive comparator only.

No comparator result changes D2-D3 gates.

---

## 6. scientific role

A D2-D3 PASS would demonstrate that the eventization failure found in D2/D2-D1 can be structurally repaired under the oracle-trained diagnostic representation without a fixed refractory duration.

It would not demonstrate:

- deployability;
- oracle-free impact detection;
- cumulative injury reconstruction;
- POTION need inference;
- reward-only policy improvement.

Those remain separate blockers.
