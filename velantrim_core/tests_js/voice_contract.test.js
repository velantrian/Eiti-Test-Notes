// EitiVoice P0-1: контракт состояний / ошибок / провайдеров (data/eiti_voice_contract_v1.json)
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const C = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/eiti_voice_contract_v1.json'), 'utf8'));
const M = require('../../local/eiti_voice.js');
const HTML = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8');

test('contract matches module constants', () => {
  assert.deepStrictEqual(C.states, M.STATES);
  assert.deepStrictEqual(C.errors, M.ERRORS);
  assert.deepStrictEqual(C.providers, M.PROVIDERS);
  assert.deepStrictEqual(C.caps, M.CAPS);
  assert.strictEqual(C.aliases.alisa, 'yandex');
});
test('transitions only reference known states', () => {
  for (const [k, v] of Object.entries(C.transitions)) {
    assert.ok(C.states.includes(k), k);
    v.forEach((s) => assert.ok(C.states.includes(s), k + '→' + s));
  }
});
test('every provider of legacy registry in index.html is in the contract', () => {
  const i = HTML.indexOf('window.EitiVoice = (function()');
  const body = HTML.slice(i, HTML.indexOf('})();', i));
  const ids = [...body.matchAll(/(?:^|\s)(?:reg\.)?(\w+): \{ id: '(\w+)'|reg\.(\w+) = \{ id: '(\w+)'/g)].map((m) => m[2] || m[4]);
  assert.deepStrictEqual([...new Set(ids)].sort(), [...C.providers].sort());
});
test('legacy public API keys are still returned by window.EitiVoice', () => {
  const i = HTML.indexOf('window.EitiVoice = (function()');
  const ret = HTML.slice(HTML.indexOf('return { providers: reg', i), HTML.indexOf('})();', i));
  C.legacyApi.forEach((k) => assert.match(ret, new RegExp('\\b' + k + ':'), k));
});
test('messages exist for every error in RU/EN/DE', () => {
  C.locales.forEach((l) => C.errors.forEach((e) => assert.ok(M.MSG[l][e], l + ':' + e)));
});
