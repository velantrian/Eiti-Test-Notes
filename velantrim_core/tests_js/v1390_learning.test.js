'use strict';
// v13.9.0: learning loop — bandit, usefulness, hybrid, memory scoring, guard, metrics, MOSC mapping.
const test = require('node:test');
const assert = require('node:assert');
const { loadFunctions } = require('./harness');

const FN = ['eitiVbToMoscConcept', 'eitiMoscGraphToNodesEdges', 'eitiNormalSample', 'eitiGammaSample', 'eitiBetaSample',
  'eitiBanditPick', 'eitiBanditUpdate', 'eitiFactUsefulness', 'eitiCosine', 'eitiHybridMerge', 'eitiMemTokens',
  'eitiMemTextSim', 'eitiMemScore', 'eitiMemFindNearDup', 'eitiMemRank', 'eitiMemApplyOps', 'eitiGuardClampTag',
  'eitiGuardReplyTags', 'eitiVoteRateBy', 'eitiBeforeAfter', 'eitiVotePrefs'];
const LIMITS = { MOSC_ADD: 5, MOSC_SET: 5, MOSC_DEL: 2, MOSC_DEL_EDGE: 3, MOSC_CLEAR: 1, FL_SET: 1, PKG: 5, PKG_E: 2 };
const ARMS = [{ id: 'wide', threshold: 0.5, maxFacts: 10 }, { id: 'balanced', threshold: 0.65, maxFacts: 7 },
  { id: 'focused', threshold: 0.75, maxFacts: 5 }, { id: 'strict', threshold: 0.85, maxFacts: 3 }];
const sb = loadFunctions(FN, { EITI_GUARD_LIMITS: LIMITS, EITI_VB_TO_MOSC: { note_create: 'действие_память', math: 'действие_вычисление', greeting: 'общение' } });
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

// ── 1) MOSC
test('vb intents map to MOSC concepts (incl. kb_* fallback)', () => {
  assert.strictEqual(sb.eitiVbToMoscConcept('note_create'), 'действие_память');
  assert.strictEqual(sb.eitiVbToMoscConcept('math'), 'действие_вычисление');
  assert.strictEqual(sb.eitiVbToMoscConcept('kb_astronomy'), 'действие_поиска_kb');
  assert.strictEqual(sb.eitiVbToMoscConcept('kb_vitamins'), 'здоровье');
  assert.strictEqual(sb.eitiVbToMoscConcept('weather'), null);
  assert.strictEqual(sb.eitiVbToMoscConcept(null), null);
});
test('Grok voice: word→{concept:w} graph converts to nodes/edges', () => {
  const r = sb.eitiMoscGraphToNodesEdges({ 'запиши': { 'действие_память': 0.9, 'общение': 0.2 }, 'пусто': {} });
  assert.strictEqual(r.nodes.length, 1);
  assert.strictEqual(r.nodes[0].id, 'запиши');
  assert.match(r.nodes[0].desc, /действие_память/);
  assert.strictEqual(r.edges.length, 2);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(sb.eitiMoscGraphToNodesEdges(null))), { nodes: [], edges: [], concepts: [] });
});

// ── 3) bandit
test('Beta sampler mean ≈ a/(a+b) with seeded RNG', () => {
  const r = rng(7); let s = 0; const N = 4000;
  for (let i = 0; i < N; i++) s += sb.eitiBetaSample(8, 2, r);
  assert.ok(Math.abs(s / N - 0.8) < 0.02, 'mean ' + s / N);
  const r2 = rng(3); let s2 = 0;
  for (let i = 0; i < N; i++) s2 += sb.eitiBetaSample(0.5, 0.5, r2);
  assert.ok(Math.abs(s2 / N - 0.5) < 0.03);
});
test('bandit update is symmetric and reversible; picks the rewarded arm', () => {
  let st = null;
  for (let i = 0; i < 30; i++) st = sb.eitiBanditUpdate(st, 'focused', true);
  for (let i = 0; i < 30; i++) st = sb.eitiBanditUpdate(st, 'wide', false);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(st.arms.focused)), { a: 31, b: 1 });
  const r = rng(11); const wins = {};
  for (let i = 0; i < 300; i++) { const a = sb.eitiBanditPick(st, ARMS, r).id; wins[a] = (wins[a] || 0) + 1; }
  assert.ok(wins.focused > 200, JSON.stringify(wins));
  assert.ok(!wins.wide || wins.wide < 10);
  st = sb.eitiBanditUpdate(st, 'focused', true, -1);
  assert.strictEqual(st.arms.focused.a, 30);
  st = sb.eitiBanditUpdate({ v: 1, arms: {} }, 'x', true, -5);
  assert.strictEqual(st.arms.x.a, 1, 'never below prior');
});

