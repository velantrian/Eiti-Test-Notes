"""v14.15.1: «Меньше иконки (small icons)» — компактные табы и верхние панели (опция, по умолчанию выкл)."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
SW = (ROOT / "sw.js").read_text(encoding="utf-8")


def test_version_sync_moved():
    """Version checks moved to test_v14152.py (v14.15.2)."""


def test_small_icons_opt_in_and_early_apply():
    head = HTML[: HTML.index("</head>")]
    assert "localStorage.getItem('eiti_small_icons')==='1'" in head
    assert "function eitiSetSmallIcons(on)" in HTML
    assert 'id="eiti-small-icons-toggle" onchange="eitiSetSmallIcons(this.checked)"' in HTML
    # всё компактное — только под классом; дефолт 110/88 px не изменён
    assert re.search(r"\.tab-bar \{\n\s*height: 110px;", HTML)
    assert re.search(r"\.app-header \{\n\s*height: 88px;", HTML)
    block = HTML[HTML.index("/* v14.15.1: «Меньше иконки (small icons)»"): HTML.index("/* v14.15.2: «📱 Экран телефона»")]  # до блока v14.15.2
    for line in block.splitlines():
        s = line.strip()
        if s.endswith("{") and not s.startswith("/*") and not s.startswith(".eiti-si-row"):
            assert s.startswith("html.eiti-small-icons"), s
