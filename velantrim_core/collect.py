"""Velantrim Core KB — batch collector via Anthropic API."""
from __future__ import annotations

import json
import os
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import click

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from validate import (  # noqa: E402
    ALLOWED_TIERS,
    load_registry,
    load_schema,
    print_validation_report,
    validate_batch,
)

ROOT = Path(__file__).resolve().parent
PROMPT_PATH = ROOT / "prompts" / "collect_batch.txt"
REGISTRY_PATH = ROOT / "registry" / "collected.json"
RAW_DIR = ROOT / "data" / "raw"
ERRORS_DIR = RAW_DIR / "errors"

DEFAULT_MODEL = os.environ.get("MODEL", "claude-opus-4-5")
MAX_TOKENS = int(os.environ.get("MAX_TOKENS", "8192"))
SYSTEM_PROMPT = "Ты точный научный редактор. Возвращаешь только валидный JSON."


def save_registry(registry: dict) -> None:
    REGISTRY_PATH.parent.mkdir(parents=True, exist_ok=True)
    REGISTRY_PATH.write_text(
        json.dumps(registry, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def load_prompt_template() -> str:
    return PROMPT_PATH.read_text(encoding="utf-8")


def infer_domain(subtopic: str) -> str:
    """`physics.mechanics.dynamics` → `physics.mechanics`."""
    parts = subtopic.split(".")
    if len(parts) < 2:
        return subtopic
    return ".".join(parts[:-1])


def fill_prompt(
    template: str,
    subtopic: str,
    domain: str,
    tier: str,
    registry: dict,
) -> str:
    all_ids = registry.get("all_ids", [])
    if len(all_ids) > 200:
        # filter to same domain to stay within context
        scoped = [i for i in all_ids if domain in i]
        existing = scoped[:200] if scoped else all_ids[:200]
    else:
        existing = all_ids
    existing_block = "\n".join(existing) if existing else "(пусто)"
    covered = registry.get("covered_subtopics", [])
    covered_block = "\n".join(covered) if covered else "(пусто)"
    return template.format(
        subtopic=subtopic,
        domain=domain,
        tier=tier,
        existing_ids=existing_block,
        covered_subtopics=covered_block,
    )


def call_anthropic_api(prompt: str, model: str, retries: int = 3) -> str:
    """Call Anthropic API with retries on rate-limit / network errors."""
    try:
        import anthropic  # type: ignore
    except ImportError:
        raise click.ClickException(
            "Пакет 'anthropic' не установлен. Запусти: pip install -r requirements.txt"
        )

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise click.ClickException(
            "ANTHROPIC_API_KEY не задан в окружении (см. .env.example)"
        )

    client = anthropic.Anthropic(api_key=api_key)
    last_err: Exception | None = None
    for attempt in range(retries):
        try:
            msg = client.messages.create(
                model=model,
                max_tokens=MAX_TOKENS,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": prompt}],
            )
            parts = [b.text for b in msg.content if getattr(b, "type", "") == "text"]
            return "".join(parts)
        except Exception as e:  # noqa: BLE001
            last_err = e
            if attempt < retries - 1:
                wait = 30 * (attempt + 1)
                click.echo(f"⚠️  API ошибка ({e}). Жду {wait}с и пробую снова...")
                time.sleep(wait)
    raise click.ClickException(f"API упал после {retries} попыток: {last_err}")


def extract_json_from_response(response: str) -> list[dict]:
    """Pull a JSON array out of the model response."""
    # 1. direct parse
    try:
        data = json.loads(response)
        if isinstance(data, list):
            return data
    except json.JSONDecodeError:
        pass

    # 2. ```json ... ``` fence
    fence = re.search(r"```(?:json)?\s*(\[.*?\])\s*```", response, re.DOTALL)
    if fence:
        try:
            return json.loads(fence.group(1))
        except json.JSONDecodeError:
            pass

    # 3. first [...] block
    start = response.find("[")
    end = response.rfind("]")
    if start != -1 and end != -1 and end > start:
        candidate = response[start : end + 1]
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            pass

    raise ValueError("Не удалось извлечь JSON массив из ответа модели")


def save_batch(facts: list[dict], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(facts, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def save_error_response(subtopic: str, response: str) -> Path:
    ERRORS_DIR.mkdir(parents=True, exist_ok=True)
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    safe = subtopic.replace(".", "_")
    path = ERRORS_DIR / f"{ts}_{safe}.txt"
    path.write_text(response, encoding="utf-8")
    return path


def batch_filename(subtopic: str, registry: dict) -> Path:
    domain_parts = subtopic.replace(".", "_")
    batch_number = len(registry.get("batches", [])) + 1
    return RAW_DIR / f"{domain_parts}_{batch_number:03d}.json"


def update_registry(
    registry: dict,
    facts: list[dict],
    subtopic: str,
    filename: str,
) -> dict:
    new_ids = [f["id"] for f in facts if isinstance(f.get("id"), str)]
    registry.setdefault("all_ids", []).extend(new_ids)
    covered = registry.setdefault("covered_subtopics", [])
    if subtopic not in covered:
        covered.append(subtopic)
    registry["total_facts"] = registry.get("total_facts", 0) + len(facts)
    by_tier = registry.setdefault("by_tier", {})
    by_domain = registry.setdefault("by_domain", {})
    for f in facts:
        tier = f.get("tier")
        if tier:
            by_tier[tier] = by_tier.get(tier, 0) + 1
        domain = f.get("domain")
        if domain:
            by_domain[domain] = by_domain.get(domain, 0) + 1
    registry.setdefault("batches", []).append({
        "filename": filename,
        "subtopic": subtopic,
        "count": len(facts),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    registry["last_updated"] = datetime.now(timezone.utc).isoformat()
    return registry


def interactive_prompt(registry: dict) -> tuple[str, str, str, bool]:
    click.echo("╔═══════════════════════════════════════════╗")
    click.echo("║   Velantrim Core KB — Сбор знаний v3.2   ║")
    click.echo("╚═══════════════════════════════════════════╝")
    click.echo()
    click.echo("📊 Текущее состояние базы:")
    click.echo(f"   Фактов всего: {registry.get('total_facts', 0)}")
    click.echo(f"   Батчей: {len(registry.get('batches', []))}")
    bt = registry.get("by_tier", {})
    click.echo(
        f"   invariant: {bt.get('invariant', 0)} | variant: {bt.get('variant', 0)} | "
        f"practical: {bt.get('practical', 0)}"
    )
    click.echo(
        f"   logic: {bt.get('logic', 0)} | frontier: {bt.get('frontier', 0)} | "
        f"abstract: {bt.get('abstract', 0)}"
    )
    click.echo()
    subtopic = click.prompt("Введи subtopic")
    tier = click.prompt(
        "Tier [invariant/variant/practical/logic/frontier/abstract]",
        default="invariant",
    )
    model = click.prompt("Модель", default=DEFAULT_MODEL)
    dry = click.confirm("Только вывести промпт?", default=False)
    return subtopic, tier, model, dry


@click.command()
@click.option("--subtopic", help="Подтема, например physics.mechanics.dynamics")
@click.option(
    "--tier",
    type=click.Choice(sorted(ALLOWED_TIERS)),
    help="Эпистемический тир",
)
@click.option("--domain", help="Домен (по умолчанию выводится из subtopic)")
@click.option("--model", default=None, help="Модель Anthropic")
@click.option(
    "--dry-run",
    is_flag=True,
    help="Только вывести промпт, без API-вызова и записи",
)
def main(
    subtopic: str | None,
    tier: str | None,
    domain: str | None,
    model: str | None,
    dry_run: bool,
) -> None:
    """Collect a batch of 25 facts for given subtopic/tier."""
    registry = load_registry()

    if not subtopic or not tier:
        subtopic, tier, model_choice, interactive_dry = interactive_prompt(registry)
        if model is None:
            model = model_choice
        if not dry_run:
            dry_run = interactive_dry

    if model is None:
        model = DEFAULT_MODEL

    if subtopic in registry.get("covered_subtopics", []):
        if not click.confirm(
            f"⚠️  Подтема '{subtopic}' уже покрыта. Собрать ещё один батч?",
            default=False,
        ):
            click.echo("Отменено.")
            sys.exit(0)

    if domain is None:
        domain = infer_domain(subtopic)

    template = load_prompt_template()
    prompt = fill_prompt(template, subtopic, domain, tier, registry)

    if dry_run:
        click.echo(prompt)
        return

    click.echo("📡 Вызываю API...")
    response = call_anthropic_api(prompt, model)

    try:
        facts = extract_json_from_response(response)
    except ValueError as e:
        err_path = save_error_response(subtopic, response)
        click.echo(f"❌ {e}")
        click.echo(f"💾 Сырой ответ сохранён: {err_path}")
        sys.exit(1)

    if len(facts) < 25:
        click.echo(f"⚠️  Получено {len(facts)}/25 фактов")
        if not click.confirm("Сохранить частичный батч?", default=False):
            sys.exit(1)
    elif len(facts) > 25:
        click.echo(f"⚠️  Получено {len(facts)} фактов, беру первые 25")
        facts = facts[:25]

    click.echo("🔍 Валидация...")
    schema = load_schema()
    result = validate_batch(facts, registry, schema)
    print_validation_report(result, "<batch>")

    if not result.is_valid:
        if not click.confirm("Сохранить всё равно?", default=False):
            sys.exit(1)

    filename = batch_filename(subtopic, registry)
    save_batch(facts, filename)
    registry = update_registry(registry, facts, subtopic, str(filename.relative_to(ROOT)))
    save_registry(registry)

    click.echo()
    click.echo(f"✅ Сохранено: {filename}")
    click.echo(f"📊 Фактов в батче: {len(facts)}")
    click.echo(f"📊 Всего в базе: {registry['total_facts']}")
    click.echo(f"⚠️  Предупреждений: {len(result.warnings)}")


if __name__ == "__main__":
    main()
