"""v14.13.0: «Похожие / Related / Ähnliche» + «Рассуждение / Reasoning / Begründung» (KB, tales, notes) + settings."""
import glob
import gzip
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
SW = (ROOT / "sw.js").read_text(encoding="utf-8")
sys.path.insert(0, str(ROOT / "kb"))
sys.path.insert(0, str(ROOT / "offline"))
import related as kb_related  # noqa: E402
import build_tale_related  # noqa: E402


def test_version_sync():
    assert 'var EITI_VERSION = "14.13.0"' in HTML
    assert "var CACHE = 'eiti-v14.13.0'" in SW
    assert "var OFFLINE_CACHE = 'eiti-offline-v14.13.0'" in SW
    assert "version: '14.13.0'" in SW
    assert "v14.13.0" in json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))["description"]
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    assert "version-14.13.0" in readme and "Что нового в v14.13.0" in readme
    assert "v14.13.0" in (ROOT / "AGENTS.md").read_text(encoding="utf-8")


def test_module_loaded_and_cached():
    assert '<script src="./local/eiti_related.js" defer></script>' in HTML
    assert "BASE + 'local/eiti_related.js'" in SW


# ── KB related (build time) ──
def _rec(q, a):
    return {"q": [q], "a": a}


def test_kb_related_shared_facts_rank_first_and_deterministic():
    recs = [
        ("kbl_p_a1", "a1", _rec("ночной дозор", "«Ночной дозор» — картина Рембрандта. Автор: Рембрандт. Создана: 1642.")),
        ("kbl_p_b2", "b2", _rec("даная", "«Даная» — картина Рембрандта. Автор: Рембрандт. Создана: 1636.")),
        ("kbl_p_c3", "c3", _rec("мона лиза", "«Мона Лиза» — картина Леонардо да Винчи. Автор: Леонардо да Винчи. Создана: 1503.")),
        ("kbl_p_d4", "d4", _rec("пир валтасара", "«Пир Валтасара» — картина Рембрандта. Автор: Рембрандт. Создана: 1635.")),
        ("kbl_p_e5", "e5", _rec("бином", "Бином Ньютона — формула разложения степени суммы.")),
    ]
    r1, r2 = kb_related.related(recs), kb_related.related(list(recs))
    assert r1 == r2
    assert set(r1["a1"][:2]) == {"b2", "d4"}
    for h, rel in r1.items():
        assert h not in rel and len(rel) <= kb_related.K and len(set(rel)) == len(rel)
    assert "e5" not in r1.get("a1", [])


def test_kb_fact_parser():
    f = kb_related.features(_rec("x", "Война — конфликт. Годы: 1914–1918. Страна: Франция, Германия."))
    assert f["f:годы=1914–1918"] == 3.0 and "f:страна=франция" in f and "f:страна=германия" in f


def test_kb_packs_carry_related_not_shards():
    idx = json.loads((ROOT / "kb/index.json").read_text(encoding="utf-8"))
    ids, with_r = {}, 0
    for dom, m in idx["domains"].items():
        for f in m["packs"]:
            b = (ROOT / "kb" / f).read_bytes()
            assert len(gzip.compress(b, 9)) < 40 * 1024, f
            for eid, e in json.loads(b)["entries"].items():
                ids[eid] = (dom, e)
    for eid, (dom, e) in ids.items():
        if "r" not in e:
            continue
        with_r += 1
        assert 1 <= len(e["r"]) <= kb_related.K
        for h in e["r"]:
            other = "kbl_%s_%s" % (dom, h)
            assert other in ids and other != eid, (eid, h)
    assert with_r > 0.8 * len(ids)
    for f in glob.glob(str(ROOT / "kb/idx/*.json")):
        sh = json.loads(Path(f).read_text(encoding="utf-8"))
        assert all(len(row) <= 4 for row in sh["e"])  # no related payload in search shards


# ── tales related ──
def test_tale_related_fresh_and_valid():
    stale, rel = build_tale_related.build(write=False)
    assert stale == [], "run: python3 offline/build_tale_related.py"
    tales = {}
    for f in build_tale_related.files():
        for x in json.loads(Path(f).read_text(encoding="utf-8"))["tales"]:
            tales[x["id"]] = x
    for tid, x in tales.items():
        for gid in x.get("rel", []):
            g, oid = gid.split(":", 1)
            assert oid in tales and oid != tid and tales[oid]["g"] == g
        assert len(x.get("rel", [])) <= build_tale_related.K


def test_tale_related_prefers_shared_characters():
    base = {"g": "x", "ty": "сказка", "tg": [], "s": ""}
    tales = [dict(base, id="a", t="Кухулин и пёс", cu="ирландская", who=["кухулин"]),
             dict(base, id="b", t="Смерть Кухулина", cu="ирландская", who=["кухулин"]),
             dict(base, id="c", t="Колобок", cu="русская"),
             dict(base, id="d", t="Репка", cu="русская"),
             dict(base, id="e", t="Теремок", cu="русская"),
             dict(base, id="f", t="Курочка Ряба", cu="русская")]
    r = build_tale_related.related(tales)
    assert r["a"][0] == "x:b"
    assert all(not v or "x:a" not in v for k, v in r.items() if k == "a")


# ── host integration + settings UI ──
def test_markers_and_host_wiring():
    assert "EitiRelHost.marker('kb', f.id, lang)" in HTML
    assert "EitiRelHost.marker('tale', _tl.x.g + '.' + _tl.x.id, lang)" in HTML
    assert "⟦EITIREL:(kb|tale|note)" in HTML and "EitiRelHost.bar(k, id, l || 'ru')" in HTML
    assert "function entry(id)" in HTML and "LOC[rows[ri].i]" in HTML
    assert 'id="noteRelRow"' in HTML and "EitiRelHost.noteRow()" in HTML
    assert "eitiNotesAIRelBar(live)" in HTML and "EitiRelated.strip(text)" in HTML
    # notes go to the AI only with Notes AI consent
    assert "kind === 'note' && !(typeof eitiNotesAIIsEnabled === 'function' && eitiNotesAIIsEnabled())" in HTML


def test_settings_ui_defaults_and_i18n():
    block = re.search(r'<div class="settings-group" id="eiti-rel-settings">.*?</select>', HTML, re.S).group(0)
    assert 'id="eiti-rel-show" checked' in block and 'id="eiti-rel-why" checked' in block
    assert '<option value="offline"' in block and '<option value="ai"' in block
    assert block.index('value="offline"') < block.index('value="ai"')
    keys = ["🔗 Похожие и рассуждение", "Показывать похожие", "Подробное рассуждение", "Режим рассуждения",
            "Только офлайн", "С ИИ (если включён и есть сеть)"]
    for lang in ("en", "de"):
        m = re.search(r"// v14\.13\.0: Похожие / Рассуждение\n(?:.*\n)*?\s*window\.EITI_I18N\.addDict\('%s', (\{.*?\})\);" % lang, HTML)
        d = json.loads(m.group(1))
        for k in keys:
            assert k in d and d[k] and d[k] != k
