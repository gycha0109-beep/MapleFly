# result_v15a7 — temporal carrier decomposition

## Verdict

**V15A7 outcome: BASELINE_REPLICATED**

Preregistered carrier findings:

```text
ABSOLUTE_ALIGNMENT_CONTRIBUTES
CROSS_DN_PHASE_CONTRIBUTES
```

v15B remains **BLOCKED** by preregistration.

The fresh-cohort CONCAT48 procedure baseline reproduced the coarse potion-economic
signal. Destroying common absolute temporal alignment or cross-DN temporal phase caused
large, preregistered material losses.

v15A7 does not establish a v15B-ready policy representation and does not establish
exact 1-vs-2 economic-boundary sufficiency.

## Provenance

```text
preregistration
  history/prereg_v15a7.md
  41010853e9eba8124bee34b23fb88bb08bebde4f

implementation
  5524c5e3571ac1d1f70619061edf11a476cd0b25
  experiment(v15a7): add temporal carrier decomposition

workflow head
  9f7b78a4be629c4babf95ac46670b93d1ff86d7e
  experiment(v15a7): wire temporal carrier CI

workflow
  Screen MapleFly v15A7 Temporal Carrier
  run 35881365299
  conclusion success

artifact
  10761068053
  maplefly-v15a7-temporal-carrier-35881365299
  sha256:970347d114a6dd579e5554ee3d2782c8098b490de6aafcb6ba7fe73bc666b497
```

The workflow succeeded because v15A7's R0 primary baseline replication gate passed.
All evidence, including failed transformed conditions, was uploaded.

## Frozen experiment

Biological/sensory contract remained unchanged:

```text
MaleCNS
  95a3dbcb05241b0a5c07028ca8ad945b23fbbe6e

corrected LgLG
  LEFT 331
  RIGHT 338

impact
  drive 0.7
  pulse 120 ms

ground
  SNta_L/R 0.05

taste
  LB3 + claw_tpGRN bilateral
  drive 0.8
  final 100 ms

history
  48 x 100 ms = 4.8 s
```

Fresh cohort:

```text
TRAIN 2840000 2840100 2840200 2840300
EVAL  2845000 2845100 2845200
6 replicates x 4 states
TRAIN 96 rows
EVAL  72 rows
```

Every representation used the same underlying simulated raw histories. Each
representation independently performed TRAIN-only, all-state, label-blind
variance-top-256 temporal-slot selection and TRAIN-only normalization.

## Representation hashes

```text
R0 FULL_CONCAT48
  70b2742b14cf8999b52ba03d4efe807f153a44f23875ec3918beddb49f2e2f41

R1 WHOLE_FRAME_CIRCULAR_SHIFT
  c63c2ab6952f8b19544bb338cd5c2615171591dea4865ad42c624011750f0891

R2 WHOLE_FRAME_PERMUTATION
  6b3514f4558697bd5e98bf8dee418357aa30cc842d8e94f63e0e1930816a0f09

R3 INDEPENDENT_DN_CIRCULAR_SHIFT
  06c000422229a60783293a1ee561659af437ad6c26da5b9cf6d05a66517152d4
```

## Primary Task A — 0/1 vs 2/3

| Representation | FULL BA | Recall 0 / 1 | DN_SHUFFLED | Margin | Gate |
|---|---:|---:|---:|---:|---|
| R0 FULL_CONCAT48 | **84.7%** | 86.1% / 83.3% | 50.0% | **+34.7pp** | **PASS** |
| R1 whole circular shift | 62.5% | 55.6% / 69.4% | 55.6% | +6.9pp | FAIL |
| R2 frame permutation | 47.2% | 38.9% / 55.6% | 58.3% | -11.1pp | FAIL |
| R3 independent-DN shift | 51.4% | 36.1% / 66.7% | 48.6% | +2.8pp | FAIL |

R0 therefore passed the frozen baseline replication gate:

```text
balanced accuracy >= 70%     PASS
both recalls >= 60%          PASS
DN identity margin >= 20pp   PASS
```

This reproduces the earlier coarse CONCAT48 finding on a third, fresh 284xxxx cohort
using a newly fitted label-blind CONCAT48 procedure.

## Preregistered paired-bootstrap degradation

Task A, 18 paired EVAL groups, 2,000 resamples, seed 2849000:

