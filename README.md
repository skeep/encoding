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

## Score Claimed Income Field

Run a deterministic, taxonomy-driven score for the `claimed_income` field:

```python
from app.core.scoring_engine import score_field

raw_json = [
  {
    "AL/2024/00381939|936770": {
      "current_employment": {
        "1838704": {"claimed_income": "58000.000000"}
      }
    }
  }
]

result = score_field(
    raw_json=raw_json,
    taxonomy_path="docs/field_taxonomy/claimed_income.yaml",
    stats_path="data/stats/minimal_stats_artifact.json",
    ocr_confidence_map={"claimed_income": 0.93},
    context={"amount_applied_amount": 890400.0, "applied_term": 60},
)
print(result)
```

Output contains:
- `field_id`
- `raw_value`, `normalized_value`
- `field_score`, `status`
- `component_scores` (`ocr`, `format`, `statistical`, `cross_field`)
- `rule_outputs` (cross-field rule results)

## Add Next Field Taxonomy

To onboard another field without changing pipeline orchestration:
1. Add a new taxonomy YAML under `docs/field_taxonomy/`.
2. Reuse existing registry IDs where possible.
3. If new behavior is needed, register new IDs in `app/core/registry.py`:
   - custom format rules
   - statistical scorers
   - cross-field rules
   - hard-fail conditions / aggregators

## Run API Server (n8n integration)

Start the FastAPI service:

```bash
uvicorn app.api.server:app --reload --port 8000
```

Or run with Docker Compose:

```bash
docker compose up --build
```

Available endpoints:
- `GET /health`
- `GET /supported-fields`
- `POST /score`

Example request:

```bash
curl -X POST "http://127.0.0.1:8000/score" \
  -H "Content-Type: application/json" \
  -d '{
    "document": [
      {
        "AL/2024/00381939|936770": {
          "current_employment": {
            "1838704": {
              "claimed_income": "58000.000000"
            }
          }
        }
      }
    ],
    "fields_to_score": ["claimed_income"],
    "ocr_confidence_map": {"claimed_income": 0.93},
    "context": {"amount_applied_amount": 890400.0, "applied_term": 60}
  }'
```

Extension flow:
1. Add taxonomy file under `docs/field_taxonomy/`.
2. Add field path to `config/field_taxonomy_index.yaml`.
3. Reuse/add registry IDs in `app/core/registry.py` only when new behavior is needed.

## Developer Docs

For implementation details, extension points, and scoring flow:
- `docs/DEVELOPER_GUIDE.md`