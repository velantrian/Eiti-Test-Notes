// v14.12.0: voice providers + Mistral — inline scripts parse, helpers behave.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const HTML = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8');

test('all inline scripts parse', () => {
  const re = /<script(?![^>]*\bsrc=)(?![^>]*type="(?:application\/ld\+json|module)")[^>]*>([\s\S]*?)<\/script>/g;
  let m, n = 0;
  while ((m = re.exec(HTML))) { new vm.Script(m[1]); n++; }
  assert.ok(n > 0);
});

function fn(name) {
  const i = HTML.indexOf('function ' + name + '(');
  assert.ok(i >= 0, name);
  let d = 0, j = HTML.indexOf('{', i);
  for (let k = j; k < HTML.length; k++) { if (HTML[k] === '{') d++; else if (HTML[k] === '}' && --d === 0) return HTML.slice(i, k + 1); }
}

test('proxy URL validation: wss or local ws only', () => {
  const ctx = {}; vm.runInNewContext(fn('eitiVoiceProxyValid') + ';this.f=eitiVoiceProxyValid;', ctx);
  assert.strictEqual(!!ctx.f('wss://proxy.example.com/rt'), true);
  assert.strictEqual(!!ctx.f('ws://localhost:8080'), true);
  assert.strictEqual(!!ctx.f('ws://evil.example.com'), false);
  assert.strictEqual(!!ctx.f('https://x'), false);
  assert.strictEqual(!!ctx.f(''), false);
});

test('MISTRAL module: model fallback and labels', () => {
  const i = HTML.indexOf('var MISTRAL = {'), j = HTML.indexOf('window.MISTRAL = MISTRAL;');
  const store = { eiti_mistral_model: 'bogus' };
  const ctx = { localStorage: { getItem: (k) => store[k] ?? null } };
  vm.runInNewContext(HTML.slice(i, j) + ';this.M=MISTRAL;', ctx);
  assert.strictEqual(ctx.M.getModel(), 'mistral-medium-3-5');
  store.eiti_mistral_model = 'mistral-large-4';
  assert.strictEqual(ctx.M.getModel(), 'mistral-large-4');
  assert.strictEqual(ctx.M.label('mistral-small-2603'), 'Small 4');
});
