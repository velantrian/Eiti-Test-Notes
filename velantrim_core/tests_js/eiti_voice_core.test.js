// EitiVoice P0-2: машина состояний ядра (local/eiti_voice.js), без DOM
const test = require('node:test');
const assert = require('node:assert');
const M = require('../../local/eiti_voice.js');

test('core starts idle and emits state events', () => {
  const c = M.createCore({});
  const seen = [];
  c.on('state', (e) => seen.push(e.state + ':' + e.provider));
  assert.strictEqual(c.state(), 'idle');
  c.setState('connecting', 'gemini');
  c.setState('listening');
  c.setState('idle');
  assert.deepStrictEqual(seen, ['connecting:gemini', 'listening:gemini', 'idle:']);
  assert.strictEqual(c.provider(), '');
});
test('unknown states are rejected, repeated state does not re-emit', () => {
  const c = M.createCore({});
  let n = 0; c.on('state', () => n++);
  assert.strictEqual(c.setState('bogus'), false);
  c.setState('connecting'); c.setState('connecting');
  assert.strictEqual(n, 1);
});
test('off() / unsubscribe stops events; listener errors are isolated', () => {
  const c = M.createCore({});
  let n = 0; const un = c.on('state', () => n++);
  c.on('state', () => { throw new Error('x'); });
  c.setState('connecting'); un(); c.setState('idle');
  assert.strictEqual(n, 1);
});
test('fail() sets error state with code/provider/retriable', () => {
  const c = M.createCore({});
  let got; c.on('error', (e) => (got = e));
  c.fail('socket', 'qwen');
  assert.strictEqual(c.state(), 'error');
  assert.deepStrictEqual([got.code, got.provider, got.retriable], ['socket', 'qwen', true]);
  assert.strictEqual(c.lastError().code, 'socket');
  assert.strictEqual(c.makeError('no_key').retriable, false);
  assert.strictEqual(c.makeError('weird').code, 'unknown');
});
test('requestMic success: requesting_mic → connecting', async () => {
  const c = M.createCore({ mediaDevices: () => ({ getUserMedia: () => Promise.resolve('S') }) });
  const states = []; c.on('state', (e) => states.push(e.state));
  assert.strictEqual(await c.requestMic({ audio: true }, 'grok'), 'S');
  assert.deepStrictEqual(states, ['requesting_mic', 'connecting']);
  assert.strictEqual(c.provider(), 'grok');
});
test('requestMic without mediaDevices → unsupported', async () => {
  const c = M.createCore({ mediaDevices: () => undefined });
  await assert.rejects(c.requestMic({ audio: true }), (e) => e.eitiCode === 'unsupported');
});
test('adapters wrap legacy providers (alias alisa → yandex)', () => {
  const calls = [];
  const prov = (id, ok, proxy) => ({ id, proxy, hasKey: () => ok, start: () => calls.push('start:' + id), stop: () => calls.push('stop:' + id), mute: () => calls.push('mute:' + id), isActive: () => false });
  const legacy = { providers: {}, label: (id) => 'L-' + id, current: () => 'grok', start: (id) => calls.push('legacy:' + id) };
  M.PROVIDERS.forEach((id) => (legacy.providers[id] = prov(id, id !== 'qwen' && id !== 'openai', id === 'qwen')));
  const win = { EitiVoice: legacy, navigator: {} };
  const api = M.install(win);
  assert.strictEqual(Object.keys(api.adapters).length, 6);
  assert.strictEqual(api.adapters.qwen.ready(), 'proxy');
  assert.strictEqual(api.adapters.openai.ready(), 'key');
  assert.strictEqual(api.caps('alisa').needsProxy, true);
  api.adapters.mistral.start(); api.adapters.mistral.mute(); api.adapters.mistral.stop();
  assert.deepStrictEqual(calls, ['start:mistral', 'mute:mistral', 'stop:mistral']);
  assert.deepStrictEqual(api.fallbackOrder('grok'), ['gemini', 'yandex', 'mistral']);
  assert.strictEqual(win.EitiVoiceCore, api.core);
});
test('reconnect is limited (default 2 attempts) and uses legacy start', () => {
  const started = [];
  const legacy = { providers: {}, label: (i) => i, current: () => 'gemini', start: (id) => started.push(id) };
  M.PROVIDERS.forEach((id) => (legacy.providers[id] = { hasKey: () => true, start() {}, stop() {}, mute() {}, isActive: () => false }));
  const api = M.install({ EitiVoice: legacy, navigator: {} });
  assert.strictEqual(api.reconnect('gemini', 2), true);
  assert.strictEqual(api.core.state(), 'reconnecting');
  assert.strictEqual(api.reconnect('gemini'), true);
  assert.strictEqual(api.reconnect('gemini', 0), false);
  assert.deepStrictEqual(started, ['gemini', 'gemini']);
});
test('core has no DOM dependency', () => {
  const c = M.createCore({});
  c.setState('connecting'); c.fail('timeout');
  assert.strictEqual(typeof c.message('timeout'), 'string');
});
