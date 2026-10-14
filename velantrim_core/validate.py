"""Validator for Velantrim Core KB facts v3.2."""
from __future__ import annotations

import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable

import click
import jsonschema

ROOT = Path(__file__).resolve().parent
SCHEMA_PATH = ROOT / "schema.json"
REGISTRY_PATH = ROOT / "registry" / "collected.json"
RAW_DIR = ROOT / "data" / "raw"

ALLOWED_TYPES = {
    "axiom", "definition", "lemma", "theorem", "corollary",
    "conjecture", "formula", "inference_rule", "law_of_thought",
    "fallacy", "bias", "paradox",
    "law", "principle", "postulate", "constant", "effect", "model",
    "concept", "fact", "relation", "mechanism", "pattern",
    "process", "technology", "method", "material",
    "estimate", "hypothesis", "open_problem",
}

ALLOWED_TIERS = {"invariant", "variant", "practical", "logic", "frontier", "abstract"}

REQUIRED_FIELDS = [
    "id", "schema_version", "domain", "subtopic",
    "tier", "type", "statement", "confidence", "tags",
]

FORBIDDEN_FIELDS = {
    "title", "examples", "why_it_matters", "common_confusions", "level",
}

ID_PATTERN = re.compile(
    r"^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*\.[a-z][a-z0-9_]+(\.[a-z][a-z0-9_]*)*(\.[a-z0-9_]+)?$"
)

TYPE_CONFIDENCE_RULES: dict[str, tuple[float, float]] = {
    "axiom": (1.0, 1.0),
    "law_of_thought": (1.0, 1.0),
    "definition": (1.0, 1.0),
    "inference_rule": (1.0, 1.0),
    "law": (0.90, 0.99),
    "principle": (0.90, 0.99),
    "postulate": (0.90, 0.99),
    "theorem": (0.90, 1.0),
    "corollary": (0.90, 1.0),
    "formula": (0.90, 1.0),
    "constant": (0.95, 1.0),
    "lemma": (0.90, 1.0),
    "conjecture": (0.30, 0.75),
    "fact": (0.40, 0.95),
    "estimate": (0.40, 0.90),
    "hypothesis": (0.10, 0.65),
    "open_problem": (0.10, 0.60),
    "effect": (0.70, 0.99),
    "model": (0.60, 0.95),
    "process": (0.70, 0.99),
    "technology": (0.70, 0.99),
    "method": (0.70, 0.99),
    "material": (0.70, 0.99),
    "fallacy": (0.90, 1.0),
    "bias": (0.80, 0.99),
    "paradox": (0.85, 1.0),
    "concept": (0.70, 1.0),
    "relation": (0.60, 0.95),
    "mechanism": (0.50, 0.95),
    "pattern": (0.40, 0.90),
}

PEDAGOGICAL_SIGNALS = [
    "для того чтобы", "позволяет нам", "используется для",
    "помогает нам", "мы можем", "можно использовать",
    "это важно", "стоит отметить", "следует помнить",
    "например", "допустим", "представьте",
    "нужно вычислить", "необходимо найти", "чтобы решить",
    "шаг", "подставим", "раскроем",
    "означает что", "иными словами", "другими словами",
    "таким образом", "отсюда следует что", "применяется в",
    "широко используется", "на практике", "в реальной жизни",
    "в быту", "инженеры используют",
]

NEEDS_FORMAL_NOTATION = {"law", "theorem", "formula", "axiom", "inference_rule"}
NEEDS_LIMITS = {"law", "principle", "postulate"}
NEEDS_DERIVES_FROM = {"theorem", "corollary", "formula"}


@dataclass
class ValidationIssue:
    level: str
    fact_index: int
    rule: str
    message: str


@dataclass
class ValidationResult:
    facts_count: int
    critical: list[ValidationIssue] = field(default_factory=list)
    warnings: list[ValidationIssue] = field(default_factory=list)

    @property
    def is_valid(self) -> bool:
        return not self.critical


def load_schema() -> dict:
    return json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))


def load_registry() -> dict:
    if not REGISTRY_PATH.exists():
        return {
            "schema_version": "3.2",
            "last_updated": "",
            "total_facts": 0,
            "by_tier": {t: 0 for t in ALLOWED_TIERS},
            "by_domain": {},
            "batches": [],
            "all_ids": [],
            "covered_subtopics": [],
        }
    return json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))


def check_id_format(id_str: str) -> bool:
    return bool(ID_PATTERN.match(id_str))


def check_confidence_range(type_str: str, confidence: float) -> tuple[bool, str]:
    rule = TYPE_CONFIDENCE_RULES.get(type_str)
    if rule is None:
        return True, ""
    lo, hi = rule
    if not (lo <= confidence <= hi):
        return False, f"ожидается [{lo}, {hi}], получено {confidence}"
    return True, ""


def check_pedagogical_signals(statement: str) -> list[str]:
    low = statement.lower()
    return [s for s in PEDAGOGICAL_SIGNALS if s in low]


