import unittest

from scoring_service import get_supported_fields, score_document


def make_raw_json(claimed_income_value: str | None) -> list[dict]:
    return [
        {
            "AL/2024/00381939|936770": {
                "current_employment": {
                    "1838704": {
                        "claimed_income": claimed_income_value,
                    }
                }
            }
        }
    ]


class ScoringServiceTests(unittest.TestCase):
    def test_get_supported_fields_contains_claimed_income(self) -> None:
        fields = get_supported_fields()
        self.assertIn("claimed_income", fields)

    def test_score_requested_fields(self) -> None:
        result = score_document(
            document=make_raw_json("58000.000000"),
            fields_to_score=["claimed_income"],
            ocr_confidence_map={"claimed_income": 0.95},
            context={"amount_applied_amount": 890400.0, "applied_term": 60},
        )
        self.assertEqual(result["scored_fields"], 1)
        self.assertIn("claimed_income", result["field_results"])
        self.assertEqual(result["unsupported_fields"], [])
        self.assertEqual(result["errors"], [])

    def test_defaults_to_all_supported_when_fields_omitted(self) -> None:
        result = score_document(
            document=make_raw_json("58000"),
            ocr_confidence_map={"claimed_income": 0.95},
            context={},
        )
        self.assertGreaterEqual(result["scored_fields"], 1)
        self.assertIn("claimed_income", result["field_results"])

    def test_unsupported_fields_do_not_fail_request(self) -> None:
        result = score_document(
            document=make_raw_json("58000"),
            fields_to_score=["claimed_income", "not_a_real_field"],
        )
        self.assertIn("claimed_income", result["field_results"])
        self.assertIn("not_a_real_field", result["unsupported_fields"])

    def test_application_confidence_deterministic_mean(self) -> None:
        r1 = score_document(
            document=make_raw_json("58000"),
            fields_to_score=["claimed_income"],
            ocr_confidence_map={"claimed_income": 0.90},
        )
        r2 = score_document(
            document=make_raw_json("58000"),
            fields_to_score=["claimed_income"],
            ocr_confidence_map={"claimed_income": 0.90},
        )
        self.assertEqual(r1["application_confidence"], r2["application_confidence"])


if __name__ == "__main__":
    unittest.main()
