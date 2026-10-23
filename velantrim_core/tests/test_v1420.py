"""v14.2.0: EITI Local (calculator + questions about the user's own data) — version sync, wiring, offline caching."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
SW = (ROOT / "sw.js").read_text(encoding="utf-8")
LOCAL = (ROOT / "local" / "eiti_local.js").read_text(encoding="utf-8")


def test_version_sync_moved():
    """v14.3.0+ moved the version forward; see test_v1430.py for the exact sync check."""


def _old_version_sync():
    assert 'var EITI_VERSION = "14.2.0"' in HTML
    assert "var CACHE = 'eiti-v14.2.0'" in SW
    assert "var OFFLINE_CACHE = 'eiti-offline-v14.2.0'" in SW
    assert "version: '14.2.0'" in SW
    assert "v14.2.0" in json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))["description"]
    assert "version-14.2.0" in (ROOT / "README.md").read_text(encoding="utf-8")


def test_local_engine_is_cached_and_loaded():
    assert "BASE + 'local/eiti_local.js'" in SW
    assert '<script src="./local/eiti_local.js" defer></script>' in HTML
    assert len(LOCAL.encode("utf-8")) < 60 * 1024


def test_local_engine_has_no_eval():
    for bad in ("eval(", "new Function", "Function("):
        assert bad not in LOCAL, bad


def test_local_checked_first_in_offline_paths():
    # router: EITI Local before every other intent; offline wrapper: before KB and offline dialogs
    router = HTML.index("function eitiIntentRouter(txt)")
    # v14.6.0: the router passes the typo-corrected text (_locQ) to EITI Local
    assert HTML.index("EitiLocalHost.reply(_locQ)", router) < HTML.index("P8: Обработка выбора обогащения KB", router)
    assert HTML.index("EitiOffline._localWrapped = true") > HTML.index("EitiOffline._kbWrapped = true")
