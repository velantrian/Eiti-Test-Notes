// v14.0.0: offline dialogs — engine/data suites (tales, pools) + host-level regressions.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const OD = path.join(__dirname, '..', '..', 'offline');
const E = require(path.join(OD, 'eiti_offline_dialogs.js'));
const J = (f) => JSON.parse(fs.readFileSync(path.join(OD, f), 'utf8'));
function loader(data, log) {
  return (n) => {
    const g = /^tales_(.+)$/.exec(n);
    const f = g ? data.tales.groups[g[1]].file : (data.packs[n] || data.intentPacks[n] || {}).file || 'packs/' + n + '.json';
    if (log) log.push(n);
    return J(f);
  };
}
function seeded(s) { return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

for (const suite of ['test_tales.js', 'test_pools_v2.js']) {
  test('offline suite ' + suite, { timeout: 600000 }, () => {
    const out = execFileSync(process.execPath, [path.join(__dirname, 'offline', suite)], { encoding: 'utf8', maxBuffer: 64 << 20 });
    const m = out.match(/TESTS: (\d+)\/(\d+) passed/);
    assert.ok(m, 'summary line missing');
    assert.strictEqual(m[1], m[2], out.split('\n').filter((l) => /^FAIL/.test(l)).slice(0, 10).join('\n'));
  });
}

test('every pack in the manifests exists on disk', () => {
  const d = J('core.json');
  const files = [].concat(Object.values(d.packs || {}).map((p) => p.file), Object.values(d.intentPacks || {}).map((p) => p.file), Object.values(d.tales.groups).map((p) => p.file));
  for (const f of files) assert.ok(fs.existsSync(path.join(OD, f)), f);
});

test('batch loading: N packs → one recompile, not N', () => {
  const d = J('core.json');
  const eng = E.create(d, { rng: seeded(3), inserts: false });
  const ip = Object.values(d.intentPacks).map((p) => J(p.file));
  const t0 = process.hrtime.bigint();
  assert.strictEqual(eng.addPacks(ip), ip.length);
  const add = Number(process.hrtime.bigint() - t0) / 1e6;
  const t1 = process.hrtime.bigint();
  const r = eng.reply('как поливать цветы в отпуске');
  const first = Number(process.hrtime.bigint() - t1) / 1e6;
  assert.ok(r && r.text);
  assert.ok(add < 50, 'adding packs must not compile (' + add.toFixed(1) + ' ms)');
  console.log(`addPacks(${ip.length}) ${add.toFixed(1)} ms, first reply (one compile) ${first.toFixed(1)} ms`);
});

test('grief / travel misfires fixed', () => {
  const d = J('core.json');
  const eng = () => E.create(J('core.json'), { rng: seeded(5), inserts: false, loadPack: loader(d) });
  assert.strictEqual(eng().reply('еду путешествовать').intent, 'tr_plan');
  assert.strictEqual(eng().reply('завтра еду путешествовать').intent, 'tr_plan');
  assert.notStrictEqual(eng().reply('у нас годовщина').intent, 'emo_grief');
  assert.notStrictEqual(eng().reply('годовщина свадьбы').intent, 'emo_grief');
  assert.strictEqual(eng().reply('годовщина смерти мамы').intent, 'emo_grief');
  assert.notStrictEqual(eng().reply('я до смерти устал').intent, 'emo_grief');
});

test('tales: lazy group, «дальше», bedtime, «кто такой»', () => {
  const d = J('core.json'), log = [];
  const e = E.create(d, { rng: seeded(9), inserts: false, loadPack: loader(d, log) });
  assert.ok(e.reply('расскажи грузинскую сказку').text);
  assert.deepStrictEqual(log.filter((n) => /^tales_/.test(n)), ['tales_caucasian']);
  const bed = e.reply('сказку на ночь');
  assert.match(bed.text, /Режим сна|спокойн/i);
  assert.ok(e.reply('дальше').text);
  assert.match(e.reply('кто такой кухулин').text, /Кухулин/);
});

test('reply styles: setStyle pro strips emoji', () => {
  const e = E.create(J('core.json'), { rng: seeded(1), inserts: false, style: 'pro' });
  const t = e.reply('привет').text;
  assert.ok(t && !/[\u{1F300}-\u{1FAFF}]/u.test(t), t);
});

test('host: index.html wires EitiOffline (lazy, IDB state, style setting, SW cache)', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');
  const sw = fs.readFileSync(path.join(__dirname, '..', '..', 'sw.js'), 'utf8');
  assert.match(html, /var EitiOffline = \(function\(\)/);
  assert.match(html, /indexedDB\.open\('eiti_offline', 1\)/);
  assert.match(html, /id="eiti-offline-style"/);
  assert.match(html, /async function _eitiAskDeepSeekCore\(userText\)/);
  assert.doesNotMatch(html, /<script[^>]+offline\/eiti_offline_dialogs\.js/); // not loaded at startup
  assert.match(sw, /OFFLINE_CACHE = 'eiti-offline-v14\.0\.0'/);
  assert.match(sw, /k !== CACHE && k !== OFFLINE_CACHE/);
});
