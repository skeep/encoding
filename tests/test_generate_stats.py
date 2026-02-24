import csv
import json
import tempfile
import unittest
from pathlib import Path

from scripts.generate_stats import (
    StatsGenerationError,
    generate_stats_artifact,
)


def write_csv(path: Path, header: list[str], rows: list[list[str]]) -> None:
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(header)
        writer.writerows(rows)


class GenerateStatsTests(unittest.TestCase):
    def test_happy_path_builds_expected_contract(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp = Path(tmpdir)
            csv_path = tmp / "canonical.csv"
            output_path = tmp / "stats.json"
            write_csv(
                csv_path,
                [
                    "application_id",
                    "claimed_income",
                    "cash_price",
                    "amount_applied_amount",
                ],
                [
                    ["A1", "42000", "980000", "686000"],
                    ["A2", "58000", "1302000", "890400"],
                    ["A3", "65000", "1450000", "1015000"],
                    ["A4", "48000", "1100000", "770000"],
                ],
            )

            artifact = generate_stats_artifact(
                input_path=csv_path,
                output_path=output_path,
                stats_version="v_test",
                preprocessing_policy_version="dataset_policy_v1",
                generated_at="2026-02-24T00:00:00Z",
            )

            self.assertEqual(artifact["stats_version"], "v_test")
            self.assertEqual(
                artifact["preprocessing_policy_version"], "dataset_policy_v1"
            )
            self.assertEqual(artifact["generated_at"], "2026-02-24T00:00:00Z")
            self.assertEqual(artifact["source_dataset"], csv_path.as_posix())
            self.assertEqual(artifact["source_record_count"], 4)

            fields = artifact["fields"]
            self.assertIn("claimed_income", fields)
            self.assertIn("cash_price", fields)
            self.assertIn("amount_applied_amount", fields)
            self.assertEqual(fields["claimed_income"]["n"], 4)
            self.assertGreater(fields["claimed_income"]["sigma"], 0)

            persisted = json.loads(output_path.read_text(encoding="utf-8"))
            self.assertEqual(persisted["stats_version"], "v_test")

    def test_missing_required_column_raises(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp = Path(tmpdir)
            csv_path = tmp / "canonical.csv"
            output_path = tmp / "stats.json"
            write_csv(
                csv_path,
                ["application_id", "claimed_income", "cash_price"],
                [
                    ["A1", "42000", "980000"],
                    ["A2", "58000", "1302000"],
                    ["A3", "65000", "1450000"],
                ],
            )

            with self.assertRaises(StatsGenerationError):
                generate_stats_artifact(
                    input_path=csv_path,
                    output_path=output_path,
                    stats_version="v_test",
                    preprocessing_policy_version="dataset_policy_v1",
                    generated_at="2026-02-24T00:00:00Z",
                )

    def test_invalid_numeric_rows_are_rejected_per_field(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp = Path(tmpdir)
            csv_path = tmp / "canonical.csv"
            output_path = tmp / "stats.json"
            write_csv(
                csv_path,
                [
                    "application_id",
                    "claimed_income",
                    "cash_price",
                    "amount_applied_amount",
                ],
                [
                    ["A1", "42000", "980000", "686000"],
                    ["A2", "58000", "1302000", "890400"],
                    ["A3", "65000", "1450000", "1015000"],
                    ["A4", "N/A", "1100000", "770000"],
                ],
            )

            artifact = generate_stats_artifact(
                input_path=csv_path,
                output_path=output_path,
                stats_version="v_test",
                preprocessing_policy_version="dataset_policy_v1",
                generated_at="2026-02-24T00:00:00Z",
            )

            # claimed_income has one invalid row and should use 3 valid values.
            self.assertEqual(artifact["fields"]["claimed_income"]["n"], 3)
            # Other fields remain at 4 valid values.
            self.assertEqual(artifact["fields"]["cash_price"]["n"], 4)
            self.assertEqual(artifact["fields"]["amount_applied_amount"]["n"], 4)

    def test_low_sample_count_raises(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp = Path(tmpdir)
            csv_path = tmp / "canonical.csv"
            output_path = tmp / "stats.json"
            write_csv(
                csv_path,
                [
                    "application_id",
                    "claimed_income",
                    "cash_price",
                    "amount_applied_amount",
                ],
                [
                    ["A1", "42000", "980000", "686000"],
                    ["A2", "58000", "1302000", "890400"],
                    ["A3", "bad", "1450000", "1015000"],
                ],
            )

            with self.assertRaises(StatsGenerationError):
                generate_stats_artifact(
                    input_path=csv_path,
                    output_path=output_path,
                    stats_version="v_test",
                    preprocessing_policy_version="dataset_policy_v1",
                    generated_at="2026-02-24T00:00:00Z",
                )

    def test_zero_sigma_raises(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp = Path(tmpdir)
            csv_path = tmp / "canonical.csv"
            output_path = tmp / "stats.json"
            write_csv(
                csv_path,
                [
                    "application_id",
                    "claimed_income",
                    "cash_price",
                    "amount_applied_amount",
                ],
                [
                    ["A1", "50000", "1000000", "700000"],
                    ["A2", "50000", "1200000", "840000"],
                    ["A3", "50000", "1400000", "980000"],
                ],
            )

            with self.assertRaises(StatsGenerationError):
                generate_stats_artifact(
                    input_path=csv_path,
                    output_path=output_path,
                    stats_version="v_test",
                    preprocessing_policy_version="dataset_policy_v1",
                    generated_at="2026-02-24T00:00:00Z",
                )


if __name__ == "__main__":
    unittest.main()
