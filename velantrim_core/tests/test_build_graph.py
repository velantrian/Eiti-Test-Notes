"""Tests for build_graph.py — assembling graph.json from collected batches.

Covers edge construction, dangling-ref filtering, and last-batch-wins dedupe.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from build_graph import build_edges, load_facts  # noqa: E402


# ── build_edges ────────────────────────────────────────────────────────────

def test_requires_edge_built_for_resolved_prereq():
    facts = [{"id": "x", "prereq": ["y"]}, {"id": "y"}]
    edges, dangling = build_edges(facts)
    assert {"from": "x", "to": "y", "type": "requires"} in edges
    assert dangling == 0


def test_dangling_prereq_filtered_and_counted():
    facts = [{"id": "x", "prereq": ["y", "missing"]}, {"id": "y"}]
    edges, dangling = build_edges(facts)
    assert {"from": "x", "to": "y", "type": "requires"} in edges
    assert all(e["to"] != "missing" for e in edges)
    assert dangling == 1


def test_derives_from_edge_type():
    facts = [{"id": "x", "derives_from": ["y"]}, {"id": "y"}]
    edges, _ = build_edges(facts)
    assert {"from": "x", "to": "y", "type": "derived_from"} in edges


def test_no_refs_produces_no_edges():
    facts = [{"id": "x"}, {"id": "y"}]
    edges, dangling = build_edges(facts)
    assert edges == []
    assert dangling == 0


# ── load_facts (dedupe, last batch wins) ───────────────────────────────────

def test_load_facts_dedupes_last_wins(tmp_path: Path):
    b1 = tmp_path / "001.json"
    b2 = tmp_path / "002.json"
    b1.write_text(json.dumps([{"id": "a", "v": 1}]), encoding="utf-8")
    b2.write_text(json.dumps([{"id": "a", "v": 2}, {"id": "b"}]), encoding="utf-8")
    facts = load_facts([b2, b1])  # passed unsorted; load_facts sorts paths
    by_id = {f["id"]: f for f in facts}
    assert by_id["a"]["v"] == 2  # 002 sorts after 001 → wins
    assert "b" in by_id


def test_load_facts_skips_non_list_payloads(tmp_path: Path):
    good = tmp_path / "001.json"
    bad = tmp_path / "002.json"
    good.write_text(json.dumps([{"id": "a"}]), encoding="utf-8")
    bad.write_text(json.dumps({"not": "a list"}), encoding="utf-8")
    facts = load_facts([good, bad])
    assert [f["id"] for f in facts] == ["a"]
