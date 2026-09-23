# result_v15a2 — corrected LgLG-family propagation

## Status

**PASS — corrected LgLG family is a functional MaleCNS sensory interface**

Preregistration:

~~~text
history/prereg_v15a2.md
df7e47271e4d9ca96786f55eb5d3995d25350325
~~~

Authoritative run:

~~~text
run      35807276548
head     5fd654b972163162bffc4162a92bb6e4e4702268
artifact 10728048281
digest   sha256:fc6a4bf70902c8bdcaa3d62dd7c09ac1b2eee703a4bf8996a94384df948b4467
~~~

## Mapping

~~~text
cellsWithPrefix(meta, "LgLG", side)

L 331
R 338
~~~

These counts exactly matched the preregistered pinned metadata contract.

## Frozen gate result

~~~text
group count L                       331 == 331 PASS
group count R                       338 == 338 PASS
3-hop reachable DN                 1316 > 0   PASS
every pair pulse input fire diff   > 0       PASS
every pair whole-network fire diff > 0       PASS
every pair DN spike mismatch       > 0       PASS
~~~

Minimum across eight unseen paired seeds:

~~~text
input fired difference   1011
whole-network fire diff  409245
DN spike mismatch        4213
~~~

All 1,316 descending neurons were structurally reachable within three hops
from the corrected LgLG-family union.

Per-pair DN spike mismatch ranged from 4,213 to 4,558.

## Interpretation

The previous exact-name interface was the problem.

~~~text
old
  cells(meta, ["LgLG"], side)
  -> 0 neurons
  -> no neural perturbation

corrected
  cellsWithPrefix(meta, "LgLG", side)
  -> 331 / 338 neurons
  -> robust whole-network and DN perturbation
~~~

This PASS does not show that impact count is decodable or that POTION can be
learned. It only authorizes a new injury-history representation screen using
the corrected sensory mapping.

Amplitude 0.7 and pulse 120 ms were not tuned after outcome.
