"""v14.16.15: precise replay/forward seek icons in player."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
HTML=(ROOT/"index.html").read_text(encoding="utf-8")
def test_seek_icon_builder():
    assert "function _eitiSeekSvg(dir)" in HTML
    assert 'stroke-width="2.2"' in HTML
    assert "M12 4.5 A8 8 0 1 1 4.6 9.4" in HTML  # back: counter-clockwise
    assert "M12 4.5 A8 8 0 1 0 19.4 9.4" in HTML  # fwd: mirrored
    assert "A12 12 0 1 1 6 21" not in HTML        # old refresh-like arc gone
def test_seek_direction_matches_title():
    i=HTML.index("bk.onclick="); assert "-_step" in HTML[i:i+160]
    j=HTML.index("fw.onclick="); assert "+_step" in HTML[j:j+160]
