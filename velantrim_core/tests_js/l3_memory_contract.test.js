'use strict';
// L3 Memory Contract — AUDIT ONLY (see docs/l3_memory_inventory.md).
// Pins the CURRENT behaviour of the compat personal-memory write path (eitiLearnFact
// over localStorage eiti_learned_v1). v14.15.0: silent-loss gaps are fixed and pinned as real tests;
// remaining test.todo items are handled by later PRs.
const test = require('node:test');
const assert = require('node:assert');
const { loadFunctions } = require('./harness');

function make(raw) {
  const m = new Map(raw === undefined ? [] : [['eiti_learned_v1', raw]]);
  const ls = { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
  const indexed = [], toasts = [], errors = [];
  const sb = loadFunctions(['eitiCalcSalience', 'eitiMemTokens', 'eitiMemTextSim', 'eitiCosine', 'eitiMemFindNearDup', 'eitiMemIntent', 'eitiIsQuotaError', 'eitiSafeLSWrite', 'eitiReadListSafe', 'eitiNewFactId', 'eitiMemKVActive', 'eitiLearnLoad', 'eitiLearnSave', 'eitiLearnFact'], {
    EITI_LEARN_KEY: 'eiti_learned_v1', localStorage: ls,
    eitiQueueIndexDoc: (id, t) => indexed.push(t), showToast: (t) => toasts.push(t),
    console: { log() {}, info() {}, warn: (...a) => errors.push(a), error: (...a) => errors.push(a) },
  });
  return { learn: sb.eitiLearnFact, raw: () => m.get('eiti_learned_v1'), indexed, toasts, errors, map: m, ls };
}

test('corrupted eiti_learned_v1 JSON → quarantined to a .corrupt.<ts> key, new fact still persisted, user warned (v14.15.0)', () => {
  const s = make('{not json');
  assert.doesNotThrow(() => s.learn('Пользователь любит зелёный чай'));
  const st = JSON.parse(s.raw());
  assert.strictEqual(st.length, 1);
  assert.strictEqual(st[0].fact, 'Пользователь любит зелёный чай');
  const bk = [...s.map.keys()].filter((k) => k.startsWith('eiti_learned_v1.corrupt.'));
  assert.strictEqual(bk.length, 1);
  assert.strictEqual(s.map.get(bk[0]), '{not json'); // original bytes kept
  assert.strictEqual(s.indexed.length, 1);
  assert.ok(s.toasts.some((t) => /повреждена/.test(t)));
});

test('QuotaExceeded on write → user is told, function does not throw, nothing indexed (v14.15.0)', () => {
  const s = make();
  s.ls.setItem = () => { const e = new Error('full'); e.name = 'QuotaExceededError'; throw e; };
  assert.doesNotThrow(() => s.learn('Пользователь любит зелёный чай'));
  assert.strictEqual(s.indexed.length, 0);
  assert.ok(s.toasts.some((t) => /заполнена/.test(t)), JSON.stringify(s.toasts));
});

test('archive eviction: if the archive write fails, evicted facts stay in the main list (v14.15.0)', () => {
  const full = Array.from({ length: 200 }, (_, i) => ({ fact: 'уникальный факт номер ' + i + ' ' + 'абвгдежзик'.slice(i % 10), ts: 1000 + i, salience: 1, id: 'f' + i }));
  const s = make(JSON.stringify(full));
  const orig = s.ls.setItem;
  s.ls.setItem = (k, v) => { if (k === 'eiti_learned_archive_v1') { const e = new Error('x'); e.name = 'QuotaExceededError'; throw e; } return orig(k, v); };
  s.learn('совершенно новый факт про морских черепах');
  const st = JSON.parse(s.raw());
  assert.strictEqual(st.length, 201); // nothing lost
  assert.ok(st.some((f) => f.id === 'f0'));
});

test('archive eviction: archive written first, then main list trimmed to 200 (v14.15.0)', () => {
  const full = Array.from({ length: 200 }, (_, i) => ({ fact: 'уникальный факт номер ' + i + ' ' + 'абвгдежзик'.slice(i % 10), ts: 1000 + i, salience: 1, id: 'f' + i }));
  const s = make(JSON.stringify(full));
  s.learn('совершенно новый факт про морских черепах');
  assert.strictEqual(JSON.parse(s.raw()).length, 200);
  assert.strictEqual(JSON.parse(s.map.get('eiti_learned_archive_v1')).length, 1);
});

test('«не запоминай» and variants are honoured by eitiLearnFact — nothing is written', () => {
  for (const t of ['не запоминай это: пароль от почты лежит в столе', 'Не сохраняй: мой PIN 1234', 'забудь это, я живу на Нёрребро', "Don't remember this: my bank is X", 'forget that I said I smoke', 'не надо запоминать мой адрес']) {
    const s = make();
    s.learn(t);
    assert.strictEqual(s.raw(), undefined, t);
    assert.strictEqual(s.indexed.length, 0, t);
    assert.match(s.toasts[0], /Не запоминаю/, t);
  }
});

test('«я ещё не решил» and variants are NOT stored as facts', () => {
  for (const t of ['я ещё не решил, переезжать ли в Берлин', 'Я еще не решила, где учиться', 'пока не решил насчёт работы', "I haven't decided yet whether to move"]) {
    const s = make();
    s.learn(t);
    assert.strictEqual(s.raw(), undefined, t);
    assert.match(s.toasts[0], /ещё не решили/, t);
  }
});

test('«не забудь …» (= remember!) is still stored', () => {
  const s = make();
  s.learn('не забудь, что я люблю зелёный чай');
  assert.strictEqual(JSON.parse(s.raw()).length, 1);
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

test('ids are unique even within the same millisecond (v14.15.0)', () => {
  const realNow = Date.now; Date.now = () => 1700000000000;
  try { const s = make(); s.learn('любит чай'); s.learn('работает инженером в порту'); const st = JSON.parse(s.raw());
    assert.strictEqual(st.length, 2); assert.notStrictEqual(st[0].id, st[1].id); assert.match(st[0].id, /^fact_1700000000000_/); } finally { Date.now = realNow; }
});
