# v15 injury sensory metadata audit

## Why this audit exists

v15A propagation diagnostic run `35806938566` found:

~~~text
LgLG_L = 0
LgLG_R = 0
~~~

The old MapleFly helper used exact lookup:

~~~text
cells(meta, ["LgLG"], side)
~~~

## Pinned MaleCNS metadata inventory

Audit:

~~~text
run      35807115091
artifact 10727274505
digest   sha256:9b0b3f68ccf3a82c20c0af998fc792ab20a5b2adef3596cdf1c371c0f831dbea
~~~

There is no exact `LgLG` type or superclass.

The pinned metadata contains the following LgLG type family:

| type | total | L | R |
| --- | ---: | ---: | ---: |
| LgLG1a | 136 | 68 | 68 |
| LgLG1b | 134 | 65 | 69 |
| LgLG2 | 130 | 65 | 65 |
| LgLG3 | 162 | 78 | 84 |
| LgLG4 | 43 | 23 | 20 |
| LgLG5 | 13 | 6 | 7 |
| LgLG6 | 16 | 9 | 7 |
| LgLG7 | 21 | 11 | 10 |
| LgLG8 | 14 | 6 | 8 |
| **prefix union** | **669** | **331** | **338** |

## Upstream semantic check

Pinned upstream commit:

~~~text
alextitonis/fly.ai
95a3dbcb05241b0a5c07028ca8ad945b23fbbe6e
~~~

`world/src/senses.ts` describes logical LgLG as leg mechanosensory
load / knock input and uses `load_gain = 0.7`.

However that file injects into the upstream world's simplified `Wiring`
population named `LgLG`; `world/src/wiring.ts` defines that simplified
population separately.

Therefore the old MapleFly assumption that the exported MaleCNS metadata
would contain one exact type named `LgLG` was incorrect.

The least-assumptive correction for the exported MaleCNS is:

~~~text
cellsWithPrefix(meta, "LgLG", side)
~~~

which selects only the explicit LgLG1a..LgLG8 family and no unrelated type.

This correction must be propagation-tested before it is used for v15
injury-history learning.
