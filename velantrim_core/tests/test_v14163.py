"""v14.16.3: single ChatGPT-like composer pill."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
SW = (ROOT / "sw.js").read_text(encoding="utf-8")

def test_version_sync():
    assert 'var EITI_VERSION = "14.16.3"' in HTML
    assert "var CACHE = 'eiti-v14.16.3'" in SW
    assert "v14.16.3" in json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))["description"]

def test_single_pill_shell():
    assert "одна общая пилюля" in HTML
    assert "border:0 !important" in HTML
