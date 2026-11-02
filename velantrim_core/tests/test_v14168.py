"""v14.16.10+: composer clear (legacy stub)."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
HTML=(ROOT/"index.html").read_text(encoding="utf-8")
def test_version_sync():
    assert "var EITI_VERSION =" in HTML
def test_clear_wiring():
    assert 'id="eiti-composer-clear"' in HTML
    assert 'eitiComposerClearSetVisible' in HTML
    assert 'cpi-clear-pin' in HTML
    assert 'eiti-ios-switch' in HTML
    assert 'data-i18n="♻️ Очистить поле ввода"' in HTML
