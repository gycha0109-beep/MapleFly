# MapleFly

MapleFly is an experiment that connects a fruit-fly MaleCNS connectome controller
to a deliberately simplified, MapleStory-inspired 2D environment.

## Current scope

**Experiment v2 — flat sensory A/B baseline**

- upper platforms and ladder are temporarily removed from the active arena
- one mushroom target on flat ground
- killed targets respawn after 700 ms at deterministic nearby positions
- target alternates left/right by paired trial
- real MaleCNS browser connectome controller
- SENSORY ON vs SENSORY OFF paired comparison
- same pseudo-random seed reused inside each ON/OFF pair
- alternating ON/OFF order to reduce order bias
- automatic trial macro
- automatic metrics logger
- CSV / JSON export
- latest run persisted in browser localStorage

## Brain source

```text
alextitonis/fly.ai
95a3dbcb05241b0a5c07028ca8ad945b23fbbe6e
166,700 neurons
25,088,107 connections
```

The connectome binaries are fetched from that fixed upstream commit at runtime.

## Play

https://gycha0109-beep.github.io/MapleFly/

## Experiment v2

Default quick run:

```text
60 seconds × 3 pairs
= 6 trials total
```

Long baseline preset:

```text
300 seconds × 5 pairs
= 10 trials total
≈ 50 minutes
```

Each pair uses the same brain noise seed for SENSORY ON and OFF.
Target side and condition order alternate between pairs.

Logged metrics include movement toward target, minimum distance, attack/hit/kill,
jump count, hit rate, and brain runtime telemetry.

## Documentation

- `docs/brain-v1.md` — connectome/controller contract
- `history/development_v1.md` — v1 implementation history
- `history/result_v1.md` — v1 observed result
- `history/development_v2.md` — v2 A/B macro/logger design
- `THIRD_PARTY_NOTICES.md` — upstream attribution

No claim is made that the fly understands MapleStory.
