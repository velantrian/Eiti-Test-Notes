"""v14.0.0: offline dialogs — version sync, offline/ assets, SW cache, settings."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
SW = (ROOT / "sw.js").read_text(encoding="utf-8")


def test_version_sync():
    assert 'var EITI_VERSION = "14.0.0"' in HTML
    assert "var CACHE = 'eiti-v14.0.0'" in SW
    assert "version: '14.0.0'" in SW
    assert "v14.0.0" in json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))["description"]
    assert "version-14.0.0" in (ROOT / "README.md").read_text(encoding="utf-8")


def test_offline_assets_and_manifest():
    core = json.loads((ROOT / "offline/core.json").read_text(encoding="utf-8"))
    assert len(core["intents"]) > 400
    files = [p["file"] for p in core["packs"].values()] + [p["file"] for p in core["intentPacks"].values()] + [g["file"] for g in core["tales"]["groups"].values()]
    for f in files:
        assert (ROOT / "offline" / f).is_file(), f
    assert (ROOT / "offline/eiti_offline_dialogs.js").is_file()


def test_sw_offline_cache_and_style_setting():
    assert "OFFLINE_CACHE" in SW and "offline/" in SW
    for v in ("auto", "warm", "polite", "casual", "pro", "fun"):
        assert re.search(r'<option value="%s">' % v, HTML), v
    assert "localStorage.setItem('eiti_offline_state" not in HTML  # dialog state lives in IndexedDB
