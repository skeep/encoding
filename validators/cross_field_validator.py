from __future__ import annotations

from scoring_types import RuleOutput, ValidationResult, clamp_01


def validate_cross_field(
    *,
    value: float | None,
    field_cfg: dict,
    context: dict,
    cross_field_rule_registry: dict,
) -> tuple[ValidationResult, list[RuleOutput]]:
    rule_ids = field_cfg.get("cross_field_rule_ids", []) or []
    if not rule_ids:
        return (
            ValidationResult(
                score=None,
                passed=True,
                details="no cross-field rules configured",
                available=False,
            ),
            [],
        )

    outputs: list[RuleOutput] = []
    applicable_scores: list[float] = []
    for rule_id in rule_ids:
        rule_fn = cross_field_rule_registry.get(rule_id)
        if rule_fn is None:
            outputs.append(
                RuleOutput(
                    rule_name=rule_id,
                    score=0.0,
                    passed=False,
                    details=f"missing cross-field rule: {rule_id}",
                    applicable=True,
                )
            )
            applicable_scores.append(0.0)
            continue

        out = rule_fn(value, context)
        outputs.append(out)
        if out.applicable and out.score is not None:
            applicable_scores.append(float(out.score))

    if not applicable_scores:
        return (
            ValidationResult(
                score=None,
                passed=True,
                details="cross-field rules not applicable",
                available=False,
            ),
            outputs,
        )

    score = clamp_01(sum(applicable_scores) / len(applicable_scores))
    passed = all(out.passed for out in outputs if out.applicable)
    return (
        ValidationResult(
            score=score,
            passed=passed,
            details=f"{len(applicable_scores)} applicable cross-field rules evaluated",
            available=True,
        ),
        outputs,
    )
