# Dataset Policy v2

## Purpose

This policy defines canonical extraction and statistical profiling for mixed distributions:
- `normal`
- `log_normal`
- `empirical` (bounded-ratio fallback)

The policy supports deterministic generation of a v2 stats artifact for confidence scoring.

## Scope

v2 profiles base monetary fields and derived behavioral fields:
- Base fields: `claimed_income`, `cash_price`, `amount_applied_amount`
- Derived fields: `age_years`, `employment_tenure_months`, `ltv_ratio`

## Canonical Schema (v2)

### Required source fields

- `application_id` (string)
- `application_date` (date, ISO-8601)
- `date_of_birth` (date, source format `%m/%d/%Y` or ISO-8601)
- `claimed_income` (float, > 0)
- `cash_price` (float, > 0)
- `amount_applied_amount` (float, > 0)
- `length_of_service_years` (int, >= 0)
- `length_of_service_months` (int, >= 0)

### Derived fields

1. `age_years`:
   - computed at `application_date`
   - formula: full years elapsed between DOB and application date
2. `employment_tenure_months`:
   - formula: `length_of_service_years * 12 + length_of_service_months`
3. `ltv_ratio`:
   - formula: `amount_applied_amount / cash_price`

## Eligibility Rules

1. One row per `application_id`.
2. Keep latest valid record for duplicate applications.
3. Profiling window must be documented in metadata.
4. Only include records meeting portfolio eligibility policy (recommended: approved/booked).

## Validation and Normalization Rules

1. Numeric parsing:
   - monetary and tenure components must parse as numeric values
   - reject tokens: empty string, `N/A`, `null`, non-numeric text
2. Date parsing:
   - `application_date` must be valid ISO-8601 date
   - `date_of_birth` must parse from accepted input formats
3. Bounds:
   - `claimed_income > 0`
   - `cash_price > 0`
   - `amount_applied_amount > 0`
   - `employment_tenure_months >= 0`
   - `age_years` recommended in [18, 75] for profiling set
   - `ltv_ratio > 0`
4. Invalid row handling:
   - For a specific field profile, drop invalid values for that field and record rejection count.

## Distribution Assignment

- `log_normal`:
  - `claimed_income`
  - `cash_price`
  - `amount_applied_amount`
  - `employment_tenure_months`
- `normal`:
  - `age_years`
- `empirical` fallback:
  - `ltv_ratio` (bounded-ratio by default in v2 seed profile)

## Parameter Computation Rules

For each field, require at least 3 valid values and a strictly positive scale parameter.

- `normal`:
  - `mu`: arithmetic mean
  - `sigma`: sample standard deviation (`ddof = 1`)
- `log_normal`:
  - `mu_log`: arithmetic mean of `log(x)`
  - `sigma_log`: sample standard deviation of `log(x)` (`ddof = 1`)
  - values must satisfy `x > 0`
- `empirical`:
  - `p05`, `p50`, `p95` percentiles

## v2 Stats Artifact Contract

Top-level keys:
- `stats_version`
- `preprocessing_policy_version`
- `generated_at`
- `source_dataset`
- `source_record_count`
- `fields`

Per-field keys:
- `distribution`: `normal` | `log_normal` | `empirical`
- `n`: valid sample size used for that field
- `params`:
  - normal: `mu`, `sigma`
  - log_normal: `mu_log`, `sigma_log`
  - empirical: `p05`, `p50`, `p95`

## Versioning

- Set `preprocessing_policy_version` to `dataset_policy_v2`.
- Bump `stats_version` when:
  - distribution assignment changes
  - derived formulas change
  - outlier preprocessing changes

## Forward Compatibility

1. Add segmented profiles by `product_type`, `region`, `employment_type`.
2. Add fit diagnostics and optional auto-switch between `normal` and `empirical`.
3. Add multivariate anomaly profile in a separate artifact section without breaking per-field contract.
