# MapleFly

MapleFly is an experiment that will eventually connect a fruit-fly connectome controller to a deliberately simplified, MapleStory-inspired 2D platform environment.

## Current scope

The repository currently starts with **Test Map v1** only:

- one continuous ground floor
- two disconnected upper platforms
- a jump-only gap between the upper platforms
- one ladder connecting the ground to the left upper platform
- the fly-controlled player starts near the lower center
- three stationary mushroom-shaped dummy targets are placed for spatial reference

No connectome, learning, combat, networking, or real MapleStory client integration is included yet.

## Run

Open `index.html` in a modern desktop browser.

No build step or external dependency is required.

## Debug controls

- `A` / `D` or `←` / `→`: move
- `W` / `S` or `↑` / `↓`: climb ladder
- `Space`: jump
- `R`: reset player

See `docs/map-v1.md` for the map contract.
