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