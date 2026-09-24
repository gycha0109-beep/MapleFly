# result_v15g — sequential reward-only POTION economy

## Verdict

```text
V15G_SEQUENTIAL_POTION_ECONOMY_FAIL
```

The preregistered learner preserved survival but did not learn potion economy.

The failure is scientific, not CI infrastructure: the evaluator completed, wrote evidence, and exited 1
because three preregistered gates failed.

No deployed v15D file was changed.

---

## Authoritative evidence

```text
preregistration
  2a4c80560fa772dcf0caa974443912bac71476cc

implementation
  e299ceb50397cd76457b08967c3e9ee64c7d596f

workflow head
  a3fd2a04b64605deb27e10bdeae23c5024de25e0

run
  35969268691

GitHub conclusion
  FAILURE
  expected because preregistered scientific FAIL exits 1

artifact
  10796405663

digest
  sha256:c27d7a42ef2ac9fad1cf9c687b4d55ddf33a019c49af0f185ff138a76693b99f

theta sha256
  491d7f3a2d58e05e30158e801bce1555fc3712801f35dd949c394c168fe0ff14
```

Frozen neural core:

```text
v15E2 artifact
  10793265453

representation
  244464c8b5e9c7f5871f35cb3acc4ac1e2e0c9b61860c1dd3c267de79d4758db

model
  18be00b46303f46d62f8f63f26ca1a280b66f50f0004be6f469c637123077c96
```

---

## Learned policy

Only the preregistered five scalars were trained:

```text
theta0  +0.6813998919
theta1  +0.0288821240
theta2  +0.1920920771
theta3  +0.1013285402
theta4  +0.3461619791
```

All four self-action-history coefficients ended positive.

The deterministic score therefore did not learn a refractory/economy effect after recent DRINK actions.

---

## Fresh EVAL

```text
episodes
  24

survival
  100%
  PASS

minimum base-seed survival
  100%
  PASS

mean potion uses
  9.667 / 10

mean excess uses vs exact survivor oracle
  3.792
  FAIL (required <= 1.5)

wasted healing / DRINK
  4.095
  PASS

mean utility U
  20.0
```

Per base seed:

```text
3261000
  survival 100%
  mean uses 10.0
  mean U 15

3271000
  survival 100%
  mean uses 9.0
  mean U 30

3281000
  survival 100%
  mean uses 10.0
  mean U 15
```

---

## Causal controls

```text
FULL mean U
  20

HISTORY_OFF mean U
  20

FULL - HISTORY_OFF
  0
  FAIL (required >= +10)

NEURAL_OFF mean U
  15

FULL - NEURAL_OFF
  +5
  FAIL (required >= +20)
```

The trained four-action memory made no measurable utility contribution on EVAL.

The frozen neural margin retained a small contribution, but far below the preregistered causal gate.

---

## Lower-skill tape validity

Every unchanged v16B behavior gate passed:

```text
episodes with >=3 kills
  95.83%

encounter obstacle clear
  96.96%

encounter target kill
  91.30%

LEFT target kill
  92.86%

RIGHT target kill
  89.83%

attack precision
  62.06%

airborne attack action
  13.45%

post-clear jump encounter
  0.87%

pre-clear attack encounter
  3.48%
```

Therefore this is not classified as an invalid ecology/lower-skill run.

---

## Gate audit

PASS:

- tape validity;
- survival rate;
- minimum base-seed survival;
- wasted healing / DRINK.

FAIL:

- mean excess uses;
- HISTORY_OFF causal contribution;
- NEURAL_OFF causal contribution.

---

## Interpretation

Supported:

> Adding only the previous four POTION actions to the frozen v15E2 neural margin, and training five
> scalar parameters with the preregistered episodic REINFORCE objective, did not solve the continuous
> potion-economy problem.

The learned policy still drank at almost every opportunity.

This result does **not** justify changing the v15G learning rate, epochs, reward, thresholds, or seed set
after seeing EVAL. v15G is frozen as a FAIL.

The result also does not prove that all policies over the same five-dimensional runtime information are
incapable. A separate preregistered feasibility/localization audit is required before changing the
runtime representation again.

---

## Next

```text
V15G_D1_POLICY_INFORMATION_FEASIBILITY_AUDIT_AUTHORIZED
```

Fresh interactive validation remains BLOCKED.

Deployment remains BLOCKED.

v16C 180-second endurance/browser parity remains BLOCKED.

v15G is CLOSED as a scientific FAIL.
