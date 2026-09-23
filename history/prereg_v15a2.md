# prereg_v15a2 — corrected LgLG-family propagation acceptance

## Status

**PREREGISTERED BEFORE IMPLEMENTATION / OUTCOME**

v15A failed because the configured exact `LgLG` lookup selected zero neurons.
Metadata audit run `35807115091` found the actual pinned MaleCNS type family
`LgLG1a..LgLG8`.

This experiment tests only whether the corrected family mapping is a
functional MaleCNS sensory interface.

It does not train POTION and does not rerun the 4-class history screen yet.

## Frozen source

~~~text
repository  alextitonis/fly.ai
commit      95a3dbcb05241b0a5c07028ca8ad945b23fbbe6e
~~~

## Corrected sensory mapping

~~~text
mapping
  cellsWithPrefix(meta, "LgLG", side)

expected pinned counts
  L = 331
  R = 338

included types only
  LgLG1a
  LgLG1b
  LgLG2
  LgLG3
  LgLG4
  LgLG5
  LgLG6
  LgLG7
  LgLG8
~~~

No type weighting or subtype selection is allowed.

## Stimulus

Keep the original v4/v5 intended amplitude and pulse:

~~~text
drive     0.7
duration  6 brain steps = 120 ms
~~~

No amplitude sweep.

Ground context remains:

~~~text
SNta_L = 0.05
SNta_R = 0.05
~~~

No taste input.

## Paired design

Same-seed ON/OFF brains:

~~~text
OFF  ground only
ON   ground + corrected LgLG-family pulse
~~~

Seeds:

~~~text
2799000
2799001
2799002
2799003
2799004
2799005
2799006
2799007
~~~

Side:

~~~text
even pair -> L
odd pair  -> R
~~~

Timing:

~~~text
settle       26
baseline     26
live         150
impact start 25
impact pulse 25..30 inclusive
~~~

## Measurements

Per pair:

- LgLG-family fired-count absolute difference during pulse
- LgLG-family voltage maxAbs
- whole-network fired symmetric difference
- whole-network voltage maxAbs
- DN spike mismatch
- DN voltage maxAbs
- 100 ms DN mismatch bins

Structural BFS from corrected LgLG-family union:

- source count
- 1/2/3-hop cumulative unique neurons
- 1/2/3-hop cumulative DN count

## Frozen acceptance gate

Corrected sensory interface PASS requires all:

~~~text
group count L                     == 331
group count R                     == 338
3-hop reachable DN                > 0
every pair pulse input fire diff  > 0
every pair whole-network fire diff > 0
every pair DN spike mismatch      > 0
~~~

DN voltage is reported but does not rescue a DN-spike gate failure.

Reason: the planned v15 history representation is spike-rate based.
If the corrected input reaches only subthreshold DN voltage, a new
representation hypothesis must be preregistered instead of silently changing
the readout.

## Outcome handling

PASS:
- freeze `LgLG*` family mapping as v15 injury sensory interface candidate.
- preregister a new v15A2 injury-history representation screen with unseen seeds.

FAIL:
- do not increase 0.7 drive or pulse duration post-hoc.
- inspect which propagation stage failed and create a new hypothesis.

No outcome from this acceptance test authorizes v15B reward learning directly.
