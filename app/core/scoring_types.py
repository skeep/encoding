"""Shared scoring data contracts.

These dataclasses are used across validators, orchestration, and API
serialization layers to keep result shapes explicit and consistent.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


def clamp_01(value: float) -> float:
    """Clamp numeric score into the inclusive [0,1] interval."""
    return max(0.0, min(1.0, float(value)))


@dataclass
class ValidationResult:
    """Result emitted by a validator component.

    Attributes:
        score: Component score in [0,1], or None when not available.
        passed: Boolean outcome for pass/fail semantics.
        details: Human-readable explanation of validation behavior.
        available: Whether this component should participate in aggregation.
        flags: Machine-readable flags used by hard-fail conditions.
    """

    score: float | None
    passed: bool
    details: str
    available: bool = True
    flags: list[str] = field(default_factory=list)


@dataclass
class RuleOutput:
    """Output contract for a single cross-field rule execution."""

    rule_name: str
    score: float | None
    passed: bool
    details: str
    applicable: bool = True


@dataclass
class FieldScoreResult:
    """Canonical single-field scoring result used by API responses."""

    field_id: str
    raw_value: Any
    normalized_value: Any
    field_score: float
    status: str
    component_scores: dict[str, float | None]
    details: list[str]
    rule_outputs: list[dict[str, Any]]
