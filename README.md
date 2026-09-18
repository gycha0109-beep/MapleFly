# MapleFly

MapleFly is an experiment that connects a fruit-fly MaleCNS connectome controller
to a deliberately simplified, MapleStory-inspired 2D platform environment.

## Current scope

**Test Map v1 + Brain in a Jar v1**:

- one continuous ground floor
- two disconnected upper platforms
- a jump-only upper gap
- one ground-connected ladder
- three mushroom entities with independent HP
- player ATK 10 / mushroom HP 30
- directional melee attack and KO state
- real MaleCNS browser connectome controller
- MANUAL / FLY CONTROL switch
- live neural telemetry

## Brain source

Brain-in-a-Jar v1 is pinned to:

```text
alextitonis/fly.ai
95a3dbcb05241b0a5c07028ca8ad945b23fbbe6e
166,700 neurons
25,088,107 connections
```

The connectome binaries are fetched from that fixed upstream commit at runtime.
They are not vendored into MapleFly.

## Play

https://gycha0109-beep.github.io/MapleFly/

### Manual controls

- `A` / `D` or `←` / `→`: move
- `W` / `S` or `↑` / `↓`: climb ladder
- `Space`: jump
- `F`: attack
- `R`: reset experiment

### Fly controls

1. Click **초파리 뇌 불러오기 (~58MB)**.
2. Wait for **READY**.
3. Click **FLY CONTROL 시작**.
4. Manual movement/combat input is replaced by connectome output.

## Documentation

- `docs/map-v1.md` — map and combat contract
- `docs/brain-v1.md` — connectome/controller contract
- `history/` — Korean development notes explaining what changed, how, and why
- `THIRD_PARTY_NOTICES.md` — upstream attribution

No claim is made that the fly understands MapleStory. The sensory encoder and
motor decoder are explicit interfaces around a frozen biological connectome.
