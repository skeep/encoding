from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import yaml

from app.core.registry import (
    AGGREGATORS,
    CROSS_FIELD_RULES,
    CUSTOM_FORMAT_RULES,
    HARD_FAIL_CONDITIONS,
    SCORERS,
)
from app.core.scoring_types import FieldScoreResult, RuleOutput, clamp_01
from app.core.validators.cross_field_validator import validate_cross_field
from app.core.validators.format_validator import validate_format
from app.core.validators.statistical_validator import validate_statistical


def load_yaml(path: str | Path) -> dict:
    """Load taxonomy YAML document."""
    with Path(path).open("r", encoding="utf-8") as handle:
        return yaml.safe_load(handle)


def load_json(path: str | Path) -> dict:
    """Load JSON document (stats artifact)."""
    with Path(path).open("r", encoding="utf-8") as handle:
        return json.load(handle)


def _iter_children(node: Any) -> list[Any]:
    if isinstance(node, dict):
        return list(node.values())
    if isinstance(node, list):
        return list(node)
    return []


def _find_key_in_descendants(node: Any, key: str) -> list[Any]:
    found: list[Any] = []
    queue = [node]
    while queue:
        current = queue.pop(0)
        if isinstance(current, dict):
            if key in current:
                found.append(current[key])
            queue.extend(current.values())
        elif isinstance(current, list):
            queue.extend(current)
    return found


def extract_by_path(raw_json: Any, source_path: str) -> Any:
    """Resolve a dotted source path with wildcard support from raw payload."""
    parts = source_path.split(".")
    current_nodes = [raw_json]
    for part in parts:
        next_nodes: list[Any] = []
        for node in current_nodes:
            if part == "*":
                next_nodes.extend(_iter_children(node))
            elif isinstance(node, dict) and part in node:
                next_nodes.append(node[part])
            elif isinstance(node, (dict, list)):
                # Allow taxonomy paths that are relative to inner sections.
                next_nodes.extend(_find_key_in_descendants(node, part))
            elif isinstance(node, list):
                for item in node:
                    if isinstance(item, dict) and part in item:
                        next_nodes.append(item[part])
        current_nodes = next_nodes
        if not current_nodes:
            return None

    for node in current_nodes:
        if isinstance(node, (str, int, float)):
            return node
        if node is not None:
            return node
    return None


def extract_field_value(raw_json: Any, source_paths: list[str]) -> Any:
    """Try configured source paths in order and return first resolved value."""
    for path in source_paths:
        value = extract_by_path(raw_json, path)
        if value is not None:
            return value
    return None


def preprocess_value(raw_value: Any, preprocess_cfg: dict) -> Any:
    """Normalize extracted value using taxonomy preprocessing settings."""
    if raw_value is None:
        return None

    value = raw_value
    if preprocess_cfg.get("trim", False) and isinstance(value, str):
        value = value.strip()

    for token in preprocess_cfg.get("remove_separators", []) or []:
        if isinstance(value, str):
            value = value.replace(str(token), "")

    cast_type = preprocess_cfg.get("cast")
    if cast_type == "float":
        try:
            return float(value)
        except Exception:
            return None
    if cast_type == "int":
        try:
            return int(float(value))
        except Exception:
            return None
    return value


def _evaluate_hard_fail(flags: set[str], condition_ids: list[str]) -> list[str]:
    """Evaluate configured hard-fail condition IDs against collected flags."""
    triggered: list[str] = []
    for condition_id in condition_ids or []:
        fn = HARD_FAIL_CONDITIONS.get(condition_id)
        if fn and fn(flags):
            triggered.append(condition_id)
    return triggered


def _serialize_rules(rule_outputs: list[RuleOutput]) -> list[dict]:
    """Convert rule dataclasses to API-safe dictionaries."""
    return [
        {
            "rule_name": r.rule_name,
            "score": r.score,
            "passed": r.passed,
            "details": r.details,
            "applicable": r.applicable,
        }
        for r in rule_outputs
    ]


def score_field(
    *,
    raw_json: Any,
    taxonomy_path: str | Path,
    stats_path: str | Path,
    ocr_confidence_map: dict[str, float] | None = None,
    context: dict | None = None,
) -> dict:
    """Score one field deterministically using taxonomy + stats artifact.

    Execution order:
    1) extract, 2) preprocess, 3) format validate,
    4) statistical validate, 5) cross-field validate,
    6) aggregate components, 7) apply hard-fail conditions.
    """
    taxonomy = load_yaml(taxonomy_path)
    stats = load_json(stats_path)
    field_cfg = taxonomy["field"]
    field_id = field_cfg["id"]

    ocr_conf = clamp_01(float((ocr_confidence_map or {}).get(field_id, 1.0)))
    source_paths = field_cfg.get("source_paths", [])
    raw_value = extract_field_value(raw_json, source_paths)
    normalized_value = preprocess_value(raw_value, field_cfg.get("preprocessing", {}))

    flags: set[str] = set()
    if field_cfg.get("required", False) and normalized_value is None:
        flags.add("required_missing")
    if raw_value is not None and normalized_value is None:
        flags.add("non_numeric_value")

    format_result = validate_format(
        value=normalized_value,
        field_cfg=field_cfg,
        custom_rule_registry=CUSTOM_FORMAT_RULES,
    )
    flags.update(format_result.flags)

    statistical_result = validate_statistical(
        value=normalized_value,
        field_cfg=field_cfg,
        stats_artifact=stats,
        scorer_registry=SCORERS,
    )
    flags.update(statistical_result.flags)

    cross_field_result, rule_outputs = validate_cross_field(
        value=normalized_value,
        field_cfg=field_cfg,
        context=context or {},
        cross_field_rule_registry=CROSS_FIELD_RULES,
    )
    flags.update(cross_field_result.flags)

    component_scores = {
        "ocr": ocr_conf,
        "format": format_result.score if format_result.available else None,
        "statistical": statistical_result.score if statistical_result.available else None,
        "cross_field": cross_field_result.score if cross_field_result.available else None,
    }

    scoring_cfg = field_cfg.get("scoring", {})
    aggregator_id = scoring_cfg.get("aggregation", "available_components_weighted_mean")
    aggregator_fn = AGGREGATORS.get(aggregator_id)
    if aggregator_fn is None:
        raise ValueError(f"Unknown aggregator: {aggregator_id}")

    field_score = aggregator_fn(component_scores, scoring_cfg.get("component_weights", {}))

    triggered_hard_fail = _evaluate_hard_fail(
        flags, scoring_cfg.get("hard_fail_condition_ids", [])
    )
    status = "passed"
    details: list[str] = [
        format_result.details,
        statistical_result.details,
        cross_field_result.details,
    ]
    if triggered_hard_fail:
        field_score = 0.0
        status = "failed"
        details.append(f"hard_fail_conditions_triggered={triggered_hard_fail}")

    result = FieldScoreResult(
        field_id=field_id,
        raw_value=raw_value,
        normalized_value=normalized_value,
        field_score=clamp_01(field_score),
        status=status,
        component_scores=component_scores,
        details=[d for d in details if d],
        rule_outputs=_serialize_rules(rule_outputs),
    )
    return {
        "field_id": result.field_id,
        "raw_value": result.raw_value,
        "normalized_value": result.normalized_value,
        "field_score": result.field_score,
        "status": result.status,
        "component_scores": result.component_scores,
        "details": result.details,
        "rule_outputs": result.rule_outputs,
    }
