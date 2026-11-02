"""v14.16.7: offline gold typing dots + keep undo i18n."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
HTML=(ROOT/"index.html").read_text(encoding="utf-8")
SW=(ROOT/"sw.js").read_text(encoding="utf-8")

def test_version_sync():
    assert 'var EITI_VERSION = "14.16.7"' in HTML
    assert "var CACHE = 'eiti-v14.16.7'" in SW
    assert "v14.16.7" in json.loads((ROOT/"manifest.json").read_text(encoding="utf-8"))["description"]

def test_offline_typing():
    assert "eiti-typing-offline" in HTML
    assert "eitiShowOfflineTyping" in HTML
    assert "eitiWithOfflineTyping" in HTML
