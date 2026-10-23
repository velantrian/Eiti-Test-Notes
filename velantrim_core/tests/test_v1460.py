"""v14.6.0: offline typo tolerance (RU/EN/DE) — version sync and wiring."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
SW = (ROOT / "sw.js").read_text(encoding="utf-8")


def test_version_sync():
    assert 'var EITI_VERSION = "14.6.0"' in HTML
    assert "var CACHE = 'eiti-v14.6.0'" in SW
    assert "var OFFLINE_CACHE = 'eiti-offline-v14.6.0'" in SW
    assert "version: '14.6.0'" in SW
    assert "v14.6.0" in json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))["description"]
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    assert "version-14.6.0" in readme and "Что нового в v14.6.0" in readme


def test_typo_module_loaded_and_cached():
    js = (ROOT / "local" / "eiti_typo.js").read_text(encoding="utf-8")
    assert "14.6.0" in js
    assert 'src="./local/eiti_typo.js" defer' in HTML
    assert "BASE + 'local/eiti_typo.js'" in SW
    assert "BASE + 'local/eiti_typo_vocab.json'" in SW
    vocab = json.loads((ROOT / "local" / "eiti_typo_vocab.json").read_text(encoding="utf-8"))
    assert vocab["t"] and len((ROOT / "local" / "eiti_typo_vocab.json").read_bytes()) < 1_500_000


def test_typo_wrapper_is_outermost_and_lazy():
    assert "EitiOffline._typoWrapped = true" in HTML
    assert HTML.index("EitiOffline._typoWrapped = true") > HTML.index("EitiOffline._dstateWrapped = true")
    assert "fetch('./local/eiti_typo_vocab.json')" in HTML
    assert "EitiTypoHost.fix(txt" in HTML  # offline router path before EITI Local
