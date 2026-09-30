# result_v15n_d6_d2_d3_d3_d4_d2_d1_d1_d1_d1 — three-class failure attribution

## Status

```text
V15N_D6_D2_D3_D3_D4_D2_D1_D1_D1_D1_THREE_CLASS_FAILURE_ATTRIBUTED
```

Authoritative evidence:

```text
run            36666864084
head           75a8e881bf5dee5272d9ef8ed21cb96ad889dbe7
artifact       11078026076
artifact sha   sha256:6f044886d2d138c851fabb317eaa2511e79d0ec5ddd5de1bf0ad54ddad53b177
JSON sha256    a39781bedc4cb67da602c758a09b942b5a98b622a1aa9902123b9b0fda410024
```

The previous run 36649126420 completed the same calculation but emitted an invalid JSON trailer (literal \\n). It was not frozen as authoritative. Commit 75a8e881bf5dee5272d9ef8ed21cb96ad889dbe7 changed serialization only; the scientific contract, cohorts, model, and calculations were unchanged.

Frozen chain:

```text
design          582e51951c46a201f1dd0e272936acf4a7b46a17
prereg          66e1882613b60a89aafed9ff48139fd5474d5b38
implementation  65f4daa7fe2d42f8caebfd51ff6807bb1e4a8cd3
serialization   75a8e881bf5dee5272d9ef8ed21cb96ad889dbe7
workflow        9ce40b3840076532ac65c46bfaad97e23d957829
```

Prerequisite reproduction passed exactly against the authoritative three-class event-stream result.

## Support

```text
A: 64 tapes, 1737 unmatched events, 1327 background false,
   360 missed impacts, 1319 matched events — PASS

B: 64 tapes, 1766 unmatched events, 1370 background false,
   375 missed impacts, 1305 matched events — PASS
```

## 1. false-event timing

PROSPECTIVE_A:

```text
PRE_HIT_200MS        410 / 1737 = 0.236039
RECENT_POST_HIT_200MS  0 / 1737 = 0
BACKGROUND_200MS    1327 / 1737 = 0.763961
```

PROSPECTIVE_B:

```text
PRE_HIT_200MS        396 / 1766 = 0.224236
RECENT_POST_HIT_200MS  0 / 1766 = 0
BACKGROUND_200MS    1370 / 1766 = 0.775764
```

## 2. background-false entry source

PROSPECTIVE_A:

```text
FROM_TRUE_BACKGROUND  692 / 1327 = 0.521477
FROM_PRE_HIT          619 / 1327 = 0.466466
FROM_INITIAL           16 / 1327 = 0.012057
```

PROSPECTIVE_B:

```text
FROM_TRUE_BACKGROUND  735 / 1370 = 0.536496
FROM_PRE_HIT          622 / 1370 = 0.454015
FROM_INITIAL           13 / 1370 = 0.009489
```

Frozen axis:

```text
entrySourceAxis = TRUE_BACKGROUND_ENTRY_DOMINANT
```

The dominance is real by the preregistered >0.50 rule, but PRE_HIT entry remains a large secondary source at about 45–47%.

## 3. REALIZED margin

At each emitted event:

```text
realizedMargin =
  score_REALIZED_IMPACT
  - max(score_PRE_HIT, score_TRUE_BACKGROUND)
```

PROSPECTIVE_A:

```text
MATCHED_EVENT
  n=1319
  mean=0.356361
  median=0.318535
  q75=0.509592
  q90=0.695374

BACKGROUND_FALSE_EVENT
  n=1327
  mean=0.135773
  median=0.095622
  q75=0.186088
  q90=0.313052

matched vs background-false AUC
  0.795590
```

PROSPECTIVE_B:

```text
MATCHED_EVENT
  n=1305
  mean=0.348005
  median=0.314406
  q75=0.502981
  q90=0.669577

BACKGROUND_FALSE_EVENT
  n=1370
  mean=0.133170
  median=0.100090
  q75=0.183015
  q90=0.289174

matched vs background-false AUC
  0.792130
```

Frozen axis:

```text
marginAxis = MARGIN_SEPARABLE
```

The margin contains diagnostic information that can distinguish matched events from background false events, but no threshold is selected from these attribution cohorts.

## 4. missed-impact attribution

PROSPECTIVE_A:

```text
MATCH_CONFLICT                  0 / 360 = 0
PRE_HIT_REALIZED_CARRYOVER    284 / 360 = 0.788889
REALIZED_NO_EVENT_OTHER         0 / 360 = 0
NO_REALIZED_WINDOW             76 / 360 = 0.211111

NO_REALIZED late positive
  37 / 76 = 0.486842
```

PROSPECTIVE_B:

```text
MATCH_CONFLICT                  0 / 375 = 0
PRE_HIT_REALIZED_CARRYOVER    278 / 375 = 0.741333
REALIZED_NO_EVENT_OTHER         0 / 375 = 0
NO_REALIZED_WINDOW             97 / 375 = 0.258667

NO_REALIZED late positive
  47 / 97 = 0.484536
```

Frozen axis:

```text
missAxis = PRE_HIT_CARRYOVER_DOMINANT
```

## Interpretation

The three-class readout is not failing because of refractory suppression or evaluator matching conflict.

Two coupled mechanisms dominate:

1. low-confidence transitions from background/pre-hit states into REALIZED_IMPACT create excessive false events;
2. many impacts arrive while the classifier is already in REALIZED_IMPACT from a pre-hit transition, so the class-state rising-edge eventizer cannot emit a new post-hit event.

The realized-margin AUC near 0.79 on both cohorts makes a confidence-based event variable scientifically testable. Because the same continuous margin may rise further after a hit even when the discrete class was already REALIZED, a margin-crossing eventizer can potentially address both the false-entry and pre-hit-carryover failures without using physical hit state at runtime.

No threshold may be selected from these attribution cohorts. Any margin threshold must be calibrated from TRAIN-only data under a separately preregistered rule and tested on completely fresh prospective cohorts.

## Deployment

```text
POTION v15D  DEPLOYED
v15N         CLOSED / BLOCKED
v16C         BLOCKED
```
