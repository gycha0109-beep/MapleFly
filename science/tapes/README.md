# Tape Pack v1

Tape Pack separates expensive deterministic simulation from downstream analysis.

## Identity

A pack key is SHA-256 over canonical JSON containing at least:

- Tape Pack schema
- pinned MaleCNS commit
- simulator/runtime contract SHA
- controller/policy SHA(s)
- cohort seed manifest
- interruption/randomization seed
- relevant environment contract

If any of these change, the cache key changes.

## Storage

Local CI cache:

```text
.cache/maplefly-tapes/<sha256>.v8.gz
```

The binary payload uses Node `v8.serialize` + gzip so Float64Array and other typed arrays round-trip without JSON expansion.

## Truth separation

A full tape can be projected into two different products:

- neural view: seed + frameIndex/step/DN values only
- evaluator truth: damage/contact/HP/outcome information

Neural-only fitting/calibration jobs should receive only the neural view. Truth is joined only in a frozen evaluator stage.

## Migration rule

Existing historical scripts remain immutable evidence. New experiments should use Tape Pack cache. Old current-chain scripts are migrated only when reused by a new experiment; past authoritative runs are not rewritten.
