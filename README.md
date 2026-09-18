# MapleFly

MapleFly is an experiment that will eventually connect a fruit-fly connectome controller to a deliberately simplified, MapleStory-inspired 2D platform environment.

## Current scope

**Test Map v1** now includes traversal plus a minimal deterministic combat loop:

- one continuous ground floor
- two disconnected upper platforms
- a jump-only gap between the upper platforms
- one ladder connecting the ground to the left upper platform
- the fly-controlled player starts near the lower center
- three stationary mushroom entities
- individual mushroom HP (30 each)
- player attack power (10)
- directional melee attack, hit feedback, KO state, hit/kill counters

No connectome, learning, monster AI, player damage, networking, or real MapleStory client integration is included yet.

## Play

GitHub Pages:

https://gycha0109-beep.github.io/MapleFly/

## Debug controls

- `A` / `D` or `←` / `→`: move
- `W` / `S` or `↑` / `↓`: climb ladder
- `Space`: jump
- `F`: attack
- `R`: reset the full experiment

See `docs/map-v1.md` for the current environment contract.
