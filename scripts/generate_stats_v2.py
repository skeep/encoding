#!/usr/bin/env python3
"""Generate mixed-distribution v2 stats artifact from canonical CSV."""

from __future__ import annotations

import argparse
import csv
import json
import math
from datetime import date, datetime, timezone
from pathlib import Path
from statistics import mean, stdev


class StatsGenerationV2Error(Exception):
    """Raised when v2 stats generation cannot be completed safely."""


REQUIRED_COLUMNS = (
    "application_id",
    "application_date",
    "date_of_birth",
    "claimed_income",
    "cash_price",
    "amount_applied_amount",
    "length_of_service_years",
    "length_of_service_months",
)


FIELD_DISTRIBUTIONS = {
    "claimed_income": "log_normal",
    "cash_price": "log_normal",
    "amount_applied_amount": "log_normal",
    "employment_tenure_months": "log_normal",
    "age_years": "normal",
    "ltv_ratio": "empirical",
}


def load_csv(path: Path) -> tuple[list[dict[str, str]], list[str]]:
    """Load canonical CSV rows and header names."""
    with path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        rows = list(reader)
        headers = reader.fieldnames or []
    if not headers:
        raise StatsGenerationV2Error(f"CSV has no header: {path}")
    return rows, headers


def validate_required_columns(headers: list[str]) -> None:
    """Ensure required source columns exist."""
    missing = [name for name in REQUIRED_COLUMNS if name not in headers]
    if missing:
        raise StatsGenerationV2Error(f"Missing required columns: {', '.join(missing)}")


def parse_iso_date(raw_value: str, field_name: str, row_number: int) -> date:
    """Parse ISO-8601 date in YYYY-MM-DD form."""
    value = (raw_value or "").strip()
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise StatsGenerationV2Error(
            f"Invalid ISO date '{raw_value}' for field '{field_name}' in row {row_number}"
        ) from exc


