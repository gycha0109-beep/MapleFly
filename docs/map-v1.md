# MapleFly Test Map v1

## Purpose

This is the first traversal and combat-baseline map for MapleFly. It keeps the environment deliberately small before a fruit-fly connectome controller is attached.

## Authoritative layout

1. The ground floor is continuous across the map.
2. The left upper platform and right upper platform are physically disconnected.
3. The empty space between the upper platforms is intentionally **jump-only**.
4. There is **no curved terrain** between the upper platforms.
5. One ladder connects the ground floor to the left upper platform.
6. The ladder reaches the ground.
7. The player controlled by the future fly-brain controller starts near the lower center.
8. The lower-center player is **not a portal**.
9. Three mushroom entities are placed at upper-left, upper-right, and lower-right positions.

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
| Mushroom M-01 | upper-left |
| Mushroom M-02 | upper-right |
| Mushroom M-03 | lower-right |

The nominal upper gap is 220 px. The debug player's horizontal speed and jump impulse are tuned so the gap is reachable with a committed running jump but cannot be crossed by walking.

## Traversal rules

- Ground and upper platforms are solid from above.
- Falling off an upper platform drops the player to the ground.
- The upper gap has no hidden bridge or collision surface.
- Ladder climbing uses vertical input while the player overlaps the ladder.
- The player can enter the ladder from both the ground and the left upper platform.
- Jumping is available while grounded.

## Combat baseline

Combat is intentionally deterministic in v1:

```text
Player attack damage: 10
Player attack range: 76 px
Attack cooldown: 0.32 s

M-01 HP: 30
M-02 HP: 30
M-03 HP: 30
```

Each mushroom owns its own HP state. One hit damages only mushrooms whose hitbox overlaps the directional player attack hitbox.

- HP bars are rendered above living mushrooms.
- A successful hit shows floating damage text.
- HP reaching 0 marks that mushroom as KO.
- Player HUD tracks successful hits and kills.
- Mushrooms are stationary and do not attack yet.
- `R` restores player position, counters, and every mushroom to full HP.

## Debug-only controls

Manual keyboard input exists only to verify the environment before the biological controller is introduced.

```text
A / Left Arrow       move left
D / Right Arrow      move right
W / Up Arrow         climb up
S / Down Arrow       climb down
Space                jump
F                    attack
R                    reset experiment
```

## Controller boundary

Do not put connectome-specific logic into map geometry or monster state. The future controller should replace the manual input layer while preserving the same movement and combat actions.
