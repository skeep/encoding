import unittest

from fastapi.testclient import TestClient

from api_server import app


def make_document(claimed_income_value: str | None) -> list[dict]:
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


class ApiServerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.client = TestClient(app)

    def test_health(self) -> None:
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")

    def test_supported_fields(self) -> None:
        response = self.client.get("/supported-fields")
        self.assertEqual(response.status_code, 200)
        self.assertIn("claimed_income", response.json()["fields"])

    def test_score_happy_path(self) -> None:
        payload = {
            "document": make_document("58000.000000"),
            "fields_to_score": ["claimed_income"],
            "ocr_confidence_map": {"claimed_income": 0.93},
            "context": {"amount_applied_amount": 890400.0, "applied_term": 60},
        }
        response = self.client.post("/score", json=payload)
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertIn("claimed_income", body["field_results"])
        self.assertEqual(body["scored_fields"], 1)
        self.assertIn("application_confidence", body)

    def test_score_bad_payload_validation(self) -> None:
        response = self.client.post("/score", json={"fields_to_score": ["claimed_income"]})
        self.assertEqual(response.status_code, 422)


if __name__ == "__main__":
    unittest.main()
