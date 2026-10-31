"""v14.15.0: офлайн-интенты (новые слоты, составные реплики, нормализация) + EITI Care (Doweria, мягкие ответы)."""
import gzip
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
SW = (ROOT / "sw.js").read_text(encoding="utf-8")
CARE = (ROOT / "local" / "eiti_care.js").read_text(encoding="utf-8")
FR = (ROOT / "local" / "eiti_frames.js").read_text(encoding="utf-8")


def test_version_sync_moved():
    """Version checks moved to test_v14151.py (v14.15.1)."""


def test_frames_pack_new_intents_and_small():
    raw = (ROOT / "local" / "eiti_frames.json").read_bytes()
    pack = json.loads(raw.decode("utf-8"))
    ids = {it["id"] for it in pack["intents"]}
    for i in ("q_whose", "q_role", "q_degree", "q_until", "ask_which", "q_guess", "q_shared", "q_hope", "req_action"):
        assert i in ids, i
    assert pack.get("lead_social")
    assert len(gzip.compress(raw, 9)) <= 40 * 1024


def test_engine_pure_no_lookbehind():
    for src in (FR, CARE):
        code = re.sub(r"//.*$", "", src, flags=re.M)
        assert not re.search(r"\(\?<[=!]", code)
        assert "localStorage" not in code and "fetch(" not in code and "document." not in code


def test_hotlines_doweria_and_manual_check_note():
    assert "doweria: '030 440 308 454'" in CARE
    assert "seelsorge: ['0800 111 0 111', '0800 111 0 222', '116 123']" in CARE
    assert "emergency: '112'" in CARE
    assert "ПРОВЕРИТЬ ВРУЧНУЮ" in CARE


def test_offline_manifest_in_sync():
    r = subprocess.run([sys.executable, str(ROOT / "scripts" / "build_offline_manifest.py"), "--check"], cwd=ROOT, capture_output=True, text=True)
    assert r.returncode == 0, r.stdout + r.stderr
