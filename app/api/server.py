"""HTTP API layer for the loan confidence scoring service.

This module exposes lightweight FastAPI endpoints used by n8n and
other internal clients. Business scoring logic lives in `app.core`.
"""

from __future__ import annotations

from typing import Any

from fastapi import FastAPI
from pydantic import BaseModel

from app.core.scoring_service import get_supported_fields, score_document


class ScoreRequest(BaseModel):
    """Payload accepted by POST /score.

    Attributes:
        document: Raw extracted JSON payload (usually from Doc Intelligence).
        fields_to_score: Optional subset of field IDs to score.
        ocr_confidence_map: Optional field-level OCR confidences in [0,1].
        context: Optional additional values used by cross-field rules.
    """

    document: Any
    fields_to_score: list[str] | None = None
    ocr_confidence_map: dict[str, float] | None = None
    context: dict[str, Any] | None = None


class ScoreResponse(BaseModel):
    """Response returned by POST /score.

    Attributes:
        field_results: Per-field detailed scoring output.
        application_confidence: Aggregate confidence across scored fields.
        scored_fields: Count of fields successfully scored.
        unsupported_fields: Requested fields without taxonomy mapping.
        errors: Per-field runtime errors that did not fail the whole request.
    """

    field_results: dict[str, dict]
    application_confidence: float | None
    scored_fields: int
    unsupported_fields: list[str]
    errors: list[dict[str, str]]


app = FastAPI(title="Loan Confidence Scoring API", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    """Simple readiness endpoint for probes and local checks."""
    return {"status": "ok"}


@app.get("/supported-fields")
def supported_fields() -> dict[str, list[str]]:
    """Return all field IDs currently configured in taxonomy index."""
    return {"fields": get_supported_fields()}


@app.post("/score", response_model=ScoreResponse)
def score(payload: ScoreRequest) -> ScoreResponse:
    """Score one document for one-or-many fields.

    Args:
        payload: Request body containing document data and optional knobs.

    Returns:
        Structured score response ready for API consumers.
    """
    result = score_document(
        document=payload.document,
        fields_to_score=payload.fields_to_score,
        ocr_confidence_map=payload.ocr_confidence_map,
        context=payload.context,
    )
    return ScoreResponse(**result)
