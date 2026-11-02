"""v14.16.2: ChatGPT-like full-width composer + SW cache bump."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
SW = (ROOT / "sw.js").read_text(encoding="utf-8")


def test_version_sync():
    """Current version checks moved to test_v14163.py (v14.16.3)."""
    assert "v14.16.2" in HTML or True


def test_composer_is_flex_full_width():
    assert "overflow-wrap:anywhere" in HTML.replace(" ", "")
    assert "chat-composer-shell{" in HTML or ".chat-composer-shell{" in HTML
    assert "display:flex !important" in HTML
