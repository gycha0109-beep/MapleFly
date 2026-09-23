# result_v15d — frozen POTION browser deployment closure

## Verdict

**POTION v15 = DEPLOYED**

The exact frozen v15A12 representation and exact frozen v15B3 reward-only Q policy are
now active in the browser runtime.

No connectome synaptic weights were trained or changed. Learning remains in the
external readout/policy over frozen MaleCNS DN activity.

## Scientific lineage

```text
frozen MaleCNS
  alextitonis/fly.ai
  95a3dbcb05241b0a5c07028ca8ad945b23fbbe6e

v15A12 representation
  artifact 10768761312
  sha256:8aa759b04643d618e69aaa647d7251eb237816ee3b84bcc97a0f451d20cbba78
  representation 33fc31f636e1cde215841dd33b0a93b24d4571cdabd32e9a1edc8fa2e696c847

v15B3 reward-only Q policy
  run 35904611372
  artifact 10770299335
  sha256:3f715ef7f4f62e854db02c4e0f05b8662d5dab2a46d1ea0675320bffbe3bc838
  model 47088bcb15ed2cd96f64d67a20169934bd7a866dcd56bacffea70b1f42537a59

v15C independent holdout
  run 35905965237
  artifact 10771129156
  sha256:f60e484dc08203f092d084bf096e29f885ced58624b7717ff815787e8907c343
  PASS
```

v15C frozen-policy holdout:

```text
FULL BA                  93.8%
WAIT recall              97.9%
DRINK recall             89.6%
mean G                   29.688
mean regret               0.313
DN margin               +42.7pp
NEURAL_OFF margin       +43.8pp
INJURY_SENSORY_OFF      +43.8pp
```

## Candidate evidence

Original v15D candidate:

```text
candidate head
  638f299a86110638ba3b4e3a8e707c196680da4d

verification
  run 35908151118
  PASS

Pages
  run 35908150993
  SUCCESS
```

Candidate state:

```text
status = V15D_VALIDATED_CANDIDATE_NOT_DEPLOYED
deploymentAllowed = false
```

## Closure-verifier preparation

The closure verifier was prepared before the final activation.

First preparation head:

```text
b885364aa5c719f1a83fbdaf36b8051de6c9d40a
verify(v15d): prepare final deployment closure

run 35920030966
PASS
```

An initial activation attempt at:

```text
37692d14fc57cd1f62d07d3e3c1fae9a868f645a
```

exposed a verification-infrastructure omission: the artifact-equivalence verifier still
required `deploymentAllowed=false`. Its numerical equivalence values were all zero-error,
but the candidate-only deployment-state assertion caused that run to fail.

The activation was therefore invalidated and the runtime was returned to candidate state.
A subsequent verifier-edit attempt also exposed and fixed a syntax error before final
activation.

Final candidate preparation head:

```text
60c6d422a2dd513f2dadc255803f0f9a209f7552
fix(v15d): repair artifact verifier syntax

candidate verification
  run 35920807398
  PASS
```

Required candidate outputs:

```text
V15D-ARTIFACT-EQUIVALENCE=PASS
  slots=0
  meanErr=0
  scaleErr=0
  waitErr=0
  waitBiasErr=0
  drinkErr=0
  drinkBiasErr=0
  runtimeDN=24
  deployment=candidate

V15D-BROWSER-WIRING=PASS
  history=48
  frameSteps=5
  runtimeDN=24
  features=256
  deployment=candidate

V15D-DEPLOYMENT-CLOSURE=PENDING
  status=V15D_VALIDATED_CANDIDATE_NOT_DEPLOYED
  deploymentAllowed=false

V15D-REAL-INPUT-EQUIVALENCE=PASS
  contexts=16
  frameErr=0
  qWaitErr=0
  qDrinkErr=0
  actionMismatch=0
```

All lower-skill jobs also passed before final activation.

## Final flag-only activation

Canonical deployment commit:

