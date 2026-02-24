from __future__ import annotations

from typing import Any

from fastapi import FastAPI
from pydantic import BaseModel

from app.core.scoring_service import get_supported_fields, score_document


class ScoreRequest(BaseModel):
    document: Any
    fields_to_score: list[str] | None = None
    ocr_confidence_map: dict[str, float] | None = None
    context: dict[str, Any] | None = None


class ScoreResponse(BaseModel):
    field_results: dict[str, dict]
    application_confidence: float | None
    scored_fields: int
    unsupported_fields: list[str]
    errors: list[dict[str, str]]


app = FastAPI(title="Loan Confidence Scoring API", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/supported-fields")
def supported_fields() -> dict[str, list[str]]:
    return {"fields": get_supported_fields()}


@app.post("/score", response_model=ScoreResponse)
def score(payload: ScoreRequest) -> ScoreResponse:
    result = score_document(
        document=payload.document,
        fields_to_score=payload.fields_to_score,
        ocr_confidence_map=payload.ocr_confidence_map,
        context=payload.context,
    )
    return ScoreResponse(**result)
