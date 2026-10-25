'use strict';
// L3 Memory Contract — AUDIT ONLY (see docs/l3_memory_inventory.md).
// Pins the CURRENT behaviour of the compat personal-memory write path (eitiLearnFact
// over localStorage eiti_learned_v1). "KNOWN GAP" tests describe today's behaviour,
// the desired behaviour is recorded as test.todo so CI stays green.
const test = require('node:test');
const assert = require('node:assert');
const { loadFunctions } = require('./harness');

function make(raw) {
  const m = new Map(raw === undefined ? [] : [['eiti_learned_v1', raw]]);
  const ls = { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
  const indexed = [], toasts = [], errors = [];
  const sb = loadFunctions(['eitiCalcSalience', 'eitiMemTokens', 'eitiMemTextSim', 'eitiCosine', 'eitiMemFindNearDup', 'eitiLearnFact'], {
    EITI_LEARN_KEY: 'eiti_learned_v1', localStorage: ls,
    eitiQueueIndexDoc: (id, t) => indexed.push(t), showToast: (t) => toasts.push(t),
    console: { log() {}, info() {}, warn: (...a) => errors.push(a), error: (...a) => errors.push(a) },
  });
  return { learn: sb.eitiLearnFact, raw: () => m.get('eiti_learned_v1'), indexed, toasts, errors };
}

test('KNOWN GAP: corrupted eiti_learned_v1 JSON → eitiLearnFact silently stores nothing', () => {
  const s = make('{not json');
  assert.doesNotThrow(() => s.learn('Пользователь любит зелёный чай'));
  assert.strictEqual(s.raw(), '{not json'); // corrupt value is left as is (not repaired, not backed up)
  assert.strictEqual(s.indexed.length, 0); // fact never reaches the search index
  assert.strictEqual(s.toasts.length, 0); // no user-visible signal
});
test.todo('desired: corrupted compat store is quarantined (backup key) and the new fact is still persisted + user warned');

test('KNOWN GAP: «не запоминай» is not honoured by eitiLearnFact — the text is stored verbatim', () => {
  const s = make();
  s.learn('не запоминай это: пароль от почты лежит в столе');
  const st = JSON.parse(s.raw());
  assert.strictEqual(st.length, 1);
  assert.match(st[0].fact, /пароль от почты/);
  assert.deepStrictEqual(Object.keys(st[0]).sort().filter((k) => /do_not_store|status|confidence|history/.test(k)), []);
});
test.todo('desired: do-not-store intent → record is not written (or written as tombstone with do_not_store=true)');

test('KNOWN GAP: «я ещё не решил» — tentative statement stored as a plain fact (no epistemic status)', () => {
  const s = make();
  s.learn('я ещё не решил, переезжать ли в Берлин');
  const st = JSON.parse(s.raw());
  assert.strictEqual(st.length, 1);
  assert.strictEqual(st[0].epistemic_state, undefined);
});

test('correction: contradicting fact is ADDED next to the old one — old fact is not superseded', () => {
  const s = make();
  s.learn('Пользователь живёт в Москве');
  s.learn('Пользователь живёт в Копенгагене, а не в Москве');
  const st = JSON.parse(s.raw());
  const txt = st.map((f) => f.fact).join(' | ');
  assert.match(txt, /Москве/);
  assert.strictEqual(st.length, 2); // current: appended, both "true" at once
  assert.ok(st.every((f) => f.history === undefined && f.supersedes === undefined));
});
test.todo('desired: correction keeps a correction_history[] and marks the old value superseded');

test('KNOWN GAP: ids are fact_<Date.now()> — two facts learned in the same millisecond can share an id', () => {
  const realNow = Date.now; Date.now = () => 1700000000000;
  try { const s = make(); s.learn('любит чай'); s.learn('работает инженером в порту'); const st = JSON.parse(s.raw());
    assert.strictEqual(st.length, 2); assert.strictEqual(st[0].id, st[1].id); } finally { Date.now = realNow; }
});
