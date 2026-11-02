"""v14.16.13: compact tabs — bottom bar only, header/icons untouched."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
HTML=(ROOT/"index.html").read_text(encoding="utf-8")
SW=(ROOT/"sw.js").read_text(encoding="utf-8")
def test_version_sync():
    assert 'var EITI_VERSION = "14.16.13"' in HTML
    assert "var CACHE = 'eiti-v14.16.13'" in SW
def test_compact_bottom_only():
    assert "eiti-compact-chrome" in HTML
    assert 'id="eiti-compact-chrome-toggle"' in HTML
    # must NOT shrink header/icons via compact class
    assert "html.eiti-compact-chrome .app-header" not in HTML
    assert "html.eiti-compact-chrome .tab-icon-wrapper" not in HTML
    assert "html.eiti-compact-chrome .tab-bar" in HTML
    assert "height: 96px" in HTML
