"""Offline typing invariants (introduced in v14.16.8) must survive version updates."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HTML = (ROOT / "index.html").read_text(encoding="utf-8")


def test_offline_typing_entrypoints_and_call_sites():
    assert "window.eitiShowOfflineTyping = function () {" in HTML
    assert "window.eitiHideOfflineTyping = function () {" in HTML
    assert "window.eitiWithOfflineTyping = function (workPromise, minMs) {" in HTML
    assert "window.eitiWithOfflineTyping(work" in HTML
    assert "clearTimeout(showTimer);" in HTML


def test_offline_gold_animation_structure():
    assert 'eiti-typing-dots eiti-typing-offline' in HTML
    assert "eitiOfflineDotPulse" in HTML
    assert ".eiti-typing-dots.eiti-typing-offline span:nth-child(2)" in HTML
    assert ".eiti-typing-dots.eiti-typing-offline span:nth-child(3)" in HTML
    assert "background: radial-gradient" in HTML
