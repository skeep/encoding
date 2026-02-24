from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

from scoring_engine import score_field
from scoring_types import clamp_01


PROJECT_ROOT = Path(__file__).resolve().parent
DEFAULT_TAXONOMY_INDEX_PATH = PROJECT_ROOT / "config/field_taxonomy_index.yaml"
DEFAULT_STATS_PATH = PROJECT_ROOT / "data/stats/minimal_stats_artifact.json"


def load_taxonomy_index(path: str | Path = DEFAULT_TAXONOMY_INDEX_PATH) -> dict[str, str]:
    with Path(path).open("r", encoding="utf-8") as handle:
        payload = yaml.safe_load(handle) or {}
    fields = payload.get("fields", {})
    return {str(k): str(v) for k, v in fields.items()}


def get_supported_fields(path: str | Path = DEFAULT_TAXONOMY_INDEX_PATH) -> list[str]:
    index = load_taxonomy_index(path)
    return sorted(index.keys())


def _resolve_path(path_str: str) -> Path:
    path = Path(path_str)
    if path.is_absolute():
        return path
    return PROJECT_ROOT / path


def _aggregate_application_confidence(field_results: dict[str, dict]) -> float | None:
    scores = [result["field_score"] for result in field_results.values()]
    if not scores:
        return None
    return clamp_01(sum(float(s) for s in scores) / len(scores))


def score_document(
    *,
    document: Any,
    fields_to_score: list[str] | None = None,
    ocr_confidence_map: dict[str, float] | None = None,
    context: dict | None = None,
    taxonomy_index_path: str | Path = DEFAULT_TAXONOMY_INDEX_PATH,
    stats_path: str | Path = DEFAULT_STATS_PATH,
) -> dict:
    taxonomy_index = load_taxonomy_index(taxonomy_index_path)
    requested_fields = fields_to_score or sorted(taxonomy_index.keys())

    field_results: dict[str, dict] = {}
    unsupported_fields: list[str] = []
    errors: list[dict[str, str]] = []

    resolved_stats_path = _resolve_path(str(stats_path))
    for field_id in requested_fields:
        taxonomy_rel_path = taxonomy_index.get(field_id)
        if not taxonomy_rel_path:
            unsupported_fields.append(field_id)
            continue

        taxonomy_path = _resolve_path(taxonomy_rel_path)
        try:
            field_results[field_id] = score_field(
                raw_json=document,
                taxonomy_path=taxonomy_path,
                stats_path=resolved_stats_path,
                ocr_confidence_map=ocr_confidence_map or {},
                context=context or {},
            )
        except Exception as exc:
            errors.append({"field_id": field_id, "error": str(exc)})

    application_confidence = _aggregate_application_confidence(field_results)
    return {
        "field_results": field_results,
        "application_confidence": application_confidence,
        "scored_fields": len(field_results),
        "unsupported_fields": unsupported_fields,
        "errors": errors,
    }
