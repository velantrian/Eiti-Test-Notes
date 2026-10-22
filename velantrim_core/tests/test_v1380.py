"""v13.8.0: темы окна файла, 👁/✎ оформление, AI Docs в файлах, ИИ с историей и защитой от обрезки."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
INDEX = (ROOT / "index.html").read_text(encoding="utf-8")
SW = (ROOT / "sw.js").read_text(encoding="utf-8")


def test_version_synced_everywhere():
    v = re.search(r'var EITI_VERSION = "([\d.]+)"', INDEX).group(1)
    assert f"var CACHE = 'eiti-v{v}'" in SW
    assert f"version: '{v}'" in SW
    assert f"v{v}" in json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))["description"]
    assert f"version-{v}-gold" in (ROOT / "README.md").read_text(encoding="utf-8")


def test_file_viewer_theme_recolors_title_and_buttons():
    viewer = INDEX[INDEX.index("// Просмотр\n                item.querySelector('[data-v]')"):INDEX.index("// Редактировать\n                item.querySelector('[data-e]')")]
    assert 'id="fv-title"' in viewer and 'color:var(--accent-color);font-weight:700;font-size:14px' not in viewer
    assert "eitiFvApplyTheme(v, eitiFvThemeGet())" in viewer
    for name in ("light", "dark", "paper"):
        assert f"eitiFvThemeSet('{name}')" in viewer
    assert 'id="fv-view-btn"' in viewer
    assert "eitiFvEnhance(v," in viewer
    assert "background:rgba(0,0,0,.95);z-index:2500" not in viewer


def test_theme_default_light_and_persisted():
    assert "var EITI_FV_THEME_KEY = 'eiti_fv_theme';" in INDEX
    fn = INDEX[INDEX.index("function eitiFvThemeGet()"):]
    assert "|| 'light'" in fn[:300]
    for sel in ("#fv-rename-btn", "#fv-copy-btn", "#fv-close-btn", "#fv-title"):
        assert sel in INDEX[INDEX.index("function eitiFvApplyTheme"):INDEX.index("function eitiRichEsc")]


def test_notes_view_toggle_in_more_menu_header_unchanged():
    head = INDEX[INDEX.index('<div class="note-editor-topbar-actions">'):INDEX.index('id="noteMoreBtn"')]
    assert 'noteViewToggleBtn' not in head  # шапка не сжимает заголовок
    menu = INDEX[INDEX.index('<div id="noteMoreMenu"'):]
    menu = menu[: menu.index("</div>")]
    assert 'id="noteViewToggleBtn"' in menu and 'onclick="eitiNoteViewToggle()"' in menu
    assert 'id="noteViewExitBtn"' in INDEX
    assert "eitiNoteViewSet(false); // v13.8.0" in INDEX


def test_mermaid_lazy_and_strict():
    assert re.search(r"var EITI_MERMAID_URL = 'https://cdn\.jsdelivr\.net/npm/mermaid@[\d.]+/dist/mermaid\.min\.js';", INDEX)
    mount = INDEX[INDEX.index("function eitiRichMount"):INDEX.index("function eitiNoteViewIsOn")]
    assert "if (!r.hasMermaid) return;" in mount
    assert mount.index("if (!r.hasMermaid) return;") < mount.index("eitiMermaidEnsure()")
    assert "securityLevel: 'strict'" in mount
    assert "показан код диаграммы" in mount


def test_ai_docs_files_toggle_in_settings():
    settings = INDEX[INDEX.index('id="eiti-files-ai-settings"'):]
    settings = settings[: settings.index('id="eiti-only-ai-btn"')]
    assert 'id="files-aidocs-toggle"' in settings
    assert 'onclick="eitiFilesDocsSetEnabled(!eitiFilesDocsIsEnabled())"' in settings
    assert "localStorage.getItem('eiti_files_aidocs_enabled') !== '0'" in INDEX


def test_ai_docs_bar_and_undo_redo():
    enh = INDEX[INDEX.index("function eitiFvEnhance"):]
    for needle in ('id="fv-ai-find"', 'id="fv-ai-ask"', 'id="fv-ai-edit"', 'id="fv-ai-undo"', 'id="fv-ai-redo"', "eitiDocAIBuildMessages(sys, history, msg)", "eitiDocAITruncationNote("):
        assert needle in enh


def test_notes_ai_history_truncation_and_same_model():
    send = INDEX[INDEX.index("function eitiNotesAISend("):INDEX.index("function eitiNotesAIFindInNote(")]
    assert "var priorHistory = _eitiNotesAIChats[key].slice();" in send
    assert "eitiNotesAICall(msg, title, body, selectionText, tags, priorHistory)" in send
    assert "if (trunc.blockMutation) parsed = { reply: trunc.note, mutation: null };" in send
    assert "eitiDocAILongWarning(body.length)" in send
    resolve = INDEX[INDEX.index("function eitiNotesAIResolveTarget("):INDEX.index("function eitiNotesAIBuildSystemPrompt(")]
    assert "(p === 'openai' || p === 'grok')" in resolve
    req = INDEX[INDEX.index("function eitiDocAIRequest("):INDEX.index("function eitiDocAITruncationNote(")]
    assert "https://api.x.ai/v1/chat/completions" in req and "https://api.openai.com/v1/chat/completions" in req
    assert "другую модель вместо выбранной не подставляю" in req


def test_single_file_rule_kept():
    assert '<script id="eiti-v1380-script">' in INDEX
    assert '<style id="eiti-v1380-style">' in INDEX
    assert INDEX.rstrip().endswith("</html>")


def test_reader_switch_labeled():
    assert "viewBtn.textContent = state.mode === 'view' ? '📄 Текст' : '📖 Reader';" in INDEX
    assert ">📄 Текст</button>" in INDEX
    assert "'</>'" not in INDEX[INDEX.index("function eitiFvEnhance"):]
    assert 'id="fv-controls"' in INDEX and "flex:1 1 60px;min-width:0;" in INDEX and "justify-content:flex-end;flex:1 1 100%;" in INDEX


def test_beautify_buttons_at_top():
    notes = INDEX[INDEX.index('<div class="note-editor-topbar">'):INDEX.index('id="noteEditorBodyWrap"')]
    assert 'id="noteBeautifyBtn"' in notes and 'onclick="eitiNoteBeautify()"' in notes
    head = INDEX[INDEX.index('<div class="note-editor-topbar-actions">'):INDEX.index('id="noteMoreBtn"')]
    assert 'Beautify' not in head  # заголовок заметки не сжимается
    viewer = INDEX[INDEX.index('id="fv-header"'):INDEX.index('id="fv-pre"')]
    assert viewer.index('id="fv-title"') < viewer.index('id="fv-beautify-btn"') < viewer.index('id="fv-controls"')
    fn = INDEX[INDEX.index("function eitiNoteBeautify()"):INDEX.index("// ── v13.8.0: AI Docs в окне файла")]
    assert "eitiNotesAIApplyMutation({ action: 'replace_note', body: r.body }, snapshot, EITI_BEAUTIFY_REQUEST)" in fn
    assert "eitiDocAIBeautifyResult(raw, !!(res && res.truncated), body)" in fn


def test_context_blocks_wired():
    menu = INDEX[INDEX.index('<div id="noteMoreMenu"'):]
    menu = menu[: menu.index("</div>")]
    assert 'id="noteNewBlockBtn"' in menu and "➕ Новый блок" in menu
    viewer = INDEX[INDEX.index('id="fv-header"'):INDEX.index('id="fv-pre"')]
    assert 'id="fv-block-btn"' in viewer
    assert "return '---\\n## ' + t.emoji + ' ' + clean;" in INDEX
    assert "eitiBlocksPromptRule(ctx.content, cursor)" in INDEX
    assert "eitiBlocksPromptRule(String(noteBody || '')" in INDEX
    apply = INDEX[INDEX.index("function eitiNotesAIApplyMutation("):INDEX.index("function eitiNotesAIPresetModels(")]
    assert "eitiBlocksGuard(body, nextBody" in apply
    assert "eitiBlocksGuard(original, t, { allowCrossBlock: true })" in INDEX
    assert "Разделители контекстных блоков" in INDEX
