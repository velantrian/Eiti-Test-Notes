"""v14.15.3: EITI Tell — офлайн «расскажи что-нибудь / удиви меня / как ты думаешь» (мудрость / факт / история / размышление)."""
import gzip
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
SW = (ROOT / "sw.js").read_text(encoding="utf-8")
TELL = (ROOT / "local" / "eiti_tell.js").read_text(encoding="utf-8")


def test_version_sync():
    assert 'var EITI_VERSION = "14.15.3"' in HTML
    assert "var CACHE = 'eiti-v14.15.3'" in SW
    assert "var OFFLINE_CACHE = 'eiti-offline-v14.15.3'" in SW
    assert "version: '14.15.3'" in SW
    assert "// VELANTRIM EITI — Service Worker v14.15.3" in SW
    assert "EITI_VERSION 14.15.3" in SW
    assert "v14.15.3" in json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))["description"]
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    assert "version-14.15.3" in readme
    assert readme.index("Что нового в v14.15.3") < readme.index("Что нового в v14.15.2") < readme.index("Что нового в v14.15.1")
    assert "v14.15.3" in (ROOT / "AGENTS.md").read_text(encoding="utf-8")


def test_script_tag_and_host_order():
    assert '<script src="./local/eiti_tell.js" defer></script>' in HTML
    tell = HTML.index("var EitiTellHost = (function()")
    frames = HTML.index("// ── v14.14.0: EITI FRAMES")
    kb = HTML.index("_kbWrapped = true")
    # Tell оборачивает replyText раньше Frames → Frames снаружи, Tell внутри; KB-обёртка ставится ещё раньше (внутри Tell)
    assert kb < tell < frames
    assert "EitiOffline._tellWrapped = true" in HTML
    assert "T().disarm(st)" in HTML
    assert "if (ch.indexOf('local/eiti_tell.json') >= 0 && window.EitiTellHost && EitiTellHost.reload) EitiTellHost.reload();" in HTML


def test_precache_pages_and_manifest():
    assert "BASE + 'local/eiti_tell.js'" in SW and "BASE + 'local/eiti_tell.json'" in SW
    assert "'local/eiti_tell.json'" in (ROOT / "scripts" / "build_pages.py").read_text(encoding="utf-8")
    assert "'local/eiti_tell.json'" in (ROOT / "scripts" / "build_offline_manifest.py").read_text(encoding="utf-8")
    man = json.loads((ROOT / "offline_manifest.json").read_text(encoding="utf-8"))
    assert man["files"]["local/eiti_tell.json"]["s"] == (ROOT / "local" / "eiti_tell.json").stat().st_size


def test_pack_sizes_and_small():
    raw = (ROOT / "local" / "eiti_tell.json").read_bytes()
    pack = json.loads(raw.decode("utf-8"))
    assert pack["format"] == "eiti-tell"
    for lang, need in (("ru", 35), ("en", 10), ("de", 10)):
        for cat in ("wisdom", "fact", "story", "thought"):
            assert len(pack["pools"][lang][cat]) >= need, (lang, cat)
        assert set(pack["ui"][lang]) >= {"fact", "wisdom", "story", "thought", "more"}
    assert len(gzip.compress(raw, 9)) <= 30 * 1024


def test_engine_pure_no_lookbehind():
    code = re.sub(r"//.*$", "", TELL, flags=re.M)
    assert not re.search(r"\(\?<[=!]", code)
    assert "localStorage" not in code and "fetch(" not in code and "document." not in code
