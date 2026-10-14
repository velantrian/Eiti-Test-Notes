'use strict';
// Tests for eitiFullCtxBuild() — the memory aggregator behind "Full Context".
// It gathers notes (IndexedDB) + knowledge base + personal memory into one
// labelled block that is injected into the prompt. This is the substrate that
// lets any model — even after the user switches providers — see what EITI knows.
// The contract that matters: it gates on a flag, caps each source, tolerates a
// broken source without losing the others, and labels each section.

const test = require('node:test');
const assert = require('node:assert');
const { loadFunctions } = require('./harness');

// IndexedDB stub whose notes objectStore.getAll() resolves to `notes`.
function notesDb(notes) {
  return {
    transaction: () => ({
      objectStore: () => ({
        getAll() {
          const req = {};
          Object.defineProperty(req, 'onsuccess', { set(fn) { req.result = notes; fn(); } });
          Object.defineProperty(req, 'onerror', { set() {} });
          return req;
        },
      }),
    }),
  };
}

// A DB whose transaction throws — simulates a notes source failure.
function brokenDb() {
  return { transaction() { throw new Error('idb down'); } };
}

function build(opts) {
  opts = opts || {};
  const win = { eitiDb: 'db' in opts ? opts.db : null };
  const extras = {
    window: win,
    localStorage: {
      getItem: (k) => (k === 'eiti_fullctx_v1' ? (opts.enabled ? '1' : '0') : null),
    },
    FULLCTX_KEY: 'eiti_fullctx_v1',
    Promise, // async function + `await new Promise(...)` need the real Promise
  };
  if ('kb' in opts) extras.eitiKBLoad = () => opts.kb;
  if ('mem' in opts) extras.memLoadAsync = () => Promise.resolve(opts.mem);
  const sb = loadFunctions(['eitiFullCtxIsEnabled', 'eitiFullCtxBuild'], extras);
  return sb.eitiFullCtxBuild();
}

test('disabled flag short-circuits to empty string', async () => {
  const out = await build({ enabled: false, db: notesDb([{ title: 'x', content: 'y' }]) });
  assert.strictEqual(out, '');
});

test('enabled but no sources → empty string', async () => {
  const out = await build({ enabled: true });
  assert.strictEqual(out, '');
});

test('notes are labelled, numbered and included', async () => {
  const out = await build({
    enabled: true,
    db: notesDb([{ title: 'Проект', content: 'описание проекта' }]),
  });
  assert.match(out, /ПОЛНЫЙ КОНТЕКСТ ДАННЫХ/);
  assert.match(out, /📝 ЗАМЕТКИ \(1\)/);
  assert.match(out, /\[1\] Проект — описание проекта/);
});

test('deleted notes and empty notes are filtered out', async () => {
  const out = await build({
    enabled: true,
    db: notesDb([
      { title: 'keep', content: 'body' },
      { status: 'deleted', title: 'gone', content: 'should not show' },
      { title: '', content: '' }, // no title/content → dropped
    ]),
  });
  assert.match(out, /📝 ЗАМЕТКИ \(1\)/);
  assert.doesNotMatch(out, /gone/);
});

test('notes are capped at 200', async () => {
  const many = Array.from({ length: 250 }, (_, i) => ({ title: 't' + i, content: 'c' }));
  const out = await build({ enabled: true, db: notesDb(many) });
  assert.match(out, /📝 ЗАМЕТКИ \(200\)/);
});

test('knowledge base and personal memory get their own labelled sections', async () => {
  const out = await build({
    enabled: true,
    kb: [{ question: 'Что такое EITI?', answer: 'персональный ассистент' }],
    mem: [{ text: 'пользователь любит краткость' }],
  });
  assert.match(out, /📚 БАЗА ЗНАНИЙ \(1\)/);
  assert.match(out, /Что такое EITI\?: персональный ассистент/);
  assert.match(out, /🧠 ЛИЧНАЯ ПАМЯТЬ \(1\)/);
  assert.match(out, /пользователь любит краткость/);
});

test('memory accepts both array and {entries:[...]} shapes', async () => {
  const out = await build({
    enabled: true,
    mem: { entries: [{ content: 'факт из обёртки' }] },
  });
  assert.match(out, /🧠 ЛИЧНАЯ ПАМЯТЬ \(1\)/);
  assert.match(out, /факт из обёртки/);
});

test('a broken notes source does NOT lose KB/memory (per-source isolation)', async () => {
  const out = await build({
    enabled: true,
    db: brokenDb(),
    kb: [{ question: 'q', answer: 'a' }],
    mem: [{ text: 'осталось в памяти' }],
  });
  assert.doesNotMatch(out, /📝 ЗАМЕТКИ/); // notes failed silently
  assert.match(out, /📚 БАЗА ЗНАНИЙ \(1\)/); // but KB survived
  assert.match(out, /осталось в памяти/);    // and memory survived
});
