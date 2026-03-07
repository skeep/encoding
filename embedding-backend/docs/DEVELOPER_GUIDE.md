# Developer Guide

This project provides a deterministic, taxonomy-driven confidence scoring engine for extracted loan application JSON.

## High-Level Architecture

- `app/api/server.py`: FastAPI entrypoints (`/health`, `/supported-fields`, `/score`)
- `app/core/scoring_service.py`: multi-field orchestration and application-level aggregation
- `app/core/scoring_engine.py`: single-field pipeline execution
- `app/core/validators/*`: format, statistical, and cross-field validation layers
- `app/core/registry.py`: rule/scorer/aggregator registries (IDs -> Python functions)
- `docs/field_taxonomy/*.yaml`: per-field scoring contract
- `config/field_taxonomy_index.yaml`: supported field registry (field ID -> taxonomy file)
- `data/stats/minimal_stats_artifact.json`: statistical params used by statistical validator

## Single Field Pipeline

`score_field(...)` executes these stages in order:

1. **Extract**
   - Find value using taxonomy `source_paths`.
2. **Preprocess**
   - Trim, remove separators, cast.
3. **Format Validation**
   - Type checks, bounds checks, custom format rule IDs.
4. **Statistical Validation**
   - Distribution-specific plausibility scoring (`log_normal` / `normal`) using stats artifact.
5. **Cross-Field Validation**
   - Rule IDs evaluated with additional `context`.
6. **Aggregate Components**
   - Weighted mean of available components.
7. **Hard-Fail Enforcement**
   - Condition IDs can force field failure.

All scores are clamped to `[0,1]`.

## Registry-Driven Extensibility

Taxonomy YAML references IDs, not function names directly. The engine resolves IDs through registries in `app/core/registry.py`.

### Registry categories

- `CUSTOM_FORMAT_RULES`
- `SCORERS`
- `CROSS_FIELD_RULES`
- `AGGREGATORS`
- `HARD_FAIL_CONDITIONS`

When onboarding a new field:

1. Add field taxonomy YAML.
2. Add field path in `config/field_taxonomy_index.yaml`.
3. Reuse existing IDs if possible.
4. Add new Python functions + register only when needed.

## `context` in API Requests

`context` is used by cross-field rules that need values outside the current field.

Example: `affordability_income_vs_loan` uses:
- `amount_applied_amount`
- `applied_term`

If context is missing required inputs, the rule returns `not_applicable` and is excluded from cross-field averaging.

## Fallback Policies (Statistical Validator)

When statistical parameters are missing for a field:

- `neutral_1`: statistical score becomes `1.0`
- `skip_component`: statistical component excluded from aggregation
- `fail_0`: statistical score becomes `0.0` with error flags

## API Usage

- Start locally:
  - `uvicorn app.api.server:app --reload --port 8000`
- Or Docker:
  - `docker compose up --build`

### Core endpoint

- `POST /score`
  - `document`: extracted JSON payload
  - `fields_to_score` (optional): defaults to all supported fields
  - `ocr_confidence_map` (optional)
  - `context` (optional)

## Test Suite

Run all tests:

```bash
python3 -m unittest -v tests/test_generate_stats.py tests/test_scoring_engine_claimed_income.py tests/test_scoring_service.py tests/test_api_server.py
```

## Coding Conventions

- Keep pipeline deterministic (no random/LLM behavior in scoring).
- Keep new field logic declarative in taxonomy where possible.
- Use registry IDs for extension points.
- Prefer adding tests whenever introducing new scorer/rule/condition IDs.
