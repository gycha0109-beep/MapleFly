# result_v15a3 — corrected injury-history DN representation screen

## Status

**FAIL — exact 0/1/2/3 impact-count decoding did not meet the frozen gate**

Preregistration:

~~~text
history/prereg_v15a3.md
3fca025a106799c9a364cbad7516ce834d9dde6a
~~~

Run:

~~~text
35807433646
head 977e1774fc524d0a517c788ee61bf31159503aa4

artifact 10728068829
sha256:d32c84e061efd6df81044388a6c5522168c83d8d8eb5facfc5bab65f7fb2aefe
~~~

Corrected sensory mapping was fixed at:

~~~text
LgLG* prefix family
L 331 / R 338
drive 0.7
pulse 120 ms
~~~

## Frozen gate

~~~text
FULL balanced accuracy >=65%
every class recall     >=50%
FULL-DN_SHUFFLED       >=20pp
~~~

## Result

| Representation | FULL | min recall | DN_SHUFFLED | margin | LABEL_SHUFFLED | Gate |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| CURRENT | 26.4% | 11.1% | 25.0% | +1.4pp | 23.6% | FAIL |
| CONCAT12 | 25.0% | 16.7% | 20.8% | +4.2pp | 33.3% | FAIL |
| CONCAT24 | 37.5% | 22.2% | 22.2% | +15.3pp | 31.9% | FAIL |
| CONCAT48 | **55.6%** | **27.8%** | 29.2% | **+26.4pp** | 30.6% | FAIL |

Selected representation:

~~~text
NONE
~~~

## Interpretation

Corrected LgLG sensory input clearly changed the result relative to invalid v15A:

~~~text
invalid exact-name CONCAT48 FULL 25.0%
corrected LgLG* CONCAT48 FULL       55.6%
~~~

CONCAT48 also exceeded the causal identity margin criterion:

~~~text
FULL - DN_SHUFFLED = +26.4pp
~~~

Therefore the corrected MaleCNS DN history contains nontrivial
impact-history information.

However the preregistered scientific question was stronger:
**four exact ordinal classes 0/1/2/3 must all be decoded robustly.**
That criterion failed because overall balanced accuracy and minimum class
recall were below gate.

No threshold, history length, feature count, or gate is changed post-hoc.

## Next hypothesis

POTION policy does not need an explicit supervised 4-class impact counter.
What matters is whether raw DN history distinguishes:

1. no/recent impact state from injured state, and
2. lighter from heavier recent impact burden.

A new preregistered pairwise separability screen on unseen seeds can test that
without using the diagnostic classifier itself as the runtime policy.

v15B remains blocked until that new representation gate passes.
