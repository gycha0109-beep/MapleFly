# result_v16b_d1  POTION failure localization

## Verdict

V16B_D1_VISUAL_INTERFERENCE

Authoritative evidence:
- prereg: 08c53c3a9c53eb0ab58e8c9b918048724d664f39
- implementation: dd3e71a57a8d784fb081b1b180b7fe14e8310e6b
- workflow head: df85cc6abbd569b45d283adea6d95a3585259ae3
- run: 35947913923
- artifact: 10786634987
- digest: sha256:e2e57ee4f7606f751ba69fb0f96cd486e6a5df74c527eb1da05a14093d5c8ba0

## CLEAN replication

- balanced accuracy: 100.0%
- WAIT recall: 100.0%
- DRINK recall: 100.0%
- high-load (count 4..6) DRINK rate: 100.0%

Therefore CLEAN replication passed and INJURY_LOAD_OOD=false.

## Visual contexts

- TARGET_STATIC: BA 95.8%, DRINK recall 91.7%, interference=false
- OBSTACLE_STATIC: BA 95.8%, DRINK recall 100.0%, interference=false
- TARGET_OBSTACLE_STATIC: BA 87.5%, DRINK recall 75.0%, interference=true
- FULL_DYNAMIC_VISUAL: BA 95.8%, DRINK recall 91.7%, interference=false

The first preregistered interference context is TARGET_OBSTACLE_STATIC.

## Interpretation

The frozen v15D policy remains correct in clean and high-load conditions. A simultaneous
persistent target+obstacle visual context reduces DRINK recall enough to cross the frozen
interference gate.

This does not by itself explain the much stronger 4/84 DRINK bias in v16B. The dynamic visual
proxy did not cross the interference threshold. Persistent MaleCNS state / baseline carryover
therefore remains an unresolved hypothesis.

No v15D weight, threshold, sensory gain, history window, seed, or gate was changed.

## Next

V16B_D2_PERSISTENT_STATE_DIAGNOSTIC_AUTHORIZED

D1 is CLOSED.
