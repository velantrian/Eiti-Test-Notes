#!/usr/bin/env python3
"""Apply a bounded L3 deletion/commit-acknowledgement patch to index.html.

One-shot migration of the existing single-file runtime. No DB schema, new storage,
Drive synchronization, version, or release changes.
"""
from pathlib import Path
import subprocess

path = Path("index.html")
original = path.read_text(encoding="utf-8")
expected_blob = "4b64fd275835669a72e78bad22436db7686160fb"
actual_blob = subprocess.check_output(["git", "hash-object", str(path)], text=True).strip()
if actual_blob != expected_blob:
    raise SystemExit(f"Refusing to patch unexpected index.html blob: {actual_blob}")

src = original

def substitute(start, stop, replacement):
    global src
    assert src.count(start) == 1, f"Missing/ambiguous start: {start[:55]!r}"
    a = src.index(start)
    assert src.count(stop, a) == 1, f"Missing/ambiguous end: {stop[:55]!r}"
    b = src.index(stop, a)
    src = src[:a] + replacement + src[b:]

substitute(
    "        var _l3Pending = [];",
    "        // v14.15.0: признак исправления",
    """        var _l3Pending = []; // RAM only: not an outbox or backup
        var _l3Revision = Object.create(null);
        var _l3Active = [];
        var _l3LastAttempt = null; // latest correction target, not a commit receipt
        function _l3NextRevision(key) {
            return (_l3Revision[key] = (_l3Revision[key] || 0) + 1);
        }
        function _l3IsCurrent(op) { return _l3Revision[op.key] === op.revision; }
        function _l3RemoveActive(op) {
            _l3Active = _l3Active.filter(function(a) { return a !== op; });
        }
        function _l3Queue(op) {
            if (!_l3IsCurrent(op)) return;
            _l3Pending = _l3Pending.filter(function(a) { return a.key !== op.key; });
            _l3Pending.push(op);
        }
        function _l3Cancel(key) {
            _l3NextRevision(key);
            _l3Pending = _l3Pending.filter(function(a) { return a.key !== key; });
            _l3Active.filter(function(a) { return a.key === key; }).forEach(function(a) {
                try { a.tx.abort(); } catch (_) { /* already committed/aborted */ }
            });
            if (_l3LastAttempt && _l3LastAttempt.key === key) _l3LastAttempt = null;
            if (window._l3Last && window._l3Last.key === key) window._l3Last = null;
        }
        function _l3CancelFromSkip(text) {
            var keys = [];
            _l3Patterns.forEach(function(p) { if (p.re.test(text)) keys.push(p.key); });
            // A category-free "don't remember that" refers only to the last attempt.
            if (!keys.length && _l3LastAttempt && Date.now() - _l3LastAttempt.ts < 600000)
                keys.push(_l3LastAttempt.key);
            keys.forEach(_l3Cancel);
        }
        window.eitiL3FlushPending = function() {
            if (!window.eitiDb || !_l3Pending.length) return;
            var q = _l3Pending; _l3Pending = [];
            q.forEach(function(op) { if (_l3IsCurrent(op)) _l3Attempt(op); });
        };
""",
)
substitute(
    "        function _l3Save(key, value, label, source, reason) {",
    "        // Прочитать все L3 факты из IDB",
    """        function _l3Attempt(op) {
            if (!_l3IsCurrent(op)) return;
            if (!window.eitiDb) { _l3Queue(op); return; }
            var active = null;
            try {
                var tx = window.eitiDb.transaction(['l3'], 'readwrite');
                var store = tx.objectStore('l3');
                var fact = { id: op.key, label: op.label, value: op.value, source: (op.source || '').slice(0, 100), ts: Date.now() };
                active = { key: op.key, tx: tx };
                _l3Active.push(active);
                var gr = store.get(op.key);
                gr.onsuccess = function() {
                    if (!_l3IsCurrent(op)) return;
                    var old = gr.result;
                    if (old && String(old.value) === fact.value) { fact.correction_history = old.correction_history; }
                    else eitiL3WithHistory(old, fact, op.reason || (eitiIsCorrection(op.source) ? 'user_correction' : 'contradiction'));
                    if (!fact.correction_history) delete fact.correction_history;
                    store.put(fact);
                };
                tx.oncomplete = function() {
                    _l3RemoveActive(active);
                    if (_l3IsCurrent(op)) {
                        var idx = (window._l3Cache || []).findIndex(function(f) { return f.id === op.key; });
                        if (idx >= 0) window._l3Cache[idx] = fact;
                        else (window._l3Cache = window._l3Cache || []).push(fact);
                        window._l3Last = { key: op.key, label: op.label, ts: fact.ts };
                        if (window.EITI_DEBUG) console.log('[L3] Сохранён факт:', op.label, '=', op.value);
                        var corrected = op.reason === 'user_correction' || eitiIsCorrection(op.source);
                        if (typeof showToast === 'function') showToast((corrected ? '✏️ L3 исправил: ' : '🧠 L3 запомнил: ') + op.label + ': ' + op.value + (corrected ? ' (старое — в истории)' : ''), 2500);
                    }
                    if (_l3Pending.length) window.eitiL3FlushPending();
                };
                tx.onerror = tx.onabort = function(ev) {
                    if (tx._eitiReported) return;
                    tx._eitiReported = true;
                    _l3RemoveActive(active);
                    if (!_l3IsCurrent(op)) return; // stale abort cannot requeue
                    _l3Queue(op);
                    var er = tx.error || (ev && ev.target && ev.target.error);
                    console.warn('[L3] Ошибка сохранения, факт возвращён в очередь:', er);
                    if (typeof showToast === 'function') showToast((typeof eitiIsQuotaError === 'function' && eitiIsQuotaError(er)) ? '⚠️ Память браузера заполнена — факт «' + op.label + '» ждёт повтора, не закрывайте вкладку' : '⚠️ Факт «' + op.label + '» ждёт повтора, не закрывайте вкладку', 7000);
                };
            } catch(e) {
                if (active) {
                    _l3RemoveActive(active);
                    try { active.tx.abort(); } catch (_) {}
                }
                if (!_l3IsCurrent(op)) return;
                _l3Queue(op);
                console.warn('[L3] Факт возвращён в очередь:', e);
                if (typeof showToast === 'function') showToast('⚠️ Факт «' + op.label + '» ждёт повтора, не закрывайте вкладку', 7000);
            }
        }
        function _l3Save(key, value, label, source, reason) {
            if (!value || String(value).trim().length < 2) return;
            var op = { key: key, value: String(value).trim(), label: label, source: source, reason: reason, revision: _l3NextRevision(key) };
            _l3Pending = _l3Pending.filter(function(a) { return a.key !== key; });
            _l3LastAttempt = { key: key, label: label, ts: Date.now() };
            _l3Attempt(op);
        }

""",
)
substitute(
    "        window.eitiL3Delete = function(key) {",
    "        // Главная функция: сканировать текст пользователя",
    """        window.eitiL3Delete = function(key) {
            if (key == null) return Promise.resolve(false);
            key = String(key);
            // Revoke before attempting IDB deletion; cannot resurrect on retry.
            _l3Cancel(key);
            if (!window.eitiDb) {
                if (typeof showToast === 'function') showToast('⚠️ L3: удаление не подтверждено — база недоступна', 7000);
                return Promise.resolve(false);
            }
            return new Promise(function(resolve) {
                try {
                    var tx = window.eitiDb.transaction(['l3'], 'readwrite');
                    tx.objectStore('l3').delete(key);
                    tx.oncomplete = function() {
                        if (Array.isArray(window._l3Cache)) window._l3Cache = window._l3Cache.filter(function(f) { return f.id !== key; });
                        resolve(true);
                    };
                    tx.onerror = tx.onabort = function(ev) {
                        if (tx._eitiReported) return;
                        tx._eitiReported = true;
                        console.warn('[L3] Ошибка удаления:', tx.error || (ev && ev.target && ev.target.error));
                        if (typeof showToast === 'function') showToast('⚠️ L3: удаление не подтверждено — повторите попытку', 7000);
                        resolve(false);
                    };
                } catch(e) {
                    console.warn('[L3] Ошибка удаления:', e);
                    if (typeof showToast === 'function') showToast('⚠️ L3: удаление не подтверждено — повторите попытку', 7000);
                    resolve(false);
                }
            });
        };

""",
)
start = "        window.eitiL3AutoExtract = function(userText) {"
assert src.count(start) == 1
a = src.index(start)
b = src.index("        // Построить строку контекста из L3", a)
segment = src[a:b]
old_skip = """            if (_mi) {
                if (typeof showToast === 'function') showToast(_mi === 'skip' ? '🙈 Не запоминаю — как вы просили' : '🤔 Не записываю как факт — вы ещё не решили', 2500);
                return;
            }"""
