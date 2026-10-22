"""v13.9.0: learning loop — static wiring checks on index.html."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
INDEX = (ROOT / "index.html").read_text(encoding="utf-8")


def _fn(name, size=3000):
    return INDEX[INDEX.index(name):INDEX.index(name) + size]


def test_version_and_readme_section():
    assert re.search(r'var EITI_VERSION = "(13\.9\.0|1[4-9]\.\d+\.\d+)"', INDEX)  # v14+ supersedes
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    assert "## 🆕 Что нового в v13.9.0" in readme
    assert readme.index("v13.9.0") < readme.index("## 🆕 Что нового в v13.8.1")


def test_mosc_wired_non_blocking_and_exposed():
    proc = _fn("function moscProcess(txt) {", 1800)
    assert "return true" not in proc
    assert "eitiMoscShowCard" in proc and "eiti_mosc_clarify" in proc
    for g in ("window.moscProcess = moscProcess", "window.moscLearn = moscLearn", "window.moscDetectIntent = moscDetectIntent"):
        assert g in INDEX
    send = _fn("function doSend() {", 4000)
    assert "window.moscProcess(_typedCmd)" in send
    assert send.index("window.moscProcess(_typedCmd)") < send.index("if (window._eitiPastedTextBuffer) {")


def test_grok_voice_uses_graph_converter():
    assert "_moscAll.nodes || []" in INDEX  # still read, but from the converter
    assert "eitiMoscGraphToNodesEdges(window._moscGraph || {})" in INDEX


def test_feedback_symmetric_and_recorded():
    fb = _fn("function eitiMsgFeedback(msgId, positive) {", 2500)
    assert "emotional" not in fb.split("// MOSC learning")[0].replace("no emotional +5", "")
    assert "positive ? 1.0 : -1.0" in fb
    assert "eitiVoteRecord" in fb and "eitiVbToMoscConcept" in fb


def test_retrieval_uses_bandit_hybrid_usefulness():
    assert "window.eitiRetrievalPick()" in INDEX
    assert "window.eitiRetrievalRerank(_scored, _kbAll, lower, _v139Cfg)" in INDEX
    assert "window.eitiRetrievalRecord(_relFacts, _v139Cfg)" in INDEX
    assert "var _flCfg = _v139Cfg ||" in INDEX


def test_ui_label_renamed_and_i18n_compatible():
    assert "FL ⚖️ Умные веса — Retrieval" not in INDEX
    assert INDEX.count("'⚖️ Веса поиска памяти'") >= 3  # de, en, advanced-set
    assert 'data-i18n="⚖️ Веса поиска памяти"' in INDEX
    assert "[FL_SET:" in INDEX  # tag kept compatible
    assert 'id="eiti-learning-body"' in INDEX


def test_memory_no_hard_drop_and_reachable_cap():
    learn = _fn("function eitiLearnFact(fact) {", 3500)
    assert "slice(-200)" not in learn
    assert "eiti_learned_archive_v1" in learn and "eitiMemFindNearDup" in learn
    assert "Math.min(s, 2.5)" in INDEX
    assert "eitiMemRank(learnedFacts" in INDEX


def test_guard_wraps_command_processor():
    assert "window.eitiGuardAIReply(reply)" in INDEX
    assert re.search(r"EITI_GUARD_LIMITS = \{ MOSC_ADD: 5", INDEX)
    assert "eiti_selfedit_log_v1" in INDEX and "window.eitiSelfEditUndo" in INDEX


def test_single_file_rule_module_inline():
    tail = INDEX[INDEX.rindex("eiti-v1390-style"):]
    assert "<script src" not in tail
