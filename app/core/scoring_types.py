from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


def clamp_01(value: float) -> float:
    return max(0.0, min(1.0, float(value)))


@dataclass
class ValidationResult:
    score: float | None
    passed: bool
    details: str
    available: bool = True
    flags: list[str] = field(default_factory=list)


@dataclass
class RuleOutput:
    rule_name: str
    score: float | None
    passed: bool
    details: str
    applicable: bool = True


@dataclass
class FieldScoreResult:
    field_id: str
    raw_value: Any
    normalized_value: Any
    field_score: float
    status: str
    component_scores: dict[str, float | None]
    details: list[str]
    rule_outputs: list[dict[str, Any]]
