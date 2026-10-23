"""v14.1.0: KB library — version sync, assets, build reproducibility."""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
SW = (ROOT / "sw.js").read_text(encoding="utf-8")


# v14.2.0+ moved the version forward; see test_v1420.py for the exact sync check.


def test_kb_assets():
    idx = json.loads((ROOT / "kb/index.json").read_text(encoding="utf-8"))
    assert idx["format"] == "eiti-kb-lib" and idx["v"] == 2 and idx["count"] >= 10000
    assert (ROOT / "kb/eiti_kb.js").exists()
    assert sum(m["count"] for m in idx["domains"].values()) == idx["count"]
    for d, m in idx["domains"].items():
        assert (ROOT / "kb" / m["shard"]).exists(), d
        for f in m["packs"]:
            assert (ROOT / "kb" / f).exists(), f
    for need in ("people", "cities", "countries", "elements", "rivers", "mountains", "species", "books", "films",
                 "paintings", "music", "wars", "proglang", "languages", "concepts", "physics", "chemistry", "biology", "astronomy", "geography", "history", "tech",
                 "health", "language", "culture", "everyday", "math", "app"):
        assert need in idx["domains"], need


def test_build_is_reproducible(tmp_path):
    # rebuilding from kb/src gives exactly the committed files and no duplicate warnings
    files = lambda: [ROOT / "kb/index.json", *sorted((ROOT / "kb/packs").glob("*.json")), *sorted((ROOT / "kb/idx").glob("*.json"))]
    before = {p: p.read_bytes() for p in files()}
    out = subprocess.run([sys.executable, str(ROOT / "kb/build_kb.py"), "--strict"], capture_output=True, text=True)
    assert out.returncode == 0, out.stdout + out.stderr
    assert "WARN" not in out.stdout
    assert set(files()) == set(before)
    for p, b in before.items():
        assert p.read_bytes() == b, f"{p.name} differs from a fresh build — run kb/build_kb.py"


def test_generated_sources_are_marked_and_cc0():
    for f in sorted((ROOT / "kb/src").glob("w_*.txt")):
        head = f.read_text(encoding="utf-8").splitlines()[:2]
        assert head[1].startswith("# @generated from Wikidata (CC0)"), f.name