def validate_fact(
    fact: dict,
    index: int,
    existing_ids: set[str],
    batch_ids: set[str],
) -> list[ValidationIssue]:
    """Apply semantic/business rules in addition to the mandatory JSON Schema gate."""
    issues: list[ValidationIssue] = []

    for f in FORBIDDEN_FIELDS:
        if f in fact:
            issues.append(ValidationIssue(
                "critical", index, "forbidden_field",
                f"Запрещённое поле '{f}' присутствует",
            ))

    missing = [f for f in REQUIRED_FIELDS if f not in fact]
    for f in missing:
        issues.append(ValidationIssue(
            "critical", index, "missing_required_field",
            f"Отсутствует обязательное поле: {f}",
        ))

    if "schema_version" in fact and fact["schema_version"] != "3.2":
        issues.append(ValidationIssue(
            "critical", index, "invalid_schema_version",
            f"schema_version должен быть '3.2', получен: {fact['schema_version']}",
        ))

    fid = fact.get("id")
    if isinstance(fid, str):
        if not check_id_format(fid):
            issues.append(ValidationIssue(
                "critical", index, "invalid_id_format",
                f"id '{fid}' не соответствует формату (≥3 сегмента, строчные a-z0-9_)",
            ))
        if fid in batch_ids:
            issues.append(ValidationIssue(
                "critical", index, "duplicate_id_in_batch",
                f"Дублирующийся id внутри батча: {fid}",
            ))
        if fid in existing_ids:
            issues.append(ValidationIssue(
                "critical", index, "duplicate_id_in_registry",
                f"id '{fid}' уже существует в реестре",
            ))

    t = fact.get("type")
    if t is not None and t not in ALLOWED_TYPES:
        issues.append(ValidationIssue(
            "critical", index, "invalid_type",
            f"type '{t}' не из реестра допустимых значений",
        ))

    tier = fact.get("tier")
    if tier is not None and tier not in ALLOWED_TIERS:
        issues.append(ValidationIssue(
            "critical", index, "invalid_tier",
            f"tier '{tier}' не из: invariant/variant/practical/logic/frontier/abstract",
        ))

    c = fact.get("confidence")
    if c is not None:
        if not isinstance(c, (int, float)) or isinstance(c, bool) or not (0.0 <= float(c) <= 1.0):
            issues.append(ValidationIssue(
                "critical", index, "confidence_out_of_range",
                f"confidence {c} вне [0.0, 1.0]",
            ))
        elif t in TYPE_CONFIDENCE_RULES:
            ok, _ = check_confidence_range(t, float(c))
            if not ok:
                lo, hi = TYPE_CONFIDENCE_RULES[t]
                issues.append(ValidationIssue(
                    "critical", index, "confidence_type_mismatch",
                    f"confidence={c} недопустим для type='{t}' (ожидается [{lo}, {hi}])",
                ))

    stmt = fact.get("statement", "")
    if isinstance(stmt, str) and len(stmt) > 250:
        issues.append(ValidationIssue(
            "critical", index, "statement_too_long",
            f"statement длиннее 250 символов ({len(stmt)})",
        ))

    if t in NEEDS_FORMAL_NOTATION and not fact.get("formal_notation"):
        issues.append(ValidationIssue(
            "warning", index, "missing_formal_notation",
            f"Нет formal_notation для type='{t}' — рекомендуется",
        ))
    if t in NEEDS_LIMITS and not fact.get("limits"):
        issues.append(ValidationIssue(
            "warning", index, "missing_limits",
            f"Нет limits для type='{t}' — рекомендуется",
        ))
    if not fact.get("conditions"):
        issues.append(ValidationIssue("warning", index, "missing_conditions", "Нет conditions"))
    if not fact.get("prereq"):
        issues.append(ValidationIssue(
            "warning", index, "empty_prereq", "Пустой prereq — факт-сирота",
        ))
    if t in NEEDS_DERIVES_FROM and not fact.get("derives_from"):
        issues.append(ValidationIssue(
            "warning", index, "empty_derives_from",
            f"Пустой derives_from для type='{t}' — ожидается ссылка на закон",
        ))

    tags = fact.get("tags") or []
    if isinstance(tags, list) and len(tags) < 3:
        issues.append(ValidationIssue(
            "warning", index, "few_tags", f"Менее 3 тегов ({len(tags)})",
        ))

    tx = fact.get("tier_extensions") or {}
    if isinstance(tx, dict):
        if tier == "variant":
            if "source" not in tx:
                issues.append(ValidationIssue(
                    "warning", index, "missing_tier_ext_source",
                    "Нет tier_extensions.source для tier='variant'",
                ))
            if "valid_from" not in tx:
                issues.append(ValidationIssue(
                    "warning", index, "missing_tier_ext_valid_from",
                    "Нет tier_extensions.valid_from для tier='variant'",
                ))
        if tier == "practical":
            if "scale" not in tx:
                issues.append(ValidationIssue(
                    "warning", index, "missing_tier_ext_scale",
                    "Нет tier_extensions.scale для tier='practical'",
                ))
            if "success_rate" not in tx:
                issues.append(ValidationIssue(
                    "warning", index, "missing_tier_ext_success_rate",
                    "Нет tier_extensions.success_rate для tier='practical'",
                ))

    if isinstance(stmt, str):
        for sig in check_pedagogical_signals(stmt):
            issues.append(ValidationIssue(
                "warning", index, "pedagogical_signal",
                f"Педагогический сигнал '{sig}' в statement",
            ))

    return issues


