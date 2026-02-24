from __future__ import annotations

import math
from typing import Callable

from scoring_types import RuleOutput, clamp_01


CustomFormatRule = Callable[[float], tuple[bool, str, list[str]]]
ScorerFn = Callable[[float, dict, dict], tuple[float, str]]
HardFailConditionFn = Callable[[set[str]], bool]
CrossFieldRuleFn = Callable[[float | None, dict], RuleOutput]
AggregatorFn = Callable[[dict[str, float | None], dict[str, float]], float]


def income_must_be_positive(value: float) -> tuple[bool, str, list[str]]:
    if value > 0:
        return True, "income_must_be_positive passed", []
    return False, "income_must_be_positive failed", ["non_positive_income"]


def zscore_linear(value: float, params: dict, scoring_cfg: dict) -> tuple[float, str]:
    z_cap = float(scoring_cfg.get("z_cap", 4.0))
    distribution = params.get("distribution")
    raw_params = params.get("params", {})

    if distribution == "log_normal":
        mu = float(raw_params["mu_log"])
        sigma = float(raw_params["sigma_log"])
        z = (math.log(value) - mu) / sigma
    elif distribution == "normal":
        mu = float(raw_params["mu"])
        sigma = float(raw_params["sigma"])
        z = (value - mu) / sigma
    else:
        raise ValueError(f"Unsupported distribution for zscore_linear: {distribution}")

    score = clamp_01(1.0 - (abs(z) / z_cap))
    return score, f"z={z:.4f}, z_cap={z_cap}"


def available_components_weighted_mean(
    components: dict[str, float | None], weights: dict[str, float]
) -> float:
    total_weight = 0.0
    weighted_sum = 0.0
    for key, weight in weights.items():
        score = components.get(key)
        if score is None:
            continue
        w = float(weight)
        total_weight += w
        weighted_sum += (w * float(score))
    if total_weight <= 0:
        return 0.0
    return clamp_01(weighted_sum / total_weight)


def required_missing(flags: set[str]) -> bool:
    return "required_missing" in flags


def non_numeric_value(flags: set[str]) -> bool:
    return "non_numeric_value" in flags


def income_positive(value: float | None, context: dict) -> RuleOutput:
    if value is None:
        return RuleOutput(
            rule_name="income_positive",
            score=0.0,
            passed=False,
            details="claimed_income missing",
            applicable=True,
        )
    passed = value > 0
    return RuleOutput(
        rule_name="income_positive",
        score=1.0 if passed else 0.0,
        passed=passed,
        details="claimed_income > 0" if passed else "claimed_income <= 0",
        applicable=True,
    )


def affordability_income_vs_loan(value: float | None, context: dict) -> RuleOutput:
    amount = context.get("amount_applied_amount")
    term = context.get("applied_term")
    if value is None or amount is None or term is None:
        return RuleOutput(
            rule_name="affordability_income_vs_loan",
            score=None,
            passed=True,
            details="not_applicable: missing income/amount/term",
            applicable=False,
        )

    monthly_payment_est = float(amount) / max(float(term), 1.0)
    ratio = monthly_payment_est / float(value)
    passed = ratio <= 0.6
    score = clamp_01(1.0 - max(0.0, ratio - 0.6))
    return RuleOutput(
        rule_name="affordability_income_vs_loan",
        score=score,
        passed=passed,
        details=f"estimated_payment_to_income_ratio={ratio:.4f}",
        applicable=True,
    )


CUSTOM_FORMAT_RULES: dict[str, CustomFormatRule] = {
    "income_must_be_positive": income_must_be_positive,
}


SCORERS: dict[str, ScorerFn] = {
    "zscore_linear": zscore_linear,
}


AGGREGATORS: dict[str, AggregatorFn] = {
    "available_components_weighted_mean": available_components_weighted_mean,
}


HARD_FAIL_CONDITIONS: dict[str, HardFailConditionFn] = {
    "required_missing": required_missing,
    "non_numeric_value": non_numeric_value,
}


CROSS_FIELD_RULES: dict[str, CrossFieldRuleFn] = {
    "income_positive": income_positive,
    "affordability_income_vs_loan": affordability_income_vs_loan,
}
