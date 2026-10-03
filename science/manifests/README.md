# Science manifests

Each new authoritative experiment gets a manifest instead of a new GitHub Actions workflow.

Example:

```json
{
  "schema": "maplefly.science-experiment.v1",
  "id": "example",
  "script": "scripts/science/example.mjs",
  "output_dir": "results/example",
  "artifact_name": "maplefly-example",
  "needs_malecns": true,
  "dependencies": [
    {
      "registry_key": "v15n_candidate",
      "env": "V15N_ARTIFACT_FILE",
      "file_key": "default"
    }
  ],
  "env": {}
}
```

The dispatcher is triggered by `science/active.json`. Updating that file is the automatic start signal; no manual Actions button is required.
