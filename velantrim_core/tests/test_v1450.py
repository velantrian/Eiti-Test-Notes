"""v14.5.0: offline dialogue state + Settings → chat size & storage — version sync and wiring."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
SW = (ROOT / "sw.js").read_text(encoding="utf-8")


def test_version_sync():
    assert 'var EITI_VERSION = "14.5.0"' in HTML
    assert "var CACHE = 'eiti-v14.5.0'" in SW
    assert "var OFFLINE_CACHE = 'eiti-offline-v14.5.0'" in SW
    assert "version: '14.5.0'" in SW
    assert "v14.5.0" in json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))["description"]
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    assert "version-14.5.0" in readme and "Что нового в v14.5.0" in readme


def test_dstate_module_loaded_and_cached():
    js = (ROOT / "local" / "eiti_dstate.js").read_text(encoding="utf-8")
    assert "version: '14.5.0'" in js
    assert 'src="./local/eiti_dstate.js" defer' in HTML
    assert "BASE + 'local/eiti_dstate.js'" in SW


def test_host_wrapper_and_llm_context():
    assert "EitiOffline._dstateWrapped" in HTML
    assert "window.EitiDialogHost = EitiDialogHost" in HTML
    # the dialogue layer wraps after (outside of) the EITI Local layer
    assert HTML.index("EitiOffline._dstateWrapped = true") > HTML.index("EitiOffline._localWrapped = true")
    assert "=== СОСТОЯНИЕ ДИАЛОГА" in HTML
    assert "EitiDialogHost.note(userText)" in HTML


def test_storage_settings_ui():
    for el in ['id="eiti-storage-group"', 'id="eiti-chat-limit"', 'id="eiti-clear-chat-btn"',
               'id="eiti-clear-cache-btn"', 'id="eiti-reset-dialog-btn"', 'id="eiti-st-total"']:
        assert el in HTML
    for fn in ["window.eitiStorageRefresh", "window.eitiTrimGlobal", "window.eitiClearChatHistory",
               "window.eitiClearOfflineCaches", "window.eitiResetDialogMemory", "navigator.storage.estimate"]:
        assert fn in HTML
    # every destructive action asks first; notes/files stores are never cleared
    seg = HTML[HTML.index("window.eitiClearChatHistory"):HTML.index("window.eitiResetDialogMemory")]
    assert "confirm(" in seg and "'notes'" not in seg and "'files'" not in seg
    assert "'💾 Размер чата и хранилище': '💾 Chat size & storage'" in HTML
    assert "'💾 Размер чата и хранилище': '💾 Chatgröße & Speicher'" in HTML
