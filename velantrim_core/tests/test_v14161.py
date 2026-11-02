"""v14.16.1: KB expansion to 150,000 records (version checks moved to v14.16.2)."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HTML = (ROOT / "index.html").read_text(encoding="utf-8")


def test_version_sync():
    """Current version checks moved to test_v14162.py (v14.16.2)."""
    assert "v14.16.1" in HTML or "14.16.1" in HTML