```text
468334a93413b25cb4c4847a86ad01cdbef8a6ca
deploy(v15d): activate frozen reward-only potion policy
```

Compared with the final candidate head:

```text
changed files    1
file             src/brain/fly-skill-v15-potion.js
additions        2
deletions        2

status
  V15D_VALIDATED_CANDIDATE_NOT_DEPLOYED
  -> V15D_DEPLOYED

deploymentAllowed
  false
  -> true
```

No numerical model, representation, sensory, timing, history, reward, or lower-skill
value changed in the activation commit.

## Final verification

Workflow:

```text
Verify v15D Potion Deployment
run 35921293931
head 468334a93413b25cb4c4847a86ad01cdbef8a6ca
conclusion SUCCESS
```

Artifact equivalence:

```text
V15D-ARTIFACT-EQUIVALENCE=PASS
slots=0
meanErr=0
scaleErr=0
waitErr=0
waitBiasErr=0
drinkErr=0
drinkBiasErr=0
runtimeDN=24
deployment=deployed
```

Real MaleCNS equivalence:

```text
V15D-REAL-INPUT-EQUIVALENCE=PASS
contexts=16
frameErr=0
qWaitErr=0
qDrinkErr=0
actionMismatch=0
```

Browser closure:

```text
V15D-BROWSER-WIRING=PASS
history=48
frameSteps=5
runtimeDN=24
features=256
LgLG=prefix
taste=final-frame
deployment=deployed

V15D-DEPLOYMENT-CLOSURE=PASS
status=V15D_DEPLOYED
deploymentAllowed=true
HP-policy-leak=0
potionCue=0
headMotor-decision=0
fullHPDrink=legal
waste-accounting=preserved
```

## Frozen lower-skill regressions

On the exact final activation head:

```text
MOVE v7
  PASS
  training150=100.0%
  minON=100.0%
  maxOFF=50.0%

ATTACK v10F
  PASS
  FULL=84.4%
  whiff=15.6%

JUMP v11H2
  PASS
  FULL=100.0%
  timeout=0.0%
  jumps=1.375
  TARGET=100.0%
  falseJump=0.0%

v14C wiring
  PASS
  move=ungated
  attack=dual-head
  jump=dual-head

v14C deployment smoke
  PASS
  completion=95.8%
  minSeed=87.5%
  clear=100.0%
  left=100.0%
  right=100.0%
  kill=95.8%
  timeout=4.2%
  jumps=1.417
  postJump=0.0%
  preClearAtk=12.5%
  airAction=12.7%
  precision=60.2%
```

## Pages deployment

The exact activation commit was deployed successfully:

```text
Deploy MapleFly to GitHub Pages
run 35921293900
head 468334a93413b25cb4c4847a86ad01cdbef8a6ca
conclusion SUCCESS
```

This satisfies the operational requirement that the deployed Pages source SHA equal the
canonical activation SHA before evidence freeze.

## Runtime policy boundary

POTION decision input does not include:

```text
HP
maxHP
missingHP
impact count
potion count
wastedHealing
correct action
game coordinates
target state
```

The active path is:

```text
injury sensory
  -> corrected LgLG family
  -> frozen MaleCNS
  -> 24 sampled runtime DNs
  -> 48 x 100 ms temporal history
  -> frozen 256-feature representation
  -> frozen reward-only Q_WAIT / Q_DRINK readout
  -> WAIT / DRINK
  -> deployment gate
  -> game POTION actuation
```

HP remains legal only downstream inside the game action implementation to apply healing
and compute wasted healing after the policy has selected DRINK.

## Final state

```text
MOVE v7       DEPLOYED / unchanged
ATTACK v10F   DEPLOYED / unchanged
JUMP v11H2    DEPLOYED / unchanged
v14C          DEPLOYED / unchanged
POTION v15    DEPLOYED

MaleCNS connectome weights
  FROZEN
```

v15D is CLOSED.
