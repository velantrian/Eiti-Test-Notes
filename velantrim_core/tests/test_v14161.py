"""v14.16.1: KB expansion to 150,000 records and synchronized PWA cache version."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
SW = (ROOT / "sw.js").read_text(encoding="utf-8")


def test_version_sync():
    assert 'var EITI_VERSION = "14.16.1"' in HTML
    assert "var CACHE = 'eiti-v14.16.1'" in SW
    assert "var OFFLINE_CACHE = 'eiti-offline-v14.16.1'" in SW
    assert "version: '14.16.1'" in SW
    assert "// VELANTRIM EITI — Service Worker v14.16.1" in SW
    assert "EITI_VERSION 14.16.1" in SW
    assert "v14.16.1" in json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))["description"]
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    assert "version-14.16.1" in readme
    assert readme.index("Что нового в v14.16.1") < readme.index("Что нового в v14.16.0")
    assert "v14.16.1" in (ROOT / "AGENTS.md").read_text(encoding="utf-8")


def test_kb_index_has_exactly_150k_records():
    index = json.loads((ROOT / "kb/index.json").read_text(encoding="utf-8"))
    longtail = [name for name in index["domains"] if name.startswith("longtail_")]
    longtail_count = sum(index["domains"][name]["count"] for name in longtail)
    assert index["count"] == 150_000
    assert len(longtail) == 24
    assert longtail_count == 118_459
