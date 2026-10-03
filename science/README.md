# MapleFly science execution architecture

This directory is the control plane for scientific runs.

## Responsibilities

- `artifacts/frozen.json`: immutable logical-name -> GitHub Actions artifact provenance.
- `manifests/`: experiment definitions. Scientific parameters belong here or in preregistration, not in workflow YAML.
- `tapes/`: Tape Pack contract and migration notes.
- `legacy-workflows.json`: frozen allowlist for old experiment-specific Actions workflows.

## Target execution flow

```text
preregistration
  -> science manifest
  -> reusable science runner
  -> simulation/tape cache
  -> analysis
  -> evaluator-only truth
  -> evidence artifact
  -> result / receipt
```

New experiment-specific workflow files are prohibited. New science work should use the reusable runner.

The existing historical workflows remain valid evidence/provenance and are migrated incrementally rather than rewritten in place.
