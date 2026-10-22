"""v13.8.1: iPhone Safari fixes (static checks on index.html)."""
import re
from pathlib import Path

HTML = (Path(__file__).resolve().parents[2] / "index.html").read_text(encoding="utf-8")


def test_install_banner_once_bottom_autohide():
    fn = HTML[HTML.index("function eitiShowInstallBanner("):HTML.index("function eitiShowInstallBanner(") + 4000]
    assert "EITI_INSTALL_HINT_SEEN_KEY" in fn and "localStorage.setItem(EITI_INSTALL_HINT_SEEN_KEY" in fn
    assert "top:0" not in fn and "bottom:' + eitiInstallBannerBottom()" in fn
    assert "z-index:450" in fn  # below note editor (500) and Files viewer (2500)
    assert "EITI_INSTALL_BANNER_MS" in fn


def test_ios_inputs_16px_scoped():
    assert re.search(r"html\.is-ios textarea, html\.is-ios select \{ font-size: 16px !important; \}", HTML)


def test_viewer_safe_area_and_no_bare_100vh():
    assert "background:#f8f8f8;z-index:2500;display:flex;flex-direction:column;padding:calc(14px + env(safe-area-inset-top" in HTML
    assert "max-height: 100dvh" in HTML


def test_notification_guarded():
    for m in re.finditer(r"Notification\.permission", HTML):
        line = HTML[HTML.rfind("\n", 0, m.start()):m.start()]
        assert "window.Notification" in line, line


def test_hit_areas_and_kb_sync():
    assert "width: max(100%, 44px); height: max(100%, 44px)" in HTML
    assert "v._eitiKbSync = kbSync" in HTML and "eitiNotesAIGetKeyboardInset(panel" in HTML
