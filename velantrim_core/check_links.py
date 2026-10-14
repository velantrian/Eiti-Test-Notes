"""Check referential integrity across all collected batches."""
from __future__ import annotations

import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

import click

ROOT = Path(__file__).resolve().parent
RAW_DIR = ROOT / "data" / "raw"


def load_facts(paths: list[Path]) -> list[dict]:
    facts: list[dict] = []
    for p in paths:
        data = json.loads(p.read_text(encoding="utf-8"))
        if isinstance(data, list):
            facts.extend(data)
    return facts


def find_cycles(edges: dict[str, set[str]]) -> list[list[str]]:
    """DFS to find any cycle in a directed graph keyed by id."""
    WHITE, GREY, BLACK = 0, 1, 2
    color: dict[str, int] = defaultdict(int)
    parent: dict[str, str | None] = {}
    cycles: list[list[str]] = []

    def dfs(u: str) -> None:
        color[u] = GREY
        for v in edges.get(u, ()):
            if color[v] == WHITE:
                parent[v] = u
                dfs(v)
            elif color[v] == GREY:
                # back-edge u → v means cycle
                cycle = [v, u]
                cur = parent.get(u)
                while cur is not None and cur != v:
                    cycle.append(cur)
                    cur = parent.get(cur)
                cycle.reverse()
                cycles.append(cycle)
        color[u] = BLACK

    for node in list(edges.keys()):
        if color[node] == WHITE:
            parent[node] = None
            dfs(node)
    return cycles


def check_links(facts: list[dict]) -> dict:
    all_ids = {f["id"] for f in facts if isinstance(f.get("id"), str)}

    prereq_edges: dict[str, set[str]] = defaultdict(set)
    derives_edges: dict[str, set[str]] = defaultdict(set)

    broken_prereq: Counter[str] = Counter()
    broken_derives: Counter[str] = Counter()
    prereq_count = 0
    derives_count = 0

    for f in facts:
        fid = f.get("id")
        if not isinstance(fid, str):
            continue
        for ref in f.get("prereq") or []:
            prereq_count += 1
            if ref not in all_ids:
                broken_prereq[ref] += 1
            else:
                prereq_edges[fid].add(ref)
        for ref in f.get("derives_from") or []:
            derives_count += 1
            if ref not in all_ids:
                broken_derives[ref] += 1
            else:
                derives_edges[fid].add(ref)

    cycles_prereq = find_cycles(prereq_edges)
    cycles_derives = find_cycles(derives_edges)

    return {
        "total_facts": len(facts),
        "prereq_count": prereq_count,
        "derives_count": derives_count,
        "broken_prereq": broken_prereq,
        "broken_derives": broken_derives,
        "cycles_prereq": cycles_prereq,
        "cycles_derives": cycles_derives,
    }


def print_report(report: dict, file_count: int) -> None:
    click.echo(
        f"Проверка ссылок: все батчи ({file_count} файлов, "
        f"{report['total_facts']} фактов)"
    )
    click.echo("═" * 60)
    click.echo(f"🔗 Всего prereq ссылок: {report['prereq_count']}")
    click.echo(f"🔗 Всего derives_from ссылок: {report['derives_count']}")
    click.echo()

    bp = sum(report["broken_prereq"].values())
    bd = sum(report["broken_derives"].values())
    pct_p = (bp / report["prereq_count"] * 100) if report["prereq_count"] else 0
    pct_d = (bd / report["derives_count"] * 100) if report["derives_count"] else 0

    click.echo(f"⚠️  Оборванных prereq: {bp} ({pct_p:.1f}%) — норма < 5%")
    click.echo(f"⚠️  Оборванных derives_from: {bd} ({pct_d:.1f}%)")
    cycles = report["cycles_prereq"] + report["cycles_derives"]
    click.echo(f"{'❌' if cycles else '✅'} Циклов: {len(cycles)}")
    click.echo()

    if report["broken_prereq"]:
        click.echo("Оборванные ссылки (топ-10):")
        for ref, n in report["broken_prereq"].most_common(10):
            click.echo(f"  {ref:<50} ← упоминается {n} раз, не собран")
        click.echo()

    if cycles:
        click.echo("Циклы:")
        for cyc in cycles[:5]:
            click.echo(f"  {' → '.join(cyc + [cyc[0]])}")


@click.command()
@click.argument("path", required=False)
@click.option("--summary", is_flag=True, help="Только сводка")
def main(path: str | None, summary: bool) -> None:
    """Check referential integrity (prereq / derives_from)."""
    if path:
        paths = [Path(path)]
    else:
        paths = sorted(RAW_DIR.glob("*.json"))
        if not paths:
            click.echo("Нет батчей в data/raw/")
            sys.exit(0)

    facts = load_facts(paths)
    report = check_links(facts)

    if summary:
        bp = sum(report["broken_prereq"].values())
        bd = sum(report["broken_derives"].values())
        cycles = len(report["cycles_prereq"]) + len(report["cycles_derives"])
        click.echo(
            f"facts={report['total_facts']} | broken_prereq={bp} | "
            f"broken_derives={bd} | cycles={cycles}"
        )
    else:
        print_report(report, len(paths))


if __name__ == "__main__":
    main()
