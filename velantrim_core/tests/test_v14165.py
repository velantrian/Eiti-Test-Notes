"""v14.16.5: ChatGPT toolbar-under-text composer."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
HTML=(ROOT/"index.html").read_text(encoding="utf-8")
SW=(ROOT/"sw.js").read_text(encoding="utf-8")

def test_version_sync():
    assert 'var EITI_VERSION = "14.16.5"' in HTML
    assert "var CACHE = 'eiti-v14.16.5'" in SW
    assert "v14.16.5" in json.loads((ROOT/"manifest.json").read_text(encoding="utf-8"))["description"]

def test_toolbar_layout():
    assert "order:1" in HTML and "flex-wrap:wrap" in HTML
    assert "ChatGPT composer: text full-width on top row" in HTML