def _schema_issues(
    fact: object,
    index: int,
    validator: jsonschema.Draft202012Validator,
    schema: dict,
) -> list[ValidationIssue]:
    """Return every structural schema violation as a blocking issue.

    Manual validation may duplicate a friendlier diagnostic, but it must never
    suppress a JSON Schema failure. Schema validity is the structural admission
    gate; semantic/business checks can only add constraints.
    """
    issues: list[ValidationIssue] = []
    for err in validator.iter_errors(fact):
        path = ".".join(str(p) for p in err.absolute_path) or "<root>"
        if err.validator == "additionalProperties" and isinstance(fact, dict):
            extras = set(fact.keys()) - set(schema.get("properties", {}).keys())
            if extras:
                for extra in sorted(extras):
                    issues.append(ValidationIssue(
                        "critical", index, "forbidden_field",
                        f"Недопустимое поле '{extra}' (не в схеме)",
                    ))
                continue
        issues.append(ValidationIssue(
            "critical", index, f"schema_{err.validator}",
            f"Schema {err.validator} at {path}: {err.message}",
        ))
    return issues


def validate_batch(
    facts: Iterable[dict],
    registry: dict,
    schema: dict | None = None,
) -> ValidationResult:
    """Validate a batch against mandatory JSON Schema + semantic rules."""
    if schema is None:
        schema = load_schema()
    validator = jsonschema.Draft202012Validator(schema)

    existing = set(registry.get("all_ids", []))
    batch_ids: set[str] = set()
    facts_list = list(facts)
    result = ValidationResult(facts_count=len(facts_list))

    for i, fact in enumerate(facts_list):
        result.critical.extend(_schema_issues(fact, i, validator, schema))

        if not isinstance(fact, dict):
            continue

        for issue in validate_fact(fact, i, existing, batch_ids):
            if issue.level == "critical":
                result.critical.append(issue)
            else:
                result.warnings.append(issue)

        if isinstance(fact.get("id"), str):
            batch_ids.add(fact["id"])

    return result


def print_validation_report(result: ValidationResult, source: str = "") -> None:
    click.echo(f"Валидация: {source}")
    click.echo("═" * 60)
    click.echo(f"✅ Фактов: {result.facts_count}")
    click.echo(f"🔴 Критических ошибок: {len(result.critical)}")
    click.echo(f"⚠️  Предупреждений: {len(result.warnings)}")
    if result.critical or result.warnings:
        click.echo()
    for iss in result.critical:
        click.echo(f"  🔴 [fact #{iss.fact_index}] {iss.message}")
    for iss in result.warnings:
        click.echo(f"  ⚠️  [fact #{iss.fact_index}] {iss.message}")
    click.echo("─" * 60)
    if result.is_valid:
        click.echo("✅ Батч принят (0 критических ошибок)")
    else:
        click.echo(f"❌ Батч отклонён ({len(result.critical)} критических ошибок)")


@click.command()
@click.argument("path", required=False)
@click.option("--all", "all_batches", is_flag=True, help="Валидировать все батчи в data/raw")
@click.option("--summary", is_flag=True, help="Только сводка без деталей")
@click.option("--strict", is_flag=True, help="exit 1 если есть warnings (для CI)")
def main(path: str | None, all_batches: bool, summary: bool, strict: bool) -> None:
    """Validate Velantrim Core KB batches."""
    schema = load_schema()
    registry = load_registry()

    if all_batches:
        paths = sorted(RAW_DIR.glob("*.json"))
        if not paths:
            click.echo("Нет батчей в data/raw/")
            sys.exit(0)
    elif path:
        paths = [Path(path)]
    else:
        click.echo("Укажи путь к батчу или --all", err=True)
        sys.exit(2)

    total_critical = 0
    total_warnings = 0
    for p in paths:
        facts = json.loads(p.read_text(encoding="utf-8"))
        result = validate_batch(facts, registry, schema)
        if summary:
            status = "✅" if result.is_valid else "❌"
            click.echo(f"{status} {p.name}: 🔴 {len(result.critical)} | ⚠️  {len(result.warnings)}")
        else:
            print_validation_report(result, str(p))
            click.echo()
        total_critical += len(result.critical)
        total_warnings += len(result.warnings)

    if total_critical:
        sys.exit(1)
    if strict and total_warnings:
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    main()
