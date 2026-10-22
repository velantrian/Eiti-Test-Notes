"""v13.7.23: ↶↷ в шапке заметки для любых правок, Аб в меню ⋯, теги без пустой полосы."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
INDEX = (ROOT / "index.html").read_text(encoding="utf-8")


def test_version_is_13_7_23():
    assert 'var EITI_VERSION = "13.7.23"' in INDEX
    assert "var CACHE = 'eiti-v13.7.23'" in (ROOT / "sw.js").read_text(encoding="utf-8")


def test_undo_redo_in_header_before_copy():
    head = INDEX[INDEX.index('<div class="note-editor-topbar-actions">'):INDEX.index('id="noteMoreBtn"')]
    assert head.index('id="noteUndoBtn"') < head.index('id="noteRedoBtn"') < head.index('id="noteCopyAllBtn"')
    assert 'title="Отменить"' in head and 'title="Повторить"' in head
    assert 'id="noteAiTools"' not in INDEX


def test_history_limit_and_grouping_constants():
    assert "var EITI_NOTE_UNDO_LIMIT = 50;" in INDEX
    assert "var EITI_NOTE_UNDO_GROUP_MS = 700;" in INDEX


def test_hl_toggle_in_more_menu():
    menu = INDEX[INDEX.index('<div id="noteMoreMenu"'):]
    menu = menu[: menu.index("</div>")]
    assert 'id="noteHlToggle"' in menu and "Подсветка правок ИИ" in menu


def test_tags_row_no_reserved_gap_without_ai():
    assert ".note-editor-overlay.active .note-tags-row { padding-bottom: 52px; }" not in INDEX
    assert re.search(r"\.note-editor-overlay\.active \.note-tags-row \{ padding-bottom: calc\(6px", INDEX)
