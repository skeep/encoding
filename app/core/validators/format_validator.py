from __future__ import annotations

from app.core.scoring_types import ValidationResult, clamp_01


def _check_bounds(value: float, bounds: dict) -> tuple[bool, str]:
    min_value = bounds.get("min")
    max_value = bounds.get("max")
    min_inclusive = bool(bounds.get("min_inclusive", True))
    max_inclusive = bool(bounds.get("max_inclusive", True))

    if min_value is not None:
        if min_inclusive and value < float(min_value):
            return False, f"value {value} below min {min_value}"
        if (not min_inclusive) and value <= float(min_value):
            return False, f"value {value} not greater than min {min_value}"

    if max_value is not None:
        if max_inclusive and value > float(max_value):
            return False, f"value {value} above max {max_value}"
        if (not max_inclusive) and value >= float(max_value):
            return False, f"value {value} not less than max {max_value}"

    return True, "bounds check passed"


def validate_format(
    *,
    value: float | None,
    field_cfg: dict,
    custom_rule_registry: dict,
) -> ValidationResult:
    format_cfg = field_cfg.get("validators", {}).get("format", {})
    checks: list[tuple[bool, str]] = []
    flags: list[str] = []

    if value is None:
        flags.append("required_missing")
        return ValidationResult(
            score=0.0,
            passed=False,
            details="value missing for format validation",
            available=True,
            flags=flags,
        )

    type_check = bool(format_cfg.get("type_check", True))
    if type_check:
        is_numeric = isinstance(value, (int, float))
        checks.append((is_numeric, "type_check passed" if is_numeric else "type_check failed"))
        if not is_numeric:
            flags.append("non_numeric_value")

    bounds_cfg = format_cfg.get("bounds", {})
    if bounds_cfg:
        passed, details = _check_bounds(float(value), bounds_cfg)
        checks.append((passed, details))
        if not passed:
            flags.append("bounds_violation")

    custom_rule_ids = format_cfg.get("custom_rule_ids", []) or []
    for rule_id in custom_rule_ids:
        rule_fn = custom_rule_registry.get(rule_id)
        if rule_fn is None:
            checks.append((False, f"custom rule missing: {rule_id}"))
            flags.append("missing_custom_rule")
            continue
        passed, details, rule_flags = rule_fn(float(value))
        checks.append((passed, details))
        flags.extend(rule_flags)

    if not checks:
        return ValidationResult(
            score=1.0,
            passed=True,
            details="no format checks configured",
            available=True,
            flags=flags,
        )

    passed_count = sum(1 for ok, _ in checks if ok)
    score = clamp_01(passed_count / len(checks))
    passed = all(ok for ok, _ in checks)
    details = "; ".join(message for _, message in checks)
    return ValidationResult(score=score, passed=passed, details=details, flags=flags)
