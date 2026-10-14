'use strict';
// Tests for eitiLearnFact() — the OFFLINE "smart memory" write path.
// This is what lets EITI learn important things from a conversation with no
// network: it dedupes, scores salience, caps the store at 200, and queues the
// fact for the search index. A silent break here means the assistant simply
// stops remembering — with no error — so these guards matter.

const test = require('node:test');
const assert = require('node:assert');
const { loadFunctions } = require('./harness');

// Minimal localStorage backed by a Map. eitiLearnFact reads/writes EITI_LEARN_KEY.
function fakeLocalStorage(initial) {
  const m = new Map(Object.entries(initial || {}));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    _dump: () => m,
  };
}

// Build a sandbox with eitiLearnFact + its real eitiCalcSalience dependency.
function makeLearner(initialStore) {
  const indexed = [];
  const toasts = [];
  const ls = fakeLocalStorage(
    initialStore ? { eiti_learned_v1: JSON.stringify(initialStore) } : {}
  );
  const sb = loadFunctions(['eitiCalcSalience', 'eitiLearnFact'], {
    EITI_LEARN_KEY: 'eiti_learned_v1',
    localStorage: ls,
    eitiQueueIndexDoc: (id, text, meta) => indexed.push({ id, text, meta }),
    showToast: (msg) => toasts.push(msg),
  });
  const read = () => JSON.parse(ls.getItem('eiti_learned_v1') || '[]');
  return { learn: sb.eitiLearnFact, read, indexed, toasts };
}

test('falsy fact is ignored (no write, no index)', () => {
  const { learn, read, indexed } = makeLearner();
  learn('');
  learn(null);
  learn(undefined);
  assert.deepStrictEqual(read(), []);
  assert.strictEqual(indexed.length, 0);
});

test('a new fact is stored with salience, ts and id, and queued for indexing', () => {
  const { learn, read, indexed } = makeLearner();
  learn('человек любит зелёный чай');
  const store = read();
  assert.strictEqual(store.length, 1);
  assert.strictEqual(store[0].fact, 'человек любит зелёный чай');
  assert.strictEqual(store[0].salience, 1.0); // neutral text → baseline
  assert.ok(typeof store[0].ts === 'number');
  assert.ok(/^fact_/.test(store[0].id));
  // The fact must reach the search index, or it can never be recalled.
  assert.strictEqual(indexed.length, 1);
  assert.strictEqual(indexed[0].text, 'человек любит зелёный чай');
  assert.strictEqual(indexed[0].meta.kind, 'fact');
});

test('salience is carried through from eitiCalcSalience (keyword boosts it)', () => {
  const { learn, read } = makeLearner();
  learn('это ВАЖНО для проекта'); // caps-run (1.5) × keyword "важно" (1.4)
  assert.strictEqual(read()[0].salience, 1.5 * 1.4);
});

test('duplicate fact is not stored twice (dedup by exact text)', () => {
  const { learn, read, indexed } = makeLearner();
  learn('повторяющийся факт');
  learn('повторяющийся факт');
  assert.strictEqual(read().length, 1);
  assert.strictEqual(indexed.length, 1); // not re-indexed either
});

test('store is capped at 200 — newest kept, oldest evicted', () => {
  // Seed 200 distinct facts, then add one more unique fact.
  const seed = Array.from({ length: 200 }, (_, i) => ({
    fact: 'seed_' + i, ts: i, salience: 1.0, id: 'fact_' + i,
  }));
  const { learn, read } = makeLearner(seed);
  learn('freshest_fact');
  const store = read();
  assert.strictEqual(store.length, 200, 'must stay capped at 200');
  assert.ok(store.some((f) => f.fact === 'freshest_fact'), 'new fact retained');
  assert.ok(!store.some((f) => f.fact === 'seed_0'), 'oldest fact evicted');
});

test('a corrupt store does not throw and simply learns nothing', () => {
  // eitiLearnFact wraps everything in try/catch; bad JSON must not crash callers.
  const ls = fakeLocalStorage({ eiti_learned_v1: '{not valid json' });
  const sb = loadFunctions(['eitiCalcSalience', 'eitiLearnFact'], {
    EITI_LEARN_KEY: 'eiti_learned_v1',
    localStorage: ls,
    eitiQueueIndexDoc: () => {},
    showToast: () => {},
  });
  assert.doesNotThrow(() => sb.eitiLearnFact('что-то'));
});
