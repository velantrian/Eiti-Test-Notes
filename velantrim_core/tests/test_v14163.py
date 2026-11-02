"""v14.16.3 pill (version checks moved)."""
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
HTML = (ROOT / "index.html").read_text(encoding="utf-8")

def test_version_sync():
    """Current version checks moved to test_v14164.py (v14.16.4)."""
    assert "одна общая пилюля" in HTML or "почти на весь горизонт" in HTML
