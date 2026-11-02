"""v14.16.6: composer undo/redo arrows + settings toggle."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
HTML=(ROOT/"index.html").read_text(encoding="utf-8")
SW=(ROOT/"sw.js").read_text(encoding="utf-8")

def test_version_sync():
    assert 'var EITI_VERSION = "14.16.6"' in HTML
    assert "var CACHE = 'eiti-v14.16.6'" in SW
    assert "v14.16.6" in json.loads((ROOT/"manifest.json").read_text(encoding="utf-8"))["description"]

def test_undo_wiring():
    assert 'id="eiti-composer-undo"' in HTML and 'id="eiti-composer-redo"' in HTML
    assert 'id="eiti-composer-undo-toggle"' in HTML
    assert 'data-i18n="↩️↪️ Отмена / повтор ввода"' in HTML
    assert 'data-i18n-aria="Отмена и повтор ввода"' in HTML
    assert 'eitiComposerUndoInit' in HTML or 'eitiComposerUndoSetVisible' in HTML