new_skip = """            if (_mi) {
                if (_mi === 'skip') _l3CancelFromSkip(userText);
                if (typeof showToast === 'function') showToast(_mi === 'skip' ? '🙈 Не запоминаю — как вы просили' : '🤔 Не записываю как факт — вы ещё не решили', 2500);
                return;
            }"""
assert segment.count(old_skip) == 1
segment = segment.replace(old_skip, new_skip)
a2 = segment.index("            if (!found.length && eitiIsCorrection(userText)")
b2 = segment.index("        };", a2)
segment = segment[:a2] + r"""            var last = _l3LastAttempt || window._l3Last;
            if (!found.length && eitiIsCorrection(userText) && last && Date.now() - last.ts < 600000) {
                var cm = userText.match(/(?:я\s+ошиб(?:ся|лась)|ошибочка|на\s+самом\s+деле|точнее|поправка)\s*[,:—–-]?\s*(?:не\s+[\wА-Яа-яЁё-]+\s*,\s*а\s+)?([\wА-Яа-яЁё-]{2,})/i);
                if (cm && cm[1]) {
                    _l3Save(last.key, cm[1], last.label, userText.slice(0, 80), 'user_correction');
                    return;
                }
            }
            // Success notification belongs to the matching transaction oncomplete.
""" + segment[b2:]
src = src[:a] + segment + src[b:]
assert src != original
assert src.count("L3 запомнил:") == 1
assert src.count("window.eitiL3Delete = function") == 1
assert src.count("function _l3Save(") == 1
assert src.count("function _l3Attempt(") == 1
path.write_text(src, encoding="utf-8")
print(f"Patched index.html: {len(original)} -> {len(src)} UTF-8 characters")
