# Tape Pack v1

Tape Pack separates expensive deterministic simulation from downstream analysis.

## Identity

A pack key is SHA-256 over canonical JSON containing:

- simulation contract ID
- pinned MaleCNS commit
- simulation/runtime source blob SHAs
- deployed lower-skill contract
- cohort seed manifest
- interruption/randomization seed

Current shared simulation contract:

```text
science/simulations/v15n-deterministic-v1.json
```

Cohorts are defined separately under `science/cohorts/`.

To verify a cohort identity:

```bash
node scripts/ci/tape-pack-identity.mjs \
  science/simulations/v15n-deterministic-v1.json \
  science/cohorts/neural-only-predictive-surprise32.json \
  train
```

If a runtime source blob differs, identity validation fails instead of silently reusing stale simulation data.

## Storage

Local CI cache:

```text
.cache/maplefly-tapes/<sha256>.v8.gz
```

The binary payload uses Node `v8.serialize` + gzip so Float64Array and other typed arrays round-trip without JSON expansion.

The reusable science bootstrap restores a rolling `.cache/maplefly-tapes` cache. New science scripts should wrap deterministic `collectTapes` work with `loadOrBuildTapePack()`.

## Truth separation

A full tape can be projected into two different products:

- neural view: seed + frameIndex/step/DN values only
- evaluator truth: damage/contact/HP/outcome information

Neural-only fitting/calibration jobs should receive only the neural view. Truth is joined only in a frozen evaluator stage.

## Migration rule

Historical scripts/runs remain immutable evidence. New experiments use Tape Pack cache. A new simulation-semantic change requires a new `science/simulations/*.json` contract rather than silently invalidating an existing cache.
