"""Tests for validate.py — 12 cases from TZ_CLAUDE_CODE."""
from __future__ import annotations

import copy
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from validate import (  # noqa: E402
    load_schema,
    validate_batch,
    validate_fact,
)


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
    "limits": [
        "Не применимо при v близких к c",
        "Не применимо для квантовых объектов",
    ],
    "prereq": [
        "concept.physics.force",
        "concept.physics.mass",
        "concept.physics.acceleration",
    ],
    "derives_from": [],
    "confidence": 0.99,
    "tags": ["mechanics", "newton", "dynamics", "force"],
}

EMPTY_REGISTRY = {"all_ids": []}


def _critical_rules(issues):
    return {i.rule for i in issues if i.level == "critical"}


def _warning_rules(issues):
    return {i.rule for i in issues if i.level == "warning"}


def test_1_valid_fact_passes():
    """Тест 1: валидный факт проходит без критических ошибок."""
    result = validate_batch([VALID_FACT], EMPTY_REGISTRY)
    assert result.is_valid
    assert result.critical == []


def test_2_missing_required_field():
    """Тест 2: отсутствующее обязательное поле → критическая ошибка."""
    fact = copy.deepcopy(VALID_FACT)
    del fact["statement"]
    result = validate_batch([fact], EMPTY_REGISTRY)
    assert not result.is_valid
    assert "missing_required_field" in _critical_rules(result.critical)


def test_3_invalid_type():
    """Тест 3: неверный type → критическая ошибка."""
    fact = copy.deepcopy(VALID_FACT)
    fact["type"] = "not_a_real_type"
    result = validate_batch([fact], EMPTY_REGISTRY)
    assert "invalid_type" in _critical_rules(result.critical)


def test_4_confidence_1_for_law():
    """Тест 4: confidence=1.0 для type=law → критическая ошибка."""
    fact = copy.deepcopy(VALID_FACT)
    fact["confidence"] = 1.0
    result = validate_batch([fact], EMPTY_REGISTRY)
    assert "confidence_type_mismatch" in _critical_rules(result.critical)


def test_5_id_two_segments():
    """Тест 5: id с 2 сегментами → критическая ошибка."""
    fact = copy.deepcopy(VALID_FACT)
    fact["id"] = "theorem.pythagoras"
    result = validate_batch([fact], EMPTY_REGISTRY)
    assert "invalid_id_format" in _critical_rules(result.critical)


def test_6_id_uppercase():
    """Тест 6: id с заглавными буквами → критическая ошибка."""
    fact = copy.deepcopy(VALID_FACT)
    fact["id"] = "Law.Physics.Newton"
    result = validate_batch([fact], EMPTY_REGISTRY)
    assert "invalid_id_format" in _critical_rules(result.critical)


def test_7_pedagogical_signal():
    """Тест 7: педагогический сигнал в statement → warning."""
    fact = copy.deepcopy(VALID_FACT)
    fact["statement"] = "Этот закон используется для расчёта сил в инженерных задачах."
    result = validate_batch([fact], EMPTY_REGISTRY)
    assert result.is_valid  # warnings don't block
    assert "pedagogical_signal" in _warning_rules(result.warnings)


def test_8_missing_limits_for_law():
    """Тест 8: нет limits для law → warning."""
    fact = copy.deepcopy(VALID_FACT)
    fact["limits"] = []
    result = validate_batch([fact], EMPTY_REGISTRY)
    assert "missing_limits" in _warning_rules(result.warnings)


def test_9_missing_formal_notation_for_theorem():
    """Тест 9: нет formal_notation для theorem → warning."""
    fact = copy.deepcopy(VALID_FACT)
    fact["id"] = "theorem.math.calculus.fundamental"
    fact["type"] = "theorem"
    fact["domain"] = "math.calculus"
    fact["subtopic"] = "math.calculus.integrals"
    fact["confidence"] = 0.99
    fact["formal_notation"] = None
    result = validate_batch([fact], EMPTY_REGISTRY)
    assert "missing_formal_notation" in _warning_rules(result.warnings)


def test_10_duplicate_id_in_batch():
    """Тест 10: дублирующийся id в батче → критическая ошибка."""
    fact_a = copy.deepcopy(VALID_FACT)
    fact_b = copy.deepcopy(VALID_FACT)  # same id
    result = validate_batch([fact_a, fact_b], EMPTY_REGISTRY)
    assert "duplicate_id_in_batch" in _critical_rules(result.critical)


def test_11_duplicate_id_in_registry():
    """Тест 11: дублирующийся id в реестре → критическая ошибка."""
    registry = {"all_ids": [VALID_FACT["id"]]}
    result = validate_batch([copy.deepcopy(VALID_FACT)], registry)
    assert "duplicate_id_in_registry" in _critical_rules(result.critical)


def test_12_forbidden_field_title():
    """Тест 12: forbidden field 'title' → критическая ошибка."""
    fact = copy.deepcopy(VALID_FACT)
    fact["title"] = "Newton's Second Law"
    result = validate_batch([fact], EMPTY_REGISTRY)
    assert "forbidden_field" in _critical_rules(result.critical)
