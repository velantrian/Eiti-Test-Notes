"""v14.3.0: KB expansion (gen_more.py sections, compact v3 generated shards) — version sync and assets."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
SW = (ROOT / "sw.js").read_text(encoding="utf-8")


def test_version_sync():
    assert 'var EITI_VERSION = "14.3.0"' in HTML
    assert "var CACHE = 'eiti-v14.3.0'" in SW
    assert "var OFFLINE_CACHE = 'eiti-offline-v14.3.0'" in SW
    assert "version: '14.3.0'" in SW
    assert "v14.3.0" in json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))["description"]
    assert "version-14.3.0" in (ROOT / "README.md").read_text(encoding="utf-8")


def test_gen_more_sections_present():
    assert (ROOT / "kb" / "gen" / "gen_more.py").exists()
    for d in ("space", "dinosaurs", "airports", "myths"):
        assert (ROOT / "kb" / "src" / ("w_%s.txt" % d)).exists()


def test_generated_shards_are_compact_v3():
    v3 = [p for p in (ROOT / "kb" / "idx").glob("*.json") if json.loads(p.read_text(encoding="utf-8")).get("v") == 3]
    assert len(v3) >= 30
    for p in v3:
        d = json.loads(p.read_text(encoding="utf-8"))
        assert d["g"] == 1 and d["pp"] > 0 and isinstance(d["px"], list) and d["e"]
