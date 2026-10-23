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
const ALL = require(path.join(KB, 'tests', 'load_all.js'))();
const idx = ALL.manifest;          // v2 manifest (domains, order, shard/pack file names)
const FULL = ALL.index;            // flat {domains, entries} — what the host builds from all shards
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

function packEntries(d) {
  const out = {};
  idx.domains[d].packs.forEach((f, part) => {
    const p = JSON.parse(fs.readFileSync(path.join(KB, f), 'utf8'));
    assert.strictEqual(p.domain, d); assert.strictEqual(p.part, part);
    Object.assign(out, p.entries);
  });
  return out;
}

test('schema: manifest + every shard + every pack part', () => {
  assert.strictEqual(idx.format, 'eiti-kb-lib');
  assert.strictEqual(idx.v, 2);
  assert.ok(idx.count >= 10000, 'at least 10 000 entries, got ' + idx.count);
  assert.strictEqual(FULL.entries.length, idx.count);
  assert.deepStrictEqual(idx.order.slice().sort(), Object.keys(idx.domains).sort());
  const doms = Object.keys(idx.domains);
  assert.ok(doms.length >= 30);
  let total = 0;
  for (const d of doms) {
    const m = idx.domains[d];
    const p = { entries: packEntries(d) };
    const ids = Object.keys(p.entries);
    assert.strictEqual(ids.length, m.count);
    total += ids.length;
    for (const id of ids) {
      const e = p.entries[id];
      assert.match(id, new RegExp('^kbl_' + d + '_[0-9a-f]{6,12}$'));
      assert.ok(Array.isArray(e.q) && e.q.length >= 1 && e.q.every((t) => typeof t === 'string' && t.trim()));
      assert.ok(typeof e.a === 'string' && e.a.length >= 20 && e.a.length <= 700, id + ' answer length');
      if (e.en !== undefined) assert.ok(e.en.length >= 10);
    }
  }
  assert.strictEqual(total, idx.count);
  for (const e of FULL.entries) {
    assert.ok(idx.domains[e.d] && e.i && e.t && e.k, 'index row ' + e.i);
    assert.ok(e.p >= 0 && e.p < idx.domains[e.d].packs.length);
  }
  // каждая строка индекса находит свою статью в своей части пакета
  const byPart = {};
  for (const e of FULL.entries) {
    const k = e.d + '#' + e.p;
    if (!byPart[k]) byPart[k] = JSON.parse(fs.readFileSync(path.join(KB, idx.domains[e.d].packs[e.p]), 'utf8')).entries;
    assert.ok(byPart[k][e.i], 'pack part has ' + e.i);
  }
});

test('no duplicate ids, triggers or answers', () => {
  const ids = new Set(), trig = new Map(), ans = new Set();
  for (const d of Object.keys(idx.domains)) {
    for (const [id, e] of Object.entries(packEntries(d))) {
      assert.ok(!ids.has(id), 'dup id ' + id); ids.add(id);
      for (const t of e.q) { const n = K.norm(t); assert.ok(!trig.has(n), 'dup trigger ' + t); trig.set(n, id); }
      const a = K.norm(e.a); assert.ok(!ans.has(a), 'dup answer ' + id); ans.add(a);
    }
  }
});

test('held-out paraphrases (curated set): top-1 ≥ 88%, top-3 ≥ 93%, confident precision ≥ 97%', () => {
  const r = require(path.join(KB, 'tests', 'eval_kb.js'))();
  console.log('kb retrieval curated', JSON.stringify({ n: r.n, top1: r.top1, top3: r.top3, confident: r.confident, confPrecision: r.confPrecision }));
  assert.ok(r.n >= 100);
  assert.ok(r.top1 >= 0.88, 'top1 ' + r.top1);
  assert.ok(r.top3 >= 0.93, 'top3 ' + r.top3);
  assert.ok(r.confPrecision >= 0.97, 'confident precision ' + r.confPrecision);
});

test('held-out questions on encyclopedic sections (people, cities, countries, …): top-1 ≥ 88%, confident precision ≥ 93%', () => {
  const r = require(path.join(KB, 'tests', 'eval_kb.js'))('heldout_wide.txt');
  console.log('kb retrieval wide', JSON.stringify({ n: r.n, top1: r.top1, top3: r.top3, confident: r.confident, confPrecision: r.confPrecision }));
  assert.ok(r.n >= 70);
  assert.ok(r.top1 >= 0.88, 'top1 ' + r.top1);
  assert.ok(r.confPrecision >= 0.93, 'confident precision ' + r.confPrecision);
});

