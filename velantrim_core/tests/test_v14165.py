"""v14.16.5: legacy — version moved to v14.16.6 (undo/redo)."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
HTML=(ROOT/"index.html").read_text(encoding="utf-8")

def test_version_sync():
    # superseded by test_v14166
    assert "var EITI_VERSION" in HTML

def test_toolbar_layout():
    assert "order:1" in HTML and "flex-wrap:wrap" in HTML
    assert "ChatGPT composer: text full-width on top row" in HTML or "chat-composer-shell" in HTML
