"""Tests for collect.py — the LLM batch collector.

Focus on the deterministic, bug-prone parts (domain inference, prompt filling,
and response parsing) that don't require hitting the Anthropic API.
"""
from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from collect import (  # noqa: E402
    extract_json_from_response,
    fill_prompt,
    infer_domain,
)


# ── infer_domain ───────────────────────────────────────────────────────────

def test_infer_domain_drops_last_segment():
    assert infer_domain("physics.mechanics.dynamics") == "physics.mechanics"


def test_infer_domain_single_segment_returned_as_is():
    assert infer_domain("physics") == "physics"


def test_infer_domain_two_segments():
    assert infer_domain("math.algebra") == "math"


# ── extract_json_from_response ─────────────────────────────────────────────

def test_parses_raw_json_array():
    assert extract_json_from_response('[{"id": "y"}]') == [{"id": "y"}]


def test_parses_fenced_json_block():
    text = "```json\n[{\"id\": \"x\"}]\n```"
    assert extract_json_from_response(text) == [{"id": "x"}]


def test_parses_array_embedded_in_prose():
    text = 'Вот результат: [{"id": "z"}] — готово.'
    assert extract_json_from_response(text) == [{"id": "z"}]


def test_raises_on_non_json_text():
    with pytest.raises(ValueError):
        extract_json_from_response("no json array here at all")


# ── fill_prompt ────────────────────────────────────────────────────────────

def test_fill_prompt_substitutes_placeholders():
    template = (
        "domain={domain} subtopic={subtopic} tier={tier} "
        "ids={existing_ids} covered={covered_subtopics}"
    )
    registry = {"all_ids": ["a.b", "a.c"], "covered_subtopics": ["a.b"]}
    out = fill_prompt(template, "phys.x", "phys", "invariant", registry)
    assert "domain=phys" in out
    assert "subtopic=phys.x" in out
    assert "tier=invariant" in out
    assert "a.b" in out


def test_fill_prompt_handles_empty_registry():
    template = "ids={existing_ids} covered={covered_subtopics}"
    out = fill_prompt(template, "phys.x", "phys", "invariant", {})
    assert "(пусто)" in out
