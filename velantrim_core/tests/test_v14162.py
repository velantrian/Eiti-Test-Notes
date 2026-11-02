"""v14.16.2: ChatGPT-like full-width composer + SW cache bump."""
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
    assert readme.index("Что нового в v14.16.2") < readme.index("Что нового в v14.16.1")
    assert "v14.16.2" in (ROOT / "AGENTS.md").read_text(encoding="utf-8")


def test_composer_is_flex_full_width():
    assert "overflow-wrap:anywhere" in HTML.replace(" ", "")
    assert "chat-composer-shell{" in HTML or ".chat-composer-shell{" in HTML
    assert "display:flex !important" in HTML