| Transform | R0 - transform BA | 95% CI | Transform gate | Material loss |
|---|---:|---:|---|---|
| R1 circular shift | **+22.2pp** | **[+9.7, +33.3]pp** | FAIL | **YES** |
| R2 frame permutation | **+37.5pp** | **[+27.8, +48.6]pp** | FAIL | **YES** |
| R3 independent-DN shift | **+33.3pp** | **[+22.2, +45.8]pp** | FAIL | **YES** |

Each material-loss decision satisfies the preregistered rule:

```text
R0 Task A gate PASS
transform Task A gate FAIL
point degradation >= 10pp
bootstrap CI lower bound > 0
```

## Mechanistic interpretation

### 1. Absolute temporal alignment contributes

R1 preserved cyclic temporal order and within-frame population geometry but moved the
whole population trajectory away from a common absolute frame alignment.

It reduced Task A from 84.7% to 62.5%, with a +22.2pp paired degradation and a
strictly positive 95% CI.

Therefore the preregistered finding is:

> common absolute temporal alignment to the endpoint contributes materially to the
> coarse economic-state signal.

This is stronger than the earlier v15A6 observation. POOL48 showed that temporal
averaging loses the signal; v15A7 now shows that even retaining the entire cyclic
trajectory while randomizing its common absolute phase materially damages decoding.

### 2. Cross-DN phase / instantaneous population geometry contributes

R3 preserved each DN's own cyclic trajectory but independently shifted each DN in
time, destroying common cross-DN phase.

Task A fell from 84.7% to 51.4%; paired degradation was +33.3pp with 95% CI
[+22.2,+45.8]pp.

Therefore the preregistered finding is:

> cross-DN temporal phase / instantaneous population geometry contributes materially
> to the coarse economic-state signal.

### 3. R2 cannot uniquely isolate temporal order

R2 also produced a strong material loss, falling to 47.2%.

However R2 destroys both absolute alignment and temporal order. Because R1 already
showed a material loss when absolute alignment alone was disrupted, the preregistered
rule does **not** permit the stronger claim that temporal order contributes beyond
absolute alignment.

Thus v15A7 does not claim:

```text
TEMPORAL_ORDER_CONTRIBUTES_BEYOND_ABSOLUTE_ALIGNMENT
```

from this result.

## Boundary diagnostics

R0 diagnostics:

| Task | FULL BA | Recall 0 / 1 | DN_SHUFFLED | Margin | Gate |
|---|---:|---:|---:|---:|---|
| B — 1 vs 2 | 66.7% | 61.1% / 72.2% | 50.0% | +16.7pp | FAIL |
| C — 0 vs 3 | 94.4% | 94.4% / 94.4% | 50.0% | +44.4pp | PASS |
| D — 0 vs 1 | 72.2% | 100.0% / 44.4% | 52.8% | +19.4pp | FAIL |
| E — 2 vs 3 | 58.3% | 44.4% / 72.2% | 55.6% | +2.8pp | FAIL |

The nearest 1-vs-2 boundary again fails the existing gate despite improving from the
v15A5 63.9% point estimate to 66.7% here. It fails both the 70% balanced-accuracy
criterion and the +20pp DN-margin criterion.

Therefore the repeated scientific pattern remains:

```text
coarse 0/1 vs 2/3 burden signal   robustly observed
wide 0 vs 3 anchor                strong
nearest 1 vs 2 local boundary     insufficient
adjacent local resolution         inconsistent / insufficient
```

## What v15A7 changes

Before v15A7:

```text
CONCAT48 works coarsely
POOL48 does not
```

After v15A7:

```text
CONCAT48 coarse signal replicates on fresh seeds
common absolute temporal alignment materially contributes
cross-DN temporal phase materially contributes
simple 4.8 s mean is insufficient
nearest economic boundary remains insufficient
```

This narrows the next experiment. The next representation analysis should localize
**where in endpoint-aligned time** the coarse signal exists, while retaining
population geometry.

## Next permitted scientific step

A separately preregistered **v15A8 temporal localization** experiment is permitted.

Its purpose should be mechanistic localization, not threshold hunting:

- retain common absolute alignment,
- retain simultaneous DN population geometry,
- partition the fixed 4.8 s history into preregistered windows,
- determine when Task A information appears,
- use cross-temporal decoding to test whether the representation is transient or
  persistent.

Do not use v15A8 to try arbitrary window lengths until 1-vs-2 crosses 70%.

## v15B status

**BLOCKED.**

v15A7 was explicitly preregistered without v15B unlock authority. No classifier from
this experiment may be deployed as the POTION policy.

Existing deployed MOVE v7, ATTACK v10F, JUMP v11H2, and v14C remain unchanged.
