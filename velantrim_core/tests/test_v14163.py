"""legacy stub."""
from pathlib import Path
HTML=(Path(__file__).resolve().parents[2]/"index.html").read_text(encoding="utf-8")
def test_version_sync():
    assert "ChatGPT composer" in HTML or "14.16" in HTML
