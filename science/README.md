# MapleFly science execution architecture

This directory is the control plane for scientific runs.

## Active Actions responsibilities

Only five workflow definitions remain active:

1. `science.yml` — automatic authoritative-science dispatcher.
2. `_science-runner.yml` — reusable heavy science executor.
3. `deployment-verify.yml` — deployed-stack verification, grouped into static and runtime responsibilities.
4. `pages.yml` — browser deployment only when web/runtime files change.
5. `ci-workflow-policy.yml` — architecture guard.

Historical experiment-specific workflows are stored under `history/workflows/legacy/` and cannot be reactivated on `main`.

## Science responsibilities

- `artifacts/frozen.json`: immutable logical-name -> GitHub Actions artifact provenance.
- `manifests/`: experiment definitions. Scientific parameters belong here or in preregistration, not in workflow YAML.
- `tapes/`: Tape Pack contract and migration notes.
- `legacy-workflows.json`: archive inventory and anti-reactivation policy.

## Target execution flow

```text
preregistration
  -> science/active.json
  -> reusable science runner
  -> simulation/tape cache
  -> analysis
  -> evaluator-only truth
  -> evidence artifact
  -> result / receipt
```

Updating `science/active.json` is the automatic start signal. No manual Actions button is required.
