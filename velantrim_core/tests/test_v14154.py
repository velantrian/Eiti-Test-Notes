"""v14.15.4: карточка ввода как в ChatGPT, undo/redo ввода, «♻ в поле» (меню «+»), якорь прокрутки ответа."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
SW = (ROOT / "sw.js").read_text(encoding="utf-8")


def test_version_sync():
    assert 'var EITI_VERSION = "14.15.4"' in HTML
    assert "var CACHE = 'eiti-v14.15.4'" in SW
    assert "var OFFLINE_CACHE = 'eiti-offline-v14.15.4'" in SW
    assert "version: '14.15.4'" in SW
    assert "// VELANTRIM EITI — Service Worker v14.15.4" in SW
    assert "EITI_VERSION 14.15.4" in SW
    assert "v14.15.4" in json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))["description"]
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    assert "version-14.15.4" in readme
    assert readme.index("Что нового в v14.15.4") < readme.index("Что нового в v14.15.2")
    assert "v14.15.4" in (ROOT / "AGENTS.md").read_text(encoding="utf-8")


def _card():
    a = HTML.index('<div class="eiti-composer-card" id="eiti-composer-card">')
    b = HTML.index("<!-- Hidden: preserve IDs for JS -->", a)
    return HTML[a:b]


def test_card_layout_order():
    card = _card()
    row = card[card.index('id="eiti-composer-row"'):]
    assert card.index('id="input"') < card.index('id="eiti-composer-row"')
    ids = ["chat-plus-btn", "chat-classic-btns", "eiti-composer-undo", "eiti-composer-redo",
           "clearInputBtn", "eiti-composer-mic", "chat-attach-proxy", "send"]
    pos = [row.index('id="%s"' % i) for i in ids]
    assert pos == sorted(pos), pos
    # ♻ — существующая кнопка, не дубль, иконка та же
    assert HTML.count('id="clearInputBtn"') == 1
    assert re.search(r'id="clearInputBtn"[^>]*>♻</button>', row)


def test_inline_clear_switch_default_off_and_early():
    head = HTML[: HTML.index("</head>")]
    assert "localStorage.getItem('eiti_inline_clear') === '1'" in head
    assert "html.eiti-inline-clear-on .chat-input-panel .eiti-composer-row #clearInputBtn{ display:inline-flex" in HTML
    assert ".chat-input-panel .eiti-composer-row #clearInputBtn{ display:none !important; }" in HTML
    assert "item.id === 'clearInput' ?" in HTML and 'id="eiti-inline-clear-switch"' in HTML
    assert 'role="switch"' in HTML


def test_i18n_keys():
    for k, de, en in (("Отменить ввод", "Rückgängig", "Undo"), ("Повторить ввод", "Wiederholen", "Redo"),
                      ("Кнопка очистки в поле", "Löschtaste im Eingabefeld", "Clear button in the field")):
        assert "'%s': '%s'" % (k, de) in HTML
        assert "'%s': '%s'" % (k, en) in HTML


def test_undo_redo_and_scroll_anchor_api():
    for name in ("window.eitiComposerUndo", "window.eitiComposerRedo", "window.eitiComposerHistory",
                 "window.eitiComposerHistReset", "window.eitiScrollAnchorState", "window.eitiInlineClearSet"):
        assert name + " = function" in HTML, name
    assert "Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')" in HTML
    assert "Object.getOwnPropertyDescriptor(Element.prototype, 'scrollTop')" in HTML
