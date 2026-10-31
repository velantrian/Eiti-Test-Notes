"""v14.14.0: EITI Frames (офлайн-понимание формулировок) + карточки понятий kn_* + «нет в базе» и «🔄 Обновить базу офлайн-ответов»."""
import gzip
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
SW = (ROOT / "sw.js").read_text(encoding="utf-8")
KB = ROOT / "kb"


def test_version_sync():
    assert 'var EITI_VERSION = "14.14.0"' in HTML
    assert "var CACHE = 'eiti-v14.14.0'" in SW
    assert "var OFFLINE_CACHE = 'eiti-offline-v14.14.0'" in SW
    assert "version: '14.14.0'" in SW
    assert "// VELANTRIM EITI — Service Worker v14.14.0" in SW
    assert "v14.14.0" in json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))["description"]
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    assert "version-14.14.0" in readme and "Что нового в v14.14.0" in readme
    assert "v14.14.0" in (ROOT / "AGENTS.md").read_text(encoding="utf-8")


def test_frames_module_loaded_cached_published():
    assert '<script src="./local/eiti_frames.js" defer></script>' in HTML
    assert "BASE + 'local/eiti_frames.js'" in SW and "BASE + 'local/eiti_frames.json'" in SW
    pages = (ROOT / "scripts" / "build_pages.py").read_text(encoding="utf-8")
    assert "'local/eiti_frames.json'" in pages
    pack = json.loads((ROOT / "local" / "eiti_frames.json").read_text(encoding="utf-8"))
    assert isinstance(pack, dict) and pack


def test_concept_cards_valid():
    r = subprocess.run([sys.executable, str(KB / "tests" / "validate_cards.py")], capture_output=True, text=True)
    assert r.returncode == 0, r.stdout + r.stderr
    assert "errors: 0" in r.stdout


def test_kn_domains_lazy_and_small():
    idx = json.loads((KB / "index.json").read_text(encoding="utf-8"))
    kn = [d for d in idx["domains"] if d.startswith("kn_")]
    assert len(kn) >= 15
    assert set(kn) <= set(idx.get("lazy", []))
    assert not set(kn) & set(idx["order"]), "kn_* must not be eager"
    for d in kn:
        assert idx["domains"][d].get("lazy") == 1
        for f in idx["domains"][d]["packs"]:
            assert len(gzip.compress((KB / f).read_bytes())) < 40 * 1024, f
    # kn shards are not precached by the SW CORE list
    assert "kb/idx/kn_" not in SW and "kb_kn_" not in SW


def test_kn_sources_not_hand_edited_json():
    # every kn_* domain comes from kb/src/kn_*.txt
    srcs = {p.stem for p in (KB / "src").glob("kn_*.txt")}
    idx = json.loads((KB / "index.json").read_text(encoding="utf-8"))
    assert {d for d in idx["domains"] if d.startswith("kn_")} == srcs


def test_offline_manifest_in_sync_cached_published():
    """offline_manifest.json генерируется (kb/build_kb.py → scripts/build_offline_manifest.py), не правится руками."""
    r = subprocess.run([sys.executable, str(ROOT / "scripts" / "build_offline_manifest.py"), "--check"], cwd=ROOT, capture_output=True, text=True)
    assert r.returncode == 0, r.stdout + r.stderr
    m = json.loads((ROOT / "offline_manifest.json").read_text(encoding="utf-8"))
    assert m["format"] == "eiti-offline-manifest" and m["v"] == 1
    files = m["files"]
    for rel in ("local/eiti_frames.json", "kb/index.json", "offline/core.json"):
        assert rel in files and len(files[rel]["h"]) == 16
    assert all(k.endswith(".json") and k.split("/")[0] in ("local", "kb", "offline") for k in files)
    assert "BASE + 'offline_manifest.json'" in SW
    assert "'offline_manifest.json'" in (ROOT / "scripts" / "build_pages.py").read_text(encoding="utf-8")
    assert "build_offline_manifest.py" in (KB / "build_kb.py").read_text(encoding="utf-8")


def test_answers_local_only_update_by_button():
    assert "EitiWikiHost" not in HTML and "eiti-wiki-offline" not in HTML and "eiti_wiki_offline" not in HTML
    assert 'id="eiti-base-update" onclick="eitiBaseUpdate()"' in HTML
    assert "Добавлять темы, на которые не было ответа, из Википедии" in HTML
    lr = HTML[HTML.index("function lastResort(text)"):HTML.index("function reload()")]
    assert "fetch" not in lr and "wikipedia" not in lr.lower()
    fr = json.loads((ROOT / "local" / "eiti_frames.json").read_text(encoding="utf-8"))
    assert "Не знаю, этого нет в базе" in json.dumps(fr, ensure_ascii=False)
