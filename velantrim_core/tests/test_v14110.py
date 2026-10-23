"""v14.11.0: 🎤 dictation in the input field, voice assistant in «+», version sync."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
SW = (ROOT / "sw.js").read_text(encoding="utf-8")


def test_version_sync():
    assert 'var EITI_VERSION = "14.11.0"' in HTML
    assert "var CACHE = 'eiti-v14.11.0'" in SW
    assert "var OFFLINE_CACHE = 'eiti-offline-v14.11.0'" in SW
    assert "version: '14.11.0'" in SW
    assert "v14.11.0" in json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))["description"]
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    assert "version-14.11.0" in readme and "Что нового в v14.11.0" in readme
    assert "v14.11.0" in (ROOT / "AGENTS.md").read_text(encoding="utf-8")


def test_dictation_wiring():
    assert 'onclick="eitiDictationToggle()"' in HTML
    assert "processLocally" in HTML and "eitiOpenVoiceSettings" in HTML
    assert 'id="rne-voice-settings-link"' in HTML
