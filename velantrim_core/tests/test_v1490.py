"""v14.9.0: normalized journal (IDB journal/contexts) + voice provider choice — version sync and wiring."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
SW = (ROOT / "sw.js").read_text(encoding="utf-8")


def test_version_sync():
    assert 'var EITI_VERSION = "14.9.0"' in HTML
    assert "var CACHE = 'eiti-v14.9.0'" in SW
    assert "var OFFLINE_CACHE = 'eiti-offline-v14.9.0'" in SW
    assert "version: '14.9.0'" in SW
    assert "v14.9.0" in json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))["description"]
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    assert "version-14.9.0" in readme and "Что нового в v14.9.0" in readme
    assert "v14.9.0" in (ROOT / "AGENTS.md").read_text(encoding="utf-8")


def test_journal_engine_wired():
    assert "14.9.0" in (ROOT / "local" / "eiti_journal.js").read_text(encoding="utf-8")
    assert 'src="./local/eiti_journal.js" defer' in HTML
    assert "BASE + 'local/eiti_journal.js'" in SW
    assert "indexedDB.open('eiti_v4', 17)" in HTML
    assert "createObjectStore('journal'" in HTML and "createObjectStore('contexts'" in HTML
    assert "journal: 'id'" in HTML and "contexts: 'id'" in HTML  # Drive SYNC_STORES
    assert "window.eitiRNEGet" in HTML and "eitiJournalDetachChat" in HTML


def test_voice_registry():
    assert "window.EitiVoice" in HTML
    assert "eitiResamplePCM16" in HTML
    assert "audio/pcm;rate=16000" in HTML
    assert "Grok Voice (xAI) — по умолчанию" in HTML and "Gemini Live (Google)" in HTML


def test_pwa_limits_doc():
    doc = (ROOT / "docs" / "PWA_LIMITS.md").read_text(encoding="utf-8")
    assert doc.startswith("# Что не работает в PWA и что заработает в нативном приложении")
    assert "| Функция | PWA сейчас" in doc
    assert "docs/PWA_LIMITS.md" in (ROOT / "README.md").read_text(encoding="utf-8")
    assert "docs/PWA_LIMITS.md" in (ROOT / "AGENTS.md").read_text(encoding="utf-8")
