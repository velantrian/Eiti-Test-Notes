"""v14.1.0: KB library — version sync, assets, build reproducibility."""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
SW = (ROOT / "sw.js").read_text(encoding="utf-8")


def test_version_sync():
    assert 'var EITI_VERSION = "14.1.0"' in HTML
    assert "var CACHE = 'eiti-v14.1.0'" in SW
    assert "var OFFLINE_CACHE = 'eiti-offline-v14.1.0'" in SW
    assert "version: '14.1.0'" in SW
    assert "v14.1.0" in json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))["description"]
    assert "version-14.1.0" in (ROOT / "README.md").read_text(encoding="utf-8")


def test_kb_assets():
    idx = json.loads((ROOT / "kb/index.json").read_text(encoding="utf-8"))
    assert idx["format"] == "eiti-kb-lib" and idx["count"] >= 500
    assert (ROOT / "kb/eiti_kb.js").exists()
    for d, m in idx["domains"].items():
        assert (ROOT / "kb" / m["file"]).exists(), d
    for need in ("physics", "chemistry", "biology", "astronomy", "geography", "history", "tech",
                 "health", "language", "culture", "everyday", "math", "app"):
        assert need in idx["domains"], need


def test_build_is_reproducible(tmp_path):
    # rebuilding from kb/src gives exactly the committed files and no duplicate warnings
    before = {p: p.read_bytes() for p in [ROOT / "kb/index.json", *sorted((ROOT / "kb/packs").glob("*.json"))]}
    out = subprocess.run([sys.executable, str(ROOT / "kb/build_kb.py"), "--strict"], capture_output=True, text=True)
    assert out.returncode == 0, out.stdout + out.stderr
    assert "WARN" not in out.stdout
    for p, b in before.items():
        assert p.read_bytes() == b, f"{p.name} differs from a fresh build — run kb/build_kb.py"
