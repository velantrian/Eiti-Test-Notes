"""v14.16.11: compact header/tab-bar chrome."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
HTML=(ROOT/"index.html").read_text(encoding="utf-8")
SW=(ROOT/"sw.js").read_text(encoding="utf-8")
def test_version_sync():
    assert 'var EITI_VERSION = "14.16.11"' in HTML
    assert "var CACHE = 'eiti-v14.16.11'" in SW
    assert "v14.16.11" in json.loads((ROOT/"manifest.json").read_text(encoding="utf-8"))["description"]
def test_compact_chrome():
    assert ".tab-bar" in HTML and "height: 88px" in HTML
    assert ".app-header" in HTML and "height: 72px" in HTML
    assert "font-size: 30px" in HTML  # tab icons unchanged
    assert ".tab-label" in HTML and "font-size: 10px" in HTML
