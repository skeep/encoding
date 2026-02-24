# Dataset Policy v1

> Status: Superseded by `dataset_policy_v2` for mixed-distribution profiling (`normal` + `log_normal`).
> Keep v1 only for backward compatibility with `minimal_stats_artifact_v1.json`.

## Purpose

This policy defines how to build a canonical dataset used to generate statistical plausibility parameters (`mu`, `sigma`) for the confidence scoring engine.

The output of this policy is:
- Canonical dataset snapshot (tabular)
- Stats artifact JSON (versioned)

## Scope

This v1 policy supports minimal univariate stats for:
- `claimed_income`
- `cash_price`
- `amount_applied_amount`

These parameters feed Layer 1 statistical plausibility scoring.

## Canonical Schema (v1)

### Required fields

- `application_id` (string): unique application key
- `claimed_income` (float): monthly claimed income, same currency basis
- `cash_price` (float): collateral cash price
- `amount_applied_amount` (float): requested/applied amount

### Optional context fields (reserved for future segmented stats)

- `employment_type` (string)
- `product_type` (string)
- `region` (string)
- `application_date` (date, ISO-8601)

## Eligibility Rules

1. Include only records that meet business-defined eligibility for baseline portfolio profiling (recommended: approved/booked records).
2. Use one row per `application_id`.
3. If duplicates exist for the same `application_id`, keep the latest valid snapshot by source extract timestamp.
4. Time window must be explicitly documented in stats metadata.

## Extraction and Normalization Rules

1. Map raw nested JSON to canonical field names deterministically.
2. Parse numeric strings into floats (example: `"58000.000000"` -> `58000.0`).
3. Reject non-numeric tokens (`""`, `"N/A"`, `"null"`) for required numeric fields.
4. Use a single currency basis for all numeric monetary fields before profiling.
5. Trim whitespace from string identifiers.
6. Preserve source lineage columns outside the minimal scoring schema when available.

## Data Quality Rules

Required numeric field constraints for stats profiling:
- `claimed_income > 0`
- `cash_price > 0`
- `amount_applied_amount > 0`

Row handling:
- If any required numeric field is missing or invalid, drop the row from stats profiling and count it in rejection metrics.

## Outlier Policy (v1)

For production stats, use winsorization at configured percentiles before computing distribution parameters.

For minimal seed dataset in this repository:
- No winsorization is applied.
- Purpose is deterministic artifact bootstrapping and contract validation only.

## Stats Generation Policy

For each profiled field:
- `mu`: arithmetic mean
- `sigma`: sample standard deviation (ddof = 1)
- `n`: count of valid rows used for that field

Constraints:
- Require `n >= 3` to produce stable non-zero `sigma`.
- If `sigma <= 0`, mark the field invalid for statistical plausibility scoring.

## Versioning Policy

Every generated stats artifact must include:
- `stats_version` (example: `v1_2026_02`)
- `preprocessing_policy_version` (example: `dataset_policy_v1`)
- `generated_at` (UTC timestamp)
- optional provenance fields (`source_window_start`, `source_window_end`, `source_record_count`)

Compatibility rules:
- Keep `fields.<field>.{mu,sigma,n}` contract stable across versions.
- New fields may be added without breaking existing consumers.
- Existing field semantics must not be silently changed; bump version when changed.

## Forward Plan

1. Replace seed dataset with canonicalized 27K production dataset.
2. Produce segmented stats (for example by `product_type`, `region`, `employment_type`) when sample sizes are sufficient.
3. Add multivariate anomaly coefficients in a new artifact while preserving univariate artifact contract.
