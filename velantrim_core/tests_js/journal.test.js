// v14.9.0: journal engine — migration, dedup, per-chat views, tombstones, chat detach, Drive sync of journal records.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const J = require(path.join(__dirname, '..', '..', 'local', 'eiti_journal.js'));
const S = require(path.join(__dirname, '..', '..', 'local', 'eiti_drive_sync.js'));
const T0 = 1_700_000_000_000;

const blob = { data: {
  goals: [{ id: 'g1', text: 'Выучить немецкий', priority: 'high' }],
  facts: [{ text: 'Живу в Берлине', confidence: 0.9 }, 'Люблю кофе'],
  questions: [{ text: 'Какой курс?' }], gaps: [], 
  solutions: [{ text: 'Курс A1', for_goal: 'g1' }],
  smartSections: [{ title: 'Работа', items: ['Пишу код'] }],
  chatHistory: [{ a: 1 }], lastExtracted: T0, msgCountSinceExtract: 3 } };

test('migration converts the legacy blob and is idempotent', () => {
  const m = J.migrate(blob, [], [], { now: T0 });
  assert.strictEqual(m.items.length, 6);
  assert.ok(m.contexts.find((c) => c.id === J.LEGACY_CTX && c.title === 'Общее'));
  assert.ok(m.contexts.find((c) => c.title === 'Работа'));
  const goal = m.items.find((r) => r.kind === 'goal');
  assert.strictEqual(m.items.find((r) => r.text === 'Курс A1').parentId, goal.id);
  assert.ok(m.items.every((r) => r.id.startsWith('j_') && r.del === 0 && r.hash));
  assert.strictEqual(m.meta.migrated, 1);
  assert.deepStrictEqual(m.meta.chatHistory, [{ a: 1 }]);
  const again = J.migrate(blob, m.items, m.contexts, { now: T0 + 5 });
  assert.strictEqual(again.items.length, 6);
  assert.strictEqual(again.changed.length, 0);
  const v = J.view(m.items, {});
  assert.strictEqual(v.goals[0].text, 'Выучить немецкий');
  assert.strictEqual(v.solutions[0].for_goal, goal.id);
});

test('dedup by normalized text inside one chat, separate across chats', () => {
  const items = [];
  J.upsert(items, 'fact', { text: 'Живу в Берлине' }, { chatId: 'c1', now: T0, msgIds: ['m1'] });
  const r = J.upsert(items, 'fact', { text: '  живу   в берлине!', confidence: 0.8 }, { chatId: 'c1', now: T0 + 10, msgIds: ['m2'] });
  assert.strictEqual(r.created, false);
  assert.strictEqual(items.length, 1);
  assert.deepStrictEqual(items[0].msgIds, ['m1', 'm2']);
  assert.ok(items[0].updatedAt >= T0 + 10);
  J.upsert(items, 'fact', { text: 'Живу в Берлине' }, { chatId: 'c2', now: T0 });
  assert.strictEqual(items.length, 2);
  // same first 60 chars, different text → not a duplicate
  const p = 'x'.repeat(60);
  J.upsert(items, 'fact', p + 'a', { chatId: 'c1' }); J.upsert(items, 'fact', p + 'b', { chatId: 'c1' });
  assert.strictEqual(items.length, 4);
});

test('per-chat, dated and AI views', () => {
  const items = [];
  J.upsert(items, 'fact', 'A chat1', { chatId: 'c1', now: T0 + 1 });
  J.upsert(items, 'fact', 'B chat2', { chatId: 'c2', now: T0 + 3, contextId: 'ctx_x' });
  J.upsert(items, 'fact', 'C global', { chatId: null, now: T0 + 2 });
  assert.deepStrictEqual(J.view(items, { mode: 'perchat', chatId: 'c1' }).facts.map((f) => f.text), ['A chat1']);
  assert.deepStrictEqual(J.view(items, { mode: 'dated' }).facts.map((f) => f.text), ['B chat2', 'C global', 'A chat1']);
  assert.deepStrictEqual(J.forAI(items, { chatId: 'c1', contextId: 'ctx_x' }).facts.map((f) => f.text), ['A chat1', 'B chat2', 'C global']);
  assert.strictEqual(J.forAI(items, { chatId: 'c1', cap: 1 }).facts.length, 1);
});

test('tombstones hide items, clear tombstones all, re-adding creates a new record', () => {
  const items = [];
  const r = J.upsert(items, 'goal', 'Цель', { now: T0 }).rec;
  J.tombstone(r, T0 + 5);
  assert.strictEqual(r.del, 1);
  assert.strictEqual(J.view(items, {}).goals.length, 0);
  J.upsert(items, 'goal', 'Цель', { now: T0 + 6 });
  assert.strictEqual(J.view(items, {}).goals.length, 1);
  assert.strictEqual(J.tombstoneAll(items, T0 + 9).length, 1);
  assert.strictEqual(J.view(items, {}).goals.length, 0);
});

test('deleting a chat detaches its items and context links', () => {
  const items = [], ctx = [];
  J.upsert(items, 'fact', 'f', { chatId: 'c1', now: T0 });
  J.ensureContext(ctx, 'ctx_a', 'A', 'c1', T0);
  const d = J.detachChat(items, ctx, 'c1', T0 + 1);
  assert.strictEqual(d.items.length, 1);
  assert.strictEqual(items[0].chatId, null);
  assert.deepStrictEqual(ctx[0].chatIds, []);
});

test('journal records sync between two devices with tombstones (Drive LWW)', () => {
  const KEYS = { journal: 'id', contexts: 'id' };
  const drive = { file: null };
  const dev = () => ({ data: { stores: { journal: [], contexts: [] }, settings: {} }, state: {} });
  function sync(d, now) {
    now += T0;
    const m = S.merge(S.buildLocal(d.data, KEYS, d.state, now), S.fromRemote(drive.file && JSON.parse(drive.file)), now);
    for (const n of Object.keys(m.apply.stores)) {
      const a = m.apply.stores[n];
      let list = d.data.stores[n].filter((it) => !a.dels.includes(String(it.id)));
      for (const p of a.puts) { list = list.filter((it) => it.id !== p.id); list.push(p); }
      d.data.stores[n] = list;
    }
    if (m.remoteChanged || !drive.file) drive.file = JSON.stringify(S.toFile(m.sync, '14.9.0', now));
    d.state = m.state;
  }
  const a = dev(), b = dev();
  const rec = J.upsert(a.data.stores.journal, 'fact', 'общий факт', { chatId: 'c1', now: T0 + 100 }).rec;
  sync(a, 1000); sync(b, 2000);
  assert.strictEqual(J.view(b.data.stores.journal, {}).facts[0].text, 'общий факт');
  const onB = b.data.stores.journal.find((r) => r.id === rec.id);
  J.tombstone(onB, T0 + 3000);
  sync(b, 3000); sync(a, 4000);
  assert.strictEqual(J.view(a.data.stores.journal, {}).facts.length, 0);
});

test('voice: eitiResamplePCM16 48k → 16k keeps duration and amplitude (iPhone mic)', () => {
  const fs = require('fs');
  const html = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');
  const i = html.indexOf('function eitiResamplePCM16(');
  const src = html.slice(i, html.indexOf('window.eitiResamplePCM16', i));
  const fn = new Function(src + '; return eitiResamplePCM16;')();
  const inp = new Int16Array(4800).fill(1000);
  const out = fn(inp, 48000, 16000);
  assert.strictEqual(out.length, 1600);
  assert.ok(Math.abs(out[800] - 1000) <= 1);
  assert.strictEqual(fn(inp, 16000, 16000).length, 4800);
});
