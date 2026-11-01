"""v14.16.0: релиз шлюза AI-действий + EITI Care — синхронизация версии и кеша SW."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
SW = (ROOT / "sw.js").read_text(encoding="utf-8")


def test_version_sync_moved():
    """Current version checks moved to test_v14161.py (v14.16.1)."""
    assert "v14.16.0" in HTML and "v14.16.0" in SW


def test_new_modules_precached():
    assert "local/eiti_action_gate.js" in SW
    assert "local/eiti_care.js" in SW
