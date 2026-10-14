'use strict';
// Tests for eitiApplyAnalysis() — the write side of "learn from the dialogue".
// eitiAnalyzeChat asks an LLM to summarise the conversation and return JSON with
// new KB facts, VB intent patterns, MOSC graph edges and FL retrieval weights;
// eitiApplyAnalysis commits that JSON into the assistant's long-term memory.
//
// Because the input is raw model output, the dangerous failure modes are:
//   • a malformed VB regex throwing and aborting the whole apply, and
//   • partial/empty sections corrupting stores.
// These tests pin the safe behaviour using stubbed memory stores.

const test = require('node:test');
const assert = require('node:assert');
const { loadFunctions } = require('./harness');

function fakeLocalStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}

// MOSC persistence stub: a 'reasoning' store whose get() resolves synchronously
// (setting onsuccess fires it) so we can observe the mutated graph + put().
function moscDb(existingGraph, putCalls) {
  const store = {
    get() {
      const req = { result: { data: existingGraph } };
      Object.defineProperty(req, 'onsuccess', { set(fn) { fn(); } });
      return req;
    },
    put(val) { putCalls.push(val); },
  };
  return { transaction: () => ({ objectStore: () => store }) };
}

function makeApply(opts) {
  opts = opts || {};
  const state = {
    kb: [],
    vbPatterns: [],
    vbSaved: null,
    retrievalCfg: { mode: 'hybrid', threshold: 0.65, maxFacts: 7 },
    replies: [],
    moscPuts: [],
    window: {},
  };
  const ls = fakeLocalStorage();
  const sb = loadFunctions(['eitiApplyAnalysis'], {
    window: state.window,
    localStorage: ls,
    setTimeout: () => {},
    eitiKBLoad: () => state.kb,
    eitiKBSave: (facts) => { state.kb = facts; },
    _vbIntentPatterns: state.vbPatterns,
    _vbSaveToIDB: (stored) => { state.vbSaved = stored; },
    eitiDb: opts.withMosc ? moscDb(opts.existingGraph || {}, state.moscPuts) : null,
    eitiGetRetrievalConfig: () => state.retrievalCfg,
    eitiReceiveReply: (msg) => state.replies.push(msg),
    showToast: () => {},
    _readCfg: () => JSON.parse(ls.getItem('eiti_retrieval_cfg') || 'null'),
  });
  state.apply = (pending) => {
    state.window._eitiPendingAnalysis = pending;
    sb.eitiApplyAnalysis();
  };
  state.readCfg = () => JSON.parse(ls.getItem('eiti_retrieval_cfg') || 'null');
  return state;
}

test('no pending analysis → nothing applied, no crash', () => {
  const s = makeApply();
  assert.doesNotThrow(() => s.apply(null));
  assert.deepStrictEqual(s.kb, []);
  assert.strictEqual(s.vbSaved, null);
});

test('KB facts are appended with id/source metadata; invalid ones skipped', () => {
  const s = makeApply();
  s.apply({
    kb: [
      { triggers: ['зелёный чай'], answer: 'Любимый напиток', category: 'profile' },
      { answer: 'нет триггеров — отбрасывается' }, // missing triggers → skipped
      { triggers: ['x'] },                          // missing answer  → skipped
    ],
  });
  assert.strictEqual(s.kb.length, 1, 'only the valid fact is stored');
  assert.deepStrictEqual(s.kb[0].triggers, ['зелёный чай']);
  assert.strictEqual(s.kb[0].answer, 'Любимый напиток');
  assert.strictEqual(s.kb[0].category, 'profile');
  assert.strictEqual(s.kb[0].source, 'chat_analysis');
  assert.ok(/^kb_analyze_/.test(s.kb[0].id));
});

test('a malformed VB regex does NOT abort the apply — valid patterns survive', () => {
  const s = makeApply();
  s.apply({
    vb: [
      { intent: 'greet', pattern: 'привет|здравствуй' }, // valid
      { intent: 'broken', pattern: '(' },                // invalid regex → caught
      { intent: 'bye', pattern: 'пока' },                // valid
    ],
  });
  // The two valid patterns must have been compiled and saved despite the bad one.
  const intents = s.vbSaved.map((p) => p.intent);
  assert.ok(intents.includes('greet'));
  assert.ok(intents.includes('bye'));
  assert.ok(!intents.includes('broken'), 'invalid regex must not be persisted');
});

test('FL weights are merged into retrieval config and persisted with provenance', () => {
  const s = makeApply();
  s.apply({ fl: { threshold: 0.85, maxFacts: 12, mode: 'bm25' } });
  const cfg = s.readCfg();
  assert.strictEqual(cfg.threshold, 0.85);
  assert.strictEqual(cfg.maxFacts, 12);
  assert.strictEqual(cfg.mode, 'bm25');
  assert.strictEqual(cfg._source, 'chat_analysis');
  assert.ok(cfg._savedAt, 'stamps when it was learned');
});

test('partial FL only overrides provided fields, keeps the rest', () => {
  const s = makeApply();
  s.apply({ fl: { threshold: 0.4 } }); // only threshold given
  const cfg = s.readCfg();
  assert.strictEqual(cfg.threshold, 0.4);
  assert.strictEqual(cfg.maxFacts, 7, 'untouched maxFacts preserved');
  assert.strictEqual(cfg.mode, 'hybrid', 'untouched mode preserved');
});

test('MOSC edges are merged into the reasoning graph and persisted', () => {
  const s = makeApply({ withMosc: true, existingGraph: { старое: { концепт: 0.5 } } });
  s.apply({
    mosc: [
      { word: 'Чай', concept: 'напиток', weight: 0.9 }, // word lower-cased
      { word: '', concept: 'skip', weight: 0.5 },        // empty word → skipped
    ],
  });
  assert.strictEqual(s.moscPuts.length, 1, 'graph persisted once');
  const graph = s.moscPuts[0].data;
  assert.strictEqual(graph['чай'].напиток, 0.9);
  assert.strictEqual(graph['старое'].концепт, 0.5, 'existing edges preserved');
  assert.ok(!('' in graph), 'empty-word edge not added');
});

test('a full mixed analysis reports every applied section back to the user', () => {
  const s = makeApply({ withMosc: true });
  s.apply({
    kb: [{ triggers: ['t'], answer: 'a' }],
    vb: [{ intent: 'i', pattern: 'p' }],
    mosc: [{ word: 'w', concept: 'c', weight: 0.6 }],
    fl: { threshold: 0.7 },
  });
  const finalReply = s.replies[s.replies.length - 1];
  assert.match(finalReply, /Применено/);
  assert.match(finalReply, /KB \+1/);
  assert.match(finalReply, /VB \+1/);
  assert.match(finalReply, /MOSC \+1/);
  assert.match(finalReply, /FL обновлён/);
});

test('pending analysis is cleared after applying (no double-apply)', () => {
  const s = makeApply();
  s.apply({ kb: [{ triggers: ['t'], answer: 'a' }] });
  assert.strictEqual(s.window._eitiPendingAnalysis, null);
});
