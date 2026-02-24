#!/usr/bin/env python3
"""Generate a stats artifact JSON from a canonical CSV dataset."""

from __future__ import annotations

import argparse
import csv
import json
from datetime import datetime, timezone
from pathlib import Path
from statistics import mean, stdev

REQUIRED_NUMERIC_FIELDS = (
    "claimed_income",
    "cash_price",
    "amount_applied_amount",
)


class StatsGenerationError(Exception):
    """Raised when the stats artifact cannot be generated safely."""


def load_canonical_csv(path: Path) -> tuple[list[dict[str, str]], list[str]]:
    """Load rows and header names from a canonical CSV file."""
    with path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        rows = list(reader)
        fieldnames = reader.fieldnames or []
    if not fieldnames:
        raise StatsGenerationError(f"CSV has no header: {path}")
    return rows, fieldnames


def validate_required_fields(
    fieldnames: list[str], required_fields: tuple[str, ...]
) -> None:
    """Ensure required fields are present in the CSV header."""
    missing = [field for field in required_fields if field not in fieldnames]
    if missing:
        raise StatsGenerationError(f"Missing required columns: {', '.join(missing)}")


def _parse_positive_float(raw_value: str, field_name: str, row_number: int) -> float:
    """Parse a strictly positive numeric value or raise."""
    value_str = (raw_value or "").strip()
    if value_str == "":
        raise StatsGenerationError(
            f"Empty value for field '{field_name}' in row {row_number}"
        )

    try:
        value = float(value_str)
    except ValueError as exc:
        raise StatsGenerationError(
            f"Non-numeric value '{raw_value}' for field '{field_name}' in row {row_number}"
        ) from exc

    if value <= 0:
        raise StatsGenerationError(
            f"Non-positive value {value} for field '{field_name}' in row {row_number}"
        )
    return value


def collect_valid_values(
    rows: list[dict[str, str]], field_name: str
) -> tuple[list[float], int]:
    """Collect valid positive numeric values for a field.

    Returns valid values and number of rejected rows.
    """
    valid_values: list[float] = []
    rejected_rows = 0
    for row_number, row in enumerate(rows, start=2):
        raw_value = row.get(field_name, "")
        try:
            value = _parse_positive_float(raw_value, field_name, row_number)
            valid_values.append(value)
        except StatsGenerationError:
            rejected_rows += 1
    return valid_values, rejected_rows


def compute_field_stats(values: list[float], field_name: str) -> dict[str, float | int]:
    """Compute mu, sample sigma (ddof=1), and n."""
    if len(values) < 3:
        raise StatsGenerationError(
            f"Field '{field_name}' requires at least 3 valid values, got {len(values)}"
        )

    sigma = stdev(values)
    if sigma <= 0:
        raise StatsGenerationError(
            f"Field '{field_name}' must have sigma > 0, got {sigma}"
        )

    return {
        "mu": mean(values),
        "sigma": sigma,
        "n": len(values),
    }


def build_artifact(
    *,
    stats_version: str,
    preprocessing_policy_version: str,
    generated_at: str,
    source_dataset: str,
    source_record_count: int,
    field_stats: dict[str, dict[str, float | int]],
) -> dict[str, object]:
    """Build stats artifact payload matching repository contract."""
    return {
        "stats_version": stats_version,
        "preprocessing_policy_version": preprocessing_policy_version,
        "generated_at": generated_at,
        "source_dataset": source_dataset,
        "source_record_count": source_record_count,
        "fields": field_stats,
    }


def generate_stats_artifact(
    *,
    input_path: Path,
    output_path: Path,
    stats_version: str,
    preprocessing_policy_version: str,
    generated_at: str | None = None,
    required_fields: tuple[str, ...] = REQUIRED_NUMERIC_FIELDS,
) -> dict[str, object]:
    """Generate and persist stats artifact JSON from canonical CSV."""
    rows, fieldnames = load_canonical_csv(input_path)
    validate_required_fields(fieldnames, required_fields)

    field_stats: dict[str, dict[str, float | int]] = {}
    for field_name in required_fields:
        values, _rejected = collect_valid_values(rows, field_name)
        field_stats[field_name] = compute_field_stats(values, field_name)

    artifact = build_artifact(
        stats_version=stats_version,
        preprocessing_policy_version=preprocessing_policy_version,
        generated_at=generated_at
        or datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        source_dataset=input_path.as_posix(),
        source_record_count=len(rows),
        field_stats=field_stats,
    )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as handle:
        json.dump(artifact, handle, indent=2, sort_keys=False)
        handle.write("\n")

    return artifact


def parse_args() -> argparse.Namespace:
    """Build and parse CLI arguments."""
    parser = argparse.ArgumentParser(
        description="Generate stats artifact JSON from canonical CSV."
    )
    parser.add_argument(
        "--input",
        required=True,
        help="Path to canonical CSV dataset.",
    )
    parser.add_argument(
        "--output",
        required=True,
        help="Path for generated stats artifact JSON.",
    )
    parser.add_argument(
        "--stats-version",
        required=True,
        help="Stats artifact version tag (example: v1_2026_02_seed).",
    )
    parser.add_argument(
        "--preprocessing-policy-version",
        required=True,
        help="Preprocessing policy version tag (example: dataset_policy_v1).",
    )
    parser.add_argument(
        "--generated-at",
        required=False,
        default=None,
        help="Optional UTC timestamp. If omitted, current UTC timestamp is used.",
    )
    return parser.parse_args()


def main() -> int:
    """CLI entry point."""
    args = parse_args()
    try:
        generate_stats_artifact(
            input_path=Path(args.input),
            output_path=Path(args.output),
            stats_version=args.stats_version,
            preprocessing_policy_version=args.preprocessing_policy_version,
            generated_at=args.generated_at,
        )
    except StatsGenerationError as exc:
        print(f"Error: {exc}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
