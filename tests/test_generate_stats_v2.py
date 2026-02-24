import csv
import tempfile
import unittest
from pathlib import Path

from scripts.generate_stats_v2 import (
    StatsGenerationV2Error,
    derive_row,
    generate_stats_artifact_v2,
)


def write_csv(path: Path, headers: list[str], rows: list[list[str]]) -> None:
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(headers)
        writer.writerows(rows)


class GenerateStatsV2Tests(unittest.TestCase):
    def test_derive_fields_computation(self) -> None:
        derived = derive_row(
            {
                "application_date": "2025-01-15",
                "date_of_birth": "11/16/1991",
                "claimed_income": "58000",
                "cash_price": "1302000",
                "amount_applied_amount": "890400",
                "length_of_service_years": "8",
                "length_of_service_months": "0",
            },
            row_number=2,
        )
        self.assertEqual(derived["age_years"], 33.0)
        self.assertEqual(derived["employment_tenure_months"], 96.0)
        self.assertAlmostEqual(derived["ltv_ratio"], 0.6838709677419355)

    def test_happy_path_v2_contract(self) -> None:
        headers = [
            "application_id",
            "application_date",
            "date_of_birth",
            "claimed_income",
            "cash_price",
            "amount_applied_amount",
            "length_of_service_years",
            "length_of_service_months",
        ]
        rows = [
            ["A1", "2025-01-12", "11/16/1991", "42000", "980000", "686000", "5", "6"],
            ["A2", "2025-01-15", "09/03/1988", "58000", "1302000", "890400", "8", "0"],
            ["A3", "2025-01-17", "07/28/1985", "65000", "1450000", "1015000", "11", "4"],
            ["A4", "2025-01-19", "02/10/1995", "48000", "1100000", "770000", "3", "8"],
        ]

        with tempfile.TemporaryDirectory() as tmpdir:
            base = Path(tmpdir)
            input_path = base / "canonical_v2.csv"
            output_path = base / "artifact_v2.json"
            write_csv(input_path, headers, rows)

            artifact = generate_stats_artifact_v2(
                input_path=input_path,
                output_path=output_path,
                stats_version="v2_test",
                preprocessing_policy_version="dataset_policy_v2",
                generated_at="2026-02-24T00:00:00Z",
            )

            fields = artifact["fields"]
            self.assertEqual(fields["claimed_income"]["distribution"], "log_normal")
            self.assertEqual(fields["cash_price"]["distribution"], "log_normal")
            self.assertEqual(fields["amount_applied_amount"]["distribution"], "log_normal")
            self.assertEqual(fields["employment_tenure_months"]["distribution"], "log_normal")
            self.assertEqual(fields["age_years"]["distribution"], "normal")
            self.assertEqual(fields["ltv_ratio"]["distribution"], "empirical")

            self.assertIn("mu_log", fields["claimed_income"]["params"])
            self.assertIn("sigma_log", fields["claimed_income"]["params"])
            self.assertIn("mu", fields["age_years"]["params"])
            self.assertIn("sigma", fields["age_years"]["params"])
            self.assertIn("p50", fields["ltv_ratio"]["params"])

    def test_missing_required_column_raises(self) -> None:
        headers = [
            "application_id",
            "application_date",
            "date_of_birth",
            "claimed_income",
            "cash_price",
            "length_of_service_years",
            "length_of_service_months",
        ]
        rows = [
            ["A1", "2025-01-12", "11/16/1991", "42000", "980000", "5", "6"],
            ["A2", "2025-01-15", "09/03/1988", "58000", "1302000", "8", "0"],
            ["A3", "2025-01-17", "07/28/1985", "65000", "1450000", "11", "4"],
        ]
        with tempfile.TemporaryDirectory() as tmpdir:
            base = Path(tmpdir)
            input_path = base / "canonical_v2.csv"
            output_path = base / "artifact_v2.json"
            write_csv(input_path, headers, rows)

            with self.assertRaises(StatsGenerationV2Error):
                generate_stats_artifact_v2(
                    input_path=input_path,
                    output_path=output_path,
                    stats_version="v2_test",
                    preprocessing_policy_version="dataset_policy_v2",
                    generated_at="2026-02-24T00:00:00Z",
                )

    def test_non_positive_log_field_raises(self) -> None:
        headers = [
            "application_id",
            "application_date",
            "date_of_birth",
            "claimed_income",
            "cash_price",
            "amount_applied_amount",
            "length_of_service_years",
            "length_of_service_months",
        ]
        rows = [
            ["A1", "2025-01-12", "11/16/1991", "42000", "980000", "686000", "5", "6"],
            ["A2", "2025-01-15", "09/03/1988", "58000", "1302000", "890400", "8", "0"],
            ["A3", "2025-01-17", "07/28/1985", "0", "1450000", "1015000", "11", "4"],
        ]
        with tempfile.TemporaryDirectory() as tmpdir:
            base = Path(tmpdir)
            input_path = base / "canonical_v2.csv"
            output_path = base / "artifact_v2.json"
            write_csv(input_path, headers, rows)

            with self.assertRaises(StatsGenerationV2Error):
                generate_stats_artifact_v2(
                    input_path=input_path,
                    output_path=output_path,
                    stats_version="v2_test",
                    preprocessing_policy_version="dataset_policy_v2",
                    generated_at="2026-02-24T00:00:00Z",
                )

    def test_zero_cash_price_raises(self) -> None:
        headers = [
            "application_id",
            "application_date",
            "date_of_birth",
            "claimed_income",
            "cash_price",
            "amount_applied_amount",
            "length_of_service_years",
            "length_of_service_months",
        ]
        rows = [
            ["A1", "2025-01-12", "11/16/1991", "42000", "980000", "686000", "5", "6"],
            ["A2", "2025-01-15", "09/03/1988", "58000", "1302000", "890400", "8", "0"],
            ["A3", "2025-01-17", "07/28/1985", "65000", "0", "1015000", "11", "4"],
        ]
        with tempfile.TemporaryDirectory() as tmpdir:
            base = Path(tmpdir)
            input_path = base / "canonical_v2.csv"
            output_path = base / "artifact_v2.json"
            write_csv(input_path, headers, rows)

            with self.assertRaises(StatsGenerationV2Error):
                generate_stats_artifact_v2(
                    input_path=input_path,
                    output_path=output_path,
                    stats_version="v2_test",
                    preprocessing_policy_version="dataset_policy_v2",
                    generated_at="2026-02-24T00:00:00Z",
                )


if __name__ == "__main__":
    unittest.main()
