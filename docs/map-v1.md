# MapleFly Test Map v1

## Purpose

This is the first traversal map for MapleFly. It exists to validate a very small platforming state space before any fruit-fly connectome is attached.

## Authoritative layout

The map follows the corrected sketch:

1. The ground floor is continuous across the map.
2. The left upper platform and right upper platform are physically disconnected.
3. The empty space between the upper platforms is intentionally **jump-only**.
4. There is **no curved terrain** between the upper platforms.
5. One ladder connects the ground floor to the left upper platform.
6. The ladder reaches the ground.
7. The player controlled by the future fly-brain controller starts near the lower center.
8. The lower-center player is **not a portal**.
9. Mushroom-shaped dummy targets are static visual references only in v1.

## Logical coordinate system

Canvas size:

```text
1000 x 600
```

Primary geometry:

| Element | Geometry |
| --- | --- |
| Ground | y = 530 |
| Left upper platform | x = 80..390, y = 210 |
| Right upper platform | x = 610..920, y = 210 |
| Upper gap | x = 390..610 |
| Ladder | centered near x = 185, from upper platform to ground |
| Player spawn | lower center, around x = 480 |
| Dummy targets | upper-left, upper-right, lower-right |

The nominal upper gap is 220 px. The debug player's horizontal speed and jump impulse are tuned so the gap is reachable with a committed running jump but cannot be crossed by walking.

## v1 traversal rules

- Ground and upper platforms are solid from above.
- Falling off an upper platform drops the player to the ground.
- The upper gap has no hidden bridge or collision surface.
- Ladder climbing uses vertical input while the player overlaps the ladder.
- The player can leave the ladder at the top onto the left upper platform.
- Jumping is available while grounded.
- No combat, portal, enemy AI, damage, score, or connectome input exists in this version.

## Debug-only controls

Manual keyboard input exists only to verify traversal geometry before the biological controller is introduced.

```text
A / Left Arrow       move left
D / Right Arrow      move right
W / Up Arrow         climb up
S / Down Arrow       climb down
Space                jump
R                    reset player
```

## Boundary for the next phase

Do not add connectome logic inside the map implementation. The future controller should replace the manual input layer without changing the map contract.