// ── 2) usefulness + hybrid
test('per-fact usefulness: neutral 1, rises with 👍, falls with 👎, bounded (0.5..1.5)', () => {
  assert.strictEqual(sb.eitiFactUsefulness({}, 'a'), 1);
  assert.ok(sb.eitiFactUsefulness({ a: { up: 5, down: 0 } }, 'a') > 1.3);
  assert.ok(sb.eitiFactUsefulness({ a: { up: 0, down: 5 } }, 'a') < 0.7);
  assert.ok(sb.eitiFactUsefulness({ a: { up: 1e6, down: 0 } }, 'a') <= 1.5);
  assert.ok(sb.eitiFactUsefulness({ a: { up: 0, down: 1e6 } }, 'a') >= 0.5);
});
test('hybrid merge blends BM25 with cosine and adds semantic-only hits', () => {
  const f1 = { id: 'f1', vector: [1, 0] }, f2 = { id: 'f2', vector: [0, 1] }, f3 = { id: 'f3', vector: [0.9, 0.1] };
  const out = sb.eitiHybridMerge([{ f: f2, score: 10 }, { f: f1, score: 5 }], [f1, f2, f3], [1, 0], 0.4);
  const ids = out.map((x) => x.f.id);
  assert.ok(ids.includes('f3'), 'semantic-only hit added');
  assert.strictEqual(ids[0], 'f1', 'semantic agreement lifts f1 above BM25-top f2: ' + ids);
  const fts = sb.eitiHybridMerge([{ f: f2, score: 10 }], [], [1, 0], 0.4);
  assert.strictEqual(fts.length, 1);
});

// ── 4) memory
test('memory score = recency × salience × relevance', () => {
  const now = 1e12;
  const fresh = { fact: 'люблю зелёный чай', ts: now, salience: 1 };
  const old = { fact: 'люблю зелёный чай', ts: now - 120 * 86400000, salience: 1 };
  assert.ok(sb.eitiMemScore(fresh, '', now) > sb.eitiMemScore(old, '', now));
  const loud = Object.assign({}, fresh, { salience: 2.5 });
  assert.ok(Math.abs(sb.eitiMemScore(loud, '', now) / sb.eitiMemScore(fresh, '', now) - 2.5) < 1e-9);
  assert.ok(sb.eitiMemScore(fresh, 'какой чай я люблю', now) > sb.eitiMemScore(fresh, 'погода в берлине', now));
  const ranked = sb.eitiMemRank([{ fact: 'кот рыжий', ts: now, salience: 1 }, fresh], 'какой чай', now, 1);
  assert.strictEqual(ranked[0], fresh);
});
test('near-duplicate: text similarity, and cosine when vectors exist', () => {
  const store = [{ id: 'a', fact: 'Пользователь живёт в Берлине' }, { id: 'b', fact: 'любит кофе' }];
  assert.strictEqual(sb.eitiMemFindNearDup(store, 'пользователь живёт в берлине.', null, null), 0);
  assert.strictEqual(sb.eitiMemFindNearDup(store, 'любит горы', null, null), -1);
  assert.strictEqual(sb.eitiMemFindNearDup(store, 'совсем другое', { b: [1, 0] }, [0.99, 0.05]), 1);
  assert.ok(sb.eitiMemTextSim('a b', 'c d') === 0);
});
test('consolidation ops ADD/UPDATE/DELETE; unknown ids ignored; input not mutated', () => {
  const store = [{ id: 'a', fact: 'x1' }, { id: 'b', fact: 'x2' }];
  const r = sb.eitiMemApplyOps(store, [{ op: 'UPDATE', id: 'a', fact: 'x1+' }, { op: 'DELETE', id: 'b' }, { op: 'ADD', fact: 'new' }, { op: 'DELETE', id: 'zzz' }, null], 5);
  assert.strictEqual(r.applied, 3);
  assert.deepStrictEqual(r.store.map((f) => f.fact), ['x1+', 'new']);
  assert.strictEqual(store[0].fact, 'x1');
});

