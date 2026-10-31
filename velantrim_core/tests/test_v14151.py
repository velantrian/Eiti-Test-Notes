"""v14.15.1: «Меньше иконки (small icons)» — компактные табы и верхние панели (опция, по умолчанию выкл)."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
SW = (ROOT / "sw.js").read_text(encoding="utf-8")


def test_version_sync():
    assert 'var EITI_VERSION = "14.15.1"' in HTML
    assert "var CACHE = 'eiti-v14.15.1'" in SW
    assert "var OFFLINE_CACHE = 'eiti-offline-v14.15.1'" in SW
    assert "version: '14.15.1'" in SW
    assert "// VELANTRIM EITI — Service Worker v14.15.1" in SW
    assert "v14.15.1" in json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))["description"]
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    assert "version-14.15.1" in readme and "Что нового в v14.15.1" in readme
    assert "v14.15.1" in (ROOT / "AGENTS.md").read_text(encoding="utf-8")


def test_small_icons_opt_in_and_early_apply():
    head = HTML[: HTML.index("</head>")]
    assert "localStorage.getItem('eiti_small_icons')==='1'" in head
    assert "function eitiSetSmallIcons(on)" in HTML
    assert 'id="eiti-small-icons-toggle" onchange="eitiSetSmallIcons(this.checked)"' in HTML
    # всё компактное — только под классом; дефолт 110/88 px не изменён
    assert re.search(r"\.tab-bar \{\n\s*height: 110px;", HTML)
    assert re.search(r"\.app-header \{\n\s*height: 88px;", HTML)
    block = HTML[HTML.index("/* v14.15.1: «Меньше иконки (small icons)»"): HTML.index("</head>")]
    for line in block.splitlines():
        s = line.strip()
        if s.endswith("{") and not s.startswith("/*") and not s.startswith(".eiti-si-row"):
            assert s.startswith("html.eiti-small-icons"), s


def test_review_ios_safe_area_header_actions():
    # Ревью #61 [P1]: кнопки шапки центрируются по безопасной части (ниже выреза), а не по всей шапке
    assert "--eiti-si-safe-top: env(safe-area-inset-top, 0px);" in HTML
    assert "--eiti-si-safe-bottom: env(safe-area-inset-bottom, 0px);" in HTML
    assert ("html.eiti-small-icons.is-ios .app-header .header-actions "
            "{ top: calc(50% + var(--eiti-si-safe-top) / 2) !important; }") in HTML
    assert "height: calc(var(--eiti-si-header-h) + var(--eiti-si-safe-top))" in HTML
    assert "padding-top: var(--eiti-si-safe-top) !important;" in HTML


def test_review_hit_areas_44px():
    # Ревью #61 [P2]: невидимый ::after ≥44px, сами кнопки не растут
    block = HTML[HTML.index("/* Зоны нажатия ≥44px при компактной графике"): HTML.index("/* Чекбокс в «Настройке табов» */")]
    for sel in (".header-btn", ".subview-back", "#notesBackBtn", ".notes-new-btn",
                "#notesCopyAllBtn", "#notesDeleteModeBtn", ".notes-col-btn"):
        assert f"html.eiti-small-icons {sel}::after" in block, sel
    assert "width: max(100%, 44px); height: max(100%, 44px);" in block
    assert "background: transparent;" in block
    assert "html.eiti-small-icons .notes-col-btn::after { width: calc(100% + 2px + 5px); }" in block
