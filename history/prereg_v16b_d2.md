# prereg_v16b_d2  persistent-state POTION diagnostic

Question: with frozen v15D and exactly repeated sensory cycles, does preserving MaleCNS state and the original baseline across multiple 4.8-second cycles push POTION toward WAIT compared with resetting brain/baseline before every cycle?

No learning or deployed-policy change.

Frozen:
MaleCNS 95a3dbcb05241b0a5c07028ca8ad945b23fbbe6e
representation 33fc31f636e1cde215841dd33b0a93b24d4571cdabd32e9a1edc8fa2e696c847
policy 47088bcb15ed2cd96f64d67a20169934bd7a866dcd56bacffea70b1f42537a59
D1 closure edbfcecae2d0875bb8aefa9f0dfd698c4c62be44

Fresh seeds: 3211000,3211100,3211200. Replicates=1.
Injury counts=2,3. Both are original v15 support and reward-optimal DRINK.

Contexts:
CLEAN
TARGET_OBSTACLE_STATIC
FULL_DYNAMIC_VISUAL
All sensory equations/gains exactly match D1.

Each sequence has 5 cycles. Each cycle=48 frames x 5 steps = 4.8s. Identical relative event schedule/side is reused across cycles. Total persistent duration=24s.

RESET_EACH_CYCLE:
fresh MaleCNS with same seed each cycle; settle26; baseline26; one cycle; discard.

PERSISTENT:
one MaleCNS; settle26/baseline26 once; then 5 cycles with MaleCNS state and baseline preserved. POTION history clears only through deployed finishCycle after each decision. No re-baselining.

Metrics per context/mode/cycle:
DRINK rate, Q_WAIT min/mean/max, mean Q_DRINK, Q margin.
Paired persistent-reset Q_WAIT delta and action mismatch.
Late aggregate=cycles2..5.

Validity:
RESET_EACH_CYCLE overall DRINK rate must be >=60% in every context, else V16B_D2_RESET_CONTROL_FAILURE.

For each context:
carryoverDrop = RESET late DRINK rate - PERSISTENT late DRINK rate.
If carryoverDrop >=20 percentage points, PERSISTENT_STATE_INTERFERENCE=true.

Classification:
- CLEAN interference and no visual-context interference: V16B_D2_INTRINSIC_STATE_CARRYOVER
- CLEAN false and any visual context true: V16B_D2_VISUAL_STATE_INTERACTION
- CLEAN true and any visual context true: V16B_D2_INTRINSIC_PLUS_VISUAL_STATE_INTERACTION
- none: V16B_D2_PERSISTENT_STATE_NOT_SUFFICIENT

Q shifts are diagnostic only.

Stop rule: do not alter seeds, injury counts, cycles, sensory equations/gains, baseline/reset rule, 20pp gate, or frozen v15D after result. D2 does not change v16B FAIL.