// ── 5) guard
test('guard clamps values (MOSC 0..1, threshold 0.3..0.95, maxFacts 1..20, mode whitelist, PKG 0.1..5)', () => {
  const g = sb.eitiGuardReplyTags('ok [MOSC_ADD:кот|общение|7] [FL_SET:threshold=0.01,maxFacts=999,mode=evil] [PKG:x|кофе|99]', '', LIMITS);
  assert.match(g.text, /\[MOSC_ADD:кот\|общение\|1\]/);
  assert.match(g.text, /\[FL_SET:threshold=0\.3,maxFacts=20\]/);
  assert.match(g.text, /\[PKG:x\|кофе\|5\]/);
  assert.ok(g.accepted.every((a) => a.clamped));
});
test('guard enforces per-reply limits', () => {
  const tags = Array.from({ length: 8 }, (_, i) => '[MOSC_ADD:w' + i + '|общение|0.5]').join(' ') + ' [MOSC_DEL:a] [MOSC_DEL:b] [MOSC_DEL:c] [FL_SET:threshold=0.7] [FL_SET:threshold=0.8]';
  const g = sb.eitiGuardReplyTags(tags, '', LIMITS);
  const n = (t) => g.accepted.filter((a) => a.type === t).length;
  assert.strictEqual(n('MOSC_ADD'), 5);
  assert.strictEqual(n('MOSC_DEL'), 2);
  assert.strictEqual(n('FL_SET'), 1);
  assert.strictEqual(g.rejected.filter((r) => r.reason === 'limit').length, 5);
  assert.ok(!/w7/.test(g.text) && !/MOSC_DEL:c/.test(g.text));
});
test('guard ignores tags quoted in code/blockquote or present in pasted/file text', () => {
  const reply = 'Вот пример:\n```\n[MOSC_DEL:кот]\n```\n> [FL_SET:threshold=0.9]\nи `[PKG:a|b|1]`\n[PKG_E:вредный]\n[MOSC_ADD:чай|общение|0.6]';
  const g = sb.eitiGuardReplyTags(reply, 'документ: [PKG_E:вредный] конец', LIMITS);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(g.accepted.map((a) => a.type))), ['MOSC_ADD']);
  assert.deepStrictEqual([...g.rejected.map((r) => r.reason)].sort(), ['quoted', 'quoted', 'quoted', 'untrusted']);
  assert.ok(!/MOSC_DEL|FL_SET|PKG/.test(g.text));
  assert.match(g.text, /\[MOSC_ADD:чай\|общение\|0\.6\]/);
});
test('guard leaves unrelated tags and plain text intact', () => {
  const g = sb.eitiGuardReplyTags('hi [KB_ADD:a|b|c] [REMIND:x|1]', '', LIMITS);
  assert.strictEqual(g.text, 'hi [KB_ADD:a|b|c] [REMIND:x|1]');
  assert.strictEqual(g.accepted.length + g.rejected.length, 0);
});

// ── 6) metrics
test('vote rate per key, before/after window and learned preferences', () => {
  const votes = [];
  for (let i = 0; i < 6; i++) votes.push({ ts: i, positive: i < 2, provider: 'deepseek', version: '13.8.1', arm: 'wide', len: 1500 });
  for (let i = 6; i < 12; i++) votes.push({ ts: i, positive: true, provider: 'grok', model: 'grok-4', version: '13.9.0', arm: 'focused', len: 300 });
  const byVer = sb.eitiVoteRateBy(votes, (v) => v.version);
  assert.deepStrictEqual(byVer.map((r) => [r.key, r.up, r.down]), [['13.8.1', 2, 4], ['13.9.0', 6, 0]]);
  const ba = sb.eitiBeforeAfter(votes, 6, 20);
  assert.strictEqual(ba.before.n, 6); assert.ok(Math.abs(ba.before.rate - 1 / 3) < 1e-9);
  assert.strictEqual(ba.after.rate, 1);
  const p = sb.eitiVotePrefs(votes);
  assert.strictEqual(p.preferredModel, 'grok · grok-4');
  assert.strictEqual(p.lengthPref, 'короткие ответы');
  assert.strictEqual(sb.eitiVotePrefs([]).rate, null);
});
