"""Tests for check_links.py — referential-integrity checks over fact batches.

Covers the DFS cycle detector and the aggregate check_links() report
(broken-reference counting + cycle detection across prereq/derives_from).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from check_links import check_links, find_cycles, load_facts  # noqa: E402


# ── find_cycles ────────────────────────────────────────────────────────────

def test_acyclic_graph_has_no_cycles():
    assert find_cycles({"a": {"b"}, "b": set()}) == []


def test_two_node_cycle_detected():
    cycles = find_cycles({"a": {"b"}, "b": {"a"}})
    assert len(cycles) == 1
    assert set(cycles[0]) == {"a", "b"}


def test_self_loop_detected():
    cycles = find_cycles({"a": {"a"}})
    assert len(cycles) == 1
    assert "a" in cycles[0]


def test_three_node_cycle_detected():
    cycles = find_cycles({"a": {"b"}, "b": {"c"}, "c": {"a"}})
    assert len(cycles) == 1
    assert set(cycles[0]) == {"a", "b", "c"}


def test_empty_graph_has_no_cycles():
    assert find_cycles({}) == []


def test_disconnected_components_only_cyclic_one_flagged():
    edges = {"a": {"b"}, "b": set(), "x": {"y"}, "y": {"x"}}
    cycles = find_cycles(edges)
    assert len(cycles) == 1
    assert set(cycles[0]) == {"x", "y"}


# ── check_links (aggregate report) ─────────────────────────────────────────

def test_broken_prereq_counted():
    facts = [{"id": "a", "prereq": ["b", "zzz"]}, {"id": "b"}]
    report = check_links(facts)
    assert report["total_facts"] == 2
    assert report["prereq_count"] == 2
    assert report["broken_prereq"]["zzz"] == 1
    assert sum(report["broken_prereq"].values()) == 1


def test_broken_derives_counted():
    facts = [{"id": "a", "derives_from": ["missing"]}, {"id": "a2"}]
    report = check_links(facts)
    assert report["derives_count"] == 1
    assert report["broken_derives"]["missing"] == 1


def test_resolved_refs_produce_no_broken_and_no_cycles():
    facts = [{"id": "a", "prereq": ["b"]}, {"id": "b"}]
    report = check_links(facts)
    assert sum(report["broken_prereq"].values()) == 0
    assert report["cycles_prereq"] == []


def test_cycle_detected_through_prereq_edges():
    facts = [{"id": "a", "prereq": ["b"]}, {"id": "b", "prereq": ["a"]}]
    report = check_links(facts)
    assert len(report["cycles_prereq"]) >= 1


def test_facts_with_non_string_id_are_skipped():
    facts = [{"id": 123, "prereq": ["a"]}, {"id": "a"}]
    report = check_links(facts)
    # the non-string-id fact contributes no prereq edges/counts
    assert report["prereq_count"] == 0


# ── load_facts ─────────────────────────────────────────────────────────────

def test_load_facts_concatenates_list_batches(tmp_path: Path):
    p1 = tmp_path / "001.json"
    p2 = tmp_path / "002.json"
    p1.write_text(json.dumps([{"id": "a"}]), encoding="utf-8")
    p2.write_text(json.dumps([{"id": "b"}, {"id": "c"}]), encoding="utf-8")
    facts = load_facts([p1, p2])
    assert [f["id"] for f in facts] == ["a", "b", "c"]


def test_load_facts_ignores_non_list_payloads(tmp_path: Path):
    p1 = tmp_path / "001.json"
    p2 = tmp_path / "002.json"
    p1.write_text(json.dumps([{"id": "a"}]), encoding="utf-8")
    p2.write_text(json.dumps({"not": "a list"}), encoding="utf-8")
    facts = load_facts([p1, p2])
    assert [f["id"] for f in facts] == ["a"]
