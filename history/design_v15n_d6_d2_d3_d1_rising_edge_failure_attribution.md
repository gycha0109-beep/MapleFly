# design_v15n_d6_d2_d3_d1_rising_edge_failure_attribution

## Question

v15N-D6-D2-D3 froze:

```text
V15N_D6_D2_D3_CAUSAL_EVENTIZATION_NOT_DEMONSTRATED
```

The frozen D2-D2 scalar frame classifier reproduced at ~0.92 positive recall on EVAL, but the simple causal 0->1 rising-edge eventizer reached only 0.196 event recall on EVAL and 0.237 on fresh HOLDOUT.

D3-D1 is failure attribution only.

It asks:

1. Why are physical hits missed by the rising-edge eventizer?
2. Where do unmatched false emitted events occur relative to physical impacts?

No new eventizer, threshold, refractory duration, feature, or policy is evaluated.

---

## 1. frozen prerequisite

Exact D2-D3 evidence:

```text
run
  36210113750

artifact
  10895732694

artifact digest
  sha256:64cefd93dbaf61f8a405488f0c45468185851ae2b8f0a9bad8b6dd451bf77066

v15n_d6_d2_d3.json sha256
  7aa72195234fd7522217484a835da276a3e2a1a6b4b7be87eb587f838804a36a

outcome
  V15N_D6_D2_D3_CAUSAL_EVENTIZATION_NOT_DEMONSTRATED
```

Reproduce exactly:

- D6 detector;
- D2-D2 scalar model;
- D2-D3 causal rising-edge eventizer;
- D2-D3 one-to-one chronological matching;
- TRAIN/EVAL D2-D3 metrics.

---

## 2. cohorts

Use the exact D2-D3 cohorts.

```text
TRAIN
  4081000 4091000 4101000

EVAL
  4111000 4121000 4131000

HOLDOUT
  4471000 4481000 4491000

TRAIN->EVAL interruption RNG
  4147000

HOLDOUT interruption RNG
  4507000
```

D3-D1 is descriptive attribution of an already-frozen failure, so no new HOLDOUT is introduced.

---

## 3. missed-hit attribution

For every physical hit, inspect the exact frozen scalar classifier and D2-D3 emitted event stream in the same 200 ms matching window:

```text
0 <= step - hitStep < 10 simulation steps
```

Apply the exact D2-D3 one-to-one matching first.

A hit is classified into exactly one category.

### RECALLED

The physical hit is matched to a D2-D3 neural event.

### FRAME_CLASSIFIER_MISS

The hit is unmatched and there is no scalar-classifier-positive eligible frame in the 200 ms window.

### MATCHING_CONFLICT

The hit is unmatched, at least one D2-D3 emitted event exists in its 200 ms window, but every such event was already consumed by an earlier physical hit under the frozen chronological one-to-one matching.

### EDGE_SUPPRESSION

The hit is unmatched and at least one scalar-classifier-positive eligible frame exists in the 200 ms window, but no D2-D3 emitted rising edge exists in that window.

This means frame-level positive evidence existed but the binary rising-edge state machine failed to emit a new event.

For EDGE_SUPPRESSION cases additionally report:

- whether the classifier was already positive on the immediately preceding eligible frame entering the first positive frame in the hit window;
- number of positive classifier frames in the 200 ms window.

---

## 4. false-event timing attribution

Take only emitted D2-D3 neural events left unmatched after the exact one-to-one matching.

Classify each unmatched event by age from the most recent physical hit:

### RECENT_UNMATCHED

```text
0 <= age < 0.2 s
```

### LINGER

```text
0.2 s <= age < 2.0 s
```

### BACKGROUND

```text
no prior physical hit
OR age >= 2.0 s
```

Also report finer bins:

```text
0-0.2 s
0.2-0.5 s
0.5-1.0 s
1.0-2.0 s
>=2.0 s / no prior hit
```

---

## 5. additional descriptive structure

Per cohort report:

- physical hits;
- recalled hits;
- missed hits;
- each missed-hit category count/fraction;
- unmatched false emitted events;
- each false-event timing category count/fraction;
- fraction of EDGE_SUPPRESSION cases already positive before the first positive frame in-window;
- median positive classifier frames per EDGE_SUPPRESSION hit;
- inter-hit interval median and fractions <0.2 s, <0.5 s, <1.0 s, <2.0 s.

Inter-hit timing is evaluator-only descriptive evidence and cannot be used to change D3 within D3-D1.

---

## 6. scientific role

D3-D1 identifies the failure mechanism of the already-frozen rising-edge eventizer.

It does not:

- construct a replacement eventizer;
- tune a refractory duration;
- change the D2-D2 scalar threshold;
- train a new classifier;
- alter label windows;
- test a POTION policy.

Any replacement eventization principle requires a separate preregistration and another fresh HOLDOUT.
