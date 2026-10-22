// v14.1.0: KB library — schema, duplicates, held-out retrieval accuracy, size and speed, host wiring.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..', '..');
const KB = path.join(ROOT, 'kb');
const K = require(path.join(KB, 'eiti_kb.js'));
const idx = JSON.parse(fs.readFileSync(path.join(KB, 'index.json'), 'utf8'));
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

test('schema: index + every domain pack', () => {
  assert.strictEqual(idx.format, 'eiti-kb-lib');
  assert.ok(idx.count >= 500, 'at least 500 entries, got ' + idx.count);
  assert.strictEqual(idx.entries.length, idx.count);
  const doms = Object.keys(idx.domains);
  assert.ok(doms.length >= 12);
  let total = 0;
  for (const d of doms) {
    const m = idx.domains[d];
    const p = JSON.parse(fs.readFileSync(path.join(KB, m.file), 'utf8'));
    assert.strictEqual(p.domain, d);
    const ids = Object.keys(p.entries);
    assert.strictEqual(ids.length, m.count);
    total += ids.length;
    for (const id of ids) {
      const e = p.entries[id];
      assert.match(id, new RegExp('^kbl_' + d + '_[0-9a-f]{6}$'));
      assert.ok(Array.isArray(e.q) && e.q.length >= 1 && e.q.every((t) => typeof t === 'string' && t.trim()));
      assert.ok(typeof e.a === 'string' && e.a.length >= 20 && e.a.length <= 700, id + ' answer length');
      if (e.en !== undefined) assert.ok(e.en.length >= 10);
    }
  }
  assert.strictEqual(total, idx.count);
  for (const e of idx.entries) assert.ok(idx.domains[e.d] && e.i && e.t && e.k);
});

test('no duplicate ids, triggers or answers', () => {
  const ids = new Set(), trig = new Map(), ans = new Set();
  for (const d of Object.keys(idx.domains)) {
    const p = JSON.parse(fs.readFileSync(path.join(KB, idx.domains[d].file), 'utf8'));
    for (const [id, e] of Object.entries(p.entries)) {
      assert.ok(!ids.has(id), 'dup id ' + id); ids.add(id);
      for (const t of e.q) { const n = K.norm(t); assert.ok(!trig.has(n), 'dup trigger ' + t); trig.set(n, id); }
      const a = K.norm(e.a); assert.ok(!ans.has(a), 'dup answer ' + id); ans.add(a);
    }
  }
});

test('held-out paraphrases: top-1 ≥ 85%, top-3 ≥ 92%, confident precision ≥ 95%', () => {
  const r = require(path.join(KB, 'tests', 'eval_kb.js'))();
  console.log('kb retrieval', JSON.stringify({ n: r.n, top1: r.top1, top3: r.top3, confident: r.confident, confPrecision: r.confPrecision }));
  assert.ok(r.n >= 100);
  assert.ok(r.top1 >= 0.85, 'top1 ' + r.top1);
  assert.ok(r.top3 >= 0.92, 'top3 ' + r.top3);
  assert.ok(r.confPrecision >= 0.95, 'confident precision ' + r.confPrecision);
});

test('chit-chat and tale requests are not hijacked by KB', () => {
  const e = K.create(idx);
  for (const q of ['привет, как дела?', 'как дела', 'дальше', 'расскажи сказку на ночь', 'мне грустно', 'спасибо', 'помоги',
    'скороговорку', 'какая погода', 'расскажи анекдот', 'кто такой Кухулин', 'что ты умеешь', 'мне скучно']) {
    assert.ok(!e.confident(e.search(q, 1)[0]), 'should not be confident: ' + q);
  }
});

test('size and speed budgets', async () => {
  const raw = fs.readFileSync(path.join(KB, 'index.json'));
  const gz = zlib.gzipSync(raw, { level: 9 }).length;
  assert.ok(gz < 90 * 1024, 'index gzip ' + gz);
  for (const d of Object.keys(idx.domains)) assert.ok(idx.domains[d].gz < 40 * 1024, d + ' pack gzip');
  let t0 = process.hrtime.bigint();
  const e = K.create(idx);
  const build = Number(process.hrtime.bigint() - t0) / 1e6;
  t0 = process.hrtime.bigint();
  for (let i = 0; i < 100; i++) e.search('почему небо голубое днём', 5);
  const search = Number(process.hrtime.bigint() - t0) / 1e6 / 100;
  // chunked build: no single slice may take long (iPhone: index is built in idle slices)
  let maxSlice = 0;
  const ea = await K.createAsync(idx, { step: 120, yieldFn: (fn) => { setImmediate(fn); } });
  const e2 = K.create(idx, { deferBuild: true });
  for (let i = 0; i < e2.size; i += 120) { const s = process.hrtime.bigint(); e2._addRange(i, Math.min(e2.size, i + 120)); maxSlice = Math.max(maxSlice, Number(process.hrtime.bigint() - s) / 1e6); }
  console.log('kb timing', JSON.stringify({ indexGz: gz, buildMs: build, searchMs: search, maxSliceMs: maxSlice }));
  assert.deepStrictEqual(ea.search('скорость света', 1)[0].id, e.search('скорость света', 1)[0].id);
  assert.ok(build < 400, 'build ' + build);
  assert.ok(search < 5, 'search ' + search);
  assert.ok(maxSlice < 50, 'slice ' + maxSlice);
});

test('host wiring in index.html', () => {
  assert.ok(HTML.includes("var EitiKBHost = (function()"));
  assert.ok(HTML.includes("EitiKBLib.createAsync(d, { yieldFn: idle })"));
  assert.ok(HTML.includes('EitiOffline._kbWrapped = true'));
  assert.ok(HTML.includes('EitiKBHost.facts(String(userText || \'\'), 4)'));
  assert.ok(HTML.includes('БИБЛИОТЕКА ЗНАНИЙ EITI'));
  assert.ok(!/localStorage\.setItem\([^)]*kb_lib/i.test(HTML), 'KB library must not be stored in localStorage');
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  assert.ok(sw.includes("url.pathname.indexOf(BASE + 'kb/') === 0"));
});
