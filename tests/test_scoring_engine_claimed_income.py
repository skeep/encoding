import copy
import json
import tempfile
import unittest
from pathlib import Path

import yaml

from app.core.scoring_engine import score_field


def write_yaml(path: Path, data: dict) -> None:
    with path.open("w", encoding="utf-8") as handle:
        yaml.safe_dump(data, handle, sort_keys=False)


def write_json(path: Path, data: dict) -> None:
    with path.open("w", encoding="utf-8") as handle:
        json.dump(data, handle, indent=2)
        handle.write("\n")


def make_raw_json(claimed_income_value: str | None) -> list[dict]:
    personal = {
        "AL/2024/00381939|936770": {
            "current_employment": {
                "1838704": {
                    "claimed_income": claimed_income_value,
                }
            }
        }
    }
    return [personal]


class ClaimedIncomeScoringEngineTests(unittest.TestCase):
    def setUp(self) -> None:
        self.repo = Path("/Users/Suman_Paul/Projects/encoding")
        self.taxonomy_path = self.repo / "docs/field_taxonomy/claimed_income.yaml"
        self.stats_path = self.repo / "data/stats/minimal_stats_artifact.json"
        with self.taxonomy_path.open("r", encoding="utf-8") as handle:
            self.taxonomy = yaml.safe_load(handle)
        with self.stats_path.open("r", encoding="utf-8") as handle:
            self.stats = json.load(handle)

    def test_happy_path_scores_claimed_income(self) -> None:
        result = score_field(
            raw_json=make_raw_json("58000.000000"),
            taxonomy_path=self.taxonomy_path,
            stats_path=self.stats_path,
            ocr_confidence_map={"claimed_income": 0.93},
            context={"amount_applied_amount": 890400.0, "applied_term": 60},
        )
        self.assertEqual(result["field_id"], "claimed_income")
        self.assertEqual(result["status"], "passed")
        self.assertGreater(result["field_score"], 0.0)
        self.assertLessEqual(result["field_score"], 1.0)
        self.assertIsNotNone(result["component_scores"]["format"])
        self.assertIsNotNone(result["component_scores"]["statistical"])

    def test_required_missing_triggers_hard_fail(self) -> None:
        result = score_field(
            raw_json=make_raw_json(None),
            taxonomy_path=self.taxonomy_path,
            stats_path=self.stats_path,
            ocr_confidence_map={"claimed_income": 0.93},
            context={},
        )
        self.assertEqual(result["status"], "failed")
        self.assertEqual(result["field_score"], 0.0)

    def test_non_numeric_triggers_hard_fail(self) -> None:
        result = score_field(
            raw_json=make_raw_json("N/A"),
            taxonomy_path=self.taxonomy_path,
            stats_path=self.stats_path,
            ocr_confidence_map={"claimed_income": 0.90},
            context={},
        )
        self.assertEqual(result["status"], "failed")
        self.assertEqual(result["field_score"], 0.0)

    def test_bounds_failure_reduces_format_score(self) -> None:
        result = score_field(
            raw_json=make_raw_json("25000000"),
            taxonomy_path=self.taxonomy_path,
            stats_path=self.stats_path,
            ocr_confidence_map={"claimed_income": 1.0},
            context={},
        )
        self.assertEqual(result["status"], "passed")
        self.assertLess(result["component_scores"]["format"], 1.0)

    def test_missing_stats_uses_neutral_1_policy(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp = Path(tmpdir)
            stats_copy = copy.deepcopy(self.stats)
            stats_copy["fields"].pop("claimed_income", None)
            stats_path = tmp / "stats_missing_income.json"
            write_json(stats_path, stats_copy)

            result = score_field(
                raw_json=make_raw_json("58000"),
                taxonomy_path=self.taxonomy_path,
                stats_path=stats_path,
                ocr_confidence_map={"claimed_income": 1.0},
                context={},
            )
            self.assertEqual(result["component_scores"]["statistical"], 1.0)

    def test_log_normal_scoring_near_mean_is_high(self) -> None:
        mu_log = self.stats["fields"]["claimed_income"]["params"]["mu_log"]
        near_mean_value = str(round(float(__import__("math").exp(mu_log)), 6))
        result = score_field(
            raw_json=make_raw_json(near_mean_value),
            taxonomy_path=self.taxonomy_path,
            stats_path=self.stats_path,
            ocr_confidence_map={"claimed_income": 1.0},
            context={},
        )
        self.assertGreaterEqual(result["component_scores"]["statistical"], 0.95)

    def test_available_components_weighted_mean_skips_missing_component(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp = Path(tmpdir)
            tax_copy = copy.deepcopy(self.taxonomy)
            tax_copy["field"]["validators"]["statistical"]["fallback_policy"] = "skip_component"
            stats_copy = copy.deepcopy(self.stats)
            stats_copy["fields"].pop("claimed_income", None)

            tax_path = tmp / "taxonomy.yaml"
            stats_path = tmp / "stats.json"
            write_yaml(tax_path, tax_copy)
            write_json(stats_path, stats_copy)

            result = score_field(
                raw_json=make_raw_json("58000"),
                taxonomy_path=tax_path,
                stats_path=stats_path,
                ocr_confidence_map={"claimed_income": 1.0},
                context={},
            )
            # statistical is skipped, aggregation still returns valid score.
            self.assertIsNone(result["component_scores"]["statistical"])
            self.assertGreater(result["field_score"], 0.0)


if __name__ == "__main__":
    unittest.main()
