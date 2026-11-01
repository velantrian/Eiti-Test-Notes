"""v14.16.2: подробные офлайн-ответы KB — синхронизация версии и кеша SW."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
SW = (ROOT / "sw.js").read_text(encoding="utf-8")


def test_version_sync():
    assert 'var EITI_VERSION = "14.16.2"' in HTML
    assert "var CACHE = 'eiti-v14.16.2'" in SW
    assert "var OFFLINE_CACHE = 'eiti-offline-v14.16.2'" in SW
    assert "version: '14.16.2'" in SW
    assert "// VELANTRIM EITI — Service Worker v14.16.2" in SW
    assert "EITI_VERSION 14.16.2" in SW
    assert "v14.16.2" in json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))["description"]
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    assert "version-14.16.2" in readme
    assert readme.index("Что нового в v14.16.2") < readme.index("Что нового в v14.16.0") < readme.index("Что нового в v14.15.2")
    assert "v14.16.2" in (ROOT / "AGENTS.md").read_text(encoding="utf-8")


def test_new_modules_precached():
    assert "local/eiti_action_gate.js" in SW
    assert "local/eiti_care.js" in SW
