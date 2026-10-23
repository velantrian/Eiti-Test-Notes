// v14.7.0: Drive sync merge engine — per-item last-write-wins, tombstones, settings per key, no secrets; two devices via a mocked Drive file.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const S = require(path.join(__dirname, '..', '..', 'local', 'eiti_drive_sync.js'));
const KEYS = { notes: 'id', files: 'name' };

// Mocked Drive: one JSON file with a version counter.
function mockDrive() { return { file: null, version: 0 }; }
// One device = local data + its sync state; sync() = download → merge → apply → upload (like index.html _syncOnce).
function device(notes, settings) {
  return { data: { stores: { notes: notes || [], files: [] }, settings: settings || {} }, state: {} };
}
const T0 = 1_700_000_000_000; // realistic ms epoch (small numbers would be read as seconds)
function sync(dev, drive, now) {
  now += T0;
  const local = S.buildLocal(dev.data, KEYS, dev.state, now);
  const m = S.merge(local, S.fromRemote(drive.file && JSON.parse(drive.file)), now);
  for (const name of Object.keys(m.apply.stores)) {
    const a = m.apply.stores[name], k = KEYS[name];
    let list = (dev.data.stores[name] || []).filter((it) => !a.dels.includes(String(it[k])));
    for (const p of a.puts) { list = list.filter((it) => it[k] !== p[k]); list.push(p); }
    dev.data.stores[name] = list;
  }
  for (const [k, v] of m.apply.settings.puts) dev.data.settings[k] = v;
  for (const k of m.apply.settings.dels) delete dev.data.settings[k];
  if (m.remoteChanged || !drive.file) { drive.file = JSON.stringify(S.toFile(m.sync, '14.7.0', now)); drive.version++; }
  dev.state = m.state;
  return m;
}
const note = (id, body, updated) => ({ id, title: id, body, updated: T0 + updated, created: T0 });
const byId = (d) => Object.fromEntries(d.data.stores.notes.map((n) => [n.id, n.body]));

test('first device uploads, second device gets everything (restore)', () => {
  const drive = mockDrive();
  const a = device([note('n1', 'hello', 1000), note('n2', 'world', 2000)], { eiti_theme: 'dark' });
  sync(a, drive, 10000);
  assert.ok(drive.file);
  const b = device([], {});
  const m = sync(b, drive, 11000);
  assert.deepStrictEqual(byId(b), { n1: 'hello', n2: 'world' });
  assert.strictEqual(b.data.settings.eiti_theme, 'dark');
  assert.strictEqual(m.apply.stores.notes.puts.length, 2);
});

test('conflict: newest edit wins per note, other notes merge (union)', () => {
  const drive = mockDrive();
  const a = device([note('n1', 'v1', 1000)]);
  sync(a, drive, 5000);
  const b = device([]);
  sync(b, drive, 6000);
  // both edit n1; B later. A also adds n2, B adds n3.
  a.data.stores.notes = [note('n1', 'A-edit', 1000), note('n2', 'A-new', 7000)];
  b.data.stores.notes = [note('n1', 'B-edit', 1000), note('n3', 'B-new', 8000)];
  sync(a, drive, 7000);
  sync(b, drive, 8000);
  sync(a, drive, 9000);
  assert.deepStrictEqual(byId(a), { n1: 'B-edit', n2: 'A-new', n3: 'B-new' });
  assert.deepStrictEqual(byId(b), byId(a));
});

test('deletion markers propagate and an unchanged old copy does not resurrect', () => {
  const drive = mockDrive();
  const a = device([note('n1', 'x', 1000), note('n2', 'y', 1000)]);
  sync(a, drive, 5000);
  const b = device([]);
  sync(b, drive, 6000);
  a.data.stores.notes = a.data.stores.notes.filter((n) => n.id !== 'n1');
  sync(a, drive, 7000);
  const m = sync(b, drive, 8000);
  assert.deepStrictEqual(m.apply.stores.notes.dels, ['n1']);
  assert.deepStrictEqual(byId(b), { n2: 'y' });
  const f = JSON.parse(drive.file);
  assert.strictEqual(f.sync.stores.notes.n1.del, 1);
  sync(a, drive, 9000);
  assert.deepStrictEqual(byId(a), { n2: 'y' });
});

