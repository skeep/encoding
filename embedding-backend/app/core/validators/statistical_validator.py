"""Statistical plausibility validation layer.

Uses field taxonomy scoring settings plus stats artifact parameters to
produce a component score in [0,1], including fallback behavior when
parameters are missing.
"""

from __future__ import annotations

from app.core.scoring_types import ValidationResult, clamp_01


def validate_statistical(
    *,
    value: float | None,
    field_cfg: dict,
    stats_artifact: dict,
    scorer_registry: dict,
) -> ValidationResult:
    """Validate statistical plausibility for a preprocessed numeric value.

    Args:
        value: Normalized numeric value for the field.
        field_cfg: Field taxonomy configuration.
        stats_artifact: Loaded stats JSON with per-field params.
        scorer_registry: Mapping of scorer IDs to scorer callables.

    Returns:
        ValidationResult with statistical score and diagnostics.
    """
    stat_cfg = field_cfg.get("validators", {}).get("statistical", {})
    if not stat_cfg.get("enabled", False):
        return ValidationResult(
            score=None,
            passed=True,
            details="statistical validation disabled",
            available=False,
        )

    if value is None:
        return ValidationResult(
            score=0.0,
            passed=False,
            details="value missing for statistical validation",
            available=True,
            flags=["required_missing"],
        )

    params_key = stat_cfg.get("params", {}).get("key")
    stats_fields = stats_artifact.get("fields", {})
    field_params = stats_fields.get(params_key)

    if not field_params:
        # Fallback policy controls whether missing stats penalize, skip, or pass.
        policy = stat_cfg.get("fallback_policy", "neutral_1")
        if policy == "neutral_1":
            return ValidationResult(
                score=1.0,
                passed=True,
                details="stats missing, fallback neutral_1",
                available=True,
            )
        if policy == "skip_component":
            return ValidationResult(
                score=None,
                passed=True,
                details="stats missing, skip component",
                available=False,
            )
        return ValidationResult(
            score=0.0,
            passed=False,
            details="stats missing, fallback fail_0",
            available=True,
            flags=["missing_stats_params"],
        )

    scorer_id = stat_cfg.get("scoring", {}).get("scorer_id")
    scorer_fn = scorer_registry.get(scorer_id)
    if scorer_fn is None:
        return ValidationResult(
            score=0.0,
            passed=False,
            details=f"missing scorer: {scorer_id}",
            available=True,
            flags=["missing_scorer"],
        )

    try:
        score, details = scorer_fn(float(value), field_params, stat_cfg.get("scoring", {}))
    except Exception as exc:
        return ValidationResult(
            score=0.0,
            passed=False,
            details=f"scorer error: {exc}",
            available=True,
            flags=["statistical_error"],
        )

    score = clamp_01(score)
    return ValidationResult(
        score=score,
        passed=score > 0.0,
        details=details,
        available=True,
    )
