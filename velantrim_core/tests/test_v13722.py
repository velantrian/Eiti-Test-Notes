"""v13.7.22: «Сохранить чат», AI Voice (Grok / Gemini Live), тихое обновление без тоста версии."""
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
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    assert f"version-{v}-gold" in readme and f"Что нового в v{v}" in readme
    assert f"v{v}" in (ROOT / "AGENTS.md").read_text(encoding="utf-8")


def test_save_chat_menu_item_after_copy_chat():
    items = INDEX[INDEX.index("var EITI_CHAT_PLUS_ITEMS"):]
    items = items[: items.index("];")]
    ids = re.findall(r"id: '(\w+)'", items)
    assert ids[ids.index("copyChat") + 1] == "saveChat"
    assert "label: 'Сохранить чат'" in items
    assert "function eitiChatExportContent(log, format, meta)" in INDEX
    assert "data-chat-save=" in INDEX


def test_no_visible_grok_voice_strings():
    # v14.9.0: провайдер голоса снова выбирается явно («Grok Voice» / «Gemini Live»),
    # но пункт плюс-меню остаётся нейтральным «AI Voice».
    items = INDEX[INDEX.index("var EITI_CHAT_PLUS_ITEMS"):]
    items = items[: items.index("];")]
    assert "label: 'Голосовой ассистент'" in items and "Grok Voice" not in items  # v14.10.0


def test_voice_provider_settings_ui_and_keys():
    for marker in ('id="ai-voice-provider"', '<option value="grok">Grok Voice (xAI) — по умолчанию</option>',
                   '<option value="gemini">Gemini Live (Google)</option>', 'id="gemini-live-key"',
                   'id="gemini-live-model"', 'id="gemini-live-voice"', "eiti_voice_provider",
                   "eiti_gemini_live_model", "eiti_gemini_live_voice", "eiti_gemini_live_key"):
        assert marker in INDEX, marker
    assert "BidiGenerateContent?key=" in INDEX
    assert "'gemini-3.8-live'" in INDEX


def test_no_version_toast_on_update():
    assert not re.search(r"showToast\([^)]*Обновление v", INDEX)
    h = INDEX[INDEX.index("e.data.type === 'SW_UPDATED'"):][:400]
    assert "showToast" not in h
    assert "SKIP_WAITING" in SW and "self.skipWaiting()" in SW