test('chit-chat and tale requests are not hijacked by KB', () => {
  const e = K.create(FULL);
  for (const q of ['привет, как дела?', 'как дела', 'дальше', 'расскажи сказку на ночь', 'мне грустно', 'спасибо', 'помоги',
    'скороговорку', 'какая погода', 'расскажи анекдот', 'кто такой Кухулин', 'что ты умеешь', 'мне скучно', 'что делать',
    'привет', 'пока', 'доброе утро', 'спокойной ночи', 'давай поговорим', 'ок', 'да', 'нет', 'хорошо', 'понятно', 'я устал',
    'напомни через 5 минут', 'создай заметку', 'сколько времени', 'посчитай 2+2', 'не знаю', 'почему', 'ещё', 'продолжай']) {
    assert.ok(!e.confident(e.search(q, 1)[0]), 'should not be confident: ' + q);
  }
});

test('size and speed budgets (sharded index)', async () => {
  const man = zlib.gzipSync(fs.readFileSync(path.join(KB, 'index.json')), { level: 9 }).length;
  let shards = 0, maxShard = 0, maxPack = 0;
  for (const d of Object.keys(idx.domains)) {
    const g = zlib.gzipSync(fs.readFileSync(path.join(KB, idx.domains[d].shard)), { level: 9 }).length;
    shards += g; maxShard = Math.max(maxShard, g);
    for (const f of idx.domains[d].packs) maxPack = Math.max(maxPack, zlib.gzipSync(fs.readFileSync(path.join(KB, f)), { level: 9 }).length);
  }
  assert.ok(man < 8 * 1024, 'manifest gzip ' + man);
  assert.ok(maxShard < 200 * 1024, 'largest shard gzip ' + maxShard);
  assert.ok(shards < 450 * 1024, 'all shards gzip ' + shards);
  assert.ok(maxPack < 40 * 1024, 'largest pack part gzip ' + maxPack);
  let t0 = process.hrtime.bigint();
  const e = K.create(FULL);
  const build = Number(process.hrtime.bigint() - t0) / 1e6;
  t0 = process.hrtime.bigint();
  for (let i = 0; i < 100; i++) e.search('почему небо голубое днём', 5);
  const search = Number(process.hrtime.bigint() - t0) / 1e6 / 100;
  // как в хосте: пустой движок + шарды порциями по 150 — ни одна порция не должна быть долгой
  let maxSlice = 0;
  const inc = K.create({ domains: idx.domains, entries: [] });
  for (const d of idx.order) {
    const rows = K.shardRows(JSON.parse(fs.readFileSync(path.join(KB, idx.domains[d].shard), 'utf8')));
    const r = inc.add(rows, true);
    for (let i = r[0]; i < r[1]; i += 150) { const s0 = process.hrtime.bigint(); inc._addRange(i, Math.min(r[1], i + 150)); maxSlice = Math.max(maxSlice, Number(process.hrtime.bigint() - s0) / 1e6); }
  }
  const viaAsync = K.create({ domains: idx.domains, entries: [] });
  await K.addAsync(viaAsync, FULL.entries.slice(0, 500), { step: 120, yieldFn: (fn) => setImmediate(fn) });
  console.log('kb sizes+timing', JSON.stringify({ entries: idx.count, manifestGz: man, shardsGz: shards, maxShardGz: maxShard, maxPackGz: maxPack, buildMs: build, searchMs: search, maxSliceMs: maxSlice }));
  assert.strictEqual(inc.search('скорость света', 1)[0].id, e.search('скорость света', 1)[0].id);
  assert.strictEqual(viaAsync.size, 500);
  assert.ok(build < 3000, 'build ' + build);
  assert.ok(search < 20, 'search ' + search);
  assert.ok(maxSlice < 60, 'slice ' + maxSlice);
});

test('host wiring in index.html', () => {
  assert.ok(HTML.includes("var EitiKBHost = (function()"));
  assert.ok(HTML.includes('window.EitiKBLib.shardRows(sh)'));
  assert.ok(HTML.includes('window.EitiKBLib.addAsync(e, rows, { step: 150, yieldFn: idle })'));
  assert.ok(HTML.includes('EitiOffline._kbWrapped = true'));
  assert.ok(HTML.includes('EitiKBHost.facts(String(userText || \'\'), 4)'));
  assert.ok(HTML.includes('БИБЛИОТЕКА ЗНАНИЙ EITI'));
  assert.ok(!/localStorage\.setItem\([^)]*kb_lib/i.test(HTML), 'KB library must not be stored in localStorage');
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  assert.ok(sw.includes("url.pathname.indexOf(BASE + 'kb/') === 0"));
});
