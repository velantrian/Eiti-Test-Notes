"""Assemble graph.json from collected batches."""
from __future__ import annotations

import json
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import click

ROOT = Path(__file__).resolve().parent
RAW_DIR = ROOT / "data" / "raw"
OUTPUT_DEFAULT = ROOT / "output" / "graph.json"

ALLOWED_TIERS = ["invariant", "variant", "practical", "logic", "frontier", "abstract"]
RELATED_KEYS = ("related_logic", "related_abstract", "related_perceptions")


def load_facts(paths: list[Path]) -> list[dict]:
    """Load and dedupe facts by id (last batch wins)."""
    by_id: dict[str, dict] = {}
    for p in sorted(paths):
        data = json.loads(p.read_text(encoding="utf-8"))
        if not isinstance(data, list):
            continue
        for f in data:
            if isinstance(f.get("id"), str):
                by_id[f["id"]] = f
    return list(by_id.values())


def build_edges(facts: list[dict]) -> tuple[list[dict], int]:
    """Construct edges; return (edges, dangling_filtered)."""
    all_ids = {f["id"] for f in facts}
    edges: list[dict] = []
    dangling = 0

    for f in facts:
        fid = f["id"]
        for ref in f.get("prereq") or []:
            if ref in all_ids:
                edges.append({"from": fid, "to": ref, "type": "requires"})
            else:
                dangling += 1
        for ref in f.get("derives_from") or []:
            if ref in all_ids:
                edges.append({"from": fid, "to": ref, "type": "derived_from"})
            else:
                dangling += 1
        tx = f.get("tier_extensions") or {}
        for key in RELATED_KEYS:
            for ref in tx.get(key) or []:
                if ref in all_ids:
                    edges.append({"from": fid, "to": ref, "type": "related"})
                else:
                    dangling += 1

    return edges, dangling


def make_node(fact: dict) -> dict:
    return {
        "id": fact["id"],
        "tier": fact.get("tier"),
        "type": fact.get("type"),
        "domain": fact.get("domain"),
        "statement": fact.get("statement"),
        "confidence": fact.get("confidence"),
        "tags": fact.get("tags", []),
    }


def build_graph(facts: list[dict]) -> dict:
    nodes = [make_node(f) for f in facts]
    edges, dangling = build_edges(facts)

    by_tier = Counter(f.get("tier") for f in facts)
    by_domain = Counter(f.get("domain") for f in facts)

    return {
        "meta": {
            "schema_version": "3.2",
            "built_at": datetime.now(timezone.utc).isoformat(),
            "total_nodes": len(nodes),
            "total_edges": len(edges),
            "by_tier": {t: by_tier.get(t, 0) for t in ALLOWED_TIERS},
            "by_domain": dict(by_domain),
            "dangling_edges_filtered": dangling,
        },
        "nodes": nodes,
        "edges": edges,
    }


@click.command()
@click.option("--tier", type=click.Choice(ALLOWED_TIERS), help="Только из этого тира")
@click.option("--output", type=click.Path(), default=str(OUTPUT_DEFAULT), help="Куда сохранить")
@click.option("--dry-run", is_flag=True, help="Только статистика, не сохранять")
def main(tier: str | None, output: str, dry_run: bool) -> None:
    """Build graph.json from all batches in data/raw/."""
    paths = sorted(RAW_DIR.glob("*.json"))
    if not paths:
        click.echo("Нет батчей в data/raw/")
        sys.exit(0)

    facts = load_facts(paths)
    if tier:
        facts = [f for f in facts if f.get("tier") == tier]

    graph = build_graph(facts)
    meta = graph["meta"]

    click.echo("🏗️  Граф собран")
    click.echo("═" * 60)
    click.echo(f"📊 Узлов: {meta['total_nodes']}")
    click.echo(f"📊 Рёбер: {meta['total_edges']}")
    click.echo(f"⚠️  Висячих рёбер отфильтровано: {meta['dangling_edges_filtered']}")
    click.echo()
    click.echo("По тирам:")
    for t, n in meta["by_tier"].items():
        if n:
            click.echo(f"  {t:<12} {n}")
    if meta["by_domain"]:
        click.echo("По доменам (топ-10):")
        top = sorted(meta["by_domain"].items(), key=lambda kv: kv[1], reverse=True)[:10]
        for d, n in top:
            click.echo(f"  {d:<40} {n}")

    if dry_run:
        click.echo()
        click.echo("(--dry-run: не сохраняю)")
        return

    out_path = Path(output)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(
        json.dumps(graph, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    click.echo()
    click.echo(f"✅ Сохранено: {out_path}")


if __name__ == "__main__":
    main()
