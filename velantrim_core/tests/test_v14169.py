"""v14.16.12: compact tabs toggle in tab settings."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
HTML=(ROOT/"index.html").read_text(encoding="utf-8")
SW=(ROOT/"sw.js").read_text(encoding="utf-8")
def test_version_sync():
    assert 'var EITI_VERSION = "14.16.12"' in HTML
    assert "var CACHE = 'eiti-v14.16.12'" in SW
    assert "v14.16.12" in json.loads((ROOT/"manifest.json").read_text(encoding="utf-8"))["description"]
def test_compact_chrome_toggle():
    assert "eiti-compact-chrome" in HTML
    assert 'id="eiti-compact-chrome-toggle"' in HTML
    assert "eitiSetCompactChrome" in HTML
    assert 'data-i18n="Компактные табы"' in HTML
    assert "height: 110px" in HTML and "height: 88px" in HTML
