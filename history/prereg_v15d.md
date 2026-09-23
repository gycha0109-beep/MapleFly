# prereg_v15d — frozen POTION browser integration and deployment closure

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / DEPLOYMENT**

v15C passed independent frozen-policy holdout and causal controls:

```text
FULL BA                  93.8%
WAIT recall              97.9%
DRINK recall             89.6%
mean G                   29.688
regret                     0.313
DN margin                +42.7pp
NEURAL_OFF margin        +43.8pp
INJURY_SENSORY_OFF       +43.8pp
```

v15D is not a new learning experiment.

It must integrate the exact frozen v15A12 representation and exact frozen v15B3
reward-only Q policy into the browser runtime without reintroducing HP-gated POTION
shortcuts.

## Frozen scientific objects

Representation:

```text
v15A12 artifact 10768761312
digest sha256:8aa759b04643d618e69aaa647d7251eb237816ee3b84bcc97a0f451d20cbba78
FULL48 representation
sha256 33fc31f636e1cde215841dd33b0a93b24d4571cdabd32e9a1edc8fa2e696c847
```

Policy:

```text
v15B3 artifact 10770299335
digest sha256:3f715ef7f4f62e854db02c4e0f05b8662d5dab2a46d1ea0675320bffbe3bc838
model sha256 47088bcb15ed2cd96f64d67a20169934bd7a866dcd56bacffea70b1f42537a59
```

Validation:

```text
v15C run 35905965237
artifact 10771129156
digest sha256:f60e484dc08203f092d084bf096e29f885ced58624b7717ff815787e8907c343
result PASS
```

No weights, bias, selected slots, means, scales, threshold, history length, sensory
drive, or reward economics may change.

## Browser representation contract

The 256 selected temporal slots contain only 24 unique DNs.

Browser worker therefore samples exactly those 24 DN identities every:

```text
5 brain steps = 100 ms
```

and controller keeps exactly:

```text
48 frames = 4.8 s
```

Baseline:

```text
26 brain steps = 0.52 s
ground SNta_L/R 0.05
same baseline calibration phase already used by deployed skills
```

For each sampled DN/frame:

```text
frameFeature = clamp((frameHz - baselineHz)/50, -1,+1)
```

The frozen 256 temporal slots are then gathered from the 48x24 runtime history and
standardized with the exact v15A12 means/scales:

```text
x = clamp((frameFeature - mean)/scale, -5,+5)
```

Policy:

```text
Q_WAIT  = frozen v15B3 WAIT head
Q_DRINK = frozen v15B3 DRINK head
action  = DRINK iff Q_DRINK > Q_WAIT
tie     = WAIT
```

No browser learning.

## Taste / decision timing

Each 4.8 s POTION decision cycle:

```text
frames 0..46   taste OFF
frame 47       LB3 + claw_tpGRN bilateral = 0.8
after frame47  evaluate frozen policy once
then begin next 48-frame cycle
```

Taste timing is policy-owned and independent of:

- HP,
- maxHP,
- missing HP,
- impact count,
- potion count,
- correct action.

## Injury sensory fix

Browser worker currently uses the historically invalid exact lookup:

```text
cells(meta, ["LgLG"], side)
```

v15D must replace it with the scientifically validated corrected family mapping:

```text
cellsWithPrefix(meta, "LgLG", side)
LEFT 331
RIGHT 338
```

No other sensory family changes are allowed.

## Game action semantics

Browser POTION must match the reward experiment's legal action.

Current browser `tryPotion()` rejects use at full HP. v15D must remove only that
HP-full rejection.

POTION is legal whenever:

```text
player not dead
potions remaining > 0
```

At full HP:

```text
healed = 0
wastedHealing = 30
potion count decreases by 1
```

This is required because the learned reward policy was trained with DRINK legal in
state 0.

The game may use HP internally to apply healing and report metrics. HP must not enter
the policy or taste-offer path.

## Old shortcut removal

The deployed runtime must no longer use any of these to decide POTION:

```text
observation.player.potionCue
player.hp < player.maxHp
potionAvailable
headMotor >= drinkHz
old neck/head POTION decoder
```

The old head-motor value may remain telemetry only.

## Candidate-before-deployment rule

Implementation initially embeds the exact frozen POTION state as:

```text
V15D_VALIDATED_CANDIDATE_NOT_DEPLOYED
deploymentAllowed = false
```

The browser may build the 48-frame history and evaluate Q values, but POTION actuation
must remain suppressed while `deploymentAllowed=false`.

Only after every v15D verification job passes may a closure commit change:

```text
status -> V15D_DEPLOYED
deploymentAllowed -> true
```

No numerical model/sensory/history change is permitted in that closure commit.

## D1 — artifact exact equivalence

CI fetches authoritative v15A12 and v15B3 artifacts and compares the browser bundle
against them.

Required exact/tolerance checks:

```text
selected temporal slots mismatch    0
means max abs error                 <=1e-15
scales max abs error                <=1e-15
WAIT weights max abs error          <=1e-15
WAIT bias abs error                 <=1e-15
DRINK weights max abs error         <=1e-15
DRINK bias abs error                <=1e-15
historyFrames                       48
featureCount                        256
unique runtime DNs                  24
```

## D2 — real MaleCNS browser/reference equivalence

Fresh deployment-smoke seeds:

```text
2945000
2945100
```

For each:

```text
2 replicates x states 0/1/2/3 = 8
total 16 contexts
```

Run the corrected LgLG -> frozen MaleCNS path and feed the same 24-DN 100 ms frames to:

1. independent reference evaluator built from authoritative artifacts,
2. browser-loaded POTION module.

Required:

```text
Q_WAIT max abs error      <=1e-12
Q_DRINK max abs error     <=1e-12
action mismatch           = 0
frame/history mismatch    = 0
```

This is implementation equivalence, not a new scientific performance gate.

## D3 — browser static wiring

Required:

- page loads POTION v15 module before controller,
- worker corrected LgLG prefix mapping,
- worker potion-baseline sampler = 26 steps,
- worker potion-frame sampler = 5 steps,
- runtime DN count = 24,
- controller history = 48 frames,
- taste only on final frame,
- no `potionCue`/HP-based policy gate,
- no headMotor POTION decision,
- `tryPotion()` permits full-HP waste,
- candidate deployment flag gates only final actuation,
- MOVE remains ungated,
- v14C still gates JUMP then ATTACK in existing order.

## D4 — frozen lower-level regressions

Required on integration head:

```text
MOVE v7 deploy check
ATTACK v10F browser equivalence
JUMP v11H2 browser deployment smoke
v14C browser wiring
v14C deployment smoke
```

No lower-level skill may be retrained or edited for v15D.

## Deployment decision

Only D1-D4 all PASS authorizes closure.

After closure flag-only deployment, run final static closure verification.

PASS:

```text
POTION v15 = DEPLOYED
MOVE v7 = unchanged
ATTACK v10F = unchanged
JUMP v11H2 = unchanged
v14C = unchanged
```

FAIL:

```text
POTION remains NOT DEPLOYED
```

## Forbidden changes

Do not:

- retrain v15B3,
- change policy weights/bias,
- change representation slots/means/scales,
- shorten/extend 48-frame history,
- change 100 ms frame,
- make taste depend on HP or potion count,
- gate DRINK by HP,
- use impact count as policy input,
- use game coordinates/target state in POTION policy,
- change MOVE/ATTACK/JUMP/v14C,
- lower any prior scientific gate.

Existing MOVE v7, ATTACK v10F, JUMP v11H2, and v14C scientific evidence remains frozen.
