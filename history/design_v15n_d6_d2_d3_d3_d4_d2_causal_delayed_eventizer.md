# design_v15n_d6_d2_d3_d3_d4_d2_causal_delayed_eventizer

## Question

D4-D1 froze:

```text
V15N_D6_D2_D3_D3_D4_D1_REALIZED_IMPACT_AGE_ATTRIBUTED
ageAxis = EARLY_ONLY_UNRESOLVED
```

The exact frozen PCA32_TEMPORAL3 representation is weak during 0–<100 ms after an impact but passes the 0.75 realized-impact recall gate during 100–<200 ms on both attribution cohorts.

D4-D2 asks:

> Can the exact frozen TEMPORAL3 score be converted into a one-to-one causal neural event stream by waiting for its natural delayed threshold crossing, without oracle impact windows or a deeper temporal representation?

No new readout is trained. No threshold, temporal depth, label, or refractory parameter is tuned.

---

## 1. frozen prerequisite

Require the authoritative D4-D1 result:

```text
result commit
  89c0cac3d7b90432333bafa0c4ce8a832be26599

receipt commit
  da62089803c06e8ac6c721e01b2b5c509ccace9e

run
  36507440642

artifact
  11008183466

D4-D1 outcome
  V15N_D6_D2_D3_D3_D4_D1_REALIZED_IMPACT_AGE_ATTRIBUTED

age axis
  EARLY_ONLY_UNRESOLVED
```

The implementation must also verify the exact frozen D4 representation/model identities recorded by D4-D1 before eventization.

---

## 2. exact frozen runtime score

Reconstruct exactly:

- frozen D6 preprocessing/detector;
- frozen innovation PCA32;
- frozen PCA32_TEMPORAL3 readout;
- threshold 0.5;
- temporal depth 3.

At each eligible neural frame t compute only:

```text
temporal3Score_t
temporal3Positive_t = temporal3Score_t >= 0.5
```

TEMPORAL3 uses current and past neural frames only.

No old-scalar context gate is used.

No impact/contact/HP/damage/seed information enters the runtime eventizer.

---

## 3. fixed causal delayed eventizer

The eventizer is deliberately minimal.

At each eligible frame t:

```text
risingEdge_t =
  temporal3Positive_t
  &&
  !temporal3Positive_(t-1)
```

Emit one neural event at frameStep_t when:

```text
risingEdge_t
AND
(
  no prior emitted event
  OR
  frameStep_t - lastEmittedEventStep >= 10 simulation steps
)
```

Fixed refractory:

```text
10 simulation steps = 200 ms
```

The event is emitted when delayed neural evidence actually appears. There is no oracle timer started by an impact.

The 200 ms refractory is inherited unchanged from the earlier causal event-stream contract. It is not selected from D4-D1.

---

## 4. evaluator-only one-to-one matching

Physical impacts are evaluator truth only.

For each impact in ascending step order, match the earliest still-unmatched neural event satisfying:

```text
eventStep >= impactStep
eventStep - impactStep < 10 simulation steps
```

Unmatched impact = false negative.
Unmatched neural event = false positive.
Pre-impact events are never matched forward.

The evaluator matching window is unchanged from the earlier causal event-stream experiments.

---

## 5. fresh cohorts

TRAIN is used only to reconstruct the already-frozen representation/readout:

```text
4081000 4091000 4101000
interruption 4147000
```

PROSPECTIVE_A:

```text
5451000 5461000 5471000 5481000
5491000 5501000 5511000 5521000
interruption 5537000
```

PROSPECTIVE_B:

```text
5541000 5551000 5561000 5571000
5581000 5591000 5601000 5611000
interruption 5627000
```

Exactly 64 tapes per prospective cohort.

D4 and D4-D1 cohorts are not reused for the new event-stream claim.

---

## 6. support

Per prospective cohort require:

```text
64 tapes
physical impacts >= 1000
emitted neural events >= 500
```

Otherwise the new event-stream experiment is support-inconclusive.

---

## 7. metrics and gates

Per cohort report:

- physical impacts;
- emitted neural events;
- matched events;
- false events;
- missed impacts;
- precision;
- recall;
- F1;
- neural-event / physical-impact count ratio;
- mean tape-level absolute event-count error;
- median matched latency;
- p90 matched latency;
- pre-impact unmatched events within 200 ms of a later impact;
- fraction of impact pairs separated by <200 ms;
- fraction of emitted events suppressed by the frozen refractory.

Reuse the earlier causal event-stream gates unchanged:

```text
precision >= 0.75
recall >= 0.75
F1 >= 0.75
0.80 <= neuralEventCount / physicalImpactCount <= 1.20
mean tape-level absolute event-count error <= 5.0
```

All gates must pass on both prospective cohorts.

Latency and failure-location diagnostics are descriptive only.

---

## 8. scientific role

D4-D2 is the direct consequence of EARLY_ONLY_UNRESOLVED.

A pass would demonstrate that the delayed TEMPORAL3 signal can support an oracle-window-free causal event stream. Only then may a separate preregistered experiment test cumulative injury memory.

A fail does not justify threshold, refractory, or temporal-depth tuning. The failed stream must first be attributed into false-event and missed-impact mechanisms.

This remains a diagnostic upper bound and is not deployable because the frozen TEMPORAL3 readout was trained using evaluator labels.

POTION v15D remains deployed. v15N and v16C remain blocked.
