"""v13.7.21: версия синхронна во всех файлах; ключевые маркеры заметок в index.html."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
INDEX = (ROOT / "index.html").read_text(encoding="utf-8")


def _index_version():
    m = re.search(r'var EITI_VERSION = "([\d.]+)"', INDEX)
    assert m
    return m.group(1)


def test_version_sync_everywhere():
    v = _index_version()
    sw = (ROOT / "sw.js").read_text(encoding="utf-8")
    assert f"var CACHE = 'eiti-v{v}'" in sw
    assert f"version: '{v}'" in sw
    manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))
    assert f"v{v}" in manifest["description"]
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    assert f"version-{v}-gold" in readme


def test_note_light_mode_uses_scoped_variables_and_persists():
    block = re.search(r"\.note-editor-overlay\.note-light-mode \{([^}]*)\}", INDEX)
    assert block and "--text-color: #1c1a17" in block.group(1)
    assert "eiti_notes_light_mode" in INDEX
    assert ".note-editor-overlay.note-light-mode .notes-ai-quick button {" not in INDEX


def test_paste_as_is_and_no_body_trim():
    assert "bodyEl.addEventListener('paste', eitiNotesPasteAsIs)" in INDEX
    persist = INDEX[INDEX.index("function notesPersistEditor()"):]
    persist = persist[: persist.index("function notesEditorIsOpen()")]
    assert "var body = String(bodyEl.value || '');" in persist
    assert "(bodyEl.value || '').trim()" not in persist


def test_markdown_renderer_no_stray_asterisk_rule():
    fn = INDEX[INDEX.index("function eitiRenderMarkdown(text)"):]
    fn = fn[: fn.index("var EITI_DOMAIN_CONFIG")]
    assert "Remove stray lone asterisks" not in fn
    assert "_codeStash" in fn
    assert "rgba(255,255,255" not in fn
