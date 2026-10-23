"""v14.4.0: offline replies follow the app/message language (RU/EN/DE) — version sync and wiring."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
SW = (ROOT / "sw.js").read_text(encoding="utf-8")


def test_version_sync_moved():
    """v14.7.0+ moved the version forward; see test_v1470.py for the exact sync check."""


def _old_version_sync():
    assert 'var EITI_VERSION = "14.4.0"' in HTML
    assert "var CACHE = 'eiti-v14.4.0'" in SW
    assert "var OFFLINE_CACHE = 'eiti-offline-v14.4.0'" in SW
    assert "version: '14.4.0'" in SW
    assert "v14.4.0" in json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))["description"]
    assert "version-14.4.0" in (ROOT / "README.md").read_text(encoding="utf-8")


def test_de_module_cached_and_loaded():
    assert (ROOT / "offline" / "eiti_offline_de.js").exists()
    assert "offline/eiti_offline_de.js" in SW
    # loaded lazily with the dialogs engine (nothing from offline/ is fetched at startup)
    assert 'src="./offline/eiti_offline_de.js"' not in HTML
    assert "sd.src = BASE + 'eiti_offline_de.js'" in HTML


def test_lang_plumbing_in_host():
    assert "window.eitiOfflineLang = function" in HTML
    assert "EitiLocalLib.reply(q, data(), Date.now(), { lang:" in HTML
    assert "window.eitiOfflineStr('kbFoot', lang)" in HTML
    assert "DE.localize(r.intent, r.text)" in HTML
    # the hard-coded Russian no-key messages are now localized (ru text kept as the ru variant)
    assert "resolve(_stNoKey || '⚠️ Настройте DeepSeek" not in HTML
    assert "_eitiNoKey('deepseek')" in HTML
    assert "'⚠️ Настройте DeepSeek API ключ в Настройки → 🤖 DeepSeek AI'" in HTML


def test_local_lib_version():
    assert "version: '14.4.0'" in (ROOT / "local" / "eiti_local.js").read_text(encoding="utf-8")
