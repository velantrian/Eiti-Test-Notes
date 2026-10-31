"""v14.15.2: «📱 Экран телефона» — пресеты выреза (по умолчанию «Авто» = как раньше)."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
SW = (ROOT / "sw.js").read_text(encoding="utf-8")


def test_version_sync_moved():
    """Version checks moved to test_v14153.py (v14.15.3)."""


def _old_version_sync():
    assert 'var EITI_VERSION = "14.15.2"' in HTML
    assert "var CACHE = 'eiti-v14.15.2'" in SW
    assert "var OFFLINE_CACHE = 'eiti-offline-v14.15.2'" in SW
    assert "version: '14.15.2'" in SW
    assert "// VELANTRIM EITI — Service Worker v14.15.2" in SW
    assert "EITI_VERSION 14.15.2" in SW
    assert "v14.15.2" in json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))["description"]
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    assert "version-14.15.2" in readme
    assert readme.index("Что нового в v14.15.2") < readme.index("Что нового в v14.15.1") < readme.index("Что нового в v14.15.0")
    assert "v14.15.2" in (ROOT / "AGENTS.md").read_text(encoding="utf-8")


def test_meta_tags_for_cutout():
    head = HTML[: HTML.index("</head>")]
    assert re.search(r'<meta name="viewport"[^>]*viewport-fit=cover', head)
    assert 'name="apple-mobile-web-app-status-bar-style" content="black-translucent"' in head


def test_presets_early_apply_and_scoped_css():
    head = HTML[: HTML.index("</head>")]
    assert "window.EITI_PHONE_PRESETS=" in head and "window.eitiPhoneScreenApply=" in head
    assert "eitiPhoneScreenApply(localStorage.getItem('eiti_phone_screen'))" in head
    for pid in ("iphone-notch", "iphone-island", "iphone-se", "galaxy-s", "galaxy-fold", "xiaomi", "pixel", "none"):
        assert f"'{pid}':[" in head, pid
    block = HTML[HTML.index("/* v14.15.2: «📱 Экран телефона»"): HTML.index("</head>")]
    assert "max(var(--eiti-env-top),var(--eiti-pt,0px))" in block.replace(" ", "")
    for line in block.splitlines():
        s = line.strip()
        if s.endswith("{") or ("{" in s and s.endswith("}")):
            if s.startswith(("/*", ".eiti-ps", ":root", "@media", "}")):
                continue
            assert "html.eiti-phone" in s, s
    # дефолт не тронут
    assert re.search(r"\.tab-bar \{\n\s*height: 110px;", HTML)
    assert re.search(r"\.app-header \{\n\s*height: 88px;", HTML)


def test_settings_entry_and_subview():
    assert 'onclick="openPhoneScreenMode()"' in HTML
    assert '<div id="view-phone-screen" class="content-view"' in HTML
    assert "function openPhoneScreenMode()" in HTML and "_eitiOpenSubview('phone-screen'" in HTML
    assert HTML.count("'view-phone-screen'") >= 3


def test_review_preset_lookup_own_keys_only():
    # Ревью #62 [P2]: '__proto__' / 'constructor' / 'toString' из localStorage не считаются пресетом
    head = HTML[: HTML.index("</head>")]
    assert "v=(id!=null&&Object.prototype.hasOwnProperty.call(P,id))?P[id]:null" in head
    assert "Object.prototype.hasOwnProperty.call(window.EITI_PHONE_PRESETS, id)" in HTML
    assert "EITI_PHONE_PRESETS[v]" not in HTML and "!EITI_PHONE_PRESETS[id]" not in HTML


def test_review_hint_race_and_small_icons_mapping():
    # Ревью #62 [P3]: поколение подсказки + перечитывание пресета перед показом
    assert "var _eitiPsHintGen = 0;" in HTML
    assert "if (gen !== _eitiPsHintGen) return;" in HTML
    assert "cur = eitiPhoneScreenGet();" in HTML
    # small icons × пресет: одна и та же safe-area
    assert "--eiti-si-safe-top: var(--eiti-top-inset);" in HTML
    assert "--eiti-si-safe-bottom: var(--eiti-bottom-inset);" in HTML
