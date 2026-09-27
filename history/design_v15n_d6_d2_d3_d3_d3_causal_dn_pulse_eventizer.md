# design_v15n_d6_d2_d3_d3_d3_causal_dn_pulse_eventizer

## Question

v15N-D6-D2-D3-D3-D2-D1 established that oracle-bounded BACKGROUND windows are structurally confounded because almost every raw BACKGROUND anchor is followed by a physical hit within 200 ms.

D3-D3-D3 therefore removes oracle hit-window boundaries from the runtime eventizer entirely.

It asks:

> Can the exact frozen D3-D3 DN score, gated only by causal old-scalar context and deduplicated by a fixed 200 ms refractory interval, produce a usable neural event stream that matches physical impacts one-to-one on fresh cohorts?

No new readout is trained and no threshold is tuned.

---

## 1. frozen runtime diagnostic inputs

At every eligible neural frame t reconstruct:

```text
oldScalarPositive_t
frozenDnScore_t
```

The runtime candidate at frame t is:

```text
contextEligible_t = oldScalarPositive_(t-1)
candidate_t = contextEligible_t && frozenDnScore_t >= 0.5
```

Only current/past neural evidence is used.

Required frozen identities:

```text
D6 detector
  5dc677cf4c14e398465af72cbcff784e40163cdf702064359e7f4648319c9eb5

old scalar model
  ee36661675a1f6717d53d2f2af63797704d89194bf78d980f5d4415e3ee4f066

innovation PCA32
  b187f3de9229e14260b8d1464e20fa3b8d26158a715a5372e4696c1bf3b7fb33

D3-D3 DN readout
  a341d9747a19bf4a3a0cb625eca5a4ff6a3dd071e1f641a4d8005cd18d21f496

DN threshold
  0.5
```

---

## 2. fixed causal pulse eventizer

Maintain only:

```text
lastEmittedEventStep
```

At each eligible frame:

```text
if candidate_t is true
and no event has been emitted during the preceding 10 simulation steps:
    emit one neural event at frameStep_t
```

Refractory interval:

```text
10 simulation steps = 200 ms
```

No hit/contact/HP/damage information is used by the eventizer.

---

## 3. evaluator-only hit matching

Physical hits are evaluator truth only.

One-to-one matching is deterministic:

1. sort physical hits by step;
2. for each hit in chronological order, choose the earliest still-unmatched neural event satisfying:

```text
eventStep >= hitStep
eventStep - hitStep < 10 simulation steps
```

3. mark that event matched;
4. unmatched physical hits are false negatives;
5. unmatched neural events are false positives.

Pre-hit neural events are never matched to a future hit.

---

## 4. fresh cohorts

TRAIN is used only to reconstruct the already-frozen detector/PCA/readouts:

```text
4081000 4091000 4101000
interruption 4147000
```

PROSPECTIVE_A:

```text
5091000 5101000 5111000 5121000
5131000 5141000 5151000 5161000
interruption 5177000
```

PROSPECTIVE_B:

```text
5181000 5191000 5201000 5211000
5221000 5231000 5241000 5251000
interruption 5267000
```

Exactly 64 tapes per prospective cohort.

---

## 5. metrics

Per cohort report:

- physical hits;
- emitted neural events;
- matched hits/events;
- precision;
- recall;
- F1;
- neural-event / physical-hit count ratio;
- mean tape-level absolute event-count error;
- median event latency for matched hits;
- p90 event latency;
- number and fraction of pre-hit unmatched events occurring within 200 ms before a physical hit;
- fraction of physical-hit pairs separated by <200 ms, to quantify refractory exposure.

---

## 6. scientific role

This is the first D3 branch experiment whose eventizer itself does not receive oracle physical-hit window boundaries.

It is still a diagnostic upper bound and nondeployable because the frozen old-scalar and DN readouts were trained using evaluator labels in earlier diagnostic stages.

A pass would justify testing whether the emitted event stream supports cumulative injury memory.

A fail should be attributed before any threshold/refractory tuning.
