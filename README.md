# encoding

## Generate Stats Artifact

Use the canonical CSV to generate the mixed-distribution stats artifact:

```bash
python3 scripts/generate_stats.py \
  --input data/canonical/minimal_canonical_dataset.csv \
  --output data/stats/minimal_stats_artifact.json \
  --generated-at 2026-02-24T00:00:00Z
```

The output contract includes:
- `generated_at`
- `source_dataset`
- `source_record_count`
- `fields.<field>.distribution` (`normal` | `log_normal` | `empirical`)
- `fields.<field>.n`
- `fields.<field>.params`
  - `normal`: `mu`, `sigma`
  - `log_normal`: `mu_log`, `sigma_log`
  - `empirical`: `p05`, `p50`, `p95`