def parse_birth_date(raw_value: str, field_name: str, row_number: int) -> date:
    """Parse DOB using supported formats."""
    value = (raw_value or "").strip()
    for fmt in ("%m/%d/%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(value, fmt).date()
        except ValueError:
            continue
    raise StatsGenerationV2Error(
        f"Invalid birth date '{raw_value}' for field '{field_name}' in row {row_number}"
    )


def parse_float(raw_value: str, field_name: str, row_number: int) -> float:
    """Parse numeric value from raw string."""
    value = (raw_value or "").strip()
    if value == "":
        raise StatsGenerationV2Error(
            f"Empty value for field '{field_name}' in row {row_number}"
        )
    try:
        return float(value)
    except ValueError as exc:
        raise StatsGenerationV2Error(
            f"Non-numeric value '{raw_value}' for field '{field_name}' in row {row_number}"
        ) from exc


def full_years_elapsed(dob: date, as_of: date) -> int:
    """Return full years elapsed between dob and as_of date."""
    years = as_of.year - dob.year
    if (as_of.month, as_of.day) < (dob.month, dob.day):
        years -= 1
    return years


def percentile(values: list[float], q: float) -> float:
    """Compute percentile with linear interpolation."""
    if not values:
        raise StatsGenerationV2Error("Cannot compute percentiles for empty list")
    if len(values) == 1:
        return values[0]

    ordered = sorted(values)
    position = (len(ordered) - 1) * q
    lower_index = int(math.floor(position))
    upper_index = int(math.ceil(position))
    if lower_index == upper_index:
        return ordered[lower_index]

    lower = ordered[lower_index]
    upper = ordered[upper_index]
    fraction = position - lower_index
    return lower + (upper - lower) * fraction


def derive_row(row: dict[str, str], row_number: int) -> dict[str, float]:
    """Derive all profile fields from one canonical row."""
    application_date = parse_iso_date(row.get("application_date", ""), "application_date", row_number)
    dob = parse_birth_date(row.get("date_of_birth", ""), "date_of_birth", row_number)
    age_years = float(full_years_elapsed(dob, application_date))

    claimed_income = parse_float(row.get("claimed_income", ""), "claimed_income", row_number)
    cash_price = parse_float(row.get("cash_price", ""), "cash_price", row_number)
    amount_applied_amount = parse_float(
        row.get("amount_applied_amount", ""), "amount_applied_amount", row_number
    )
    los_years = parse_float(
        row.get("length_of_service_years", ""), "length_of_service_years", row_number
    )
    los_months = parse_float(
        row.get("length_of_service_months", ""), "length_of_service_months", row_number
    )

    employment_tenure_months = (los_years * 12.0) + los_months
    if cash_price <= 0:
        raise StatsGenerationV2Error(
            f"cash_price must be > 0 for ltv_ratio in row {row_number}"
        )
    ltv_ratio = amount_applied_amount / cash_price

    return {
        "claimed_income": claimed_income,
        "cash_price": cash_price,
        "amount_applied_amount": amount_applied_amount,
        "employment_tenure_months": employment_tenure_months,
        "age_years": age_years,
        "ltv_ratio": ltv_ratio,
    }


def compute_normal(values: list[float], field_name: str) -> dict[str, float | int]:
    """Compute normal distribution params."""
    if len(values) < 3:
        raise StatsGenerationV2Error(
            f"Field '{field_name}' requires at least 3 values, got {len(values)}"
        )
    sigma = stdev(values)
    if sigma <= 0:
        raise StatsGenerationV2Error(
            f"Field '{field_name}' has non-positive sigma: {sigma}"
        )
    return {"distribution": "normal", "n": len(values), "params": {"mu": mean(values), "sigma": sigma}}


def compute_log_normal(values: list[float], field_name: str) -> dict[str, float | int]:
    """Compute log-normal params over log-transformed values."""
    if len(values) < 3:
        raise StatsGenerationV2Error(
            f"Field '{field_name}' requires at least 3 values, got {len(values)}"
        )
    if any(value <= 0 for value in values):
        raise StatsGenerationV2Error(
            f"Field '{field_name}' has non-positive value for log-normal profile"
        )

    log_values = [math.log(value) for value in values]
    sigma_log = stdev(log_values)
    if sigma_log <= 0:
        raise StatsGenerationV2Error(
            f"Field '{field_name}' has non-positive sigma_log: {sigma_log}"
        )
    return {
        "distribution": "log_normal",
        "n": len(values),
        "params": {"mu_log": mean(log_values), "sigma_log": sigma_log},
    }


def compute_empirical(values: list[float], field_name: str) -> dict[str, float | int]:
    """Compute empirical percentile summary."""
    if len(values) < 3:
        raise StatsGenerationV2Error(
            f"Field '{field_name}' requires at least 3 values, got {len(values)}"
        )
    return {
        "distribution": "empirical",
        "n": len(values),
        "params": {
            "p05": percentile(values, 0.05),
            "p50": percentile(values, 0.50),
            "p95": percentile(values, 0.95),
        },
    }


def build_field_profiles(rows: list[dict[str, str]]) -> dict[str, dict[str, object]]:
    """Derive field values and compute distribution parameters."""
    derived_values: dict[str, list[float]] = {name: [] for name in FIELD_DISTRIBUTIONS}
    for row_number, row in enumerate(rows, start=2):
        derived = derive_row(row, row_number)
        for field_name, value in derived.items():
            derived_values[field_name].append(value)

    profiles: dict[str, dict[str, object]] = {}
    for field_name, distribution in FIELD_DISTRIBUTIONS.items():
        values = derived_values[field_name]
        if distribution == "normal":
            profiles[field_name] = compute_normal(values, field_name)
        elif distribution == "log_normal":
            profiles[field_name] = compute_log_normal(values, field_name)
        elif distribution == "empirical":
            profiles[field_name] = compute_empirical(values, field_name)
        else:
            raise StatsGenerationV2Error(
                f"Unsupported distribution '{distribution}' for field '{field_name}'"
            )
    return profiles


def generate_stats_artifact_v2(
    *,
    input_path: Path,
    output_path: Path,
    stats_version: str,
    preprocessing_policy_version: str,
    generated_at: str | None = None,
) -> dict[str, object]:
    """Generate mixed-distribution stats artifact v2."""
    rows, headers = load_csv(input_path)
    validate_required_columns(headers)
    fields = build_field_profiles(rows)

    artifact = {
        "stats_version": stats_version,
        "preprocessing_policy_version": preprocessing_policy_version,
        "generated_at": generated_at
        or datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "source_dataset": input_path.as_posix(),
        "source_record_count": len(rows),
        "fields": fields,
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as handle:
        json.dump(artifact, handle, indent=2, sort_keys=False)
        handle.write("\n")
    return artifact


def parse_args() -> argparse.Namespace:
    """Parse CLI arguments."""
    parser = argparse.ArgumentParser(
        description="Generate v2 mixed-distribution stats artifact from canonical CSV."
    )
    parser.add_argument("--input", required=True, help="Path to v2 canonical CSV.")
    parser.add_argument("--output", required=True, help="Path to output v2 JSON artifact.")
    parser.add_argument("--stats-version", required=True, help="Stats artifact version.")
    parser.add_argument(
        "--preprocessing-policy-version",
        required=True,
        help="Preprocessing policy version.",
    )
    parser.add_argument(
        "--generated-at",
        default=None,
        help="Optional timestamp override (UTC ISO-8601).",
    )
    return parser.parse_args()


def main() -> int:
    """CLI entry point."""
    args = parse_args()
    try:
        generate_stats_artifact_v2(
            input_path=Path(args.input),
            output_path=Path(args.output),
            stats_version=args.stats_version,
            preprocessing_policy_version=args.preprocessing_policy_version,
            generated_at=args.generated_at,
        )
    except StatsGenerationV2Error as exc:
        print(f"Error: {exc}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
