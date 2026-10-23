"""v14.10.0: EN/DE calculator, KB aliases/lemmas/translit, compact message actions, one-line input, EN/DE UI, docs."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
SW = (ROOT / "sw.js").read_text(encoding="utf-8")


def test_version_sync_moved():
    """Version checks moved to test_v14110.py."""


def test_docs_architecture():
    arch = (ROOT / "docs" / "ARCHITECTURE.md").read_text(encoding="utf-8")
    for s in ("```mermaid", "eiti_v4", "journal", "contexts", "drive.file", "EITI_GOOGLE_CLIENT_ID",
              "90", "Grok", "Gemini Live", "PWA_LIMITS.md", "AGENTS.md", "eitiChatReady"):
        assert s in arch, s
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    assert "docs/ARCHITECTURE.md" in readme and "```mermaid" in readme


def test_ui_wiring():
    assert "window.eitiChatReady = true" in HTML
    assert 'placeholder="Сообщение…"' in HTML
    # the duplicate 🔊📋 set for long replies is no longer created anywhere
    assert "className = 'msg-bottom-controls'" not in HTML and 'className="msg-bottom-controls"' not in HTML