test('edit after remote delete wins over the older tombstone', () => {
  const drive = mockDrive();
  const a = device([note('n1', 'x', 1000)]);
  sync(a, drive, 5000);
  const b = device([]);
  sync(b, drive, 6000);
  a.data.stores.notes = [];
  sync(a, drive, 7000);
  b.data.stores.notes = [note('n1', 'edited', 9000)];
  sync(b, drive, 9000);
  sync(a, drive, 10000);
  assert.deepStrictEqual(byId(a), { n1: 'edited' });
});

test('settings merge per key, deletions too', () => {
  const drive = mockDrive();
  const a = device([], { theme: 'dark', lang: 'ru' });
  sync(a, drive, 1000);
  const b = device([], {});
  sync(b, drive, 2000);
  a.data.settings.theme = 'light';
  b.data.settings.lang = 'de';
  delete b.data.settings.zzz;
  sync(a, drive, 3000);
  sync(b, drive, 4000);
  sync(a, drive, 5000);
  assert.deepStrictEqual(a.data.settings, { theme: 'light', lang: 'de' });
  assert.deepStrictEqual(b.data.settings, { theme: 'light', lang: 'de' });
  delete a.data.settings.lang;
  sync(a, drive, 6000);
  sync(b, drive, 7000);
  assert.ok(!('lang' in b.data.settings));
});

test('API keys, tokens and Drive bookkeeping never reach the file', () => {
  const drive = mockDrive();
  const secrets = {
    deepseek_api_key: 'sk-1', eiti_apikey_openai: 'sk-2', eiti_gemini_key: 'g', eiti_qwen_key: 'q', eiti_openrouter_key: 'o',
    eiti_drive_token: 'ya29', eiti_drive_client_id: 'cid', eiti_drive_sync_state: '{}', eiti_grok_key: 'x', eiti_pin_hash: 'p',
  };
  const a = device([], Object.assign({ theme: 'dark' }, secrets));
  sync(a, drive, 1000);
  for (const v of Object.values(secrets)) assert.ok(!drive.file.includes('"' + v + '"'), 'leaked ' + v);
  assert.ok(drive.file.includes('"dark"'));
  // a malicious/old remote with a key must not be applied locally either
  const evil = JSON.parse(drive.file);
  evil.sync.settings.deepseek_api_key = { t: 9e12, v: 'stolen' };
  drive.file = JSON.stringify(evil);
  const b = device([], {});
  sync(b, drive, 2000);
  assert.ok(!('deepseek_api_key' in b.data.settings));
});

test('legacy v12.9.12 backup is read (notes, settings) and upgraded to the new format', () => {
  const drive = mockDrive();
  drive.file = JSON.stringify({ version: '13.0', settings: { theme: 'dark', deepseek_api_key: 'x' }, notes: [note('old', 'legacy', 500)], chats: [], files: [] });
  const b = device([note('mine', 'local', 900)], {});
  sync(b, drive, 1000);
  assert.deepStrictEqual(byId(b), { mine: 'local', old: 'legacy' });
  assert.strictEqual(b.data.settings.theme, 'dark');
  assert.ok(!('deepseek_api_key' in b.data.settings));
  assert.strictEqual(JSON.parse(drive.file).format, S.FORMAT);
});

test('no changes → no upload; files keyed by name', () => {
  const drive = mockDrive();
  const a = device([note('n', 'x', 1)]);
  a.data.stores.files = [{ name: 'a.txt', content: 'hi', ts: T0 + 5 }];
  sync(a, drive, 1000);
  const v = drive.version;
  const m = sync(a, drive, 2000);
  assert.strictEqual(m.remoteChanged, false);
  assert.strictEqual(drive.version, v);
  assert.ok(JSON.parse(drive.file).sync.stores.files['a.txt']);
});
