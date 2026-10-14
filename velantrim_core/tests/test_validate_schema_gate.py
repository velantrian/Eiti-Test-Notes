"""Regression tests for the mandatory JSON Schema admission gate."""
from __future__ import annotations

import copy
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from validate import validate_batch  # noqa: E402


VALID_FACT = {
    "id": "law.physics.mechanics.newton_2",
    "schema_version": "3.2",
    "domain": "physics.mechanics",
    "subtopic": "physics.mechanics.dynamics",
    "tier": "invariant",
    "type": "law",
    "statement": "Ускорение тела прямо пропорционально приложенной силе и обратно пропорционально его массе.",
    "formal_notation": "F = m·a",
    "conditions": "Инерциальная система отсчёта; v << c",
    "limits": ["Не применимо при v близких к c"],
    "prereq": ["concept.physics.force"],
    "derives_from": [],
    "confidence": 0.99,
    "tags": ["mechanics", "newton", "dynamics"],
}

EMPTY_REGISTRY = {"all_ids": []}


def _critical_rules(result):
    return {issue.rule for issue in result.critical}


def test_invalid_domain_pattern_is_blocking():
    fact = copy.deepcopy(VALID_FACT)
    fact["domain"] = "Physics.Mechanics"
    result = validate_batch([fact], EMPTY_REGISTRY)
    assert not result.is_valid
    assert "schema_pattern" in _critical_rules(result)


def test_tags_must_be_array():
    fact = copy.deepcopy(VALID_FACT)
    fact["tags"] = "mechanics,newton,dynamics"
    result = validate_batch([fact], EMPTY_REGISTRY)
    assert not result.is_valid
    assert "schema_type" in _critical_rules(result)


def test_prereq_item_must_match_reference_pattern():
    fact = copy.deepcopy(VALID_FACT)
    fact["prereq"] = ["Bad Reference"]
    result = validate_batch([fact], EMPTY_REGISTRY)
    assert not result.is_valid
    assert "schema_pattern" in _critical_rules(result)


def test_statement_must_be_string():
    fact = copy.deepcopy(VALID_FACT)
    fact["statement"] = 42
    result = validate_batch([fact], EMPTY_REGISTRY)
    assert not result.is_valid
    assert "schema_type" in _critical_rules(result)
