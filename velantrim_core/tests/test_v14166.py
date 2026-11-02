"""v14.16.6: legacy — version moved forward; undo wiring still checked."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
HTML=(ROOT/"index.html").read_text(encoding="utf-8")

def test_version_sync():
    assert "var EITI_VERSION" in HTML

def test_undo_wiring():
    assert 'id="eiti-composer-undo"' in HTML and 'id="eiti-composer-redo"' in HTML
    assert 'id="eiti-composer-undo-toggle"' in HTML
    assert 'data-i18n="↩️↪️ Отмена / повтор ввода"' in HTML
    assert 'data-i18n-aria="Отмена и повтор ввода"' in HTML
