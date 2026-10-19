'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { loadFunctions } = require('./harness');

const SW = fs.readFileSync(path.join(__dirname, '..', '..', 'sw.js'), 'utf8');

function loadSwFns() {
  const sandbox = { Promise, Array, Object, console, BASE: '/' };
  vm.createContext(sandbox);
  const names = ['swIsAllowlisted', 'swTrimCache'];
  names.forEach((name) => {
    const re = new RegExp('function ' + name + '\\b[\\s\\S]*?\\n\\}');
    const m = SW.match(re);
    if (!m) throw new Error('missing ' + name + ' in sw.js');
    vm.runInContext(m[0], sandbox, { filename: name + '.sw.js' });
  });
  sandbox.CACHE_MAX_ENTRIES = 24;
  return sandbox;
}

test('eitiSearchMatchChat ranking is title-or-content, same order as filter', () => {
  const sb = loadFunctions(['eitiSearchMatchChat']);
  const chats = [
    { chat: { id: 'a', title: 'квантовая физика' }, msgs: [{ content: 'hello' }] },
    { chat: { id: 'b', title: 'другое' }, msgs: [{ content: 'тема квантовая' }, { content: 'ещё квантовая' }] },
    { chat: { id: 'c', title: 'пусто' }, msgs: [{ content: 'нет совпадений' }] },
  ];
  const found = chats.map((row) => sb.eitiSearchMatchChat(row.chat, row.msgs, 'квантовая')).filter(Boolean);
  assert.equal(found.length, 2);
  assert.equal(found[0].chat.id, 'a');
  assert.equal(found[0].m.length, 0);
  assert.equal(found[1].chat.id, 'b');
  assert.equal(found[1].m.length, 2);
  const legacy = chats.map((row) => {
    const ql = 'квантовая';
    const m = row.msgs.filter((msg) => msg.content && msg.content.toLowerCase().indexOf(ql) !== -1);
    if (!m.length && row.chat.title.toLowerCase().indexOf(ql) === -1) return null;
    return { chat: row.chat, m };
  }).filter(Boolean);
  assert.deepEqual(found.map((x) => [x.chat.id, x.m.length]), legacy.map((x) => [x.chat.id, x.m.length]));
});

test('new search generation aborts the previous token', () => {
  const sb = loadFunctions(['eitiSearchBeginGeneration'], { _eitiSearchGen: 0 });
  const first = sb.eitiSearchBeginGeneration();
  const second = sb.eitiSearchBeginGeneration();
  assert.equal(first, 1);
  assert.equal(second, 2);
  assert.notEqual(first, second);
  assert.equal(sb._eitiSearchGen, 2);
});

test('eitiWrapIdleReader times out when no bytes arrive', async () => {
  const sb = loadFunctions(['eitiWrapIdleReader'], {
    setTimeout, clearTimeout, Promise,
  });
  const reader = {
    cancelled: false,
    read() { return new Promise(() => {}); },
    cancel() { this.cancelled = true; },
  };
  const wrapped = sb.eitiWrapIdleReader(reader, 20, null);
  await assert.rejects(() => wrapped.read(), /нет данных/);
  assert.equal(reader.cancelled, true);
});

test('eitiWrapIdleReader respects an outer abort signal', async () => {
  const sb = loadFunctions(['eitiWrapIdleReader'], {
    setTimeout, clearTimeout, Promise,
  });
  const ctrl = new AbortController();
  const reader = {
    cancelled: false,
    read() { return new Promise(() => {}); },
    cancel() { this.cancelled = true; },
  };
  const wrapped = sb.eitiWrapIdleReader(reader, 5000, ctrl.signal);
  setTimeout(() => ctrl.abort(), 5);
  await assert.rejects(() => wrapped.read(), /нет данных/);
  assert.equal(reader.cancelled, true);
});

test('eitiNotesFilterList keeps tag and substring semantics', () => {
  const sb = loadFunctions(['eitiNotesFilterList']);
  const notes = [
    { id: 1, title: 'alpha', body: 'hello', tags: ['work'] },
    { id: 2, title: 'beta', body: 'квант', tags: ['lab'] },
  ];
  assert.equal(sb.eitiNotesFilterList(notes, '').length, 2);
  assert.equal(sb.eitiNotesFilterList(notes, 'квант')[0].id, 2);
  assert.equal(sb.eitiNotesFilterList(notes, '#work')[0].id, 1);
});

test('DeepSeek vision body always uses flash image_url parts', () => {
  const sb = loadFunctions(['eitiBuildDeepSeekVisionRequest']);
  const images = [{ mime: 'image/jpeg', base64: 'abc123' }];
  const history = [
    { role: 'system', content: 'sys' },
    { role: 'user', content: 'look' },
  ];
  const flash = sb.eitiBuildDeepSeekVisionRequest('что на фото', images, history, {
    hasKey: true, selection: 'deepseek-flash', thinking: false
  });
  assert.equal(flash.body.model, 'deepseek-flash');
  assert.equal(flash.endpoint, 'https://api.deepseek.com/chat/completions');
  const last = flash.body.messages[flash.body.messages.length - 1];
  assert.equal(last.content[1].type, 'image_url');
  assert.match(last.content[1].image_url.url, /^data:image\/jpeg;base64,abc123$/);
  assert.equal(flash.body.thinking.type, 'disabled');

  const fromPro = sb.eitiBuildDeepSeekVisionRequest('фото', images, history, {
    hasKey: true, selection: 'deepseek-v4-pro-high', thinking: true, effort: 'high'
  });
  assert.equal(fromPro.body.model, 'deepseek-flash');
  assert.equal(fromPro.forcedFromPro, true);
  assert.notEqual(fromPro.body.model, 'deepseek-v4-pro');
});

test('DeepSeek vision without key does not build a request', () => {
  const sb = loadFunctions(['eitiBuildDeepSeekVisionRequest']);
  const out = sb.eitiBuildDeepSeekVisionRequest('hi', [{ mime: 'image/png', base64: 'x' }], [], { hasKey: false });
  assert.equal(out.body, null);
  assert.match(out.error, /ключа/i);
});

test('SW allowlist is CORE/HEAVY/data only and trim drops extras', async () => {
  const sb = loadSwFns();
  assert.equal(sb.swIsAllowlisted({ pathname: '/index.html' }), true);
  assert.equal(sb.swIsAllowlisted({ pathname: '/sql-wasm.wasm' }), true);
  assert.equal(sb.swIsAllowlisted({ pathname: '/data/lemma.json' }), true);
  assert.equal(sb.swIsAllowlisted({ pathname: '/random-asset.bin' }), false);
  const keys = [];
  for (let i = 0; i < 30; i++) keys.push({ href: 'k' + i });
  const deleted = [];
  const cache = {
    keys: async () => keys,
    delete: async (k) => { deleted.push(k); },
  };
  await sb.swTrimCache(cache);
  assert.equal(deleted.length, 6);
});
