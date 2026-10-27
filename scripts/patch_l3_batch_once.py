#!/usr/bin/env python3
"""One-time, blob-guarded in-place edit: revoke whole latest L3 fact batch."""
from pathlib import Path
import subprocess

p = Path("index.html")
expected = "50f2b47291cbbcdd7fd140a020c75b8ea9dccbe7"
sha = subprocess.check_output(["git", "hash-object", str(p)], text=True).strip()
if sha != expected:
    raise SystemExit("Unexpected index.html blob: " + sha)
src = p.read_text(encoding="utf-8")

def change(a, b):
    global src
    if src.count(a) != 1:
        raise SystemExit("Expected one exact anchor: " + a[:80])
    src = src.replace(a, b, 1)

change(
    "        var _l3LastAttempt = null; // latest correction target, not a commit receipt\n",
    "        var _l3LastAttempt = null; // latest correction target, not a commit receipt\n        var _l3LastBatch = null; // keys extracted from one message, RAM only\n"
)
change(
    """            if (_l3LastAttempt && _l3LastAttempt.key === key) _l3LastAttempt = null;
            if (window._l3Last && window._l3Last.key === key) window._l3Last = null;""",
    """            if (_l3LastAttempt && _l3LastAttempt.key === key) _l3LastAttempt = null;
            if (_l3LastBatch) {
                _l3LastBatch.keys = _l3LastBatch.keys.filter(function(k) { return k !== key; });
                if (!_l3LastBatch.keys.length) _l3LastBatch = null;
            }
            if (window._l3Last && window._l3Last.key === key) window._l3Last = null;"""
)
change(
    """            // A category-free "don't remember that" refers only to the last attempt.
            if (!keys.length && _l3LastAttempt && Date.now() - _l3LastAttempt.ts < 600000)
                keys.push(_l3LastAttempt.key);""",
    """            // Category-free revocation applies to ALL facts extracted from the
            // latest user message, never just its last matching category.
            if (!keys.length && _l3LastBatch && Date.now() - _l3LastBatch.ts < 600000)
                keys = _l3LastBatch.keys.slice();
            if (!keys.length && _l3LastAttempt && Date.now() - _l3LastAttempt.ts < 600000)
                keys.push(_l3LastAttempt.key);"""
)
change(
    """            _l3LastAttempt = { key: key, label: label, ts: Date.now() };
            _l3Attempt(op);""",
    """            _l3LastAttempt = { key: key, label: label, ts: Date.now() };
            _l3LastBatch = { keys: [key], ts: Date.now() };
            _l3Attempt(op);"""
)
change(
    """            var found = [];
            _l3Patterns.forEach(function(p) {""",
    """            var found = [], foundKeys = [];
            _l3Patterns.forEach(function(p) {"""
)
change(
    """                    found.push(p.label + ': ' + m[1].trim());
                }
            });
            // v14.15.0: «я ошибся, Оля»""",
    """                    found.push(p.label + ': ' + m[1].trim());
                    foundKeys.push(p.key);
                }
            });
            if (foundKeys.length) _l3LastBatch = { keys: foundKeys, ts: Date.now() };
            // v14.15.0: «я ошибся, Оля»"""
)
assert src.count("var _l3LastBatch = null;") == 1
assert src.count("if (foundKeys.length) _l3LastBatch") == 1
p.write_text(src, encoding="utf-8")
print("Patched L3 batch revocation; no storage schema or sync changes.")
