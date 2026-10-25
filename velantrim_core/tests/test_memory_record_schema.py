"""Audit-only: MemoryRecord v1 schema is valid and encodes the contract rules."""
import json, pathlib
import jsonschema
import pytest

ROOT = pathlib.Path(__file__).resolve().parents[2]
SCHEMA = json.loads((ROOT / "data" / "memory_record_v1.schema.json").read_text(encoding="utf-8"))

def rec(**kw):
    r = {"schema": "eiti.memory_record.v1", "id": "name", "store": "personal", "kind": "name", "value": "Аня",
         "source": {"type": "user_message"}, "epistemic_status": "Observed", "confidence": 0.6, "salience": 1,
         "created_at": "2026-10-25T10:00:00Z", "updated_at": "2026-10-25T10:00:00Z",
         "do_not_store": False, "correction_history": []}
    r.update(kw); return r

def test_schema_is_valid():
    jsonschema.Draft202012Validator.check_schema(SCHEMA)

def test_valid_record():
    jsonschema.validate(rec(), SCHEMA)

def test_do_not_store_tombstone_must_be_empty():
    jsonschema.validate(rec(do_not_store=True, value=""), SCHEMA)
    with pytest.raises(jsonschema.ValidationError):
        jsonschema.validate(rec(do_not_store=True, value="Аня"), SCHEMA)

def test_required_contract_fields():
    for f in ["source", "epistemic_status", "confidence", "salience", "do_not_store", "correction_history"]:
        r = rec(); r.pop(f)
        with pytest.raises(jsonschema.ValidationError):
            jsonschema.validate(r, SCHEMA)

def test_stores_stay_separate_and_localstorage_rule_stated():
    assert SCHEMA["properties"]["store"]["enum"] == ["personal", "kb"]
    assert "localStorage" in SCHEMA["description"] and "100 KB" in SCHEMA["description"]
