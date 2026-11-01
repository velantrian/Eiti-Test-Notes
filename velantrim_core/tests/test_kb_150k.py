"""Regression for the exact combined core + Wikidata KB size."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_kb_index_has_exactly_150k_records():
    index = json.loads((ROOT / "kb/index.json").read_text(encoding="utf-8"))
    longtail = [name for name in index["domains"] if name.startswith("longtail_")]
    longtail_count = sum(index["domains"][name]["count"] for name in longtail)
    core_count = sum(meta["count"] for name, meta in index["domains"].items() if not name.startswith("longtail_"))
    assert index["count"] == 150_000
    assert len(longtail) == 24
    assert longtail_count == 118_459
    assert core_count == 31_541
    assert core_count + longtail_count == index["count"]
