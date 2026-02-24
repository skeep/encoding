# encoding

## Generate Stats Artifact

Use the canonical CSV to generate the stats artifact JSON:

```bash
python3 scripts/generate_stats.py \
  --input data/canonical/minimal_canonical_dataset_v1.csv \
  --output data/stats/minimal_stats_artifact_v1.json \
  --stats-version v1_2026_02_seed \
  --preprocessing-policy-version dataset_policy_v1 \
  --generated-at 2026-02-24T00:00:00Z
```

The output contract includes:
- `stats_version`
- `preprocessing_policy_version`
- `generated_at`
- `source_dataset`
- `source_record_count`
- `fields.<field>.mu`
- `fields.<field>.sigma`
- `fields.<field>.n`

## Generate Stats Artifact v2 (Mixed Distributions)

Use the v2 canonical CSV to generate the mixed-distribution stats artifact:

```bash
python3 scripts/generate_stats_v2.py \
  --input data/canonical/minimal_canonical_dataset_v2.csv \
  --output data/stats/minimal_stats_artifact_v2.json \
  --stats-version v2_2026_02_seed \
  --preprocessing-policy-version dataset_policy_v2 \
  --generated-at 2026-02-24T00:00:00Z
```

v2 output contract includes per-field distribution metadata:
- `fields.<field>.distribution` (`normal` | `log_normal` | `empirical`)
- `fields.<field>.n`
- `fields.<field>.params`
  - `normal`: `mu`, `sigma`
  - `log_normal`: `mu_log`, `sigma_log`
  - `empirical`: `p05`, `p50`, `p95`

## Migration Notes (v1 -> v2)

- v1 remains available for backward compatibility with existing consumers.
- v2 introduces a new artifact schema with explicit distribution families.
- Use `dataset_policy_v2` and `generate_stats_v2.py` for all new model calibration work.