"""v14.7.0: Google Drive — sign in once + auto-sync; version sync and wiring."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
SW = (ROOT / "sw.js").read_text(encoding="utf-8")


def test_version_sync():
    assert 'var EITI_VERSION = "14.7.0"' in HTML
    assert "var CACHE = 'eiti-v14.7.0'" in SW
    assert "var OFFLINE_CACHE = 'eiti-offline-v14.7.0'" in SW
    assert "version: '14.7.0'" in SW
    assert "v14.7.0" in json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))["description"]
    assert "version-14.7.0" in (ROOT / "README.md").read_text(encoding="utf-8")


def test_drive_wiring():
    assert (ROOT / "local" / "eiti_drive_sync.js").exists()
    assert "var EITI_GOOGLE_CLIENT_ID = ''" in HTML or "var EITI_GOOGLE_CLIENT_ID = '" in HTML
    assert "https://www.googleapis.com/auth/drive.file" in HTML
    # GIS and the merge engine are loaded lazily, never as static <script src>
    assert '<script src="https://accounts.google.com/gsi/client"' not in HTML
    assert 'src="local/eiti_drive_sync.js"' not in HTML
    assert "_loadScript('local/eiti_drive_sync.js'" in HTML
    assert "DEBOUNCE_MS = 8000" in HTML
    assert "prompt: first ? 'select_account consent' : ''" in HTML
