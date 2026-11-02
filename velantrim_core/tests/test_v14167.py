"""v14.16.8 legacy — moved."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
HTML=(ROOT/"index.html").read_text(encoding="utf-8")
def test_version_sync():
    assert "var EITI_VERSION" in HTML
def test_offline_typing():
    assert "eiti-typing-offline" in HTML
